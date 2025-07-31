.PHONY: gen

# Directory for proto files
PROTO_DIR=proto/

# Output paths
PROTO_FRONTEND_PATH=src/pb/
PROTO_BACKEND_PATH=tools/server/messages/pb/

# Default target, execute all generation tasks
all: gen

# Generate all proto files
gen:
	@echo "Generating Go and TypeScript code from .proto files..."
	
	# --- Generate Go code ---
	# --proto_path specifies the search path for .proto files
	# --go_out specifies the output directory for Go code
	protoc --proto_path=$(PROTO_DIR) --go_out=$(PROTO_BACKEND_PATH) $(PROTO_DIR)/*.proto
	
	# --- Generate TypeScript code ---
	# --js_out specifies the output directory for JS code
	#   import_style=commonjs: use require() style imports
	#   binary: generate efficient binary serialization/deserialization methods
	# --ts_out specifies the output directory for TypeScript type definitions
	protoc --proto_path=$(PROTO_DIR) \
		--ts_out=$(PROTO_FRONTEND_PATH) \
		$(PROTO_DIR)/*.proto

	@echo "Code generation complete."

# Clean generated files
clean:
	@echo "Cleaning up generated files..."
	rm -rf $(PROTO_BACKEND_PATH)/*
	rm -rf $(PROTO_FRONTEND_PATH)/*
	@echo "Cleanup complete." 