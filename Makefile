up:
	docker-compose up --build

down:
	docker-compose down

build_backend:
	docker-compose build backend

build_frontend:
	docker-compose build frontend

.PHONY:shell
shell: ## Brings up the bash shell in dev docker
	docker compose --progress=plain build --parallel
	docker compose --progress=plain run --rm --name llm_service_shell backend /bin/sh
