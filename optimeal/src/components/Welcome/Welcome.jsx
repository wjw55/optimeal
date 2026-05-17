import React from 'react';
import { Link } from 'react-router-dom';
import './Welcome.css';

const previewMeals = [
  ['Mon', 'Chicken quinoa bowl', '610 kcal', '48g protein'],
  ['Tue', 'Tofu soba stir fry', '690 kcal', '39g protein'],
  ['Wed', 'Tuna chickpea salad', '590 kcal', '45g protein']
];

function Welcome() {
  return (
    <main className="welcome-page">
      <nav className="welcome-nav" aria-label="Landing navigation">
        <Link to="/" className="welcome-logo">Optimeal</Link>
        <div className="welcome-nav__links">
          <Link to="/demo">Try Demo</Link>
          <Link to="/login">Login</Link>
        </div>
      </nav>

      <section className="welcome-hero">
        <div className="welcome-hero__copy">
          <p className="welcome-kicker">AI meal planning for real weeks</p>
          <h1>Optimeal</h1>
          <p className="welcome-subtitle">
            AI meal planning for your goals, diet, and weekly groceries.
          </p>
          <p className="welcome-description">
            Generate a personalized meal plan, review nutrition, save recipes, and turn your week into a practical shopping list.
          </p>

          <div className="welcome-actions" aria-label="Primary actions">
            <Link to="/demo" className="welcome-button welcome-button--primary">Try Demo</Link>
            <Link to="/register" className="welcome-button welcome-button--secondary">Create Account</Link>
            <Link to="/login" className="welcome-button welcome-button--ghost">Login</Link>
          </div>
        </div>

        <div className="product-preview" aria-label="Optimeal dashboard preview">
          <div className="product-preview__header">
            <div>
              <span>Weekly plan</span>
              <strong>Demo preview</strong>
            </div>
            <span className="product-preview__badge">High protein</span>
          </div>

          <div className="preview-stats">
            <div>
              <strong>21</strong>
              <span>meals planned</span>
            </div>
            <div>
              <strong>1,820</strong>
              <span>avg kcal/day</span>
            </div>
            <div>
              <strong>129g</strong>
              <span>protein/day</span>
            </div>
          </div>

          <div className="preview-meals">
            {previewMeals.map(([day, meal, calories, protein]) => (
              <div className="preview-meal" key={day}>
                <span>{day}</span>
                <strong>{meal}</strong>
                <small>{calories} · {protein}</small>
              </div>
            ))}
          </div>

          <div className="preview-groceries">
            <span>Grocery list</span>
            <div>
              <p>Produce</p>
              <strong>Spinach, broccoli, avocado</strong>
            </div>
            <div>
              <p>Protein</p>
              <strong>Chicken, salmon, tofu</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="welcome-features" aria-label="Optimeal features">
        <article>
          <span>01</span>
          <h2>Personalized Meal Plans</h2>
          <p>Generate weekly meals from your goals, preferences, and profile.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Nutrition at a Glance</h2>
          <p>Review calories, protein, carbs, and fats across your week.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Smart Grocery List</h2>
          <p>Turn planned meals into a categorized shopping checklist.</p>
        </article>
      </section>
    </main>
  );
}

export default Welcome;
