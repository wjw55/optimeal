// src/components/Recipe/NewRecipe.jsx
import React, { useState } from 'react';
import './NewRecipe.css';
import { db, auth } from '../auth/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


function NewRecipe() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handlePost = async () => {
    if (!title.trim()) {
        setError("Title is required.");
        return;
    }

    try {
        await addDoc(collection(db, "recipes"), {
        title,
        description,
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp()
        });
        setSubmitted(true);
        setTitle('');
        setDescription('');
        setError('');
    } catch (err) {
        console.error("Error posting recipe:", err);
        setError("Failed to post recipe.");
    }
    };


  return (
    <div className="new-recipe-form">
      <h3>New Recipes</h3>

      {submitted && (
        <div className="success">✅ Recipe posted!</div>
      )}

      <label>Title *</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Avocado Toast"
        required
      />

      <label>Description</label>
      <textarea
        rows={6}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. Ingredients, steps, or nutritional notes..."
      />

      {error && <p className="error">{error}</p>}

      <button onClick={handlePost}>Post</button>
    </div>
  );
}

export default NewRecipe;
