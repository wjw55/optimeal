import { demoMealPlan } from '../data/demoData';
import { countPlannedMeals, normalizeMealPlan } from '../utils/mealPlanUtils';

test('meal plan normalization supports structured function output', () => {
  const normalized = normalizeMealPlan(demoMealPlan);

  expect(Object.keys(normalized)).toHaveLength(7);
  expect(countPlannedMeals(normalized)).toBeGreaterThanOrEqual(21);
  expect(normalized.Monday.meals.breakfast.name).toBe('Berry protein oats');
  expect(normalized.Monday.groceries.breakfast[0]).toMatchObject({
    name: 'Rolled oats',
    checked: false,
    sourceDay: 'Monday',
    sourceMeal: 'breakfast'
  });
});
