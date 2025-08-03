package main

import (
	"context"
	"embed"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"soxdrawer/internal/http"
	"soxdrawer/internal/nats"
	"soxdrawer/internal/store"
)

//go:embed web/dist/*
var content embed.FS

func main() {
	natsServer, _ := nats.NewServer(nats.DefaultConfig())
	if err := natsServer.Start(); err != nil {
		log.Fatalf("Failed to start NATS server: %v", err)
	}

	store, err := store.New(natsServer.JetStream())
	if err != nil {
		log.Fatalf("Failed to create object store: %v", err)
	}

	status, _ := store.Status()
	log.Printf("Object store status - Bucket: %s, Size: %d", status.Bucket(), status.Size())

	httpCfg := http.DefaultConfig()
	httpCfg.Assets = content
	httpServer := http.New(httpCfg, store)
	if err := httpServer.Start(); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	log.Println("soxdrawer is running. Press Ctrl+C to stop.")

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
