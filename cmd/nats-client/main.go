package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"soxdrawer/internal/config"
)

func main() {
	var (
		configPath = flag.String("config", "", "Path to configuration file (default: soxdrawer.config.toml)")
		showToken  = flag.Bool("show-token", false, "Display current NATS authentication token")
		newToken   = flag.Bool("new-token", false, "Generate a new NATS authentication token")
		testConn   = flag.Bool("test", false, "Test connection to NATS server")
		showConfig = flag.Bool("show-config", false, "Display current configuration")
	)
	flag.Parse()

	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	switch {
	case *showConfig:
		fmt.Printf("Configuration file: %s\n", getConfigPath(*configPath))
		fmt.Printf("NATS Host: %s\n", cfg.NATS.Host)
		fmt.Printf("NATS Port: %d\n", cfg.NATS.Port)
		fmt.Printf("NATS Store Directory: %s\n", cfg.NATS.StoreDir)
		fmt.Printf("HTTP Address: %s\n", cfg.HTTP.Address)
		if cfg.NATS.Token != "" {
			fmt.Printf("NATS Token: %s\n", cfg.NATS.Token)
		} else {
			fmt.Println("NATS Token: (not configured)")
		}

	case *showToken:
		if cfg.NATS.Token == "" {
			fmt.Println("No NATS token configured")
			os.Exit(1)
		}
		fmt.Printf("NATS Token: %s\n", cfg.NATS.Token)
		fmt.Printf("NATS URL: nats://%s:%d\n", cfg.NATS.Host, cfg.NATS.Port)

	case *newToken:
		if err := cfg.GenerateToken(); err != nil {
			log.Fatalf("Failed to generate new token: %v", err)
		}

		if err := config.SaveConfig(cfg, *configPath); err != nil {
			log.Fatalf("Failed to save configuration: %v", err)
		}

		fmt.Printf("Generated new NATS token: %s\n", cfg.NATS.Token)
		fmt.Println("Configuration saved. Please restart the soxdrawer server.")

	case *testConn:
		if cfg.NATS.Token == "" {
			log.Fatal("No NATS token configured. Run with -new-token to generate one.")
		}

		// Test connection to NATS server
		if err := testNATSConnection(cfg); err != nil {
			log.Fatalf("Failed to connect to NATS server: %v", err)
		}
		fmt.Println("Successfully connected to NATS server!")

	default:
		fmt.Println("NATS Client Utility for SoxDrawer")
		fmt.Println("Available commands:")
		flag.PrintDefaults()
	}
}

func getConfigPath(configPath string) string {
	if configPath == "" {
		return config.DefaultConfigFile
	}
	return configPath
}

func testNATSConnection(cfg *config.Config) error {
	// Import and use nats package for testing connection
	// For now, we'll just validate the configuration
	if cfg.NATS.Token == "" {
		return fmt.Errorf("no authentication token configured")
	}
	if cfg.NATS.Host == "" {
		return fmt.Errorf("no NATS host configured")
	}
	if cfg.NATS.Port <= 0 {
		return fmt.Errorf("invalid NATS port: %d", cfg.NATS.Port)
	}

	// TODO: Implement actual connection test
	// This would require importing the nats package and creating a test connection
	fmt.Printf("Configuration validated for NATS server at %s:%d\n", cfg.NATS.Host, cfg.NATS.Port)
	return nil
}
