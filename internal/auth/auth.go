package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"

	"github.com/gorilla/sessions"
	"golang.org/x/crypto/bcrypt"
)

type (
	// User represents a user account
	User struct {
		Username     string `json:"username" toml:"username"`
		PasswordHash string `json:"-" toml:"password_hash"`
		IsAdmin      bool   `json:"is_admin" toml:"is_admin"`
	}
)

const (
	// SessionName is the name of the session cookie
	SessionName = "soxdrawer_session"
	// UserIDKey is the key for the user ID in the session
	UserIDKey = "user_id"
)

// Authenticator handles user authentication and session management
type Authenticator struct {
	Store sessions.Store
	Users map[string]*User
}

// NewAuthenticator creates a new Authenticator
func NewAuthenticator(sessionSecret string, users map[string]*User) *Authenticator {
	store := sessions.NewCookieStore([]byte(sessionSecret))
	return &Authenticator{
		Store: store,
		Users: users,
	}
}

// SetPassword sets the user's password hash
func (u *User) SetPassword(password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	u.PasswordHash = string(hash)
	return nil
}

// CheckPassword checks if the provided password is correct
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

// Login handles user login
func (a *Authenticator) Login(w http.ResponseWriter, r *http.Request, username, password string) (*User, error) {
	user, ok := a.Users[username]
	if !ok || !user.CheckPassword(password) {
		return nil, fmt.Errorf("invalid username or password")
	}

	session, _ := a.Store.Get(r, SessionName)
	session.Values[UserIDKey] = user.Username
	if err := session.Save(r, w); err != nil {
		return nil, fmt.Errorf("failed to save session: %w", err)
	}

	return user, nil
}

// Logout handles user logout
func (a *Authenticator) Logout(w http.ResponseWriter, r *http.Request) error {
	session, _ := a.Store.Get(r, SessionName)
	session.Options.MaxAge = -1
	if err := session.Save(r, w); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	return nil
}

// GetCurrentUser returns the currently logged-in user
func (a *Authenticator) GetCurrentUser(r *http.Request) (*User, error) {
	session, err := a.Store.Get(r, SessionName)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	userID, ok := session.Values[UserIDKey].(string)
	if !ok {
		return nil, nil // No user logged in
	}

	user, ok := a.Users[userID]
	if !ok {
		return nil, fmt.Errorf("user not found")
	}

	return user, nil
}

// GenerateRandomString generates a random string of the specified length
func GenerateRandomString(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
