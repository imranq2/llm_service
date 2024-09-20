
.PHONY: Pipfile.lock
Pipfile.lock: build_backend
	docker compose run --rm --name llm_service_shell backend /bin/bash -c "rm -f Pipfile.lock && pipenv lock --dev"

update: down Pipfile.lock  ## Updates all the packages using Pipfile
	make build_backend

up:
	docker compose --progress=plain up --build -d && \
	echo "\nwaiting for llm_service-frontend-1 to become healthy" && \
	while [ "`docker inspect --format {{.State.Health.Status}} llm_service-frontend-1`" != "healthy" ] && [ "`docker inspect --format {{.State.Health.Status}} llm_service-frontend-1`" != "unhealthy" ] && [ "`docker inspect --format {{.State.Status}} llm_service-frontend-1`" != "restarting" ]; do printf "." && sleep 2; done && \
	if [ "`docker inspect --format {{.State.Health.Status}} llm_service-frontend-1`" != "healthy" ]; then docker ps && docker logs llm_service-frontend-1 && printf "========== ERROR: llm_service-frontend-1 did not start. Run docker logs llm_service-frontend-1 =========\n" && exit 1; fi && \
	echo "\nwaiting for llm_service-backend-1 to become healthy" && \
	while [ "`docker inspect --format {{.State.Health.Status}} llm_service-backend-1`" != "healthy" ] && [ "`docker inspect --format {{.State.Health.Status}} llm_service-backend-1`" != "unhealthy" ] && [ "`docker inspect --format {{.State.Status}} llm_service-backend-1`" != "restarting" ]; do printf "." && sleep 2; done && \
	if [ "`docker inspect --format {{.State.Health.Status}} llm_service-backend-1`" != "healthy" ]; then docker ps && docker logs llm_service-backend-1 && printf "========== ERROR: llm_service-backend-1 did not start. Run docker logs llm_service-backend-1 =========\n" && exit 1; fi && \
	echo "Keycloak is running at http://localhost:8080" && \
	echo "Backend is running at http://localhost:8000" && \
	echo "Frontend is running at http://localhost:3000  (tester:password)"

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
