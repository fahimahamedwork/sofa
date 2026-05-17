package config

import (
        "fmt"
        "time"

        "github.com/spf13/viper"
)

type Config struct {
        Server   ServerConfig   `mapstructure:"server"`
        Database DatabaseConfig `mapstructure:"database"`
        Redis    RedisConfig    `mapstructure:"redis"`
        Auth     AuthConfig     `mapstructure:"auth"`
        Docker   DockerConfig   `mapstructure:"docker"`
        Traefik  TraefikConfig  `mapstructure:"traefik"`
}

type ServerConfig struct {
        Port int    `mapstructure:"port"`
        Host string `mapstructure:"host"`
}

type DatabaseConfig struct {
        Host     string `mapstructure:"host"`
        Port     int    `mapstructure:"port"`
        User     string `mapstructure:"user"`
        Password string `mapstructure:"password"`
        DBName   string `mapstructure:"dbname"`
        SSLMode  string `mapstructure:"sslmode"`
}

type RedisConfig struct {
        Host     string `mapstructure:"host"`
        Port     int    `mapstructure:"port"`
        Password string `mapstructure:"password"`
        DB       int    `mapstructure:"db"`
}

type AuthConfig struct {
        JWTSecret     string        `mapstructure:"jwt_secret"`
        AdminPassword string        `mapstructure:"admin_password"`
        TokenDuration time.Duration `mapstructure:"token_duration"`
}

type DockerConfig struct {
        SocketPath  string `mapstructure:"socket_path"`
        NetworkName string `mapstructure:"network_name"`
}

type TraefikConfig struct {
        APIURL     string `mapstructure:"api_url"`
        BaseDomain string `mapstructure:"base_domain"`
}

func (d *DatabaseConfig) DSN() string {
        return fmt.Sprintf(
                "host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
                d.Host, d.Port, d.User, d.Password, d.DBName, d.SSLMode,
        )
}

func (r *RedisConfig) Addr() string {
        return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

func Load() (*Config, error) {
        viper.SetConfigName("config")
        viper.SetConfigType("yaml")
        viper.AddConfigPath(".")
        viper.AddConfigPath("./config")
        viper.AddConfigPath("/etc/sofa")

        viper.SetEnvPrefix("SOFA")
        viper.AutomaticEnv()

        setDefaults()

        if err := viper.ReadInConfig(); err != nil {
                if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
                        return nil, fmt.Errorf("reading config: %w", err)
                }
        }

        var cfg Config
        if err := viper.Unmarshal(&cfg); err != nil {
                return nil, fmt.Errorf("unmarshaling config: %w", err)
        }

        return &cfg, nil
}

func setDefaults() {
        viper.SetDefault("server.port", 8080)
        viper.SetDefault("server.host", "0.0.0.0")

        viper.SetDefault("database.host", "localhost")
        viper.SetDefault("database.port", 5432)
        viper.SetDefault("database.user", "sofa")
        viper.SetDefault("database.password", "sofa")
        viper.SetDefault("database.dbname", "sofa")
        viper.SetDefault("database.sslmode", "disable")

        viper.SetDefault("redis.host", "localhost")
        viper.SetDefault("redis.port", 6379)
        viper.SetDefault("redis.password", "")
        viper.SetDefault("redis.db", 0)

        viper.SetDefault("auth.jwt_secret", "sofa-secret-change-in-production")
        viper.SetDefault("auth.admin_password", "admin")
        viper.SetDefault("auth.token_duration", "24h")

        viper.SetDefault("docker.socket_path", "/var/run/docker.sock")
        viper.SetDefault("docker.network_name", "sofa-network")

        viper.SetDefault("traefik.api_url", "http://localhost:8080")
        viper.SetDefault("traefik.base_domain", "localhost")
}
