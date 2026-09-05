const admin = require("firebase-admin");
const { z } = require("zod");
const {
  DAYS,
  buildMealPlanPrompt,
  calculateWeeklyAverage,
  normalizeMealPlanForFirestore,
  parseMealPlanJson,
  validateMealPlanCandidate
} = require("../lib/mealPlanCore");
const {
  DEFAULT_FALLBACK_MODEL,
  DEFAULT_PRIMARY_MODEL,
  buildOpenRouterMealPlanRequest,
  extractOpenRouterErrorMetadata,
  extractOpenRouterMealPlanResult
} = require("../lib/openRouterMealPlan");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SITE_URL = "https://optimeal-bbabb.web.app";
const MAX_BODY_BYTES = 25 * 1024;
const OPENROUTER_TIMEOUT_MS = 45000;
const DAILY_GENERATION_LIMIT = Number(process.env.MEAL_PLAN_DAILY_LIMIT || 10);

const DEFAULT_ALLOWED_ORIGINS = [
  "https://optimeal-bbabb.web.app",
  "https://optimeal-bbabb.firebaseapp.com",
  "http://localhost:3000",
  "http://localhost:5173"
];

const textField = (max = 160) =>
  z.preprocess((value) => sanitizeString(value), z.string().max(max));

const optionalNumber = (min, max) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return parseNumeric(value);
  }, z.number().min(min).max(max).optional());

const profileSchema = z.object({
  username: textField(120).optional(),
  email: textField(160).optional(),
  age: optionalNumber(13, 100),
  sex: textField(80).optional(),
  heightCm: optionalNumber(80, 250),
  height: optionalNumber(80, 250),
  weightKg: optionalNumber(25, 350),
  weight: optionalNumber(25, 350),
  activityLevel: textField(80).optional(),
  goal: textField(120).optional(),
  dietType: textField(120).optional(),
  allergies: z.preprocess((value) => normalizeStringArray(value), z.array(z.string().min(1).max(80)).max(20)).default([]),
  customAllergies: textField(240).optional(),
  foodsToAvoid: textField(600).optional(),
  preferredCuisines: z.preprocess((value) => normalizeStringArray(value), z.array(z.string().min(1).max(80)).max(20)).default([]),
  cookingSkill: textField(80).optional(),
  cookingTime: textField(80).optional(),
  budgetLevel: textField(80).optional(),
  budget: textField(80).optional(),
  mealsPerDay: optionalNumber(1, 6),
  servings: optionalNumber(1, 8),
  appliances: z.preprocess((value) => normalizeStringArray(value), z.array(z.string().min(1).max(80)).max(20)).default([]),
  targetCalories: optionalNumber(1000, 6000),
  proteinTarget: optionalNumber(0, 350),
  targetProtein: optionalNumber(0, 350),
  preferences: z.any().optional()
}).strip().transform((profile) => ({
  ...profile,
  heightCm: profile.heightCm ?? profile.height,
  weightKg: profile.weightKg ?? profile.weight,
  budgetLevel: profile.budgetLevel || profile.budget,
  targetProtein: profile.targetProtein ?? profile.proteinTarget,
  dietType: profile.dietType || firstPreference(profile.preferences) || "None",
  allergies: profile.allergies || [],
  preferredCuisines: profile.preferredCuisines || [],
  appliances: profile.appliances || []
}));

const requestSchema = z.object({
  profile: z.record(z.unknown())
}).strict();

class PublicHttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "PublicHttpError";
    this.statusCode = statusCode;
  }
}

class RateLimitError extends Error {}

module.exports = async function generateMealPlanHandler(req, res) {
  const primaryModel = process.env.OPENROUTER_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  const timing = createTimingLogger({ primaryModel, fallbackModel });
  let uid = "unknown";

  try {
    timing.log("request_received", timing.startedAt, { success: true });

    const corsStartedAt = Date.now();
    if (!originIsAllowed(req)) {
      timing.log("cors_auth_check", corsStartedAt, { uid, success: false });
      timing.log("total_endpoint_duration", timing.startedAt, { uid, success: false, statusCode: 403 });
      return sendJson(res, 403, { message: "Origin is not allowed." });
    }

    applyCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      timing.log("cors_auth_check", corsStartedAt, { uid, success: true, method: "OPTIONS" });
      timing.log("total_endpoint_duration", timing.startedAt, { uid, success: true, statusCode: 204 });
      res.statusCode = 204;
      return res.end();
    }

    if (req.method !== "POST") {
      timing.log("cors_auth_check", corsStartedAt, { uid, success: false, method: req.method });
      timing.log("total_endpoint_duration", timing.startedAt, { uid, success: false, statusCode: 405 });
      res.setHeader("Allow", "POST, OPTIONS");
      return sendJson(res, 405, { message: "Method not allowed." });
    }
    timing.log("cors_auth_check", corsStartedAt, { uid, success: true, method: req.method });

    const bodyStartedAt = Date.now();
    const body = await readRequestBody(req);
    const payload = validateRequestBody(body);
    timing.log("request_body_validation", bodyStartedAt, { uid, success: true });

    const tokenStartedAt = Date.now();
    const decodedToken = await verifyFirebaseIdToken(req);
    uid = decodedToken.uid;
    timing.log("firebase_id_token_verification", tokenStartedAt, { uid, success: true });

    const profileStartedAt = Date.now();
    const savedProfile = await loadSavedProfile(uid);
    timing.log("firestore_profile_load", profileStartedAt, { uid, success: true });

    const profileValidationStartedAt = Date.now();
    const profile = validateProfileForGeneration(uid, {
      ...savedProfile,
      ...payload.profile
    });
    timing.log("profile_validation", profileValidationStartedAt, { uid, success: true });

    if (!process.env.OPENROUTER_API_KEY) {
      throw new PublicHttpError(500, "Meal generation backend is not configured.");
    }

    const rateLimitStartedAt = Date.now();
    await enforceDailyLimit(uid);
    timing.log("rate_limit_check", rateLimitStartedAt, { uid, success: true });

    const promptStartedAt = Date.now();
    const prompt = buildMealPlanPrompt(profile);
    timing.log("prompt_construction", promptStartedAt, { uid, success: true, promptLength: prompt.length });

    const openRouterStartedAt = Date.now();
    const providerResult = await callOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      primaryModel,
      fallbackModel,
      prompt
    });
    timing.log("openrouter_request", openRouterStartedAt, {
      uid,
      success: true,
      finishReason: providerResult.finishReason,
      responseChars: providerResult.content.length,
      promptTokens: providerResult.usage.promptTokens,
      completionTokens: providerResult.usage.completionTokens,
      totalTokens: providerResult.usage.totalTokens,
      selectedModel: providerResult.selectedModel,
      selectedProvider: providerResult.selectedProvider,
      routeStrategy: providerResult.routeStrategy,
      routeAttempt: providerResult.routeAttempt,
      fallbackUsed: providerResult.fallbackUsed,
      healingApplied: providerResult.healingApplied,
      healingMode: providerResult.healingMode,
      healingImproved: providerResult.healingImproved,
      healingOriginalChars: providerResult.healingOriginalChars,
      healingFinalChars: providerResult.healingFinalChars
    });

    const parseStartedAt = Date.now();
    const parsedPlan = parseGeneratedMealPlan(providerResult.content, uid);
    timing.log("json_parse_extract", parseStartedAt, { uid, success: true });

    const validationStartedAt = Date.now();
    const validatedPlan = validateGeneratedMealPlan(parsedPlan, uid);
    timing.log("zod_validation", validationStartedAt, { uid, success: true });

    const normalizationStartedAt = Date.now();
    const mealPlan = normalizeMealPlanForFirestore(validatedPlan);
    const nutrition = calculateWeeklyAverage(mealPlan);
    const dailyNutrition = DAYS.reduce((acc, day) => {
      acc[day] = mealPlan[day].totalNutrition;
      return acc;
    }, {});
    timing.log("normalization", normalizationStartedAt, { uid, success: true });

    timing.log("total_endpoint_duration", timing.startedAt, { uid, success: true, statusCode: 200 });
    return sendJson(res, 200, {
      mealPlan,
      nutrition,
      dailyNutrition
    });
  } catch (error) {
    if (error instanceof PublicHttpError) {
      timing.log("total_endpoint_duration", timing.startedAt, {
        uid,
        success: false,
        statusCode: error.statusCode
      });
      return sendJson(res, error.statusCode, { message: error.message });
    }

    console.error("Meal generation endpoint failed", {
      message: error.message,
      stack: error.stack
    });

    timing.log("total_endpoint_duration", timing.startedAt, { uid, success: false, statusCode: 500 });
    return sendJson(res, 500, {
      message: "Could not generate your meal plan. Please try again."
    });
  }
};

function createTimingLogger({ primaryModel, fallbackModel }) {
  const startedAt = Date.now();

  return {
    startedAt,
    log(stage, stageStartedAt, details = {}) {
      const now = Date.now();
      console.log("optimeal.generateMealPlan.timing", {
        uid: details.uid || "unknown",
        primaryModel,
        fallbackModel,
        stage,
        durationMs: now - stageStartedAt,
        totalMs: now - startedAt,
        success: details.success !== false,
        ...(details.statusCode ? { statusCode: details.statusCode } : {}),
        ...(details.method ? { method: details.method } : {}),
        ...(Number.isFinite(details.promptLength) ? { promptLength: details.promptLength } : {}),
        ...(Number.isFinite(details.responseChars) ? { responseChars: details.responseChars } : {}),
        ...(Number.isFinite(details.promptTokens) ? { promptTokens: details.promptTokens } : {}),
        ...(Number.isFinite(details.completionTokens) ? { completionTokens: details.completionTokens } : {}),
        ...(Number.isFinite(details.totalTokens) ? { totalTokens: details.totalTokens } : {}),
        ...(details.finishReason ? { finishReason: details.finishReason } : {}),
        ...(details.selectedModel ? { selectedModel: details.selectedModel } : {}),
        ...(details.selectedProvider ? { selectedProvider: details.selectedProvider } : {}),
        ...(details.routeStrategy ? { routeStrategy: details.routeStrategy } : {}),
        ...(Number.isFinite(details.routeAttempt) ? { routeAttempt: details.routeAttempt } : {}),
        ...(typeof details.fallbackUsed === "boolean" ? { fallbackUsed: details.fallbackUsed } : {}),
        ...(typeof details.healingApplied === "boolean" ? { healingApplied: details.healingApplied } : {}),
        ...(details.healingMode ? { healingMode: details.healingMode } : {}),
        ...(typeof details.healingImproved === "boolean" ? { healingImproved: details.healingImproved } : {}),
        ...(Number.isFinite(details.healingOriginalChars) ? { healingOriginalChars: details.healingOriginalChars } : {}),
        ...(Number.isFinite(details.healingFinalChars) ? { healingFinalChars: details.healingFinalChars } : {})
      });
    }
  };
}

function originIsAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return getAllowedOrigins().has(origin);
}

function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && getAllowedOrigins().has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function getAllowedOrigins() {
  const envOrigins = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      throw new PublicHttpError(413, "Request body is too large.");
    }
    return parseJsonBody(rawBody);
  }

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new PublicHttpError(413, "Request body is too large.");
    }
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) return {};
  return parseJsonBody(Buffer.concat(chunks).toString("utf8"));
}

function parseJsonBody(rawBody) {
  if (!rawBody || !rawBody.trim()) return {};

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw new PublicHttpError(400, "Request body must be valid JSON.");
  }
}

function validateRequestBody(body) {
  let size = 0;
  try {
    size = Buffer.byteLength(JSON.stringify(body || {}), "utf8");
  } catch (error) {
    throw new PublicHttpError(400, "Request body must be valid JSON.");
  }

  if (size > MAX_BODY_BYTES) {
    throw new PublicHttpError(413, "Request body is too large.");
  }

  const result = requestSchema.safeParse(body);
  if (!result.success) {
    throw new PublicHttpError(400, "Profile data is required.");
  }

  return result.data;
}

async function verifyFirebaseIdToken(req) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new PublicHttpError(401, "Sign in before generating a meal plan.");
  }

  try {
    return await getFirebaseAdmin().auth().verifyIdToken(match[1]);
  } catch (error) {
    console.error("Firebase token verification failed", { message: error.message });
    throw new PublicHttpError(401, "Sign in before generating a meal plan.");
  }
}

async function loadSavedProfile(uid) {
  try {
    const userSnap = await getFirestore().collection("users").doc(uid).get();
    return userSnap.exists ? userSnap.data() : {};
  } catch (error) {
    console.error("Could not load saved profile for generation", {
      uid,
      message: error.message
    });
    return {};
  }
}

function validateProfileForGeneration(uid, rawProfile) {
  const result = profileSchema.safeParse(rawProfile);
  if (!result.success) {
    console.error("Meal generation profile validation failed", {
      uid,
      issues: result.error.issues
    });
    throw new PublicHttpError(400, "Profile data is incomplete or outside supported ranges.");
  }

  return result.data;
}

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(getFirebaseCredential())
      });
    } catch (error) {
      console.error("Firebase Admin initialization failed", { message: error.message });
      throw new PublicHttpError(500, "Meal generation backend is not configured.");
    }
  }

  return admin;
}

function getFirestore() {
  return getFirebaseAdmin().firestore();
}

function getFirebaseCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : "";

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey
    };
  }

  throw new Error("Firebase Admin credentials are not configured.");
}

async function enforceDailyLimit(uid) {
  if (!Number.isFinite(DAILY_GENERATION_LIMIT) || DAILY_GENERATION_LIMIT <= 0) {
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const usageRef = getFirestore().collection("aiUsage").doc(`${uid}_${date}`);

  try {
    await getFirestore().runTransaction(async (transaction) => {
      const usageSnap = await transaction.get(usageRef);
      const currentCount = usageSnap.exists
        ? Number(usageSnap.data().mealPlanGenerations || 0)
        : 0;

      if (currentCount >= DAILY_GENERATION_LIMIT) {
        throw new RateLimitError("Daily meal generation limit reached.");
      }

      transaction.set(usageRef, {
        uid,
        date,
        mealPlanGenerations: currentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new PublicHttpError(429, "Daily meal generation limit reached. Please try again tomorrow.");
    }
    throw error;
  }
}

async function callOpenRouter({ apiKey, primaryModel, fallbackModel, prompt }) {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_URL,
        "X-OpenRouter-Title": "Optimeal",
        "X-OpenRouter-Metadata": "enabled"
      },
      body: JSON.stringify(buildOpenRouterMealPlanRequest({
        primaryModel,
        fallbackModel,
        prompt
      })),
      signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS)
    });

    const data = await response.json().catch((error) => {
      if (error.name === "TimeoutError" || error.name === "AbortError") throw error;
      return null;
    });

    if (!response.ok || (data && data.error)) {
      const errorMetadata = extractOpenRouterErrorMetadata(data);
      console.error("OpenRouter request failed", {
        status: response.status,
        ...errorMetadata
      });
      throw new PublicHttpError(502, "Could not generate your meal plan. Please try again.");
    }

    const result = extractOpenRouterMealPlanResult(data, primaryModel);

    if (result.finishReason !== "stop") {
      console.error("OpenRouter did not complete the meal plan", {
        finishReason: result.finishReason,
        selectedModel: result.selectedModel,
        responseChars: result.content.length,
        completionTokens: result.usage.completionTokens
      });
      throw new PublicHttpError(502, "The meal plan was incomplete. Please try again.");
    }

    if (!result.content) {
      console.error("OpenRouter returned an empty response", {
        selectedModel: result.selectedModel,
        selectedProvider: result.selectedProvider,
        routeStrategy: result.routeStrategy,
        routeAttempt: result.routeAttempt
      });
      throw new PublicHttpError(502, "Could not generate your meal plan. Please try again.");
    }

    return result;
  } catch (error) {
    if (error instanceof PublicHttpError) throw error;

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new PublicHttpError(504, "Meal generation took too long. Please try again.");
    }

    console.error("OpenRouter call failed", { message: error.message });
    throw new PublicHttpError(502, "Could not generate your meal plan. Please try again.");
  }
}

function parseGeneratedMealPlan(rawResponse, uid) {
  try {
    return parseMealPlanJson(rawResponse);
  } catch (error) {
    console.error("Generated meal plan JSON parsing failed", {
      uid,
      message: error.message
    });
    throw new PublicHttpError(502, "Generated meal plan was invalid. Please try again.");
  }
}

function validateGeneratedMealPlan(candidate, uid) {
  try {
    return validateMealPlanCandidate(candidate);
  } catch (error) {
    console.error("Generated meal plan validation failed", {
      uid,
      issues: error.issues,
      message: error.message
    });
    throw new PublicHttpError(502, "Generated meal plan was invalid. Please try again.");
  }
}

function parseNumeric(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

function normalizeStringArray(value) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return rawItems
    .map((item) => sanitizeString(item))
    .filter(Boolean)
    .slice(0, 20);
}

function sanitizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstPreference(preferences) {
  const normalized = normalizeStringArray(preferences);
  return normalized.length ? normalized[0] : "";
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify(body));
}
