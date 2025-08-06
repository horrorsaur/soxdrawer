#!/bin/bash

# SoxDrawer Firefox Extension Build Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building SoxDrawer Firefox Extension...${NC}"

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo -e "${RED}Error: manifest.json not found. Please run this script from the firefox-extension directory.${NC}"
    exit 1
fi

# Create build directory
BUILD_DIR="build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo -e "${YELLOW}Copying extension files...${NC}"

# Copy all extension files
cp manifest.json "$BUILD_DIR/"
cp background.js "$BUILD_DIR/"
cp content.js "$BUILD_DIR/"
cp popup.html "$BUILD_DIR/"
cp popup.js "$BUILD_DIR/"
cp popup.css "$BUILD_DIR/"

# Copy icons
mkdir -p "$BUILD_DIR/icons"
cp icons/*.png "$BUILD_DIR/icons/"

# Copy README
cp README.md "$BUILD_DIR/"

echo -e "${YELLOW}Creating extension package...${NC}"

# Create zip file
cd "$BUILD_DIR"
zip -r "../soxdrawer-extension.zip" . -x "*.DS_Store" "*.git*"
cd ..

echo -e "${GREEN}Extension built successfully!${NC}"
echo -e "${YELLOW}Files created:${NC}"
echo -e "  - ${BUILD_DIR}/ (build directory)"
echo -e "  - soxdrawer-extension.zip (extension package)"

echo -e "\n${YELLOW}To install in Firefox:${NC}"
echo -e "1. Open Firefox and go to about:addons"
echo -e "2. Click the gear icon and select 'Install Add-on From File...'"
echo -e "3. Select the soxdrawer-extension.zip file"
echo -e "\n${YELLOW}For development:${NC}"
echo -e "1. Open Firefox and go to about:debugging"
echo -e "2. Click 'This Firefox' in the sidebar"
echo -e "3. Click 'Load Temporary Add-on...'"
echo -e "4. Select the manifest.json file from the ${BUILD_DIR}/ directory" 