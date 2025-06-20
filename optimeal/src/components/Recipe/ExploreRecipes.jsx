import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '../auth/firebase';
import './ExploreRecipes.css';

function ExploreRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [savedIds, setSavedIds] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, "recipes"));

      // Get recipes + usernames
      const recipesWithUsernames = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const userRef = doc(db, "users", data.authorId);
        const userSnap = await getDoc(userRef);
        const username = userSnap.exists() ? (userSnap.data().username || "Unknown") : "Unknown";
        return {
          id: docSnap.id,
          ...data,
          username
        };
      }));

      setRecipes(recipesWithUsernames);

      // Get current user's saved recipes
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const saved = userSnap.data().savedRecipes || [];
          setSavedIds(saved);
        }
      }
    };

    fetchData();
  }, []);

  const toggleSave = async (recipeId) => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const isSaved = savedIds.includes(recipeId);

    const updated = isSaved
      ? savedIds.filter(id => id !== recipeId)
      : [...savedIds, recipeId];

    await setDoc(userRef, {
      savedRecipes: updated
    }, { merge: true });

    setSavedIds(updated);
  };

  return (
    <div className="explore-container">
      <h3>Explore Recipes</h3>
      <div className="recipe-grid">
        {recipes.map(recipe => (
          <div key={recipe.id} className="recipe-card">
            <div className="recipe-content">
              <h4>{recipe.title}</h4>
              <p>{recipe.description}</p>
            </div>
            <div className="recipe-footer">
              <span>By: {recipe.username}</span>
              <button onClick={() => toggleSave(recipe.id)}>
                {savedIds.includes(recipe.id) ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExploreRecipes;
