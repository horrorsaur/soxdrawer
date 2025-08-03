watch:
	@templ generate --watch --cmd="go run ."

generate:
	@templ generate internal/templates/

# Build the main binary
build-sd: generate
	@go build .

build-windows: generate
	GOOS=windows go build .

clean:
	rm -f soxdrawer
	find internal/templates -name "*_templ.go" -delete

dev: generate
	go run .
