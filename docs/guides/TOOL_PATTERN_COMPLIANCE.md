# Tool Pattern Compliance - LLM Agent Tools

## Overview

This document explains how our tools follow the correct LLM agent tool pattern, where tools are **pure code execution** that return **structured data** for the LLM to reason about.

## ✅ Correct Tool Pattern

Our tools follow this pattern:

```
1. LLM decides it requires to invoke a tool
2. Code invokes the tool (actual deterministic code)
3. Code returns tool result to LLM (structured data)
4. LLM puts result in context and decides what to do next
```

## ❌ What Tools Should NOT Do

- ❌ Make LLM calls internally
- ❌ Make decisions (that's the LLM's job)
- ❌ Return unstructured text
- ❌ Have side effects (except logging/notifications)

## ✅ What Tools SHOULD Do

- ✅ Execute deterministic code
- ✅ Return structured JSON data
- ✅ Provide facts and metrics
- ✅ Be stateless and pure

---

## Tool-by-Tool Analysis

### 1. send_cicd_notification ✅

**What it does:**
- Sends notification to Telegram with structured data
- Returns confirmation with status

**Does it use LLM?** NO ❌
**Returns structured data?** YES ✅

**Code Flow:**
```python
# Step 1: LLM decides to notify
# (Agent reasoning: "I need to send notification about this analysis")

# Step 2: Code executes
result = send_cicd_notification(
    health_score=85,
    recommendation="deploy",
    critical_issues=0,
    warning_issues=2,
    ai_insights="System is healthy. Minor warnings detected."
)

# Step 3: Returns structured data
# {
#   "status": "success",
#   "message": "Notification sent successfully",
#   "health_score": 85,
#   "recommendation": "deploy"
# }

# Step 4: LLM continues
# (Agent reasoning: "Notification sent successfully, I can confirm to user")
```

**Verification:**
```bash
grep -n "model\|agent\|llm" src/tools/observability.py | grep -A5 "send_cicd_notification"
# Result: No LLM calls found
```

---

### 2. correlate_events_and_metrics ✅

**What it does:**
- Analyzes Kubernetes events and metrics
- Finds correlations using deterministic logic
- Returns structured correlation data

**Does it use LLM?** NO ❌
**Returns structured data?** YES ✅

**Code Flow:**
```python
# Step 1: LLM decides to correlate
# (Agent reasoning: "I need to understand if high CPU is related to these events")

# Step 2: Code executes deterministic logic
result = correlate_events_and_metrics(
    events=[
        {"type": "Warning", "reason": "BackOff", "time": "2025-01-01T10:00:00Z"}
    ],
    metrics={"cpu_usage": 95, "memory_usage": 80},
    time_window_minutes=5
)

# Step 3: Returns structured data (NO LLM INVOLVED)
# {
#   "correlations_found": [
#     {
#       "type": "resource_correlation",
#       "metric": "cpu_usage",
#       "value": 95,
#       "events": [...],
#       "description": "High CPU usage (95%) correlated with 3 events"
#     }
#   ],
#   "anomalies": [
#     {
#       "type": "restart_pattern",
#       "count": 5,
#       "severity": "high"
#     }
#   ],
#   "confidence_scores": {"cpu_correlation": 0.85}
# }

# Step 4: LLM reasons about the data
# (Agent reasoning: "Based on the correlation showing high CPU with 3 events,
#  and confidence score of 0.85, this indicates a resource issue")
```

**Implementation Details:**
```python
# Pure deterministic code - NO LLM
if metrics.get("cpu_usage", 0) > 80:
    cpu_events = [e for e in warning_events if "CPU" in str(e)]
    if cpu_events:
        correlations_found.append({
            "type": "resource_correlation",
            "metric": "cpu_usage",
            "value": metrics["cpu_usage"],
            "events": cpu_events
        })
```

**Verification:**
```bash
grep -A50 "def correlate_events_and_metrics" src/tools/observability.py | grep -i "model\|agent\|llm\|invoke"
# Result: No LLM calls found
```

---

### 3. predict_system_behavior ✅

**What it does:**
- Analyzes historical metrics
- Uses linear extrapolation (math, not LLM)
- Returns predictions with confidence scores

**Does it use LLM?** NO ❌
**Returns structured data?** YES ✅

**Code Flow:**
```python
# Step 1: LLM decides to predict
# (Agent reasoning: "I need to know if CPU will become a problem")

# Step 2: Code executes mathematical prediction
result = predict_system_behavior(
    metrics_history={"cpu_usage": [45, 50, 55, 60, 65]},
    prediction_window_minutes=60
)

# Step 3: Returns structured data (MATH, NOT LLM)
# {
#   "predictions": [
#     {
#       "metric": "cpu_usage",
#       "current_value": 65,
#       "predicted_value": 78.5,
#       "trend": "increasing",
#       "change_rate": 2.5,
#       "confidence": 0.7
#     }
#   ],
#   "warnings": [
#     {
#       "metric": "cpu_usage",
#       "severity": "warning",
#       "message": "CPU usage predicted to reach 85% in 60 minutes"
#     }
#   ]
# }

# Step 4: LLM reasons about predictions
# (Agent reasoning: "CPU is trending up and will hit 85% soon,
#  I should recommend scaling or optimization")
```

**Implementation Details:**
```python
# Pure mathematical calculation - NO LLM
recent_values = values[-5:] if len(values) >= 5 else values
avg_change = (recent_values[-1] - recent_values[0]) / len(recent_values)

# Simple linear extrapolation
current_value = values[-1]
predicted_value = current_value + (avg_change * (prediction_window_minutes / 5))

# Deterministic trend detection
if avg_change > 2:
    trend = "increasing"
elif avg_change < -2:
    trend = "decreasing"
else:
    trend = "stable"
```

**Verification:**
```bash
grep -A80 "def predict_system_behavior" src/tools/observability.py | grep -i "model\|agent\|llm\|invoke"
# Result: No LLM calls found
```

---

### 4. explain_failure_with_context ✅

**What it does:**
- Looks up failure type in knowledge base
- Returns structured explanation with remediation steps
- Uses pre-defined patterns (not LLM)

**Does it use LLM?** NO ❌
**Returns structured data?** YES ✅

**Code Flow:**
```python
# Step 1: LLM decides to explain failure
# (Agent reasoning: "I need to understand this CrashLoopBackOff error")

# Step 2: Code looks up in knowledge base
result = explain_failure_with_context(
    pod_name="myapp-7d8f9c-xyz",
    namespace="production",
    failure_type="CrashLoopBackOff"
)

# Step 3: Returns structured data (KNOWLEDGE BASE, NOT LLM)
# {
#   "failure_type": "CrashLoopBackOff",
#   "root_cause_analysis": "The container is crashing repeatedly...",
#   "contributing_factors": [
#     "Application error or exception on startup",
#     "Missing or incorrect configuration"
#   ],
#   "resolution_steps": [
#     "Check pod logs: kubectl logs myapp-7d8f9c-xyz -n production",
#     "Check previous logs: kubectl logs myapp-7d8f9c-xyz -n production --previous"
#   ],
#   "kubectl_commands": [...],
#   "confidence_score": 0.9
# }

# Step 4: LLM uses this information
# (Agent reasoning: "Based on the knowledge base, this is likely a config issue.
#  I'll recommend checking logs and configuration")
```

**Implementation Details:**
```python
# Knowledge base lookup - NO LLM
failure_explanations = {
    "CrashLoopBackOff": {
        "root_cause": "The container is crashing repeatedly...",
        "common_causes": [
            "Application error or exception on startup",
            "Missing or incorrect configuration"
        ],
        "resolution_steps": [...],
        "confidence": 0.9
    },
    "ImagePullBackOff": {...},
    "OOMKilled": {...},
    "Pending": {...}
}

# Simple dictionary lookup
explanation = failure_explanations.get(failure_type, default_explanation)
```

**Verification:**
```bash
grep -A100 "def explain_failure_with_context" src/tools/observability.py | grep -i "model\|agent\|llm\|invoke"
# Result: No LLM calls found
```

---

### 5. simulate_chaos_scenario ✅

**What it does:**
- Returns pre-defined scenario data
- Simulates different system states
- Pure data structure (no computation)

**Does it use LLM?** NO ❌
**Returns structured data?** YES ✅

**Code Flow:**
```python
# Step 1: LLM decides to simulate
# (Agent reasoning: "I need to test with a critical scenario")

# Step 2: Code returns pre-defined data
result = simulate_chaos_scenario("critical")

# Step 3: Returns structured data (STATIC DATA, NOT LLM)
# {
#   "scenario": "critical",
#   "health_score": 35,
#   "pods": {
#     "app-1": {"status": "CrashLoopBackOff", "ready": False, "restarts": 10},
#     "app-2": {"status": "ImagePullBackOff", "ready": False, "restarts": 0}
#   },
#   "metrics": {
#     "cpu_usage": 98,
#     "memory_usage": 95
#   },
#   "critical_issues": 3
# }

# Step 4: LLM analyzes the scenario
# (Agent reasoning: "This critical scenario has 3 issues and health score of 35,
#  I should recommend blocking deployment")
```

**Implementation Details:**
```python
# Static data structure - NO LLM
scenarios = {
    "healthy": {
        "health_score": 95,
        "pods": {...},
        "metrics": {...}
    },
    "critical": {
        "health_score": 35,
        "pods": {...},
        "metrics": {...}
    }
}

# Simple dictionary lookup
scenario = scenarios.get(scenario_type, scenarios["healthy"])
return scenario
```

---

## Complete Verification

### No LLM Imports
```bash
grep -n "from.*model\|import.*agent\|import.*llm" src/tools/observability.py
# Result: No LLM-related imports
```

### No LLM Method Calls
```bash
grep -n "\.invoke\|\.run\|\.generate\|\.complete" src/tools/observability.py
# Result: No LLM method calls
```

### All Returns are Structured
```bash
grep -A2 "return {" src/tools/observability.py | head -20
# Result: All tools return dictionaries with structured data
```

---

## Example: Complete Agent Loop

Here's how the pattern works in practice:

```python
# Agent receives user request
user_request = "Analyze the Kubernetes cluster health"

# Step 1: LLM decides what tools to use
# Agent reasoning: "I need to:
#   1. Correlate events with metrics
#   2. Predict future behavior
#   3. Send notification"

# Step 2: Code invokes tools (NO LLM INSIDE)
correlations = correlate_events_and_metrics(
    events=k8s_events,
    metrics=system_metrics
)
# Returns: {"correlations_found": [...], "anomalies": [...]}

predictions = predict_system_behavior(
    metrics_history=historical_data
)
# Returns: {"predictions": [...], "warnings": [...]}

# Step 3: LLM receives structured data
# Agent context now includes:
# - correlations.correlations_found
# - correlations.anomalies
# - predictions.predictions
# - predictions.warnings

# Step 4: LLM reasons and decides
# Agent reasoning: "Based on:
#   - High CPU correlation (confidence: 0.85)
#   - Restart pattern anomaly (severity: high)
#   - CPU predicted to reach 90% (warning)
#   I should recommend blocking deployment"

# Step 5: LLM invokes notification tool
notification = send_cicd_notification(
    health_score=calculated_score,
    recommendation="block",
    critical_issues=2,
    warning_issues=1,
    ai_insights="High CPU correlated with restarts, predicted to worsen"
)
# Returns: {"status": "success", "message": "Notification sent"}

# Step 6: LLM provides final response
# Agent response: "Analysis complete. Deployment blocked due to..."
```

---

## Key Principles

### 1. Tools are Pure Functions
```python
# ✅ CORRECT: Pure function, deterministic
def correlate_events_and_metrics(events, metrics):
    # Deterministic logic
    if metrics["cpu_usage"] > 80:
        # Find correlations
    return structured_data

# ❌ WRONG: Calls LLM inside
def correlate_events_and_metrics(events, metrics):
    prompt = f"Analyze these events: {events}"
    llm_response = model.invoke(prompt)  # NO!
    return llm_response
```

### 2. Tools Return Facts, Not Decisions
```python
# ✅ CORRECT: Returns facts
return {
    "correlations_found": [...],
    "confidence_scores": {"cpu_correlation": 0.85}
}
# LLM decides what to do with this

# ❌ WRONG: Makes decision
return {
    "decision": "block_deployment",  # Tool shouldn't decide
    "reason": "High CPU"
}
```

### 3. Tools are Stateless
```python
# ✅ CORRECT: No state, pure function
def predict_system_behavior(metrics_history):
    # Calculate based only on input
    return predictions

# ❌ WRONG: Uses global state
global_state = {}
def predict_system_behavior(metrics_history):
    global_state["last_prediction"] = ...  # NO!
    return predictions
```

---

## Compliance Summary

| Tool | No LLM Calls | Structured Output | Deterministic | Stateless | Status |
|------|--------------|-------------------|---------------|-----------|--------|
| send_cicd_notification | ✅ | ✅ | ✅ | ✅ | ✅ COMPLIANT |
| correlate_events_and_metrics | ✅ | ✅ | ✅ | ✅ | ✅ COMPLIANT |
| predict_system_behavior | ✅ | ✅ | ✅ | ✅ | ✅ COMPLIANT |
| explain_failure_with_context | ✅ | ✅ | ✅ | ✅ | ✅ COMPLIANT |
| simulate_chaos_scenario | ✅ | ✅ | ✅ | ✅ | ✅ COMPLIANT |

**Overall Status: ✅ ALL TOOLS COMPLIANT**

---

## Testing Tool Pattern

You can verify the pattern yourself:

```python
# Test 1: Tool doesn't use LLM
from src.tools.observability import correlate_events_and_metrics
result = correlate_events_and_metrics(
    events=[{"type": "Warning"}],
    metrics={"cpu_usage": 95}
)
# Should return immediately with structured data
# No LLM calls, no delays

# Test 2: Result is structured
assert isinstance(result, dict)
assert "correlations_found" in result
assert "confidence_scores" in result

# Test 3: Result is deterministic
result1 = correlate_events_and_metrics(events, metrics)
result2 = correlate_events_and_metrics(events, metrics)
assert result1 == result2  # Same input = same output
```

---

## Conclusion

✅ **All tools follow the correct LLM agent tool pattern:**

1. ✅ Tools execute deterministic code (no LLM calls)
2. ✅ Tools return structured JSON data
3. ✅ Tools provide facts and metrics
4. ✅ LLM receives data and makes decisions
5. ✅ Tools are stateless and pure functions

**The pattern is correctly implemented: Code executes → Returns data → LLM reasons**
