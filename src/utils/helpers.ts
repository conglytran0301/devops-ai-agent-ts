import { appendFileSync } from "node:fs";
import { HEALTH_THRESHOLD } from "../config/settings.js";
import { getLogger } from "./logger.js";
import type { PodHealth, AiInsight, HealthAnalysis } from "../analyzers/kubernetes.js";

const logger = getLogger();

/** Format pod data into a human-readable summary for AI analysis. */
export function formatPodsForAi(pods: Record<string, PodHealth>): string {
  const podNames = Object.keys(pods);

  if (podNames.length === 0) {
    return "No pods found";
  }

  const formatted: string[] = [];

  for (const [podName, podInfo] of Object.entries(pods)) {
    const status = podInfo.ready ? "✅ Ready" : "❌ Not Ready";
    const restarts = podInfo.restarts ?? 0;
    const phase = podInfo.phase ?? "Unknown";
    const issues = podInfo.containerIssues ?? [];

    let podSummary = `  ${podName}: ${status}, Phase: ${phase}, Restarts: ${restarts}`;
    if (issues.length > 0) {
      podSummary += `, Issues: ${issues.join(", ")}`;
    }

    formatted.push(podSummary);
  }

  return formatted.join("\n");
}

/** Format AI insights into a human-readable summary. */
export function formatInsightsForAi(insights: AiInsight[]): string {
  if (!insights || insights.length === 0) {
    return "No specific insights detected";
  }

  const formatted = insights.map((insight) => {
    const severity = (insight.impact ?? "unknown").toUpperCase();
    const message = insight.message ?? "";
    const confidence = insight.confidence ?? 0;

    return `  - [${severity}] ${message} (confidence: ${confidence.toFixed(1)})`;
  });

  return formatted.join("\n");
}

/** Set a GitHub Actions output, falling back to console output for local testing. */
export function setGithubOutput(name: string, value: string): void {
  const githubOutput = process.env.GITHUB_OUTPUT;

  if (githubOutput) {
    appendFileSync(githubOutput, `${name}=${value}\n`);
  } else {
    process.stdout.write(`Output: ${name}=${value}\n`);
  }
}

/** Generate the final analysis summary and deployment decision. */
export function generateFinalSummary(
  healthAnalysis: HealthAnalysis,
  blockingIssues: AiInsight[],
  warningIssues: AiInsight[],
  blockingMode: boolean
): void {
  logger.separator("=", 80);
  logger.section("AI-DRIVEN OBSERVABILITY ANALYSIS COMPLETE");

  const healthScore = healthAnalysis.healthScore ?? 0;
  const criticalIssuesCount = blockingIssues.length;
  const pods = healthAnalysis.pods ?? {};
  const totalPods = Object.keys(pods).length;
  const readyPods = Object.values(pods).filter((pod) => pod.ready).length;

  logger.analysis(`Final Health Score: ${healthScore}/100`);
  logger.analysis(`Critical Issues: ${criticalIssuesCount}`);
  logger.analysis(`Warning Issues: ${warningIssues.length}`);
  logger.config(`Blocking Mode: ${blockingMode ? "Enabled" : "Disabled"}`);

  if (totalPods > 0) {
    logger.k8s(`Pod Status: ${readyPods}/${totalPods} ready`);
  }

  if (blockingMode) {
    if (criticalIssuesCount > 0) {
      logger.block("DEPLOYMENT BLOCKED - Critical issues detected");
      logger.info("Resolve critical issues before proceeding");
    } else if (healthScore < HEALTH_THRESHOLD) {
      logger.block(
        `DEPLOYMENT BLOCKED - Health score (${healthScore}) below threshold (${HEALTH_THRESHOLD})`
      );
      logger.info("Improve system health before deployment");
    } else {
      logger.ok("DEPLOYMENT APPROVED - System meets health requirements");
      logger.ok("Safe to proceed with deployment");
      if (warningIssues.length > 0) {
        logger.warn(`Monitor these warnings: ${warningIssues.length} issues detected`);
      }
    }
  } else {
    logger.info("NON-BLOCKING MODE - Deployment will proceed regardless");
    if (criticalIssuesCount > 0 || healthScore < HEALTH_THRESHOLD) {
      logger.warn("Issues detected but not blocking deployment");
    }
  }

  logger.subsection("AI-Powered Insights");
  logger.listItem("Intelligent failure analysis and root cause detection");
  logger.listItem("Predictive recommendations for proactive maintenance");
  logger.listItem("Multi-provider AI model support (Bedrock, Claude, OpenAI)");
  logger.listItem("Seamless GitHub Actions integration");

  logger.separator("=", 80);
}