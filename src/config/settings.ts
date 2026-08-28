import * as dotenv from "dotenv";

dotenv.config();

// ---- Core Configuration ----
export const NAMESPACE: string = process.env.NAMESPACE ?? "default";
export const APP_NAME: string = process.env.APP_NAME ?? "";
export const SAFE_ACTIONS: Set<string> = new Set(
  (process.env.SAFE_ACTIONS ?? "").split(",").filter(Boolean)
);

// ---- Model Provider Configuration ----
export const MODEL_PROVIDER: string = (process.env.MODEL_PROVIDER ?? "bedrock").toLowerCase();

// Bedrock Configuration
export const BEDROCK_MODEL_ID: string = process.env.BEDROCK_MODEL_ID ?? "amazon.nova-pro-v1:0";
export const BEDROCK_REGION: string = process.env.BEDROCK_REGION ?? "us-east-1";

// Claude Configuration
export const CLAUDE_API_KEY: string | undefined = process.env.CLAUDE_API_KEY;
export const CLAUDE_MODEL_ID: string = process.env.CLAUDE_MODEL_ID ?? "claude-3-5-sonnet-20241022";

// OpenAI Configuration
export const OPENAI_API_KEY: string | undefined = process.env.OPENAI_API_KEY;
export const OPENAI_MODEL_ID: string = process.env.OPENAI_MODEL_ID ?? "gpt-4";

// ---- Monitoring Configuration ----
export const PROM_URL: string | undefined = process.env.PROM_URL;
export const GRAFANA_URL: string | undefined = process.env.GRAFANA_URL;

// ---- Notification Configuration ----
export const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN ?? "";
export const TELEGRAM_CHAT_ID: string = process.env.TELEGRAM_CHAT_ID ?? "";
export const TELEGRAM_ENABLED: boolean = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

// ---- CI/CD Context ----
export const CI_PIPELINE_ID: string = process.env.CI_PIPELINE_ID ?? "manual-execution";
export const CI_COMMIT_SHA: string = process.env.CI_COMMIT_SHA ?? "unknown";
export const CI_ENVIRONMENT: string = process.env.CI_ENVIRONMENT ?? "development";

// ---- Behavior Configuration ----
export const SIMULATION_MODE: boolean =
  (process.env.AI_OBSERVABILITY_SIMULATION ?? "false").toLowerCase() === "true";
export const BLOCKING_MODE: boolean =
  (process.env.BLOCKING_MODE ?? "true").toLowerCase() === "true";
export const HEALTH_THRESHOLD: number = parseInt(process.env.HEALTH_THRESHOLD ?? "80", 10);
export const VALIDATION_CONTEXT: string = process.env.VALIDATION_CONTEXT ?? "pre-deployment";