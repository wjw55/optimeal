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

export function validateProfile(profile, { requireBasics = true } = {}) {
  const normalized = normalizeProfile(profile);

  if (requireBasics && !normalized.username.trim()) {
    return { valid: false, message: 'Please add a username.' };
  }

  if (requireBasics && !inRange(normalized.age, 13, 100)) {
    return { valid: false, message: 'Please enter an age between 13 and 100.' };
  }

  if (requireBasics && !inRange(normalized.heightCm, 80, 250)) {
    return { valid: false, message: 'Please enter height in centimeters between 80 and 250.' };
  }

  if (requireBasics && !inRange(normalized.weightKg, 25, 350)) {
    return { valid: false, message: 'Please enter weight in kilograms between 25 and 350.' };
  }

  if (!inRange(normalized.mealsPerDay, 1, 6)) {
    return { valid: false, message: 'Meals per day should be between 1 and 6.' };
  }

  if (!inRange(normalized.servings, 1, 8)) {
    return { valid: false, message: 'Servings should be between 1 and 8.' };
  }

  if (normalized.targetCalories && !inRange(normalized.targetCalories, 1000, 6000)) {
    return { valid: false, message: 'Optional target calories should be between 1000 and 6000.' };
  }

  if (normalized.targetProtein && !inRange(normalized.targetProtein, 0, 350)) {
    return { valid: false, message: 'Optional protein target should be between 0 and 350 grams.' };
  }

  return { valid: true, message: '' };
}

export function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return '';
  const number = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : '';
}

function inRange(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function firstPreference(preferences) {
  if (!Array.isArray(preferences) || preferences.length === 0) return '';
  return preferences[0];
}
