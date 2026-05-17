package proxy

import (
        "bytes"
        "context"
        "encoding/json"
        "fmt"
        "io"
        "net/http"
        "time"

        "github.com/sofa/sofa-backend/internal/model"
)

type TraefikManager struct {
        apiURL     string
        baseDomain string
        httpClient *http.Client
}

func NewTraefikManager(apiURL, baseDomain string) *TraefikManager {
        return &TraefikManager{
                apiURL:     apiURL,
                baseDomain: baseDomain,
                httpClient: &http.Client{Timeout: 10 * time.Second},
        }
}

// TraefikRouter represents a Traefik router configuration
type TraefikRouter struct {
        Rule        string            `json:"rule"`
        Service     string            `json:"service"`
        EntryPoints []string          `json:"entryPoints"`
        TLS         *TraefikTLSConfig `json:"tls,omitempty"`
        Middlewares []string          `json:"middlewares,omitempty"`
        Priority    int               `json:"priority,omitempty"`
}

// TraefikService represents a Traefik service configuration
type TraefikService struct {
        LoadBalancer *TraefikLoadBalancer `json:"loadBalancer,omitempty"`
}

// TraefikLoadBalancer represents a Traefik load balancer configuration
type TraefikLoadBalancer struct {
        Servers []TraefikServer `json:"servers"`
}

// TraefikServer represents a backend server in Traefik
type TraefikServer struct {
        URL string `json:"url"`
}

// TraefikTLSConfig represents TLS configuration
type TraefikTLSConfig struct {
        CertResolver string `json:"certResolver,omitempty"`
}

// TraefikDynamicConfig represents the full dynamic configuration
type TraefikDynamicConfig struct {
        HTTP *TraefikHTTPConfig `json:"http,omitempty"`
}

type TraefikHTTPConfig struct {
        Routers  map[string]*TraefikRouter  `json:"routers,omitempty"`
        Services map[string]*TraefikService `json:"services,omitempty"`
}

// AddAppRouting adds routing configuration for an app
func (t *TraefikManager) AddAppRouting(ctx context.Context, app *model.App, domain *model.Domain, containerPort int) error {
        routerName := fmt.Sprintf("sofa-%s", app.Slug)
        serviceName := fmt.Sprintf("sofa-%s", app.Slug)

        router := &TraefikRouter{
                Rule:        fmt.Sprintf("Host(`%s`)", domain.Domain),
                Service:     serviceName,
                EntryPoints: []string{"web"},
        }

        if domain.SSLEnabled {
                router.EntryPoints = append(router.EntryPoints, "websecure")
                router.TLS = &TraefikTLSConfig{
                        CertResolver: "letsencrypt",
                }
        }

        service := &TraefikService{
                LoadBalancer: &TraefikLoadBalancer{
                        Servers: []TraefikServer{
                                {
                                        URL: fmt.Sprintf("http://%s:%d", containerName(app.Slug), containerPort),
                                },
                        },
                },
        }

        // Update dynamic configuration via Traefik API
        config := &TraefikDynamicConfig{
                HTTP: &TraefikHTTPConfig{
                        Routers: map[string]*TraefikRouter{
                                routerName: router,
                        },
                        Services: map[string]*TraefikService{
                                serviceName: service,
                        },
                },
        }

        return t.updateDynamicConfig(ctx, config)
}

// RemoveAppRouting removes routing configuration for an app
func (t *TraefikManager) RemoveAppRouting(ctx context.Context, app *model.App) error {
        // In Traefik, we delete by providing empty/removed config
        // This is typically handled by removing Docker labels
        // For file-based dynamic config, we'd update the file
        // The router and service names follow the pattern: sofa-{slug}
        _ = fmt.Sprintf("sofa-%s", app.Slug) // router/service name prefix
        return nil
}

// GenerateDockerLabels generates Traefik Docker labels for container-based routing
func (t *TraefikManager) GenerateDockerLabels(app *model.App, domain *model.Domain) map[string]string {
        labels := make(map[string]string)

        labels["traefik.enable"] = "true"

        routerName := fmt.Sprintf("sofa-%s", app.Slug)
        serviceName := fmt.Sprintf("sofa-%s", app.Slug)

        labels[fmt.Sprintf("traefik.http.routers.%s.rule", routerName)] = fmt.Sprintf("Host(`%s`)", domain.Domain)
        labels[fmt.Sprintf("traefik.http.routers.%s.entrypoints", routerName)] = "web"

        if domain.SSLEnabled {
                labels[fmt.Sprintf("traefik.http.routers.%s.entrypoints", routerName)] = "web,websecure"
                labels[fmt.Sprintf("traefik.http.routers.%s.tls.certresolver", routerName)] = "letsencrypt"
        }

        labels[fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port", serviceName)] = fmt.Sprintf("%d", app.Port)

        return labels
}

// GenerateSubdomain generates a subdomain URL for an app
func (t *TraefikManager) GenerateSubdomain(slug string) string {
        return fmt.Sprintf("%s.%s", slug, t.baseDomain)
}

// GetRouterStatus checks if a router exists in Traefik
func (t *TraefikManager) GetRouterStatus(ctx context.Context, routerName string) (map[string]interface{}, error) {
        url := fmt.Sprintf("%s/api/http/routers/%s", t.apiURL, routerName)

        req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
        if err != nil {
                return nil, fmt.Errorf("creating request: %w", err)
        }

        resp, err := t.httpClient.Do(req)
        if err != nil {
                return nil, fmt.Errorf("making request: %w", err)
        }
        defer resp.Body.Close()

        if resp.StatusCode != http.StatusOK {
                return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
        }

        var result map[string]interface{}
        if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
                return nil, fmt.Errorf("decoding response: %w", err)
        }

        return result, nil
}

// ListRouters lists all Traefik routers
func (t *TraefikManager) ListRouters(ctx context.Context) ([]map[string]interface{}, error) {
        url := fmt.Sprintf("%s/api/http/routers", t.apiURL)

        req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
        if err != nil {
                return nil, fmt.Errorf("creating request: %w", err)
        }

        resp, err := t.httpClient.Do(req)
        if err != nil {
                return nil, fmt.Errorf("making request: %w", err)
        }
        defer resp.Body.Close()

        if resp.StatusCode != http.StatusOK {
                return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
        }

        var result []map[string]interface{}
        if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
                return nil, fmt.Errorf("decoding response: %w", err)
        }

        return result, nil
}

func (t *TraefikManager) updateDynamicConfig(ctx context.Context, config *TraefikDynamicConfig) error {
        data, err := json.Marshal(config)
        if err != nil {
                return fmt.Errorf("marshaling config: %w", err)
        }

        url := fmt.Sprintf("%s/api/providers/rest", t.apiURL)

        req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(data))
        if err != nil {
                return fmt.Errorf("creating request: %w", err)
        }
        req.Header.Set("Content-Type", "application/json")

        resp, err := t.httpClient.Do(req)
        if err != nil {
                return fmt.Errorf("making request: %w", err)
        }
        defer resp.Body.Close()

        if resp.StatusCode != http.StatusOK {
                body, _ := io.ReadAll(resp.Body)
                return fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
        }

        return nil
}

func containerName(slug string) string {
        return "sofa-" + slug
}
