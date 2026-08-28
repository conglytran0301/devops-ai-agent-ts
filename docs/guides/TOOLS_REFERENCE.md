# AI Agent Tools Reference

## Overview

The AI agent has access to 5 specialized tools for analyzing Kubernetes systems, correlating events, making predictions, and sending notifications. All tools are properly typed, documented, and fully implemented.

## Tools

### 1. send_cicd_notification

**Purpose**: Send comprehensive CI/CD notifications to Telegram with analysis results.

**Signature**:
```python
def send_cicd_notification(
    health_score: int,
    recommendation: str,
    critical_issues: int,
    warning_issues: int,
    ai_insights: str
) -> Dict[str, str]
```

**Parameters**:
- `health_score` (int): Overall system health score (0-100)
- `recommendation` (str): Deployment recommendation - one of:
  - `"deploy"` - Safe to deploy
  - `"deploy_with_warnings"` - Deploy but monitor closely
  - `"block"` - Do not deploy
- `critical_issues` (int): Number of critical issues detected
- `warning_issues` (int): Number of warning issues detected
- `ai_insights` (str): AI-generated insights and recommendations

**Returns**:
```python
{
    "status": "success" | "error",
    "message": "Notification sent successfully" | error_description,
    "health_score": 85,
    "recommendation": "deploy",
    "critical_issues": 0,
    "warning_issues": 2
}
```

**Example Usage**:
```python
result = send_cicd_notification(
    health_score=85,
    recommendation="deploy",
    critical_issues=0,
    warning_issues=2,
    ai_insights="System is healthy. Minor warnings detected in pod restarts."
)
```

---

### 2. correlate_events_and_metrics

**Purpose**: Correlate Kubernetes events with system metrics to identify patterns and anomalies.

**Signature**:
```python
def correlate_events_and_metrics(
    events: List[Dict[str, Any]],
    metrics: Dict[str, Any],
    time_window_minutes: int = 5
) -> Dict[str, Any]
```

**Parameters**:
- `events` (List[Dict]): List of Kubernetes events with timestamps and descriptions
- `metrics` (Dict): Dictionary of system metrics (CPU, memory, network, etc.)
- `time_window_minutes` (int, optional): Time window for correlation analysis (default: 5)

**Returns**:
```python
{
    "timestamp": "2025-01-01T10:00:00Z",
    "time_window_minutes": 5,
    "correlations_found": [
        {
            "type": "resource_correlation",
            "metric": "cpu_usage",
            "value": 95,
            "events": [...],
            "description": "High CPU usage (95%) correlated with 3 events"
        }
    ],
    "anomalies": [
        {
            "type": "restart_pattern",
            "count": 5,
            "severity": "high",
            "description": "Detected 5 restart-related events in 5 minutes"
        }
    ],
    "causal_chains": [
        {
            "cause": "High memory usage",
            "effect": "Pod restarts",
            "evidence": "Memory at 95% with 5 restarts",
            "confidence": 0.75
        }
    ],
    "confidence_scores": {
        "cpu_correlation": 0.85,
        "memory_correlation": 0.85
    },
    "summary": "Found 2 correlations, 1 anomalies, and 1 causal chains",
    "total_events_analyzed": 10,
    "warning_events": 5,
    "error_events": 2
}
```

**Example Usage**:
```python
result = correlate_events_and_metrics(
    events=[
        {"type": "Warning", "reason": "BackOff", "time": "2025-01-01T10:00:00Z"},
        {"type": "Warning", "reason": "FailedScheduling", "time": "2025-01-01T10:01:00Z"}
    ],
    metrics={"cpu_usage": 95, "memory_usage": 80},
    time_window_minutes=5
)
```

**Correlation Types**:
- `resource_correlation`: High resource usage correlated with events
- `restart_pattern`: Multiple restart events detected
- `image_pull_failure`: Image pull issues detected

---

### 3. predict_system_behavior

**Purpose**: Predict future system behavior based on historical metrics and identify trends.

**Signature**:
```python
def predict_system_behavior(
    metrics_history: Dict[str, List[float]],
    prediction_window_minutes: int = 60
) -> Dict[str, Any]
```

**Parameters**:
- `metrics_history` (Dict[str, List[float]]): Dictionary of metric names to lists of historical values
  - Example: `{"cpu_usage": [45, 50, 55, 60], "memory_usage": [70, 72, 75, 78]}`
- `prediction_window_minutes` (int, optional): How far ahead to predict (default: 60)

**Returns**:
```python
{
    "timestamp": "2025-01-01T10:00:00Z",
    "prediction_window_minutes": 60,
    "predictions": [
        {
            "metric": "cpu_usage",
            "current_value": 65,
            "predicted_value": 78.5,
            "trend": "increasing",
            "change_rate": 2.5,
            "confidence": 0.7
        }
    ],
    "trends": {
        "cpu_usage": "increasing",
        "memory_usage": "stable"
    },
    "warnings": [
        {
            "metric": "cpu_usage",
            "severity": "warning",
            "message": "CPU usage predicted to reach 85% in 60 minutes",
            "threshold_exceeded": 80
        }
    ],
    "recommended_actions": [
        "Scale up resources or optimize CPU usage for cpu_usage"
    ],
    "confidence": 0.7,
    "metrics_analyzed": 2
}
```

**Example Usage**:
```python
result = predict_system_behavior(
    metrics_history={
        "cpu_usage": [45, 50, 55, 60, 65],
        "memory_usage": [70, 72, 75, 78, 80]
    },
    prediction_window_minutes=60
)
```

**Trend Types**:
- `increasing`: Metric is trending upward (change > 2 per interval)
- `decreasing`: Metric is trending downward (change < -2 per interval)
- `stable`: Metric is relatively stable (-2 <= change <= 2)

**Warning Thresholds**:
- CPU: Warning at 80%, Critical at 90%
- Memory: Warning at 80%, Critical at 90%

---

### 4. explain_failure_with_context

**Purpose**: Provide detailed explanation of pod failures with root cause analysis and remediation steps.

**Signature**:
```python
def explain_failure_with_context(
    pod_name: str,
    namespace: str,
    failure_type: str,
    recent_events: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]
```

**Parameters**:
- `pod_name` (str): Name of the failed pod
- `namespace` (str): Kubernetes namespace
- `failure_type` (str): Type of failure - one of:
  - `"CrashLoopBackOff"` - Container crashing repeatedly
  - `"ImagePullBackOff"` - Cannot pull container image
  - `"OOMKilled"` - Out of memory
  - `"Pending"` - Cannot be scheduled
- `recent_events` (List[Dict], optional): Recent Kubernetes events for additional context

**Returns**:
```python
{
    "timestamp": "2025-01-01T10:00:00Z",
    "pod_name": "myapp-7d8f9c-xyz",
    "namespace": "production",
    "failure_type": "CrashLoopBackOff",
    "root_cause_analysis": "The container is crashing repeatedly after starting...",
    "contributing_factors": [
        "Application error or exception on startup",
        "Missing or incorrect configuration",
        "Failed health/readiness probes"
    ],
    "resolution_steps": [
        "Check pod logs: kubectl logs myapp-7d8f9c-xyz -n production",
        "Check previous logs: kubectl logs myapp-7d8f9c-xyz -n production --previous",
        "Describe pod for events: kubectl describe pod myapp-7d8f9c-xyz -n production"
    ],
    "kubectl_commands": [
        "kubectl describe pod myapp-7d8f9c-xyz -n production",
        "kubectl logs myapp-7d8f9c-xyz -n production",
        "kubectl logs myapp-7d8f9c-xyz -n production --previous"
    ],
    "prevention_measures": [
        "Implement proper error handling in application startup",
        "Add comprehensive health checks",
        "Test configuration in staging environment"
    ],
    "confidence_score": 0.9,
    "documentation_links": [
        "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/"
    ]
}
```

**Example Usage**:
```python
result = explain_failure_with_context(
    pod_name="myapp-7d8f9c-xyz",
    namespace="production",
    failure_type="CrashLoopBackOff",
    recent_events=[
        {"type": "Warning", "reason": "BackOff", "message": "Back-off restarting failed container"}
    ]
)
```

**Supported Failure Types**:
1. **CrashLoopBackOff** (confidence: 0.9)
   - Container crashes repeatedly
   - Common causes: Application errors, config issues, failed probes
   
2. **ImagePullBackOff** (confidence: 0.95)
   - Cannot pull container image
   - Common causes: Wrong image tag, auth failure, network issues
   
3. **OOMKilled** (confidence: 0.85)
   - Out of memory
   - Common causes: Memory limit too low, memory leak, inefficient code
   
4. **Pending** (confidence: 0.8)
   - Cannot be scheduled
   - Common causes: Insufficient resources, node selectors, taints

---

### 5. simulate_chaos_scenario

**Purpose**: Simulate different system scenarios for testing and demonstration without a real cluster.

**Signature**:
```python
def simulate_chaos_scenario(
    scenario_type: str = "healthy"
) -> Dict[str, Any]
```

**Parameters**:
- `scenario_type` (str, optional): Type of scenario to simulate (default: "healthy")
  - `"healthy"` - All systems operational
  - `"pressure"` - System under resource pressure
  - `"critical"` - Critical failures
  - `"recovery"` - System recovering from issues

**Returns**:
```python
{
    "timestamp": "2025-01-01T10:00:00Z",
    "scenario": "critical",
    "health_score": 35,
    "description": "Critical system failures, immediate action required",
    "pods": {
        "app-1": {"status": "CrashLoopBackOff", "ready": False, "restarts": 10},
        "app-2": {"status": "ImagePullBackOff", "ready": False, "restarts": 0},
        "app-3": {"status": "Pending", "ready": False, "restarts": 0}
    },
    "metrics": {
        "cpu_usage": 98,
        "memory_usage": 95,
        "network_latency_ms": 500,
        "error_rate": 15.0
    },
    "events": [
        {"type": "Warning", "reason": "BackOff", "message": "Back-off restarting failed container"},
        {"type": "Warning", "reason": "Failed", "message": "Error: ImagePullBackOff"}
    ],
    "critical_issues": 3,
    "warning_issues": 1,
    "simulated": True
}
```

**Example Usage**:
```python
# Test with critical scenario
result = simulate_chaos_scenario("critical")

# Test with healthy scenario
result = simulate_chaos_scenario("healthy")
```

**Scenario Details**:

| Scenario | Health Score | Description | Critical Issues | Warning Issues |
|----------|--------------|-------------|-----------------|----------------|
| `healthy` | 95 | All systems operational | 0 | 0 |
| `pressure` | 72 | Resource pressure, degrading performance | 0 | 2 |
| `critical` | 35 | Critical failures, immediate action required | 3 | 1 |
| `recovery` | 78 | Recovering from issues, trending positive | 0 | 1 |

---

## Tool Usage Patterns

### Pattern 1: Complete Analysis Flow

```python
# 1. Correlate events and metrics
correlations = correlate_events_and_metrics(
    events=kubernetes_events,
    metrics=system_metrics,
    time_window_minutes=5
)

# 2. Predict future behavior
predictions = predict_system_behavior(
    metrics_history=historical_metrics,
    prediction_window_minutes=60
)

# 3. Explain any failures
if failure_detected:
    explanation = explain_failure_with_context(
        pod_name=failed_pod,
        namespace=namespace,
        failure_type=failure_type
    )

# 4. Send notification with results
send_cicd_notification(
    health_score=calculated_score,
    recommendation=decision,
    critical_issues=critical_count,
    warning_issues=warning_count,
    ai_insights=generated_insights
)
```

### Pattern 2: Testing Without Infrastructure

```python
# Use simulation for testing
simulated_state = simulate_chaos_scenario("critical")

# Analyze simulated state
correlations = correlate_events_and_metrics(
    events=simulated_state["events"],
    metrics=simulated_state["metrics"]
)

# Make decision based on simulation
send_cicd_notification(
    health_score=simulated_state["health_score"],
    recommendation="block" if simulated_state["critical_issues"] > 0 else "deploy",
    critical_issues=simulated_state["critical_issues"],
    warning_issues=simulated_state["warning_issues"],
    ai_insights="Simulated critical scenario detected"
)
```

## Error Handling

All tools implement proper error handling and return structured error responses:

```python
{
    "timestamp": "2025-01-01T10:00:00Z",
    "error": "Error description",
    # ... other fields with safe defaults
}
```

## Logging

All tools use the centralized logger:

```python
from src.utils.logger import get_logger

logger = get_logger()
logger.analysis("Correlating events and metrics")
logger.error("Failed to correlate", error=exception)
```

## Testing

Each tool can be tested independently:

```bash
# Test in Python REPL
python3
>>> from src.tools.observability import *
>>> result = simulate_chaos_scenario("critical")
>>> print(result["health_score"])
35
```

## Best Practices

1. **Always provide context**: Include recent events when calling `explain_failure_with_context`
2. **Use appropriate time windows**: Shorter windows (5min) for real-time, longer (60min) for trends
3. **Check confidence scores**: Higher confidence means more reliable analysis
4. **Handle errors gracefully**: All tools return structured responses even on error
5. **Log tool usage**: Tools automatically log their execution for debugging

## Related Documentation

- [AI Agent Details](AGENT_DETAILS.md) - Complete agent implementation
- [Health Scoring System](HEALTH_SCORING.md) - How health scores are calculated
- [Quick Start Guide](QUICK_START.md) - Getting started with the system
