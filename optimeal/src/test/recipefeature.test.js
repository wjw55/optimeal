import { demoRecipes } from '../data/demoData';

test('demo recipe uses the structured recipe fields shown in the app', () => {
  const recipe = demoRecipes[0];

  expect(recipe).toMatchObject({
    title: expect.any(String),
    description: expect.any(String),
    ingredients: expect.any(Array),
    steps: expect.any(Array),
    prepTime: expect.any(Number),
    cookTime: expect.any(Number),
    servings: expect.any(Number),
    calories: expect.any(Number),
    protein: expect.any(Number),
    carbs: expect.any(Number),
    fats: expect.any(Number),
    tags: expect.any(Array),
    dietLabels: expect.any(Array)
  });
});
