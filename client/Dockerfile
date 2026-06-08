# ─── SyncHub Web (client) ───────────────────────────────────────────────────────
# Multi-stage: build the Vite SPA, then serve the static bundle with nginx.

# 1. Build
FROM node:20-alpine AS build
WORKDIR /app

# VITE_API_URL is inlined at build time — pass it as a build arg.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. Serve
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
