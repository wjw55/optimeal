import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../auth/firebase';
import AppNav from '../shared/AppNav';
import {
  DAYS,
  GROCERY_CATEGORIES,
  MEAL_TYPES,
  addGroceryItem,
  aggregateGroceriesByCategory,
  buildGroceryItem,
  clearPurchasedGroceries,
  deleteGroceryItem,
  formatGroceryGroupsAsText,
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
    return aggregateGroceriesByCategory(mealPlan, selectedDay);
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
    const nextPlan = updateManyGroceryItems(mealPlan, item, { checked: !item.checked });
    await saveMealPlan(nextPlan);
  };

  const handleToggleAlreadyHave = async (item) => {
    const nextPlan = updateManyGroceryItems(mealPlan, item, { alreadyHave: !item.alreadyHave });
    await saveMealPlan(nextPlan, item.alreadyHave ? 'Moved to need-to-buy.' : 'Marked as already have.');
  };

  const handleDeleteItem = async (item) => {
    const nextPlan = deleteManyGroceryItems(mealPlan, item);
    await saveMealPlan(nextPlan, 'Grocery item deleted.');
  };

  const handleClearPurchased = async () => {
    const nextPlan = clearPurchasedGroceries(mealPlan);
    await saveMealPlan(nextPlan, 'Purchased items cleared.');
  };

  const startEditing = (item) => {
    if (item.sourceIds?.length > 1) {
      setNotice('This row combines duplicate items. Edit the source items separately.');
      setTimeout(() => setNotice(''), 3000);
      return;
    }

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

  const handleCopyList = async () => {
    const text = formatGroceryGroupsAsText(groupedGroceries);
    if (!text) return;

    try {
      await copyTextToClipboard(text);
      setNotice('Grocery list copied.');
    } catch (copyError) {
      console.error('Could not copy grocery list:', copyError);
      setNotice('Copy failed. You can still print the list.');
    }
    setTimeout(() => setNotice(''), 2500);
  };

  const handlePrint = () => {
    window.print();
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
            <p>Aggregated by category where units match, with purchased and already-have status stored separately from item names.</p>
          </div>
          <div className="grocery-hero__actions">
            <button className="grocery-button grocery-button--secondary" type="button" onClick={handleCopyList} disabled={!totalItems}>
              Copy list
            </button>
            <button className="grocery-button grocery-button--secondary" type="button" onClick={handlePrint} disabled={!totalItems}>
              Print
            </button>
            <button className="grocery-button grocery-button--secondary" type="button" onClick={handleClearPurchased} disabled={!totalItems}>
              Clear purchased
            </button>
          </div>
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
                <p>Generate a meal plan first or add an item manually.</p>
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
                          <li className={`${item.checked ? 'is-checked' : ''} ${item.alreadyHave ? 'is-pantry' : ''}`} key={item.id}>
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
                                    <small>
                                      {formatSourceLabel(item)}
                                      {item.sourceIds?.length > 1 ? ` - combined ${item.sourceIds.length} items` : ''}
                                    </small>
                                  </span>
                                </label>
                                <span className="grocery-quantity">{item.quantity} {item.unit}</span>
                                <div className="grocery-item-actions">
                                  <button type="button" onClick={() => handleToggleAlreadyHave(item)}>
                                    {item.alreadyHave ? 'Need to buy' : 'Already have'}
                                  </button>
                                  <button type="button" onClick={() => startEditing(item)}>Edit</button>
                                  <button type="button" onClick={() => handleDeleteItem(item)}>Delete</button>
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

function updateManyGroceryItems(plan, item, updater) {
  return (item.sourceIds || [item.id]).reduce((nextPlan, itemId) => {
    return updateGroceryItem(nextPlan, itemId, updater);
  }, plan);
}

function deleteManyGroceryItems(plan, item) {
  return (item.sourceIds || [item.id]).reduce((nextPlan, itemId) => {
    return deleteGroceryItem(nextPlan, itemId);
  }, plan);
}

function formatSourceLabel(item) {
  const days = item.sourceDays?.length ? item.sourceDays.join(', ') : item.sourceDay;
  const meals = item.sourceMeals?.length
    ? item.sourceMeals.map(mealDisplayName).join(', ')
    : item.sourceMeal ? mealDisplayName(item.sourceMeal) : '';
  return [days, meals].filter(Boolean).join(' - ');
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export default GroceryList;
