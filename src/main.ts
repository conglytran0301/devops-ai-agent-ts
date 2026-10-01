import { Agent, tool, type Tool } from "@strands-agents/sdk";
import { z } from "zod";
import { writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  MODEL_PROVIDER, SIMULATION_MODE, BLOCKING_MODE, HEALTH_THRESHOLD,
  CI_PIPELINE_ID, CI_ENVIRONMENT, NAMESPACE, VALIDATION_CONTEXT,
  TELEGRAM_ENABLED, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
} from "./config/settings.js";
import { initializeAiModel } from "./models/aiModels.js";
import {
  initializeKubernetesClient,
  analyzeWithK8sClient,
  analyzeWithKubectl,
  type K8sClients,
  type HealthAnalysis,
  type AiInsight,
} from "./analyzers/kubernetes.js";
import {
  correlateEventsAndMetrics,
  predictSystemBehavior,
  explainFailureWithContext,
  simulateChaosScenario,
} from "./tools/observability.js";
import { sendTelegramNotification } from "./notifications/telegram.js";
import {
  formatPodsForAi,
  formatInsightsForAi,
  setGithubOutput,
  generateFinalSummary,
} from "./utils/helpers.js";
import { getLogger } from "./utils/logger.js";

const execFileAsync = promisify(execFile);
const logger = getLogger({ enableColors: undefined });

const PROMETHEUS_AVAILABLE = false; // Bước 5 (Prometheus) chưa port

const SYSTEM_PROMPT_COMPACT = `
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
`;

const SYSTEM_PROMPT_FULL = `
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
3. If health score < threshold but pods recovering = APPROVE with warnings
4. If multiple critical insights with high confidence = BLOCK deployment
5. Always provide traceability: link symptoms to root cause to recommendation

## Response Format:
**Root Cause**: [Brief analysis of current vs historical state]
**Current Issues**: [List active problems or "None - system recovered"]
**kubectl Commands**: [Specific commands if investigation needed]
**Decision**: BLOCK or APPROVE
**Reasoning**: [Clear justification based on current state]

When calling send_cicd_notification(), ALWAYS include:
- health_score: The actual health score from your analysis
- recommendation: Your deployment decision (block/deploy/deploy_with_warnings)  
- critical_issues: Count of critical issues
- warning_issues: Count of warning issues
- ai_insights: The actual ai_insights array from the analysis data

After calling send_cicd_notification(), do NOT repeat the notification content. Simply confirm:
"[OK] Team notified via Telegram" or "[NOTIFY] Notification sent"

## Notification Guidelines:
- ALWAYS use send_cicd_notification() with ALL these parameters:
  * message: Clear, actionable summary (2-3 sentences max)
  * severity: "critical" (blocking), "warning" (issues), "success" (healthy), "info" (general)
  * health_score: REQUIRED - Current system health score (0-100) from your analysis
  * recommendation: REQUIRED - "block", "deploy", or "deploy_with_warnings" based on your decision
- REQUIRED: Always pass ai_insights from your analysis
- Only send notifications for:
  * Critical issues requiring immediate attention (ImagePullBackOff, CrashLoopBackOff)
  * Deployment blocking decisions
  * Significant state changes
- Avoid notifications for:
  * Historical issues that are resolved
  * Routine health checks with no issues
  * Warnings that don't require immediate action

Be concise, data-driven, and focus on current system state over historical events.
Avoid repeating information already sent in notifications.
`;

interface SystemHealthAnalysis extends HealthAnalysis {
  timestamp: string;
  pipelineContext: {
    pipelineId: string;
    commitSha: string;
    environment: string;
  };
  predictions: unknown[];
  correlations: unknown[];
  recommendations: unknown[];
  traceability: unknown[];
}

async function main(): Promise<void> {
  console.log("🤖 AI-Driven Observability Agent");
  console.log("AWS re:Invent 2025 - Supercharge DevOps with AI-driven observability");
  console.log("=".repeat(80));
  console.log(
    `Pipeline: ${CI_PIPELINE_ID} | Environment: ${CI_ENVIRONMENT} | Namespace: ${NAMESPACE}`
  );
  console.log(`AI Model: ${MODEL_PROVIDER.toUpperCase()}`);
  console.log("=".repeat(80));

  const k8sClients: K8sClients | null = await initializeKubernetesClient();
  const model = initializeAiModel();

  async function analyzeSystemHealthInternal(): Promise<SystemHealthAnalysis> {
    const analysis: SystemHealthAnalysis = {
      timestamp: new Date().toISOString(),
      pipelineContext: {
        pipelineId: CI_PIPELINE_ID,
        commitSha: "unknown",
        environment: CI_ENVIRONMENT,
      },
      healthScore: 100,
      pods: {},
      aiInsights: [],
      predictions: [],
      correlations: [],
      recommendations: [],
      traceability: [],
    };

    try {
      if (k8sClients !== null) {
        return (await analyzeWithK8sClient(k8sClients, analysis)) as SystemHealthAnalysis;
      }
      return (await analyzeWithKubectl(analysis)) as SystemHealthAnalysis;
    } catch (err) {
      analysis.error = (err as Error).message;
      analysis.aiInsights.push({
        type: "system_error",
        message: `Failed to analyze system health: ${(err as Error).message}`,
        confidence: 1.0,
        impact: "high",
      });
    }

    return analysis;
  }

  const analyzeSystemHealth = tool({
    name: "analyze_system_health",
    description: "AI-Enhanced System Health Analysis",
    inputSchema: z.object({}),
    callback: async () => analyzeSystemHealthInternal(),
  });

  const sendCicdNotificationTool = tool({
    name: "send_cicd_notification",
    description: "Send CI/CD-focused notifications to Telegram with pipeline context",
    inputSchema: z.object({
      message: z.string().describe("Main notification message"),
      severity: z.string().default("info").describe("Alert severity (critical, warning, info, success)"),
      include_context: z.boolean().default(true).describe("Include pipeline context"),
      health_score: z.number().optional().describe("System health score (0-100)"),
      recommendation: z.string().optional().describe("Deployment recommendation (block, deploy, deploy_with_warnings)"),
      critical_issues: z.number().optional().describe("Number of critical issues detected"),
      warning_issues: z.number().optional().describe("Number of warning issues detected"),
      ai_insights: z.array(z.record(z.string(), z.unknown())).optional().describe("List of AI insights with details"),
    }),
    callback: async (input) => {
      const {
        message, severity, include_context,
        health_score, recommendation, critical_issues, warning_issues, ai_insights,
      } = input;

      console.log(`   Attempting to send notification: ${severity}`);
      console.log(`   Health Score: ${health_score}`);
      console.log(`   Recommendation: ${recommendation}`);
      console.log(`   Critical Issues: ${critical_issues}`);
      console.log(`   Warning Issues: ${warning_issues}`);
      console.log(`   AI Insights: ${ai_insights ? ai_insights.length : 0} items`);

      const result = await sendTelegramNotification(message, {
        severity,
        includeContext: include_context,
        k8sClient: k8sClients,
        healthScore: health_score,
        recommendation,
        criticalIssues: critical_issues,
        warningIssues: warning_issues,
        aiInsights: ai_insights as AiInsight[] | undefined,
      });

      console.log(`📱 Notification result: ${result}`);
      return result;
    },
  });

    let agentTools: Tool[];

  if (MODEL_PROVIDER === "openai") {
    agentTools = [sendCicdNotificationTool];
    console.log("🤖 OpenAI: Using minimal toolset to save tokens");
  } else {
    agentTools = [
      analyzeSystemHealth,
      correlateEventsAndMetrics,
      predictSystemBehavior,
      explainFailureWithContext,
      sendCicdNotificationTool,
      simulateChaosScenario,
    ];

    if (PROMETHEUS_AVAILABLE) {
      // Prometheus tools chưa port (Bước 5) — sẽ thêm vào đây khi cần.
      logger.prom("Prometheus AI tools enabled");
    }
  }

  const systemPrompt = MODEL_PROVIDER === "openai" ? SYSTEM_PROMPT_COMPACT : SYSTEM_PROMPT_FULL;

  const agent =
    model !== null
      ? new Agent({
          model,
          tools: agentTools,
          systemPrompt,
        })
      : null;

  logger.config(`Blocking Mode: ${BLOCKING_MODE ? "Enabled" : "Disabled"}`);

  logger.config(`Telegram: ${TELEGRAM_ENABLED ? "Enabled" : "Disabled"}`);
  if (!TELEGRAM_ENABLED) {
    console.log(`   Bot Token: ${TELEGRAM_BOT_TOKEN ? "Set" : "Missing"}`);
    console.log(`   Chat ID: ${TELEGRAM_CHAT_ID ? "Set" : "Missing"}`);
  }

  try {
    const { stdout } = await execFileAsync(
      "kubectl",
      ["get", "pods", "-n", NAMESPACE],
      { timeout: 5000 }
    );
    void stdout;
    logger.k8s(`Access confirmed for namespace: ${NAMESPACE}`);
  } catch {
    logger.warn(`Kubernetes access limited or denied for namespace: ${NAMESPACE}`);
  }

    const healthAnalysis = await analyzeSystemHealthInternal();

  // Prometheus enrichment chưa port (Bước 5) — health_analysis không có prometheus_metrics/prometheus_anomalies.

  let aiRecommendsBlock = false;

  const blockingInsights: AiInsight[] = [];
const warningInsights: AiInsight[] = [];

const blockingIssues: string[] = [];
const warningIssues: string[] = [];

for (const insight of healthAnalysis.aiInsights) {
  const message = insight.message;

  if (insight.blocking === true || insight.impact === "high") {
    blockingInsights.push(insight);
    blockingIssues.push(message);
  } else {
    warningInsights.push(insight);
    warningIssues.push(message);
  }
}

  for (const [podName, podInfo] of Object.entries(healthAnalysis.pods)) {
    if (!podInfo.ready) {
      const issues = podInfo.containerIssues ?? [];
      if (issues.length > 0) {
        blockingIssues.push(`Pod ${podName}: ${issues.join(", ")}`);
      } else {
        blockingIssues.push(`Pod ${podName}: ${podInfo.phase ?? "Unknown"} state`);
      }
    }

    const restarts = podInfo.restarts ?? 0;
    if (restarts > 5) {
      blockingIssues.push(`Pod ${podName}: ${restarts} restarts (instability)`);
    } else if (restarts > 0) {
      warningIssues.push(`Pod ${podName}: ${restarts} restarts`);
    }
  }

  logger.analysis(
    `Real issues detected: ${blockingIssues.length} blocking, ${warningIssues.length} warnings`
  );

  if (blockingIssues.length > 0 || warningIssues.length > 0) {
    for (const issue of blockingIssues) {
      logger.critical(issue);
    }
    for (const issue of warningIssues) {
      logger.warn(issue);
    }
  } else {
    logger.ok("No critical issues detected");
  }

    const healthScore = healthAnalysis.healthScore ?? 0;
  const totalPods = Object.keys(healthAnalysis.pods).length;
  const readyPods = Object.values(healthAnalysis.pods).filter((pod) => pod.ready).length;
  const currentPodsHealthy = readyPods === totalPods && totalPods > 0;

  const isPostDeployment = VALIDATION_CONTEXT === "post-deployment";
  const contextAction = isPostDeployment ? "Post-Deployment Validation" : "Pre-Deployment Gate";

  let query: string;

  if (MODEL_PROVIDER === "openai") {
    query = `
        Analyze K8s system for deployment decision:
        Health: ${healthScore}/100 | Pods: ${readyPods}/${totalPods} ready
        Critical Issues: ${blockingIssues.length} | Warnings: ${warningIssues.length}
        
        Issues: ${blockingIssues.length > 0 ? blockingIssues.slice(0, 3).join("; ") : "None"}
        
        Call send_cicd_notification() with proper parameters.
        `;
  } else {
    const currentIssuesText =
      blockingIssues.length > 0
        ? blockingIssues.slice(0, 3).map((issue) => `• ${issue}`).join("\n")
        : "• No current critical issues";

    const historicalIssuesText =
      warningIssues.length > 0
        ? warningIssues.slice(0, 2).map((issue) => `• ${issue}`).join("\n")
        : "• No historical warnings";

    query = `
        Context: ${contextAction} for ${CI_ENVIRONMENT} environment
        
        Analyze Kubernetes system:
        - Current Health: ${healthScore}/100
        - Current Pods: ${readyPods}/${totalPods} ready
        - Current Status: ${currentPodsHealthy ? "HEALTHY" : "UNHEALTHY"}
        - Active Critical Issues: ${blockingIssues.length}
        - Historical Warnings: ${warningIssues.length}
    
    Current Issues:
    ${currentIssuesText}
    
    Historical Issues:
    ${historicalIssuesText}
    
    IMPORTANT: 
    - This is a ${contextAction} check
    - If current pods are healthy but historical events show past issues, consider the system recovered
    - For post-deployment: Focus on validating the deployment is stable and performing well
    - For pre-deployment: Focus on whether it's safe to deploy
    
    Provide:
    1. Root cause analysis (current vs historical)
    2. kubectl commands if needed
    3. Decision: ${isPostDeployment ? "VALIDATED/NEEDS_ATTENTION" : "BLOCK/APPROVE"}
    4. Send notification with appropriate context
    
    Be concise and focus on current state over historical events.
    `;
  }

  let exitCode = 0;
  let recommendation = "deploy";

  try {
    logger.ai("Analyzing system with AI-driven observability");
    logger.separator();

    const criticalIssuesCount = blockingIssues.length;

    setGithubOutput("health-score", String(healthScore));
    setGithubOutput("critical-issues", String(criticalIssuesCount));
    setGithubOutput("ai-insights", JSON.stringify(healthAnalysis.aiInsights));

    if (
      BLOCKING_MODE &&
      (blockingIssues.length > 0 || healthScore < HEALTH_THRESHOLD || aiRecommendsBlock)
    ) {
      recommendation = "block";
      if (aiRecommendsBlock) {
        logger.block("AI BLOCKING CONDITIONS DETECTED - Deployment will be blocked");
      } else {
        logger.block("BLOCKING CONDITIONS DETECTED - Deployment will be blocked");
      }
    } else if (warningIssues.length > 0) {
      recommendation = "deploy_with_warnings";
      logger.warn("WARNINGS DETECTED - Deployment will proceed with notifications");
    } else {
      recommendation = "deploy";
      logger.ok("NO ISSUES DETECTED - Deployment can proceed");
    }

    setGithubOutput("recommendation", recommendation);

        if (SIMULATION_MODE || agent === null) {
      console.log("🎭 SIMULATION MODE ANALYSIS");
      console.log("");
      console.log(`**Simulated Health:** ${healthScore}/100`);
      console.log(`**AI Insights:** ${healthAnalysis.aiInsights.length} insights generated`);
      console.log(`**Blocking Issues:** ${blockingIssues.length}`);
      console.log(`**Warning Issues:** ${warningIssues.length}`);
      console.log("");

      if (blockingIssues.length > 0) {
        console.log("[CRITICAL] BLOCKING ISSUES:");
        for (const issue of blockingIssues.slice(0, 3)) {
          console.log(`   - ${issue}`);
        }
      }

      if (warningIssues.length > 0) {
        console.log("[WARNING] WARNING ISSUES:");
        for (const issue of warningIssues.slice(0, 3)) {
          console.log(`   - ${issue}`);
        }
      }

      const finalDecision =
        blockingIssues.length > 0 || healthScore < HEALTH_THRESHOLD ? "BLOCKED" : "APPROVED";
      console.log(`\n[DECISION] Final Decision: ${finalDecision}`);
    } else {
      const result = await agent.invoke(query);
      const aiResponse = String(result.lastMessage ?? result);
      console.log(aiResponse);

      if (
        aiResponse.includes("Decision: BLOCK") ||
        aiResponse.includes("BLOCK deployment") ||
        aiResponse.toLowerCase().includes("deployment should be blocked")
      ) {
        aiRecommendsBlock = true;
        console.log("\n🤖 AI RECOMMENDATION: BLOCK deployment detected");
        blockingIssues.push("AI detected critical issues requiring investigation");
      } else if (
        aiResponse.includes("Decision: APPROVE") ||
        aiResponse.toUpperCase().includes("APPROVE") ||
        aiResponse.toLowerCase().includes("ready for deployment") ||
        aiResponse.toLowerCase().includes("safe to deploy")
      ) {
        aiRecommendsBlock = false;
        console.log("\n🤖 AI RECOMMENDATION: APPROVE deployment detected");
      }

      if (
        aiResponse.includes("send_cicd_notification") &&
        !aiResponse.includes("[OK] CI/CD notification sent successfully")
      ) {
        console.log("\n[INFO] AI didn't execute notification - sending manually...");

        const severity = aiRecommendsBlock || blockingIssues.length > 0 ? "critical" : "success";
        recommendation = aiRecommendsBlock || blockingIssues.length > 0 ? "block" : "deploy";

        const message =
          severity === "critical"
            ? `Blocking deployment due to ${blockingIssues.length} critical issues detected.`
            : "System is healthy - deployment approved.";

        try {
          const manualResult = await sendTelegramNotification(message, {
            severity,
            includeContext: true,
            k8sClient: k8sClients,
            healthScore,
            recommendation,
            criticalIssues: blockingIssues.length,
            warningIssues: warningIssues.length,
            aiInsights: healthAnalysis.aiInsights,
          });
          console.log(`[NOTIFY] Manual notification result: ${manualResult}`);
        } catch (notifyErr) {
          console.log(`[ERROR] Failed to send manual notification: ${(notifyErr as Error).message}`);
        }
      }
    }

        generateFinalSummary(healthAnalysis, blockingInsights, warningInsights, BLOCKING_MODE);

    if (BLOCKING_MODE) {
      if (blockingIssues.length > 0 || aiRecommendsBlock) {
        exitCode = 1;
        if (aiRecommendsBlock) {
          logger.block("Blocking deployment due to AI-detected critical issues");
        } else {
          logger.block("Blocking deployment due to critical issues");
        }
      } else if (healthScore < HEALTH_THRESHOLD) {
        exitCode = 1;
        logger.block(`Blocking deployment due to low health score (${healthScore} < ${HEALTH_THRESHOLD})`);
      } else {
        exitCode = 0;
        console.log("[OK] Deployment approved - all checks passed");
      }
    } else {
      exitCode = 0;
      console.log("ℹ️ Non-blocking mode - deployment will proceed");
    }

    const analysisSummary = {
      health_score: healthScore,
      critical_issues: blockingIssues.length,
      warning_issues: warningIssues.length,
      recommendation,
      environment: CI_ENVIRONMENT,
      namespace: NAMESPACE,
      timestamp: new Date().toISOString(),
    };

    setGithubOutput("analysis-summary", JSON.stringify(analysisSummary));
  } catch (err) {
    const e = err as Error;
    console.log(`[ERROR] Error during AI analysis: ${e.message}`);
    console.error(e.stack);

    if (e.message.includes("context_length_exceeded") && MODEL_PROVIDER === "openai") {
      console.log("🔧 OpenAI context limit exceeded - sending notification with available data...");

      const severity =
        blockingIssues.length > 0 ? "critical" : warningIssues.length > 0 ? "warning" : "info";
      recommendation =
        blockingIssues.length > 0
          ? "block"
          : warningIssues.length > 0
            ? "deploy_with_warnings"
            : "deploy";

      let message = `Analysis completed with ${blockingIssues.length} critical and ${warningIssues.length} warning issues.`;
      if (blockingIssues.length > 0) {
        message = `Blocking deployment due to ${blockingIssues.length} critical issues detected.`;
      }

      try {
        const result = await sendTelegramNotification(message, {
          severity,
          includeContext: true,
          k8sClient: k8sClients,
          healthScore,
          recommendation,
          criticalIssues: blockingIssues.length,
          warningIssues: warningIssues.length,
          aiInsights: healthAnalysis.aiInsights,
        });
        console.log(`📱 Fallback notification sent: ${result}`);
        exitCode = blockingIssues.length > 0 ? 1 : 0;
      } catch (notifyError) {
        console.log(`[ERROR] Failed to send fallback notification: ${(notifyError as Error).message}`);
        exitCode = 2;
      }
    } else {
      if (agent !== null) {
        try {
          const errorMsg = `AI Observability Agent encountered an error: ${e.message}`;
          await agent.invoke(`send_cicd_notification("${errorMsg}", "critical")`);
        } catch {
          console.log("[WARN] Could not send error notification");
        }
      }
      exitCode = 2;
    }
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});