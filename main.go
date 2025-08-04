package main

import (
	"context"
	"embed"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"soxdrawer/internal/config"
	"soxdrawer/internal/http"
	"soxdrawer/internal/nats"
	"soxdrawer/internal/store"
)

//go:embed web/dist/*
var content embed.FS

func main() {
	// Load configuration
	cfg, err := config.LoadConfig("")
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Generate token if not present
	if cfg.NATS.Token == "" {
		if err := cfg.GenerateToken(); err != nil {
			log.Fatalf("Failed to generate NATS token: %v", err)
		}

		// Save the updated configuration
		if err := config.SaveConfig(cfg, ""); err != nil {
			log.Printf("Warning: Failed to save configuration with generated token: %v", err)
		} else {
			log.Println("Generated and saved new NATS authentication token")
		}
	}

	// Generate HTTP authentication token if not present
	if cfg.HTTP.Auth.Token == "" {
		if err := cfg.GenerateHTTPToken(); err != nil {
			log.Fatalf("Failed to generate HTTP authentication token: %v", err)
		}

		// Save the updated configuration
		if err := config.SaveConfig(cfg, ""); err != nil {
			log.Printf("Warning: Failed to save configuration with generated HTTP token: %v", err)
		} else {
			log.Println("Generated and saved new HTTP authentication token")
		}
	}

	// Create NATS configuration from loaded config
	natsConfig := &nats.Config{
		Host:     cfg.NATS.Host,
		Port:     cfg.NATS.Port,
		StoreDir: cfg.NATS.StoreDir,
		Token:    cfg.NATS.Token,
	}

	natsServer, err := nats.NewServer(natsConfig)
	if err != nil {
		log.Fatalf("Failed to create NATS server: %v", err)
	}

	if err := natsServer.Start(); err != nil {
		log.Fatalf("Failed to start NATS server: %v", err)
	}

	log.Printf("NATS server is secured with token authentication")

	store, err := store.New(natsServer.JetStream())
	if err != nil {
		log.Fatalf("Failed to create object store: %v", err)
	}

	status, _ := store.Status()
	log.Printf("Object store status - Bucket: %s, Size: %d", status.Bucket(), status.Size())

	httpCfg := &http.Config{
		Address:   cfg.HTTP.Address,
		Assets:    content,
		AuthToken: cfg.HTTP.Auth.Token,
	}
	httpServer := http.New(httpCfg, store)
	if err := httpServer.Start(); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	log.Println("soxdrawer is running. Press Ctrl+C to stop.")
	log.Printf("HTTP server: http://localhost%s", cfg.HTTP.Address)
	log.Printf("NATS server: %s (token required)", natsServer.URL())
	log.Printf("HTTP authentication token: %s", cfg.HTTP.Auth.Token)

	<-sigChan
	shutdown(natsServer, httpServer)
}

func shutdown(natsServer *nats.NATSServer, httpServer *http.Server) {
	log.Println("Shutting down SoxDrawer...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := natsServer.Stop(ctx); err != nil {
		log.Printf("Error during shutdown: %v", err)
	}

	if err := httpServer.Stop(ctx); err != nil {
		log.Printf("Error during HTTP server shutdown: %v", err)
	}

	log.Println("SoxDrawer shutdown completed")
}
