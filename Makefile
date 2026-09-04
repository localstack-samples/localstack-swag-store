export AWS_ACCESS_KEY_ID ?= test
export AWS_SECRET_ACCESS_KEY ?= test
export AWS_DEFAULT_REGION ?= us-east-1
export AWS_ENDPOINT_URL ?= http://localhost.localstack.cloud:4566
export AWS_ENDPOINT_URL_S3 ?= http://s3.localhost.localstack.cloud:4566
SHELL := /bin/bash


.DEFAULT_GOAL := help

help:			## Show this help
	@echo "LocalStack Swag Store - Available Commands"
	@echo "=========================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "%-20s %s\n", $$1, $$2}'

check:			## Check if all required prerequisites are installed
	@echo "Checking prerequisites..."
	@command -v docker > /dev/null 2>&1 || { echo "Docker is not installed. Please install Docker and try again."; exit 1; }
	@command -v node > /dev/null 2>&1 || { echo "Node.js is not installed. Please install Node.js 22 and try again."; exit 1; }
	@command -v lstk > /dev/null 2>&1 || { echo "lstk CLI is not installed. Please run 'npm install -g @localstack/lstk' and try again."; exit 1; }
	@command -v aws > /dev/null 2>&1 || { echo "AWS CLI is not installed (required by 'lstk aws'). Please install it and try again."; exit 1; }
	@command -v cdk > /dev/null 2>&1 || { echo "CDK is not installed. Please run 'npm install -g aws-cdk' and try again."; exit 1; }
	@echo "All prerequisites are available!"

install:		## Install all dependencies (root + cdk)
	@echo "Installing root dependencies..."
	npm install
	@echo "Installing CDK dependencies..."
	cd cdk && npm install
	@echo "All dependencies installed!"

start:			## Start LocalStack
	@echo "Starting LocalStack..."
	lstk start
	@echo "LocalStack is ready!"

stop:			## Stop LocalStack
	@echo "Stopping LocalStack..."
	lstk stop
	@echo "LocalStack stopped!"

status:			## Check LocalStack status
	@lstk status || echo "LocalStack is not running"

build:			## Build the CDK app
	@echo "Building CDK app..."
	cd cdk && npm run build
	@echo "CDK app built!"

bootstrap:		## Bootstrap CDK for LocalStack
	@echo "Bootstrapping CDK..."
	cd cdk && npm run build && lstk cdk bootstrap
	@echo "CDK bootstrapped!"

deploy:			## Deploy all CDK stacks to LocalStack
	@echo "Deploying CDK stacks..."
	cd cdk && lstk cdk deploy SwagStoreMainStack --require-approval never
	@echo "CDK stacks deployed!"

deploy-frontend:		## Deploy the frontend CDK stack to LocalStack
	@echo "Deploying frontend CDK stack..."
	cd cdk && lstk cdk -a "node bin/frontend.js" deploy SwagStoreFrontendStack --require-approval never
	@echo "Frontend CDK stack deployed!"

seed:			## Seed the products table with sample data
	@echo "Seeding products..."
	npm run seed
	@echo "Products seeded!"

app:			## Build, bootstrap, deploy (backend & frontend), then seed
	@echo "Running full app workflow..."
	$(MAKE) build
	$(MAKE) bootstrap
	$(MAKE) deploy
	$(MAKE) deploy-frontend
	$(MAKE) seed
	@echo "App workflow complete!"

api-url:		## Get the API Gateway URL
	@echo "Discovering API Gateway URL..."
	@API_ID=$$(lstk aws apigateway get-rest-apis | jq -r '.items[0].id'); \
	if [ "$$API_ID" != "null" ] && [ "$$API_ID" != "" ]; then \
		echo "API URL: https://$$API_ID.execute-api.localhost.localstack.cloud:4566/v1"; \
		echo "$$API_ID" > .api-id; \
	else \
		echo "No API Gateway found. Make sure you've deployed the stacks."; \
		exit 1; \
	fi

test-api:		## Run a quick API test (list products)
	@echo "Testing API..."
	@if [ ! -f .api-id ]; then \
		make api-url; \
	fi
	@API_ID=$$(cat .api-id 2>/dev/null || echo ""); \
	if [ "$$API_ID" != "" ]; then \
		API_URL="https://$$API_ID.execute-api.localhost.localstack.cloud:4566/v1"; \
		echo "Fetching products from $$API_URL/products"; \
		curl -s "$$API_URL/products" | jq . || echo "API test failed"; \
	else \
		echo "API ID not found. Run 'make api-url' first."; \
	fi

test:			## Run integration tests
	@echo "Running integration tests..."
	npm test
	@echo "Tests completed!"

demo:			## Run a full demo flow (create order, fulfill, check status)
	@echo "Running demo flow..."
	@if [ ! -f .api-id ]; then \
		make api-url; \
	fi
	@API_ID=$$(cat .api-id 2>/dev/null || echo ""); \
	if [ "$$API_ID" != "" ]; then \
		API_URL="https://$$API_ID.execute-api.localhost.localstack.cloud:4566/v1"; \
		echo "1. Creating order..."; \
		ORDER_RESPONSE=$$(curl -s "$$API_URL/orders" \
			-H 'Content-Type: application/json' \
			-d '{"name":"Demo User","email":"demo@example.com","items":[{"productId":"p-sticker-pack-1","quantity":3}],"coinCount":3}'); \
		ORDER_ID=$$(echo "$$ORDER_RESPONSE" | jq -r '.orderId // empty'); \
		if [ "$$ORDER_ID" != "" ]; then \
			echo "Order created: $$ORDER_ID"; \
			sleep 2; \
			echo "2. Checking order status..."; \
			curl -s "$$API_URL/orders/$$ORDER_ID" | jq .; \
			echo "3. Fulfilling order..."; \
			curl -s "$$API_URL/admin/orders/fulfill" \
				-H 'Content-Type: application/json' \
				-d "{\"orderId\":\"$$ORDER_ID\"}" | jq .; \
			echo "4. Final order status..."; \
			curl -s "$$API_URL/orders/$$ORDER_ID" | jq .; \
		else \
			echo "Failed to create order: $$ORDER_RESPONSE"; \
		fi; \
	else \
		echo "API ID not found. Run 'make api-url' first."; \
	fi

logs:			## Show LocalStack logs
	@lstk logs

logs-tail:		## Tail LocalStack logs
	@lstk logs -f

setup:			## Complete setup (install deps, start LocalStack, deploy, seed)
	@echo "Starting complete setup..."
	make install
	make start
	make build
	make bootstrap
	make deploy
	make seed
	@echo "Setup complete! Use 'make demo' to test the API."

teardown:		## Stop LocalStack and clean up
	@echo "Tearing down..."
	make stop
	@rm -f .api-id
	@echo "Teardown complete!"

clean:			## Clean node_modules and build artifacts
	@echo "Cleaning up..."
	rm -rf node_modules
	rm -rf cdk/node_modules
	rm -rf cdk/cdk.out
	rm -f .api-id
	@echo "Cleanup complete!"

.PHONY: help check install install-global start stop status build bootstrap deploy seed api-url test-api test demo logs logs-tail setup teardown clean app
