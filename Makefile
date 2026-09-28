COMPOSE := docker compose -f compose.local.yml

.DEFAULT_GOAL := help
.PHONY: help setup up down ps logs reset check check-backend check-frontend

help: ## list commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## create .env from the example (won't overwrite)
	@test -f .env && echo ".env already exists" || (cp .env.example .env && echo "created .env, change the passwords")

up: ## start the local stack
	$(COMPOSE) up -d

down: ## stop the local stack
	$(COMPOSE) down

ps: ## show service status
	$(COMPOSE) ps

logs: ## follow logs (make logs s=db)
	$(COMPOSE) logs -f $(s)

reset: ## stop and delete local data volumes
	$(COMPOSE) down -v

check: check-backend check-frontend ## run everything CI runs

check-backend:
	@if [ -f backend/pyproject.toml ]; then \
		cd backend && uv run ruff check . && uv run ruff format --check . && uv run pytest -q; \
	else echo "backend: nothing yet"; fi

check-frontend:
	@if [ -f frontend/package.json ]; then \
		cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build; \
	else echo "frontend: nothing yet"; fi
