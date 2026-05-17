const { z } = require("zod");

const stringField = z.preprocess((value) => sanitizeString(value), z.string().max(160));
const optionalStringField = z.preprocess((value) => sanitizeString(value), z.string().max(600).optional());
const stringArray = z.preprocess((value) => normalizeStringArray(value), z.array(z.string().min(1).max(80)).max(20));

const profileSchema = z.object({
  username: stringField.optional(),
  email: stringField.optional(),
  age: numberFromUnknown(13, 100, "age"),
  sex: stringField.optional(),
  heightCm: numberFromUnknown(80, 250, "heightCm"),
  weightKg: numberFromUnknown(25, 350, "weightKg"),
  activityLevel: stringField,
  goal: stringField,
  dietType: stringField.default("None"),
  allergies: stringArray.default([]),
  customAllergies: optionalStringField.default(""),
  foodsToAvoid: optionalStringField.default(""),
  preferredCuisines: stringArray.default([]),
  cookingSkill: stringField.default("Intermediate"),
  cookingTime: stringField.default("30 minutes"),
  budgetLevel: stringField.default("Moderate"),
  mealsPerDay: numberFromUnknown(1, 6, "mealsPerDay").default(3),
  servings: numberFromUnknown(1, 8, "servings").default(1),
  appliances: stringArray.default([]),
  targetCalories: optionalNumberFromUnknown(1000, 6000, "targetCalories"),
  targetProtein: optionalNumberFromUnknown(0, 350, "targetProtein"),
  preferences: z.any().optional()
});

function validateProfileInput(rawProfile) {
  const normalized = normalizeLegacyProfile(rawProfile || {});
  const result = profileSchema.safeParse(normalized);

  if (!result.success) {
    return {
      success: false,
      message: "Profile data is incomplete or outside supported ranges."
    };
  }

  return {
    success: true,
    profile: result.data
  };
}

function normalizeLegacyProfile(rawProfile) {
  const preferences = normalizeStringArray(rawProfile.preferences);
  return {
    ...rawProfile,
    heightCm: rawProfile.heightCm ?? rawProfile.height,
    weightKg: rawProfile.weightKg ?? rawProfile.weight,
    dietType: rawProfile.dietType || preferences[0] || "None",
    allergies: normalizeStringArray(rawProfile.allergies),
    preferredCuisines: normalizeStringArray(rawProfile.preferredCuisines),
    appliances: normalizeStringArray(rawProfile.appliances)
  };
}

function numberFromUnknown(min, max, fieldName) {
  return z.preprocess((value) => parseNumber(value), z.number({
    required_error: `${fieldName} is required`,
    invalid_type_error: `${fieldName} must be a number`
  }).min(min).max(max));
}

function optionalNumberFromUnknown(min, max, fieldName) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return parseNumber(value);
  }, z.number({
    invalid_type_error: `${fieldName} must be a number`
  }).min(min).max(max).optional());
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
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

module.exports = {
  validateProfileInput,
  normalizeLegacyProfile,
  sanitizeString,
  normalizeStringArray
};
