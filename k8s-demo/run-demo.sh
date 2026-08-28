#!/bin/bash

# 🤖 AI-Driven Observability Demo Runner
# Automated demo scenarios for showcasing AI-powered Kubernetes observability

set -e

NAMESPACE="demo"
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

function success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

function error() {
    echo -e "${RED}❌ $1${NC}"
}

function show_help() {
    echo "🤖 AI-Driven Observability Demo Runner"
    echo "======================================"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy      - Deploy demo environment"
    echo "  healthy     - Run healthy system scenario"
    echo "  pressure    - Run resource pressure scenario"
    echo "  critical    - Run critical failure scenario"
    echo "  recovery    - Run recovery scenario"
    echo "  cleanup     - Clean up demo environment"
    echo "  status      - Show current system status"
    echo "  full-demo   - Run complete demo sequence"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 full-demo"
    echo "  $0 cleanup"
}

function deploy_environment() {
    log "Deploying demo environment..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    kubectl apply -f "$DEMO_DIR/nginx/nginx.yaml"
    
    log "Deploying Prometheus monitoring..."
    kubectl apply -f "$DEMO_DIR/nginx-prometheus/servicemonitor.yaml" 2>/dev/null || warning "ServiceMonitor not applied (Prometheus Operator may not be installed)"
    kubectl apply -f "$DEMO_DIR/nginx-prometheus/prometheusrule.yaml" 2>/dev/null || warning "PrometheusRule not applied (Prometheus Operator may not be installed)"
    
    log "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=nginx-demo -n $NAMESPACE --timeout=60s
    
    success "Demo environment deployed successfully!"
    show_status
}

function show_status() {
    log "Current system status:"
    echo "======================"
    kubectl get pods -n $NAMESPACE -o wide
    echo ""
    kubectl get svc -n $NAMESPACE
    echo ""
    log "Resource usage:"
    kubectl top pods -n $NAMESPACE 2>/dev/null || warning "Metrics server not available"
}

function verify_exporter() {
    log "Verifying nginx-exporter is still working..."
    local pod_name=$(kubectl get pods -n $NAMESPACE -l app=nginx-demo -o jsonpath='{.items[0].metadata.name}')
    
    if [ ! -z "$pod_name" ]; then
        # Wait for pod to be ready
        kubectl wait --for=condition=ready pod/$pod_name -n $NAMESPACE --timeout=60s
        
        # Test exporter
        if kubectl exec $pod_name -n $NAMESPACE -c nginx-exporter -- curl -s localhost:9113/metrics > /dev/null 2>&1; then
            success "Nginx-exporter is working correctly"
        else
            warning "Nginx-exporter may not be working properly"
            kubectl logs $pod_name -n $NAMESPACE -c nginx-exporter --tail=5
        fi
    else
        warning "No pods found to verify exporter"
    fi
}

function scenario_healthy() {
    log "🟢 Running HEALTHY system scenario..."
    
    # Set healthy resources (only patch nginx container)
    kubectl patch deployment nginx-demo -n $NAMESPACE --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {"requests":{"memory":"64Mi","cpu":"50m"},"limits":{"memory":"128Mi","cpu":"100m"}}}]'
    
    log "Waiting for rollout to complete..."
    kubectl rollout status deployment/nginx-demo -n $NAMESPACE --timeout=60s
    
    verify_exporter
    
    log "Running AI analysis..."
    cd "$DEMO_DIR/.."
    python main.py
    
    success "Healthy scenario complete - Expected: APPROVE (health=100)"
}

function scenario_pressure() {
    log "🟡 Running RESOURCE PRESSURE scenario..."
    
    # Set moderate resource constraints (only patch nginx container)
    kubectl patch deployment nginx-demo -n $NAMESPACE --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {"requests":{"memory":"32Mi","cpu":"25m"},"limits":{"memory":"64Mi","cpu":"50m"}}}]'
    
    log "Waiting for rollout to complete..."
    kubectl rollout status deployment/nginx-demo -n $NAMESPACE --timeout=60s
    
    verify_exporter
    
    # Kill any existing port-forward
    pkill -f "port-forward.*8080" 2>/dev/null || true
    sleep 2
    
    # Start port-forward
    log "Starting port-forward..."
    kubectl port-forward svc/nginx-demo-service 8080:80 -n $NAMESPACE > /tmp/port-forward.log 2>&1 &
    PORT_FORWARD_PID=$!
    
    # Wait for port-forward to establish
    log "Waiting for port-forward to establish..."
    for i in {1..10}; do
        if curl -s --connect-timeout 2 http://localhost:8080/ > /dev/null 2>&1; then
            success "Port-forward established successfully"
            break
        fi
        if [ $i -eq 10 ]; then
            error "Port-forward failed to establish"
            log "Port-forward log:"
            cat /tmp/port-forward.log
            log "Port-forward failed, check logs above"
            sleep 3
        fi
        sleep 1
    done
    
    # Generate load
    log "Generating load with K6..."
    if command -v k6 &> /dev/null; then
        k6 run --vus 30 --duration 1m "$DEMO_DIR/nginx-k6/k6-simple-nginx.js" &
        K6_PID=$!
        sleep 30  # Let load build up
    else
        warning "K6 not found, skipping load generation"
        sleep 10
    fi
    
    log "Running AI analysis..."
    cd "$DEMO_DIR/.."
    python main.py
    
    # Stop K6 if it was started
    if [[ -n "$K6_PID" ]]; then
        kill $K6_PID 2>/dev/null || true
        wait $K6_PID 2>/dev/null || true
    fi
    
    # Stop port-forward if we started it
    if [[ -n "$PORT_FORWARD_PID" ]]; then
        kill $PORT_FORWARD_PID 2>/dev/null || true
    fi
    
    success "Resource pressure scenario complete - Expected: DEPLOY_WITH_WARNINGS (health=70-85)"
}

function scenario_critical() {
    log "🔴 Running CRITICAL FAILURE scenario..."
    
    # Set severe resource constraints (only patch nginx container)
    kubectl patch deployment nginx-demo -n $NAMESPACE --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {"requests":{"memory":"2Mi","cpu":"5m"},"limits":{"cpu":"10m","memory":"4Mi"}}}]'
    
    # Deploy failing application
    log "Deploying failing application..."
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: failing-app
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: failing-app
  template:
    metadata:
      labels:
        app: failing-app
    spec:
      containers:
      - name: broken
        image: nginx:nonexistent-tag
        resources:
          limits:
            memory: "16Mi"
            cpu: "20m"
EOF
    
    log "Waiting for failures to manifest..."
    sleep 60
    
    log "Running AI analysis..."
    cd "$DEMO_DIR/.."
    python main.py
    
    success "Critical failure scenario complete - Expected: BLOCK (health<60)"
}

function scenario_recovery() {
    log "🔄 Running RECOVERY scenario..."
    
    # Fix the issues
    log "Removing failing application..."
    kubectl delete deployment failing-app -n $NAMESPACE --ignore-not-found=true
    
    log "Restoring healthy resources..."
    kubectl patch deployment nginx-demo -n $NAMESPACE --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources", "value": {"requests":{"memory":"64Mi","cpu":"50m"},"limits":{"memory":"128Mi","cpu":"100m"}}}]'
    
    log "Waiting for recovery..."
    kubectl rollout status deployment/nginx-demo -n $NAMESPACE --timeout=120s
    
    verify_exporter
    
    sleep 30  # Additional time for metrics to stabilize
    
    log "Running AI analysis..."
    cd "$DEMO_DIR/.."
    python main.py
    
    success "Recovery scenario complete - Expected: APPROVE (recovery detected)"
}

function cleanup_environment() {
    log "Cleaning up demo environment..."
    
    # Stop port-forward
    pkill -f "port-forward.*8080:80" 2>/dev/null || true
    
    # Stop K6
    pkill k6 2>/dev/null || true
    
    # Delete namespace
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    
    success "Cleanup complete!"
}

function run_full_demo() {
    log "🚀 Running complete AI-Driven Observability demo..."
    echo "This will demonstrate all scenarios in sequence."
    echo "Press Ctrl+C to cancel, or Enter to continue..."
    read -r
    
    deploy_environment
    sleep 10
    
    scenario_healthy
    sleep 10
    
    scenario_pressure
    sleep 10
    
    scenario_critical
    sleep 10
    
    scenario_recovery
    
    success "🎉 Complete demo finished!"
    log "Demo environment is still running. Use '$0 cleanup' to remove it."
}

# Main script logic
case "$1" in
    "deploy")
        deploy_environment
        ;;
    "healthy")
        scenario_healthy
        ;;
    "pressure")
        scenario_pressure
        ;;
    "critical")
        scenario_critical
        ;;
    "recovery")
        scenario_recovery
        ;;
    "cleanup")
        cleanup_environment
        ;;
    "status")
        show_status
        ;;
    "full-demo")
        run_full_demo
        ;;
    *)
        show_help
        ;;
esac