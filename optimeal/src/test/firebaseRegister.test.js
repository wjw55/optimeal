import { buildProfileForSave, normalizeProfile, profileIsComplete } from '../utils/profileUtils';

test('new profile data is normalized before saving', () => {
  const draftProfile = normalizeProfile({
    username: 'TestUser',
    age: '25',
    heightCm: '170',
    weightKg: '62',
    goal: 'Maintain weight',
    activityLevel: 'Moderate',
    dietType: 'Vegetarian',
    allergies: ['Peanuts'],
    mealsPerDay: '3',
    servings: '2'
  });

  expect(profileIsComplete(draftProfile)).toBe(true);

  const payload = buildProfileForSave(draftProfile);
  expect(payload.username).toBe('TestUser');
  expect(payload.heightCm).toBe(170);
  expect(payload.weightKg).toBe(62);
  expect(payload.preferences).toEqual(['Vegetarian']);
  expect(payload.mealsPerDay).toBe(3);
  expect(payload.servings).toBe(2);
});
