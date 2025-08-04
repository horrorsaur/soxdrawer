package config

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
	"soxdrawer/internal/auth"
)

type (
	// Config holds the application configuration
	Config struct {
		NATS NATSConfig           `toml:"nats"`
		HTTP HTTPConfig           `toml:"http"`
		Auth AuthConfig           `toml:"auth"`
		Users map[string]*auth.User `toml:"users"`
	}

	// NATSConfig holds NATS server configuration
	NATSConfig struct {
		Host     string `toml:"host"`
		Port     int    `toml:"port"`
		StoreDir string `toml:"store_dir"`
		Token    string `toml:"token"`
	}

	// HTTPConfig holds HTTP server configuration
	HTTPConfig struct {
		Address string `toml:"address"`
	}

	// AuthConfig holds authentication configuration
	AuthConfig struct {
		Enabled              bool `toml:"enabled"`
		RequireAuthentication bool `toml:"require_authentication"`
	}
)

const (
	DefaultConfigFile = "soxdrawer.config.toml"
	ConfigDirPerm     = 0755
	ConfigFilePerm    = 0600 // Restrict access to config file due to sensitive tokens
)

// DefaultConfig returns a configuration with sensible defaults
func DefaultConfig() *Config {
	return &Config{
		NATS: NATSConfig{
			Host:     "127.0.0.1",
			Port:     4222,
			StoreDir: "./jetstream",
			Token:    "", // Will be generated if empty
		},
		HTTP: HTTPConfig{
			Address: ":8080",
		},
		Auth: AuthConfig{
			Enabled:              true,
			RequireAuthentication: true,
		},
		Users: make(map[string]*auth.User),
	}
}

// LoadConfig loads configuration from file, creating it with defaults if it doesn't exist
func LoadConfig(configPath string) (*Config, error) {
	if configPath == "" {
		configPath = DefaultConfigFile
	}

	// Check if config file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		// Create default config and save it
		config := DefaultConfig()
		if err := SaveConfig(config, configPath); err != nil {
			return nil, fmt.Errorf("failed to create default config: %w", err)
		}
		return config, nil
	}

	// Load existing config
	var config Config
	if _, err := toml.DecodeFile(configPath, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	// Ensure Users map is initialized
	if config.Users == nil {
		config.Users = make(map[string]*auth.User)
	}

	return &config, nil
}

// SaveConfig saves configuration to file
func SaveConfig(config *Config, configPath string) error {
	if configPath == "" {
		configPath = DefaultConfigFile
	}

	// Ensure directory exists
	dir := filepath.Dir(configPath)
	if dir != "." {
		if err := os.MkdirAll(dir, ConfigDirPerm); err != nil {
			return fmt.Errorf("failed to create config directory: %w", err)
		}
	}

	// Create the file with restricted permissions
	file, err := os.OpenFile(configPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, ConfigFilePerm)
	if err != nil {
		return fmt.Errorf("failed to create config file: %w", err)
	}
	defer file.Close()

	// Write TOML header comment
	if _, err := file.WriteString("# SoxDrawer Configuration\n"); err != nil {
		return fmt.Errorf("failed to write config header: %w", err)
	}
	if _, err := file.WriteString("# This file contains sensitive authentication tokens and password hashes - keep it secure!\n\n"); err != nil {
		return fmt.Errorf("failed to write config header: %w", err)
	}

	// Encode config to TOML
	encoder := toml.NewEncoder(file)
	if err := encoder.Encode(config); err != nil {
		return fmt.Errorf("failed to encode config to TOML: %w", err)
	}

	return nil
}

// GenerateToken creates a new authentication token and updates the config
func (c *Config) GenerateToken() error {
	token, err := generateSecureToken()
	if err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}
	
	c.NATS.Token = token
	return nil
}

// generateSecureToken creates a secure random token
func generateSecureToken() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}
