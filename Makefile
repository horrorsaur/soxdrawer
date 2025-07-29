.PHONY: generate build run clean

# Generate templ templates
generate:
	/home/garyhost/go/bin/templ generate internal/templates/

# Build the application
build: generate
	go build -v .

# Run the application
run: build
	./soxdrawer

# Clean generated files
clean:
	rm -f soxdrawer
	find internal/templates -name "*_templ.go" -delete

# Development mode (watch and rebuild)
dev: generate
	go run .
