import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../auth/firebase';
import AppNav from '../shared/AppNav';
import {
  DAYS,
  GROCERY_CATEGORIES,
  MEAL_TYPES,
  addGroceryItem,
  buildGroceryItem,
  clearPurchasedGroceries,
  deleteGroceryItem,
  groupGroceriesByCategory,
  mealDisplayName,
  normalizeMealPlan,
  updateGroceryItem
} from '../../utils/mealPlanUtils';
import './grocery.css';

const blankForm = {
  name: '',
  quantity: '',
  unit: '',
  category: 'Other',
  sourceDay: 'Monday',
  sourceMeal: 'dinner'
};

function GroceryList() {
  const [mealPlan, setMealPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState('all');
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', quantity: '', unit: '', category: 'Other' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const fetchMealPlan = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        const normalized = normalizeMealPlan(userSnap.data()?.currentMeals);
        setMealPlan(normalized);
      } catch (fetchError) {
        console.error('Error fetching grocery list:', fetchError);
        setError('We could not load your grocery list. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMealPlan();
  }, []);

  const groupedGroceries = useMemo(() => {
    if (!mealPlan) return {};
    return groupGroceriesByCategory(mealPlan, selectedDay);
  }, [mealPlan, selectedDay]);

  const totalItems = useMemo(() => {
    return Object.values(groupedGroceries).reduce((count, items) => count + items.length, 0);
  }, [groupedGroceries]);

  const saveMealPlan = async (nextPlan, message) => {
    const user = auth.currentUser;
    if (!user) return;

    setMealPlan(nextPlan);
    await setDoc(doc(db, 'users', user.uid), {
      currentMeals: nextPlan,
      updatedAt: new Date()
    }, { merge: true });

    if (message) {
      setNotice(message);
      setTimeout(() => setNotice(''), 2500);
    }
  };

  const handleAddItem = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !mealPlan) return;

    const item = buildGroceryItem(form);
    const nextPlan = addGroceryItem(mealPlan, item);
    await saveMealPlan(nextPlan, 'Grocery item added.');
    setForm((current) => ({ ...blankForm, sourceDay: current.sourceDay, sourceMeal: current.sourceMeal }));
  };

  const handleToggleItem = async (item) => {
    const nextPlan = updateGroceryItem(mealPlan, item.id, { checked: !item.checked });
    await saveMealPlan(nextPlan);
  };

  const handleDeleteItem = async (itemId) => {
    const nextPlan = deleteGroceryItem(mealPlan, itemId);
    await saveMealPlan(nextPlan, 'Grocery item deleted.');
  };

  const handleClearPurchased = async () => {
    const nextPlan = clearPurchasedGroceries(mealPlan);
    await saveMealPlan(nextPlan, 'Purchased items cleared.');
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditDraft({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category
    });
  };

  const saveEdit = async (itemId) => {
    if (!editDraft.name.trim()) return;

    const nextPlan = updateGroceryItem(mealPlan, itemId, {
      name: editDraft.name.trim(),
      quantity: editDraft.quantity,
      unit: editDraft.unit,
      category: editDraft.category
    });

    await saveMealPlan(nextPlan, 'Grocery item updated.');
    setEditingId(null);
  };

  if (loading) {
    return (
      <div>
        <AppNav />
        <main className="grocery-page">
          <p className="grocery-state">Loading grocery list...</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <AppNav />
      <main className="grocery-page">
        <section className="grocery-hero">
          <div>
            <p className="grocery-kicker">Shopping checklist</p>
            <h1>Grocery List</h1>
            <p>Structured items grouped by category, with checked state stored separately from the item name.</p>
          </div>
          <button className="grocery-button grocery-button--secondary" type="button" onClick={handleClearPurchased} disabled={!totalItems}>
            Clear purchased
          </button>
        </section>

        {error && <div className="grocery-alert grocery-alert--error">{error}</div>}
        {notice && <div className="grocery-alert">{notice}</div>}

        <section className="grocery-layout">
          <form className="grocery-form" onSubmit={handleAddItem}>
            <h2>Add grocery item</h2>
            <label>
              Item name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Chicken breast" required />
            </label>
            <div className="grocery-form__grid">
              <label>
                Quantity
                <input value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="2" />
              </label>
              <label>
                Unit
                <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="pieces" />
              </label>
            </div>
            <label>
              Category
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {GROCERY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <div className="grocery-form__grid">
              <label>
                Source day
                <select value={form.sourceDay} onChange={(event) => setForm({ ...form, sourceDay: event.target.value })}>
                  {DAYS.map((day) => <option key={day}>{day}</option>)}
                </select>
              </label>
              <label>
                Source meal
                <select value={form.sourceMeal} onChange={(event) => setForm({ ...form, sourceMeal: event.target.value })}>
                  {MEAL_TYPES.map((meal) => <option key={meal} value={meal}>{mealDisplayName(meal)}</option>)}
                </select>
              </label>
            </div>
            <button className="grocery-button grocery-button--primary" type="submit">Add item</button>
          </form>

          <section className="grocery-list-panel">
            <div className="grocery-list-toolbar">
              <div>
                <p className="grocery-kicker">Current list</p>
                <h2>{totalItems} item{totalItems === 1 ? '' : 's'}</h2>
              </div>
              <label>
                Filter day
                <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
                  <option value="all">All days</option>
                  {DAYS.map((day) => <option key={day}>{day}</option>)}
                </select>
              </label>
            </div>

            {!totalItems ? (
              <div className="grocery-empty">
                <h3>No grocery items yet.</h3>
                <p>Add ingredients from your meal plan or create an item manually.</p>
              </div>
            ) : (
              <div className="grocery-category-grid">
                {GROCERY_CATEGORIES.map((category) => {
                  const items = groupedGroceries[category] || [];
                  if (!items.length) return null;

                  return (
                    <section className="grocery-category" key={category}>
                      <h3>{category}</h3>
                      <ul>
                        {items.map((item) => (
                          <li className={item.checked ? 'is-checked' : ''} key={item.id}>
                            {editingId === item.id ? (
                              <div className="grocery-edit-row">
                                <input value={editDraft.name} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} aria-label="Item name" />
                                <input value={editDraft.quantity} onChange={(event) => setEditDraft({ ...editDraft, quantity: event.target.value })} aria-label="Quantity" />
                                <input value={editDraft.unit} onChange={(event) => setEditDraft({ ...editDraft, unit: event.target.value })} aria-label="Unit" />
                                <select value={editDraft.category} onChange={(event) => setEditDraft({ ...editDraft, category: event.target.value })} aria-label="Category">
                                  {GROCERY_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
                                </select>
                                <button type="button" onClick={() => saveEdit(item.id)}>Save</button>
                                <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <label className="grocery-item-main">
                                  <input type="checkbox" checked={item.checked} onChange={() => handleToggleItem(item)} />
                                  <span>
                                    <strong>{item.name}</strong>
                                    <small>{item.sourceDay} · {mealDisplayName(item.sourceMeal)}</small>
                                  </span>
                                </label>
                                <span className="grocery-quantity">{item.quantity} {item.unit}</span>
                                <div className="grocery-item-actions">
                                  <button type="button" onClick={() => startEditing(item)}>Edit</button>
                                  <button type="button" onClick={() => handleDeleteItem(item.id)}>Delete</button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default GroceryList;
