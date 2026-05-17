package docker

import (
        "bufio"
        "context"
        "encoding/json"
        "fmt"
        "io"
        "log"
        "os"
        "strings"
        "time"

        "github.com/docker/docker/api/types"
        "github.com/docker/docker/api/types/container"
        "github.com/docker/docker/api/types/filters"
        "github.com/docker/docker/api/types/image"
        "github.com/docker/docker/api/types/network"
        "github.com/docker/docker/client"
        "github.com/docker/go-connections/nat"
        "github.com/sofa/sofa-backend/internal/model"
)

type DockerClient struct {
        cli *client.Client
}

func NewDockerClient(socketPath string) (*DockerClient, error) {
        os.Setenv("DOCKER_HOST", "unix://"+socketPath)

        cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
        if err != nil {
                return nil, fmt.Errorf("creating Docker client: %w", err)
        }

        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()

        _, err = cli.Ping(ctx)
        if err != nil {
                return nil, fmt.Errorf("connecting to Docker daemon: %w", err)
        }

        return &DockerClient{cli: cli}, nil
}

type CreateContainerOpts struct {
        AppID       uint64
        AppSlug     string
        Image       string
        Port        int
        CPULimit    float64
        MemoryLimit int // in MB
        EnvVars     map[string]string
        Domain      string
        Volumes     map[string]string // host_path -> container_path
        NetworkName string
}

// EnsureNetwork creates a Docker network if it doesn't already exist.
// This is necessary because deployed app containers need to join the
// same network as Traefik for routing to work.
func (d *DockerClient) EnsureNetwork(ctx context.Context, networkName string) error {
        // Check if the network already exists
        filter := filters.NewArgs()
        filter.Add("name", networkName)

        networks, err := d.cli.NetworkList(ctx, types.NetworkListOptions{Filters: filter})
        if err != nil {
                return fmt.Errorf("listing networks: %w", err)
        }

        // Check exact match (Docker may return partial matches)
        for _, n := range networks {
                if n.Name == networkName {
                        return nil // Network already exists
                }
        }

        // Create the network
        _, err = d.cli.NetworkCreate(ctx, networkName, types.NetworkCreate{
                Driver:     "bridge",
                CheckDuplicate: true,
                Labels: map[string]string{
                        "sofa.managed": "true",
                },
        })
        if err != nil {
                return fmt.Errorf("creating network %s: %w", networkName, err)
        }

        log.Printf("Created Docker network: %s", networkName)
        return nil
}

func (d *DockerClient) CreateContainer(ctx context.Context, opts CreateContainerOpts) (string, error) {
        // Ensure the Docker network exists before creating the container
        if opts.NetworkName != "" {
                if err := d.EnsureNetwork(ctx, opts.NetworkName); err != nil {
                        return "", fmt.Errorf("ensuring network exists: %w", err)
                }
        }

        containerPort, err := nat.NewPort("tcp", fmt.Sprintf("%d", opts.Port))
        if err != nil {
                return "", fmt.Errorf("parsing port: %w", err)
        }

        containerConfig := &container.Config{
                Image: opts.Image,
                ExposedPorts: nat.PortSet{
                        containerPort: struct{}{},
                },
                Labels: map[string]string{
                        "sofa.app.id":   fmt.Sprintf("%d", opts.AppID),
                        "sofa.app.slug": opts.AppSlug,
                        "sofa.managed":  "true",
                },
        }

        // Add environment variables
        for k, v := range opts.EnvVars {
                containerConfig.Env = append(containerConfig.Env, fmt.Sprintf("%s=%s", k, v))
        }

        hostConfig := &container.HostConfig{
                PortBindings: nat.PortMap{
                        containerPort: []nat.PortBinding{},
                },
                RestartPolicy: container.RestartPolicy{
                        Name: "unless-stopped",
                },
                Resources: container.Resources{
                        Memory:   int64(opts.MemoryLimit) * 1024 * 1024, // Convert MB to bytes
                        NanoCPUs: int64(opts.CPULimit * 1e9),
                },
        }

        // Add volume mounts
        for hostPath, containerPath := range opts.Volumes {
                hostConfig.Binds = append(hostConfig.Binds, fmt.Sprintf("%s:%s", hostPath, containerPath))
        }

        // Add Traefik labels for routing if domain is provided
        if opts.Domain != "" {
                containerConfig.Labels["traefik.enable"] = "true"
                containerConfig.Labels["traefik.http.routers."+opts.AppSlug+".rule"] = "Host(`" + opts.Domain + "`)"
                containerConfig.Labels["traefik.http.routers."+opts.AppSlug+".entrypoints"] = "web"
                containerConfig.Labels["traefik.http.services."+opts.AppSlug+".loadbalancer.server.port"] = fmt.Sprintf("%d", opts.Port)
        }

        networkingConfig := &network.NetworkingConfig{}
        if opts.NetworkName != "" {
                networkingConfig.EndpointsConfig = map[string]*network.EndpointSettings{
                        opts.NetworkName: {},
                }
        }

        // Remove existing container with the same name if it exists (e.g. from a failed deploy)
        containerName := "sofa-" + opts.AppSlug
        _ = d.cli.ContainerRemove(ctx, containerName, container.RemoveOptions{Force: true})

        resp, err := d.cli.ContainerCreate(ctx, containerConfig, hostConfig, networkingConfig, nil, containerName)
        if err != nil {
                return "", fmt.Errorf("creating container: %w", err)
        }

        return resp.ID, nil
}

func (d *DockerClient) StartContainer(ctx context.Context, containerID string) error {
        if err := d.cli.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
                return fmt.Errorf("starting container: %w", err)
        }
        return nil
}

func (d *DockerClient) StopContainer(ctx context.Context, containerID string, timeout *int) error {
        if timeout == nil {
                t := 30
                timeout = &t
        }
        if err := d.cli.ContainerStop(ctx, containerID, container.StopOptions{Timeout: timeout}); err != nil {
                return fmt.Errorf("stopping container: %w", err)
        }
        return nil
}

func (d *DockerClient) RemoveContainer(ctx context.Context, containerID string) error {
        if err := d.cli.ContainerRemove(ctx, containerID, container.RemoveOptions{
                Force: true,
        }); err != nil {
                return fmt.Errorf("removing container: %w", err)
        }
        return nil
}

type ContainerStats struct {
        CPUPercent    float64 `json:"cpu_percent"`
        MemoryUsage   int64   `json:"memory_usage"`
        MemoryLimit   int64   `json:"memory_limit"`
        MemoryPercent float64 `json:"memory_percent"`
        NetworkIn     int64   `json:"network_in"`
        NetworkOut    int64   `json:"network_out"`
}

func (d *DockerClient) GetContainerStats(ctx context.Context, containerID string) (*ContainerStats, error) {
        stats, err := d.cli.ContainerStats(ctx, containerID, false)
        if err != nil {
                return nil, fmt.Errorf("getting container stats: %w", err)
        }
        defer stats.Body.Close()

        data, err := io.ReadAll(stats.Body)
        if err != nil {
                return nil, fmt.Errorf("reading stats: %w", err)
        }

        // Parse basic stats from the response
        result := &ContainerStats{}
        _ = data // In production, parse the full JSON stats response
        return result, nil
}

func (d *DockerClient) GetContainerLogs(ctx context.Context, containerID string, tail string) ([]byte, error) {
        opts := container.LogsOptions{
                ShowStdout: true,
                ShowStderr: true,
                Tail:       tail,
                Timestamps: true,
        }

        reader, err := d.cli.ContainerLogs(ctx, containerID, opts)
        if err != nil {
                return nil, fmt.Errorf("getting container logs: %w", err)
        }
        defer reader.Close()

        data, err := io.ReadAll(reader)
        if err != nil {
                return nil, fmt.Errorf("reading container logs: %w", err)
        }

        return data, nil
}

func (d *DockerClient) ExecContainer(ctx context.Context, containerID string, cmd []string) (types.HijackedResponse, error) {
        execConfig := container.ExecOptions{
                AttachStdout: true,
                AttachStderr: true,
                Cmd:          cmd,
        }

        execResp, err := d.cli.ContainerExecCreate(ctx, containerID, execConfig)
        if err != nil {
                return types.HijackedResponse{}, fmt.Errorf("creating exec: %w", err)
        }

        hijacked, err := d.cli.ContainerExecAttach(ctx, execResp.ID, container.ExecStartOptions{})
        if err != nil {
                return types.HijackedResponse{}, fmt.Errorf("attaching exec: %w", err)
        }

        return hijacked, nil
}

func (d *DockerClient) ListContainers(ctx context.Context, appID uint64) ([]types.Container, error) {
        filter := filters.NewArgs()
        filter.Add("label", fmt.Sprintf("sofa.app.id=%d", appID))

        containers, err := d.cli.ContainerList(ctx, container.ListOptions{
                All:     true,
                Filters: filter,
        })
        if err != nil {
                return nil, fmt.Errorf("listing containers: %w", err)
        }

        return containers, nil
}

func (d *DockerClient) InspectContainer(ctx context.Context, containerID string) (types.ContainerJSON, error) {
        containerJSON, err := d.cli.ContainerInspect(ctx, containerID)
        if err != nil {
                return types.ContainerJSON{}, fmt.Errorf("inspecting container: %w", err)
        }
        return containerJSON, nil
}

func (d *DockerClient) PullImage(ctx context.Context, imageName string) error {
        reader, err := d.cli.ImagePull(ctx, imageName, image.PullOptions{})
        if err != nil {
                return fmt.Errorf("pulling image: %w", err)
        }
        defer reader.Close()

        // Parse the Docker pull JSON stream to detect errors
        var pullErr string
        scanner := bufio.NewScanner(reader)
        for scanner.Scan() {
                line := scanner.Bytes()
                if len(line) == 0 {
                        continue
                }
                var msg struct {
                        Error  string `json:"error"`
                        Status string `json:"status"`
                }
                if err := json.Unmarshal(line, &msg); err != nil {
                        continue
                }
                if msg.Error != "" {
                        pullErr = msg.Error
                }
        }

        if pullErr != "" {
                return fmt.Errorf("docker pull failed: %s", pullErr)
        }

        return nil
}

func (d *DockerClient) BuildImage(ctx context.Context, buildContext io.Reader, tags []string, dockerfile string) error {
        opts := types.ImageBuildOptions{
                Dockerfile:  dockerfile,
                Tags:        tags,
                Remove:      true,
                ForceRemove: true,
        }

        resp, err := d.cli.ImageBuild(ctx, buildContext, opts)
        if err != nil {
                return fmt.Errorf("building image: %w", err)
        }
        defer resp.Body.Close()

        // Parse the Docker build JSON stream to detect errors.
        // Docker's ImageBuild API returns HTTP 200 even when the build fails;
        // the actual error is embedded in the JSON stream response body.
        var buildErr string
        var buildLogs []string
        scanner := bufio.NewScanner(resp.Body)
        for scanner.Scan() {
                line := scanner.Bytes()
                if len(line) == 0 {
                        continue
                }

                var msg struct {
                        Stream string `json:"stream"`
                        Error  string `json:"error"`
                        Aux    *struct {
                                ID string `json:"ID"`
                        } `json:"aux"`
                }
                if err := json.Unmarshal(line, &msg); err != nil {
                        continue // skip non-JSON lines
                }

                if msg.Error != "" {
                        buildErr = msg.Error
                }

                // Collect build output for logging
                if msg.Stream != "" {
                        streamMsg := strings.TrimSpace(msg.Stream)
                        if streamMsg != "" {
                                buildLogs = append(buildLogs, streamMsg)
                                fmt.Fprintf(os.Stderr, "[docker-build] %s\n", streamMsg)
                        }
                }
        }

        if buildErr != "" {
                // Include the last few build log lines for context
                recentLogs := buildLogs
                if len(recentLogs) > 10 {
                        recentLogs = recentLogs[len(recentLogs)-10:]
                }
                logSummary := strings.Join(recentLogs, "; ")
                return fmt.Errorf("docker build failed: %s (recent output: %s)", buildErr, logSummary)
        }

        return nil
}

func (d *DockerClient) IsContainerRunning(ctx context.Context, containerID string) bool {
        containerJSON, err := d.cli.ContainerInspect(ctx, containerID)
        if err != nil {
                return false
        }
        return containerJSON.State != nil && containerJSON.State.Running
}

func (d *DockerClient) GetContainerAppID(cont types.Container) uint64 {
        if cont.Labels == nil {
                return 0
        }
        idStr, ok := cont.Labels["sofa.app.id"]
        if !ok {
                return 0
        }
        var id uint64
        fmt.Sscanf(idStr, "%d", &id)
        return id
}

func (d *DockerClient) Close() error {
        return d.cli.Close()
}

// RemoveContainerByName forcefully removes a container by name (ignoring errors if it doesn't exist)
func (d *DockerClient) RemoveContainerByName(ctx context.Context, name string) error {
        return d.cli.ContainerRemove(ctx, name, container.RemoveOptions{Force: true})
}

// Helper to get app status from container state
func ContainerToAppStatus(containerJSON types.ContainerJSON) model.AppStatus {
        if containerJSON.State == nil {
                return model.AppStatusStopped
        }
        if containerJSON.State.Running {
                return model.AppStatusRunning
        }
        if containerJSON.State.Status == "created" || containerJSON.State.Status == "exited" {
                return model.AppStatusStopped
        }
        return model.AppStatusError
}
