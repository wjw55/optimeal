import { buildProfileForSave, normalizeProfile } from '../utils/profileUtils';

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
