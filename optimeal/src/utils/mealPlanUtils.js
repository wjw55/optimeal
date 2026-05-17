export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

export const GROCERY_CATEGORIES = [
  'Produce',
  'Protein',
  'Dairy',
  'Grains',
  'Pantry',
  'Sauces',
  'Other'
];

const DEFAULT_NUTRITION = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0
};

const CATEGORY_KEYWORDS = {
  Produce: ['apple', 'banana', 'berries', 'broccoli', 'carrot', 'spinach', 'lettuce', 'tomato', 'avocado', 'pepper', 'onion', 'garlic', 'lemon', 'lime', 'mushroom', 'zucchini', 'cucumber', 'sweet potato'],
  Protein: ['chicken', 'salmon', 'turkey', 'beef', 'tofu', 'egg', 'eggs', 'lentil', 'beans', 'tuna', 'shrimp', 'tempeh', 'yogurt'],
  Dairy: ['milk', 'cheese', 'yogurt', 'feta', 'cream'],
  Grains: ['rice', 'quinoa', 'oats', 'pasta', 'bread', 'wrap', 'tortilla', 'noodles'],
  Pantry: ['oil', 'olive', 'nuts', 'almond', 'peanut', 'chia', 'flour', 'honey', 'granola'],
  Sauces: ['sauce', 'soy', 'tahini', 'salsa', 'dressing', 'vinegar', 'pesto']
};

export function createEmptyMealPlan() {
  return DAYS.reduce((acc, day) => {
    acc[day] = {
      meals: MEAL_TYPES.reduce((mealAcc, type) => {
        mealAcc[type] = createEmptyMeal(type);
        return mealAcc;
      }, {}),
      totalNutrition: { ...DEFAULT_NUTRITION },
      groceries: createEmptyGroceries()
    };
    return acc;
  }, {});
}

export function createEmptyGroceries() {
  return MEAL_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {});
}

export function normalizeMealPlan(rawPlan) {
  if (!rawPlan) {
    return createEmptyMealPlan();
  }

  const planSource = Array.isArray(rawPlan.days)
    ? rawPlan.days.reduce((acc, dayEntry) => {
        if (dayEntry?.day) {
          acc[dayEntry.day] = dayEntry;
        }
        return acc;
      }, {})
    : rawPlan.days || rawPlan;

  return DAYS.reduce((acc, day) => {
    const rawDay = planSource?.[day] || {};
    const mealMap = normalizeMealsForDay(rawDay);
    const groceries = normalizeGroceriesForDay(rawDay, day, mealMap);

    acc[day] = {
      meals: mealMap,
      totalNutrition: normalizeNutrition(rawDay.totalNutrition || rawDay.nutrition),
      groceries
    };
    return acc;
  }, {});
}

function normalizeMealsForDay(rawDay) {
  const mealsFromArray = Array.isArray(rawDay.meals)
    ? rawDay.meals.reduce((acc, meal) => {
        if (meal?.type) {
          acc[meal.type.toLowerCase()] = meal;
        }
        return acc;
      }, {})
    : {};

  const mealsFromObject = rawDay.meals && !Array.isArray(rawDay.meals) ? rawDay.meals : {};

  return MEAL_TYPES.reduce((acc, type) => {
    const rawMeal = mealsFromArray[type] || mealsFromObject[type] || rawDay[type];
    acc[type] = normalizeMeal(rawMeal, type);
    return acc;
  }, {});
}

export function normalizeMeal(rawMeal, type) {
  if (!rawMeal) {
    return createEmptyMeal(type);
  }

  if (typeof rawMeal === 'string') {
    return {
      ...createEmptyMeal(type),
      name: rawMeal
    };
  }

  return {
    type: (rawMeal.type || type).toLowerCase(),
    name: rawMeal.name || rawMeal.title || '',
    ingredients: Array.isArray(rawMeal.ingredients) ? rawMeal.ingredients : [],
    calories: toNumber(rawMeal.calories),
    protein: toNumber(rawMeal.protein),
    carbs: toNumber(rawMeal.carbs),
    fats: toNumber(rawMeal.fats),
    prepMinutes: toNumber(rawMeal.prepMinutes),
    reason: rawMeal.reason || ''
  };
}

function createEmptyMeal(type) {
  return {
    type,
    name: '',
    ingredients: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    prepMinutes: 0,
    reason: ''
  };
}

function normalizeGroceriesForDay(rawDay, day, meals) {
  const normalized = createEmptyGroceries();
  const rawGroceries = rawDay.groceries || {};

  MEAL_TYPES.forEach((type) => {
    const groceryList = Array.isArray(rawGroceries[type]) ? rawGroceries[type] : [];
    const ingredients = Array.isArray(meals[type]?.ingredients) ? meals[type].ingredients : [];
    const sourceItems = groceryList.length ? groceryList : ingredients;

    normalized[type] = sourceItems.map((item, index) =>
      normalizeGroceryItem(item, { day, meal: type, index })
    );
  });

  return normalized;
}

export function normalizeGroceryItem(rawItem, context = {}) {
  const { day = '', meal = '', index = 0 } = context;

  if (typeof rawItem === 'string') {
    if (/^\s*\u2713\s+/.test(rawItem)) {
      return normalizeCheckedGroceryString(rawItem, { day, meal, index });
    }

    const checked = rawItem.startsWith('✓ ') || rawItem.startsWith('âœ“ ');
    const cleanText = rawItem.replace(/^✓\s+/, '').replace(/^âœ“\s+/, '').trim();
    const match = cleanText.match(/^(.*?)(?:\s+\((.*?)\))?$/);
    const name = (match?.[1] || cleanText).trim();
    const quantityText = (match?.[2] || '').trim();

    return {
      id: buildItemId(name, day, meal, index),
      name,
      quantity: parseQuantity(quantityText),
      unit: parseUnit(quantityText),
      category: inferCategory(name),
      checked,
      sourceDay: day,
      sourceMeal: meal,
      addedBy: 'user'
    };
  }

  const name = rawItem?.name || rawItem?.ingredient || '';
  return {
    id: rawItem?.id || buildItemId(name, day, meal, index),
    name,
    quantity: rawItem?.quantity ?? '',
    unit: rawItem?.unit || '',
    category: GROCERY_CATEGORIES.includes(rawItem?.category) ? rawItem.category : inferCategory(name),
    checked: Boolean(rawItem?.checked),
    sourceDay: rawItem?.sourceDay || day,
    sourceMeal: rawItem?.sourceMeal || meal,
    addedBy: rawItem?.addedBy || 'ai'
  };
}

export function normalizeGroceryList(items, context = {}) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => normalizeGroceryItem(item, { ...context, index }));
}

export function buildGroceryItem({ name, quantity, unit, category, sourceDay, sourceMeal, addedBy = 'user' }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    quantity: quantity || '',
    unit: unit || '',
    category: GROCERY_CATEGORIES.includes(category) ? category : inferCategory(name),
    checked: false,
    sourceDay,
    sourceMeal,
    addedBy
  };
}

export function groupGroceriesByCategory(plan, selectedDay = 'all') {
  const normalizedPlan = normalizeMealPlan(plan);
  const grouped = GROCERY_CATEGORIES.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {});

  DAYS.filter((day) => selectedDay === 'all' || day === selectedDay).forEach((day) => {
    MEAL_TYPES.forEach((meal) => {
      normalizedPlan[day].groceries[meal].forEach((item) => {
        const category = GROCERY_CATEGORIES.includes(item.category) ? item.category : 'Other';
        grouped[category].push({ ...item, sourceDay: day, sourceMeal: meal });
      });
    });
  });

  return grouped;
}

export function countGroceries(plan) {
  return Object.values(groupGroceriesByCategory(plan)).reduce((count, items) => count + items.length, 0);
}

export function countPlannedMeals(plan) {
  const normalizedPlan = normalizeMealPlan(plan);
  return DAYS.reduce((count, day) => {
    return count + MEAL_TYPES.filter((type) => normalizedPlan[day].meals[type]?.name).length;
  }, 0);
}

export function calculateWeeklyAverage(plan, fallbackNutrition = DEFAULT_NUTRITION) {
  const normalizedPlan = normalizeMealPlan(plan);
  const filledDays = DAYS.filter((day) => normalizedPlan[day].totalNutrition.calories > 0);

  if (!filledDays.length) {
    return normalizeNutrition(fallbackNutrition);
  }

  const totals = filledDays.reduce((acc, day) => {
    const nutrition = normalizedPlan[day].totalNutrition;
    acc.calories += nutrition.calories;
    acc.protein += nutrition.protein;
    acc.carbs += nutrition.carbs;
    acc.fats += nutrition.fats;
    return acc;
  }, { ...DEFAULT_NUTRITION });

  return {
    calories: Math.round(totals.calories / filledDays.length),
    protein: Math.round(totals.protein / filledDays.length),
    carbs: Math.round(totals.carbs / filledDays.length),
    fats: Math.round(totals.fats / filledDays.length)
  };
}

export function updateGroceryItem(plan, itemId, updater) {
  const nextPlan = structuredCloneSafe(normalizeMealPlan(plan));

  DAYS.forEach((day) => {
    MEAL_TYPES.forEach((meal) => {
      nextPlan[day].groceries[meal] = nextPlan[day].groceries[meal].map((item) => {
        if (item.id !== itemId) return item;
        return typeof updater === 'function' ? updater(item) : { ...item, ...updater };
      });
    });
  });

  return nextPlan;
}

export function deleteGroceryItem(plan, itemId) {
  const nextPlan = structuredCloneSafe(normalizeMealPlan(plan));

  DAYS.forEach((day) => {
    MEAL_TYPES.forEach((meal) => {
      nextPlan[day].groceries[meal] = nextPlan[day].groceries[meal].filter((item) => item.id !== itemId);
    });
  });

  return nextPlan;
}

export function clearPurchasedGroceries(plan) {
  const nextPlan = structuredCloneSafe(normalizeMealPlan(plan));

  DAYS.forEach((day) => {
    MEAL_TYPES.forEach((meal) => {
      nextPlan[day].groceries[meal] = nextPlan[day].groceries[meal].filter((item) => !item.checked);
    });
  });

  return nextPlan;
}

export function addGroceryItem(plan, item) {
  const nextPlan = structuredCloneSafe(normalizeMealPlan(plan));
  const day = item.sourceDay || 'Monday';
  const meal = item.sourceMeal || 'dinner';

  if (!nextPlan[day]) {
    nextPlan[day] = createEmptyMealPlan()[day];
  }

  if (!nextPlan[day].groceries[meal]) {
    nextPlan[day].groceries[meal] = [];
  }

  nextPlan[day].groceries[meal].push(item);
  return nextPlan;
}

export function normalizeNutrition(rawNutrition) {
  return {
    calories: toNumber(rawNutrition?.calories),
    protein: toNumber(rawNutrition?.protein),
    carbs: toNumber(rawNutrition?.carbs),
    fats: toNumber(rawNutrition?.fats)
  };
}

export function planHasMeals(plan) {
  return countPlannedMeals(plan) > 0;
}

export function mealDisplayName(type) {
  if (type === 'snacks') return 'Snacks';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function inferCategory(name = '') {
  return inferGroceryCategory(name);
}

export function inferGroceryCategory(name = '') {
  const lowerName = name.toLowerCase();
  const match = Object.entries(CATEGORY_KEYWORDS).find(([, keywords]) =>
    keywords.some((keyword) => lowerName.includes(keyword))
  );

  return match?.[0] || 'Other';
}

function parseQuantity(quantityText) {
  if (!quantityText) return '';
  const numberMatch = quantityText.match(/^\d+(\.\d+)?/);
  return numberMatch ? Number(numberMatch[0]) : quantityText;
}

function normalizeCheckedGroceryString(rawItem, { day, meal, index }) {
  const cleanText = rawItem.replace(/^\s*\u2713\s+/, '').trim();
  const match = cleanText.match(/^(.*?)(?:\s+\((.*?)\))?$/);
  const name = (match?.[1] || cleanText).trim();
  const quantityText = (match?.[2] || '').trim();

  return {
    id: buildItemId(name, day, meal, index),
    name,
    quantity: parseQuantity(quantityText),
    unit: parseUnit(quantityText),
    category: inferCategory(name),
    checked: true,
    sourceDay: day,
    sourceMeal: meal,
    addedBy: 'user'
  };
}

function parseUnit(quantityText) {
  if (!quantityText) return '';
  return quantityText.replace(/^\d+(\.\d+)?\s*/, '').trim();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function buildItemId(name, day, meal, index) {
  return `${day}-${meal}-${index}-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}
