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
    age: profile.age,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    dietType: profile.dietType,
    allergies: profile.allergies,
    customAllergies: profile.customAllergies,
    foodsToAvoid: profile.foodsToAvoid,
    preferredCuisines: profile.preferredCuisines,
    cookingSkill: profile.cookingSkill,
    cookingTime: profile.cookingTime,
    budgetLevel: profile.budgetLevel,
    mealsPerDay: profile.mealsPerDay,
    servings: profile.servings,
    appliances: profile.appliances,
    targetCalories: profile.targetCalories || null,
    targetProtein: profile.targetProtein || null
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

module.exports = {
  buildMealPlanPrompt,
  exampleSchema
};
