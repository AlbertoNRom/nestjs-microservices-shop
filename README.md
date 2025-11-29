# Microservices — Despliegue en Google Kubernetes Engine (GKE)

Este repositorio contiene varios microservicios basados en NestJS y NATS:

- `client-gateway` (HTTP público)
- `products-ms` (NATS)
- `orders-ms` (NATS, PostgreSQL)
- `payments-ms` (HTTP y NATS, Stripe)
- `auth-ms` (NATS, MongoDB)
- `nats-server` (broker de mensajería)

El paso previo ya está hecho: las imágenes han sido subidas al registro (Container/Artifact Registry). A continuación se detallan los pasos para desplegar todo en GKE.

## Prerrequisitos

- Proyecto GCP activo y facturación habilitada
- `gcloud` y `kubectl` instalados y autenticados
- Imágenes ya publicadas en el registro: `gcr.io/<PROJECT_ID>/<service>:<tag>` o `REGION-docker.pkg.dev/<PROJECT_ID>/<REPO>/<service>:<tag>`
- Dominio opcional para Ingress (si expones HTTP públicamente)

## Variables Clave

- NATS: `NATS_SERVERS` (ej. `nats://nats:4222` dentro del cluster)
- Puertos servicio:
  - `client-gateway`: 3000
  - `products-ms`: 3001
  - `orders-ms`: 3002
  - `payments-ms`: 3003
  - `auth-ms`: 3004
- Bases de datos:
  - `orders-ms`: PostgreSQL (`DATABASE_URL`)
  - `auth-ms`: MongoDB (`DATABASE_URL`)
- Stripe (`payments-ms`): `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`

## 1. Crear cluster y namespace

```bash
# Proyecto y región
PROJECT_ID="<tu-project-id>"
REGION="europe-west1"
CLUSTER="microservices"

# Crear cluster GKE Autopilot (recomendado)
gcloud container clusters create-auto "$CLUSTER" --region "$REGION" --project "$PROJECT_ID"

gcloud container clusters get-credentials "$CLUSTER" --region "$REGION" --project "$PROJECT_ID"

# Namespace dedicado
kubectl create namespace microservices
```

## 2. Desplegar NATS en el cluster

```yaml
# nats.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
  namespace: microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats:2.10-alpine
          args: ["-DV"]
          ports:
            - containerPort: 4222
            - containerPort: 8222
---
apiVersion: v1
kind: Service
metadata:
  name: nats
  namespace: microservices
spec:
  selector:
    app: nats
  ports:
    - name: client
      port: 4222
      targetPort: 4222
    - name: monitoring
      port: 8222
      targetPort: 8222
```

```bash
kubectl apply -f nats.yaml
```

## 3. ConfigMaps y Secrets

```bash
# ConfigMap común
kubectl -n microservices create configmap app-config \
  --from-literal=NATS_SERVERS=nats://nats:4222

# Secrets para Stripe (payments-ms)
kubectl -n microservices create secret generic stripe-secrets \
  --from-literal=STRIPE_SECRET="<stripe-secret>" \
  --from-literal=STRIPE_WEBHOOK_SECRET="<stripe-webhook-secret>"

# URLs de Stripe (pueden ir en ConfigMap o como env directamente)
kubectl -n microservices create configmap stripe-config \
  --from-literal=STRIPE_SUCCESS_URL="https://tu-dominio/payments/success" \
  --from-literal=STRIPE_CANCEL_URL="https://tu-dominio/payments/cancel"

# Databases (recomendado: servicios gestionados)
# orders-ms (PostgreSQL) — usar Cloud SQL y su cadena de conexión
kubectl -n microservices create secret generic orders-db \
  --from-literal=DATABASE_URL="postgres://<user>:<pass>@<host>:5432/<db>?schema=public"

# auth-ms (MongoDB) — usar Atlas o equivalente
kubectl -n microservices create secret generic auth-db \
  --from-literal=DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>/<db>"
```

## 4. Desplegar microservicios

Ajusta las imágenes a las que subiste previamente al registro.

```yaml
# deployment-client-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client-gateway
  namespace: microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: client-gateway
  template:
    metadata:
      labels:
        app: client-gateway
    spec:
      containers:
        - name: client-gateway
          image: gcr.io/<PROJECT_ID>/client-gateway:latest
          ports:
            - containerPort: 3000
          env:
            - name: PORT
              value: "3000"
            - name: NATS_SERVERS
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: NATS_SERVERS
---
apiVersion: v1
kind: Service
metadata:
  name: client-gateway
  namespace: microservices
spec:
  type: ClusterIP
  selector:
    app: client-gateway
  ports:
    - port: 3000
      targetPort: 3000
```

```yaml
# deployment-products-ms.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: products-ms
  namespace: microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: products-ms
  template:
    metadata:
      labels:
        app: products-ms
    spec:
      containers:
        - name: products-ms
          image: gcr.io/<PROJECT_ID>/products-ms:latest
          env:
            - name: PORT
              value: "3001"
            - name: NATS_SERVERS
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: NATS_SERVERS
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: products-db
                  key: DATABASE_URL
---
apiVersion: v1
kind: Service
metadata:
  name: products-ms
  namespace: microservices
spec:
  selector:
    app: products-ms
  ports:
    - port: 3001
      targetPort: 3001
```

```yaml
# deployment-orders-ms.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-ms
  namespace: microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: orders-ms
  template:
    metadata:
      labels:
        app: orders-ms
    spec:
      containers:
        - name: orders-ms
          image: gcr.io/<PROJECT_ID>/orders-ms:latest
          env:
            - name: PORT
              value: "3002"
            - name: NATS_SERVERS
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: NATS_SERVERS
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: orders-db
                  key: DATABASE_URL
---
apiVersion: v1
kind: Service
metadata:
  name: orders-ms
  namespace: microservices
spec:
  selector:
    app: orders-ms
  ports:
    - port: 3002
      targetPort: 3002
```

```yaml
# deployment-payments-ms.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-ms
  namespace: microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: payments-ms
  template:
    metadata:
      labels:
        app: payments-ms
    spec:
      containers:
        - name: payments-ms
          image: gcr.io/<PROJECT_ID>/payments-ms:latest
          env:
            - name: PORT
              value: "3003"
            - name: NATS_SERVERS
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: NATS_SERVERS
            - name: STRIPE_SECRET
              valueFrom:
                secretKeyRef:
                  name: stripe-secrets
                  key: STRIPE_SECRET
            - name: STRIPE_WEBHOOK_SECRET
              valueFrom:
                secretKeyRef:
                  name: stripe-secrets
                  key: STRIPE_WEBHOOK_SECRET
            - name: STRIPE_SUCCESS_URL
              valueFrom:
                configMapKeyRef:
                  name: stripe-config
                  key: STRIPE_SUCCESS_URL
            - name: STRIPE_CANCEL_URL
              valueFrom:
                configMapKeyRef:
                  name: stripe-config
                  key: STRIPE_CANCEL_URL
          ports:
            - containerPort: 3003
---
apiVersion: v1
kind: Service
metadata:
  name: payments-ms
  namespace: microservices
spec:
  selector:
    app: payments-ms
  ports:
    - port: 3003
      targetPort: 3003
```

```yaml
# deployment-auth-ms.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-ms
  namespace: microservices
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-ms
  template:
    metadata:
      labels:
        app: auth-ms
    spec:
      containers:
        - name: auth-ms
          image: gcr.io/<PROJECT_ID>/auth-ms:latest
          env:
            - name: PORT
              value: "3004"
            - name: NATS_SERVERS
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: NATS_SERVERS
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-db
                  key: DATABASE_URL
---
apiVersion: v1
kind: Service
metadata:
  name: auth-ms
  namespace: microservices
spec:
  selector:
    app: auth-ms
  ports:
    - port: 3004
      targetPort: 3004
```

```bash
# Aplicar despliegues
kubectl apply -f deployment-client-gateway.yaml
kubectl apply -f deployment-products-ms.yaml
kubectl apply -f deployment-orders-ms.yaml
kubectl apply -f deployment-payments-ms.yaml
kubectl apply -f deployment-auth-ms.yaml
```

## 5. Ingress (opcional)

Si quieres exponer `client-gateway` y `payments-ms` públicamente, crea un Ingress. En GKE Autopilot bastan anotaciones estándar; aquí un ejemplo básico:

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: microservices
  annotations:
    kubernetes.io/ingress.class: "gce"
spec:
  rules:
    - host: tu-dominio
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: client-gateway
                port:
                  number: 3000
          - path: /payments
            pathType: Prefix
            backend:
              service:
                name: payments-ms
                port:
                  number: 3003
```

```bash
kubectl apply -f ingress.yaml
```

Actualiza `STRIPE_SUCCESS_URL` y `STRIPE_CANCEL_URL` para apuntar al dominio y rutas expuestas por el Ingress.

## 6. Comprobaciones

- NATS: `kubectl -n microservices port-forward svc/nats 8222:8222` y abre `http://localhost:8222`
- Servicios: `kubectl -n microservices get svc,deploy,pods`
- Logs: `kubectl -n microservices logs deploy/<nombre-deploy>`
- Webhook de Stripe: asegúrate de que `payments-ms` recibe `POST /payments/webhook` y emite `payment.succeeded`

## 7. Limpieza

```bash
kubectl delete namespace microservices
# o borra recursos individuales si lo prefieres
```

## Notas

- En producción, usa Cloud SQL para Postgres y Atlas para MongoDB; evita DBs dentro del cluster para datos persistentes.
- Usa `Artifact Registry` (recomendado) en vez de `Container Registry` (legacy) para las imágenes.
- Mantén `NATS_SERVERS=nats://nats:4222` dentro del cluster; no uses `localhost`.

