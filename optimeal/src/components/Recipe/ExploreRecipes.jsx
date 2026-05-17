import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../auth/firebase';
import './ExploreRecipes.css';

function ExploreRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [dietFilter, setDietFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'recipes'));
        const recipeData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setRecipes(recipeData);

        const user = auth.currentUser;
        if (user) {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          setSavedIds(userSnap.data()?.savedRecipes || []);
        }
      } catch (fetchError) {
        console.error('Error loading recipes:', fetchError);
        setError('Recipes could not be loaded. Please try again.');
      }
    };

    fetchData();
  }, []);

  const dietOptions = useMemo(() => {
    const labels = recipes.flatMap((recipe) => recipe.dietLabels || []);
    return ['all', ...Array.from(new Set(labels))];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const title = recipe.title || '';
      const tags = (recipe.tags || []).join(' ');
      const dietLabels = recipe.dietLabels || [];
      const totalTime = Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0);
      const matchesSearch = `${title} ${tags}`.toLowerCase().includes(search.toLowerCase());
      const matchesDiet = dietFilter === 'all' || dietLabels.includes(dietFilter);
      const matchesTime =
        timeFilter === 'all' ||
        (timeFilter === 'under30' && totalTime > 0 && totalTime <= 30) ||
        (timeFilter === 'under60' && totalTime > 0 && totalTime <= 60);

      return matchesSearch && matchesDiet && matchesTime;
    });
  }, [recipes, search, dietFilter, timeFilter]);

  const toggleSave = async (recipeId) => {
    const user = auth.currentUser;
    if (!user) return;

    const isSaved = savedIds.includes(recipeId);
    const updated = isSaved ? savedIds.filter((id) => id !== recipeId) : [...savedIds, recipeId];
    await setDoc(doc(db, 'users', user.uid), { savedRecipes: updated }, { merge: true });
    setSavedIds(updated);
  };

  return (
    <div className="explore-container">
      <div className="recipe-section-heading">
        <p>Community cookbook</p>
        <h2>Explore Recipes</h2>
      </div>

      {error && <div className="recipe-error">{error}</div>}

      <div className="recipe-filters">
        <label>
          Search
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or tag" />
        </label>
        <label>
          Diet label
          <select value={dietFilter} onChange={(event) => setDietFilter(event.target.value)}>
            {dietOptions.map((option) => (
              <option key={option} value={option}>{option === 'all' ? 'All diets' : option}</option>
            ))}
          </select>
        </label>
        <label>
          Prep time
          <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value)}>
            <option value="all">Any time</option>
            <option value="under30">30 minutes or less</option>
            <option value="under60">60 minutes or less</option>
          </select>
        </label>
      </div>

      {!filteredRecipes.length ? (
        <div className="recipe-empty">
          <h3>No recipes found.</h3>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              saved={savedIds.includes(recipe.id)}
              onToggleSave={() => toggleSave(recipe.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeCard({ recipe, saved, onToggleSave }) {
  const tags = recipe.tags || [];
  const dietLabels = recipe.dietLabels || [];
  const totalTime = Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0);

  return (
    <article className="recipe-card">
      {recipe.image && <img src={recipe.image} alt="" className="recipe-card__image" />}
      <div className="recipe-card__content">
        <h3>{recipe.title}</h3>
        <p>{recipe.description || 'No description provided.'}</p>
        <div className="recipe-meta">
          {totalTime > 0 && <span>{totalTime} min</span>}
          {recipe.servings && <span>{recipe.servings} serving{recipe.servings === 1 ? '' : 's'}</span>}
          {recipe.protein && <span>{recipe.protein}g protein</span>}
        </div>
        <div className="recipe-tags">
          {[...tags, ...dietLabels].slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
      <div className="recipe-footer">
        <span>By {recipe.authorName || 'Community member'}</span>
        <button type="button" onClick={onToggleSave}>{saved ? 'Saved' : 'Save'}</button>
      </div>
    </article>
  );
}

export default ExploreRecipes;
