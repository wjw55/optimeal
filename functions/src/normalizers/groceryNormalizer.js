const GROCERY_CATEGORIES = ["Produce", "Protein", "Dairy", "Grains", "Pantry", "Sauces", "Other"];

const CATEGORY_KEYWORDS = {
  Produce: ["apple", "banana", "berries", "broccoli", "carrot", "spinach", "lettuce", "tomato", "avocado", "pepper", "onion", "garlic", "lemon", "lime", "mushroom", "zucchini", "cucumber", "sweet potato"],
  Protein: ["chicken", "salmon", "turkey", "beef", "tofu", "egg", "eggs", "lentil", "beans", "tuna", "shrimp", "tempeh"],
  Dairy: ["milk", "cheese", "yogurt", "feta", "cream"],
  Grains: ["rice", "quinoa", "oats", "pasta", "bread", "wrap", "tortilla", "noodles"],
  Pantry: ["oil", "olive", "nuts", "almond", "peanut", "chia", "flour", "honey", "granola"],
  Sauces: ["sauce", "soy", "tahini", "salsa", "dressing", "vinegar", "pesto"]
};

function normalizeGroceryList(items, context = {}) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => normalizeGroceryItem(item, { ...context, index }));
}

function normalizeGroceryItem(item, context = {}) {
  const { day = null, meal = null, index = 0, migratedAt = null } = context;

  if (item && typeof item === "object" && !Array.isArray(item)) {
    const name = sanitizeName(item.name || item.ingredient || "");
    return {
      ...item,
      id: item.id || buildItemId(name, day, meal, index),
      name,
      quantity: item.quantity ?? "",
      unit: item.unit || "",
      category: GROCERY_CATEGORIES.includes(item.category) ? item.category : inferGroceryCategory(name),
      checked: Boolean(item.checked),
      sourceDay: item.sourceDay ?? day,
      sourceMeal: item.sourceMeal ?? meal,
      addedBy: item.addedBy || "ai"
    };
  }

  const rawText = String(item || "");
  const checked = /^\s*(\u2713|âœ“|Ã¢Å“â€œ)\s+/.test(rawText);
  const cleanText = sanitizeName(rawText.replace(/^\s*(\u2713|âœ“|Ã¢Å“â€œ)\s+/, ""));
  const match = cleanText.match(/^(.*?)(?:\s+\((.*?)\))?$/);
  const name = sanitizeName((match && match[1]) || cleanText);
  const quantityText = sanitizeName((match && match[2]) || "");

  return {
    id: buildItemId(name, day, meal, index),
    name,
    quantity: parseQuantity(quantityText),
    unit: parseUnit(quantityText),
    category: inferGroceryCategory(name),
    checked,
    sourceDay: day,
    sourceMeal: meal,
    addedBy: "migration",
    ...(migratedAt ? { migratedAt } : {})
  };
}

function inferGroceryCategory(name = "") {
  const lowerName = name.toLowerCase();
  const match = Object.entries(CATEGORY_KEYWORDS).find(([, keywords]) =>
    keywords.some((keyword) => lowerName.includes(keyword))
  );

  return match ? match[0] : "Other";
}

function hasLegacyGroceryStrings(mealPlan) {
  if (!mealPlan || typeof mealPlan !== "object") return false;
  return Object.values(mealPlan).some((dayPlan) => {
    if (!dayPlan || typeof dayPlan !== "object" || !dayPlan.groceries) return false;
    return Object.values(dayPlan.groceries).some((items) =>
      Array.isArray(items) && items.some((item) => typeof item === "string")
    );
  });
}

function migrateMealPlanGroceries(mealPlan, migratedAt = null) {
  if (!mealPlan || typeof mealPlan !== "object") return mealPlan;

  const nextPlan = JSON.parse(JSON.stringify(mealPlan));
  Object.entries(nextPlan).forEach(([day, dayPlan]) => {
    if (!dayPlan || typeof dayPlan !== "object" || !dayPlan.groceries) return;
    Object.entries(dayPlan.groceries).forEach(([meal, items]) => {
      dayPlan.groceries[meal] = normalizeGroceryList(items, { day, meal, migratedAt });
    });
  });

  return nextPlan;
}

function buildItemId(name, day, meal, index) {
  const source = `${day || "unknown"}-${meal || "unknown"}-${index}-${name || "item"}`;
  return `migration-${source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function parseQuantity(quantityText) {
  if (!quantityText) return 1;
  const numberMatch = quantityText.match(/^\d+(\.\d+)?/);
  return numberMatch ? Number(numberMatch[0]) : 1;
}

function parseUnit(quantityText) {
  if (!quantityText) return "";
  return quantityText.replace(/^\d+(\.\d+)?\s*/, "").trim();
}

function sanitizeName(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  GROCERY_CATEGORIES,
  normalizeGroceryItem,
  normalizeGroceryList,
  inferGroceryCategory,
  hasLegacyGroceryStrings,
  migrateMealPlanGroceries
};
