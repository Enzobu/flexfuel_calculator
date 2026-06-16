ENV_FILE := .env.compose
COMPOSE := docker compose -f docker-compose.yml --env-file $(ENV_FILE)

.PHONY: help up up-build down restart logs ps build stop clean \
        mep pull install rebuild recreate prune

help:
	@echo "Make targets:"
	@echo "  up         Start containers"
	@echo "  up-build   Build and start containers"
	@echo "  down       Stop and remove containers"
	@echo "  stop       Stop containers"
	@echo "  restart    Restart containers"
	@echo "  logs       Follow logs"
	@echo "  ps         List containers"
	@echo "  build      Build Docker images"
	@echo "  clean      Remove containers, networks, and volumes"
	@echo "  mep        Deploy: git pull + rebuild + recreate + prune"

up:
	$(COMPOSE) up -d

up-build:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

stop:
	$(COMPOSE) stop

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps

build:
	$(COMPOSE) build

mep: pull install rebuild recreate prune

pull:
	git pull

install:
	npm install

rebuild:
	$(COMPOSE) build --no-cache

recreate:
	$(COMPOSE) up -d --force-recreate

prune:
	docker image prune -f

clean:
	$(COMPOSE) down -v --remove-orphans
