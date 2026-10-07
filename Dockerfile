# 1. Build the static files
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# 2. Serve them with Nginx, which also proxies the APIs (same paths as the Vite dev proxy)
FROM nginx:1.29-alpine

# Backends inside the Docker network. Override with -e when the service names differ.
ENV CORE_API_UPSTREAM=http://core:8000 \
    CHAT_API_UPSTREAM=http://chat:8001

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
