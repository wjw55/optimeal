import { demoMealPlan } from '../data/demoData';
import { countGroceries, countPlannedMeals, normalizeMeal, normalizeMealPlan } from '../utils/mealPlanUtils';

test('meal plan normalization supports structured function output', () => {
  const normalized = normalizeMealPlan(demoMealPlan);

  expect(Object.keys(normalized)).toHaveLength(7);
  expect(countPlannedMeals(normalized)).toBeGreaterThanOrEqual(21);
  expect(countGroceries(normalized)).toBeGreaterThan(0);
  expect(normalized.Monday.meals.breakfast.name).toBe('Berry protein oats');
  expect(normalized.Monday.totalNutrition.calories).toBeGreaterThan(0);
  expect(normalized.Monday.groceries.breakfast[0]).toMatchObject({
    name: 'Rolled oats',
    category: expect.any(String),
    checked: false,
    sourceDay: 'Monday',
    sourceMeal: 'breakfast'
  });
});

test('meal normalization accepts compact generated meals without a reason', () => {
  const normalized = normalizeMeal({
    type: 'breakfast',
    name: 'Quick oats',
    ingredients: [{ name: 'Rolled oats', quantity: 60, unit: 'g', category: 'Grains' }],
    calories: 400,
    protein: 20,
    carbs: 55,
    fats: 10,
    prepMinutes: 8
  }, 'breakfast');

  expect(normalized.reason).toBe('');
});
