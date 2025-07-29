package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"soxdrawer/internal/httpserver"
	"soxdrawer/internal/server"
	"soxdrawer/internal/store"
)

func main() {
	natsServer, err := server.New(server.DefaultConfig())
	if err != nil {
		log.Fatalf("Failed to create NATS server: %v", err)
	}

	if err := natsServer.Start(); err != nil {
		log.Fatalf("Failed to start NATS server: %v", err)
	}

	objectStore, err := store.New(natsServer.JetStream())
	if err != nil {
		log.Fatalf("Failed to create object store: %v", err)
	}

	status, _ := objectStore.Status()
	log.Println("Object store 'default' is ready")
	log.Printf("Object store status - Bucket: %s, Size: %d", status.Bucket(), status.Size())

	// Start HTTP server
	httpConfig := httpserver.DefaultConfig()
	httpServer := httpserver.New(httpConfig, objectStore)
	if err := httpServer.Start(); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}

	// Set up graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	log.Println("SoxDrawer is running with HTTP server. Press Ctrl+C to stop.")

	// Wait for shutdown signal
	<-sigChan

	shutdown(natsServer, httpServer)
}

func shutdown(natsServer *server.NATSServer, httpServer *httpserver.Server) {
	log.Println("Shutting down SoxDrawer...")

	// Gracefully shutdown
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
