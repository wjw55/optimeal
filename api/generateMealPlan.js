const admin = require("firebase-admin");
const { z } = require("zod");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const SITE_URL = "https://optimeal-bbabb.web.app";
const MAX_BODY_BYTES = 25 * 1024;
const DAILY_GENERATION_LIMIT = Number(process.env.MEAL_PLAN_DAILY_LIMIT || 10);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];
const REQUIRED_MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const GROCERY_CATEGORIES = ["Produce", "Protein", "Dairy", "Grains", "Pantry", "Sauces", "Other"];
const DEFAULT_ALLOWED_ORIGINS = [
  "https://optimeal-bbabb.web.app",
  "https://optimeal-bbabb.firebaseapp.com",
  "http://localhost:3000",
  "http://localhost:5173"
];

const CATEGORY_KEYWORDS = {
  Produce: ["apple", "banana", "berries", "broccoli", "carrot", "spinach", "lettuce", "tomato", "avocado", "pepper", "onion", "garlic", "lemon", "lime", "mushroom", "zucchini", "cucumber", "sweet potato"],
  Protein: ["chicken", "salmon", "turkey", "beef", "tofu", "egg", "eggs", "lentil", "beans", "tuna", "shrimp", "tempeh", "yogurt"],
  Dairy: ["milk", "cheese", "yogurt", "feta", "cream"],
  Grains: ["rice", "quinoa", "oats", "pasta", "bread", "wrap", "tortilla", "noodles"],
  Pantry: ["oil", "olive", "nuts", "almond", "peanut", "chia", "flour", "honey", "granola"],
  Sauces: ["sauce", "soy", "tahini", "salsa", "dressing", "vinegar", "pesto"]
};

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

const boundedString = (max = 160) => z.string().trim().min(1).max(max);
const macroNumber = z.preprocess((value) => parseNumeric(value), z.number().min(0).max(6000));
const gramNumber = z.preprocess((value) => parseNumeric(value), z.number().min(0).max(1000));

const nutritionSchema = z.object({
  calories: macroNumber,
  protein: gramNumber,
  carbs: gramNumber,
  fats: gramNumber
}).strict();

const ingredientSchema = z.object({
  name: boundedString(120),
  quantity: z.preprocess((value) => parseNumeric(value), z.number().min(0).max(100000)),
  unit: z.string().trim().max(40).default(""),
  category: z.enum(GROCERY_CATEGORIES).default("Other")
}).strict();

const mealSchema = z.object({
  type: z.enum(MEAL_TYPES),
  name: boundedString(140),
  ingredients: z.array(ingredientSchema).min(1).max(20),
  calories: macroNumber,
  protein: gramNumber,
  carbs: gramNumber,
  fats: gramNumber,
  prepMinutes: z.preprocess((value) => parseNumeric(value), z.number().min(0).max(1440)),
  reason: z.string().trim().min(1).max(300)
}).strict();

const daySchema = z.object({
  day: z.enum(DAYS),
  meals: z.array(mealSchema).min(3).max(5),
  totalNutrition: nutritionSchema
}).strict().superRefine((day, ctx) => {
  const mealTypes = new Set(day.meals.map((meal) => meal.type));
  REQUIRED_MEAL_TYPES.forEach((type) => {
    if (!mealTypes.has(type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meals"],
        message: `${day.day} is missing ${type}`
      });
    }
  });
});

const mealPlanSchema = z.object({
  days: z.array(daySchema).length(7)
}).strict().superRefine((plan, ctx) => {
  const seen = new Set();

  plan.days.forEach((day, index) => {
    if (seen.has(day.day)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days", index, "day"],
        message: `Duplicate day ${day.day}`
      });
    }
    seen.add(day.day);
  });

  DAYS.forEach((day) => {
    if (!seen.has(day)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["days"],
        message: `Missing ${day}`
      });
    }
  });
});

class PublicHttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "PublicHttpError";
    this.statusCode = statusCode;
  }
}

class RateLimitError extends Error {}

module.exports = async function generateMealPlanHandler(req, res) {
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const timing = createTimingLogger({ model });
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
    const rawAiResponse = await callOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
      model,
      prompt
    });
    timing.log("openrouter_request", openRouterStartedAt, { uid, success: true });

    const parseStartedAt = Date.now();
    const parsedPlan = parseMealPlanJson(rawAiResponse, uid);
    timing.log("json_parse_extract", parseStartedAt, { uid, success: true });

    const validationStartedAt = Date.now();
    const validatedPlan = validateMealPlanCandidate(parsedPlan, uid);
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

function createTimingLogger({ model }) {
  const startedAt = Date.now();

  return {
    startedAt,
    log(stage, stageStartedAt, details = {}) {
      const now = Date.now();
      console.log("optimeal.generateMealPlan.timing", {
        uid: details.uid || "unknown",
        model,
        stage,
        durationMs: now - stageStartedAt,
        totalMs: now - startedAt,
        success: details.success !== false,
        ...(details.statusCode ? { statusCode: details.statusCode } : {}),
        ...(details.method ? { method: details.method } : {}),
        ...(details.promptLength ? { promptLength: details.promptLength } : {})
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

async function callOpenRouter({ apiKey, model, prompt }) {
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": SITE_URL,
        "X-OpenRouter-Title": "Optimeal"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You generate valid JSON meal plans for a meal planning app. Return only JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.55,
        response_format: {
          type: "json_object"
        }
      })
    });

    if (!response.ok) {
      const providerMessage = await response.text();
      console.error("OpenRouter request failed", {
        status: response.status,
        body: providerMessage.slice(0, 500)
      });
      throw new PublicHttpError(502, "Could not generate your meal plan. Please try again.");
    }

    const data = await response.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";

    if (!content) {
      console.error("OpenRouter returned an empty response");
      throw new PublicHttpError(502, "Could not generate your meal plan. Please try again.");
    }

    return content;
  } catch (error) {
    if (error instanceof PublicHttpError) throw error;

    console.error("OpenRouter call failed", { message: error.message });
    throw new PublicHttpError(502, "Could not generate your meal plan. Please try again.");
  }
}

function parseMealPlanJson(rawResponse, uid) {
  try {
    const extracted = typeof rawResponse === "string" ? extractJson(rawResponse) : rawResponse;
    const parsed = typeof extracted === "string" ? JSON.parse(extracted) : extracted;
    return parsed && parsed.mealPlan && Array.isArray(parsed.mealPlan.days)
      ? parsed.mealPlan
      : parsed;
  } catch (error) {
    console.error("Generated meal plan JSON parsing failed", {
      uid,
      message: error.message
    });
    throw new PublicHttpError(502, "Generated meal plan was invalid. Please try again.");
  }
}

function validateMealPlanCandidate(candidate, uid) {
  try {
    return mealPlanSchema.parse(candidate);
  } catch (error) {
    console.error("Generated meal plan validation failed", {
      uid,
      issues: error.issues,
      message: error.message
    });
    throw new PublicHttpError(502, "Generated meal plan was invalid. Please try again.");
  }
}

function extractJson(rawText) {
  const cleaned = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI response did not contain JSON.");
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function buildMealPlanPrompt(profile) {
  return [
    "Create a practical 7-day meal plan for Optimeal.",
    "Return ONLY valid JSON. Do not include markdown, comments, prose, or code fences.",
    "The JSON must match this exact shape:",
    JSON.stringify(exampleSchema(), null, 2),
    "",
    "Rules:",
    "- Include exactly Monday through Sunday.",
    "- Include breakfast, lunch, and dinner for every day. Include snacks only when useful.",
    "- Use realistic grocery ingredients with numeric quantities and units.",
    "- Assign each ingredient one category: Produce, Protein, Dairy, Grains, Pantry, Sauces, Other.",
    "- Avoid allergens and foods to avoid.",
    "- Keep meals compatible with diet type, cuisines, budget, cooking skill, appliances, servings, and time.",
    "- totalNutrition should approximately equal the day's meals.",
    "- reason should briefly explain why the meal fits the user's goal.",
    "",
    "User profile:",
    JSON.stringify(publicProfile(profile), null, 2)
  ].join("\n");
}

function publicProfile(profile) {
  return {
    age: profile.age || null,
    sex: profile.sex || null,
    heightCm: profile.heightCm || null,
    weightKg: profile.weightKg || null,
    activityLevel: profile.activityLevel || null,
    goal: profile.goal || null,
    dietType: profile.dietType || "None",
    allergies: profile.allergies || [],
    customAllergies: profile.customAllergies || "",
    foodsToAvoid: profile.foodsToAvoid || "",
    preferredCuisines: profile.preferredCuisines || [],
    cookingSkill: profile.cookingSkill || "Intermediate",
    cookingTime: profile.cookingTime || "30 minutes",
    budgetLevel: profile.budgetLevel || "Moderate",
    mealsPerDay: profile.mealsPerDay || 3,
    servings: profile.servings || 1,
    appliances: profile.appliances || [],
    targetCalories: profile.targetCalories || null,
    proteinTarget: profile.targetProtein || null
  };
}

function exampleSchema() {
  return {
    days: [
      {
        day: "Monday",
        meals: [
          {
            type: "breakfast",
            name: "Greek yogurt bowl",
            ingredients: [
              {
                name: "Greek yogurt",
                quantity: 200,
                unit: "g",
                category: "Dairy"
              }
            ],
            calories: 420,
            protein: 30,
            carbs: 45,
            fats: 12,
            prepMinutes: 8,
            reason: "High-protein breakfast that fits the user's goal."
          }
        ],
        totalNutrition: {
          calories: 2050,
          protein: 140,
          carbs: 210,
          fats: 70
        }
      }
    ]
  };
}

function normalizeMealPlanForFirestore(validatedPlan) {
  return DAYS.reduce((acc, day) => {
    const dayPlan = validatedPlan.days.find((entry) => entry.day === day);
    const meals = MEAL_TYPES.reduce((mealAcc, type) => {
      const meal = dayPlan.meals.find((entry) => entry.type === type);
      mealAcc[type] = meal ? normalizeMeal(day, meal) : createEmptyMeal(type);
      return mealAcc;
    }, {});

    acc[day] = {
      meals,
      totalNutrition: dayPlan.totalNutrition,
      groceries: MEAL_TYPES.reduce((groceryAcc, type) => {
        groceryAcc[type] = meals[type].ingredients.map((ingredient, index) => ({
          id: buildGroceryId(day, type, ingredient.name, index),
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit || "",
          category: GROCERY_CATEGORIES.includes(ingredient.category)
            ? ingredient.category
            : inferGroceryCategory(ingredient.name),
          checked: false,
          sourceDay: day,
          sourceMeal: type,
          addedBy: "ai"
        }));
        return groceryAcc;
      }, {})
    };

    return acc;
  }, {});
}

function normalizeMeal(day, meal) {
  return {
    type: meal.type,
    name: meal.name,
    ingredients: meal.ingredients,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fats: meal.fats,
    prepMinutes: meal.prepMinutes,
    reason: meal.reason,
    sourceDay: day
  };
}

function createEmptyMeal(type) {
  return {
    type,
    name: "",
    ingredients: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    prepMinutes: 0,
    reason: ""
  };
}

function calculateWeeklyAverage(mealPlan) {
  const totals = DAYS.reduce((acc, day) => {
    const nutrition = mealPlan[day].totalNutrition;
    acc.calories += nutrition.calories;
    acc.protein += nutrition.protein;
    acc.carbs += nutrition.carbs;
    acc.fats += nutrition.fats;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return {
    calories: Math.round(totals.calories / DAYS.length),
    protein: Math.round(totals.protein / DAYS.length),
    carbs: Math.round(totals.carbs / DAYS.length),
    fats: Math.round(totals.fats / DAYS.length)
  };
}

function inferGroceryCategory(name = "") {
  const lowerName = String(name).toLowerCase();
  const match = Object.entries(CATEGORY_KEYWORDS).find(([, keywords]) =>
    keywords.some((keyword) => lowerName.includes(keyword))
  );

  return match ? match[0] : "Other";
}

function buildGroceryId(day, mealType, name, index) {
  return `${day}-${mealType}-${index}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
