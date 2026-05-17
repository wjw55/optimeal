export const DIET_TYPES = ['None', 'Vegetarian', 'Vegan', 'Halal', 'Keto', 'Pescatarian', 'Other'];
export const ALLERGY_OPTIONS = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy'];
export const CUISINE_OPTIONS = ['Mediterranean', 'Japanese', 'Korean', 'Mexican', 'Indian', 'Chinese', 'Western'];
export const APPLIANCE_OPTIONS = ['Microwave', 'Oven', 'Air fryer', 'Rice cooker', 'Stove'];

export function normalizeProfile(rawProfile = {}) {
  return {
    username: rawProfile.username || '',
    email: rawProfile.email || '',
    age: rawProfile.age || '',
    sex: rawProfile.sex || 'Prefer not to say',
    heightCm: parseNumber(rawProfile.heightCm ?? rawProfile.height),
    weightKg: parseNumber(rawProfile.weightKg ?? rawProfile.weight),
    activityLevel: rawProfile.activityLevel || 'Moderate',
    goal: rawProfile.goal || 'Maintain weight',
    dietType: rawProfile.dietType || firstPreference(rawProfile.preferences) || 'None',
    allergies: Array.isArray(rawProfile.allergies) ? rawProfile.allergies : [],
    customAllergies: rawProfile.customAllergies || '',
    foodsToAvoid: rawProfile.foodsToAvoid || '',
    preferredCuisines: Array.isArray(rawProfile.preferredCuisines) ? rawProfile.preferredCuisines : [],
    cookingSkill: rawProfile.cookingSkill || 'Intermediate',
    cookingTime: rawProfile.cookingTime || '30 minutes',
    budgetLevel: rawProfile.budgetLevel || 'Moderate',
    mealsPerDay: rawProfile.mealsPerDay || 3,
    servings: rawProfile.servings || 1,
    appliances: Array.isArray(rawProfile.appliances) ? rawProfile.appliances : [],
    targetCalories: rawProfile.targetCalories || '',
    targetProtein: rawProfile.targetProtein || ''
  };
}

export function profileIsComplete(profile) {
  const normalized = normalizeProfile(profile);
  return Boolean(
    normalized.username &&
    normalized.age &&
    normalized.heightCm &&
    normalized.weightKg &&
    normalized.goal &&
    normalized.activityLevel
  );
}

export function buildProfileForSave(profile) {
  const normalized = normalizeProfile(profile);
  return {
    ...normalized,
    age: Number(normalized.age),
    heightCm: Number(normalized.heightCm),
    weightKg: Number(normalized.weightKg),
    mealsPerDay: Number(normalized.mealsPerDay),
    servings: Number(normalized.servings),
    targetCalories: normalized.targetCalories ? Number(normalized.targetCalories) : '',
    targetProtein: normalized.targetProtein ? Number(normalized.targetProtein) : '',
    preferences: normalized.dietType && normalized.dietType !== 'None' ? [normalized.dietType] : [],
    updatedAt: new Date()
  };
}

export function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return '';
  const number = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : '';
}

function firstPreference(preferences) {
  if (!Array.isArray(preferences) || preferences.length === 0) return '';
  return preferences[0];
}
