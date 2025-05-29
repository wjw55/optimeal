import './Dashboard.css'
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { useState } from 'react'; // Import useState for state management
import userImg from './Images/user-profile-icon-free-vector.jpg'; // Import user image

const Dashboard=() => {
  const [isEditing, setIsEditing] = useState(false);
  const [weight, setWeight] = useState("140 lbs");
  const [goal, setGoal] = useState("Maintain weight");

  const mealPlans = {
    "Maintain weight": ["Chicken Breast", "Salad", "Chicken Breast", "Taco", "Salmon", "Jiawei Fried Rice", "Hospital Food"],
    "Lose weight": ["Boiled Eggs", "Green Smoothie", "Steamed Veggies", "Grilled Fish", "Tofu Salad", "Broccoli Soup", "Fruit Bowl"],
    "Gain weight": ["Steak", "Pasta", "Peanut Butter Sandwich", "Burger", "Fried Rice", "Pizza", "Protein Shake"]
  };

  const nutrition = {
    "Maintain weight": { calories: 1800, carbs: 200, fats: 60 },
    "Lose weight": { calories: 1500, carbs: 120, fats: 40 },
    "Gain weight": { calories: 2500, carbs: 300, fats: 100 }
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const currentMeals = mealPlans[goal];
  const currentNutrition = nutrition[goal];

  return (
    <div className="App">
      {/* Navbar */}
      <div className="navbar">
        <div className="branding">
          <h1>OPTIMEAL</h1>
        </div>
        <nav>
          <a href="#">Dashboard</a>
          <a href="#">Meals</a>
          <a href="#">Grocery List</a>
          <a href="#">Settings</a>
        </nav>
      </div>

      {/* Dashboard */}
      <div className="dashboard">
        {/* Weekly Meal Plan */}
        <div className="weekly-meal-plan card">
          <h2>Weekly Meal Plan</h2>
          <table>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
              <tr key={day}>
                <td>{day}</td>
                <td>{currentMeals[idx]}</td>
              </tr>
            ))}
          </table>
        </div>

        {/* Nutritional Overview */}
        <div className="nutrition-overview card">
          <h2>Nutritional Overview</h2>
          <div className="nutrition-stats">
            <div className="stat">
              <p>Calories</p><strong>{currentNutrition.calories}</strong><span>kcal</span>
            </div>
            <div className="stat">
              <p>Carbs</p><strong>{currentNutrition.carbs}</strong><span>g</span>
            </div>
            <div className="stat">
              <p>Fats</p><strong>{currentNutrition.fats}</strong><span>g</span>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="profile card">
          <div className="profile-header">
            <h2>My Profile</h2>
            {!isEditing && <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit</button>}
          </div>

          {!isEditing ? (
            <div id="profile-content">
              <p>Weight: <span>{weight}</span></p>
              <p>Goal: <span>{goal}</span></p>
            </div>
          ) : (
            <div id="profile-edit">
              <p>
                Weight: <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </p>
              <p>
                Goal:
                <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                  <option>Maintain weight</option>
                  <option>Lose weight</option>
                  <option>Gain weight</option>
                </select>
              </p>
              <button className="save-btn" onClick={handleSave}>Save</button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="avatar card">
          <img  src= {userImg} alt="User Profile" />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

    