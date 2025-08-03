package nats

import (
	"context"
	"crypto/rand"
	"encoding/hex"
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
		token  string
	}

	Config struct {
		Host     string
		Port     int
		StoreDir string
		Token    string // Authentication token
	}
)

func DefaultConfig() *Config {
	return &Config{
		Host:     "127.0.0.1",
		Port:     4222,
		StoreDir: "./jetstream",
		Token:    "", // Will be generated if empty
	}
}

// GenerateToken creates a secure random token for NATS authentication
func GenerateToken() (string, error) {
	bytes := make([]byte, 32) // 256 bits
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

func NewServer(config *Config) (*NATSServer, error) {
	token := config.Token
	if token == "" {
		var err error
		token, err = GenerateToken()
		if err != nil {
			return nil, fmt.Errorf("failed to generate authentication token: %w", err)
		}
		log.Printf("Generated NATS authentication token: %s", token)
	}

	opts := &natsServer.Options{
		Host:      config.Host,
		Port:      config.Port,
		JetStream: true,
		StoreDir:  config.StoreDir,
		
		// Token-based authentication
		Authorization: token,
		
		// Additional security settings
		WriteDeadline: 10 * time.Second,
		MaxPayload:     1 << 20, // 1MB
	}

	ns, err := natsServer.NewServer(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create NATS server: %w", err)
	}

	return &NATSServer{
		server: ns,
		opts:   opts,
		token:  token,
	}, nil
}

// Start starts the NATS server and establishes connections
func (ns *NATSServer) Start() error {
	go ns.server.Start()

	if !ns.server.ReadyForConnections(10 * time.Second) {
		return fmt.Errorf("NATS server failed to start within timeout")
	}

	log.Printf("NATS server started on %s:%d with JetStream enabled and token authentication", ns.opts.Host, ns.opts.Port)

	url := fmt.Sprintf("nats://%s:%d", ns.opts.Host, ns.opts.Port)
	conn, err := nats.Connect(url, nats.Token(ns.token))
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

// Token returns the authentication token
func (ns *NATSServer) Token() string {
	return ns.token
}

// CreateClientConnection creates a new authenticated connection for external clients
func (ns *NATSServer) CreateClientConnection() (*nats.Conn, error) {
	url := fmt.Sprintf("nats://%s:%d", ns.opts.Host, ns.opts.Port)
	return nats.Connect(url, nats.Token(ns.token))
}
