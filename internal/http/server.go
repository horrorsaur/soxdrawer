package http

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"soxdrawer/internal/store"
)

type (
	Server struct {
		Address     string
		ObjectStore *store.ObjectStore
		server      *http.Server
	}

	Config struct {
		Address string
	}

	UploadResponse struct {
		Status   string `json:"status"`
		Message  string `json:"message"`
		Key      string `json:"key,omitempty"`
		Size     int64  `json:"size,omitempty"`
		Filename string `json:"filename,omitempty"`
	}
)

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
        .result { margin-top: 20px; padding: 15px; border-radius: 3px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to SoxDrawer</h1>
        <p>A NATS-powered object storage service.</p>
        
        <div class="upload-form">
            <h2>Upload File</h2>
            <form action="/upload" method="post" enctype="multipart/form-data" id="uploadForm">
                <input type="file" name="file" required>
                <br>
                <button type="submit">Upload</button>
            </form>
            <div id="result"></div>
        </div>
    </div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const resultDiv = document.getElementById('result');
            
            resultDiv.innerHTML = '<p>Uploading...</p>';
            
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    resultDiv.innerHTML = '<div class="result success"><strong>Success!</strong><br>' +
                        'File: ' + data.filename + '<br>' +
                        'Key: ' + data.key + '<br>' +
                        'Size: ' + data.size + ' bytes</div>';
                } else {
                    resultDiv.innerHTML = '<div class="result error"><strong>Error:</strong> ' + data.message + '</div>';
                }
            })
            .catch(error => {
                resultDiv.innerHTML = '<div class="result error"><strong>Error:</strong> ' + error.message + '</div>';
            });
        });
    </script>
</body>
</html>`

	w.Header().Set("Content-Type", "text/html")
	fmt.Fprint(w, html)
}

// uploadHandler handles the file upload endpoint
func (s *Server) uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Set maximum memory for multipart parsing (32MB)
	const maxMemory = 32 << 20
	if err := r.ParseMultipartForm(maxMemory); err != nil {
		log.Printf("Failed to parse multipart form: %v", err)
		s.sendErrorResponse(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	// Get the file from the form
	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("Failed to get file from form: %v", err)
		s.sendErrorResponse(w, "No file provided or invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Generate a unique key
	filename := header.Filename
	if filename == "" {
		filename = "unnamed_file"
	}

	// Clean the filename and create a unique key
	cleanFilename := sanitizeFilename(filename)
	timestamp := time.Now().Unix()
	key := fmt.Sprintf("%d_%s", timestamp, cleanFilename)

	log.Printf("Uploading file: %s (original: %s) as key: %s", cleanFilename, filename, key)

	// Store the file in the object store
	info, err := s.ObjectStore.PutReader(key, file)
	if err != nil {
		log.Printf("Failed to store file %s: %v", key, err)
		s.sendErrorResponse(w, "Failed to store file", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully uploaded file %s (size: %d bytes)", key, info.Size)

	// Send success response
	response := UploadResponse{
		Status:   "success",
		Message:  "File uploaded successfully",
		Key:      key,
		Size:     int64(info.Size),
		Filename: filename,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// sendErrorResponse sends a JSON error response
func (s *Server) sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	response := UploadResponse{
		Status:  "error",
		Message: message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

// sanitizeFilename removes potentially dangerous characters from filenames
func sanitizeFilename(filename string) string {
	// Get just the base filename without path
	base := filepath.Base(filename)
	
	// Replace spaces and special characters with underscores
	cleaned := strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= 'A' && r <= 'Z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r == '.' || r == '-' || r == '_':
			return r
		default:
			return '_'
		}
	}, base)
	
	// Ensure it's not empty
	if cleaned == "" || cleaned == "." {
		cleaned = "unnamed_file"
	}
	
	return cleaned
}
