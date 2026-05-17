import { auth } from '../components/auth/firebase';
import { DAYS, MEAL_TYPES, normalizeMealPlan } from './mealPlanUtils';

const MEAL_GENERATION_TIMEOUT_MS = 55000;
const isDevelopment = process.env.NODE_ENV === 'development';

export async function generateMealPlan(profile) {
  const endpoint = process.env.REACT_APP_MEAL_PLAN_ENDPOINT;
  const totalStartedAt = now();
  const timings = {};

  if (!endpoint) {
    throw new Error('Meal generation backend is not configured. Set REACT_APP_MEAL_PLAN_ENDPOINT.');
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please sign in before generating a meal plan.');
  }

  let timeoutId;

  try {
    const tokenStartedAt = now();
    const token = await user.getIdToken();
    timings.getIdTokenMs = elapsed(tokenStartedAt);

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), MEAL_GENERATION_TIMEOUT_MS);
    const fetchStartedAt = now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ profile }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    timeoutId = null;
    timings.fetchEndpointMs = elapsed(fetchStartedAt);

    const parseStartedAt = now();
    const result = await parseJsonResponse(response);
    timings.parseResponseMs = elapsed(parseStartedAt);

    if (!response.ok) {
      throw new Error(result?.message || 'Could not generate your meal plan. Please try again.');
    }

    const normalizeStartedAt = now();
    const mealPlan = validateAndNormalizeGeneratedPlan(result?.mealPlan);
    timings.parseNormalizeMs = elapsed(normalizeStartedAt);
    timings.totalClickToReadyMs = elapsed(totalStartedAt);
    logGenerationTimings(timings);

    return {
      mealPlan,
      nutrition: result?.nutrition,
      dailyNutrition: result?.dailyNutrition
    };
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    console.error('Meal generation request failed:', error);
    timings.totalClickToFailureMs = elapsed(totalStartedAt);
    logGenerationTimings(timings);

    if (error.name === 'AbortError') {
      throw new Error('Meal generation is taking longer than expected. Please try again.');
    }

    if (
      error.message?.includes('REACT_APP_MEAL_PLAN_ENDPOINT') ||
      error.message?.includes('sign in') ||
      error.message?.includes('Profile data') ||
      error.message?.includes('Daily meal generation limit') ||
      error.message?.includes('Generated meal plan was invalid')
    ) {
      throw new Error(error.message);
    }

    throw new Error('Could not generate your meal plan. Please try again.');
  }
}

export function validateAndNormalizeGeneratedPlan(payload) {
  const planPayload = payload?.mealPlan || payload?.plan || payload;
  const normalizedPlan = normalizeMealPlan(planPayload);
  const missingDays = DAYS.filter((day) => !normalizedPlan[day]);

  if (missingDays.length) {
    throw new Error(`Meal plan is missing: ${missingDays.join(', ')}`);
  }

  const plannedMeals = DAYS.flatMap((day) =>
    MEAL_TYPES.map((type) => normalizedPlan[day].meals[type]).filter((meal) => meal?.name)
  );

  if (plannedMeals.length < 21) {
    throw new Error('Meal plan response did not include enough meals to save.');
  }

  return normalizedPlan;
}

async function parseJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Could not generate your meal plan. Please try again.');
  }
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function elapsed(startedAt) {
  return Math.round(now() - startedAt);
}

function logGenerationTimings(timings) {
  if (!isDevelopment) return;
  console.info('optimeal.mealGeneration.timing', timings);
}
