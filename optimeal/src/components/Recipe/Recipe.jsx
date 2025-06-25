import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { auth } from '../auth/firebase'; // make sure path is correct
import './Recipe.css';

function Recipe() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <div className="App">
      {/* Navbar (copied from Dashboard.jsx) */}
      <div className="navbar">
        <div className="branding">
          <h1>OPTIMEAL</h1>
        </div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/recipes">Recipes</Link>
          <Link to="/grocery">Grocery List</Link>
          {/*<a href="#">Settings</a>*/ }
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </nav>
      </div>

      {/* Tab navigation */}
      <div className="recipe-page">
        <h2>Recipes</h2>
        <div className="recipe-tabs">
          <NavLink to="new" className={({ isActive }) => isActive ? 'active' : ''}>New</NavLink>
          <NavLink to="explore" className={({ isActive }) => isActive ? 'active' : ''}>Explore</NavLink>
          <NavLink to="saved" className={({ isActive }) => isActive ? 'active' : ''}>Saved</NavLink>
        </div>

        <div className="recipe-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Recipe;
