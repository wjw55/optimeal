/**
 * @jest-environment node
 */
global.fetch = require('node-fetch');
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

const { initializeApp } = require('firebase/app');
const {
  getAuth,
  createUserWithEmailAndPassword,
  connectAuthEmulator,
  signInWithEmailAndPassword
} = require('firebase/auth');
const {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  connectFirestoreEmulator
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'optimeal-bbabb',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

beforeAll(() => {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
});

test('Updates user profile data in Firestore', async () => {
  const randomId = Math.floor(Math.random() * 100000);
  const email = `profileuser${randomId}@example.com`;
  const password = 'test1234';

  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;

  const userRef = doc(db, 'users', uid);

  // Simulate what `handleSave` sends
  const updatedProfile = {
    age: '25',
    sex: 'Female',
    weight: '60 kg',
    height: '170 cm',
    goal: 'Lose weight',
    activityLevel: 'Intense',
    allergies: ['Peanuts', 'Dairy'],
    preferences: ['Vegan'],
    updatedAt: new Date()
  };

  await setDoc(userRef, updatedProfile, { merge: true });

  const updatedDoc = await getDoc(userRef);
  const data = updatedDoc.data();

  expect(data.age).toBe('25');
  expect(data.weight).toBe('60 kg');
  expect(data.goal).toBe('Lose weight');
  expect(data.allergies).toEqual(expect.arrayContaining(['Peanuts', 'Dairy']));
  expect(data.preferences).toContain('Vegan');
});
