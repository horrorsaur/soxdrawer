watch:
	@templ generate --watch --cmd="go run ."

generate: build-react-frontend
	@templ generate internal/templates/

build-react-frontend:
	@cd web && npm run build

# Build the main binary
build-sd: generate
	@go build -o bin/sd .

build-windows: generate
	@GOOS=windows go build -o bin/soxdrawer.exe .

clean:
	rm -f soxdrawer
	find internal/templates -name "*_templ.go" -delete

dev: generate watch
