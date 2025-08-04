#!/bin/bash

# SoxDrawer Authentication Test Script
# This script demonstrates the authentication system

echo "🧪 Testing SoxDrawer Authentication System"
echo "=========================================="

# Check if server is running
echo "1. Checking if server is running..."
if curl -s http://localhost:8080/login > /dev/null; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server is not running. Please start soxdrawer first."
    exit 1
fi

# Test unauthenticated access
echo ""
echo "2. Testing unauthenticated access..."
if curl -s -I http://localhost:8080/ | grep -q "401 Unauthorized"; then
    echo "   ✅ Unauthenticated access correctly returns 401"
else
    echo "   ❌ Unauthenticated access should return 401"
fi

# Test login page accessibility
echo ""
echo "3. Testing login page accessibility..."
if curl -s http://localhost:8080/login | grep -q "SoxDrawer Login"; then
    echo "   ✅ Login page is accessible"
else
    echo "   ❌ Login page should be accessible"
fi

# Get authentication token from config
echo ""
echo "4. Testing authentication..."
TOKEN=$(grep -A1 "http.auth" soxdrawer.config.toml | grep "token" | cut -d'"' -f2)

if [ -z "$TOKEN" ]; then
    echo "   ❌ Could not find authentication token in config"
    exit 1
fi

# Test login API
echo "   Testing login API..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$TOKEN\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"status":"success"'; then
    echo "   ✅ Login API works correctly"
else
    echo "   ❌ Login API failed: $LOGIN_RESPONSE"
fi

# Test authenticated access
echo ""
echo "5. Testing authenticated access..."
# Create a temporary cookie file
curl -c /tmp/test_cookies.txt -s -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$TOKEN\"}" > /dev/null

if curl -s -b /tmp/test_cookies.txt -I http://localhost:8080/ | grep -q "200 OK"; then
    echo "   ✅ Authenticated access works correctly"
else
    echo "   ❌ Authenticated access should return 200"
fi

# Test logout
echo ""
echo "6. Testing logout..."
LOGOUT_RESPONSE=$(curl -s -b /tmp/test_cookies.txt -X POST http://localhost:8080/api/auth/logout \
    -H "Content-Type: application/json")

if echo "$LOGOUT_RESPONSE" | grep -q '"status":"success"'; then
    echo "   ✅ Logout API works correctly"
else
    echo "   ❌ Logout API failed: $LOGOUT_RESPONSE"
fi

# Clean up
rm -f /tmp/test_cookies.txt

echo ""
echo "🎉 Authentication system test completed!"
echo ""
echo "To use SoxDrawer:"
echo "1. Visit http://localhost:8080"
echo "2. You'll be redirected to the login page"
echo "3. Enter the authentication token: $TOKEN"
echo "4. You'll be redirected to the main application"
echo ""
echo "Security features implemented:"
echo "- Token-based authentication"
echo "- Secure session cookies with HMAC signatures"
echo "- Automatic session expiration (12 hours)"
echo "- HttpOnly cookies to prevent XSS"
echo "- SameSite cookie protection" 