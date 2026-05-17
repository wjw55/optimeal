import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../auth/firebase';
import './NewRecipe.css';

const initialRecipe = {
  title: '',
  description: '',
  ingredients: '',
  steps: '',
  prepTime: '',
  cookTime: '',
  servings: 1,
  calories: '',
  protein: '',
  carbs: '',
  fats: '',
  tags: '',
  image: '',
  dietLabels: ''
};

function NewRecipe() {
  const [recipe, setRecipe] = useState(initialRecipe);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const updateRecipe = (field, value) => {
    setRecipe((current) => ({ ...current, [field]: value }));
  };

  const handlePost = async (event) => {
    event.preventDefault();
    setSubmitted(false);

    if (!recipe.title.trim()) {
      setError('Title is required.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('You must be signed in to share a recipe.');
      return;
    }

    try {
      await addDoc(collection(db, 'recipes'), {
        title: recipe.title.trim(),
        description: recipe.description.trim(),
        ingredients: splitLines(recipe.ingredients),
        steps: splitLines(recipe.steps),
        prepTime: toNumberOrEmpty(recipe.prepTime),
        cookTime: toNumberOrEmpty(recipe.cookTime),
        servings: toNumberOrEmpty(recipe.servings) || 1,
        calories: toNumberOrEmpty(recipe.calories),
        protein: toNumberOrEmpty(recipe.protein),
        carbs: toNumberOrEmpty(recipe.carbs),
        fats: toNumberOrEmpty(recipe.fats),
        tags: splitCommaList(recipe.tags),
        image: recipe.image.trim(),
        dietLabels: splitCommaList(recipe.dietLabels),
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Optimeal user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setRecipe(initialRecipe);
      setSubmitted(true);
      setError('');
    } catch (err) {
      console.error('Error posting recipe:', err);
      setError('Failed to post recipe. Please try again.');
    }
  };

  return (
    <form className="new-recipe-form" onSubmit={handlePost}>
      <div className="recipe-section-heading">
        <p>Community recipe</p>
        <h2>Share Recipe</h2>
      </div>

      {submitted && <div className="success">Recipe posted.</div>}
      {error && <div className="error">{error}</div>}

      <label>
        Title *
        <input value={recipe.title} onChange={(event) => updateRecipe('title', event.target.value)} placeholder="Avocado chicken rice bowl" required />
      </label>

      <label>
        Description
        <textarea rows={4} value={recipe.description} onChange={(event) => updateRecipe('description', event.target.value)} placeholder="What makes this recipe useful for meal planning?" />
      </label>

      <div className="recipe-form-grid">
        <label>
          Prep time (min)
          <input type="number" min="0" value={recipe.prepTime} onChange={(event) => updateRecipe('prepTime', event.target.value)} />
        </label>
        <label>
          Cook time (min)
          <input type="number" min="0" value={recipe.cookTime} onChange={(event) => updateRecipe('cookTime', event.target.value)} />
        </label>
        <label>
          Servings
          <input type="number" min="1" value={recipe.servings} onChange={(event) => updateRecipe('servings', event.target.value)} />
        </label>
        <label>
          Image URL
          <input type="url" value={recipe.image} onChange={(event) => updateRecipe('image', event.target.value)} placeholder="Optional" />
        </label>
      </div>

      <label>
        Ingredients
        <textarea rows={5} value={recipe.ingredients} onChange={(event) => updateRecipe('ingredients', event.target.value)} placeholder="One ingredient per line" />
      </label>

      <label>
        Steps
        <textarea rows={5} value={recipe.steps} onChange={(event) => updateRecipe('steps', event.target.value)} placeholder="One step per line" />
      </label>

      <div className="recipe-form-grid">
        <label>
          Calories
          <input type="number" min="0" value={recipe.calories} onChange={(event) => updateRecipe('calories', event.target.value)} />
        </label>
        <label>
          Protein (g)
          <input type="number" min="0" value={recipe.protein} onChange={(event) => updateRecipe('protein', event.target.value)} />
        </label>
        <label>
          Carbs (g)
          <input type="number" min="0" value={recipe.carbs} onChange={(event) => updateRecipe('carbs', event.target.value)} />
        </label>
        <label>
          Fats (g)
          <input type="number" min="0" value={recipe.fats} onChange={(event) => updateRecipe('fats', event.target.value)} />
        </label>
      </div>

      <div className="recipe-form-grid">
        <label>
          Tags
          <input value={recipe.tags} onChange={(event) => updateRecipe('tags', event.target.value)} placeholder="high protein, meal prep" />
        </label>
        <label>
          Diet labels
          <input value={recipe.dietLabels} onChange={(event) => updateRecipe('dietLabels', event.target.value)} placeholder="dairy-free, vegetarian" />
        </label>
      </div>

      <button type="submit">Share Recipe</button>
    </form>
  );
}

function splitLines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function splitCommaList(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function toNumberOrEmpty(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== '' ? number : '';
}

export default NewRecipe;
