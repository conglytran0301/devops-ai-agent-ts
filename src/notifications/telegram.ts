import {
  TELEGRAM_ENABLED, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
  CI_PIPELINE_ID, CI_ENVIRONMENT, NAMESPACE, CI_COMMIT_SHA,
  MODEL_PROVIDER, CLAUDE_MODEL_ID, OPENAI_MODEL_ID, BEDROCK_MODEL_ID,
  GRAFANA_URL, SIMULATION_MODE,
} from "../config/settings.js";
import type { AiInsight } from "../analyzers/kubernetes.js";

export interface TelegramNotificationOptions {
  severity?: string;
  includeContext?: boolean;
  k8sClient?: unknown;
  healthScore?: number;
  recommendation?: string;
  criticalIssues?: number;
  warningIssues?: number;
  aiInsights?: AiInsight[];
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function formatUtcTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ") + " UTC";
}

export async function sendTelegramNotification(
  message: string,
  options: TelegramNotificationOptions = {}
): Promise<string> {
  const {
    severity = "info",
    includeContext = true,
    k8sClient = null,
    healthScore,
    recommendation,
    criticalIssues,
    warningIssues,
    aiInsights,
  } = options;

  if (!TELEGRAM_ENABLED) {
    return "❌ Telegram notifications not configured";
  }

  try {
    const emojiMap: Record<string, string> = {
      critical: "🚨",
      warning: "⚠️",
      info: "ℹ️",
      success: "✅",
      deployment: "🚀",
      rollback: "🔄",
      blocked: "🛑",
    };

    const sev = severity.toLowerCase();
    const emoji = emojiMap[sev] ?? "🔔";

    let notification: string;
    if (sev === "critical") {
      notification = `${emoji} *CRITICAL: Deployment Blocked*\n\n`;
    } else if (sev === "warning") {
      notification = `${emoji} *WARNING: Issues Detected*\n\n`;
    } else if (sev === "success") {
      notification = `${emoji} *SUCCESS: Deployment Approved*\n\n`;
    } else {
      notification = `${emoji} *AI Observability Alert*\n\n`;
    }

    if (includeContext) {
      notification += "━━━━━━━━━━━━━\n";
      notification += `📋 *Pipeline:* \`${CI_PIPELINE_ID}\`\n`;
      notification += `🌍 *Environment:* \`${CI_ENVIRONMENT}\`\n`;
      notification += `📦 *Namespace:* \`${NAMESPACE}\`\n`;
      notification += `🔖 *Commit:* \`${CI_COMMIT_SHA ? CI_COMMIT_SHA.slice(0, 8) : "unknown"}\`\n`;
      notification += "━━━━━━━━━━━━━━\n\n";

      if (healthScore !== undefined || recommendation) {
        notification += "📊 *Status Overview*\n";

        if (healthScore !== undefined) {
          const healthEmoji =
            healthScore >= 90 ? "🟢" : healthScore >= 75 ? "🟡" : healthScore >= 60 ? "🟠" : "🔴";
          const healthStatus =
            healthScore >= 90 ? "Excellent" : healthScore >= 75 ? "Good" : healthScore >= 60 ? "Degraded" : "Critical";
          notification += `${healthEmoji} *Health:* \`${healthScore}/100\` (${healthStatus})\n`;
        }

        if (recommendation) {
          const recEmoji = recommendation === "deploy" ? "✅" : recommendation === "deploy_with_warnings" ? "⚠️" : "🛑";
          const recText = recommendation.replace(/_/g, " ").toUpperCase();
          notification += `${recEmoji} *Decision:* \`${recText}\`\n`;
        }

        notification += "\n";
      }

      let aiInfo: string;
      if (SIMULATION_MODE) {
        aiInfo = "🎭 SIMULATION";
      } else if (MODEL_PROVIDER === "openai") {
        if (OPENAI_MODEL_ID.includes("gpt-4-turbo")) aiInfo = "GPT-4 Turbo";
        else if (OPENAI_MODEL_ID.includes("gpt-4")) aiInfo = "GPT-4";
        else if (OPENAI_MODEL_ID.includes("gpt-3.5")) aiInfo = "GPT-3.5 Turbo";
        else aiInfo = titleCase(OPENAI_MODEL_ID.replace("gpt-", "GPT-").replace(/-/g, " "));
      } else if (MODEL_PROVIDER === "claude") {
        if (CLAUDE_MODEL_ID.includes("claude-3-5-sonnet")) aiInfo = "Claude 3.5 Sonnet";
        else if (CLAUDE_MODEL_ID.includes("claude-3-opus")) aiInfo = "Claude 3 Opus";
        else if (CLAUDE_MODEL_ID.includes("claude-3-haiku")) aiInfo = "Claude 3 Haiku";
        else aiInfo = titleCase(CLAUDE_MODEL_ID.replace("claude-", "Claude ").replace(/-/g, " "));
      } else if (MODEL_PROVIDER === "bedrock") {
        if (BEDROCK_MODEL_ID.includes("nova-pro")) aiInfo = "Nova Pro v1.0";
        else if (BEDROCK_MODEL_ID.includes("nova-lite")) aiInfo = "Nova Lite v1.0";
        else if (BEDROCK_MODEL_ID.includes("nova-micro")) aiInfo = "Nova Micro v1.0";
        else aiInfo = titleCase(BEDROCK_MODEL_ID.replace("amazon.", "").replace(":", " v"));
      } else {
        aiInfo = `🤖 ${MODEL_PROVIDER.toUpperCase()}`;
      }

      const analysisMethod = k8sClient ? "🚀 K8s API" : "⚡ kubectl";

      let providerInfo: string;
      if (MODEL_PROVIDER === "openai") providerInfo = "🤖 OpenAI";
      else if (MODEL_PROVIDER === "claude") providerInfo = "🧠 Anthropic Claude";
      else if (MODEL_PROVIDER === "bedrock") providerInfo = "☁️ AWS Bedrock";
      else providerInfo = `🤖 ${MODEL_PROVIDER.toUpperCase()}`;

      notification += `🤖 *AI Provider:* \`${providerInfo}\`\n`;
      notification += `🧠 *Model:* \`${aiInfo}\`\n`;
      notification += `📡 *Method:* \`${analysisMethod}\`\n`;
      notification += `🕐 *Time:* \`${formatUtcTimestamp(new Date())}\`\n\n`;
    }

    notification += "━━━━━━━━━━━━━\n";

    if ((sev === "critical" || sev === "warning") && (criticalIssues || warningIssues || aiInsights)) {
      if (criticalIssues && criticalIssues > 0) {
        notification += `🚨 *Critical Issues (${criticalIssues}):*\n`;
        if (aiInsights) {
          const allInsights = [...aiInsights]
            .sort((a, b) => {
              const aKey = (a.blocking ? 1 : 0) + (a.impact === "critical" ? 1 : 0);
              const bKey = (b.blocking ? 1 : 0) + (b.impact === "critical" ? 1 : 0);
              return bKey - aKey;
            })
            .slice(0, 3);
          for (const insight of allInsights) {
            const issueType = titleCase((insight.type ?? "unknown").replace(/_/g, " "));
            let issueMsg = insight.message ?? "No details";
            if (issueMsg.length > 80) issueMsg = issueMsg.slice(0, 77) + "...";
            notification += `• ${issueType}: ${issueMsg}\n`;
          }
        } else {
          notification += "• System instability detected\n";
        }
        notification += "\n";
      }

      if (warningIssues && warningIssues > 0) {
        notification += `⚠️ *Warnings (${warningIssues}):*\n`;
        if (aiInsights) {
          const warningInsights = aiInsights
            .filter((i) => (i.impact === "medium" || i.impact === "high") && !i.blocking)
            .slice(0, 2);
          for (const insight of warningInsights) {
            let issueMsg = insight.message ?? "No details";
            if (issueMsg.length > 60) issueMsg = issueMsg.slice(0, 57) + "...";
            notification += `• ${issueMsg}\n`;
          }
        } else {
          notification += "• System warnings detected\n";
        }
        notification += "\n";
      }
    }

    notification += `📝 *Analysis*\n${message}\n\n`;

    if (sev === "critical" && aiInsights) {
      notification += "🤖 *AI Recommendations:*\n";
      if (aiInsights.some((i) => (i.message ?? "").includes("CrashLoopBackOff"))) {
        notification += "• Check logs: `kubectl logs <pod> --previous`\n";
        notification += "• Verify resource limits (current: 4Mi memory)\n";
      }
      if (aiInsights.some((i) => (i.message ?? "").includes("restarts"))) {
        notification += "• Investigate OOMKilled events\n";
        notification += "• Review probe configurations\n";
      }
      notification += "• Consider rollback or resource increase\n\n";
    }

    notification += "━━━━━━━━━━━━━━\n\n";

    notification += "⚡ *Quick Actions:*\n";
    if (GRAFANA_URL) {
      notification += `• [📊 View Grafana Dashboard](${GRAFANA_URL})\n`;
    }

    if (sev === "critical" || sev === "warning") {
      notification += `• \`kubectl get pods -n ${NAMESPACE} -o wide\`\n`;
      notification += `• \`kubectl describe pods -n ${NAMESPACE}\`\n`;
      notification += `• \`kubectl logs -n ${NAMESPACE} --tail=50 -l app=nginx-demo\`\n`;
      notification += `• \`kubectl get events -n ${NAMESPACE} --sort-by='.lastTimestamp'\`\n`;
      if (criticalIssues && criticalIssues > 0) {
        notification += `• \`kubectl top pods -n ${NAMESPACE}\``;
      }
    } else {
      notification += `• \`kubectl get pods -n ${NAMESPACE}\`\n`;
      notification += `• \`kubectl get svc -n ${NAMESPACE}\``;
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: notification,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status} ${response.statusText}`);
    }

    return `✅ CI/CD notification sent successfully (severity: ${severity})`;
  } catch (error) {
    return `❌ Failed to send notification: ${(error as Error).message}`;
  }
}