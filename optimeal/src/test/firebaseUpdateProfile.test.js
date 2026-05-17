import { buildProfileForSave, normalizeProfile, validateProfile } from '../utils/profileUtils';

test('old height and weight strings are read into numeric profile fields', () => {
  const oldProfile = normalizeProfile({
    username: 'ReturningUser',
    age: '25',
    sex: 'Female',
    weight: '60 kg',
    height: '170 cm',
    goal: 'Lose weight',
    activityLevel: 'Intense',
    allergies: ['Peanuts', 'Dairy'],
    preferences: ['Vegan']
  });

  expect(oldProfile.heightCm).toBe(170);
  expect(oldProfile.weightKg).toBe(60);
  expect(oldProfile.dietType).toBe('Vegan');

  const savedProfile = buildProfileForSave(oldProfile);
  expect(savedProfile.heightCm).toBe(170);
  expect(savedProfile.weightKg).toBe(60);
  expect(savedProfile.preferences).toEqual(['Vegan']);
});

test('profile validation catches unreasonable numeric fields', () => {
  const result = validateProfile({
    username: 'TestUser',
    age: 12,
    heightCm: 170,
    weightKg: 70,
    mealsPerDay: 3,
    servings: 1
  });

  expect(result.valid).toBe(false);
  expect(result.message).toMatch(/age/i);
});
