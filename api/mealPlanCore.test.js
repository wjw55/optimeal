const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DAYS,
  buildMealPlanPrompt,
  calculateWeeklyAverage,
  inferGroceryCategory,
  normalizeMealPlanForFirestore,
  parseMealPlanJson,
  validateMealPlanCandidate
} = require("./mealPlanCore");

test("compact meal-plan output validates without derived fields", () => {
  const validated = validateMealPlanCandidate(compactCandidate());

  assert.equal(validated.days.length, 7);
  assert.equal(validated.days[0].meals.length, 3);
  assert.equal(validated.days[0].totalNutrition, undefined);
  assert.equal(validated.days[0].meals[0].reason, undefined);
  assert.equal(validated.days[0].meals[0].ingredients[0].category, undefined);
});

test("validation rejects incomplete weeks and missing required meals", () => {
  const incompleteWeek = compactCandidate();
  incompleteWeek.days.pop();
  assert.throws(() => validateMealPlanCandidate(incompleteWeek));

  const missingBreakfast = compactCandidate();
  missingBreakfast.days[0].meals = missingBreakfast.days[0].meals.filter(
    (meal) => meal.type !== "breakfast"
  );
  assert.throws(() => validateMealPlanCandidate(missingBreakfast));

  const duplicateDinner = compactCandidate();
  duplicateDinner.days[0].meals.push({
    ...duplicateDinner.days[0].meals[2],
    name: "Second dinner"
  });
  assert.throws(
    () => validateMealPlanCandidate(duplicateDinner),
    /duplicate meal types/
  );
});

test("normalization restores the public meal-plan contract", () => {
  const validated = validateMealPlanCandidate(compactCandidate());
  const normalized = normalizeMealPlanForFirestore(validated);

  assert.deepEqual(normalized.Monday.totalNutrition, {
    calories: 1700,
    protein: 120,
    carbs: 170,
    fats: 55
  });
  assert.equal(normalized.Monday.meals.breakfast.reason, "");
  assert.equal(normalized.Monday.meals.snacks.name, "");
  assert.equal(normalized.Monday.groceries.breakfast[0].sourceDay, "Monday");
  assert.equal(normalized.Monday.groceries.breakfast[0].sourceMeal, "breakfast");

  const categories = Object.fromEntries(
    normalized.Monday.meals.breakfast.ingredients.map((ingredient) => [
      ingredient.name,
      ingredient.category
    ])
  );
  assert.deepEqual(categories, {
    "Greek yogurt": "Dairy",
    "Soy sauce": "Sauces",
    Tofu: "Protein",
    Spinach: "Produce",
    Rice: "Grains",
    "Olive oil": "Pantry",
    "Mystery ingredient": "Other"
  });

  assert.deepEqual(calculateWeeklyAverage(normalized), normalized.Monday.totalNutrition);
});

test("legacy provider fields remain accepted but derived values win", () => {
  const candidate = compactCandidate();
  candidate.days.forEach((day) => {
    day.totalNutrition = { calories: 1, protein: 1, carbs: 1, fats: 1 };
    day.meals.forEach((meal) => {
      meal.reason = "A legacy generated explanation.";
      meal.ingredients.forEach((ingredient) => {
        ingredient.category = "Other";
      });
    });
  });

  const normalized = normalizeMealPlanForFirestore(validateMealPlanCandidate(candidate));

  assert.equal(normalized.Monday.meals.breakfast.reason, "");
  assert.equal(normalized.Monday.meals.breakfast.ingredients[0].category, "Dairy");
  assert.equal(normalized.Monday.totalNutrition.calories, 1700);
});

test("category inference handles priority collisions and unknown items", () => {
  assert.equal(inferGroceryCategory("Greek yogurt"), "Dairy");
  assert.equal(inferGroceryCategory("Low-sodium soy sauce"), "Sauces");
  assert.equal(inferGroceryCategory("Firm tofu"), "Protein");
  assert.equal(inferGroceryCategory("Baby spinach"), "Produce");
  assert.equal(inferGroceryCategory("Brown rice"), "Grains");
  assert.equal(inferGroceryCategory("Extra virgin olive oil"), "Pantry");
  assert.equal(inferGroceryCategory("Unsweetened almond milk"), "Pantry");
  assert.equal(inferGroceryCategory("Mystery ingredient"), "Other");
});

test("JSON extraction supports wrappers and rejects malformed responses", () => {
  const candidate = compactCandidate();
  const wrapped = `Here is the plan:\n\`\`\`json\n${JSON.stringify({ mealPlan: candidate })}\n\`\`\``;

  assert.deepEqual(parseMealPlanJson(wrapped), candidate);
  assert.throws(() => parseMealPlanJson("The model did not return JSON."));
  assert.throws(() => parseMealPlanJson("{invalid json}"));
});

test("prompt requests the compact contract and all seven days", () => {
  const prompt = buildMealPlanPrompt({
    goal: "Maintain weight",
    dietType: "Vegetarian",
    preferredCuisines: ["Mediterranean"],
    allergies: []
  });

  DAYS.forEach((day) => assert.match(prompt, new RegExp(day)));
  assert.match(prompt, /Do not return reason, ingredient category, totalNutrition/);
  assert.match(prompt, /Ingredient = \{"name": string, "quantity": number, "unit": string\}/);
  assert.doesNotMatch(prompt, /Greek yogurt bowl/);
});

function compactCandidate() {
  return {
    days: DAYS.map((day) => ({
      day,
      meals: [
        meal("breakfast", "Protein breakfast", 400, 30, 40, 10, [
          ingredient("Greek yogurt", 200, "g"),
          ingredient("Soy sauce", 1, "tbsp"),
          ingredient("Tofu", 100, "g"),
          ingredient("Spinach", 1, "cup"),
          ingredient("Rice", 60, "g"),
          ingredient("Olive oil", 1, "tsp"),
          ingredient("Mystery ingredient", 1, "piece")
        ]),
        meal("lunch", "Balanced lunch", 600, 40, 60, 20, [
          ingredient("Chicken breast", 160, "g")
        ]),
        meal("dinner", "Practical dinner", 700, 50, 70, 25, [
          ingredient("Salmon fillet", 170, "g")
        ])
      ]
    }))
  };
}

function meal(type, name, calories, protein, carbs, fats, ingredients) {
  return {
    type,
    name,
    ingredients,
    calories,
    protein,
    carbs,
    fats,
    prepMinutes: 20
  };
}

function ingredient(name, quantity, unit) {
  return { name, quantity, unit };
}
