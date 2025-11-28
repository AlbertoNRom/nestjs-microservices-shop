# Upload images to Artifact Registry

Install google cloud sdk

gcloud auth configure-docker \
    europe-southwest1-docker.pkg.dev

gcloud config get-value project

gcloud artifacts repositories list --location=europe-southwest1

For each image:

docker tag microservices-client-gateway:latest europe-southwest1-docker.pkg.dev/nestjs-microservices-479616/images-registry/client-gateway:latest

docker push europe-southwest1-docker.pkg.dev/nestjs-microservices-479616/images-registry/client-gateway:latest

