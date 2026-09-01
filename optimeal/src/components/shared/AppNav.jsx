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
      <div className="app-nav__top">
        <Link to={demoMode ? '/demo' : '/dashboard'} className="app-nav__brand" aria-label="Optimeal home">
          Optimeal
        </Link>
        {!demoMode && (
          <button className="app-nav__mobile-logout" type="button" onClick={handleLogout}>Log out</button>
        )}
      </div>

      <nav className={`app-nav__links ${demoMode ? 'app-nav__links--demo' : 'app-nav__links--product'}`} aria-label="Primary navigation">
        {demoMode ? (
          <>
            <NavLink to="/demo">Demo</NavLink>
            <Link to="/register">Create Account</Link>
            <Link to="/login">Login</Link>
          </>
        ) : (
          <>
            <NavLink to="/dashboard"><span aria-hidden="true">⌂</span><span>Dashboard</span></NavLink>
            <NavLink to="/recipes"><span aria-hidden="true">◇</span><span>Recipes</span></NavLink>
            <NavLink to="/grocery"><span aria-hidden="true">✓</span><span>Grocery</span></NavLink>
            <NavLink to="/social"><span aria-hidden="true">○</span><span>Community</span></NavLink>
            <button className="app-nav__logout" type="button" onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

export default AppNav;
