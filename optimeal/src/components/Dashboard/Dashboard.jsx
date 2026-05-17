import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteField, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../auth/firebase';
import AppNav from '../shared/AppNav';
import { demoGroceryItems, demoMealPlan, demoProfile, demoRecipes } from '../../data/demoData';
import { generateMealPlan } from '../../utils/mealGeneration';
import {
  ALLERGY_OPTIONS,
  APPLIANCE_OPTIONS,
  CUISINE_OPTIONS,
  DIET_TYPES,
  buildProfileForSave,
  normalizeProfile,
  profileIsComplete,
  toggleValue,
  validateProfile
} from '../../utils/profileUtils';
import {
  DAYS,
  GROCERY_CATEGORIES,
  MEAL_TYPES,
  calculateWeeklyAverage,
  countGroceries,
  countPlannedMeals,
  createEmptyMealPlan,
  groupGroceriesByCategory,
  mealDisplayName,
  normalizeMealPlan,
  planHasMeals
} from '../../utils/mealPlanUtils';
import './Dashboard.css';

const GENERATION_STAGES = [
  'Checking your profile...',
  'Generating meals with the AI model...',
  'Balancing nutrition across the week...',
  'Organizing grocery ingredients...',
  'Almost ready. Free models can take a little while...'
];

const isDevelopment = process.env.NODE_ENV === 'development';

function Dashboard({ demoMode = false }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(() => normalizeProfile(demoMode ? demoProfile : {}));
  const [mealPlan, setMealPlan] = useState(() => normalizeMealPlan(demoMode ? demoMealPlan : createEmptyMealPlan()));
  const [loading, setLoading] = useState(!demoMode);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [generationError, setGenerationError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [focusedMeal, setFocusedMeal] = useState(null);
  const [personalGoals, setPersonalGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [lastGeneratedAt, setLastGeneratedAt] = useState('');

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      setUserId(user.uid);

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const data = userSnap.exists() ? userSnap.data() : {};

        if (!profileIsComplete(data)) {
          navigate('/complete-profile');
          return;
        }

        setProfile(normalizeProfile(data));
        setMealPlan(normalizeMealPlan(data.currentMeals));
        setPersonalGoals(Array.isArray(data.personalGoals) ? data.personalGoals : []);
        setLastGeneratedAt(formatFirestoreDate(data.lastMealPlanGeneratedAt));
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setGenerationError('We could not load your dashboard. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [demoMode, navigate]);

  useEffect(() => {
    if (!generating) return undefined;

    setGenerationMessage(GENERATION_STAGES[0]);
    const timers = GENERATION_STAGES.slice(1).map((message, index) =>
      setTimeout(() => setGenerationMessage(message), [2200, 9000, 18000, 34000][index])
    );

    return () => timers.forEach((timerId) => clearTimeout(timerId));
  }, [generating]);

  useEffect(() => {
    if (!focusedMeal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFocusedMeal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedMeal]);

  const weeklyAverage = useMemo(() => calculateWeeklyAverage(mealPlan), [mealPlan]);
  const plannedMeals = useMemo(() => countPlannedMeals(mealPlan), [mealPlan]);
  const groceryCount = useMemo(() => countGroceries(mealPlan), [mealPlan]);
  const groceryGroups = useMemo(() => groupGroceriesByCategory(mealPlan), [mealPlan]);

  const demoGroceryGroups = useMemo(() => {
    return demoGroceryItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, []);

  const displayGroceryGroups = demoMode ? demoGroceryGroups : groceryGroups;
  const hasMeals = planHasMeals(mealPlan);

  const updateProfileField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const toggleProfileArrayValue = (field, value) => {
    setProfile((current) => ({
      ...current,
      [field]: toggleValue(current[field] || [], value)
    }));
  };

  const handleSaveProfile = async () => {
    if (demoMode || !userId) return;

    try {
      const validation = validateProfile(profile);
      if (!validation.valid) {
        setSaveMessage(validation.message);
        return;
      }

      const profileForSave = buildProfileForSave(profile);
      await setDoc(doc(db, 'users', userId), {
        ...profileForSave,
        height: deleteField(),
        weight: deleteField()
      }, { merge: true });

      setProfile(normalizeProfile(profileForSave));
      setIsEditingProfile(false);
      setSaveMessage('Profile saved.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('Profile could not be saved. Please try again.');
    }
  };

  const handleGenerateWeek = async () => {
    if (demoMode || !userId) return;

    const totalStartedAt = now();
    setGenerating(true);
    setGenerationError('');

    try {
      const {
        mealPlan: generatedPlan,
        nutrition,
        dailyNutrition
      } = await generateMealPlan(profile);
      const weeklyNutrition = nutrition || calculateWeeklyAverage(generatedPlan);
      const dayNutrition = dailyNutrition || buildDailyNutrition(generatedPlan);

      setMealPlan(generatedPlan);
      setGenerationMessage('Saving your week...');
      const saveStartedAt = now();
      const savedAt = new Date();

      await setDoc(doc(db, 'users', userId), {
        currentMeals: generatedPlan,
        nutrition: weeklyNutrition,
        dailyNutrition: dayNutrition,
        lastMealPlanGeneratedAt: savedAt,
        updatedAt: savedAt
      }, { merge: true });
      setLastGeneratedAt(formatDisplayDate(savedAt));

      logDashboardGenerationTiming({
        firestoreSaveMs: elapsed(saveStartedAt),
        totalClickToSavedMs: elapsed(totalStartedAt)
      });

      setGenerationMessage('Your week is ready.');
      setTimeout(() => setGenerationMessage(''), 3500);
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      setGenerationError(error.message || 'Meal generation failed. Please try again.');
      setGenerationMessage('');
    } finally {
      setGenerating(false);
    }
  };

  const addPersonalGoal = async () => {
    if (!newGoal.trim() || demoMode || !userId) return;

    const updatedGoals = [
      ...personalGoals,
      {
        id: Date.now(),
        text: newGoal.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      }
    ];

    setPersonalGoals(updatedGoals);
    setNewGoal('');
    await setDoc(doc(db, 'users', userId), { personalGoals: updatedGoals }, { merge: true });
  };

  const toggleGoal = async (goalId) => {
    if (demoMode || !userId) return;
    const updatedGoals = personalGoals.map((goal) =>
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    );
    setPersonalGoals(updatedGoals);
    await setDoc(doc(db, 'users', userId), { personalGoals: updatedGoals }, { merge: true });
  };

  const deleteGoal = async (goalId) => {
    if (demoMode || !userId) return;
    const updatedGoals = personalGoals.filter((goal) => goal.id !== goalId);
    setPersonalGoals(updatedGoals);
    await setDoc(doc(db, 'users', userId), { personalGoals: updatedGoals }, { merge: true });
  };

  if (loading) {
    return (
      <div>
        <AppNav />
        <main className="dashboard-page">
          <p className="dashboard-state">Loading your dashboard...</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <AppNav demoMode={demoMode} />
      <main className="dashboard-page">
        {demoMode && (
          <section className="demo-banner" aria-label="Demo guide">
            <div>
              <strong>Demo data - explore before signing in.</strong>
              <p>Explore the dashboard, meal plan, nutrition, groceries, and saved recipe without creating an account.</p>
            </div>
            <div className="demo-banner__actions">
              <Link to="/register">Create Account</Link>
              <Link to="/login">Login</Link>
              <a href="#demo-grocery-preview">View Grocery Preview</a>
              <a href="#demo-recipe-preview">View Saved Recipe Preview</a>
            </div>
          </section>
        )}

        <section className="dashboard-hero">
          <div>
            <p className="dashboard-kicker">{demoMode ? 'Product demo' : 'Your planning hub'}</p>
            <h1>{demoMode ? 'See Optimeal in action' : `Welcome back${profile.username ? `, ${profile.username}` : ''}`}</h1>
            <p>
              Plan the week, check nutrition, and keep groceries organized without losing sight of your diet preferences.
            </p>
          </div>
          <div className="dashboard-actions">
            {demoMode ? (
              <>
                <Link className="dashboard-button dashboard-button--primary" to="/register">Create Account</Link>
                <Link className="dashboard-button dashboard-button--secondary" to="/login">Login</Link>
              </>
            ) : (
              <button className="dashboard-button dashboard-button--primary" type="button" onClick={handleGenerateWeek} disabled={generating}>
                {generating ? 'Generating your week...' : 'Generate My Week'}
              </button>
            )}
          </div>
        </section>

        {(generationMessage || generationError) && (
          <div className={generationError ? 'dashboard-alert dashboard-alert--error' : 'dashboard-alert'}>
            {generationError || generationMessage}
          </div>
        )}

        <section className="summary-grid" aria-label="Weekly summary">
          <SummaryCard label="Meals planned" value={plannedMeals} detail="Breakfast, lunch, dinner, and snacks" />
          <SummaryCard label="Estimated daily calories" value={weeklyAverage.calories || '--'} detail="Average kcal/day" />
          <SummaryCard label="Protein target" value={`${weeklyAverage.protein || profile.targetProtein || '--'}g`} detail="Average or profile target" />
          <SummaryCard label="Grocery items" value={demoMode ? demoGroceryItems.length : groceryCount} detail="Grouped shopping list" />
          <SummaryCard label="Last generated" value={demoMode ? 'Demo' : (lastGeneratedAt || '--')} detail={demoMode ? 'Sample weekly plan' : 'Saved plan timestamp'} />
        </section>

        {demoMode && (
          <section className="dashboard-panel demo-story" aria-label="What this demo shows">
            <div className="panel-heading">
              <div>
                <p>What this demo shows</p>
                <h2>A complete planning loop</h2>
              </div>
            </div>
            <div className="demo-story__grid">
              <DemoStoryItem title="Personalized weekly meal plan" copy="Seven days of meals shaped around a high-protein demo profile." />
              <DemoStoryItem title="Nutrition summary" copy="Calories and macros are summarized so the week is easier to scan." />
              <DemoStoryItem title="Categorized groceries" copy="Ingredients become a practical shopping checklist grouped by category." />
              <DemoStoryItem title="Saved recipe preview" copy="Recipes connect back to the weekly planning flow." />
              <DemoStoryItem title="Profile preferences" copy="Diet, allergies, cooking time, budget, and appliances guide generation for signed-in users." />
            </div>
            <p className="demo-story__cta">Want your own plan? Create an account to generate and save personalized meals.</p>
          </section>
        )}

        <section className="dashboard-layout">
          <div className="dashboard-main">
            <section className="dashboard-panel" id="demo-grocery-preview">
              <div className="panel-heading">
                <div>
                  <p>Weekly meal plan</p>
                  <h2>Your 7-day plan</h2>
                </div>
                {demoMode ? (
                  <Link className="dashboard-button dashboard-button--secondary" to="/register">
                    Sign in to generate your own plan
                  </Link>
                ) : (
                  <button className="dashboard-button dashboard-button--secondary" type="button" onClick={handleGenerateWeek} disabled={generating}>
                    {generating ? 'Working...' : 'Generate My Week'}
                  </button>
                )}
              </div>

              {!hasMeals ? (
                <div className="empty-state">
                  <h3>No meal plan yet.</h3>
                  <p>Generate your first week to see meals, nutrition, and grocery ingredients here.</p>
                </div>
              ) : (
                <div className="meal-week-grid">
                  {DAYS.map((day) => (
                    <DayMealCard
                      day={day}
                      dayPlan={mealPlan[day]}
                      key={day}
                      onFocusMeal={(mealType) => setFocusedMeal({
                        day,
                        type: mealType,
                        meal: mealPlan[day].meals[mealType]
                      })}
                    />
                  ))}
                </div>
              )}
            </section>

            {focusedMeal?.meal?.name && (
              <section
                className="dashboard-panel meal-detail-panel"
                aria-labelledby="meal-detail-title"
                aria-live="polite"
                role="dialog"
              >
                <div className="panel-heading">
                  <div>
                    <p>{focusedMeal.day} {mealDisplayName(focusedMeal.type)}</p>
                    <h2 id="meal-detail-title">{focusedMeal.meal.name}</h2>
                  </div>
                  <button className="icon-button" type="button" onClick={() => setFocusedMeal(null)} aria-label="Close meal details">
                    Close
                  </button>
                </div>
                <p>{focusedMeal.meal.reason || 'Meal details are available from the saved plan.'}</p>
                <p className="muted-copy">
                  Source: {focusedMeal.day} {mealDisplayName(focusedMeal.type)}
                  {focusedMeal.meal.prepMinutes ? ` - ${focusedMeal.meal.prepMinutes} min prep` : ''}
                </p>
                <div className="macro-row">
                  <Macro label="Calories" value={focusedMeal.meal.calories} unit="kcal" />
                  <Macro label="Protein" value={focusedMeal.meal.protein} unit="g" />
                  <Macro label="Carbs" value={focusedMeal.meal.carbs} unit="g" />
                  <Macro label="Fats" value={focusedMeal.meal.fats} unit="g" />
                </div>
                {!!focusedMeal.meal.ingredients.length && (
                  <ul className="ingredient-list">
                    {focusedMeal.meal.ingredients.map((ingredient, index) => (
                      <li key={`${ingredient.name}-${index}`}>
                        <span>{ingredient.name}</span>
                        <strong>{ingredient.quantity} {ingredient.unit}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          <aside className="dashboard-sidebar">
            <section className="dashboard-panel nutrition-panel">
              <div className="panel-heading">
                <div>
                  <p>Nutrition</p>
                  <h2>At a glance</h2>
                </div>
              </div>
              <NutritionBar label="Calories" value={weeklyAverage.calories} target={profile.targetCalories || 2200} unit="kcal" />
              <NutritionBar label="Protein" value={weeklyAverage.protein} target={profile.targetProtein || 140} unit="g" />
              <NutritionBar label="Carbs" value={weeklyAverage.carbs} target={260} unit="g" />
              <NutritionBar label="Fats" value={weeklyAverage.fats} target={80} unit="g" />
            </section>

            <section className="dashboard-panel" id="demo-recipe-preview">
              <div className="panel-heading">
                <div>
                  <p>Preferences</p>
                  <h2>Profile summary</h2>
                </div>
                {!demoMode && (
                  <button className="dashboard-button dashboard-button--secondary" type="button" onClick={() => setIsEditingProfile((value) => !value)}>
                    {isEditingProfile ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <ProfileEditor
                  profile={profile}
                  updateProfileField={updateProfileField}
                  toggleProfileArrayValue={toggleProfileArrayValue}
                  onSave={handleSaveProfile}
                  saveMessage={saveMessage}
                />
              ) : (
                <ProfileSummary profile={profile} />
              )}
            </section>

            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <p>Grocery list</p>
                  <h2>Categorized items</h2>
                </div>
                {!demoMode && <Link className="text-link" to="/grocery">Open list</Link>}
              </div>
              <GroceryPreview groups={displayGroceryGroups} />
            </section>

            <section className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <p>Recipes</p>
                  <h2>{demoMode ? 'Example saved recipe' : 'Saved recipes'}</h2>
                </div>
                {!demoMode && <Link className="text-link" to="/recipes/saved">View saved</Link>}
              </div>
              {demoMode ? (
                <RecipePreview recipe={demoRecipes[0]} />
              ) : (
                <p className="muted-copy">Save recipes from the Recipes page to keep them with your weekly planning flow.</p>
              )}
            </section>

            {!demoMode && (
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <p>Goals</p>
                    <h2>Personal notes</h2>
                  </div>
                </div>
                <div className="goal-form">
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(event) => setNewGoal(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && addPersonalGoal()}
                    placeholder="Add a nutrition or meal prep goal"
                  />
                  <button type="button" onClick={addPersonalGoal}>Add</button>
                </div>
                <div className="goal-list">
                  {personalGoals.length ? personalGoals.map((goal) => (
                    <div className={`goal-item ${goal.completed ? 'is-complete' : ''}`} key={goal.id}>
                      <label>
                        <input type="checkbox" checked={goal.completed} onChange={() => toggleGoal(goal.id)} />
                        <span>{goal.text}</span>
                      </label>
                      <button type="button" onClick={() => deleteGoal(goal.id)} aria-label={`Delete ${goal.text}`}>
                        Delete
                      </button>
                    </div>
                  )) : (
                    <p className="muted-copy">No goals yet. Add one small next step.</p>
                  )}
                </div>
              </section>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

function buildDailyNutrition(plan) {
  return DAYS.reduce((acc, day) => {
    acc[day] = plan[day]?.totalNutrition || {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0
    };
    return acc;
  }, {});
}

function formatFirestoreDate(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') {
    return formatDisplayDate(value.toDate());
  }
  return formatDisplayDate(value);
}

function formatDisplayDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function now() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function elapsed(startedAt) {
  return Math.round(now() - startedAt);
}

function logDashboardGenerationTiming(timings) {
  if (!isDevelopment) return;
  console.info('optimeal.dashboardGeneration.timing', timings);
}

function SummaryCard({ label, value, detail }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function DemoStoryItem({ title, copy }) {
  return (
    <article>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function DayMealCard({ day, dayPlan, onFocusMeal }) {
  return (
    <article className="day-card">
      <div className="day-card__header">
        <h3>{day}</h3>
        <span>{dayPlan.totalNutrition.calories || '--'} kcal</span>
      </div>
      <div className="day-card__meals">
        {MEAL_TYPES.map((type) => {
          const meal = dayPlan.meals[type];
          return (
            <div className="meal-line" key={type}>
              <span>{mealDisplayName(type)}</span>
              <div>
                <strong>{meal.name || 'Not planned'}</strong>
                {meal.name && (
                  <small>
                    {meal.calories || '--'} kcal - {meal.protein || '--'}g protein
                  </small>
                )}
              </div>
              {meal.name && (
                <button type="button" onClick={() => onFocusMeal(type)}>
                  Details
                </button>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function NutritionBar({ label, value, target, unit }) {
  const percent = target ? Math.min(Math.round((Number(value || 0) / Number(target)) * 100), 140) : 0;
  return (
    <div className="nutrition-bar">
      <div>
        <span>{label}</span>
        <strong>{value || '--'} {unit}</strong>
      </div>
      <div className="nutrition-track" aria-hidden="true">
        <span style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <small>{target} {unit} target</small>
    </div>
  );
}

function Macro({ label, value, unit }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '--'} {unit}</strong>
    </div>
  );
}

function ProfileSummary({ profile }) {
  const rows = [
    ['Goal', profile.goal],
    ['Diet', profile.dietType],
    ['Allergies', profile.allergies.length ? profile.allergies.join(', ') : 'None listed'],
    ['Avoids', profile.foodsToAvoid || 'None listed'],
    ['Cuisines', profile.preferredCuisines.length ? profile.preferredCuisines.join(', ') : 'Flexible'],
    ['Cooking time', profile.cookingTime],
    ['Budget', profile.budgetLevel],
    ['Servings', profile.servings],
    ['Appliances', profile.appliances.length ? profile.appliances.join(', ') : 'Not specified']
  ];

  return (
    <dl className="profile-summary">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProfileEditor({ profile, updateProfileField, toggleProfileArrayValue, onSave, saveMessage }) {
  return (
    <div className="profile-editor">
      <label>
        Username
        <input value={profile.username} onChange={(event) => updateProfileField('username', event.target.value)} />
      </label>
      <div className="form-grid">
        <label>
          Age
          <input type="number" value={profile.age} onChange={(event) => updateProfileField('age', event.target.value)} min="13" />
        </label>
        <label>
          Sex
          <select value={profile.sex} onChange={(event) => updateProfileField('sex', event.target.value)}>
            <option>Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          Height (cm)
          <input type="number" value={profile.heightCm} onChange={(event) => updateProfileField('heightCm', event.target.value)} min="80" />
        </label>
        <label>
          Weight (kg)
          <input type="number" value={profile.weightKg} onChange={(event) => updateProfileField('weightKg', event.target.value)} min="20" />
        </label>
      </div>
      <label>
        Goal
        <select value={profile.goal} onChange={(event) => updateProfileField('goal', event.target.value)}>
          <option>Maintain weight</option>
          <option>Lose weight</option>
          <option>Gain weight</option>
        </select>
      </label>
      <label>
        Diet type
        <select value={profile.dietType} onChange={(event) => updateProfileField('dietType', event.target.value)}>
          {DIET_TYPES.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
      <CheckboxGroup
        label="Allergies"
        options={ALLERGY_OPTIONS}
        values={profile.allergies}
        onToggle={(value) => toggleProfileArrayValue('allergies', value)}
      />
      <label>
        Custom allergies
        <input value={profile.customAllergies} onChange={(event) => updateProfileField('customAllergies', event.target.value)} placeholder="Optional" />
      </label>
      <label>
        Foods to avoid
        <input value={profile.foodsToAvoid} onChange={(event) => updateProfileField('foodsToAvoid', event.target.value)} placeholder="e.g. mushrooms, spicy food" />
      </label>
      <CheckboxGroup
        label="Preferred cuisines"
        options={CUISINE_OPTIONS}
        values={profile.preferredCuisines}
        onToggle={(value) => toggleProfileArrayValue('preferredCuisines', value)}
      />
      <div className="form-grid">
        <label>
          Cooking skill
          <select value={profile.cookingSkill} onChange={(event) => updateProfileField('cookingSkill', event.target.value)}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </label>
        <label>
          Available cooking time
          <select value={profile.cookingTime} onChange={(event) => updateProfileField('cookingTime', event.target.value)}>
            <option>15 minutes</option>
            <option>30 minutes</option>
            <option>45 minutes</option>
            <option>60 minutes</option>
          </select>
        </label>
        <label>
          Budget
          <select value={profile.budgetLevel} onChange={(event) => updateProfileField('budgetLevel', event.target.value)}>
            <option>Budget</option>
            <option>Moderate</option>
            <option>Flexible</option>
          </select>
        </label>
        <label>
          Meals per day
          <input type="number" min="1" max="6" value={profile.mealsPerDay} onChange={(event) => updateProfileField('mealsPerDay', event.target.value)} />
        </label>
        <label>
          Servings
          <input type="number" min="1" max="8" value={profile.servings} onChange={(event) => updateProfileField('servings', event.target.value)} />
        </label>
        <label>
          Target calories
          <input type="number" min="1000" value={profile.targetCalories} onChange={(event) => updateProfileField('targetCalories', event.target.value)} placeholder="Optional" />
        </label>
        <label>
          Protein target (g)
          <input type="number" min="0" value={profile.targetProtein} onChange={(event) => updateProfileField('targetProtein', event.target.value)} placeholder="Optional" />
        </label>
      </div>
      <CheckboxGroup
        label="Appliances"
        options={APPLIANCE_OPTIONS}
        values={profile.appliances}
        onToggle={(value) => toggleProfileArrayValue('appliances', value)}
      />
      <button className="dashboard-button dashboard-button--primary" type="button" onClick={onSave}>Save profile</button>
      {saveMessage && <p className="form-message">{saveMessage}</p>}
    </div>
  );
}

function CheckboxGroup({ label, options, values, onToggle }) {
  return (
    <fieldset className="checkbox-fieldset">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option}>
            <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function GroceryPreview({ groups }) {
  const visibleGroups = GROCERY_CATEGORIES
    .map((category) => [category, groups[category] || []])
    .filter(([, items]) => items.length > 0)
    .slice(0, 4);

  if (!visibleGroups.length) {
    return <p className="muted-copy">No grocery items yet. Add ingredients from your meal plan.</p>;
  }

  return (
    <div className="grocery-preview">
      {visibleGroups.map(([category, items]) => (
        <div key={category}>
          <h3>{category}</h3>
          <ul>
            {items.slice(0, 4).map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <strong>{item.quantity} {item.unit}</strong>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RecipePreview({ recipe }) {
  return (
    <article className="recipe-preview">
      <h3>{recipe.title}</h3>
      <p>{recipe.description}</p>
      <div className="macro-row">
        <Macro label="Calories" value={recipe.calories} unit="kcal" />
        <Macro label="Protein" value={recipe.protein} unit="g" />
      </div>
      <div className="tag-row">
        {recipe.tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>
    </article>
  );
}

export default Dashboard;
