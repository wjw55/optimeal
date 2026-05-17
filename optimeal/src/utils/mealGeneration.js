import { auth } from '../components/auth/firebase';
import { DAYS, MEAL_TYPES, normalizeMealPlan } from './mealPlanUtils';

export async function generateMealPlan(profile) {
  const endpoint = process.env.REACT_APP_MEAL_PLAN_ENDPOINT;

  if (!endpoint) {
    throw new Error('Meal generation backend is not configured. Set REACT_APP_MEAL_PLAN_ENDPOINT.');
  }

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please sign in before generating a meal plan.');
  }

  try {
    const token = await user.getIdToken();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ profile })
    });

    const result = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(result?.message || 'Could not generate your meal plan. Please try again.');
    }

    const mealPlan = validateAndNormalizeGeneratedPlan(result?.mealPlan);

    return {
      mealPlan,
      nutrition: result?.nutrition,
      dailyNutrition: result?.dailyNutrition
    };
  } catch (error) {
    console.error('Meal generation request failed:', error);

    if (
      error.message?.includes('REACT_APP_MEAL_PLAN_ENDPOINT') ||
      error.message?.includes('sign in') ||
      error.message?.includes('Profile data') ||
      error.message?.includes('Daily meal generation limit')
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
