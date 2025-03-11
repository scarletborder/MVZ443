.PHONY: all build clean

all: build

build:
	@mkdir -p dist
	@go build -o dist/mvzserver .
	@cp .env.example dist/.env

clean:
	@rm -rf dist
