import {
  addGroceryItem,
  buildGroceryItem,
  createEmptyMealPlan,
  groupGroceriesByCategory,
  updateGroceryItem
} from '../utils/mealPlanUtils';

test('adds structured grocery items without encoding checked state in the name', () => {
  const plan = createEmptyMealPlan();
  const item = buildGroceryItem({
    name: 'Broccoli',
    quantity: 2,
    unit: 'heads',
    category: 'Produce',
    sourceDay: 'Tuesday',
    sourceMeal: 'lunch'
  });

  const updatedPlan = addGroceryItem(plan, item);
  const grouped = groupGroceriesByCategory(updatedPlan, 'Tuesday');
  expect(grouped.Produce[0]).toMatchObject({
    name: 'Broccoli',
    quantity: 2,
    unit: 'heads',
    checked: false,
    sourceDay: 'Tuesday',
    sourceMeal: 'lunch'
  });

  const checkedPlan = updateGroceryItem(updatedPlan, item.id, { checked: true });
  const checkedItem = groupGroceriesByCategory(checkedPlan, 'Tuesday').Produce[0];
  expect(checkedItem.name).toBe('Broccoli');
  expect(checkedItem.checked).toBe(true);
});
