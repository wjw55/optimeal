import { useEffect, useState } from 'react';
import { db, auth } from '../auth/firebase';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import './SavedRecipes.css';

function SavedRecipes() {
  const [savedCombined, setSavedCombined] = useState([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  useEffect(() => {
    const fetchSaved = async () => {
      const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const savedIds = userSnap.data()?.savedRecipes || [];
      const savedLinks = userSnap.data()?.savedLinks || [];

      // Fetch internal recipes
      const allRecipesSnap = await getDocs(collection(db, "recipes"));
      const internal = allRecipesSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(recipe => savedIds.includes(recipe.id))
        .map(recipe => ({ ...recipe, type: 'internal' }));

      // Convert external links
      const external = savedLinks.map((link, index) => ({
        ...link,
        type: 'external',
        id: `external-${index}`
      }));

      setSavedCombined([...internal, ...external]);
    };

    fetchSaved();
  }, []);

  const handleAddLink = async () => {
    if (!newLinkTitle || !newLinkUrl) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    const existingLinks = userSnap.data()?.savedLinks || [];

    const newLink = { title: newLinkTitle, url: newLinkUrl };
    const updatedLinks = [...existingLinks, newLink];

    await setDoc(userRef, { savedLinks: updatedLinks }, { merge: true });

    setSavedCombined(prev => [...prev, { ...newLink, type: 'external', id: `external-${updatedLinks.length - 1}` }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleDelete = async (item) => {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    if (item.type === 'internal') {
      const updatedIds = (userData.savedRecipes || []).filter(id => id !== item.id);
      await setDoc(userRef, { savedRecipes: updatedIds }, { merge: true });
    } else {
      const updatedLinks = (userData.savedLinks || []).filter(link => !(link.title === item.title && link.url === item.url));
      await setDoc(userRef, { savedLinks: updatedLinks }, { merge: true });
    }

    setSavedCombined(prev => prev.filter(r => r.id !== item.id));
  };

return (
  <div>
    <h3>Saved Recipes</h3>

    <div className="link-form">
      <input
        type="text"
        value={newLinkTitle}
        onChange={(e) => setNewLinkTitle(e.target.value)}
        placeholder="Recipe title"
      />
      <input
        type="url"
        value={newLinkUrl}
        onChange={(e) => setNewLinkUrl(e.target.value)}
        placeholder="https://example.com"
      />
      <button onClick={handleAddLink}>Save Link</button>
    </div>

    <div className="saved-container">
      {savedCombined.map(item => (
        <div key={item.id} className="recipe-card">
          <h4>{item.title}</h4>
          {item.type === 'internal' ? (
            <p>{item.description}</p>
          ) : (
            <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
          )}
          <button onClick={() => handleDelete(item)} className="delete-btn">
            Delete
          </button>
        </div>
      ))}
    </div>
  </div>
);
}

export default SavedRecipes;
