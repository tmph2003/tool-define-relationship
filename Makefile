# =============================================================================
# Relationship Designer — Makefile
# =============================================================================

# ⚠️ Replace with your actual image registry (e.g., docker.io/tmph2003)
IMAGE_REGISTRY ?= IMAGE_REGISTRY
IMAGE_TAG      ?= latest
K8S_NAMESPACE   = relationship-designer
HELM_RELEASE   ?= rd
HELM_CHART      = ./helm/relationship-designer

.PHONY: dev build down logs lint test clean \
        docker-build-prod docker-push \
        k8s-deploy k8s-delete k8s-status k8s-logs \
        helm-install helm-upgrade helm-uninstall helm-template helm-lint

# ---------------------------------------------------------------------------
# Docker Compose (local development)
# ---------------------------------------------------------------------------
dev:
	docker compose up --build

build:
	docker compose build

down:
	docker compose down -v

logs:
	docker compose logs -f

# ---------------------------------------------------------------------------
# Linting
# ---------------------------------------------------------------------------
lint:
	cd frontend && npm run lint
	cd backend && python -m ruff check app/

# ---------------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------------
test:
	cd frontend && npm run test
	cd backend && python -m pytest

# ---------------------------------------------------------------------------
# Docker — production images
# ---------------------------------------------------------------------------
docker-build-prod:
	docker build -t $(IMAGE_REGISTRY)/rd-backend:$(IMAGE_TAG) ./backend
	docker build --target prod -t $(IMAGE_REGISTRY)/rd-frontend:$(IMAGE_TAG) ./frontend

docker-push: docker-build-prod
	docker push $(IMAGE_REGISTRY)/rd-backend:$(IMAGE_TAG)
	docker push $(IMAGE_REGISTRY)/rd-frontend:$(IMAGE_TAG)

# ---------------------------------------------------------------------------
# Kubernetes
# ---------------------------------------------------------------------------
k8s-deploy:
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/secret.yaml
	kubectl apply -f k8s/postgres/
	kubectl apply -f k8s/backend/
	kubectl apply -f k8s/frontend/
	kubectl apply -f k8s/ingress.yaml
	@echo ""
	@echo "✅ Deployed to namespace: $(K8S_NAMESPACE)"
	@echo "   Run 'make k8s-status' to check pod status."

k8s-delete:
	kubectl delete -f k8s/ --recursive --ignore-not-found
	@echo "🗑️  All resources deleted."

k8s-status:
	@echo "=== Pods ==="
	kubectl -n $(K8S_NAMESPACE) get pods -o wide
	@echo ""
	@echo "=== Services ==="
	kubectl -n $(K8S_NAMESPACE) get svc
	@echo ""
	@echo "=== Ingress ==="
	kubectl -n $(K8S_NAMESPACE) get ingress

k8s-logs:
	kubectl -n $(K8S_NAMESPACE) logs -f deploy/backend --all-containers

# ---------------------------------------------------------------------------
# Helm Chart
# ---------------------------------------------------------------------------
helm-install:
	helm install $(HELM_RELEASE) $(HELM_CHART) \
		--namespace $(K8S_NAMESPACE) --create-namespace \
		--set global.imageRegistry=$(IMAGE_REGISTRY)

helm-upgrade:
	helm upgrade $(HELM_RELEASE) $(HELM_CHART) \
		--namespace $(K8S_NAMESPACE) \
		--set global.imageRegistry=$(IMAGE_REGISTRY)

helm-uninstall:
	helm uninstall $(HELM_RELEASE) --namespace $(K8S_NAMESPACE)

helm-template:
	helm template $(HELM_RELEASE) $(HELM_CHART)

helm-lint:
	helm lint $(HELM_CHART)

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
clean:
	docker compose down -v --rmi local
	rm -rf frontend/node_modules frontend/dist
	rm -rf backend/.venv backend/__pycache__
