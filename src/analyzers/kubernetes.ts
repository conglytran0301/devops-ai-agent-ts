import { AppsV1Api, CoreV1Api, KubeConfig, V1ContainerStatus, V1Pod } from "@kubernetes/client-node";
import { NAMESPACE } from "../config/settings.js";
import { getLogger } from "../utils/logger.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const logger = getLogger();

export interface K8sClients {
  coreV1: CoreV1Api;
  appsV1: AppsV1Api;
}

export interface PodHealth {
  phase: string;
  ready: boolean;
  restarts: number;
  age: number;
  aiRiskScore: number;
  containerIssues: string[];
  nodeName?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface AiInsight {
  type: string;
  message: string;
  confidence: number;
  impact: string;
  blocking?: boolean;
  node?: string;
}

export interface HealthAnalysis {
  pods: Record<string, PodHealth>;
  aiInsights: AiInsight[];
  healthScore: number;
  error?: string;
  recentEvents?: Record<string, unknown>[];
  deployments?: Record<
    string,
    { replicas: number; readyReplicas: number; availableReplicas: number; updatedReplicas: number }
  >;
}

/** Khởi tạo Kubernetes client (thay initialize_kubernetes_client trong Python) */
export async function initializeKubernetesClient(): Promise<K8sClients | null> {
  try {
    const kc = new KubeConfig();
    try {
      kc.loadFromCluster();
      logger.info("Using in-cluster configuration");
    } catch {
      try {
        kc.loadFromDefault();
        logger.info("Using kubeconfig file");
      } catch {
        logger.error("Kubernetes: No valid configuration found");
        return null;
      }
    }

    const coreV1 = kc.makeApiClient(CoreV1Api);
    const appsV1 = kc.makeApiClient(AppsV1Api);

    await coreV1.listNamespace({ limit: 1 });
    logger.info("API connection successful");
    return { coreV1, appsV1 };
  } catch (error) {
    logger.error("Kubernetes: Client initialization failed", error as Error);
    return null;
  }
}

/** Công thức risk score — GIỮ NGUYÊN TUYỆT ĐỐI, không đổi số */
export function calculateAiRiskScore(
  phase: string | undefined,
  containerStatuses: V1ContainerStatus[] | undefined,
  restarts: number
): number {
  let riskScore = 0;
  riskScore += Math.min(restarts * 20, 60);

  if ((phase ?? "Unknown") !== "Running") {
    riskScore += 40;
  }

  if (containerStatuses) {
    for (const container of containerStatuses) {
      if (!container.ready) {
        riskScore += 20;
      }
      if (container.state?.waiting) {
        const reason = container.state.waiting.reason ?? "";
        if (reason === "CrashLoopBackOff" || reason === "ImagePullBackOff") {
          riskScore += 30;
        }
      }
    }
  }

  return Math.min(riskScore, 100);
}

function calculatePodAge(creationTimestamp?: Date): number {
  if (!creationTimestamp) return 0;
  const ageMs = Date.now() - new Date(creationTimestamp).getTime();
  return Math.floor(ageMs / 60000);
}

/** Phân tích toàn bộ pod list + tính health_score tổng — thay analyze_with_k8s_client */
export async function analyzeWithK8sClient(
  clients: K8sClients,
  analysis: HealthAnalysis
): Promise<HealthAnalysis> {
  try {
    const podsResponse = await clients.coreV1.listNamespacedPod({ namespace: NAMESPACE });
    const pods: V1Pod[] = podsResponse.items;

    const totalPods = pods.length;
    let readyPods = 0;

    logger.info(`Found ${totalPods} pods in namespace '${NAMESPACE}'`);

    for (const pod of pods) {
      const podName = pod.metadata?.name ?? "unknown";
      const podStatus = pod.status ?? {};

      let ready = false;
      for (const condition of podStatus.conditions ?? []) {
        if (condition.type === "Ready" && condition.status === "True") {
          ready = true;
          break;
        }
      }

      const restarts = (podStatus.containerStatuses ?? []).reduce(
        (sum, c) => sum + (c.restartCount ?? 0),
        0
      );

      const containerIssues: string[] = [];
      for (const container of podStatus.containerStatuses ?? []) {
        if (container.state?.waiting) {
          const reason = container.state.waiting.reason ?? "Unknown";
          const message = container.state.waiting.message ?? "";
          containerIssues.push(`${reason}: ${message}`);
        }
      }

      const podHealth: PodHealth = {
        phase: podStatus.phase ?? "Unknown",
        ready,
        restarts,
        age: calculatePodAge(pod.metadata?.creationTimestamp),
        aiRiskScore: calculateAiRiskScore(podStatus.phase, podStatus.containerStatuses, restarts),
        containerIssues,
        nodeName: pod.spec?.nodeName,
        labels: pod.metadata?.labels ?? {},
        annotations: pod.metadata?.annotations ?? {},
      };

      analysis.pods[podName] = podHealth;
      if (ready) readyPods += 1;

      if (restarts > 0) {
        analysis.aiInsights.push({
          type: "stability_concern",
          message: `Pod ${podName} has ${restarts} restarts - investigating crash patterns`,
          confidence: 0.9,
          impact: restarts < 5 ? "medium" : "high",
          blocking: restarts > 5,
          node: pod.spec?.nodeName,
        });
      }

      if (!ready && containerIssues.length > 0) {
        for (const issue of containerIssues) {
          analysis.aiInsights.push({
            type: "container_failure",
            message: `Pod ${podName}: ${issue}`,
            confidence: 0.95,
            impact: "critical",
            blocking: true,
            node: pod.spec?.nodeName,
          });
        }
      }
    }

    if (totalPods > 0) {
      const baseScore = (readyPods / totalPods) * 100;
      const podValues = Object.values(analysis.pods);
      const riskPenalty =
        podValues.length > 0
          ? podValues.reduce((sum, p) => sum + p.aiRiskScore, 0) / podValues.length
          : 0;
      analysis.healthScore = Math.max(0, baseScore - riskPenalty * 0.3);
    }

    await getK8sEvents(clients.coreV1, analysis);
    await getK8sDeployments(clients.appsV1, analysis);

    logger.info(`Health analysis complete: ${readyPods}/${totalPods} pods ready`);
  } catch (error) {
    analysis.error = `Kubernetes client error: ${(error as Error).message}`;
    analysis.aiInsights.push({
      type: "client_error",
      message: `Kubernetes client failed: ${(error as Error).message}`,
      confidence: 1.0,
      impact: "high",
    });
  }

  return analysis;
}

async function getK8sEvents(coreV1: CoreV1Api, analysis: HealthAnalysis): Promise<void> {
  try {
    const eventsResponse = await coreV1.listNamespacedEvent({ namespace: NAMESPACE });
    const cutoffTime = new Date(Date.now() - 5 * 60000);
    const recentEvents = [];

    for (const event of eventsResponse.items) {
      if (event.lastTimestamp && new Date(event.lastTimestamp) > cutoffTime) {
        recentEvents.push({
          time: new Date(event.lastTimestamp).toISOString(),
          type: event.type,
          reason: event.reason,
          message: event.message,
          object: event.involvedObject?.name,
        });
      }
    }

    if (recentEvents.length > 0) {
      analysis.recentEvents = recentEvents;
      analysis.aiInsights.push({
        type: "event_analysis",
        message: `Found ${recentEvents.length} recent events in namespace`,
        confidence: 0.8,
        impact: "info",
      });
    }
  } catch (error) {
    logger.warn("Could not fetch events", error as Error);
  }
}

async function getK8sDeployments(appsV1: AppsV1Api, analysis: HealthAnalysis): Promise<void> {
  try {
    const deploymentsResponse = await appsV1.listNamespacedDeployment({ namespace: NAMESPACE });

    analysis.deployments = {};
    for (const deployment of deploymentsResponse.items) {
      const name = deployment.metadata?.name ?? "unknown";
      const status = deployment.status ?? {};
      analysis.deployments[name] = {
        replicas: status.replicas ?? 0,
        readyReplicas: status.readyReplicas ?? 0,
        availableReplicas: status.availableReplicas ?? 0,
        updatedReplicas: status.updatedReplicas ?? 0,
      };
    }
  } catch (error) {
    logger.warn("Could not fetch deployments", error as Error);
  }
}

const execFileAsync = promisify(execFile);

export async function analyzeWithKubectl(analysis: HealthAnalysis): Promise<HealthAnalysis> {
  try {
    const { stdout } = await execFileAsync(
      "kubectl",
      ["get", "pods", "-n", NAMESPACE, "-o", "json"],
      { timeout: 10000 }
    );

    const podsData = JSON.parse(stdout);
    const items: any[] = podsData.items ?? [];
    const totalPods = items.length;
    let readyPods = 0;

    logger.info(`Found ${totalPods} pods in namespace '${NAMESPACE}' (using kubectl)`);

    for (const pod of items) {
      const podName = pod.metadata?.name ?? "unknown";
      const podStatus = pod.status ?? {};

      let ready = false;
      for (const condition of podStatus.conditions ?? []) {
        if (condition.type === "Ready" && condition.status === "True") {
          ready = true;
          break;
        }
      }

      const containerStatuses = podStatus.containerStatuses ?? [];
      const restarts = containerStatuses.reduce(
        (sum: number, c: any) => sum + (c.restartCount ?? 0),
        0
      );

      const containerIssues: string[] = [];
      for (const container of containerStatuses) {
        const state = container.state ?? {};
        if (state.waiting) {
          containerIssues.push(`${state.waiting.reason ?? "Unknown"}: ${state.waiting.message ?? ""}`);
        }
      }

      const podHealth: PodHealth = {
        phase: podStatus.phase ?? "Unknown",
        ready,
        restarts,
        age: calculatePodAge(
          pod.metadata?.creationTimestamp ? new Date(pod.metadata.creationTimestamp) : undefined
        ),
        aiRiskScore: calculateAiRiskScore(podStatus.phase, containerStatuses, restarts),
        containerIssues,
        labels: {},
        annotations: {},
      };

      analysis.pods[podName] = podHealth;
      if (ready) readyPods += 1;

      if (restarts > 0) {
        analysis.aiInsights.push({
          type: "stability_concern",
          message: `Pod ${podName} has ${restarts} restarts - investigating crash patterns`,
          confidence: 0.9,
          impact: restarts < 5 ? "medium" : "high",
          blocking: restarts > 5,
        });
      }

      if (!ready && containerIssues.length > 0) {
        for (const issue of containerIssues) {
          analysis.aiInsights.push({
            type: "container_failure",
            message: `Pod ${podName}: ${issue}`,
            confidence: 0.95,
            impact: "critical",
            blocking: true,
          });
        }
      }
    }

    if (totalPods > 0) {
      const baseScore = (readyPods / totalPods) * 100;
      const podValues = Object.values(analysis.pods);
      const riskPenalty =
        podValues.length > 0
          ? podValues.reduce((sum, p) => sum + p.aiRiskScore, 0) / podValues.length
          : 0;
      analysis.healthScore = Math.max(0, baseScore - riskPenalty * 0.3);
    }
  } catch (error) {
    analysis.error = `kubectl error: ${(error as Error).message}`;
  }

  return analysis;
}