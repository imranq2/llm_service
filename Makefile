
.PHONY: Pipfile.lock
Pipfile.lock: build_backend
	docker compose run --rm --name llm_service_shell backend /bin/bash -c "rm -f Pipfile.lock && pipenv lock --dev"

update: down Pipfile.lock  ## Updates all the packages using Pipfile
	make build_backend

up:
	docker compose --progress=plain up --build -d

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
