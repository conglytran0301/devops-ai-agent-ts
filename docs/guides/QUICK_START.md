# 🚀 Quick Start Guide

## 📋 Prerequisites
- **Kubernetes Cluster**: EKS, GKE, AKS, or local (minikube, kind)
- **AI Provider Access**: AWS Bedrock, Claude API, or OpenAI API
- **GitHub Repository**: For Actions integration
- **Optional**: Prometheus/Grafana for enhanced monitoring

## ⚡ Quick Start (5 minutes)

### 1. Fork this repository
Fork this repository to your GitHub account

### 2. Configure secrets
Configure secrets in your repository settings:
```
AWS_ACCESS_KEY_ID       # For Bedrock access
AWS_SECRET_ACCESS_KEY   # For Bedrock access
BEDROCK_MODEL_ID        # amazon.nova-pro-v1:0
TELEGRAM_BOT_TOKEN      # Optional: for notifications
TELEGRAM_CHAT_ID        # Optional: for notifications
```

### 3. Copy a workflow template
Copy a workflow template from `examples/` to `.github/workflows/`:
```bash
cp examples/basic-simulation-template.yml .github/workflows/ai-gate.yml
```

### 4. Customize the template
Replace variables in your workflow:
```yaml
# Replace these in your workflow:
namespace: 'your-namespace'
app-name: 'your-app-name'
cluster-name: 'your-cluster-name'
health-threshold: '85'  # Adjust as needed
```

### 5. Push to trigger
Push to trigger the workflow and see AI analysis in action!

## 🎯 Usage Patterns

### Pattern 1: Start with Simulation
```yaml
# Test without real infrastructure
simulation-mode: 'true'
blocking-mode: 'false'
health-threshold: '70'
```

### Pattern 2: Add to Existing Pipeline
```yaml
# Insert before deployment step
- name: 🤖 AI Gate
  uses: roxsross/ai-driven-devops@main
  with:
    model-provider: 'bedrock'
    namespace: 'production'
    blocking-mode: 'true'

- name: 🚀 Deploy
  if: steps.ai-gate.outputs.recommendation == 'deploy'
  run: kubectl apply -f k8s/
```

### Pattern 3: Multi-Environment Setup
```yaml
# Different configs per environment
strategy:
  matrix:
    environment: [dev, staging, prod]
    include:
      - environment: dev
        threshold: '60'
        blocking: 'false'
      - environment: prod
        threshold: '90'
        blocking: 'true'
```

## 🎭 Testing Mode (No Infrastructure Required)

Perfect for exploring AI capabilities without any setup:

```yaml
- name: 🎭 AI Observability Test
  uses: roxsross/ai-driven-devops@main
  with:
    model-provider: 'openai'           # Cheapest for testing
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    simulation-mode: 'true'            # Uses simulated data
    namespace: 'my-app'
    health-threshold: '70'
    blocking-mode: 'false'             # Non-blocking for testing
```

## 🚀 Production Deployment Gate

AI-powered deployment protection with multiple provider options:

### AWS Bedrock (Enterprise Recommended)
```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: 🏢 AI Gate (Bedrock)
  id: ai-gate
  uses: roxsross/ai-driven-devops@main
  with:
    model-provider: 'bedrock'
    bedrock-model-id: 'amazon.nova-pro-v1:0'
    namespace: 'production'
    health-threshold: '85'
    blocking-mode: 'true'
```

### Claude (Advanced Reasoning)
```yaml
- name: 🧠 AI Gate (Claude)
  id: ai-gate
  uses: roxsross/ai-driven-devops@main
  with:
    model-provider: 'claude'
    claude-model-id: 'claude-3-5-sonnet-20241022'
    claude-api-key: ${{ secrets.CLAUDE_API_KEY }}
    namespace: 'production'
    health-threshold: '85'
    blocking-mode: 'true'
```

### OpenAI (Popular Choice)
```yaml
- name: 🔥 AI Gate (OpenAI)
  id: ai-gate
  uses: roxsross/ai-driven-devops@main
  with:
    model-provider: 'openai'
    openai-model-id: 'gpt-4'
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    namespace: 'production'
    health-threshold: '85'
    blocking-mode: 'true'
```

## 🎯 Complete Production Workflow

Full-featured deployment gate with notifications and conditional deployment:

```yaml
name: 🚀 AI-Powered Production Deployment

on:
  push:
    branches: [ main ]

jobs:
  ai-deployment-gate:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: 🤖 AI Deployment Gate
        id: ai-gate
        uses: roxsross/ai-driven-devops@main
        with:
          model-provider: 'bedrock'
          bedrock-model-id: 'amazon.nova-pro-v1:0'
          namespace: 'production'
          blocking-mode: 'true'
          health-threshold: '85'
          telegram-bot-token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          telegram-chat-id: ${{ secrets.TELEGRAM_CHAT_ID }}
          ci-pipeline-id: ${{ github.run_id }}
          ci-environment: 'production'
          ci-commit-sha: ${{ github.sha }}

      - name: ✅ Deploy if AI Approved
        if: steps.ai-gate.outputs.recommendation == 'deploy'
        run: |
          echo "🚀 AI approved deployment with health score: ${{ steps.ai-gate.outputs.health-score }}"
          echo "🔍 Analysis: ${{ steps.ai-gate.outputs.analysis-summary }}"
          # Your deployment commands here
          kubectl apply -f k8s/

      - name: 🚫 Handle Blocked Deployment
        if: steps.ai-gate.outputs.recommendation == 'block'
        run: |
          echo "🚫 Deployment blocked by AI analysis"
          echo "🚨 Critical Issues: ${{ steps.ai-gate.outputs.critical-issues }}"
          echo "📊 Health Score: ${{ steps.ai-gate.outputs.health-score }}"
          echo "🔍 Check Telegram notifications for detailed analysis"
          exit 1
```

## 📊 Understanding the Output

When the AI analysis completes, you'll see:

```yaml
# GitHub Actions Outputs
outputs:
  health-score: "87"           # 0-100 health score
  recommendation: "deploy"     # deploy, block, or deploy_with_warnings
  critical-issues: "0"         # Number of critical issues found
  analysis-summary: "System is healthy with good performance metrics..."
```

**Health Score Interpretation:**
- **90-100**: 🟢 Excellent - Deploy with confidence
- **80-89**: 🟡 Good - Deploy with monitoring
- **70-79**: 🟠 Acceptable - Deploy with warnings
- **60-69**: 🔴 Degraded - Block deployment (if blocking enabled)
- **0-59**: 🚨 Critical - Always block deployment

## 🔧 Customization Guide

### Adjust AI Sensitivity
```yaml
# Conservative (fewer false positives)
health-threshold: '95'
blocking-mode: 'true'

# Balanced (recommended)
health-threshold: '85'
blocking-mode: 'true'

# Permissive (development)
health-threshold: '70'
blocking-mode: 'false'
```

### Add Custom Metrics
```python
# In src/tools/observability.py
def analyze_custom_metrics():
    # Add your custom health checks
    custom_score = check_database_health()
    return custom_score
```

### Extend Notifications
```python
# In src/notifications/
class SlackNotifier:
    def send_alert(self, analysis_result):
        # Implement Slack integration
        pass
```

## 🆘 Troubleshooting

### Common Issues

1. **Missing Secrets**: Ensure all required secrets are configured
2. **Invalid Cluster Access**: Verify kubectl can connect to your cluster
3. **AI Provider Limits**: Check API rate limits and quotas
4. **Namespace Not Found**: Ensure the specified namespace exists

### Getting Help

- Check the [troubleshooting guide](../guides/TROUBLESHOOTING.md)
- Review [configuration examples](../examples/)
- Open an issue for support

## 📚 Next Steps

- Explore [workflow templates](../examples/)
- Try the [demo environment](../guides/DEMO_ENVIRONMENT.md)
- Learn about [AI health scoring](../guides/HEALTH_SCORING.md)
- Review [best practices](../guides/BEST_PRACTICES.md)