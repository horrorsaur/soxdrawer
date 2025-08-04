package http

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"soxdrawer/internal/store"
	"soxdrawer/internal/templates"

	"github.com/a-h/templ"
)

type (
	Server struct {
		Address        string
		ObjectStore    *store.ObjectStore
		server         *http.Server
		embeddedAssets embed.FS
		authToken      string
	}

	Config struct {
		Address   string
		Assets    embed.FS
		AuthToken string
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

	LoginRequest struct {
		Token string `json:"token"`
	}

	LoginResponse struct {
		Status  string `json:"status"`
		Message string `json:"message"`
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
		Address:        config.Address,
		ObjectStore:    objectStore,
		embeddedAssets: config.Assets,
		authToken:      config.AuthToken,
	}
}

// Start starts the HTTP server with routes
func (s *Server) Start() error {
	mux := http.NewServeMux()

	httpAssets, err := fs.Sub(s.embeddedAssets, "web/dist")
	if err != nil {
		log.Fatal(err)
	}

	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(httpAssets))))

	// Authentication routes
	mux.HandleFunc("/login", s.loginPageHandler)
	mux.HandleFunc("/api/auth/login", s.loginHandler)
	mux.HandleFunc("/api/auth/logout", s.logoutHandler)

	// Protected routes
	mux.HandleFunc("/", s.indexHandler)
	mux.HandleFunc("/api/list", s.listHandler)
	mux.HandleFunc("/api/upload", s.uploadHandler)
	mux.HandleFunc("/api/delete/", s.deleteHandler)
	mux.HandleFunc("/api/download/", s.downloadHandler)

	// Apply middleware
	handler := corsMiddleware(authMiddleware(s.authToken)(mux))

	s.server = &http.Server{
		Addr:    s.Address,
		Handler: handler,
	}

	log.Printf("Starting HTTP server on %s", s.Address)

	go func() {
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start HTTP server: %v", err)
		}
	}()

	return nil
}

func (s *Server) Stop(ctx context.Context) error {
	if s.server == nil {
		return nil
	}

	log.Println("Shutting down HTTP server...")
	return s.server.Shutdown(ctx)
}

func (s *Server) indexHandler(w http.ResponseWriter, r *http.Request) {
	sendTemplateResponse(r.Context(), w, templates.ReactRoot(), 200)
}

func (s *Server) listHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	objects, err := s.ObjectStore.ListObjectsForAPI()
	if err != nil {
		log.Printf("Failed to list objects: %v", err)
		sendErrorResponse(w, "Failed to list objects", http.StatusInternalServerError)
		return
	}

	sendJSONResponse(w, http.StatusOK, ListResponse{
		Status:  "success",
		Message: "",
		Objects: objects,
	})
}

func (s *Server) uploadHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	const maxMemory = 32 << 20
	if err := r.ParseMultipartForm(maxMemory); err != nil {
		log.Printf("Failed to parse multipart form: %v", err)
		sendErrorResponse(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("Failed to get file from form: %v", err)
		sendErrorResponse(w, "No file provided or invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get content type from form
	contentType := r.FormValue("type")
	if contentType == "" {
		contentType = "file" // Default to file
	}

	filename := header.Filename
	if filename == "" {
		switch contentType {
		case "text":
			filename = "text.txt"
		case "url":
			filename = "url.txt"
		default:
			filename = "unnamed_file"
		}
	}

	cleanFilename := sanitizeFilename(filename)
	timestamp := time.Now().Unix()
	key := fmt.Sprintf("%d_%s", timestamp, cleanFilename)

	log.Printf("Uploading %s: %s (original: %s) as key: %s", contentType, cleanFilename, filename, key)

	info, err := s.ObjectStore.PutReader(key, file)
	if err != nil {
		log.Printf("Failed to store %s %s: %v", contentType, key, err)
		sendErrorResponse(w, "Failed to store file", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully uploaded %s %s (size: %d bytes)", contentType, key, info.Size)

	sendJSONResponse(w, http.StatusOK, UploadResponse{
		Status:   "success",
		Message:  "Content uploaded successfully",
		Key:      key,
		Size:     int64(info.Size),
		Filename: filename,
	})
}

// deleteHandler handles the delete endpoint
func (s *Server) deleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract the key from the URL path
	path := strings.TrimPrefix(r.URL.Path, "/delete/")
	if path == "" {
		sendErrorResponse(w, "No key provided", http.StatusBadRequest)
		return
	}

	key := strings.TrimSpace(path)
	log.Printf("Deleting object: %s", key)

	err := s.ObjectStore.Delete(key)
	if err != nil {
		log.Printf("Failed to delete object %s: %v", key, err)
		sendErrorResponse(w, "Failed to delete object", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully deleted object: %s", key)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(UploadResponse{
		Status:  "success",
		Message: "Object deleted successfully",
	})
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

// loginPageHandler serves the login page
func (s *Server) loginPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check if user is already authenticated
	sessionToken := getSessionToken(r)
	if sessionToken != "" {
		valid, _ := validateSessionToken(sessionToken, s.authToken)
		if valid {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}
	}

	sendTemplateResponse(r.Context(), w, templates.LoginPage(), 200)
}

// loginHandler handles authentication
func (s *Server) loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendErrorResponse(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Token == "" {
		sendErrorResponse(w, "Token is required", http.StatusBadRequest)
		return
	}

	// Validate token
	if req.Token != s.authToken {
		sendErrorResponse(w, "Invalid authentication token", http.StatusUnauthorized)
		return
	}

	// Create session
	sessionToken := createSessionToken(s.authToken)
	setSessionCookie(w, sessionToken)

	sendJSONResponse(w, http.StatusOK, LoginResponse{
		Status:  "success",
		Message: "Authentication successful",
	})
}

// logoutHandler handles logout
func (s *Server) logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	clearSessionCookie(w)

	sendJSONResponse(w, http.StatusOK, LoginResponse{
		Status:  "success",
		Message: "Logged out successfully",
	})
}

func sendTemplateResponse(ctx context.Context, w http.ResponseWriter, template templ.Component, statusCode int) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(statusCode)

	err := template.Render(ctx, w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	response := UploadResponse{
		Status:  "error",
		Message: message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

func sendJSONResponse(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(payload)
}

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
