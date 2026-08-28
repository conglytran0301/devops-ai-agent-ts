# Logging Configuration Guide

## Overview

The AI-Driven DevOps solution uses a custom logging system that provides clear, structured output with optional colors and symbols.

## Color Support

### Auto-Detection (Default)

By default, the logger auto-detects whether your terminal supports colors:

```python
from src.utils.logger import get_logger

# Auto-detect (recommended)
logger = get_logger(enable_colors=None)
```

**Auto-detection checks:**
- ✓ Running in CI/CD? → No colors
- ✓ Terminal supports colors? → Use colors
- ✓ Otherwise → Symbols only

### macOS Terminal Issues

If colors don't display correctly on macOS, you have several options:

#### Option 1: Disable Colors (Recommended for macOS)

```python
# In main.py or your code
logger = get_logger(enable_colors=False)
```

This will use symbols only:
```
✓ [OK] Deployment approved
⚠ [WARN] High resource usage detected
✗ [ERROR] Failed to connect
```

#### Option 2: Use iTerm2 or Better Terminal

Install [iTerm2](https://iterm2.com/) which has better ANSI color support:
```bash
brew install --cask iterm2
```

#### Option 3: Configure Terminal.app

In Terminal.app preferences:
1. Go to Preferences → Profiles
2. Select your profile
3. Go to "Advanced" tab
4. Check "Declare terminal as: xterm-256color"

### Environment Variable Control

You can also control colors via environment variable:

```bash
# Disable colors
export AI_DEVOPS_NO_COLOR=1
python main.py

# Force enable colors
export AI_DEVOPS_FORCE_COLOR=1
python main.py
```

## Log Levels

### Standard Levels

| Level | Symbol | Color | Use Case |
|-------|--------|-------|----------|
| `DEBUG` | `·` | Dim | Detailed debugging information |
| `INFO` | `ℹ` | Normal | General information |
| `OK` | `✓` | Green | Success messages |
| `WARN` | `⚠` | Yellow | Warning messages |
| `ERROR` | `✗` | Red | Error messages |
| `CRITICAL` | `‼` | Bold Red | Critical issues |
| `BLOCK` | `⛔` | Bold Red | Deployment blocked |

### Component-Specific Levels

| Level | Symbol | Color | Use Case |
|-------|--------|-------|----------|
| `AI` | `🤖` | Magenta | AI model operations |
| `K8S` | `☸` | Cyan | Kubernetes operations |
| `PROM` | `📊` | Blue | Prometheus metrics |
| `CONFIG` | `⚙` | Normal | Configuration |
| `NOTIFY` | `📢` | Yellow | Notifications |
| `ANALYSIS` | `🔍` | Cyan | System analysis |
| `DECISION` | `⚖` | Magenta | Deployment decisions |

## Usage Examples

### Basic Logging

```python
from src.utils.logger import get_logger

logger = get_logger()

logger.info("Application started")
logger.ok("Deployment approved")
logger.warn("High CPU usage", cpu=85)
logger.error("Connection failed", error=exception)
```

### Component-Specific Logging

```python
logger.ai("Initializing Claude model")
logger.k8s("Found 5 pods in namespace")
logger.prom("Fetching metrics from Prometheus")
logger.analysis("Health analysis complete")
logger.decision("Final Decision: APPROVED")
```

### Structured Output

```python
# Section headers
logger.section("ANALYSIS RESULTS")

# Separators
logger.separator()
logger.separator("=", 80)

# List items
logger.info("Detected issues:")
logger.list_item("Pod restart count: 5", level="warning")
logger.list_item("High CPU usage: 90%", level="critical")
```

## Output Examples

### With Colors (iTerm2 or compatible terminal)

```
🤖 [AI] Initializing Claude model: claude-3-5-sonnet-20241022
⚙ [CONFIG] Blocking Mode: Enabled
☸ [K8S] Access confirmed for namespace: production
📊 [PROM] Found 15 metric types
🔍 [ANALYSIS] Real issues detected: 0 blocking, 2 warnings
✓ [OK] NO ISSUES DETECTED - Deployment can proceed
⚖ [DECISION] Final Decision: APPROVED
```

### Without Colors (macOS Terminal.app)

```
🤖 [AI] Initializing Claude model: claude-3-5-sonnet-20241022
⚙ [CONFIG] Blocking Mode: Enabled
☸ [K8S] Access confirmed for namespace: production
📊 [PROM] Found 15 metric types
🔍 [ANALYSIS] Real issues detected: 0 blocking, 2 warnings
✓ [OK] NO ISSUES DETECTED - Deployment can proceed
⚖ [DECISION] Final Decision: APPROVED
```

### Plain Text (CI/CD environments)

```
[AI] Initializing Claude model: claude-3-5-sonnet-20241022
[CONFIG] Blocking Mode: Enabled
[K8S] Access confirmed for namespace: production
[PROM] Found 15 metric types
[ANALYSIS] Real issues detected: 0 blocking, 2 warnings
[OK] NO ISSUES DETECTED - Deployment can proceed
[DECISION] Final Decision: APPROVED
```

## Testing Your Configuration

Run the logger test to see how it looks in your terminal:

```bash
python -m src.utils.logger
```

This will show:
1. Auto-detected configuration
2. Output with symbols only
3. Output with colors (if supported)

## Troubleshooting

### Colors Show as Weird Characters

**Problem**: You see `^[[32m` or similar in output

**Solution**: Disable colors
```python
logger = get_logger(enable_colors=False)
```

### Symbols Don't Display

**Problem**: Symbols show as `?` or boxes

**Solution**: Use a font that supports Unicode symbols:
- Install [Nerd Fonts](https://www.nerdfonts.com/)
- Or use ASCII-only mode (future feature)

### Colors Work in Terminal but Not in Logs

**Problem**: Colors work interactively but not in log files

**Solution**: This is expected. Colors are automatically disabled when output is redirected:
```bash
# Colors disabled automatically
python main.py > output.log
```

## Best Practices

1. **Use auto-detection** - Let the logger decide based on environment
2. **Test in your environment** - Run `python -m src.utils.logger` to test
3. **Disable in CI/CD** - Colors are auto-disabled in GitHub Actions
4. **Use component-specific levels** - Makes logs easier to filter
5. **Add context with kwargs** - `logger.warn("High CPU", cpu=85, threshold=80)`

## Advanced Configuration

### Custom Logger Instance

```python
from src.utils.logger import Logger

# Create custom logger
custom_logger = Logger(
    enable_timestamps=True,  # Add timestamps
    enable_colors=False      # Disable colors
)

custom_logger.info("Custom logger message")
```

### Filtering Logs

```bash
# Filter by component
python main.py | grep "\[K8S\]"

# Filter by level
python main.py | grep "\[ERROR\]"

# Filter by multiple levels
python main.py | grep -E "\[ERROR\]|\[CRITICAL\]"
```

### Log Parsing

The structured format makes logs easy to parse:

```python
import re

log_pattern = r'\[(\w+)\] (.+)'
with open('output.log') as f:
    for line in f:
        match = re.search(log_pattern, line)
        if match:
            level, message = match.groups()
            print(f"Level: {level}, Message: {message}")
```

## Related Documentation

- [AI Agent Details](AGENT_DETAILS.md)
- [Tools Reference](TOOLS_REFERENCE.md)
- [Quick Start Guide](QUICK_START.md)
