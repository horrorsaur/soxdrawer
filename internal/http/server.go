package http

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"soxdrawer/internal/store"
	"soxdrawer/internal/templates"
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
	err := templates.BaseLayout("Home", templates.HomePage()).Render(r.Context(), w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
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

	jsonParam, _ := strconv.ParseBool(r.URL.Query().Get("json"))
	if jsonParam {
		response := ListResponse{
			Status:  "success",
			Message: "",
			Objects: objects,
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
		return
	}

	err = templates.BaseLayout("List", templates.ListPage(objects)).Render(r.Context(), w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
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
		s.sendErrorResponse(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("Failed to get file from form: %v", err)
		s.sendErrorResponse(w, "No file provided or invalid file", http.StatusBadRequest)
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
		s.sendErrorResponse(w, "Failed to store file", http.StatusInternalServerError)
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
