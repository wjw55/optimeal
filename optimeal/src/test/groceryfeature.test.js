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
  connectAuthEmulator
} = require('firebase/auth');
const {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  connectFirestoreEmulator
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'fake-key',
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

test('adds grocery item to Tuesday lunch and persists to Firestore', async () => {
  // 1. Create test user
  const email = `grocery${Date.now()}@test.com`;
  const password = 'test1234';
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;
  const userRef = doc(db, "users", uid);

  // 2. Seed Firestore with a minimal currentMeals structure
  const blankPlan = {
    Tuesday: {
      breakfast: "Oats",
      lunch: "Salad",
      dinner: "Soup",
      groceries: {
        breakfast: [],
        lunch: [],
        dinner: []
      }
    }
  };
  await setDoc(userRef, { currentMeals: blankPlan });

  // 3. Simulate `handleAddItem()` logic
  const planSnap = await getDoc(userRef);
  const plan = planSnap.data().currentMeals;

  plan.Tuesday.groceries.lunch.push("Broccoli (2)");

  await setDoc(userRef, { currentMeals: plan }, { merge: true });

  // 4. Read back and verify
  const updated = await getDoc(userRef);
  const updatedLunch = updated.data().currentMeals.Tuesday.groceries.lunch;

  expect(updatedLunch).toContain("Broccoli (2)");
});
