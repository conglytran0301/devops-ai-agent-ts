import { BedrockModel } from "@strands-agents/sdk/models/bedrock";
// Anthropic/OpenAI: SDK ghi là "optional dependencies" - kiểm tra đường dẫn import
// thật trong node_modules/@strands-agents/sdk/dist/ trước khi chạy, có thể là
// subpath riêng (ví dụ '@strands-agents/sdk/anthropic') tùy bản cài của bạn.
import { AnthropicModel } from "@strands-agents/sdk/models/anthropic";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";

import {
  MODEL_PROVIDER, SIMULATION_MODE,
  BEDROCK_MODEL_ID, BEDROCK_REGION,
  CLAUDE_API_KEY, CLAUDE_MODEL_ID,
  OPENAI_API_KEY, OPENAI_MODEL_ID,
} from "../config/settings.js";
import { getLogger } from "../utils/logger.js";

const logger = getLogger();

/**
 * Khởi tạo AI model theo provider đã cấu hình.
 * Trả về null nếu simulation mode hoặc nếu khởi tạo lỗi (tự fallback simulation).
 */
export function initializeAiModel(): BedrockModel | AnthropicModel | OpenAIModel | null {
  if (SIMULATION_MODE) {
    logger.info("Simulation mode enabled - AI model will be mocked");
    return null;
  }

  function createAnthropicModel() {
    return new AnthropicModel({
        apiKey: CLAUDE_API_KEY,
        modelId: CLAUDE_MODEL_ID,
        maxTokens: 4096,
        params: { temperature: 0.1 },
    });
    }

    function createOpenAIModel() {
    return new OpenAIModel({
        apiKey: OPENAI_API_KEY,
        modelId: OPENAI_MODEL_ID,
        maxTokens: 2048,
        temperature: 0.1,
    });
    }

    function createBedrockModel() {
    return new BedrockModel({
        region: BEDROCK_REGION,
        modelId: BEDROCK_MODEL_ID,
        maxTokens: 4096,
        temperature: 0.1,
    });
    }

    try {
    switch (MODEL_PROVIDER) {
      case "bedrock":
        return createBedrockModel();
      case "claude":
        return createAnthropicModel();
      case "openai":
        return createOpenAIModel();
      default:
        throw new Error(`Unsupported model provider: ${MODEL_PROVIDER}`);
    }
  } catch (error) {
    logger.warn(`Failed to initialize ${MODEL_PROVIDER} model`, error as Error);
    logger.info("Falling back to simulation mode");
    process.env.AI_OBSERVABILITY_SIMULATION = "true";
    return null;
  }
}