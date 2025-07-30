.PHONY: generate build run clean

generate:
	/home/garyhost/go/bin/templ generate internal/templates/

build: generate
	go build -v .

build-windows: generate
	GOOS=windows go build -v .

clean:
	rm -f soxdrawer
	find internal/templates -name "*_templ.go" -delete

dev: generate
	go run .
