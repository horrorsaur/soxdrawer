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

	"soxdrawer/internal/auth"
	"soxdrawer/internal/store"
	"soxdrawer/internal/templates"
)

type (
	Server struct {
		Address        string
		ObjectStore    *store.ObjectStore
		AuthManager    *auth.AuthManager
		server         *http.Server
		embeddedAssets embed.FS
		authEnabled    bool
	}

	Config struct {
		Address     string
		Assets      embed.FS
		AuthEnabled bool
	}

	// Request/Response types
	LoginRequest struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	LoginResponse struct {
		Status    string `json:"status"`
		Message   string `json:"message"`
		SessionID string `json:"session_id,omitempty"`
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
		Address:     ":8080",
		AuthEnabled: true,
	}
}

// New creates a new HTTP server instance
func New(cfg *config.Config, store *store.ObjectStore, js nats.JetStreamContext) (*Server, error) {
	authenticator := auth.NewAuthenticator(cfg.Auth.SessionSecret, cfg.Users)

	srv := &Server{
		Config: cfg,
		Store:  store,
		JS:     js,
		Auth:   authenticator,
	}

	// Create a new router
	r := http.NewServeMux()

	// Register handlers
	r.HandleFunc("POST /api/login", srv.LoginHandler)
	r.HandleFunc("POST /api/logout", srv.LogoutHandler)
	r.Handle("/api/objects", srv.AuthMiddleware(http.HandlerFunc(srv.listObjects)))
	r.Handle("/api/objects/upload", srv.AuthMiddleware(http.HandlerFunc(srv.uploadObject)))
	r.Handle("/api/objects/", srv.AuthMiddleware(http.HandlerFunc(srv.getObject)))

	// Serve static files from the web/dist directory
	fs := http.FileServer(http.Dir("web/dist"))
	r.Handle("/", fs)

	srv.Router = r
	return srv, nil
}

// LoginHandler handles user login
func (s *Server) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")

	user, err := s.Auth.Login(w, r, username, password)
	if err != nil {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(user)
}

// LogoutHandler handles user logout
func (s *Server) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	if err := s.Auth.Logout(w, r); err != nil {
		http.Error(w, "Failed to logout", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Start starts the HTTP server with routes
func (s *Server) Start() error {
	mux := http.NewServeMux()

	httpAssets, err := fs.Sub(s.embeddedAssets, "web/dist")
	if err != nil {
		log.Fatal(err)
	}

	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.FS(httpAssets))))

	// Public routes
	mux.HandleFunc("/", s.indexHandler)
	mux.HandleFunc("/api/login", s.loginHandler)
	mux.HandleFunc("/api/logout", s.logoutHandler)

	// Protected routes
	if s.authEnabled {
		mux.HandleFunc("/api/list", s.authMiddleware(s.listHandler))
		mux.HandleFunc("/api/upload", s.authMiddleware(s.uploadHandler))
		mux.HandleFunc("/api/delete/", s.authMiddleware(s.deleteHandler))
		mux.HandleFunc("/api/download/", s.authMiddleware(s.downloadHandler))
	} else {
		mux.HandleFunc("/api/list", s.listHandler)
		mux.HandleFunc("/api/upload", s.uploadHandler)
		mux.HandleFunc("/api/delete/", s.deleteHandler)
		mux.HandleFunc("/api/download/", s.downloadHandler)
	}

	s.server = &http.Server{
		Addr:    s.Address,
		Handler: corsMiddleware(mux),
	}

	log.Printf("Starting HTTP server on %s (auth: %v)", s.Address, s.authEnabled)

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

// authMiddleware checks for valid authentication
func (s *Server) authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.authEnabled {
			next(w, r)
			return
		}

		// Get session ID from cookie
		cookie, err := r.Cookie("session_id")
		if err != nil {
			sendErrorResponse(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		// Validate session
		username, err := s.AuthManager.ValidateSession(cookie.Value)
		if err != nil {
			sendErrorResponse(w, "Invalid or expired session", http.StatusUnauthorized)
			return
		}

		// Add username to request context for logging
		log.Printf("Authenticated request from user: %s to %s", username, r.URL.Path)
		next(w, r)
	}
}

// loginHandler handles user authentication
func (s *Server) loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var loginReq LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&loginReq); err != nil {
		sendErrorResponse(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Authenticate user
	sessionID, err := s.AuthManager.Authenticate(loginReq.Username, loginReq.Password)
	if err != nil {
		log.Printf("Failed login attempt for user: %s", loginReq.Username)
		sendErrorResponse(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	// Set session cookie
	cookie := &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Now().Add(auth.SessionDuration),
	}
	http.SetCookie(w, cookie)

	log.Printf("Successful login for user: %s", loginReq.Username)

	response := LoginResponse{
		Status:    "success",
		Message:   "Login successful",
		SessionID: sessionID,
	}

	sendJSONResponse(w, http.StatusOK, response)
}

// logoutHandler handles user logout
func (s *Server) logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get session ID from cookie
	cookie, err := r.Cookie("session_id")
	if err == nil {
		// Revoke session
		s.AuthManager.RevokeSession(cookie.Value)
	}

	// Clear session cookie
	cookie = &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Expires:  time.Unix(0, 0),
	}
	http.SetCookie(w, cookie)

	response := LoginResponse{
		Status:  "success",
		Message: "Logout successful",
	}

	sendJSONResponse(w, http.StatusOK, response)
}

// indexHandler handles the homepage
func (s *Server) indexHandler(w http.ResponseWriter, r *http.Request) {
	err := templates.ReactRoot().Render(r.Context(), w)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// listHandler handles the list endpoint
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

	response := ListResponse{
		Status:  "success",
		Message: "",
		Objects: objects,
	}

	sendJSONResponse(w, http.StatusOK, response)
}

// uploadHandler handles the file upload endpoint
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

	response := UploadResponse{
		Status:   "success",
		Message:  "Content uploaded successfully",
		Key:      key,
		Size:     int64(info.Size),
		Filename: filename,
	}

	sendJSONResponse(w, http.StatusOK, response)
}

// deleteHandler handles the delete endpoint
func (s *Server) deleteHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract the key from the URL path
	path := strings.TrimPrefix(r.URL.Path, "/api/delete/")
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
	path := strings.TrimPrefix(r.URL.Path, "/api/download/")
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
