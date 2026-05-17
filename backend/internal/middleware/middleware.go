package middleware

import (
        "fmt"
        "net/http"
        "strings"
        "time"

        "github.com/gin-gonic/gin"
        "github.com/golang-jwt/jwt/v5"
        "github.com/sofa/sofa-backend/internal/config"
        "go.uber.org/zap"
)

// Claims represents the JWT claims
type Claims struct {
        UserID   string `json:"user_id"`
        Username string `json:"username"`
        jwt.RegisteredClaims
}

// GenerateToken generates a new JWT token
func GenerateToken(userID, username, secret string, duration time.Duration) (string, error) {
        claims := Claims{
                UserID:   userID,
                Username: username,
                RegisteredClaims: jwt.RegisteredClaims{
                        ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
                        IssuedAt:  jwt.NewNumericDate(time.Now()),
                        Issuer:    "sofa-panel",
                },
        }

        token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
        return token.SignedString([]byte(secret))
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenString, secret string) (*Claims, error) {
        token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
                if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                        return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
                }
                return []byte(secret), nil
        })

        if err != nil {
                return nil, err
        }

        if claims, ok := token.Claims.(*Claims); ok && token.Valid {
                return claims, nil
        }

        return nil, fmt.Errorf("invalid token")
}

// AuthRequired returns a middleware that validates JWT tokens
func AuthRequired(cfg *config.Config) gin.HandlerFunc {
        return func(c *gin.Context) {
                authHeader := c.GetHeader("Authorization")
                if authHeader == "" {
                        c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                                "error": "Authorization header is required",
                        })
                        return
                }

                parts := strings.SplitN(authHeader, " ", 2)
                if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
                        c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                                "error": "Authorization header format must be Bearer {token}",
                        })
                        return
                }

                claims, err := ValidateToken(parts[1], cfg.Auth.JWTSecret)
                if err != nil {
                        c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                                "error": "Invalid or expired token",
                        })
                        return
                }

                c.Set("user_id", claims.UserID)
                c.Set("username", claims.Username)
                c.Next()
        }
}

// CORSConfig returns a CORS middleware for the frontend
func CORSConfig() gin.HandlerFunc {
        return func(c *gin.Context) {
                origin := c.GetHeader("Origin")

                // Allow any origin since this is a personal self-hosted panel
                if origin != "" {
                        c.Header("Access-Control-Allow-Origin", origin)
                }

                c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
                c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
                c.Header("Access-Control-Expose-Headers", "Content-Length")
                c.Header("Access-Control-Allow-Credentials", "true")
                c.Header("Access-Control-Max-Age", "86400")

                if c.Request.Method == http.MethodOptions {
                        c.AbortWithStatus(http.StatusNoContent)
                        return
                }

                c.Next()
        }
}

// Logger returns a request logging middleware using zap
func Logger(logger *zap.Logger) gin.HandlerFunc {
        return func(c *gin.Context) {
                start := time.Now()
                path := c.Request.URL.Path
                query := c.Request.URL.RawQuery

                c.Next()

                latency := time.Since(start)
                status := c.Writer.Status()

                fields := []zap.Field{
                        zap.Int("status", status),
                        zap.String("method", c.Request.Method),
                        zap.String("path", path),
                        zap.String("query", query),
                        zap.String("ip", c.ClientIP()),
                        zap.Duration("latency", latency),
                        zap.Int("body_size", c.Writer.Size()),
                }

                if len(c.Errors) > 0 {
                        fields = append(fields, zap.String("errors", c.Errors.ByType(gin.ErrorTypePrivate).String()))
                }

                if status >= 500 {
                        logger.Error("Server error", fields...)
                } else if status >= 400 {
                        logger.Warn("Client error", fields...)
                } else {
                        logger.Info("Request", fields...)
                }
        }
}
