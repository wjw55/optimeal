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
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentMeals, setCurrentMeals] = useState({
  Monday: { breakfast: "", lunch: "", dinner: "" },
  Tuesday: { breakfast: "", lunch: "", dinner: "" },
  Wednesday: { breakfast: "", lunch: "", dinner: "" },
  Thursday: { breakfast: "", lunch: "", dinner: "" }, 
  Friday: { breakfast: "", lunch: "", dinner: "" },
  Saturday: { breakfast: "", lunch: "", dinner: "" },
  Sunday: { breakfast: "", lunch: "", dinner: "" }
});
  const [currentNutrition, setCurrentNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  

  const toggleCheckbox = (value, list, setList) => {
      if (list.includes(value)) {
        setList(list.filter(item => item !== value));
      } else {
        setList([...list, value]);
      }
    };

  const mealPlans = {
    "Maintain weight": ["Chicken Breast", "Salad", "Chicken Breast", "Taco", "Salmon", "Fried Rice", "Hospital Food"],
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

  /*const currentMeals = mealPlans[goal];
  const currentNutrition = nutrition[goal];*/

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

  const callOpenRouter = async (prompt) => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.REACT_APP_OPENROUTER_KEY}`,
        "HTTP-Referer": `${window.location.origin}`, // Dynamic URL
        "X-Title": "Your App Name" // Replace with your app name
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "OpenRouter API request failed");
    }

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error("OpenRouter API error:", error);
    throw error;
  }
};

const parseMealPlanResponse = (apiResponse) => {
  try {
    const jsonString = apiResponse.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(jsonString);
    
    // Return the days object directly instead of converting to array
    return {
      meals: parsedData.days,  // Keep as object {Monday: {...}, Tuesday: {...}, etc}
      nutrition: parsedData.nutrition
    };
  } catch (error) {
    console.error("Error parsing meal plan:", error);
    throw new Error("Failed to process meal plan data");
  }
};
  

  return (
    <div className="App">
      {/* Navbar */}
      <div className="navbar">
        <div className="branding">
          <h1>OPTIMEAL</h1>
          <div className="avatar card">
          <img src={userImg} alt="User Profile" />
          </div>
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
        {/* Dashboard */}
<div className="dashboard">
  {/* Weekly Meal Plan - Now connected to AI */}
  <div className="weekly-meal-plan card">
  <h2>Weekly Meal Plan</h2>
  <table>
  <thead>
    <tr>
      <th>Day</th>
      <th>Breakfast</th>
      <th>Lunch</th>
      <th>Dinner</th>
    </tr>
  </thead>
  <tbody>
    {Object.entries(currentMeals).map(([dayName, meals]) => (
      <tr key={dayName}>
        <td>{dayName}</td>
        <td>{meals.breakfast}</td>
        <td>{meals.lunch}</td>
        <td>{meals.dinner}</td>
      </tr>
    ))}
  </tbody>
</table>
<button onClick={async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    // Build the prompt using user profile data
    const prompt = `Generate a 7-day gluten-free, dairy-free, peanut-free meal plan for ${goal.toLowerCase()} weight.
    Dietary restrictions: ${allergies.join(', ') || 'none'}.
    Preferences: ${preferences.join(', ') || 'none'}.

    Return ONLY pure JSON (no markdown, no notes) in this exact format:
    {
      "days": {
        "Monday": {
        "breakfast": "1-2 word description",
        "lunch": "1-2 word description",
        "dinner": "1-2 word description"
    },
    // ... all days ...
  },
    "nutrition": {
      "calories": number,
      "protein": number,
      "carbs": number,
      "fats": number
      }
    }`;
    const apiResponse = await callOpenRouter(prompt);
    const { meals, nutrition } = parseMealPlanResponse(apiResponse);
    console.log("Parsed Meals:", meals);
    console.log("Parsed Nutrition:", nutrition);
    
    // Update state
    setCurrentMeals(meals);
    setCurrentNutrition(nutrition);
    
    } catch (err) {
      setError(err.message || "Failed to generate meal plan");
    } finally {
      setIsLoading(false);
    }
  }}>
    {isLoading ? "Generating..." : "Generate Meal Plan"}
  </button>
</div>
  {/* Nutritional Overview - Now connected to AI */}
  <div className="nutrition-overview card">
    <h2>Nutritional Overview</h2>
    <div className="nutrition-stats">
      <div className="stat">
        <p>Calories</p>
        <strong>{currentNutrition.calories || "--"}</strong>
        <span>kcal/day</span>
      </div>
      <div className="stat">
        <p>Protein</p>
        <strong>{currentNutrition.protein || "--"}</strong>
        <span>g/day</span>
      </div>
      <div className="stat">
        <p>Carbs</p>
        <strong>{currentNutrition.carbs || "--"}</strong>
        <span>g/day</span>
      </div>
      <div className="stat">
        <p>Fats</p>
        <strong>{currentNutrition.fats || "--"}</strong>
        <span>g/day</span>
      </div>
    </div>
  </div>

  {/* Profile Card (unchanged) */}
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

  
</div>
        
        
      </div>
    </div>
  );
}
export default App;

       
    