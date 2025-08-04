package http

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const (
	SessionCookieName = "soxdrawer_session"
	SessionDuration   = 12 * time.Hour
)

// Session represents an authenticated session
type Session struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// createSessionToken creates a secure session token
func createSessionToken(authToken string) string {
	// Create a timestamp-based token with HMAC for integrity
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	h := hmac.New(sha256.New, []byte(authToken))
	h.Write([]byte(timestamp))
	signature := hex.EncodeToString(h.Sum(nil))
	return fmt.Sprintf("%s.%s", timestamp, signature)
}

// validateSessionToken validates a session token
func validateSessionToken(sessionToken, authToken string) (bool, error) {
	parts := strings.Split(sessionToken, ".")
	if len(parts) != 2 {
		return false, fmt.Errorf("invalid session token format")
	}

	timestamp := parts[0]
	signature := parts[1]

	// Verify HMAC signature
	h := hmac.New(sha256.New, []byte(authToken))
	h.Write([]byte(timestamp))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return false, fmt.Errorf("invalid session signature")
	}

	// Check if token is expired (12 hours)
	timestampInt := int64(0)
	fmt.Sscanf(timestamp, "%d", &timestampInt)
	tokenTime := time.Unix(timestampInt, 0)

	if time.Since(tokenTime) > SessionDuration {
		return false, fmt.Errorf("session expired")
	}

	return true, nil
}

// setSessionCookie sets a secure session cookie
func setSessionCookie(w http.ResponseWriter, sessionToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    sessionToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(SessionDuration.Seconds()),
	})
}

// clearSessionCookie clears the session cookie
func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1,
	})
}

// getSessionToken extracts the session token from cookies
func getSessionToken(r *http.Request) string {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

// authMiddleware creates authentication middleware
func authMiddleware(authToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip authentication for login page and API endpoints
			if r.URL.Path == "/login" || r.URL.Path == "/api/auth/login" ||
				r.URL.Path == "/api/auth/logout" || strings.HasPrefix(r.URL.Path, "/static/") {
				next.ServeHTTP(w, r)
				return
			}

			// Check for valid session
			sessionToken := getSessionToken(r)
			if sessionToken == "" {
				// Redirect to login page for HTML requests
				if strings.Contains(r.Header.Get("Accept"), "text/html") {
					http.Redirect(w, r, "/login", http.StatusSeeOther)
					return
				}
				// Return 401 for API requests
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Validate session token
			valid, err := validateSessionToken(sessionToken, authToken)
			if err != nil || !valid {
				clearSessionCookie(w)
				if strings.Contains(r.Header.Get("Accept"), "text/html") {
					http.Redirect(w, r, "/login", http.StatusSeeOther)
					return
				}
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Session is valid, proceed
			next.ServeHTTP(w, r)
		})
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
