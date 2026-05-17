const { DAYS, MEAL_TYPES, GROCERY_CATEGORIES } = require("../schemas/mealPlanSchema");
const { inferGroceryCategory } = require("./groceryNormalizer");

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
      totalNutrition: dayPlan.totalNutrition,
      groceries: MEAL_TYPES.reduce((groceryAcc, type) => {
        const meal = meals[type];
        groceryAcc[type] = meal.ingredients.map((ingredient, index) => ({
          id: buildGroceryId(day, type, ingredient.name, index),
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit || "",
          category: GROCERY_CATEGORIES.includes(ingredient.category)
            ? ingredient.category
            : inferGroceryCategory(ingredient.name),
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
    ingredients: meal.ingredients,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fats: meal.fats,
    prepMinutes: meal.prepMinutes,
    reason: meal.reason,
    sourceDay: day
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

function buildGroceryId(day, mealType, name, index) {
  return `${day}-${mealType}-${index}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

module.exports = {
  normalizeMealPlanForFirestore,
  calculateWeeklyAverage
};
