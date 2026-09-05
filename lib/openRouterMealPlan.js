const { MEAL_PLAN_JSON_SCHEMA } = require("./mealPlanCore");

const DEFAULT_PRIMARY_MODEL = "z-ai/glm-5.2:free";
const DEFAULT_FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const SYSTEM_MESSAGE = "You generate valid JSON meal plans for a meal planning app. Return only JSON.";

function buildOpenRouterMealPlanRequest({ primaryModel, fallbackModel, prompt }) {
  return {
    models: orderedModels(primaryModel, fallbackModel),
    messages: [
      { role: "system", content: SYSTEM_MESSAGE },
      { role: "user", content: prompt }
    ],
    temperature: 0.55,
    max_tokens: 8192,
    reasoning: { enabled: false, exclude: true },
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "optimeal_weekly_meal_plan",
        strict: true,
        schema: MEAL_PLAN_JSON_SCHEMA
      }
    },
    plugins: [{ id: "response-healing" }],
    provider: { require_parameters: true }
  };
}

function orderedModels(primaryModel, fallbackModel) {
  const models = [primaryModel, fallbackModel]
    .map((model) => typeof model === "string" ? model.trim() : "")
    .filter(Boolean);

  return [...new Set(models)];
}

function extractOpenRouterMealPlanResult(data, primaryModel) {
  const choice = Array.isArray(data && data.choices) ? data.choices[0] : null;
  const message = choice && choice.message ? choice.message : {};
  const metadata = data && isRecord(data.openrouter_metadata)
    ? data.openrouter_metadata
    : {};
  const healingStage = findHealingStage(metadata);
  const healingData = healingStage && isRecord(healingStage.data) ? healingStage.data : {};
  const selectedEndpoint = findSelectedEndpoint(metadata);
  const selectedModel = safeString(data && data.model);
  const normalizedPrimary = safeString(primaryModel);
  const usage = data && isRecord(data.usage) ? data.usage : {};

  return {
    content: typeof message.content === "string" ? message.content : "",
    finishReason: safeString(choice && choice.finish_reason) || "unknown",
    selectedModel,
    selectedProvider: safeString(selectedEndpoint && selectedEndpoint.provider),
    routeStrategy: safeString(metadata.strategy),
    routeAttempt: numericMetric(metadata.attempt),
    fallbackUsed: Boolean(selectedModel && normalizedPrimary && selectedModel !== normalizedPrimary),
    healingApplied: Boolean(healingStage),
    healingMode: safeString(healingData.mode),
    healingImproved: booleanMetric(firstDefined(healingData, ["improved", "healed", "modified"])),
    healingOriginalChars: numericMetric(firstDefined(healingData, [
      "original_length",
      "originalLength",
      "input_length",
      "inputLength"
    ])),
    healingFinalChars: numericMetric(firstDefined(healingData, [
      "healed_length",
      "healedLength",
      "output_length",
      "outputLength",
      "final_length",
      "finalLength"
    ])),
    usage: {
      promptTokens: numericMetric(usage.prompt_tokens),
      completionTokens: numericMetric(usage.completion_tokens),
      totalTokens: numericMetric(usage.total_tokens)
    }
  };
}

function extractOpenRouterErrorMetadata(data) {
  const metadata = data && isRecord(data.openrouter_metadata)
    ? data.openrouter_metadata
    : {};
  const error = data && isRecord(data.error) ? data.error : {};

  return {
    errorCode: safeScalar(error.code),
    requestedModel: safeString(metadata.requested),
    routeStrategy: safeString(metadata.strategy),
    routeAttempt: numericMetric(metadata.attempt)
  };
}

function findHealingStage(metadata) {
  const pipeline = Array.isArray(metadata.pipeline) ? metadata.pipeline : [];
  return pipeline.find((stage) =>
    isRecord(stage) &&
    stage.type === "response_healing" &&
    stage.name === "response-healing"
  );
}

function findSelectedEndpoint(metadata) {
  const available = metadata && metadata.endpoints && Array.isArray(metadata.endpoints.available)
    ? metadata.endpoints.available
    : [];
  return available.find((endpoint) => isRecord(endpoint) && endpoint.selected === true);
}

function firstDefined(record, keys) {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function safeString(value) {
  return typeof value === "string" && value.length <= 200 ? value : "";
}

function safeScalar(value) {
  return typeof value === "string" || Number.isFinite(value) ? value : undefined;
}

function numericMetric(value) {
  const metric = Number(value);
  return Number.isFinite(metric) ? metric : undefined;
}

function booleanMetric(value) {
  return typeof value === "boolean" ? value : undefined;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
  DEFAULT_FALLBACK_MODEL,
  DEFAULT_PRIMARY_MODEL,
  buildOpenRouterMealPlanRequest,
  extractOpenRouterErrorMetadata,
  extractOpenRouterMealPlanResult,
  orderedModels
};
