/**
 * @jest-environment node
 */
global.fetch = require('node-fetch');

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

test('User can register and profile is stored in Firestore', async () => {
  const randomId = Math.floor(Math.random() * 100000);
  const email = `testuser${randomId}@example.com`;
  const password = 'test1234';

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    username: 'TestUser',
    preferences: {
      vegetarian: true,
    },
  });

  const savedDoc = await getDoc(userRef);
  expect(savedDoc.exists()).toBe(true);
  expect(savedDoc.data().username).toBe('TestUser');
});
