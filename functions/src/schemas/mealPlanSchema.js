const { z } = require("zod");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];
const REQUIRED_MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const GROCERY_CATEGORIES = ["Produce", "Protein", "Dairy", "Grains", "Pantry", "Sauces", "Other"];

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

function parseAndValidateMealPlan(rawResponse) {
  const json = typeof rawResponse === "string" ? extractJson(rawResponse) : rawResponse;
  const parsed = typeof json === "string" ? JSON.parse(json) : json;
  return mealPlanSchema.parse(parsed);
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

function parseNumeric(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

module.exports = {
  DAYS,
  MEAL_TYPES,
  GROCERY_CATEGORIES,
  mealPlanSchema,
  parseAndValidateMealPlan
};
