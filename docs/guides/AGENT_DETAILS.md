# AI Agent Technical Details

## Overview

This document provides technical details about the AI agent implementation, including tools, system prompts, score calculation, and invocation code.

## Agent Architecture

The AI agent is built using the **Strands AI framework** and integrates with multiple AI providers (AWS Bedrock, Claude, OpenAI) through a unified interface.

### Core Components

```python
from strands import Agent
from src.models.ai_models import initialize_ai_model
from src.tools.observability import (
    correlate_events_and_metrics,
    predict_system_behavior,
    explain_failure_with_context
)

# Initialize AI model
model = initialize_ai_model(provider="bedrock")  # or "claude", "openai"

# Create agent with tools
agent = Agent(
    model=model,
    system_prompt=SYSTEM_PROMPT,
    tools=[
        correlate_events_and_metrics,
        predict_system_behavior,
        explain_failure_with_context,
        send_cicd_notification
    ]
)
```

## System Prompts

The agent uses different system prompts depending on the AI provider to optimize for token limits and capabilities.

### Compact Prompt (OpenAI GPT-4)

Used for token-limited models:

```python
SYSTEM_PROMPT_COMPACT = """
You are a Kubernetes observability agent. Analyze system health and make deployment decisions.

**Decision Rules:**
- CrashLoopBackOff/ImagePullBackOff = BLOCK
- Health <60 = BLOCK  
- High restarts (>5) = BLOCK
- Otherwise = APPROVE

**Required Actions:**
1. Analyze current vs historical issues
2. Call send_cicd_notification() with: health_score, recommendation, critical_issues, warning_issues, ai_insights
3. Provide kubectl commands for investigation

**Response Format:**
- Root Cause: [brief analysis]
- Current Issues: [active problems]  
- Decision: BLOCK/APPROVE
- Reasoning: [justification]
"""
```

### Full Prompt (Claude/Bedrock)

Used for models with larger context windows:

```python
SYSTEM_PROMPT_FULL = """
You are an AI-Driven Observability Agent specialized in Kubernetes SRE and DevOps practices.

## Analysis Framework:
- **Current State vs Historical**: Distinguish between active issues and resolved past events
- **Health Score Interpretation**: 
  * 90-100: Excellent (approve with confidence)
  * 75-89: Good (approve with monitoring)
  * 60-74: Degraded (approve with warnings, increase monitoring)
  * <60: Critical (consider blocking if issues are current)
- **Pod Health Patterns**:
  * CrashLoopBackOff: Application/config issue - BLOCK
  * ImagePullBackOff: Registry/auth issue - BLOCK
  * Pending: Resource constraints - investigate
  * High restarts (>5): Instability - BLOCK
  * Low restarts (1-3): Transient issues - monitor

## Decision Logic:
1. If current pods are healthy but historical events show past issues = APPROVE with monitoring
2. If active CrashLoopBackOff or ImagePullBackOff = BLOCK deployment
3. If health score <60 with current issues = BLOCK
4. If health score 60-74 = APPROVE with warnings
5. If health score 75+ = APPROVE

## Required Tool Calls:
- Always call send_cicd_notification() with complete analysis
- Provide actionable kubectl commands for investigation
- Include both current state and historical context
"""
```

## Agent Tools

The agent has access to several observability tools that it can invoke during analysis.

### 1. correlate_events_and_metrics

Correlates Kubernetes events with system metrics to identify patterns.

```python
def correlate_events_and_metrics(
    events: list,
    metrics: dict,
    time_window: str = "5m"
) -> dict:
    """
    Correlate Kubernetes events with system metrics.
    
    Args:
        events: List of Kubernetes events
        metrics: Dictionary of system metrics
        time_window: Time window for correlation (default: 5m)
    
    Returns:
        Dictionary with correlated patterns and insights
    """
    correlations = []
    
    for event in events:
        event_time = parse_event_time(event)
        related_metrics = find_metrics_near_time(metrics, event_time, time_window)
        
        if related_metrics:
            correlations.append({
                "event": event,
                "metrics": related_metrics,
                "correlation_strength": calculate_correlation(event, related_metrics)
            })
    
    return {
        "correlations": correlations,
        "patterns": identify_patterns(correlations),
        "insights": generate_insights(correlations)
    }
```

### 2. predict_system_behavior

Predicts future system behavior based on current trends.

```python
def predict_system_behavior(
    metrics_history: dict,
    prediction_window: str = "1h"
) -> dict:
    """
    Predict system behavior based on historical metrics.
    
    Args:
        metrics_history: Historical metrics data
        prediction_window: How far ahead to predict (default: 1h)
    
    Returns:
        Dictionary with predictions and confidence levels
    """
    predictions = {}
    
    for metric_name, values in metrics_history.items():
        trend = calculate_trend(values)
        forecast = extrapolate_trend(trend, prediction_window)
        
        predictions[metric_name] = {
            "current_value": values[-1],
            "predicted_value": forecast,
            "trend": trend,
            "confidence": calculate_confidence(values)
        }
    
    return {
        "predictions": predictions,
        "warnings": identify_warnings(predictions),
        "recommendations": generate_recommendations(predictions)
    }
```

### 3. explain_failure_with_context

Provides detailed explanation of failures with context.

```python
def explain_failure_with_context(
    pod_name: str,
    namespace: str,
    failure_type: str
) -> dict:
    """
    Explain pod failure with full context.
    
    Args:
        pod_name: Name of the failed pod
        namespace: Kubernetes namespace
        failure_type: Type of failure (CrashLoopBackOff, ImagePullBackOff, etc.)
    
    Returns:
        Dictionary with failure explanation and remediation steps
    """
    # Get pod details
    pod_details = get_pod_details(pod_name, namespace)
    pod_logs = get_pod_logs(pod_name, namespace, tail=100)
    pod_events = get_pod_events(pod_name, namespace)
    
    # Analyze failure
    root_cause = analyze_root_cause(failure_type, pod_details, pod_logs, pod_events)
    
    return {
        "failure_type": failure_type,
        "root_cause": root_cause,
        "pod_details": pod_details,
        "recent_logs": pod_logs,
        "related_events": pod_events,
        "remediation_steps": generate_remediation_steps(root_cause),
        "kubectl_commands": generate_kubectl_commands(pod_name, namespace)
    }
```

### 4. send_cicd_notification

Sends notification to CI/CD system with analysis results.

```python
def send_cicd_notification(
    health_score: int,
    recommendation: str,
    critical_issues: int,
    warning_issues: int,
    ai_insights: str
) -> dict:
    """
    Send notification to CI/CD system.
    
    Args:
        health_score: Overall health score (0-100)
        recommendation: APPROVE, BLOCK, or APPROVE_WITH_WARNINGS
        critical_issues: Number of critical issues found
        warning_issues: Number of warning issues found
        ai_insights: AI-generated insights and recommendations
    
    Returns:
        Dictionary with notification status
    """
    notification_data = {
        "health_score": health_score,
        "recommendation": recommendation,
        "critical_issues": critical_issues,
        "warning_issues": warning_issues,
        "ai_insights": ai_insights,
        "timestamp": datetime.now().isoformat(),
        "environment": CI_ENVIRONMENT,
        "pipeline_id": CI_PIPELINE_ID
    }
    
    # Send to Telegram if configured
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        send_telegram_notification(notification_data)
    
    # Set GitHub Actions outputs
    set_github_output("health-score", health_score)
    set_github_output("recommendation", recommendation)
    set_github_output("critical-issues", critical_issues)
    
    return {"status": "sent", "data": notification_data}
```

## Health Score Calculation

The health score is calculated using a **deterministic formula** with weighted factors.

### Formula

```python
def calculate_health_score(
    pod_health: float,
    resource_usage: float,
    network_health: float,
    performance_trends: float
) -> int:
    """
    Calculate overall health score using weighted factors.
    
    Formula:
    health_score = (pod_health * 0.35) + 
                   (resource_usage * 0.25) + 
                   (network_health * 0.20) + 
                   (performance_trends * 0.20)
    
    Args:
        pod_health: Pod health score (0-100)
        resource_usage: Resource utilization score (0-100)
        network_health: Network health score (0-100)
        performance_trends: Performance trend score (0-100)
    
    Returns:
        Overall health score (0-100)
    """
    weights = {
        'pod_health': 0.35,
        'resource_usage': 0.25,
        'network_health': 0.20,
        'performance_trends': 0.20
    }
    
    score = (
        pod_health * weights['pod_health'] +
        resource_usage * weights['resource_usage'] +
        network_health * weights['network_health'] +
        performance_trends * weights['performance_trends']
    )
    
    return int(round(score))
```

### Factor Calculations

#### 1. Pod Health Score (35% weight)

```python
def calculate_pod_health_score(pods: list) -> float:
    """
    Calculate pod health score based on pod states.
    
    Scoring:
    - Running + Ready: 100 points
    - Running + Not Ready: 50 points
    - Pending: 30 points
    - Failed/CrashLoopBackOff: 0 points
    - Restart penalty: -5 points per restart (max -50)
    """
    if not pods:
        return 0.0
    
    total_score = 0
    for pod in pods:
        pod_score = 0
        
        # Base score from status
        if pod['status'] == 'Running' and pod['ready']:
            pod_score = 100
        elif pod['status'] == 'Running' and not pod['ready']:
            pod_score = 50
        elif pod['status'] == 'Pending':
            pod_score = 30
        else:  # Failed, CrashLoopBackOff, etc.
            pod_score = 0
        
        # Restart penalty
        restarts = pod.get('restarts', 0)
        restart_penalty = min(restarts * 5, 50)
        pod_score = max(0, pod_score - restart_penalty)
        
        total_score += pod_score
    
    return total_score / len(pods)
```

#### 2. Resource Usage Score (25% weight)

```python
def calculate_resource_usage_score(metrics: dict) -> float:
    """
    Calculate resource usage score.
    
    Scoring:
    - 0-60% usage: 100 points (optimal)
    - 60-80% usage: 80 points (good)
    - 80-90% usage: 50 points (warning)
    - 90-100% usage: 20 points (critical)
    - >100% usage: 0 points (exhausted)
    """
    cpu_usage = metrics.get('cpu_usage_percent', 0)
    memory_usage = metrics.get('memory_usage_percent', 0)
    
    def score_usage(usage):
        if usage <= 60:
            return 100
        elif usage <= 80:
            return 80
        elif usage <= 90:
            return 50
        elif usage <= 100:
            return 20
        else:
            return 0
    
    cpu_score = score_usage(cpu_usage)
    memory_score = score_usage(memory_usage)
    
    return (cpu_score + memory_score) / 2
```

#### 3. Network Health Score (20% weight)

```python
def calculate_network_health_score(network_metrics: dict) -> float:
    """
    Calculate network health score.
    
    Scoring:
    - Service availability: 40 points
    - Endpoint health: 30 points
    - DNS resolution: 20 points
    - Network latency: 10 points
    """
    score = 0
    
    # Service availability (40 points)
    if network_metrics.get('services_available', 0) > 0:
        availability_ratio = (
            network_metrics['services_healthy'] / 
            network_metrics['services_available']
        )
        score += availability_ratio * 40
    
    # Endpoint health (30 points)
    if network_metrics.get('endpoints_available', 0) > 0:
        endpoint_ratio = (
            network_metrics['endpoints_ready'] / 
            network_metrics['endpoints_available']
        )
        score += endpoint_ratio * 30
    
    # DNS resolution (20 points)
    if network_metrics.get('dns_resolution_success', True):
        score += 20
    
    # Network latency (10 points)
    latency = network_metrics.get('avg_latency_ms', 0)
    if latency < 50:
        score += 10
    elif latency < 100:
        score += 7
    elif latency < 200:
        score += 4
    
    return score
```

#### 4. Performance Trends Score (20% weight)

```python
def calculate_performance_trends_score(trends: dict) -> float:
    """
    Calculate performance trends score.
    
    Scoring:
    - Improving trends: 100 points
    - Stable trends: 80 points
    - Slightly degrading: 60 points
    - Degrading: 40 points
    - Rapidly degrading: 20 points
    """
    trend_direction = trends.get('direction', 'stable')
    trend_magnitude = trends.get('magnitude', 0)
    
    if trend_direction == 'improving':
        return 100
    elif trend_direction == 'stable':
        return 80
    elif trend_direction == 'degrading':
        if trend_magnitude < 0.1:  # Slight degradation
            return 60
        elif trend_magnitude < 0.3:  # Moderate degradation
            return 40
        else:  # Rapid degradation
            return 20
    
    return 80  # Default to stable
```

## Agent Invocation

### Basic Invocation

```python
async def analyze_system():
    # Initialize agent
    model = initialize_ai_model(MODEL_PROVIDER)
    agent = Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT_FULL,
        tools=[
            correlate_events_and_metrics,
            predict_system_behavior,
            explain_failure_with_context,
            send_cicd_notification
        ]
    )
    
    # Collect system data
    pods = get_pod_status(NAMESPACE)
    events = get_kubernetes_events(NAMESPACE)
    metrics = get_system_metrics(NAMESPACE)
    
    # Calculate health score
    health_score = calculate_health_score(
        pod_health=calculate_pod_health_score(pods),
        resource_usage=calculate_resource_usage_score(metrics),
        network_health=calculate_network_health_score(metrics),
        performance_trends=calculate_performance_trends_score(metrics)
    )
    
    # Prepare analysis context
    analysis_context = {
        "namespace": NAMESPACE,
        "health_score": health_score,
        "pods": format_pods_for_ai(pods),
        "events": events,
        "metrics": metrics,
        "threshold": HEALTH_THRESHOLD
    }
    
    # Invoke agent
    result = await agent.run(
        f"""Analyze this Kubernetes environment and make a deployment decision.
        
        Health Score: {health_score}/100
        Threshold: {HEALTH_THRESHOLD}
        
        Pod Status:
        {json.dumps(analysis_context['pods'], indent=2)}
        
        Recent Events:
        {json.dumps(events, indent=2)}
        
        System Metrics:
        {json.dumps(metrics, indent=2)}
        
        Provide your analysis and call send_cicd_notification() with your recommendation.
        """
    )
    
    return result
```

### With Prometheus Integration

```python
async def analyze_system_with_prometheus():
    # ... (same initialization as above)
    
    # Get Prometheus metrics
    prom_metrics = get_application_metrics(NAMESPACE, PROM_URL)
    anomalies = detect_anomalies(prom_metrics)
    
    # Enhanced analysis context
    analysis_context = {
        # ... (same as above)
        "prometheus_metrics": format_metrics_for_ai(prom_metrics),
        "anomalies": anomalies
    }
    
    # Invoke agent with enhanced context
    result = await agent.run(
        f"""Analyze this Kubernetes environment with Prometheus metrics.
        
        Health Score: {health_score}/100
        Prometheus Metrics: {json.dumps(prom_metrics, indent=2)}
        Detected Anomalies: {json.dumps(anomalies, indent=2)}
        
        Use the available tools to correlate events and metrics, predict system behavior,
        and provide a comprehensive analysis.
        """
    )
    
    return result
```

## Decision Logic

The agent makes deployment decisions based on:

1. **Health Score**: Calculated using the deterministic formula above
2. **Critical Issues**: Active CrashLoopBackOff, ImagePullBackOff, or similar
3. **Historical Context**: Distinguishes between current and past issues
4. **Trend Analysis**: Considers if the system is improving or degrading

### Decision Matrix

| Health Score | Critical Issues | Trend | Decision |
|--------------|----------------|-------|----------|
| 90-100 | 0 | Any | APPROVE |
| 75-89 | 0 | Stable/Improving | APPROVE |
| 75-89 | 0 | Degrading | APPROVE_WITH_WARNINGS |
| 60-74 | 0 | Improving | APPROVE_WITH_WARNINGS |
| 60-74 | 0 | Degrading | BLOCK (if blocking enabled) |
| <60 | Any | Any | BLOCK |
| Any | >0 | Any | BLOCK |

## Simulation Mode

For testing without a real Kubernetes cluster:

```python
def simulate_chaos_scenario(scenario: str) -> dict:
    """
    Simulate different system scenarios for testing.
    
    Scenarios:
    - "healthy": All systems operational
    - "pressure": High resource usage
    - "critical": Multiple failures
    - "recovery": System recovering from issues
    """
    scenarios = {
        "healthy": {
            "health_score": 95,
            "pods": [{"status": "Running", "ready": True, "restarts": 0}] * 3,
            "critical_issues": 0,
            "warning_issues": 0
        },
        "pressure": {
            "health_score": 72,
            "pods": [{"status": "Running", "ready": True, "restarts": 2}] * 3,
            "critical_issues": 0,
            "warning_issues": 2
        },
        "critical": {
            "health_score": 35,
            "pods": [
                {"status": "CrashLoopBackOff", "ready": False, "restarts": 10},
                {"status": "Running", "ready": False, "restarts": 5},
                {"status": "Pending", "ready": False, "restarts": 0}
            ],
            "critical_issues": 2,
            "warning_issues": 1
        },
        "recovery": {
            "health_score": 78,
            "pods": [
                {"status": "Running", "ready": True, "restarts": 3},
                {"status": "Running", "ready": True, "restarts": 2},
                {"status": "Running", "ready": False, "restarts": 1}
            ],
            "critical_issues": 0,
            "warning_issues": 1
        }
    }
    
    return scenarios.get(scenario, scenarios["healthy"])
```

## References

- [Health Scoring System](HEALTH_SCORING.md)
- [Quick Start Guide](QUICK_START.md)
- [Repository Structure](../architecture/REPOSITORY_STRUCTURE.md)
