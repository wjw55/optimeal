const { z } = require("zod");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snacks"];
const REQUIRED_MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const GROCERY_CATEGORIES = ["Produce", "Protein", "Dairy", "Grains", "Pantry", "Sauces", "Other"];

const MEAL_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["days"],
  properties: {
    days: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day", "meals"],
        properties: {
          day: { type: "string", enum: DAYS },
          meals: {
            type: "array",
            minItems: 3,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "type",
                "name",
                "ingredients",
                "calories",
                "protein",
                "carbs",
                "fats",
                "prepMinutes"
              ],
              properties: {
                type: { type: "string", enum: MEAL_TYPES },
                name: { type: "string", minLength: 1, maxLength: 140 },
                ingredients: {
                  type: "array",
                  minItems: 1,
                  maxItems: 20,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "quantity", "unit"],
                    properties: {
                      name: { type: "string", minLength: 1, maxLength: 120 },
                      quantity: { type: "number", minimum: 0, maximum: 100000 },
                      unit: { type: "string", maxLength: 40 }
                    }
                  }
                },
                calories: { type: "number", minimum: 0, maximum: 6000 },
                protein: { type: "number", minimum: 0, maximum: 1000 },
                carbs: { type: "number", minimum: 0, maximum: 1000 },
                fats: { type: "number", minimum: 0, maximum: 1000 },
                prepMinutes: { type: "number", minimum: 0, maximum: 1440 }
              }
            }
          }
        }
      }
    }
  }
};

const PLANT_MILKS = ["almond milk", "oat milk", "soy milk", "coconut milk", "rice milk"];
const CATEGORY_RULES = [
  ["Sauces", ["soy sauce", "hot sauce", "fish sauce", "tomato sauce", "pasta sauce", "sauce", "dressing", "vinegar", "pesto", "salsa", "tahini", "mayonnaise", "mustard", "ketchup"]],
  ["Dairy", ["greek yogurt", "cottage cheese", "cream cheese", "yogurt", "milk", "cheese", "feta", "ricotta", "cream", "butter"]],
  ["Protein", ["chicken", "turkey", "beef", "pork", "lamb", "salmon", "tuna", "shrimp", "prawn", "cod", "sardine", "egg", "tofu", "tempeh", "seitan", "lentil", "chickpea", "bean", "edamame"]],
  ["Produce", ["apple", "banana", "berry", "berries", "orange", "mango", "pineapple", "grape", "broccoli", "carrot", "spinach", "lettuce", "tomato", "avocado", "pepper", "onion", "garlic", "lemon", "lime", "mushroom", "zucchini", "cucumber", "potato", "kale", "cabbage", "celery", "herb", "cilantro", "parsley"]],
  ["Grains", ["rice", "quinoa", "oat", "pasta", "bread", "wrap", "tortilla", "noodle", "couscous", "barley", "farro", "flour"]],
  ["Pantry", ["olive oil", "coconut oil", "oil", "almond", "peanut", "cashew", "walnut", "nut", "chia", "seed", "honey", "maple syrup", "granola", "spice", "paprika", "cumin", "stock", "broth"]]
];

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
  category: z.enum(GROCERY_CATEGORIES).optional()
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
  reason: z.string().trim().min(1).max(300).optional()
}).strict();

const daySchema = z.object({
  day: z.enum(DAYS),
  meals: z.array(mealSchema).min(3).max(4),
  totalNutrition: nutritionSchema.optional()
}).strict().superRefine((day, ctx) => {
  const mealTypes = new Set(day.meals.map((meal) => meal.type));

  if (mealTypes.size !== day.meals.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["meals"],
      message: `${day.day} contains duplicate meal types`
    });
  }

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

function buildMealPlanPrompt(profile) {
  return [
    "Create a practical 7-day meal plan for Optimeal.",
    "Return ONLY one valid JSON object. Do not include markdown, comments, prose, or code fences.",
    "Use this compact contract (notation only; the returned value must be valid JSON):",
    'Root = {"days": Day[7]}',
    `Day = {"day": one of ${JSON.stringify(DAYS)}, "meals": Meal[3..4]}`,
    'Meal = {"type": "breakfast"|"lunch"|"dinner"|"snacks", "name": string, "ingredients": Ingredient[], "calories": number, "protein": number, "carbs": number, "fats": number, "prepMinutes": number}',
    'Ingredient = {"name": string, "quantity": number, "unit": string}',
    "",
    "Rules:",
    "- Include exactly Monday through Sunday once each.",
    "- Include breakfast, lunch, and dinner once for every day. Include one snacks meal only when useful.",
    "- Use short meal and ingredient names, realistic numeric quantities, and concise units.",
    "- Keep each meal simple with 3 to 6 ingredients. Output compact JSON without indentation or extra whitespace.",
    "- Do not return reason, ingredient category, totalNutrition, grocery lists, IDs, or source fields; the server derives them.",
    "- Avoid allergens and foods to avoid.",
    "- Keep meals compatible with diet type, cuisines, budget, cooking skill, appliances, servings, and time.",
    "- Meal nutrition should be realistic and fit the user's daily calorie and protein targets across the day.",
    "",
    "User profile:",
    JSON.stringify(publicProfile(profile))
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

function parseMealPlanJson(rawResponse) {
  const extracted = typeof rawResponse === "string" ? extractJson(rawResponse) : rawResponse;
  const parsed = typeof extracted === "string" ? JSON.parse(extracted) : extracted;
  return parsed && parsed.mealPlan && Array.isArray(parsed.mealPlan.days)
    ? parsed.mealPlan
    : parsed;
}

function validateMealPlanCandidate(candidate) {
  return mealPlanSchema.parse(candidate);
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
      totalNutrition: calculateDayNutrition(meals),
      groceries: MEAL_TYPES.reduce((groceryAcc, type) => {
        groceryAcc[type] = meals[type].ingredients.map((ingredient, index) => ({
          id: buildGroceryId(day, type, ingredient.name, index),
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit || "",
          category: ingredient.category,
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
    ingredients: meal.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit || "",
      category: inferGroceryCategory(ingredient.name)
    })),
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fats: meal.fats,
    prepMinutes: meal.prepMinutes,
    reason: "",
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

function calculateDayNutrition(meals) {
  const totals = MEAL_TYPES.reduce((acc, type) => {
    const meal = meals[type] || {};
    acc.calories += Number(meal.calories) || 0;
    acc.protein += Number(meal.protein) || 0;
    acc.carbs += Number(meal.carbs) || 0;
    acc.fats += Number(meal.fats) || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fats: Math.round(totals.fats)
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

  if (PLANT_MILKS.some((item) => lowerName.includes(item))) {
    return "Pantry";
  }

  const match = CATEGORY_RULES.find(([, keywords]) =>
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

module.exports = {
  DAYS,
  MEAL_TYPES,
  GROCERY_CATEGORIES,
  MEAL_PLAN_JSON_SCHEMA,
  buildMealPlanPrompt,
  calculateWeeklyAverage,
  inferGroceryCategory,
  normalizeMealPlanForFirestore,
  parseMealPlanJson,
  validateMealPlanCandidate
};
