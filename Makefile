.PHONY: help install dev build preview clean lint format

# Default target
help:
	@echo "Available targets:"
	@echo "  make install  - Install dependencies"
	@echo "  make dev      - Start development server"
	@echo "  make build    - Build for production"
	@echo "  make preview  - Preview production build"
	@echo "  make clean    - Clean build artifacts and node_modules"
	@echo "  make lint     - Run linter"
	@echo "  make format   - Format code (if formatter is configured)"

# Install dependencies
install:
	npm install

# Start development server
dev:
	npm run dev

# Build for production
build:
	npm run build

# Preview production build
preview:
	npm run preview

# Clean build artifacts and dependencies
clean:
	rm -rf node_modules
	rm -rf dist
	rm -rf build
	rm -rf .cache
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.log" -delete

# Run linter (if configured)
lint:
	@echo "Running linter..."
	@if command -v eslint >/dev/null 2>&1; then \
		npx eslint . --ext .ts,.tsx; \
	else \
		echo "ESLint not found. Run 'npm install -D eslint' to install."; \
	fi

# Format code (if formatter is configured)
format:
	@echo "Formatting code..."
	@if command -v prettier >/dev/null 2>&1; then \
		npx prettier --write "src/**/*.{ts,tsx,css}"; \
	else \
		echo "Prettier not found. Run 'npm install -D prettier' to install."; \
	fi

# Quick start (install + dev)
start: install dev

