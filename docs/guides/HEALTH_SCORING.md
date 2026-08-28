# 📊 AI-Powered Health Scoring System

## 🎯 Overview

Our AI analyzes multiple factors to generate a comprehensive health score with intelligent weighting and contextual understanding.

## 🔢 Score Ranges & Actions

| Score | Status | Action | Deployment Decision |
|-------|--------|--------|-------------------|
| **90-100** | 🟢 **Excellent** | Deploy with confidence | ✅ **APPROVE** |
| **80-89** | 🟡 **Good** | Minor optimizations possible | ✅ **APPROVE** with monitoring |
| **70-79** | 🟠 **Acceptable** | Monitor closely, consider improvements | ⚠️ **APPROVE** with warnings |
| **60-69** | 🔴 **Degraded** | Attention needed, investigate issues | 🚫 **BLOCK** (if blocking-mode enabled) |
| **0-59** | 🚨 **Critical** | Immediate action required | 🚫 **BLOCK** always |

## 🔍 Analysis Factors (AI-Weighted)

### 🎯 Application Health (35%)
- **Pod Status**: Running, ready, restart counts
- **Container Health**: Liveness/readiness probe success rates
- **Resource Utilization**: CPU, memory, disk usage vs limits
- **Error Rates**: Application-level errors and exceptions

### ☸️ Kubernetes Metrics (30%)
- **Cluster Health**: Node status, resource availability
- **Workload Status**: Deployment, ReplicaSet, StatefulSet health
- **Network Connectivity**: Service discovery, ingress health
- **Storage Health**: PVC status, volume mount issues

### 📈 Performance Trends (20%)
- **Historical Patterns**: Performance over time
- **Anomaly Detection**: Unusual behavior patterns
- **Capacity Planning**: Resource growth trends
- **SLA Compliance**: Uptime and performance targets

### 🔧 Infrastructure Health (15%)
- **Node Health**: CPU, memory, disk on Kubernetes nodes
- **Network Performance**: Latency, packet loss, throughput
- **External Dependencies**: Database, cache, API connectivity
- **Security Posture**: Vulnerability scans, compliance checks

## 🧠 AI Enhancement Features

### 🎯 Context-Aware Scoring
- Considers application type, environment, and historical baselines
- Adjusts expectations based on workload characteristics
- Understands seasonal patterns and business cycles

### 🔮 Predictive Analysis
- Forecasts potential issues before they occur
- Identifies trending problems and degradation patterns
- Provides early warning for capacity constraints

### 🔄 Dynamic Weighting
- Adjusts factor importance based on detected patterns
- Learns from historical incidents and outcomes
- Adapts to application-specific requirements

### 📊 Trend Analysis
- Compares current state with historical performance
- Identifies improvement or degradation trends
- Provides context for score interpretation

### 🚨 Anomaly Detection
- Identifies unusual patterns that might indicate problems
- Detects subtle changes that traditional monitoring might miss
- Correlates events across multiple systems and timeframes

## 🔬 Deterministic Health Score Calculation

### Core Formula

The health score is calculated using a deterministic formula in `src/analyzers/kubernetes.py`:

```python
# 1. Base Score (percentage of ready pods)
base_score = (ready_pods / total_pods) * 100

# 2. Risk Penalty (average risk scores across all pods)
risk_penalty = sum(pod["ai_risk_score"] for pod in pods) / len(pods)

# 3. Final Health Score
health_score = max(0, base_score - (risk_penalty * 0.3))
```

### AI Risk Score per Pod

Each pod receives a risk score from 0-100 based on specific factors:

```python
def calculate_ai_risk_score(pod_status, restarts):
    risk_score = 0.0
    
    # 1. Restarts (maximum 60 points)
    risk_score += min(restarts * 20, 60)
    
    # 2. Pod Phase not "Running" (+40 points)
    if phase != "Running":
        risk_score += 40
    
    # 3. Container not ready (+20 points per container)
    if not container.ready:
        risk_score += 20
    
    # 4. Critical states (+30 points)
    if reason in ["CrashLoopBackOff", "ImagePullBackOff"]:
        risk_score += 30
    
    return min(risk_score, 100.0)
```

### Real Calculation Example

**Scenario: 3 pods in the cluster**

```
Pod 1: app-frontend
- Status: Running, Ready
- Restarts: 0
- Risk Score: 0

Pod 2: app-backend
- Status: Running, Ready
- Restarts: 2
- Risk Score: 40 (2 restarts × 20)

Pod 3: app-worker
- Status: CrashLoopBackOff, Not Ready
- Restarts: 5
- Risk Score: 100 (60 + 40 + 20 + 30, capped at 100)

Calculation:
1. Base Score: 2/3 pods ready = 66.67%
2. Risk Penalty: (0 + 40 + 100) / 3 = 46.67
3. Health Score: 66.67 - (46.67 × 0.3) = 66.67 - 14 = 52.67

Final Result: 53/100 (CRITICAL)
```

### Penalty Factors

| Factor | Penalty | Impact |
|--------|---------|--------|
| **1 restart** | +20 points | Low |
| **3 restarts** | +60 points (cap) | High |
| **Pod not Running** | +40 points | High |
| **Container not ready** | +20 points | Medium |
| **CrashLoopBackOff** | +30 points | Critical |
| **ImagePullBackOff** | +30 points | Critical |

### Code Implementation

The calculation runs in two places depending on the access method:

**1. With Kubernetes Python Client** (`analyze_with_k8s_client`):
```python
# src/analyzers/kubernetes.py lines 50-120
for pod in pods_response.items:
    pod_health = {
        "phase": pod_status.phase,
        "ready": ready,
        "restarts": restarts,
        "ai_risk_score": _calculate_ai_risk_score_k8s(pod_status, restarts)
    }
    analysis["pods"][pod_name] = pod_health

# Final calculation
base_score = (ready_pods / total_pods) * 100
risk_penalty = sum(pod["ai_risk_score"] for pod in analysis["pods"].values()) / len(analysis["pods"])
analysis["health_score"] = max(0, base_score - (risk_penalty * 0.3))
```

**2. With kubectl** (`analyze_with_kubectl`):
```python
# src/analyzers/kubernetes.py lines 130-200
# Same algorithm using kubectl JSON output
```

### System Characteristics

✅ **Deterministic**: Same state = same score always
✅ **Transparent**: Clear and auditable formula
✅ **Configurable**: Adjustable weights as needed
✅ **Scalable**: Works with 1 or 1000 pods
✅ **No Machine Learning**: No training required

### Detailed Analysis Components

### Pod Health Analysis
```python
def analyze_pod_health():
    factors = {
        'running_ratio': calculate_running_pods_ratio(),
        'restart_frequency': analyze_restart_patterns(),
        'probe_success_rate': check_health_probes(),
        'resource_pressure': detect_resource_constraints()
    }
    return weighted_score(factors)
```

### Resource Utilization Assessment
```python
def assess_resource_utilization():
    metrics = {
        'cpu_usage': get_cpu_utilization_trend(),
        'memory_usage': get_memory_utilization_trend(),
        'disk_io': analyze_disk_performance(),
        'network_io': analyze_network_performance()
    }
    return calculate_utilization_score(metrics)
```

### Performance Trend Analysis
```python
def analyze_performance_trends():
    trends = {
        'response_time_trend': calculate_latency_trend(),
        'throughput_trend': calculate_throughput_trend(),
        'error_rate_trend': calculate_error_rate_trend(),
        'availability_trend': calculate_uptime_trend()
    }
    return predict_future_performance(trends)
```

## 🎯 Environment-Specific Thresholds

### Development Environment
- **Threshold**: 60-70%
- **Rationale**: Permissive for rapid iteration
- **Focus**: Basic functionality validation
- **Blocking**: Usually disabled

### Staging Environment
- **Threshold**: 75-80%
- **Rationale**: Moderate validation before production
- **Focus**: Performance and integration testing
- **Blocking**: Warnings only

### Production Environment
- **Threshold**: 85-95%
- **Rationale**: Strict quality gates for reliability
- **Focus**: Maximum system stability
- **Blocking**: Enabled for critical issues

## 🔧 Customizing Health Scoring

### Adjust Factor Weights
```python
# Custom weight configuration
HEALTH_WEIGHTS = {
    'pod_health': 0.40,        # Increase pod health importance
    'resource_usage': 0.30,    # Standard resource weight
    'performance_trends': 0.20, # Standard trend weight
    'infrastructure': 0.10     # Reduce infrastructure weight
}
```

### Add Custom Metrics
```python
def analyze_custom_application_health():
    """Add application-specific health checks"""
    custom_metrics = {
        'database_connection_pool': check_db_pool_health(),
        'cache_hit_ratio': analyze_cache_performance(),
        'queue_depth': monitor_message_queues(),
        'external_api_latency': check_dependency_health()
    }
    return calculate_custom_score(custom_metrics)
```

### Configure Thresholds
```yaml
# In your workflow
health-threshold: '85'        # Overall threshold
pod-health-threshold: '90'    # Pod-specific threshold
resource-threshold: '80'      # Resource-specific threshold
performance-threshold: '75'   # Performance-specific threshold
```

## 📈 Score Interpretation Examples

### Excellent Score (95%)
```
🟢 System Health: EXCELLENT (95/100)
✅ All pods running and healthy
✅ Resource usage optimal (CPU: 45%, Memory: 60%)
✅ No recent restarts or failures
✅ Performance trending upward
✅ All dependencies responsive
```

### Good Score (82%)
```
🟡 System Health: GOOD (82/100)
✅ Most pods healthy (2/3 ready)
⚠️ Moderate resource usage (CPU: 75%, Memory: 80%)
✅ Minimal restarts in last hour
✅ Performance stable
⚠️ One dependency showing latency
```

### Degraded Score (65%)
```
🔴 System Health: DEGRADED (65/100)
⚠️ Pod issues detected (1/3 pods restarting)
🚨 High resource usage (CPU: 90%, Memory: 95%)
🚨 Multiple restarts in last hour
⚠️ Performance declining
🚨 Database connection issues
```

### Critical Score (35%)
```
🚨 System Health: CRITICAL (35/100)
🚨 Multiple pod failures (0/3 pods ready)
🚨 Resource exhaustion (CPU: 100%, Memory: 100%)
🚨 Continuous restart loops
🚨 Performance severely degraded
🚨 Multiple dependencies failing
```

## 🔍 Troubleshooting Low Scores

### Score 60-69 (Degraded)
**Common Causes:**
- Resource constraints approaching limits
- Intermittent pod restarts
- Performance degradation
- Dependency issues

**Actions:**
- Scale resources or replicas
- Investigate restart causes
- Check dependency health
- Review recent changes

### Score 0-59 (Critical)
**Common Causes:**
- Pod crash loops
- Resource exhaustion
- Network connectivity issues
- Configuration errors

**Actions:**
- Immediate investigation required
- Check pod logs and events
- Verify resource availability
- Validate configuration changes

## 🧠 AI Model Insights

### What the AI Considers
- **Historical Context**: How does current state compare to past performance?
- **Correlation Patterns**: Are multiple metrics showing related issues?
- **Trend Direction**: Is the system improving or degrading?
- **Anomaly Significance**: How unusual are the current patterns?
- **Impact Assessment**: What's the potential business impact?

### AI Recommendations
The AI provides contextual recommendations:
- **Immediate Actions**: What to do right now
- **Root Cause Analysis**: Likely causes of issues
- **Preventive Measures**: How to avoid future problems
- **Monitoring Focus**: What metrics to watch closely

## 📚 Best Practices

### Threshold Selection
- **Start Conservative**: Begin with lower thresholds and increase gradually
- **Environment-Specific**: Use different thresholds per environment
- **Monitor Trends**: Adjust based on historical performance
- **Business Context**: Consider business impact and risk tolerance

### Score Monitoring
- **Track Trends**: Monitor score changes over time
- **Investigate Drops**: Understand why scores decrease
- **Celebrate Improvements**: Recognize system health improvements
- **Learn from Patterns**: Use historical data to improve thresholds

### Integration Tips
- **Gradual Rollout**: Start with non-blocking mode
- **Team Training**: Ensure team understands scoring system
- **Documentation**: Document threshold decisions and rationale
- **Regular Review**: Periodically review and adjust thresholds

## 🔗 Related Documentation

- [Quick Start Guide](QUICK_START.md)
- [Demo Environment](DEMO_ENVIRONMENT.md)
- [Configuration Reference](CONFIGURATION.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)