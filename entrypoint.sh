#!/bin/bash
set -e

# Parse arguments
SIMULATION_MODE=${1:-false}
BLOCKING_MODE=${2:-true}
HEALTH_THRESHOLD=${3:-80}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 AI-Driven Observability Docker Action"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Configuration:"
echo "   Simulation Mode: $SIMULATION_MODE"
echo "   Blocking Mode: $BLOCKING_MODE"
echo "   Health Threshold: $HEALTH_THRESHOLD"
echo "   Namespace: ${NAMESPACE:-default}"
echo "   Model Provider: ${MODEL_PROVIDER:-bedrock}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate critical environment variables
if [ "$SIMULATION_MODE" != "true" ]; then
    if [ -z "$AWS_ACCESS_KEY_ID" ] && [ -z "$CLAUDE_API_KEY" ] && [ -z "$OPENAI_API_KEY" ]; then
        echo "❌ ERROR: No AI provider credentials found!"
        echo "   Set AWS_ACCESS_KEY_ID (Bedrock), CLAUDE_API_KEY, or OPENAI_API_KEY"
        exit 1
    fi
fi

# Configure AWS credentials if provided
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
    echo "🔐 Configuring AWS credentials..."
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
    aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
    aws configure set region "${AWS_REGION:-us-east-1}"
    echo "✅ AWS credentials configured"
fi

# Update kubeconfig if EKS cluster is specified
if [ -n "$EKS_CLUSTER_NAME" ]; then
    echo "☸️ Updating kubeconfig for EKS cluster: $EKS_CLUSTER_NAME"
    if aws eks update-kubeconfig --region "${AWS_REGION:-us-east-1}" --name "$EKS_CLUSTER_NAME" 2>/dev/null; then
        echo "✅ Kubeconfig updated successfully"
    else
        echo "⚠️ Warning: Could not update kubeconfig - will try kubectl directly"
    fi
fi

# Verify Kubernetes access
if command -v kubectl &> /dev/null; then
    if kubectl cluster-info &> /dev/null; then
        echo "✅ Kubernetes cluster accessible"
    else
        echo "⚠️ Warning: kubectl available but cluster not accessible"
    fi
else
    echo "⚠️ Warning: kubectl not found in PATH"
fi

# Create .env file for the agent
echo ""
echo "⚙️ Configuring environment variables..."
cat > .env << EOF
# Model Provider Configuration
MODEL_PROVIDER=${MODEL_PROVIDER:-bedrock}

# AWS Configuration
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
BEDROCK_REGION=${BEDROCK_REGION:-us-east-1}
BEDROCK_MODEL_ID=${BEDROCK_MODEL_ID:-amazon.nova-pro-v1:0}

# Claude Configuration
CLAUDE_API_KEY=$CLAUDE_API_KEY
CLAUDE_MODEL_ID=${CLAUDE_MODEL_ID:-claude-3-5-sonnet-20241022}

# OpenAI Configuration
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL_ID=${OPENAI_MODEL_ID:-gpt-4}

# Monitoring Configuration
PROM_URL=$PROM_URL
GRAFANA_URL=$GRAFANA_URL
GRAFANA_TOKEN=$GRAFANA_TOKEN

# Application Configuration
NAMESPACE=${NAMESPACE:-default}
APP_NAME=$APP_NAME
CLUSTER_NAME=$CLUSTER_NAME

# Notification Configuration
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID

# Behavior Configuration
AI_OBSERVABILITY_SIMULATION=$SIMULATION_MODE
BLOCKING_MODE=${BLOCKING_MODE:-true}
HEALTH_THRESHOLD=${HEALTH_THRESHOLD:-80}
SAFE_ACTIONS=${SAFE_ACTIONS:-rollout,scale,annotate}
VALIDATION_CONTEXT=${VALIDATION_CONTEXT:-pre-deployment}

# CI/CD Context
CI_PIPELINE_ID=${CI_PIPELINE_ID:-unknown}
CI_ENVIRONMENT=${CI_ENVIRONMENT:-development}
CI_COMMIT_SHA=${CI_COMMIT_SHA:-unknown}
EOF

echo "✅ Environment configured"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Running AI-Driven Observability Analysis..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Set blocking mode environment variable
if [ "$BLOCKING_MODE" = "true" ]; then
    export BLOCKING_MODE=true
fi

# Run analysis and capture exit code
set +e  
python3 /app/main.py
PYTHON_EXIT_CODE=$?
set -e  

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Analysis Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Interpret exit code
case $PYTHON_EXIT_CODE in
    0)
        echo "✅ Status: APPROVED - Deployment can proceed"
        echo "   Exit Code: 0 (Success)"
        ;;
    1)
        echo "🛑 Status: BLOCKED - Deployment blocked due to critical issues"
        echo "   Exit Code: 1 (Blocked)"
        if [ "$BLOCKING_MODE" = "true" ]; then
            echo "   Blocking Mode: ENABLED - Pipeline will fail"
        else
            echo "   Blocking Mode: DISABLED - Pipeline will continue"
        fi
        ;;
    2)
        echo "❌ Status: ERROR - Analysis encountered an error"
        echo "   Exit Code: 2 (Error)"
        ;;
    *)
        echo "⚠️ Status: UNKNOWN - Unexpected exit code: $PYTHON_EXIT_CODE"
        ;;
esac

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $PYTHON_EXIT_CODE
