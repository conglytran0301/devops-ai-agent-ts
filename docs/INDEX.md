# Documentation Index

Complete documentation for the AI-Driven DevOps solution.

## 📖 Table of Contents

### 🚀 Getting Started
Start here if you're new to the project.

1. **[Quick Start Guide](guides/QUICK_START.md)** ⭐
   - 5-minute setup with examples
   - Basic configuration
   - First deployment gate
   - **Start here!**

2. **[Demo Environment](guides/DEMO_ENVIRONMENT.md)**
   - Complete Kubernetes demo setup
   - Test scenarios (healthy, pressure, critical, recovery)
   - Grafana dashboards
   - Requires K8s cluster

### 🏗️ Architecture & Design
Understand how the system works.

3. **[Repository Structure](architecture/REPOSITORY_STRUCTURE.md)**
   - Code organization
   - Module descriptions
   - Development workflow
   - Data flow diagrams

4. **[Multi-Agent Roadmap](architecture/MULTI_AGENT_ROADMAP.md)** 🔮
   - Future multi-agent architecture
   - Specialized agents (RCA, Prometheus, Recommender)
   - Implementation phases
   - Performance improvements

5. **Architecture Diagrams**
   - [High-Level Architecture](images/diagram-ai-driven-high-level.png)
   - [Sequential Flow](images/diagram-ai-driven-sequential.png)

### 🤖 AI Agent Technical Details
Deep dive into the AI agent implementation.

5. **[AI Agent Details](guides/AGENT_DETAILS.md)** ⭐
   - Agent architecture
   - System prompts (compact & full)
   - Invocation code examples
   - Decision logic matrix
   - **Essential for developers**

6. **[Tools Reference](guides/TOOLS_REFERENCE.md)** ⭐
   - Complete tool documentation
   - All 5 tools with signatures
   - Usage examples
   - Error handling
   - **Essential for developers**

7. **[Tool Pattern Compliance](guides/TOOL_PATTERN_COMPLIANCE.md)**
   - How tools follow LLM agent pattern
   - Tool-by-tool analysis
   - Verification methods
   - Best practices

8. **[Health Scoring System](guides/HEALTH_SCORING.md)**
   - Deterministic formula
   - Factor calculations (35%, 25%, 20%, 20%)
   - Score interpretation
   - Environment-specific thresholds

### ⚙️ Configuration & Setup

9. **[Logging Configuration](guides/LOGGING_CONFIGURATION.md)**
   - Logger setup
   - Color support (macOS compatible)
   - Log levels and symbols
   - Troubleshooting

### 📋 Workflow Examples
Ready-to-use GitHub Actions workflows.

10. **[Basic Simulation](examples/basic-simulation-template.yml)**
    - Testing without infrastructure
    - Perfect for getting started

11. **[Deployment Gate](examples/deployment-gate-template.yml)**
    - Production deployment protection
    - Blocking mode enabled

12. **[Pull Request Check](examples/pr-check-template.yml)**
    - Early feedback on code changes
    - Non-blocking analysis

13. **[Post-Deployment Validation](examples/post-ai-check-template.yml)**
    - Validate deployment success
    - Rollback recommendations

14. **[Scheduled Monitoring](examples/scheduler-template.yml)**
    - Continuous health surveillance
    - Runs every 6 hours

### 📊 Technical Review & Improvements

15. **[Technical Review Response](TECHNICAL_REVIEW_RESPONSE.md)** ⭐
    - Executive summary of all feedback responses
    - Point-by-point verification
    - Complete documentation references
    - **Read this first for review status**

16. **[Improvements Summary](IMPROVEMENTS_SUMMARY.md)**
    - All changes made in response to technical review
    - Before/after comparisons
    - Verification commands

17. **[Technical Review Checklist](TECHNICAL_REVIEW_CHECKLIST.md)**
    - Verification of all improvements
    - Quality metrics
    - Testing checklist

### 🖼️ Visual Assets

17. **Screenshots & Diagrams**
    - [Success Analysis](images/ai-driven-okey.png)
    - [Error Analysis](images/ai-driven-error.png)
    - [Telegram Success](images/telegram-okey.png)
    - [Telegram Error](images/telegram-error.png)
    - [Grafana Dashboard 1](images/grafana.png)
    - [Grafana Dashboard 2](images/grafana2.png)
    - [Project Logo](images/logo2.png)

---

## 📚 Documentation by Audience

### For New Users
1. [Quick Start Guide](guides/QUICK_START.md)
2. [Demo Environment](guides/DEMO_ENVIRONMENT.md)
3. [Workflow Examples](examples/)

### For Developers
1. [AI Agent Details](guides/AGENT_DETAILS.md)
2. [Tools Reference](guides/TOOLS_REFERENCE.md)
3. [Tool Pattern Compliance](guides/TOOL_PATTERN_COMPLIANCE.md)
4. [Repository Structure](architecture/REPOSITORY_STRUCTURE.md)

### For DevOps Engineers
1. [Health Scoring System](guides/HEALTH_SCORING.md)
2. [Deployment Gate Template](examples/deployment-gate-template.yml)
3. [Logging Configuration](guides/LOGGING_CONFIGURATION.md)

### For Architects
1. [Repository Structure](architecture/REPOSITORY_STRUCTURE.md)
2. [Architecture Diagrams](images/)
3. [Tool Pattern Compliance](guides/TOOL_PATTERN_COMPLIANCE.md)

---

## 🔍 Quick Reference

### Common Tasks

**Setup the project:**
→ [Quick Start Guide](guides/QUICK_START.md)

**Understand how AI works:**
→ [AI Agent Details](guides/AGENT_DETAILS.md)

**Learn about tools:**
→ [Tools Reference](guides/TOOLS_REFERENCE.md)

**Configure logging:**
→ [Logging Configuration](guides/LOGGING_CONFIGURATION.md)

**Test without infrastructure:**
→ [Basic Simulation Template](examples/basic-simulation-template.yml)

**Deploy to production:**
→ [Deployment Gate Template](examples/deployment-gate-template.yml)

**Understand health scores:**
→ [Health Scoring System](guides/HEALTH_SCORING.md)

---

## 📊 Documentation Statistics

- **Total Documents**: 16
- **Code Examples**: 25+
- **Workflow Templates**: 5
- **Architecture Diagrams**: 2
- **Screenshots**: 8
- **Lines of Documentation**: 5000+

---

## 🔗 External Resources

- [Strands AI Framework](https://github.com/strands-ai/strands)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Bedrock](https://aws.amazon.com/bedrock/)
- [Anthropic Claude](https://www.anthropic.com/)
- [OpenAI](https://openai.com/)

---

## 📝 Contributing to Documentation

Found an issue or want to improve the docs?

1. Check [Repository Structure](architecture/REPOSITORY_STRUCTURE.md)
2. Follow the existing format
3. Add examples where helpful
4. Update this index if adding new docs
5. Submit a pull request

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Status**: Production Ready
