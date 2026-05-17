import {
  addGroceryItem,
  aggregateGroceriesByCategory,
  buildGroceryItem,
  createEmptyMealPlan,
  formatGroceryGroupsAsText,
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

test('aggregates grocery quantities only when units match', () => {
  const plan = createEmptyMealPlan();
  const firstChicken = buildGroceryItem({
    name: 'Chicken breast',
    quantity: 180,
    unit: 'g',
    category: 'Protein',
    sourceDay: 'Monday',
    sourceMeal: 'dinner'
  });
  const secondChicken = buildGroceryItem({
    name: 'Chicken breast',
    quantity: 170,
    unit: 'g',
    category: 'Protein',
    sourceDay: 'Tuesday',
    sourceMeal: 'lunch'
  });
  const chickenPack = buildGroceryItem({
    name: 'Chicken breast',
    quantity: 1,
    unit: 'pack',
    category: 'Protein',
    sourceDay: 'Wednesday',
    sourceMeal: 'dinner'
  });

  const updatedPlan = [firstChicken, secondChicken, chickenPack].reduce(addGroceryItem, plan);
  const grouped = aggregateGroceriesByCategory(updatedPlan);

  expect(grouped.Protein).toHaveLength(2);
  expect(grouped.Protein[0]).toMatchObject({
    name: 'Chicken breast',
    quantity: 350,
    unit: 'g'
  });
  expect(grouped.Protein[0].sourceIds).toHaveLength(2);
  expect(grouped.Protein[1]).toMatchObject({
    quantity: 1,
    unit: 'pack'
  });
});

test('formats aggregated grocery groups as copyable text', () => {
  const text = formatGroceryGroupsAsText({
    Produce: [{ name: 'Spinach', quantity: 2, unit: 'cups' }],
    Protein: [{ name: 'Chicken breast', quantity: 350, unit: 'g', alreadyHave: true }]
  });

  expect(text).toContain('Produce');
  expect(text).toContain('- Spinach - 2 cups');
  expect(text).toContain('- Chicken breast - 350 g (already have)');
});
