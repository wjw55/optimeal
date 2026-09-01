import React from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

function AuthShell({ eyebrow, title, description, children, footer }) {
  return (
    <main className="auth-page">
      <Link className="auth-home" to="/" aria-label="Return to Optimeal home">Optimeal</Link>
      <section className="auth-layout">
        <aside className="auth-intro" aria-label="Why use Optimeal">
          <p className="auth-eyebrow">Plan a better week</p>
          <h1>Meals, nutrition, and groceries in one calm workspace.</h1>
          <p>Tell Optimeal what matters to you, then review the plan before saving it to your week.</p>
          <ul>
            <li>Plans shaped around your goals and dietary needs</li>
            <li>Clear nutrition and ingredient details</li>
            <li>A practical, categorized grocery list</li>
          </ul>
        </aside>
        <div className="auth-card">
          <p className="auth-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="auth-description">{description}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </section>
    </main>
  );
}

export default AuthShell;
