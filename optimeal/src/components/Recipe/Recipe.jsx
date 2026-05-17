import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import AppNav from '../shared/AppNav';
import './Recipe.css';

function Recipe() {
  return (
    <div>
      <AppNav />
      <main className="recipe-page">
        <section className="recipe-page__header">
          <p>Recipe workspace</p>
          <h1>Recipes</h1>
        </section>

        <nav className="recipe-tabs" aria-label="Recipe sections">
          <NavLink to="new" className={({ isActive }) => isActive ? 'active' : ''}>Share Recipe</NavLink>
          <NavLink to="explore" className={({ isActive }) => isActive ? 'active' : ''}>Explore</NavLink>
          <NavLink to="saved" className={({ isActive }) => isActive ? 'active' : ''}>Saved Recipes</NavLink>
        </nav>

        <section className="recipe-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default Recipe;
