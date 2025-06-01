import React from 'react';
import { Link } from 'react-router-dom';
import './Welcome.css';
import welcomeImage from './assets/mealplanimage.jpg'; // Import your image

function Welcome() {
  return (
    <div className="welcome-container">
      <h1 className="welcome-header">Welcome to OPTIMEAL!</h1>
      <img 
        src={welcomeImage} 
        alt="Healthy food presentation" 
        className="welcome-image"
      />
      <p className="welcome-text">
        OPTIMEAL is your go-to platform for personalized meal planning and nutrition tracking.
        Discover delicious recipes tailored to your dietary needs and achieve your health goals.
      </p>
      <p className="welcome-cta">
        <strong>Get started today!</strong>
      </p>
      <div className="welcome-links">
        <Link to="/login" className="welcome-link login">Login</Link>
        <Link to="/register" className="welcome-link register">Register</Link>
      </div>
    </div>
  );
}

export default Welcome;