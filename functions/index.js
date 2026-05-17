const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { validateProfileInput } = require("./src/schemas/profileSchema");
const { parseAndValidateMealPlan } = require("./src/schemas/mealPlanSchema");
const { buildMealPlanPrompt } = require("./src/prompts/mealPlanPrompt");
const { callOpenRouter } = require("./src/providers/openRouterClient");
const { normalizeMealPlanForFirestore, calculateWeeklyAverage } = require("./src/normalizers/mealPlanNormalizer");

initializeApp();

const db = getFirestore();
const openRouterApiKey = defineSecret("OPENROUTER_API_KEY");

exports.generateMealPlan = onCall({
  region: "us-central1",
  cors: true,
  secrets: [openRouterApiKey],
  timeoutSeconds: 120,
  memory: "512MiB"
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in before generating a meal plan.");
  }

  const uid = request.auth.uid;
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new HttpsError("failed-precondition", "Complete your profile before generating a meal plan.");
  }

  const profileResult = validateProfileInput({
    ...userSnap.data(),
    ...(request.data && request.data.profile ? request.data.profile : {})
  });

  if (!profileResult.success) {
    throw new HttpsError("invalid-argument", profileResult.message);
  }

  const apiKey = openRouterApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Meal generation is not configured.");
  }

  try {
    const prompt = buildMealPlanPrompt(profileResult.profile);
    const rawResponse = await callOpenRouter({
      apiKey,
      prompt,
      model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1-0528:free",
      siteUrl: process.env.OPENROUTER_SITE_URL || "https://optimeal-bbabb.web.app"
    });

    const validatedPlan = parseAndValidateMealPlan(rawResponse);
    const mealPlan = normalizeMealPlanForFirestore(validatedPlan);
    const nutrition = calculateWeeklyAverage(mealPlan);
    const dailyNutrition = Object.keys(mealPlan).reduce((acc, day) => {
      acc[day] = mealPlan[day].totalNutrition;
      return acc;
    }, {});

    await userRef.set({
      currentMeals: mealPlan,
      nutrition,
      dailyNutrition,
      lastMealPlanGeneratedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      mealPlan,
      nutrition,
      dailyNutrition
    };
  } catch (error) {
    console.error("Meal generation failed", {
      uid,
      code: error.code,
      message: error.message
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      "Could not generate your meal plan. Please try again."
    );
  }
});
