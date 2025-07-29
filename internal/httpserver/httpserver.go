package httpserver

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"soxdrawer/internal/store"
)

// Server holds the HTTP server and its dependencies
type Server struct {
	Address     string
	ObjectStore *store.ObjectStore
	server      *http.Server
}

// Config holds configuration for the HTTP server
type Config struct {
	Address string
}

// DefaultConfig returns a default HTTP server configuration
func DefaultConfig() *Config {
	return &Config{
		Address: ":8080",
	}
}

// New creates a new HTTP server instance
func New(config *Config, objectStore *store.ObjectStore) *Server {
	return &Server{
		Address:     config.Address,
		ObjectStore: objectStore,
	}
}

// Start starts the HTTP server with routes
func (s *Server) Start() error {
	mux := http.NewServeMux()
	mux.HandleFunc("/", s.indexHandler)
	mux.HandleFunc("/upload", s.uploadHandler)

	s.server = &http.Server{
		Addr:    s.Address,
		Handler: mux,
	}

	log.Printf("Starting HTTP server on %s", s.Address)
	
	// Start server in a goroutine so it doesn't block
	go func() {
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start HTTP server: %v", err)
		}
	}()

	return nil
}

// Stop gracefully shuts down the HTTP server
func (s *Server) Stop(ctx context.Context) error {
	if s.server == nil {
		return nil
	}

	log.Println("Shutting down HTTP server...")
	return s.server.Shutdown(ctx)
}

// indexHandler handles the index page
func (s *Server) indexHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	html := `<!DOCTYPE html>
<html>
<head>
    <title>SoxDrawer</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 600px; margin: 0 auto; }
        .upload-form { margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
        button { background-color: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background-color: #005a87; }
        input[type="file"] { margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to SoxDrawer</h1>
        <p>A NATS-powered object storage service.</p>
        
        <div class="upload-form">
            <h2>Upload File</h2>
            <form action="/upload" method="post" enctype="multipart/form-data">
                <input type="file" name="file" required>
                <br>
                <button type="submit">Upload</button>
            </form>
        </div>
    </div>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, html)
}

// uploadHandler handles the file upload endpoint
func (s *Server) uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Implement file upload logic
	// This will parse the multipart form, extract the file,
	// and store it in the NATS object store

	log.Printf("Upload request received from %s", r.RemoteAddr)
	
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "stub", "message": "Upload endpoint not yet implemented"}`)
}
