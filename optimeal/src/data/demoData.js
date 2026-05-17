export const demoProfile = {
  username: 'Demo profile',
  age: 28,
  sex: 'Prefer not to say',
  heightCm: 175,
  weightKg: 72,
  activityLevel: 'Moderate',
  goal: 'Maintain weight',
  dietType: 'High protein',
  allergies: ['Dairy-free'],
  foodsToAvoid: 'Minimal added sugar',
  preferredCuisines: ['Mediterranean', 'Japanese'],
  cookingSkill: 'Intermediate',
  cookingTime: '30 minutes',
  budgetLevel: 'Moderate',
  mealsPerDay: 3,
  servings: 1,
  appliances: ['Stove', 'Oven', 'Rice cooker'],
  targetCalories: 2050,
  targetProtein: 140
};

export const demoMealPlan = {
  days: [
    {
      day: 'Monday',
      meals: [
        meal('breakfast', 'Berry protein oats', 430, 32, 52, 11, 10, [
          ingredient('Rolled oats', 60, 'g'),
          ingredient('Pea protein', 1, 'scoop'),
          ingredient('Blueberries', 80, 'g')
        ]),
        meal('lunch', 'Chicken quinoa power bowl', 610, 48, 62, 18, 25, [
          ingredient('Chicken breast', 180, 'g'),
          ingredient('Quinoa', 75, 'g'),
          ingredient('Spinach', 2, 'cups')
        ]),
        meal('dinner', 'Salmon rice plate', 720, 50, 68, 26, 30, [
          ingredient('Salmon fillet', 170, 'g'),
          ingredient('Brown rice', 80, 'g'),
          ingredient('Broccoli', 1, 'head')
        ])
      ],
      totalNutrition: nutrition(1760, 130, 182, 55)
    },
    {
      day: 'Tuesday',
      meals: [
        meal('breakfast', 'Egg white veggie scramble', 390, 34, 30, 14, 12, [
          ingredient('Egg whites', 250, 'ml'),
          ingredient('Eggs', 1, 'large'),
          ingredient('Bell pepper', 1, 'piece')
        ]),
        meal('lunch', 'Turkey avocado wrap', 560, 42, 54, 19, 15, [
          ingredient('Turkey slices', 150, 'g'),
          ingredient('Whole grain wrap', 1, 'piece'),
          ingredient('Avocado', 0.5, 'piece')
        ]),
        meal('dinner', 'Tofu soba stir fry', 690, 39, 84, 22, 25, [
          ingredient('Firm tofu', 200, 'g'),
          ingredient('Soba noodles', 90, 'g'),
          ingredient('Mixed vegetables', 2, 'cups')
        ])
      ],
      totalNutrition: nutrition(1640, 115, 168, 55)
    },
    {
      day: 'Wednesday',
      meals: [
        meal('breakfast', 'Banana almond smoothie', 450, 35, 48, 14, 8, [
          ingredient('Banana', 1, 'piece'),
          ingredient('Almond milk', 300, 'ml'),
          ingredient('Pea protein', 1, 'scoop')
        ]),
        meal('lunch', 'Tuna chickpea salad', 590, 45, 58, 18, 15, [
          ingredient('Tuna', 1, 'can'),
          ingredient('Chickpeas', 120, 'g'),
          ingredient('Cucumber', 1, 'piece')
        ]),
        meal('dinner', 'Lean beef sweet potato skillet', 760, 52, 72, 25, 30, [
          ingredient('Lean beef', 170, 'g'),
          ingredient('Sweet potato', 1, 'large'),
          ingredient('Green beans', 1, 'cup')
        ])
      ],
      totalNutrition: nutrition(1800, 132, 178, 57)
    },
    {
      day: 'Thursday',
      meals: [
        meal('breakfast', 'Chia protein pudding', 420, 31, 44, 14, 10, [
          ingredient('Chia seeds', 30, 'g'),
          ingredient('Almond milk', 250, 'ml'),
          ingredient('Strawberries', 100, 'g')
        ]),
        meal('lunch', 'Shrimp rice bowl', 620, 44, 70, 16, 20, [
          ingredient('Shrimp', 180, 'g'),
          ingredient('Jasmine rice', 80, 'g'),
          ingredient('Edamame', 80, 'g')
        ]),
        meal('dinner', 'Chicken lentil curry', 770, 56, 78, 22, 35, [
          ingredient('Chicken breast', 170, 'g'),
          ingredient('Lentils', 120, 'g'),
          ingredient('Curry sauce', 0.5, 'cup')
        ])
      ],
      totalNutrition: nutrition(1810, 131, 192, 52)
    },
    {
      day: 'Friday',
      meals: [
        meal('breakfast', 'Avocado egg toast', 480, 28, 46, 22, 12, [
          ingredient('Whole grain bread', 2, 'slices'),
          ingredient('Eggs', 2, 'large'),
          ingredient('Avocado', 0.5, 'piece')
        ]),
        meal('lunch', 'Mediterranean chicken salad', 600, 47, 48, 24, 15, [
          ingredient('Chicken breast', 170, 'g'),
          ingredient('Mixed greens', 3, 'cups'),
          ingredient('Quinoa', 60, 'g')
        ]),
        meal('dinner', 'Turkey chili bowl', 760, 55, 82, 20, 35, [
          ingredient('Ground turkey', 180, 'g'),
          ingredient('Black beans', 120, 'g'),
          ingredient('Tomatoes', 1, 'can')
        ])
      ],
      totalNutrition: nutrition(1840, 130, 176, 66)
    },
    {
      day: 'Saturday',
      meals: [
        meal('breakfast', 'Protein pancakes', 520, 38, 58, 16, 20, [
          ingredient('Oats', 60, 'g'),
          ingredient('Egg whites', 200, 'ml'),
          ingredient('Banana', 1, 'piece')
        ]),
        meal('lunch', 'Salmon sushi bowl', 690, 43, 76, 24, 20, [
          ingredient('Salmon', 150, 'g'),
          ingredient('Sushi rice', 90, 'g'),
          ingredient('Cucumber', 1, 'piece')
        ]),
        meal('dinner', 'Chicken pesto pasta', 800, 54, 88, 24, 30, [
          ingredient('Chicken breast', 170, 'g'),
          ingredient('Pasta', 90, 'g'),
          ingredient('Pesto', 2, 'tbsp')
        ])
      ],
      totalNutrition: nutrition(2010, 135, 222, 64)
    },
    {
      day: 'Sunday',
      meals: [
        meal('breakfast', 'Tofu breakfast hash', 470, 32, 50, 16, 20, [
          ingredient('Firm tofu', 180, 'g'),
          ingredient('Sweet potato', 1, 'medium'),
          ingredient('Spinach', 2, 'cups')
        ]),
        meal('lunch', 'Chicken hummus plate', 620, 46, 58, 22, 15, [
          ingredient('Chicken breast', 160, 'g'),
          ingredient('Hummus', 80, 'g'),
          ingredient('Pita', 1, 'piece')
        ]),
        meal('dinner', 'Ginger beef rice bowl', 780, 52, 84, 23, 30, [
          ingredient('Lean beef', 170, 'g'),
          ingredient('Brown rice', 90, 'g'),
          ingredient('Broccoli', 1, 'head')
        ])
      ],
      totalNutrition: nutrition(1870, 130, 192, 61)
    }
  ]
};

export const demoRecipes = [
  {
    id: 'demo-recipe-1',
    title: 'Chicken quinoa power bowl',
    description: 'A high-protein lunch bowl with quinoa, greens, lemon dressing, and lean chicken.',
    ingredients: ['Chicken breast', 'Quinoa', 'Spinach', 'Cucumber', 'Lemon dressing'],
    steps: ['Cook quinoa.', 'Season and cook chicken.', 'Assemble with vegetables and dressing.'],
    prepTime: 10,
    cookTime: 20,
    servings: 1,
    calories: 610,
    protein: 48,
    carbs: 62,
    fats: 18,
    tags: ['high protein', 'meal prep'],
    dietLabels: ['Dairy-free']
  }
];

export const demoGroceryItems = [
  grocery('Chicken breast', 4, 'servings', 'Protein', 'Monday', 'lunch'),
  grocery('Salmon fillets', 2, 'pieces', 'Protein', 'Monday', 'dinner'),
  grocery('Firm tofu', 2, 'blocks', 'Protein', 'Tuesday', 'dinner'),
  grocery('Rolled oats', 1, 'bag', 'Grains', 'Monday', 'breakfast'),
  grocery('Quinoa', 1, 'bag', 'Grains', 'Monday', 'lunch'),
  grocery('Brown rice', 1, 'bag', 'Grains', 'Monday', 'dinner'),
  grocery('Spinach', 1, 'box', 'Produce', 'Monday', 'lunch'),
  grocery('Broccoli', 2, 'heads', 'Produce', 'Monday', 'dinner'),
  grocery('Avocados', 2, 'pieces', 'Produce', 'Tuesday', 'lunch'),
  grocery('Pesto', 1, 'jar', 'Sauces', 'Saturday', 'dinner')
];

function meal(type, name, calories, protein, carbs, fats, prepMinutes, ingredients) {
  return {
    type,
    name,
    ingredients,
    calories,
    protein,
    carbs,
    fats,
    prepMinutes,
    reason: 'Fits the demo profile with practical prep and a high-protein weekly pattern.'
  };
}

function ingredient(name, quantity, unit) {
  return { name, quantity, unit };
}

function nutrition(calories, protein, carbs, fats) {
  return { calories, protein, carbs, fats };
}

function grocery(name, quantity, unit, category, sourceDay, sourceMeal) {
  return {
    id: `demo-${sourceDay}-${sourceMeal}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    quantity,
    unit,
    category,
    checked: false,
    sourceDay,
    sourceMeal,
    addedBy: 'demo'
  };
}
