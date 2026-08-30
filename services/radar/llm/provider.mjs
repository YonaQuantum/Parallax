import { validateEventRelation, validateSignalCandidate } from "../schemas/index.mjs";
import { parseBoolean, readEnvFromName } from "../pipeline/utils.mjs";
import { buildEnrichPrompt, enrichSystemPrompt, ENRICH_PROMPT_VERSION } from "./prompts/enrich-v1.mjs";
import {
  buildEventRelationPrompt,
  eventRelationSystemPrompt,
  EVENT_RELATION_PROMPT_VERSION
} from "./prompts/event-relation-v1.mjs";

export function createLLM(config) {
  const chat = config.models?.chat ?? {};
  const enabled = parseBoolean(process.env.RADAR_LLM_ENABLED ?? chat.enabled, false);

  if (!enabled) {
    return null;
  }

  const provider = process.env.RADAR_LLM_PROVIDER ?? chat.provider ?? "openai-compatible";
  if (provider !== "openai-compatible") {
    console.error(`[radar] unsupported llm provider: ${provider}`);
    return null;
  }

  const baseUrl = process.env.RADAR_LLM_BASE_URL ?? readEnvFromName(chat.baseUrlEnv);
  const apiKey = process.env.RADAR_LLM_API_KEY ?? readEnvFromName(chat.apiKeyEnv);
  const model = process.env.RADAR_LLM_MODEL ?? chat.model;

  if (!baseUrl || !apiKey || !model) {
    console.error("[radar] llm disabled: missing RADAR_LLM_BASE_URL, RADAR_LLM_API_KEY, or RADAR_LLM_MODEL");
    return null;
  }

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    timeoutMs: Number(process.env.RADAR_LLM_TIMEOUT_MS ?? chat.timeoutMs ?? 20_000),
    temperature: Number(process.env.RADAR_LLM_TEMPERATURE ?? chat.temperature ?? 0.2)
  };
}

export async function enrichWithLLM(llm, source, item) {
  const content = await callOpenAICompatible(llm, [
    {
      role: "system",
      content: enrichSystemPrompt
    },
    {
      role: "user",
      content: buildEnrichPrompt(source, item)
    }
  ]);
  const parsed = parseJsonObject(content);
  const result = validateSignalCandidate(parsed);

  if (!result.ok) {
    throw new Error(`invalid ${ENRICH_PROMPT_VERSION} output: ${result.error}`);
  }

  return {
    ...result.value,
    promptVersion: ENRICH_PROMPT_VERSION
  };
}

export async function compareEventsWithLLM(llm, a, b) {
  const content = await callOpenAICompatible(llm, [
    {
      role: "system",
      content: eventRelationSystemPrompt
    },
    {
      role: "user",
      content: buildEventRelationPrompt(a, b)
    }
  ]);
  const parsed = parseJsonObject(content);
  const result = validateEventRelation(parsed);

  if (!result.ok) {
    throw new Error(`invalid ${EVENT_RELATION_PROMPT_VERSION} output: ${result.error}`);
  }

  return {
    ...result.value,
    promptVersion: EVENT_RELATION_PROMPT_VERSION
  };
}

export async function callOpenAICompatible(llm, messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), llm.timeoutMs);

  try {
    const response = await fetch(chatCompletionsUrl(llm.baseUrl), {
      method: "POST",
      headers: {
        "authorization": `Bearer ${llm.apiKey}`,
        "content-type": "application/json",
        "user-agent": "Parallax-Radar/0.1 (+self-hosted research community)"
      },
      body: JSON.stringify({
        model: llm.model,
        temperature: llm.temperature,
        response_format: { type: "json_object" },
        messages
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`llm ${response.status}: ${await response.text()}`);
    }

    const json = await response.json();
    return json.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

export function chatCompletionsUrl(baseUrl) {
  const trimmed = baseUrl.replace(/\/$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

export function parseJsonObject(content) {
  const cleaned = String(content ?? "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}
