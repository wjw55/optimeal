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
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
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

test('creates, saves, and explores recipes including author username', async () => {
  // Step 1: Create user and profile
  const email = `recipe${Date.now()}@test.com`;
  const password = 'test1234';
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { username: 'TestChef' });

  // Step 2: Create new recipe
  const recipesCol = collection(db, 'recipes');
  const recipeDoc = await addDoc(recipesCol, {
    title: 'Spaghetti Bolognese',
    description: 'A hearty tomato and meat sauce over spaghetti.',
    authorId: uid,
    createdAt: new Date()
  });

  // Step 3: Save recipe to user (simulate "bookmark")
  await setDoc(userRef, { savedRecipes: [recipeDoc.id] }, { merge: true });

  // Step 4: Fetch saved recipes
  const savedUser = await getDoc(userRef);
  const savedRecipeIds = savedUser.data().savedRecipes;
  expect(savedRecipeIds).toContain(recipeDoc.id);

  // Step 5: Explore recipes (get all recipes + author username)
  const snapshot = await getDocs(collection(db, 'recipes'));
  const enrichedRecipes = await Promise.all(snapshot.docs.map(async docSnap => {
    const data = docSnap.data();
    const authorSnap = await getDoc(doc(db, 'users', data.authorId));
    return {
      title: data.title,
      authorUsername: authorSnap.exists() ? authorSnap.data().username : null
    };
  }));

  // Assert the created recipe and author appear in explore list
  const found = enrichedRecipes.find(r => r.title === 'Spaghetti Bolognese');
  expect(found).toBeDefined();
  expect(found.authorUsername).toBe('TestChef');
});
