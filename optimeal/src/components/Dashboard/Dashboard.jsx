import './Dashboard.css'
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { useState } from 'react'; // Import useState for state management
import userImg from './Images/user-profile-icon-free-vector.jpg'; // Import user image
import { db, auth } from '../auth/firebase'; // Import Firebase auth and db
import { collection, doc, getDoc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { signOut } from 'firebase/auth';



function App(){
  const [isEditing, setIsEditing] = useState(false);
  const [weight, setWeight] = useState("140 lbs");
  const [goal, setGoal] = useState("Maintain weight");
  const [allergies, setAllergies] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const allergyOptions = ["Peanuts", "Dairy", "Gluten"];
  const preferenceOptions = ["Vegetarian", "Vegan", "Halal"];

  const toggleCheckbox = (value, list, setList) => {
      if (list.includes(value)) {
        setList(list.filter(item => item !== value));
      } else {
        setList([...list, value]);
      }
    };

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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log("User is authenticated:", user.uid);
        setUserId(user.uid);
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
        const data = userSnap.data();
        setWeight(data.weight || "");
        setGoal(data.goal || "Maintain weight");
        setAllergies(data.allergies || []);
        setPreferences(data.preferences || []);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!userId) {
      console.error("User not authenticated");
      return;
    }

    const userRef = doc(db, "users", userId);
    const userData = {
      weight,
      goal,
      allergies,
      preferences,
      updatedAt: new Date()
    };

    try {
      await setDoc(userRef, userData, { merge: true });
      console.log("User profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user profile:", error);
    }
  };

  const currentMeals = mealPlans[goal];
  const currentNutrition = nutrition[goal];

  const [userId, setUserId] = useState(null);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      console.log("User logged out successfully");
      setUserId(null);
      window.location.href = '/'; // Redirect to home page after logout
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }


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
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
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
              <p>Allergies: <span>{allergies.length ? allergies.join(', ') : 'None'}</span></p>
              <p>Preferences: <span>{preferences.length ? preferences.join(', ') : 'None'}</span></p>
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
              <p>
                Allergies:<br />
                {allergyOptions.map(option => (
                  <label key={option}>
                    <input
                      type="checkbox"
                      checked={allergies.includes(option)}
                      onChange={() => toggleCheckbox(option, allergies, setAllergies)}
                    /> {option}
                  </label>
                ))}
              </p>
              <p>
                Preferences:<br />
                {preferenceOptions.map(option => (
                  <label key={option}>
                    <input
                      type="checkbox"
                      checked={preferences.includes(option)}
                      onChange={() => toggleCheckbox(option, preferences, setPreferences)}
                    /> {option}
                  </label>
                ))}
              </p>
              <button className="save-btn" onClick={handleSave}>Save</button>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="avatar card">
          <img src={userImg} alt="User Profile" />
        </div>
      </div>
    </div>
  );
}
export default App;

       
    