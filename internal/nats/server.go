package nats

import (
	"context"
	"fmt"
	"log"
	"time"

	natsServer "github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
)

type (
	NATSServer struct {
		server *natsServer.Server
		conn   *nats.Conn
		js     nats.JetStreamContext
		opts   *natsServer.Options
	}

	Config struct {
		Host     string
		Port     int
		StoreDir string
	}
)

func DefaultConfig() *Config {
	return &Config{
		Host:     "127.0.0.1",
		Port:     4222,
		StoreDir: "./jetstream",
	}
}

func NewServer(config *Config) (*NATSServer, error) {
	opts := &natsServer.Options{
		Host:      config.Host,
		Port:      config.Port,
		JetStream: true,
		StoreDir:  config.StoreDir,
	}

	ns, err := natsServer.NewServer(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create NATS server: %w", err)
	}

	return &NATSServer{
		server: ns,
		opts:   opts,
	}, nil
}

// Start starts the NATS server and establishes connections
func (ns *NATSServer) Start() error {
	go ns.server.Start()

	if !ns.server.ReadyForConnections(10 * time.Second) {
		return fmt.Errorf("NATS server failed to start within timeout")
	}

	log.Printf("NATS server started on %s:%d with JetStream enabled", ns.opts.Host, ns.opts.Port)

	url := fmt.Sprintf("nats://%s:%d", ns.opts.Host, ns.opts.Port)
	conn, err := nats.Connect(url)
	if err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}
	ns.conn = conn

	// Create JetStream context
	js, err := conn.JetStream()
	if err != nil {
		return fmt.Errorf("failed to create JetStream context: %w", err)
	}
	ns.js = js

	return nil
}

// Stop gracefully shuts down the NATS server
func (ns *NATSServer) Stop(ctx context.Context) error {
	done := make(chan bool, 1)
	go func() {
		if ns.conn != nil {
			ns.conn.Close()
		}
		if ns.server != nil {
			ns.server.Shutdown()
		}
		done <- true
	}()

	select {
	case <-done:
		log.Println("NATS server shutdown completed")
		return nil
	case <-ctx.Done():
		return fmt.Errorf("shutdown timeout exceeded")
	}
}

// Connection returns the NATS connection
func (ns *NATSServer) Connection() *nats.Conn {
	return ns.conn
}

// JetStream returns the JetStream context
func (ns *NATSServer) JetStream() nats.JetStreamContext {
	return ns.js
}

// URL returns the server URL
func (ns *NATSServer) URL() string {
	return fmt.Sprintf("nats://%s:%d", ns.opts.Host, ns.opts.Port)
}
