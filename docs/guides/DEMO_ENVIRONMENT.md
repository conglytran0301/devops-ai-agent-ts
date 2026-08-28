# 🧪 Demo Environment Guide

> **⚠️ Prerequisites**: To run this demo, you must have access to a Kubernetes cluster (AWS EKS or local cluster like minikube, kind, k3s)

## 📋 Overview

The `k8s-demo/` directory provides a complete working example that demonstrates AI-driven observability in action with real Kubernetes workloads.

## 🏗️ Demo Components

- **Nginx Application**: Multi-replica web service with health endpoints
- **Prometheus**: Metrics collection and storage (installed via Helm)
- **Grafana**: Visualization dashboards with AI health scoring (installed via Helm)
- **K6 Load Testing**: Realistic traffic generation
- **AI Analysis**: Real-time health assessment and recommendations

## 📋 Prerequisites

### Required Tools
- **Kubernetes Cluster**: AWS EKS, GKE, AKS, or local (minikube, kind, k3s)
- **kubectl**: Kubernetes command-line tool
- **Helm**: Package manager for Kubernetes (v3.0+)
- **k6**: Load testing tool (optional, for advanced scenarios)

### Install Required Tools

#### Install Helm
```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Windows (using Chocolatey)
choco install kubernetes-helm

# Verify installation
helm version
```

#### Install k6 (Optional)
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows (using Chocolatey)
choco install k6

# Verify installation
k6 version
```

## 🚀 Setup Demo Environment

### 1. Install Monitoring Stack (Prometheus & Grafana)

Before deploying the demo application, you need to install Prometheus and Grafana using Helm:

#### Add Helm Repositories
```bash
# Add Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

# Add Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts

# Update Helm repositories
helm repo update
```

#### Install Prometheus
```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Install Prometheus with custom values
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.ruleSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.retention=7d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=10Gi

# Verify Prometheus installation
kubectl get pods -n monitoring
```

#### Install Grafana (if not included in kube-prometheus-stack)
```bash
# If you need a separate Grafana installation
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set adminPassword=admin \
  --set service.type=ClusterIP \
  --set persistence.enabled=true \
  --set persistence.size=5Gi

# Get Grafana admin password (if using separate installation)
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo
```

### 2. Deploy Demo Application
```bash
# Deploy the complete demo stack
./k8s-demo/run-demo.sh deploy
```

This will create:
- Namespace `demo`
- Nginx deployment with 3 replicas
- ServiceMonitor for Prometheus scraping
- PrometheusRule for alerting
- Custom Grafana dashboard

### 3. Verify Deployment
```bash
# Check monitoring stack
kubectl get pods -n monitoring

# Check demo application
kubectl get pods -n demo

# Check services
kubectl get svc -n demo
kubectl get svc -n monitoring

# View deployment status
./k8s-demo/run-demo.sh status
```

## 🎭 Demo Scenarios

### 1. Healthy System Scenario
```bash
./k8s-demo/run-demo.sh healthy
```
**Expected Results:**
- Health Score: ~95%
- AI Recommendation: APPROVE
- All pods running normally
- Resource usage within limits

### 2. Resource Pressure Scenario
```bash
./k8s-demo/run-demo.sh pressure
```
**Expected Results:**
- Health Score: ~75%
- AI Recommendation: DEPLOY_WITH_WARNINGS
- Increased resource usage
- Some performance degradation

### 3. Critical Failure Scenario
```bash
./k8s-demo/run-demo.sh critical
```
**Expected Results:**
- Health Score: ~45%
- AI Recommendation: BLOCK
- Pod failures and restarts
- Critical issues detected

### 4. Recovery Scenario
```bash
./k8s-demo/run-demo.sh recovery
```
**Expected Results:**
- Health Score: Improving (60% → 90%)
- AI Recommendation: APPROVE (after recovery)
- Issues resolved
- System stabilizing

### 5. Complete Demo Sequence
```bash
./k8s-demo/run-demo.sh full-demo
```
Runs all scenarios in sequence with AI analysis at each step.

## 📊 Monitoring and Visualization

### Access Grafana Dashboard
```bash
# Port-forward to Grafana (from kube-prometheus-stack)
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

# Or if using separate Grafana installation
kubectl port-forward svc/grafana 3000:80 -n monitoring

# Open in browser
open http://localhost:3000

# Default credentials:
# Username: admin
# Password: prom-operator (for kube-prometheus-stack)
# Password: admin (for separate Grafana installation)
```

#### Import Demo Dashboard
1. Open Grafana in your browser
2. Go to **Dashboards** → **Import**
3. Upload the dashboard file: `k8s-demo/nginx-grafana-dashboard/nginx-dashboard.json`
4. Configure data source as **Prometheus** (should be auto-configured)
5. Click **Import**

### Key Dashboards
- **AI Health Score**: Real-time health scoring
- **Nginx Performance**: Application metrics
- **Kubernetes Overview**: Cluster health
- **Resource Usage**: CPU, memory, network

### Access Prometheus
```bash
# Port-forward to Prometheus
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring

# Open in browser
open http://localhost:9090
```

#### Verify Metrics Collection
1. Open Prometheus in your browser
2. Go to **Status** → **Targets**
3. Verify that the `demo/nginx-demo-service/0` target is **UP**
4. Test queries:
   - `nginx_up{namespace="demo"}`
   - `nginx_connections_active{namespace="demo"}`
   - `kube_pod_status_ready{namespace="demo"}`

## 🔧 Demo Configuration

### Nginx Application
- **Replicas**: 3 pods
- **Resources**: Configurable limits and requests
- **Health Checks**: Liveness and readiness probes
- **Endpoints**: `/`, `/health`, `/nginx_status`, `/metrics`

### Load Testing (K6)
- **Script**: `k8s-demo/nginx-k6/k6-simple-nginx.js`
- **Traffic Pattern**: Realistic user behavior
- **Endpoints**: Weighted distribution across endpoints
- **Duration**: Configurable test duration

### Monitoring Stack
- **Prometheus**: Metrics collection every 15s
- **Grafana**: Real-time dashboards
- **ServiceMonitor**: Automatic service discovery
- **PrometheusRule**: Alert rules and thresholds

## 🎯 Understanding Demo Results

### Health Score Calculation
The AI analyzes multiple factors:
- **Pod Health** (35%): Running status, restart counts
- **Resource Usage** (25%): CPU, memory utilization
- **Network Health** (20%): Connectivity, latency
- **Historical Trends** (20%): Performance over time

### AI Recommendations
- **APPROVE**: System is healthy, safe to deploy
- **DEPLOY_WITH_WARNINGS**: Minor issues, deploy with monitoring
- **BLOCK**: Critical issues, deployment should be blocked

### Scenario Outcomes
Each scenario demonstrates different system states:
- **Healthy**: Optimal performance, all green metrics
- **Pressure**: Resource constraints, yellow warnings
- **Critical**: System failures, red alerts
- **Recovery**: Improving metrics, trend analysis

## 🛠️ Customizing the Demo

### Modify Resource Limits
Edit `k8s-demo/nginx/nginx.yaml`:
```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "200m"
```

### Adjust Load Testing
Edit `k8s-demo/nginx-k6/k6-simple-nginx.js`:
```javascript
export let options = {
  scenarios: {
    stress_test: {
      executor: 'constant-vus',
      vus: 30,        # Concurrent users
      duration: '2m', # Test duration
    }
  }
};
```

### Configure AI Thresholds
Edit the demo script scenarios:
```bash
# In run-demo.sh
HEALTH_THRESHOLD="85"  # Adjust threshold
BLOCKING_MODE="true"   # Enable/disable blocking
```

## 🧹 Cleanup

### Remove Demo Environment
```bash
# Remove demo application
./k8s-demo/run-demo.sh cleanup

# This will:
# - Delete the `demo` namespace
# - Remove all deployed resources
# - Stop port-forward processes
# - Clean up temporary files
```

### Remove Monitoring Stack (Optional)
```bash
# Remove Prometheus and Grafana
helm uninstall prometheus -n monitoring
helm uninstall grafana -n monitoring  # If installed separately

# Remove monitoring namespace
kubectl delete namespace monitoring

# Remove Helm repositories (optional)
helm repo remove prometheus-community
helm repo remove grafana
```

### Verify Cleanup
```bash
# Check demo namespace is gone
kubectl get ns demo
# Should return: Error from server (NotFound)

# Check monitoring namespace (if removed)
kubectl get ns monitoring
# Should return: Error from server (NotFound)

# Check Helm releases
helm list --all-namespaces
```

## 🔍 Troubleshooting

### Common Issues

**Pods Not Starting**
```bash
# Check pod status
kubectl describe pod -n demo

# Check events
kubectl get events -n demo --sort-by='.lastTimestamp'
```

**Metrics Not Available**
```bash
# Check Prometheus targets
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring
# Visit http://localhost:9090/targets

# Check if ServiceMonitor is created
kubectl get servicemonitor -n demo

# Check Prometheus configuration
kubectl get prometheus -n monitoring -o yaml
```

**Grafana Dashboard Empty**
```bash
# Check Grafana logs
kubectl logs deployment/prometheus-grafana -n monitoring

# Restart Grafana
kubectl rollout restart deployment/prometheus-grafana -n monitoring

# Check if data source is configured
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Go to Configuration → Data Sources → Prometheus
```

**Helm Installation Issues**
```bash
# Check Helm releases
helm list -n monitoring

# Check Helm repository
helm repo list

# Debug Helm installation
helm status prometheus -n monitoring
helm get values prometheus -n monitoring
```

**Load Test Failing**
```bash
# Check if nginx is accessible
kubectl port-forward svc/nginx-demo-service 8080:80 -n demo
curl http://localhost:8080/health
```

### Debug Commands
```bash
# View all resources
kubectl get all -n demo
kubectl get all -n monitoring

# Check resource usage
kubectl top pods -n demo
kubectl top pods -n monitoring

# View logs
kubectl logs -l app=nginx-demo -n demo
kubectl logs -l app.kubernetes.io/name=prometheus -n monitoring

# Describe deployments
kubectl describe deployment nginx-demo -n demo
kubectl describe deployment prometheus-grafana -n monitoring
```

## 🔧 Advanced Configuration

### Custom Prometheus Values
Create a custom values file for Prometheus:

```yaml
# prometheus-values.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 20Gi
    serviceMonitorSelectorNilUsesHelmValues: false
    ruleSelectorNilUsesHelmValues: false

grafana:
  adminPassword: your-secure-password
  persistence:
    enabled: true
    size: 5Gi
  
alertmanager:
  alertmanagerSpec:
    retention: 120h
```

Install with custom values:
```bash
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values prometheus-values.yaml
```

### Custom Grafana Dashboard
The demo includes a pre-configured Grafana dashboard with AI health scoring:

```bash
# Import the custom dashboard
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring

# In Grafana UI:
# 1. Go to Dashboards → Import
# 2. Upload: k8s-demo/nginx-grafana-dashboard/nginx-dashboard.json
# 3. Select Prometheus data source
# 4. Click Import
```

### Monitoring Stack Verification
```bash
# Check all monitoring components
kubectl get pods -n monitoring

# Expected pods:
# - prometheus-kube-prometheus-prometheus-0
# - prometheus-grafana-xxx
# - prometheus-kube-prometheus-operator-xxx
# - prometheus-node-exporter-xxx
# - prometheus-kube-state-metrics-xxx
# - alertmanager-prometheus-kube-prometheus-alertmanager-0

# Check services
kubectl get svc -n monitoring

# Check ServiceMonitors (should include demo namespace)
kubectl get servicemonitor --all-namespaces
```

## 📚 Next Steps

After running the demo:
1. **Analyze Results**: Review AI recommendations and health scores
2. **Customize Scenarios**: Modify thresholds and configurations
3. **Integrate with CI/CD**: Use learnings in your workflows
4. **Explore Templates**: Try different workflow templates
5. **Production Setup**: Apply to your real environments

## 🔗 Related Documentation

- [Quick Start Guide](QUICK_START.md)
- [Health Scoring System](HEALTH_SCORING.md)
- [Workflow Templates](../examples/)
- [Configuration Reference](CONFIGURATION.md)