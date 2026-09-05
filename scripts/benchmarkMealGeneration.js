const { performance } = require("node:perf_hooks");
const {
  DAYS,
  buildMealPlanPrompt,
  normalizeMealPlanForFirestore,
  parseMealPlanJson,
  validateMealPlanCandidate
} = require("../lib/mealPlanCore");
const {
  DEFAULT_FALLBACK_MODEL,
  DEFAULT_PRIMARY_MODEL,
  buildOpenRouterMealPlanRequest,
  extractOpenRouterErrorMetadata,
  extractOpenRouterMealPlanResult,
  orderedModels
} = require("../lib/openRouterMealPlan");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PRIMARY_MODEL = process.env.OPENROUTER_MODEL || DEFAULT_PRIMARY_MODEL;
const FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
const RUN_COUNT = 10;
const REQUEST_TIMEOUT_MS = 45000;
const CONFIRMATION_FLAG = "--confirm-live";

const PROFILE_VARIANTS = [
  { goal: "Maintain weight", dietType: "High protein", preferredCuisines: ["Mediterranean", "Japanese"] },
  { goal: "Lose weight gradually", dietType: "Vegetarian", preferredCuisines: ["Indian", "Mediterranean"] },
  { goal: "Build muscle", dietType: "None", preferredCuisines: ["Asian", "Mexican"] },
  { goal: "Maintain weight", dietType: "Vegan", preferredCuisines: ["Thai", "Middle Eastern"] },
  { goal: "Improve meal consistency", dietType: "Pescatarian", preferredCuisines: ["Japanese", "Mediterranean"] },
  { goal: "Lose weight gradually", dietType: "High protein", preferredCuisines: ["Korean", "Western"] },
  { goal: "Build muscle", dietType: "Dairy-free", preferredCuisines: ["Chinese", "Mediterranean"] },
  { goal: "Maintain weight", dietType: "Gluten-free", preferredCuisines: ["Mexican", "Thai"] },
  { goal: "Improve energy", dietType: "None", preferredCuisines: ["Indian", "Japanese"] },
  { goal: "Maintain weight", dietType: "Vegetarian", preferredCuisines: ["Italian", "Middle Eastern"] }
];

async function main() {
  if (!process.argv.includes(CONFIRMATION_FLAG)) {
    throw new Error(
      `Live API calls are disabled. After approval, rerun with ${CONFIRMATION_FLAG}.`
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for the live benchmark.");
  }

  const results = [];

  for (let index = 0; index < RUN_COUNT; index += 1) {
    const profile = syntheticProfile(PROFILE_VARIANTS[index]);
    const result = await runBenchmarkRequest({ apiKey, profile, run: index + 1 });
    results.push(result);
    console.log("optimeal.mealGeneration.benchmark", result);
  }

  const successful = results.filter((result) => result.valid);
  const latencies = successful.map((result) => result.durationMs).sort((a, b) => a - b);
  const summary = {
    models: orderedModels(PRIMARY_MODEL, FALLBACK_MODEL),
    runs: results.length,
    validRuns: successful.length,
    truncatedRuns: results.filter((result) => result.finishReason === "length").length,
    timeoutRuns: results.filter((result) => result.status === "timeout").length,
    providerErrorRuns: results.filter((result) => Number.isFinite(result.status) && result.status >= 400).length,
    fallbackRuns: results.filter((result) => result.fallbackUsed).length,
    healingRuns: results.filter((result) => result.healingApplied).length,
    selectedModelCounts: countBy(successful, "selectedModel"),
    selectedProviderCounts: countBy(successful, "selectedProvider"),
    p50Ms: percentile(latencies, 0.5),
    p90Ms: percentile(latencies, 0.9),
    averagePromptTokens: averageMetric(successful, "promptTokens"),
    averageCompletionTokens: averageMetric(successful, "completionTokens"),
    accepted:
      successful.length === RUN_COUNT &&
      results.every((result) => result.finishReason !== "length") &&
      percentile(latencies, 0.9) < 45000
  };

  console.log("optimeal.mealGeneration.benchmarkSummary", summary);
  if (!summary.accepted) process.exitCode = 1;
}

async function runBenchmarkRequest({ apiKey, profile, run }) {
  const prompt = buildMealPlanPrompt(profile);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://optimeal-bbabb.web.app",
        "X-OpenRouter-Title": "Optimeal benchmark",
        "X-OpenRouter-Metadata": "enabled"
      },
      body: JSON.stringify(buildOpenRouterMealPlanRequest({
        primaryModel: PRIMARY_MODEL,
        fallbackModel: FALLBACK_MODEL,
        prompt
      })),
      signal: controller.signal
    });

    const data = await response.json().catch(() => null);
    const durationMs = Math.round(performance.now() - startedAt);
    if (!response.ok) {
      const errorMetadata = extractOpenRouterErrorMetadata(data);
      return {
        run,
        valid: false,
        status: response.status,
        durationMs,
        finishReason: "provider_error",
        ...errorMetadata
      };
    }

    const providerResult = extractOpenRouterMealPlanResult(data, PRIMARY_MODEL);
    const content = providerResult.content;

    let valid = false;
    let plannedMeals = 0;
    try {
      const candidate = parseMealPlanJson(content);
      const validated = validateMealPlanCandidate(candidate);
      const normalized = normalizeMealPlanForFirestore(validated);
      plannedMeals = DAYS.reduce((count, day) => {
        return count + Object.values(normalized[day].meals).filter((meal) => meal.name).length;
      }, 0);
      valid = providerResult.finishReason === "stop" && Object.keys(normalized).length === 7 && plannedMeals >= 21;
    } catch (error) {
      valid = false;
    }

    return {
      run,
      valid,
      status: response.status,
      durationMs,
      plannedMeals,
      responseChars: content.length,
      finishReason: providerResult.finishReason,
      selectedModel: providerResult.selectedModel,
      selectedProvider: providerResult.selectedProvider,
      routeStrategy: providerResult.routeStrategy,
      routeAttempt: providerResult.routeAttempt,
      fallbackUsed: providerResult.fallbackUsed,
      healingApplied: providerResult.healingApplied,
      healingMode: providerResult.healingMode,
      healingImproved: providerResult.healingImproved,
      promptTokens: providerResult.usage.promptTokens,
      completionTokens: providerResult.usage.completionTokens,
      totalTokens: providerResult.usage.totalTokens
    };
  } catch (error) {
    return {
      run,
      valid: false,
      status: error.name === "AbortError" ? "timeout" : "request_error",
      durationMs: Math.round(performance.now() - startedAt),
      finishReason: error.name === "AbortError" ? "timeout" : "request_error"
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function syntheticProfile(overrides) {
  return {
    age: 28,
    sex: "Prefer not to say",
    heightCm: 172,
    weightKg: 70,
    activityLevel: "Moderate",
    allergies: [],
    customAllergies: "",
    foodsToAvoid: "Minimal added sugar",
    cookingSkill: "Intermediate",
    cookingTime: "30 minutes",
    budgetLevel: "Moderate",
    mealsPerDay: 3,
    servings: 1,
    appliances: ["Stove", "Oven", "Rice cooker"],
    targetCalories: 2000,
    targetProtein: 130,
    ...overrides
  };
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const index = Math.max(0, Math.ceil(values.length * ratio) - 1);
  return values[index];
}

function averageMetric(results, field) {
  const values = results.map((result) => result[field]).filter(Number.isFinite);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countBy(results, field) {
  return results.reduce((counts, result) => {
    const value = result[field] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
