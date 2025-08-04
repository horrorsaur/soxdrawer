package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type (
	// User represents a user in the system
	User struct {
		Username     string    `toml:"username"`
		PasswordHash string    `toml:"password_hash"`
		CreatedAt    time.Time `toml:"created_at"`
		LastLogin    time.Time `toml:"last_login"`
	}

	// Session represents an active user session
	Session struct {
		ID        string
		Username  string
		CreatedAt time.Time
		ExpiresAt time.Time
	}

	// AuthManager handles authentication and session management
	AuthManager struct {
		users    map[string]*User
		sessions map[string]*Session
		mutex    sync.RWMutex
	}
)

const (
	// SessionDuration defines how long sessions are valid
	SessionDuration = 24 * time.Hour
	// MinPasswordLength defines minimum password length
	MinPasswordLength = 8
	// SessionIDLength defines the length of session IDs
	SessionIDLength = 32
)

// NewAuthManager creates a new authentication manager
func NewAuthManager() *AuthManager {
	return &AuthManager{
		users:    make(map[string]*User),
		sessions: make(map[string]*Session),
	}
}

// CreateUser creates a new user with the given username and password
func (am *AuthManager) CreateUser(username, password string) error {
	am.mutex.Lock()
	defer am.mutex.Unlock()

	// Validate username
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	// Check if user already exists
	if _, exists := am.users[username]; exists {
		return fmt.Errorf("user %s already exists", username)
	}

	// Validate password
	if len(password) < MinPasswordLength {
		return fmt.Errorf("password must be at least %d characters long", MinPasswordLength)
	}

	// Hash password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &User{
		Username:     username,
		PasswordHash: string(passwordHash),
		CreatedAt:    time.Now(),
	}

	am.users[username] = user
	return nil
}

// Authenticate validates username/password and returns a session ID if successful
func (am *AuthManager) Authenticate(username, password string) (string, error) {
	am.mutex.Lock()
	defer am.mutex.Unlock()

	// Find user
	user, exists := am.users[username]
	if !exists {
		return "", fmt.Errorf("invalid username or password")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", fmt.Errorf("invalid username or password")
	}

	// Update last login
	user.LastLogin = time.Now()

	// Generate session ID
	sessionID, err := generateSessionID()
	if err != nil {
		return "", fmt.Errorf("failed to generate session ID: %w", err)
	}

	// Create session
	session := &Session{
		ID:        sessionID,
		Username:  username,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(SessionDuration),
	}

	am.sessions[sessionID] = session
	return sessionID, nil
}

// ValidateSession checks if a session ID is valid and returns the username
func (am *AuthManager) ValidateSession(sessionID string) (string, error) {
	am.mutex.RLock()
	defer am.mutex.RUnlock()

	session, exists := am.sessions[sessionID]
	if !exists {
		return "", fmt.Errorf("invalid session")
	}

	// Check if session has expired
	if time.Now().After(session.ExpiresAt) {
		// Clean up expired session
		go am.removeExpiredSession(sessionID)
		return "", fmt.Errorf("session expired")
	}

	return session.Username, nil
}

// RevokeSession removes a session
func (am *AuthManager) RevokeSession(sessionID string) error {
	am.mutex.Lock()
	defer am.mutex.Unlock()

	if _, exists := am.sessions[sessionID]; !exists {
		return fmt.Errorf("session not found")
	}

	delete(am.sessions, sessionID)
	return nil
}

// ChangePassword changes a user's password
func (am *AuthManager) ChangePassword(username, oldPassword, newPassword string) error {
	am.mutex.Lock()
	defer am.mutex.Unlock()

	user, exists := am.users[username]
	if !exists {
		return fmt.Errorf("user not found")
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return fmt.Errorf("invalid current password")
	}

	// Validate new password
	if len(newPassword) < MinPasswordLength {
		return fmt.Errorf("password must be at least %d characters long", MinPasswordLength)
	}

	// Hash new password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	user.PasswordHash = string(passwordHash)
	return nil
}

// ListUsers returns a list of usernames (for admin purposes)
func (am *AuthManager) ListUsers() []string {
	am.mutex.RLock()
	defer am.mutex.RUnlock()

	usernames := make([]string, 0, len(am.users))
	for username := range am.users {
		usernames = append(usernames, username)
	}
	return usernames
}

// GetUsers returns a copy of all users (without password hashes)
func (am *AuthManager) GetUsers() map[string]*User {
	am.mutex.RLock()
	defer am.mutex.RUnlock()

	users := make(map[string]*User)
	for username, user := range am.users {
		users[username] = &User{
			Username:  user.Username,
			CreatedAt: user.CreatedAt,
			LastLogin: user.LastLogin,
			// Intentionally omit PasswordHash
		}
	}
	return users
}

// SetUsers sets the users map (used for loading from config)
func (am *AuthManager) SetUsers(users map[string]*User) {
	am.mutex.Lock()
	defer am.mutex.Unlock()
	am.users = users
}

// removeExpiredSession removes an expired session (called asynchronously)
func (am *AuthManager) removeExpiredSession(sessionID string) {
	am.mutex.Lock()
	defer am.mutex.Unlock()
	delete(am.sessions, sessionID)
}

// CleanupExpiredSessions removes all expired sessions
func (am *AuthManager) CleanupExpiredSessions() {
	am.mutex.Lock()
	defer am.mutex.Unlock()

	now := time.Now()
	for sessionID, session := range am.sessions {
		if now.After(session.ExpiresAt) {
			delete(am.sessions, sessionID)
		}
	}
}

// generateSessionID creates a secure random session ID
func generateSessionID() (string, error) {
	bytes := make([]byte, SessionIDLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
