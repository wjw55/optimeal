import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../auth/firebase';
import './AppNav.css';

function AppNav({ demoMode = false }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <header className="app-nav">
      <Link to={demoMode ? '/demo' : '/dashboard'} className="app-nav__brand" aria-label="Optimeal home">
        Optimeal
      </Link>

      <nav className="app-nav__links" aria-label="Primary navigation">
        {demoMode ? (
          <>
            <NavLink to="/demo">Demo</NavLink>
            <Link to="/register">Create Account</Link>
            <Link to="/login">Login</Link>
          </>
        ) : (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/recipes">Recipes</NavLink>
            <NavLink to="/grocery">Grocery List</NavLink>
            <NavLink to="/social">Community</NavLink>
            <button className="app-nav__logout" type="button" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

export default AppNav;
