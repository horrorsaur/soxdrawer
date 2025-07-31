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

	ListResponse struct {
		Status  string              `json:"status"`
		Message string              `json:"message"`
		Objects []*store.ObjectInfo `json:"objects,omitempty"`
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
	mux.HandleFunc("/list", s.listHandler)
	mux.HandleFunc("/upload", s.uploadHandler)
	mux.HandleFunc("/delete/", s.deleteHandler)
	mux.HandleFunc("/download/", s.downloadHandler)

	s.server = &http.Server{
		Addr:    s.Address,
		Handler: corsMiddleware(mux),
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

// indexHandler handles the homepage
func (s *Server) indexHandler(w http.ResponseWriter, r *http.Request) {
	s.sendJSONResponse(w, http.StatusOK, "server is up")
}

// listHandler handles the list endpoint
func (s *Server) listHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	objects, err := s.ObjectStore.ListObjectsForAPI()
	if err != nil {
		log.Printf("Failed to list objects: %v", err)
		s.sendErrorResponse(w, "Failed to list objects", http.StatusInternalServerError)
		return
	}

	response := ListResponse{
		Status:  "success",
		Message: "",
		Objects: objects,
	}

	s.sendJSONResponse(w, http.StatusOK, response)
}

// uploadHandler handles the file upload endpoint
func (s *Server) uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	const maxMemory = 32 << 20
	if err := r.ParseMultipartForm(maxMemory); err != nil {
		log.Printf("Failed to parse multipart form: %v", err)
		if r.Header.Get("HX-Request") == "true" {
			errorHTML := `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				<strong>Error:</strong> Failed to parse form data
			</div>`
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(errorHTML))
		} else {
			s.sendErrorResponse(w, "Failed to parse form data", http.StatusBadRequest)
		}
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("Failed to get file from form: %v", err)
		if r.Header.Get("HX-Request") == "true" {
			errorHTML := `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				<strong>Error:</strong> No file provided or invalid file
			</div>`
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(errorHTML))
		} else {
			s.sendErrorResponse(w, "No file provided or invalid file", http.StatusBadRequest)
		}
		return
	}
	defer file.Close()

	filename := header.Filename
	if filename == "" {
		filename = "unnamed_file"
	}

	cleanFilename := sanitizeFilename(filename)
	timestamp := time.Now().Unix()
	key := fmt.Sprintf("%d_%s", timestamp, cleanFilename)

	log.Printf("Uploading file: %s (original: %s) as key: %s", cleanFilename, filename, key)

	info, err := s.ObjectStore.PutReader(key, file)
	if err != nil {
		log.Printf("Failed to store file %s: %v", key, err)
		if r.Header.Get("HX-Request") == "true" {
			errorHTML := `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				<strong>Error:</strong> Failed to store file
			</div>`
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(errorHTML))
		} else {
			s.sendErrorResponse(w, "Failed to store file", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Successfully uploaded file %s (size: %d bytes)", key, info.Size)

	response := UploadResponse{
		Status:   "success",
		Message:  "File uploaded successfully",
		Key:      key,
		Size:     int64(info.Size),
		Filename: filename,
	}

	s.sendJSONResponse(w, http.StatusOK, response)
}

// deleteHandler handles the delete endpoint
func (s *Server) deleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		if r.Header.Get("HX-Request") == "true" {
			errorHTML := `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				<strong>Error:</strong> Method not allowed
			</div>`
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusMethodNotAllowed)
			w.Write([]byte(errorHTML))
		} else {
			s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Extract the key from the URL path
	path := strings.TrimPrefix(r.URL.Path, "/delete/")
	if path == "" {
		if r.Header.Get("HX-Request") == "true" {
			errorHTML := `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				<strong>Error:</strong> No key provided
			</div>`
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(errorHTML))
		} else {
			s.sendErrorResponse(w, "No key provided", http.StatusBadRequest)
		}
		return
	}

	key := strings.TrimSpace(path)
	log.Printf("Deleting object: %s", key)

	err := s.ObjectStore.Delete(key)
	if err != nil {
		log.Printf("Failed to delete object %s: %v", key, err)
		if r.Header.Get("HX-Request") == "true" {
			errorHTML := `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
				<strong>Error:</strong> Failed to delete object
			</div>`
			w.Header().Set("Content-Type", "text/html")
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(errorHTML))
		} else {
			s.sendErrorResponse(w, "Failed to delete object", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Successfully deleted object: %s", key)

	// Check if this is an HTMX request
	if r.Header.Get("HX-Request") == "true" {
		// Return HTML response for HTMX - redirect to list page
		w.Header().Set("HX-Redirect", "/list")
		w.WriteHeader(http.StatusOK)
		return
	}

	// Return JSON response for regular requests
	response := UploadResponse{
		Status:  "success",
		Message: "Object deleted successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// downloadHandler handles the download endpoint
func (s *Server) downloadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract the key from the URL path
	path := strings.TrimPrefix(r.URL.Path, "/download/")
	if path == "" {
		http.Error(w, "No key provided", http.StatusBadRequest)
		return
	}

	key := strings.TrimSpace(path)
	log.Printf("Downloading object: %s", key)

	// Get the object from the store
	data, err := s.ObjectStore.Get(key)
	if err != nil {
		log.Printf("Failed to get object %s: %v", key, err)
		http.Error(w, "Object not found", http.StatusNotFound)
		return
	}

	// Get object info for size
	info, err := s.ObjectStore.GetInfo(key)
	if err != nil {
		log.Printf("Failed to get object info %s: %v", key, err)
		// Continue without size header
	} else {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", info.Size))
	}

	// Set headers for file download
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", key))

	// Write the data to the response
	_, err = w.Write(data)
	if err != nil {
		log.Printf("Failed to write object data: %v", err)
		http.Error(w, "Failed to download file", http.StatusInternalServerError)
		return
	}
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

func (s *Server) sendJSONResponse(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(payload)
}

// sanitizeFilename removes potentially dangerous characters from filenames
func sanitizeFilename(filename string) string {
	base := filepath.Base(filename)

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

	if cleaned == "" || cleaned == "." {
		cleaned = "unnamed_file"
	}

	return cleaned
}
