const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildOpenRouterMealPlanRequest,
  extractOpenRouterErrorMetadata,
  extractOpenRouterMealPlanResult,
  orderedModels
} = require("../../lib/openRouterMealPlan");

const PRIMARY = "liquid/lfm-2.5-2.6b:free";
const FALLBACK = "dots-studio/dots-3-note-preview:free";

test("OpenRouter request uses strict structured output, healing, and required parameters", () => {
  const request = buildOpenRouterMealPlanRequest({
    primaryModel: PRIMARY,
    fallbackModel: FALLBACK,
    prompt: "Generate the test plan."
  });

  assert.deepEqual(request.models, [PRIMARY, FALLBACK]);
  assert.equal(request.model, undefined);
  assert.equal(request.messages[1].content, "Generate the test plan.");
  assert.equal(request.temperature, 0.55);
  assert.equal(request.max_tokens, 8192);
  assert.deepEqual(request.reasoning, { effort: "none" });
  assert.equal(request.response_format.type, "json_schema");
  assert.equal(request.response_format.json_schema.strict, true);
  assert.equal(request.response_format.json_schema.schema.additionalProperties, false);
  assert.deepEqual(request.plugins, [{ id: "response-healing" }]);
  assert.deepEqual(request.provider, { require_parameters: true });
});

test("model ordering trims values, removes blanks, and deduplicates", () => {
  assert.deepEqual(orderedModels(` ${PRIMARY} `, FALLBACK), [PRIMARY, FALLBACK]);
  assert.deepEqual(orderedModels(PRIMARY, PRIMARY), [PRIMARY]);
  assert.deepEqual(orderedModels(PRIMARY, ""), [PRIMARY]);
});

test("OpenRouter result reports selected fallback and healing outcome", () => {
  const result = extractOpenRouterMealPlanResult({
    model: FALLBACK,
    choices: [{
      finish_reason: "stop",
      message: { content: "{\"days\":[]}" }
    }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300
    },
    openrouter_metadata: {
      strategy: "fallback",
      attempt: 2,
      future_field: { ignored: true },
      endpoints: {
        available: [
          { provider: "Liquid", model: PRIMARY, selected: false },
          { provider: "AtlasCloud", model: FALLBACK, selected: true }
        ]
      },
      pipeline: [{
        type: "response_healing",
        name: "response-healing",
        data: {
          mode: "json_schema",
          improved: true,
          original_length: 201,
          healed_length: 198,
          generated_content: "must not be returned"
        }
      }]
    }
  }, PRIMARY);

  assert.equal(result.selectedModel, FALLBACK);
  assert.equal(result.selectedProvider, "AtlasCloud");
  assert.equal(result.routeStrategy, "fallback");
  assert.equal(result.routeAttempt, 2);
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.healingApplied, true);
  assert.equal(result.healingMode, "json_schema");
  assert.equal(result.healingImproved, true);
  assert.equal(result.healingOriginalChars, 201);
  assert.equal(result.healingFinalChars, 198);
  assert.equal(result.generatedContent, undefined);
  assert.deepEqual(result.usage, {
    promptTokens: 100,
    completionTokens: 200,
    totalTokens: 300
  });
});

test("OpenRouter result tolerates missing and additive metadata", () => {
  const result = extractOpenRouterMealPlanResult({
    model: PRIMARY,
    choices: [{ message: { content: "{}" } }],
    openrouter_metadata: {
      pipeline: [{ type: "future_stage", name: "unknown", data: { anything: true } }]
    }
  }, PRIMARY);

  assert.equal(result.content, "{}");
  assert.equal(result.finishReason, "unknown");
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.healingApplied, false);
  assert.equal(result.selectedProvider, "");
  assert.equal(result.routeAttempt, undefined);
});

test("OpenRouter error metadata exposes only safe routing fields", () => {
  const result = extractOpenRouterErrorMetadata({
    error: {
      code: 429,
      message: "provider detail should not be returned",
      metadata: { raw: "unrestricted provider response" }
    },
    openrouter_metadata: {
      requested: PRIMARY,
      strategy: "fallback",
      attempt: 2,
      summary: "not allowlisted"
    }
  });

  assert.deepEqual(result, {
    errorCode: 429,
    requestedModel: PRIMARY,
    routeStrategy: "fallback",
    routeAttempt: 2
  });
});
