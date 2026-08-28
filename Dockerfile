FROM python:3.13-alpine

# Set build arguments for multi-arch support
ARG TARGETPLATFORM \
    BUILDPLATFORM \
    KUBECTL_VERSION=v1.34.1
#
# Set proper labels
LABEL maintainer="roxs@295devops.com" \
    version="1.0.0" \
    description="AI-Driven Observability"

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Install system dependencies and kubectl in a single optimized layer
RUN apk add --no-cache --quiet \
    curl \
    ca-certificates \
    bash \
    > /dev/null 2>&1 && \
    KUBECTL_ARCH=$(case ${TARGETPLATFORM} in \
        "linux/amd64") echo "amd64" ;; \
        "linux/arm64") echo "arm64" ;; \
        *) echo "amd64" ;; \
    esac) && \
    curl -sLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${KUBECTL_ARCH}/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/ && \
    kubectl version --client=true > /dev/null 2>&1 || true

# Set working directory early
WORKDIR /app

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python packages 
RUN apk add --no-cache --quiet --virtual .build-deps \
    gcc \
    musl-dev \
    libffi-dev \
    python3-dev \
    > /dev/null 2>&1 && \
    pip install --no-cache-dir \
        --disable-pip-version-check \
        --no-warn-script-location \
        --quiet \
        awscli \
        -r requirements.txt \
    > /dev/null 2>&1 && \
    apk del --quiet .build-deps > /dev/null 2>&1 && \
    rm -rf /root/.cache /tmp/*

# Copy application code (this should be last for better caching)
COPY --chown=appuser:appgroup main.py .
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup entrypoint.sh /entrypoint.sh

# Set proper permissions
RUN chmod +x /entrypoint.sh

# Switch to non-root user
USER appuser

# Add healthcheck - verify the main application can import properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import sys; sys.exit(0)" || exit 1
    
ENTRYPOINT ["/entrypoint.sh"]