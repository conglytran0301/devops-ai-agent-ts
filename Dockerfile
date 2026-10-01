# ---------- Stage 1: build TypeScript ----------
FROM node:22-alpine3.22 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- Stage 2: production dependencies ----------
FROM node:22-alpine3.22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:22-alpine3.22

ARG TARGETPLATFORM
ARG KUBECTL_VERSION=v1.34.1

LABEL maintainer="roxs@295devops.com" \
      version="1.0.0" \
      description="AI-Driven Observability (TypeScript)"

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

RUN apk add --no-cache curl ca-certificates bash aws-cli && \
    KUBECTL_ARCH=$(case ${TARGETPLATFORM} in \
        "linux/arm64") echo "arm64" ;; \
        *) echo "amd64" ;; \
    esac) && \
    curl -sLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${KUBECTL_ARCH}/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

WORKDIR /app
RUN chown appuser:appgroup /app
ENV NODE_ENV=production

COPY --from=deps  --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup entrypoint.sh /entrypoint.sh

RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

ENTRYPOINT ["/entrypoint.sh"]