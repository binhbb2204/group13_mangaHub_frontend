# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --production=false
COPY . .
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_API_PORT
ARG REACT_APP_WEBSOCKET_PORT
ARG REACT_APP_UDP_SSE_URL
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
ENV REACT_APP_API_PORT=${REACT_APP_API_PORT}
ENV REACT_APP_WEBSOCKET_PORT=${REACT_APP_WEBSOCKET_PORT}
ENV REACT_APP_UDP_SSE_URL=${REACT_APP_UDP_SSE_URL}
RUN --mount=type=cache,target=/root/.npm npm run build
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/build .
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
