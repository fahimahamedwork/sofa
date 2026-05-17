package deploy

import (
        "context"
        "fmt"
        "time"

        "github.com/sofa/sofa-backend/internal/crypto"
        "github.com/sofa/sofa-backend/internal/docker"
        "github.com/sofa/sofa-backend/internal/model"
        "github.com/sofa/sofa-backend/internal/realtime"
        "github.com/sofa/sofa-backend/internal/repository"
)

type Pipeline struct {
        dockerClient  *docker.DockerClient
        deployRepo    *repository.DeploymentRepo
        appRepo       *repository.AppRepo
        envVarRepo    *repository.EnvVarRepo
        domainRepo    *repository.DomainRepo
        builder       *Builder
        hub           *realtime.Hub
        encryptor     *crypto.Encryptor
}

func NewPipeline(
        dockerClient *docker.DockerClient,
        deployRepo *repository.DeploymentRepo,
        appRepo *repository.AppRepo,
        envVarRepo *repository.EnvVarRepo,
        domainRepo *repository.DomainRepo,
        hub *realtime.Hub,
        encryptor *crypto.Encryptor,
) *Pipeline {
        return &Pipeline{
                dockerClient: dockerClient,
                deployRepo:   deployRepo,
                appRepo:      appRepo,
                envVarRepo:   envVarRepo,
                domainRepo:   domainRepo,
                builder:      NewBuilder(dockerClient),
                hub:          hub,
                encryptor:    encryptor,
        }
}

// RunPipeline executes the full deployment pipeline
func (p *Pipeline) RunPipeline(ctx context.Context, app *model.App, deployment *model.Deployment) error {
        // Safety check: if Docker is not available, mark deployment as failed
        if p.dockerClient == nil {
                p.handleFailure(ctx, deployment, app, "Docker daemon is not available - deploy functionality is disabled")
                return fmt.Errorf("docker daemon is not available")
        }

        // Step 1: Update status to building
        if err := p.deployRepo.UpdateStatus(ctx, deployment.ID, model.DeployStatusBuilding); err != nil {
                return fmt.Errorf("updating deployment status to building: %w", err)
        }
        _ = p.appRepo.UpdateStatus(ctx, app.ID, model.AppStatusBuilding)
        p.broadcastEvent(deployment.ID, "status", "building")

        // Step 2: Fetch source and build image
        var imageID string
        var buildLog string
        var err error

        switch app.SourceType {
        case model.SourceTypeDockerImage:
                p.broadcastLog(deployment.ID, "Pulling Docker image: "+app.SourceURL)
                if err := p.dockerClient.PullImage(ctx, app.SourceURL); err != nil {
                        p.handleFailure(ctx, deployment, app, "Failed to pull image: "+err.Error())
                        return err
                }
                imageID = app.SourceURL
                buildLog = "Image pulled successfully: " + app.SourceURL

        case model.SourceTypeGit, model.SourceTypeDockerfile:
                p.broadcastLog(deployment.ID, "Building application...")
                imageID, buildLog, err = p.builder.Build(ctx, app, deployment)
                if err != nil {
                        p.handleFailure(ctx, deployment, app, "Build failed: "+err.Error())
                        return err
                }

        default:
                p.handleFailure(ctx, deployment, app, "Unknown source type: "+string(app.SourceType))
                return fmt.Errorf("unknown source type: %s", app.SourceType)
        }

        // Update deployment with image and build log
        _ = p.deployRepo.UpdateImageID(ctx, deployment.ID, imageID)
        _ = p.deployRepo.UpdateBuildLog(ctx, deployment.ID, buildLog)

        // Step 3: Update status to deploying
        if err := p.deployRepo.UpdateStatus(ctx, deployment.ID, model.DeployStatusDeploying); err != nil {
                return fmt.Errorf("updating deployment status to deploying: %w", err)
        }
        p.broadcastEvent(deployment.ID, "status", "deploying")

        // Step 4: Stop old container (graceful)
        oldContainerID := app.ContainerID
        if oldContainerID != "" {
                p.broadcastLog(deployment.ID, "Stopping old container...")
                timeout := 30
                if err := p.dockerClient.StopContainer(ctx, oldContainerID, &timeout); err != nil {
                        p.broadcastLog(deployment.ID, "Warning: failed to stop old container: "+err.Error())
                }
                // Don't remove yet - keep for rollback
        }

        // Step 5: Start new container
        p.broadcastLog(deployment.ID, "Starting new container...")

        // Get env vars for the container
        envVars := make(map[string]string)
        envVarList, _ := p.envVarRepo.FindByAppID(ctx, app.ID)
        for _, ev := range envVarList {
                if p.encryptor != nil {
                        decrypted, err := p.encryptor.Decrypt(ev.EncryptedValue)
                        if err == nil {
                                envVars[ev.Key] = decrypted
                        } else {
                                envVars[ev.Key] = ""
                        }
                } else {
                        envVars[ev.Key] = ""
                }
        }

        // Get domain for Traefik labels
        var domain string
        domains, _ := p.domainRepo.FindByAppID(ctx, app.ID)
        if len(domains) > 0 {
                domain = domains[0].Domain
        }

        containerID, err := p.dockerClient.CreateContainer(ctx, docker.CreateContainerOpts{
                AppID:       app.ID,
                AppSlug:     app.Slug,
                Image:       imageID,
                Port:        app.Port,
                CPULimit:    app.CPULimit,
                MemoryLimit: app.MemoryLimit,
                EnvVars:     envVars,
                Domain:      domain,
        })
        if err != nil {
                p.handleFailure(ctx, deployment, app, "Failed to create container: "+err.Error())
                // Try to restart old container
                if oldContainerID != "" {
                        _ = p.dockerClient.StartContainer(ctx, oldContainerID)
                }
                return err
        }

        if err := p.dockerClient.StartContainer(ctx, containerID); err != nil {
                p.handleFailure(ctx, deployment, app, "Failed to start container: "+err.Error())
                // Try to restart old container
                if oldContainerID != "" {
                        _ = p.dockerClient.StartContainer(ctx, oldContainerID)
                }
                return err
        }

        // Step 6: Health check
        p.broadcastLog(deployment.ID, "Running health check...")
        healthy := p.healthCheck(ctx, containerID, app.Port)

        if !healthy {
                p.broadcastLog(deployment.ID, "Health check failed")
                p.handleFailure(ctx, deployment, app, "Health check failed")
                // Remove failed container and restart old one
                _ = p.dockerClient.RemoveContainer(ctx, containerID)
                if oldContainerID != "" {
                        _ = p.dockerClient.StartContainer(ctx, oldContainerID)
                }
                return fmt.Errorf("health check failed")
        }

        // Step 7: Update status to healthy
        if err := p.deployRepo.UpdateStatus(ctx, deployment.ID, model.DeployStatusHealthy); err != nil {
                return fmt.Errorf("updating deployment status to healthy: %w", err)
        }

        // Update app with new container and image
        app.ContainerID = containerID
        app.ImageID = imageID
        app.Status = model.AppStatusRunning
        _ = p.appRepo.Update(ctx, app)

        // Remove old container now that new one is healthy
        if oldContainerID != "" {
                _ = p.dockerClient.RemoveContainer(ctx, oldContainerID)
        }

        p.broadcastEvent(deployment.ID, "status", "healthy")
        p.broadcastLog(deployment.ID, "Deployment completed successfully!")

        return nil
}

func (p *Pipeline) handleFailure(ctx context.Context, deployment *model.Deployment, app *model.App, message string) {
        _ = p.deployRepo.UpdateStatus(ctx, deployment.ID, model.DeployStatusFailed)
        _ = p.deployRepo.UpdateBuildLog(ctx, deployment.ID, message)
        _ = p.appRepo.UpdateStatus(ctx, app.ID, model.AppStatusError)
        p.broadcastEvent(deployment.ID, "status", "failed")
        p.broadcastLog(deployment.ID, message)
}

// healthCheck verifies that the newly deployed container is healthy
func (p *Pipeline) healthCheck(ctx context.Context, containerID string, port int) bool {
        // Wait a bit for the container to start up
        time.Sleep(3 * time.Second)

        // Check if the container is still running
        if !p.dockerClient.IsContainerRunning(ctx, containerID) {
                return false
        }

        // In production, we'd make an HTTP request to the container's health endpoint
        // For now, just check that the container is running
        return p.dockerClient.IsContainerRunning(ctx, containerID)
}

func (p *Pipeline) broadcastLog(deploymentID uint64, message string) {
        if p.hub != nil {
                p.hub.BroadcastToRoom(
                        fmt.Sprintf("deployment:%d", deploymentID),
                        "logs",
                        map[string]interface{}{
                                "deployment_id": deploymentID,
                                "message":       message,
                                "timestamp":     time.Now().Format(time.RFC3339),
                        },
                )
        }
}

func (p *Pipeline) broadcastEvent(deploymentID uint64, eventType string, data interface{}) {
        if p.hub != nil {
                p.hub.BroadcastToRoom(
                        fmt.Sprintf("deployment:%d", deploymentID),
                        "events",
                        map[string]interface{}{
                                "deployment_id": deploymentID,
                                "type":          eventType,
                                "data":          data,
                                "timestamp":     time.Now().Format(time.RFC3339),
                        },
                )
        }
}
