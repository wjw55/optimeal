import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../auth/firebase';
import './SavedRecipes.css';

function SavedRecipes() {
  const [savedCombined, setSavedCombined] = useState([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSaved();
  }, []);

  const fetchSaved = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const savedIds = userSnap.data()?.savedRecipes || [];
      const savedLinks = userSnap.data()?.savedLinks || [];

      const allRecipesSnap = await getDocs(collection(db, 'recipes'));
      const internal = allRecipesSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((recipe) => savedIds.includes(recipe.id))
        .map((recipe) => ({ ...recipe, type: 'internal' }));

      const external = savedLinks.map((link, index) => ({
        ...link,
        type: 'external',
        id: `external-${index}`
      }));

      setSavedCombined([...internal, ...external]);
    } catch (fetchError) {
      console.error('Error loading saved recipes:', fetchError);
      setError('Saved recipes could not be loaded. Please try again.');
    }
  };

  const handleAddLink = async (event) => {
    event.preventDefault();
    setError('');

    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const existingLinks = userSnap.data()?.savedLinks || [];
    const newLink = { title: newLinkTitle.trim(), url: newLinkUrl.trim() };
    const updatedLinks = [...existingLinks, newLink];

    await setDoc(userRef, { savedLinks: updatedLinks }, { merge: true });
    setSavedCombined((current) => [...current, { ...newLink, type: 'external', id: `external-${updatedLinks.length - 1}` }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleDelete = async (item) => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};

    if (item.type === 'internal') {
      const updatedIds = (userData.savedRecipes || []).filter((id) => id !== item.id);
      await setDoc(userRef, { savedRecipes: updatedIds }, { merge: true });
    } else {
      const updatedLinks = (userData.savedLinks || []).filter((link) => !(link.title === item.title && link.url === item.url));
      await setDoc(userRef, { savedLinks: updatedLinks }, { merge: true });
    }

    setSavedCombined((current) => current.filter((recipe) => recipe.id !== item.id));
  };

  return (
    <div className="saved-recipes-page">
      <div className="recipe-section-heading">
        <p>Your cookbook</p>
        <h2>Saved Recipes</h2>
      </div>

      {error && <div className="saved-error">{error}</div>}

      <form className="link-form" onSubmit={handleAddLink}>
        <label>
          Recipe title
          <input type="text" value={newLinkTitle} onChange={(event) => setNewLinkTitle(event.target.value)} placeholder="Recipe title" />
        </label>
        <label>
          Recipe URL
          <input type="url" value={newLinkUrl} onChange={(event) => setNewLinkUrl(event.target.value)} placeholder="https://example.com" />
        </label>
        <button type="submit">Save Link</button>
      </form>

      {!savedCombined.length ? (
        <div className="saved-empty">
          <h3>No saved recipes yet.</h3>
          <p>Save recipes from Explore or add an external recipe link.</p>
        </div>
      ) : (
        <div className="saved-container">
          {savedCombined.map((item) => (
            <SavedRecipeCard key={item.id} item={item} onDelete={() => handleDelete(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedRecipeCard({ item, onDelete }) {
  const totalTime = Number(item.prepTime || 0) + Number(item.cookTime || 0);

  return (
    <article className="saved-recipe-card">
      <h3>{item.title}</h3>
      {item.type === 'internal' ? (
        <>
          <p>{item.description || 'No description provided.'}</p>
          <div className="saved-meta">
            {totalTime > 0 && <span>{totalTime} min</span>}
            {item.protein && <span>{item.protein}g protein</span>}
            {item.calories && <span>{item.calories} kcal</span>}
          </div>
        </>
      ) : (
        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
      )}
      <button type="button" onClick={onDelete}>Delete</button>
    </article>
  );
}

export default SavedRecipes;
