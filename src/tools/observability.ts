import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { sendTelegramNotification } from "../notifications/telegram.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger();

export const sendCicdNotification = tool({
  name: "send_cicd_notification",
  description: "Send notification to Telegram with analysis results.",
  inputSchema: z.object({
    health_score: z.number().describe("System health score (0-100)"),
    recommendation: z.string().describe("deploy, block, or deploy_with_warnings"),
    critical_issues: z.number().describe("Number of critical issues"),
    warning_issues: z.number().describe("Number of warnings"),
    ai_insights: z.string().describe("AI analysis summary"),
  }),
  callback: async (input) => {
    const { health_score, recommendation, critical_issues, warning_issues, ai_insights } = input;

    try {
      const severity =
        recommendation === "deploy"
          ? "info"
          : recommendation === "deploy_with_warnings"
            ? "warning"
            : "critical";

      await sendTelegramNotification(ai_insights, {
        severity,
        includeContext: true,
        k8sClient: null,
        healthScore: health_score,
        recommendation,
      });

      logger.info(`CI/CD notification sent: ${recommendation}`);

      return {
        status: "success",
        message: "Notification sent successfully",
        health_score,
        recommendation,
        critical_issues,
        warning_issues,
      };
    } catch (error) {
      logger.error("Failed to send CI/CD notification", error as Error);
      return {
        status: "error",
        message: `Failed to send notification: ${(error as Error).message}`,
      };
    }
  },
});

// correlate_events_and_metrics
export const correlateEventsAndMetrics = tool({
  name: "correlate_events_and_metrics",
  description: "Correlate Kubernetes events with metrics to find patterns.",
  inputSchema: z.object({
    events: z.array(z.record(z.string(), z.unknown())).describe(
      "List of Kubernetes events with fields such as type, reason, and message"
    ),
    metrics: z.record(z.string(), z.unknown()).describe(
      "System metrics, including optional cpu_usage and memory_usage"
    ),
    time_window_minutes: z.number().default(5).describe(
      "Time window for correlation analysis, in minutes"
    ),
  }),
  callback: async ({ events, metrics, time_window_minutes }) => {
    logger.info("Correlating events and metrics");

    const correlations_found: Array<Record<string, unknown>> = [];
    const anomalies: Array<Record<string, unknown>> = [];
    const causal_chains: Array<Record<string, unknown>> = [];
    const confidence_scores: Record<string, number> = {};

    try {
      const warning_events = events.filter((event) => event.type === "Warning");
      const error_events = events.filter((event) =>
        String(event.reason ?? "").includes("Error")
      );

      const cpuUsage =
        typeof metrics.cpu_usage === "number" ? metrics.cpu_usage : 0;

      if (cpuUsage > 80) {
        const cpu_events = warning_events.filter((event) => {
          const text = JSON.stringify(event);
          return text.includes("CPU") || text.toLowerCase().includes("throttl");
        });

        if (cpu_events.length > 0) {
          correlations_found.push({
            type: "resource_correlation",
            metric: "cpu_usage",
            value: cpuUsage,
            events: cpu_events,
            description: `High CPU usage (${cpuUsage}%) correlated with ${cpu_events.length} events`,
          });
          confidence_scores.cpu_correlation = 0.85;
        }
      }

      const memoryUsage =
        typeof metrics.memory_usage === "number" ? metrics.memory_usage : 0;

      if (memoryUsage > 80) {
        const memory_events = warning_events.filter((event) => {
          const text = JSON.stringify(event).toLowerCase();
          return text.includes("memory") || text.includes("oom");
        });

        if (memory_events.length > 0) {
          correlations_found.push({
            type: "resource_correlation",
            metric: "memory_usage",
            value: memoryUsage,
            events: memory_events,
            description: `High memory usage (${memoryUsage}%) correlated with ${memory_events.length} events`,
          });
          confidence_scores.memory_correlation = 0.85;
        }
      }

      const restart_events = events.filter((event) => {
        const text = JSON.stringify(event).toLowerCase();
        return text.includes("restart") || text.includes("backoff");
      });

      if (restart_events.length > 3) {
        anomalies.push({
          type: "restart_pattern",
          count: restart_events.length,
          severity: restart_events.length > 5 ? "high" : "medium",
          description: `Detected ${restart_events.length} restart-related events in ${time_window_minutes} minutes`,
        });

        if (memoryUsage > 90) {
          causal_chains.push({
            cause: "High memory usage",
            effect: "Pod restarts",
            evidence: `Memory at ${memoryUsage}% with ${restart_events.length} restarts`,
            confidence: 0.75,
          });
        }
      }

      const image_events = error_events.filter((event) => {
        const text = JSON.stringify(event).toLowerCase();
        return text.includes("image") || text.includes("pull");
      });

      if (image_events.length > 0) {
        anomalies.push({
          type: "image_pull_failure",
          count: image_events.length,
          severity: "critical",
          description: `Detected ${image_events.length} image pull failures`,
        });
      }

      const summary =
        `Found ${correlations_found.length} correlations, ` +
        `${anomalies.length} anomalies, and ${causal_chains.length} causal chains`;

      logger.info(summary);

      return {
        timestamp: new Date().toISOString(),
        time_window_minutes,
        correlations_found,
        anomalies,
        causal_chains,
        confidence_scores,
        summary,
        total_events_analyzed: events.length,
        warning_events: warning_events.length,
        error_events: error_events.length,
      };
    } catch (error) {
      logger.error("Failed to correlate events and metrics", error as Error);

      return {
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        correlations_found: [],
        anomalies: [],
        causal_chains: [],
        confidence_scores: {},
      };
    }
  },
});

// predict_system_behavior
export const predictSystemBehavior = tool({
  name: "predict_system_behavior",
  description:
    "Predict future system behavior from historical metrics, identify trends, and provide early warnings.",
  inputSchema: z.object({
    metrics_history: z
      .record(z.string(), z.array(z.number()))
      .describe(
        'Metric names mapped to historical values, e.g. {"cpu_usage": [45, 50, 55]}'
      ),
    prediction_window_minutes: z
      .number()
      .default(60)
      .describe("How far ahead to predict, in minutes"),
  }),
  callback: async ({ metrics_history, prediction_window_minutes }) => {
    logger.info(
      `Predicting system behavior for next ${prediction_window_minutes} minutes`
    );

    const predictions: Array<Record<string, string | number>> = [];
    const trends: Record<string, string> = {};
    const warnings: Array<Record<string, string | number>> = [];
    const recommended_actions: string[] = [];

    try {
      for (const [metric_name, values] of Object.entries(metrics_history)) {
        if (values.length < 2) {
          continue;
        }

        const recent_values = values.length >= 5 ? values.slice(-5) : values;

        // Giữ nguyên Python: chia cho số phần tử, KHÔNG phải (length - 1).
        const avg_change =
          (recent_values[recent_values.length - 1] - recent_values[0]) /
          recent_values.length;

        let trend: "increasing" | "decreasing" | "stable";
        if (avg_change > 2) {
          trend = "increasing";
        } else if (avg_change < -2) {
          trend = "decreasing";
        } else {
          trend = "stable";
        }

        trends[metric_name] = trend;

        const current_value = values[values.length - 1];
        const predicted_value =
          current_value + avg_change * (prediction_window_minutes / 5);

        const rounded_predicted_value = Number(predicted_value.toFixed(2));
        const rounded_avg_change = Number(avg_change.toFixed(2));
        const confidence = values.length >= 5 ? 0.7 : 0.5;

        predictions.push({
          metric: metric_name,
          current_value,
          predicted_value: rounded_predicted_value,
          trend,
          change_rate: rounded_avg_change,
          confidence,
        });

        const metric_lower = metric_name.toLowerCase();

        if (metric_lower.includes("cpu")) {
          if (predicted_value > 90) {
            warnings.push({
              metric: metric_name,
              severity: "critical",
              message: `CPU usage predicted to reach ${predicted_value.toFixed(1)}% in ${prediction_window_minutes} minutes`,
              threshold_exceeded: 90,
            });
            recommended_actions.push(
              `Scale up resources or optimize CPU usage for ${metric_name}`
            );
          } else if (predicted_value > 80) {
            warnings.push({
              metric: metric_name,
              severity: "warning",
              message: `CPU usage predicted to reach ${predicted_value.toFixed(1)}% in ${prediction_window_minutes} minutes`,
              threshold_exceeded: 80,
            });
          }
        }

        if (metric_lower.includes("memory")) {
          if (predicted_value > 90) {
            warnings.push({
              metric: metric_name,
              severity: "critical",
              message: `Memory usage predicted to reach ${predicted_value.toFixed(1)}% in ${prediction_window_minutes} minutes`,
              threshold_exceeded: 90,
            });
            recommended_actions.push(
              `Increase memory limits or investigate memory leaks for ${metric_name}`
            );
          } else if (predicted_value > 80) {
            warnings.push({
              metric: metric_name,
              severity: "warning",
              message: `Memory usage predicted to reach ${predicted_value.toFixed(1)}% in ${prediction_window_minutes} minutes`,
              threshold_exceeded: 80,
            });
          }
        }
      }

      const avg_confidence =
        predictions.length > 0
          ? predictions.reduce((sum, prediction) => sum + Number(prediction.confidence), 0) /
            predictions.length
          : 0;

      logger.info(
        `Generated ${predictions.length} predictions with ${warnings.length} warnings`
      );

      return {
        timestamp: new Date().toISOString(),
        prediction_window_minutes,
        predictions,
        trends,
        warnings,
        recommended_actions,
        confidence: Number(avg_confidence.toFixed(2)),
        metrics_analyzed: Object.keys(metrics_history).length,
      };
    } catch (error) {
      logger.error("Failed to predict system behavior", error as Error);

      return {
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
        predictions: [],
        trends: {},
        warnings: [],
        recommended_actions: [],
        confidence: 0,
      };
    }
  },
});

// explain_failure_with_context
type FailureKnowledge = {
  rootCause: string;
  commonCauses: string[];
  resolutionSteps: string[];
  prevention: string[];
  confidence: number;
};

export const explainFailureWithContext = tool({
  name: "explain_failure_with_context",
  description:
    "Provide detailed explanation of pod failures with root-cause analysis, remediation steps, and kubectl commands.",
  inputSchema: z.object({
    pod_name: z.string().describe("Name of the failed Kubernetes pod"),
    namespace: z.string().describe("Kubernetes namespace containing the pod"),
    failure_type: z
      .string()
      .describe("Failure type, such as CrashLoopBackOff, ImagePullBackOff, OOMKilled, or Pending"),
    recent_events: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe("Optional recent Kubernetes events for additional context"),
  }),
  callback: async ({ pod_name, namespace, failure_type, recent_events }) => {
    logger.info(`Explaining failure for pod ${pod_name}: ${failure_type}`);

    const failureExplanations: Record<string, FailureKnowledge> = {
      CrashLoopBackOff: {
        rootCause:
          "The container is crashing repeatedly after starting. Kubernetes is backing off restart attempts.",
        commonCauses: [
          "Application error or exception on startup",
          "Missing or incorrect configuration",
          "Failed health/readiness probes",
          "Resource constraints (CPU/Memory)",
          "Missing dependencies or environment variables",
        ],
        resolutionSteps: [
          "Check pod logs: kubectl logs {pod_name} -n {namespace}",
          "Check previous logs: kubectl logs {pod_name} -n {namespace} --previous",
          "Describe pod for events: kubectl describe pod {pod_name} -n {namespace}",
          "Verify configuration and environment variables",
          "Check resource requests and limits",
          "Review application startup code and dependencies",
        ],
        prevention: [
          "Implement proper error handling in application startup",
          "Add comprehensive health checks",
          "Test configuration in staging environment",
          "Set appropriate resource requests and limits",
          "Use init containers for dependency checks",
        ],
        confidence: 0.9,
      },

      ImagePullBackOff: {
        rootCause:
          "Kubernetes cannot pull the container image from the registry.",
        commonCauses: [
          "Image does not exist or tag is incorrect",
          "Registry authentication failure",
          "Network connectivity issues to registry",
          "Rate limiting from public registries",
          "Private registry credentials not configured",
        ],
        resolutionSteps: [
          "Verify image name and tag: kubectl describe pod {pod_name} -n {namespace}",
          "Check image pull secrets: kubectl get secrets -n {namespace}",
          "Test registry access manually: docker pull <image>",
          "Verify imagePullSecrets in pod spec",
          "Check network policies and firewall rules",
          "Review registry credentials and permissions",
        ],
        prevention: [
          "Use specific image tags instead of 'latest'",
          "Configure imagePullSecrets properly",
          "Use private registry with proper authentication",
          "Implement image scanning in CI/CD",
          "Cache images in private registry",
        ],
        confidence: 0.95,
      },

      OOMKilled: {
        rootCause:
          "The container exceeded its memory limit and was killed by the kernel.",
        commonCauses: [
          "Memory limit set too low",
          "Memory leak in application",
          "Unexpected spike in memory usage",
          "Inefficient memory management",
          "Large dataset processing without streaming",
        ],
        resolutionSteps: [
          "Check memory usage: kubectl top pod {pod_name} -n {namespace}",
          "Review memory limits: kubectl describe pod {pod_name} -n {namespace}",
          "Analyze application memory usage patterns",
          "Increase memory limits if appropriate",
          "Profile application for memory leaks",
          "Implement memory-efficient algorithms",
        ],
        prevention: [
          "Set appropriate memory requests and limits",
          "Implement memory profiling and monitoring",
          "Use streaming for large data processing",
          "Regular memory leak testing",
          "Implement circuit breakers for memory-intensive operations",
        ],
        confidence: 0.85,
      },

      Pending: {
        rootCause:
          "The pod cannot be scheduled on any node in the cluster.",
        commonCauses: [
          "Insufficient resources (CPU/Memory) on nodes",
          "Node selector or affinity rules not satisfied",
          "Taints on nodes without matching tolerations",
          "PersistentVolume not available",
          "Resource quotas exceeded",
        ],
        resolutionSteps: [
          "Check pod status: kubectl describe pod {pod_name} -n {namespace}",
          "View scheduling events and reasons",
          "Check node resources: kubectl top nodes",
          "Review node selectors and affinity rules",
          "Check PV/PVC status if using persistent storage",
          "Verify resource quotas: kubectl describe quota -n {namespace}",
        ],
        prevention: [
          "Monitor cluster capacity and scale proactively",
          "Set appropriate resource requests",
          "Use pod disruption budgets",
          "Implement cluster autoscaling",
          "Regular capacity planning",
        ],
        confidence: 0.8,
      },
    };

    const explanation: FailureKnowledge =
      failureExplanations[failure_type] ?? {
        rootCause: `Unknown failure type: ${failure_type}`,
        commonCauses: ["Failure type not recognized"],
        resolutionSteps: [
          `Check pod status: kubectl describe pod ${pod_name} -n ${namespace}`,
          `Check pod logs: kubectl logs ${pod_name} -n ${namespace}`,
        ],
        prevention: ["Investigate failure type and add to knowledge base"],
        confidence: 0.3,
      };

    const kubectlCommands = [
      `kubectl describe pod ${pod_name} -n ${namespace}`,
      `kubectl logs ${pod_name} -n ${namespace}`,
      `kubectl logs ${pod_name} -n ${namespace} --previous`,
      `kubectl get events -n ${namespace} --field-selector involvedObject.name=${pod_name}`,
      `kubectl get pod ${pod_name} -n ${namespace} -o yaml`,
    ];

    const contributingFactors = [...explanation.commonCauses];

    if (recent_events) {
      const eventMessages = recent_events
        .filter((event) => JSON.stringify(event).includes(pod_name))
        .map((event) =>
          typeof event.message === "string" ? event.message : ""
        )
        .filter(Boolean);

      if (eventMessages.length > 0) {
        contributingFactors.push(
          `Recent events: ${eventMessages.slice(0, 3).join("; ")}`
        );
      }
    }

    const resolutionSteps = explanation.resolutionSteps.map((step) =>
      step
        .replaceAll("{pod_name}", pod_name)
        .replaceAll("{namespace}", namespace)
    );

    const result = {
      timestamp: new Date().toISOString(),
      pod_name,
      namespace,
      failure_type,
      root_cause_analysis: explanation.rootCause,
      contributing_factors: contributingFactors,
      resolution_steps: resolutionSteps,
      kubectl_commands: kubectlCommands,
      prevention_measures: explanation.prevention,
      confidence_score: explanation.confidence,
      documentation_links: [
        "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/",
        "https://kubernetes.io/docs/tasks/debug-application-cluster/debug-pod-replication-controller/",
      ],
    };

    logger.info(
      `Generated failure explanation with confidence ${result.confidence_score}`
    );

    return result;
  },
});

// simulate_chaos_scenario
export const simulateChaosScenario = tool({
  name: "simulate_chaos_scenario",
  description:
    "Simulate Kubernetes system scenarios for testing and demonstration without a real cluster.",
  inputSchema: z.object({
    scenario_type: z
      .string()
      .default("healthy")
      .describe("Scenario: healthy, pressure, critical, or recovery"),
  }),
  callback: async ({ scenario_type }) => {
    logger.info(`Simulating chaos scenario: ${scenario_type}`);

    const scenarios = {
      healthy: {
        health_score: 95,
        description: "All systems operational, no issues detected",
        pods: {
          "app-1": { status: "Running", ready: true, restarts: 0 },
          "app-2": { status: "Running", ready: true, restarts: 0 },
          "app-3": { status: "Running", ready: true, restarts: 0 },
        },
        metrics: {
          cpu_usage: 45,
          memory_usage: 60,
          network_latency_ms: 25,
          error_rate: 0.1,
        },
        events: [],
        critical_issues: 0,
        warning_issues: 0,
      },

      pressure: {
        health_score: 72,
        description: "System under resource pressure, performance degrading",
        pods: {
          "app-1": { status: "Running", ready: true, restarts: 2 },
          "app-2": { status: "Running", ready: true, restarts: 1 },
          "app-3": { status: "Running", ready: false, restarts: 3 },
        },
        metrics: {
          cpu_usage: 85,
          memory_usage: 88,
          network_latency_ms: 150,
          error_rate: 2.5,
        },
        events: [
          {
            type: "Warning",
            reason: "BackOff",
            message: "Back-off restarting failed container",
          },
          {
            type: "Warning",
            reason: "FailedScheduling",
            message: "Insufficient cpu",
          },
        ],
        critical_issues: 0,
        warning_issues: 2,
      },

      critical: {
        health_score: 35,
        description: "Critical system failures, immediate action required",
        pods: {
          "app-1": { status: "CrashLoopBackOff", ready: false, restarts: 10 },
          "app-2": { status: "ImagePullBackOff", ready: false, restarts: 0 },
          "app-3": { status: "Pending", ready: false, restarts: 0 },
        },
        metrics: {
          cpu_usage: 98,
          memory_usage: 95,
          network_latency_ms: 500,
          error_rate: 15.0,
        },
        events: [
          {
            type: "Warning",
            reason: "BackOff",
            message: "Back-off restarting failed container",
          },
          {
            type: "Warning",
            reason: "Failed",
            message: "Error: ImagePullBackOff",
          },
          {
            type: "Warning",
            reason: "FailedScheduling",
            message: "0/3 nodes available",
          },
          {
            type: "Warning",
            reason: "Unhealthy",
            message: "Liveness probe failed",
          },
        ],
        critical_issues: 3,
        warning_issues: 1,
      },

      recovery: {
        health_score: 78,
        description: "System recovering from issues, trending positive",
        pods: {
          "app-1": { status: "Running", ready: true, restarts: 5 },
          "app-2": { status: "Running", ready: true, restarts: 3 },
          "app-3": { status: "Running", ready: false, restarts: 2 },
        },
        metrics: {
          cpu_usage: 65,
          memory_usage: 70,
          network_latency_ms: 80,
          error_rate: 1.2,
        },
        events: [
          {
            type: "Normal",
            reason: "Started",
            message: "Started container",
          },
          {
            type: "Warning",
            reason: "BackOff",
            message: "Back-off restarting failed container",
          },
        ],
        critical_issues: 0,
        warning_issues: 1,
      },
    };

    const scenario =
      scenarios[scenario_type as keyof typeof scenarios] ?? scenarios.healthy;

    return {
      timestamp: new Date().toISOString(),
      scenario: scenario_type,
      health_score: scenario.health_score,
      description: scenario.description,
      pods: scenario.pods,
      metrics: scenario.metrics,
      events: scenario.events,
      critical_issues: scenario.critical_issues,
      warning_issues: scenario.warning_issues,
      simulated: true,
    };
  },
});