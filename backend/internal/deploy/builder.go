package deploy

import (
        "archive/tar"
        "bytes"
        "context"
        "fmt"
        "log"
        "os"
        "path/filepath"
        "strings"

        "github.com/sofa/sofa-backend/internal/docker"
        "github.com/sofa/sofa-backend/internal/git"
        "github.com/sofa/sofa-backend/internal/model"
)

type Builder struct {
        dockerClient *docker.DockerClient
}

func NewBuilder(dockerClient *docker.DockerClient) *Builder {
        return &Builder{dockerClient: dockerClient}
}

type BuildResult struct {
        ImageID string
        Log     string
}

// Build builds a Docker image from the app source
func (b *Builder) Build(ctx context.Context, app *model.App, deployment *model.Deployment) (string, string, error) {
        var sourceDir string
        var err error

        // For git sources, clone the repository
        if app.SourceType == model.SourceTypeGit {
                log.Printf("Cloning repository: %s branch=%s", app.SourceURL, deployment.Branch)
                sourceDir, err = git.CloneRepo(ctx, app.SourceURL, deployment.Branch, "")
                if err != nil {
                        return "", "", fmt.Errorf("cloning repository: %w", err)
                }
                defer os.RemoveAll(sourceDir)
                log.Printf("Repository cloned to: %s", sourceDir)
        } else {
                // For dockerfile source, we'd have the source in a temp dir already
                sourceDir = "/tmp/sofa-build-" + app.Slug
        }

        // Detect framework if not set
        framework := app.Framework
        if framework == "" {
                framework = DetectFramework(sourceDir)
                log.Printf("Detected framework: %s", framework)
        }

        // Generate Dockerfile if one doesn't exist
        dockerfilePath := filepath.Join(sourceDir, "Dockerfile")
        if _, err := os.Stat(dockerfilePath); os.IsNotExist(err) {
                log.Printf("No Dockerfile found, generating one for framework: %s", framework)
                generatedDockerfile, err := GenerateDockerfile(framework, app)
                if err != nil {
                        return "", "", fmt.Errorf("generating Dockerfile: %w", err)
                }

                if err := os.WriteFile(dockerfilePath, []byte(generatedDockerfile), 0644); err != nil {
                        return "", "", fmt.Errorf("writing Dockerfile: %w", err)
                }
        } else {
                log.Printf("Using existing Dockerfile")
        }

        // Build the Docker image
        imageTag := fmt.Sprintf("sofa/%s:%d", app.Slug, deployment.ID)
        if app.SourceType == model.SourceTypeDockerImage {
                imageTag = app.SourceURL
        }

        log.Printf("Building Docker image: %s", imageTag)

        // Create build context tar
        buildContext, err := createBuildContext(sourceDir)
        if err != nil {
                return "", "", fmt.Errorf("creating build context: %w", err)
        }

        err = b.dockerClient.BuildImage(ctx, buildContext, []string{imageTag}, "Dockerfile")
        if err != nil {
                return "", "", fmt.Errorf("building image %s: %w", imageTag, err)
        }

        buildLog := fmt.Sprintf("Built image %s from %s (framework: %s)", imageTag, sourceDir, framework)
        return imageTag, buildLog, nil
}

// DetectFramework analyzes the source directory to determine the framework
func DetectFramework(sourceDir string) string {
        // Check for Dockerfile first
        if fileExists(filepath.Join(sourceDir, "Dockerfile")) {
                return "docker"
        }

        // Check for Node.js
        if fileExists(filepath.Join(sourceDir, "package.json")) {
                // Try to detect specific Node.js frameworks
                if fileExists(filepath.Join(sourceDir, "next.config.js")) || fileExists(filepath.Join(sourceDir, "next.config.mjs")) {
                        return "nextjs"
                }
                if fileExists(filepath.Join(sourceDir, "nuxt.config.js")) || fileExists(filepath.Join(sourceDir, "nuxt.config.ts")) {
                        return "nuxtjs"
                }
                if fileExists(filepath.Join(sourceDir, "vite.config.js")) || fileExists(filepath.Join(sourceDir, "vite.config.ts")) {
                        return "vite"
                }
                return "node"
        }

        // Check for Python
        if fileExists(filepath.Join(sourceDir, "requirements.txt")) || fileExists(filepath.Join(sourceDir, "Pipfile")) || fileExists(filepath.Join(sourceDir, "pyproject.toml")) {
                if fileExists(filepath.Join(sourceDir, "manage.py")) {
                        return "django"
                }
                if fileExists(filepath.Join(sourceDir, "app.py")) || fileExists(filepath.Join(sourceDir, "wsgi.py")) {
                        return "flask"
                }
                return "python"
        }

        // Check for Go
        if fileExists(filepath.Join(sourceDir, "go.mod")) {
                return "go"
        }

        // Check for Ruby
        if fileExists(filepath.Join(sourceDir, "Gemfile")) {
                return "ruby"
        }

        // Check for PHP
        if fileExists(filepath.Join(sourceDir, "composer.json")) {
                return "php"
        }

        // Check for static site
        if fileExists(filepath.Join(sourceDir, "index.html")) {
                return "static"
        }

        return "unknown"
}

// GenerateDockerfile creates a Dockerfile based on the detected framework
func GenerateDockerfile(framework string, app *model.App) (string, error) {
        port := app.Port
        if port == 0 {
                port = 3000
        }

        switch framework {
        case "node", "nextjs", "nuxtjs", "vite":
                return generateNodeDockerfile(port), nil
        case "python", "django", "flask":
                return generatePythonDockerfile(port), nil
        case "go":
                return generateGoDockerfile(port), nil
        case "static":
                return generateStaticDockerfile(port), nil
        case "ruby":
                return generateRubyDockerfile(port), nil
        case "php":
                return generatePHPDockerfile(port), nil
        default:
                return generateGenericDockerfile(port), nil
        }
}

func generateNodeDockerfile(port int) string {
        return fmt.Sprintf(`FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY . .
RUN npm run build 2>/dev/null || true

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=%d
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./
EXPOSE %d
CMD ["npm", "start"]
`, port, port)
}

func generatePythonDockerfile(port int) string {
        return fmt.Sprintf(`FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt* Pipfile* pyproject.toml* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; elif [ -f pyproject.toml ]; then pip install --no-cache-dir .; elif [ -f Pipfile ]; then pip install pipenv && pipenv install --system --deploy; fi
COPY . .
ENV PORT=%d
EXPOSE %d
CMD ["python", "app.py"]
`, port, port)
}

func generateGoDockerfile(port int) string {
        return fmt.Sprintf(`FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod* go.sum* ./
RUN go mod download 2>/dev/null || true
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
ENV PORT=%d
EXPOSE %d
CMD ["./server"]
`, port, port)
}

func generateStaticDockerfile(port int) string {
        return fmt.Sprintf(`FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE %d
CMD ["nginx", "-g", "daemon off;"]
`, port)
}

func generateRubyDockerfile(port int) string {
        return fmt.Sprintf(`FROM ruby:3.3-slim
WORKDIR /app
COPY Gemfile* ./
RUN bundle install 2>/dev/null || bundle install --no-deployment
COPY . .
ENV PORT=%d
EXPOSE %d
CMD ["bundle", "exec", "rackup", "--host", "0.0.0.0", "-p", "%d"]
`, port, port, port)
}

func generatePHPDockerfile(port int) string {
        return fmt.Sprintf(`FROM php:8.3-apache
WORKDIR /var/www/html
COPY . .
RUN if [ -f composer.json ]; then curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer && composer install --no-dev --optimize-autoloader 2>/dev/null || true; fi
RUN docker-php-ext-install pdo pdo_mysql 2>/dev/null || true
EXPOSE %d
CMD ["apache2-foreground"]
`, port)
}

func generateGenericDockerfile(port int) string {
        return fmt.Sprintf(`FROM alpine:3.19
WORKDIR /app
COPY . .
ENV PORT=%d
EXPOSE %d
CMD ["sh", "-c", "echo 'No CMD specified' && tail -f /dev/null"]
`, port, port)
}

// createBuildContext creates a tar archive of the build context directory
func createBuildContext(dir string) (*bytes.Reader, error) {
        var buf bytes.Buffer
        tw := tar.NewWriter(&buf)

        err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
                if err != nil {
                        return err
                }

                // Skip .git directory
                if strings.Contains(path, ".git") {
                        if info.IsDir() {
                                return filepath.SkipDir
                        }
                        return nil
                }

                // Skip node_modules
                if strings.Contains(path, "node_modules") {
                        if info.IsDir() {
                                return filepath.SkipDir
                        }
                        return nil
                }

                header, err := tar.FileInfoHeader(info, info.Name())
                if err != nil {
                        return err
                }

                relPath, err := filepath.Rel(dir, path)
                if err != nil {
                        return err
                }
                header.Name = relPath

                if err := tw.WriteHeader(header); err != nil {
                        return err
                }

                if !info.IsDir() {
                        data, err := os.ReadFile(path)
                        if err != nil {
                                return err
                        }
                        if _, err := tw.Write(data); err != nil {
                                return err
                        }
                }

                return nil
        })

        if err != nil {
                return nil, fmt.Errorf("walking build context: %w", err)
        }

        if err := tw.Close(); err != nil {
                return nil, fmt.Errorf("closing tar writer: %w", err)
        }

        return bytes.NewReader(buf.Bytes()), nil
}

func fileExists(path string) bool {
        _, err := os.Stat(path)
        return err == nil
}
