import './Dashboard.css'
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link for navigation
import { useState } from 'react'; // Import useState for state management
//import userImg from './Images/user-profile-icon-free-vector.jpg'; // Import user image
import { db, auth } from '../auth/firebase'; // Import Firebase auth and db
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Import Firestore functions




function App() {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("20");
  const [sex, setSex] = useState("Male");
  const [weight, setWeight] = useState("80 kg");
  const [activityLevel, setActivityLevel] = useState("Moderate");
  const [height, setHeight] = useState("180 cm");
  const [goal, setGoal] = useState("Maintain weight");
  const [allergies, setAllergies] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const allergyOptions = ["Peanuts", "Dairy", "Gluten"];
  const preferenceOptions = ["Vegetarian", "Vegan", "Halal"];
  const [isLoading, setIsLoading] = useState(false);
  const [currentMeals, setCurrentMeals] = useState({
    Monday: { breakfast: "", lunch: "", dinner: "" },
    Tuesday: { breakfast: "", lunch: "", dinner: "" },
    Wednesday: { breakfast: "", lunch: "", dinner: "" },
    Thursday: { breakfast: "", lunch: "", dinner: "" },
    Friday: { breakfast: "", lunch: "", dinner: "" },
    Saturday: { breakfast: "", lunch: "", dinner: "" },
    Sunday: { breakfast: "", lunch: "", dinner: "" }
  });
  const navigate = useNavigate();
  const [currentNutrition, setCurrentNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [dailyNutrition, setDailyNutrition] = useState({
    Monday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    Tuesday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    Wednesday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    Thursday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    Friday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    Saturday: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    Sunday: { calories: 0, protein: 0, carbs: 0, fats: 0 }
  });
  const [hoveredDay, setHoveredDay] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Goal tracking states
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [personalGoals, setPersonalGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [goalProgress, setGoalProgress] = useState({});

  const toggleCheckbox = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter(item => item !== value));
    } else {
      setList([...list, value]);
    }
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
          const isIncomplete = !data.username || !data.age || !data.height || !data.weight || !data.goal || !data.activityLevel;
          if (isIncomplete) {
            navigate('/complete-profile');
            return;
          }
          // Load all profile fields from Firestore
          setUsername(data.username || "");
          setAge(data.age || "20");
          setSex(data.sex || "Male");
          setHeight(data.height || "180 cm");
          setWeight(data.weight || "80 kg");
          setActivityLevel(data.activityLevel || "Moderate");
          setGoal(data.goal || "Maintain weight");
          setAllergies(data.allergies || []);
          setPreferences(data.preferences || []);

          
          // Also load meal plan data if it exists
          if (data.currentMeals) {
            setCurrentMeals(data.currentMeals);
          }
          if (data.nutrition) {
            setCurrentNutrition(data.nutrition);
          }
          if (data.dailyNutrition) {
            setDailyNutrition(data.dailyNutrition);
          }

          // Load goal tracking data
          if (data.personalGoals) {
            setPersonalGoals(data.personalGoals);
          }
          if (data.currentWeight) {
            setCurrentWeight(data.currentWeight);
          }
          if (data.targetWeight) {
            setTargetWeight(data.targetWeight);
          }
          if (data.targetDate) {
            setTargetDate(data.targetDate);
          }
        }
      } else {
        // User is not authenticated, redirect to login
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, []);

  // Goal tracking functions
  const addPersonalGoal = () => {
    if (newGoal.trim()) {
      const goal = {
        id: Date.now(),
        text: newGoal.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };
      setPersonalGoals([...personalGoals, goal]);
      setNewGoal('');
      saveGoalsToFirebase([...personalGoals, goal]);
    }
  };

  const toggleGoalCompletion = (goalId) => {
    const updatedGoals = personalGoals.map(goal =>
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    );
    setPersonalGoals(updatedGoals);
    saveGoalsToFirebase(updatedGoals);
  };

  const deleteGoal = (goalId) => {
    const updatedGoals = personalGoals.filter(goal => goal.id !== goalId);
    setPersonalGoals(updatedGoals);
    saveGoalsToFirebase(updatedGoals);
  };

  const saveGoalsToFirebase = async (goals) => {
    if (!userId) return;
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        personalGoals: goals,
        currentWeight,
        targetWeight,
        targetDate
      }, { merge: true });
    } catch (error) {
      console.error("Error saving goals:", error);
    }
  };


  const handleSave = async () => {
    if (!userId) {
      console.error("User not authenticated");
      return;
    }

    const userRef = doc(db, "users", userId);
    const userData = {
      username,
      age,
      sex,
      height,
      activityLevel,
      weight,
      goal,
      allergies,
      preferences,
      personalGoals,
      currentWeight,
      targetWeight,
      targetDate,
      updatedAt: new Date()
    };

    try {
      await setDoc(userRef, userData, { merge: true });
      console.log("User profile updated successfully");
      setSaveSuccess(true);
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user profile:", error);
    }
  };


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
      console.log("Raw API Response:", apiResponse);

      // Try multiple cleaning approaches
      let cleanResponse = apiResponse;

      // Remove markdown code blocks
      cleanResponse = cleanResponse
        .replace(/```json/gi, '')
        .replace(/```JSON/gi, '')
        .replace(/```/g, '')
        .trim();

      // Find JSON object boundaries
      const firstBrace = cleanResponse.indexOf('{');
      const lastBrace = cleanResponse.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1);
      }

      console.log("Cleaned Response:", cleanResponse);

      let data;
      try {
        data = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        // Try to fix common JSON issues
        cleanResponse = cleanResponse
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/'/g, '"'); // Replace single quotes with double quotes

        console.log("Attempting to parse fixed JSON:", cleanResponse);
        data = JSON.parse(cleanResponse);
      }

      console.log("Parsed Data:", data);

      // Define the exact order we want
      const dayOrder = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ];

      // Create ordered object using reduce
      const orderedMeals = dayOrder.reduce((acc, day) => {
        acc[day] = data.days?.[day] || {
          breakfast: "",
          lunch: "",
          dinner: "",
          groceries: {}
        };
        return acc;
      }, {});

      // Extract daily nutrition data
      const dailyNutritionData = dayOrder.reduce((acc, day) => {
        acc[day] = data.days?.[day]?.nutrition || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        return acc;
      }, {});

      console.log("Final ordered meals:", orderedMeals);
      console.log("Daily nutrition data:", dailyNutritionData);

      return {
        meals: orderedMeals,
        nutrition: data.nutrition || { calories: 0, protein: 0, carbs: 0, fats: 0 },
        dailyNutrition: dailyNutritionData
      };
    } catch (error) {
      console.error("Parsing error:", error);
      console.error("Failed to parse response:", apiResponse);

      // Return fallback data instead of throwing error
      const fallbackMeals = {
        Monday: { breakfast: "Oatmeal", lunch: "Chicken Salad", dinner: "Grilled Salmon" },
        Tuesday: { breakfast: "Greek Yogurt", lunch: "Turkey Wrap", dinner: "Beef Stir Fry" },
        Wednesday: { breakfast: "Smoothie Bowl", lunch: "Quinoa Bowl", dinner: "Chicken Curry" },
        Thursday: { breakfast: "Eggs Benedict", lunch: "Fish Tacos", dinner: "Pasta Primavera" },
        Friday: { breakfast: "Pancakes", lunch: "Caesar Salad", dinner: "Pork Tenderloin" },
        Saturday: { breakfast: "French Toast", lunch: "Sushi Bowl", dinner: "Lamb Chops" },
        Sunday: { breakfast: "Breakfast Burrito", lunch: "Mediterranean Bowl", dinner: "Roast Chicken" }
      };

      const fallbackNutrition = { calories: 2000, protein: 150, carbs: 200, fats: 70 };
      const fallbackDailyNutrition = {
        Monday: { calories: 2000, protein: 150, carbs: 200, fats: 70 },
        Tuesday: { calories: 1950, protein: 145, carbs: 190, fats: 68 },
        Wednesday: { calories: 2100, protein: 155, carbs: 210, fats: 72 },
        Thursday: { calories: 2050, protein: 148, carbs: 205, fats: 71 },
        Friday: { calories: 1980, protein: 142, carbs: 195, fats: 69 },
        Saturday: { calories: 2150, protein: 160, carbs: 215, fats: 74 },
        Sunday: { calories: 2080, protein: 152, carbs: 200, fats: 73 }
      };

      console.log("Using fallback meal plan due to parsing error");
      return {
        meals: fallbackMeals,
        nutrition: fallbackNutrition,
        dailyNutrition: fallbackDailyNutrition
      };
    }
  };

  useEffect(() => {
    const fetchMealPlan = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            // Set the meal plan if it exists in Firebase
            if (userData.currentMeals) {
              setCurrentMeals(userData.currentMeals);
            }
            // Set nutrition if it exists
            if (userData.nutrition) {
              setCurrentNutrition(userData.nutrition);
            }
            // Set daily nutrition if it exists
            if (userData.dailyNutrition) {
              setDailyNutrition(userData.dailyNutrition);
            }
          }
        } catch (error) {
          console.error("Error fetching meal plan:", error);
        }
      }
    };

    fetchMealPlan();
  }, []);



  return (
    <div className="App">
      {/* Navbar */}
      <div className="navbar">
        <div className="branding">
          <h1>OPTIMEAL</h1>
        </div>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/recipes">Recipes</Link>
          <Link to="/grocery">Grocery List</Link>
          <Link to="/social">Forum</Link>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </nav>
      </div>

      {/* Dashboard */}
      <div className="dashboard">
        {/* Main Content Area */}
        <div className="main-content">
          {/* Weekly Meal Plan - Now wider and more prominent */}
          <div className="weekly-meal-plan-wide card">
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
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(dayName => (
                  <tr
                    key={dayName}
                    onMouseEnter={() => setHoveredDay(dayName)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={hoveredDay === dayName ? 'hovered-day' : ''}
                  >
                    <td>{dayName}</td>
                    <td>{currentMeals[dayName]?.breakfast || ''}</td>
                    <td>{currentMeals[dayName]?.lunch || ''}</td>
                    <td>{currentMeals[dayName]?.dinner || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Daily Nutrition Tooltip */}
            

            <button class="generate-btn" onClick={async () => {
              setIsLoading(true);

              try {
                // Build the prompt using user profile data
                const prompt = `Create a 7-day meal plan for:
Age: ${age}, Sex: ${sex}, Height: ${height}, Weight: ${weight}
Activity: ${activityLevel}, Goal: ${goal}
Allergies: ${allergies.join(', ') || 'none'}
Preferences: ${preferences.join(', ') || 'none'}

Return ONLY valid JSON with this structure:
{
  "days": {
    "Monday": {
      "breakfast": "Oatmeal",
      "lunch": "Chicken Salad",
      "dinner": "Grilled Salmon",
      "nutrition": {"calories": 2000, "protein": 150, "carbs": 200, "fats": 70}
    },
    "Tuesday": {
      "breakfast": "Greek Yogurt",
      "lunch": "Turkey Wrap",
      "dinner": "Beef Stir Fry",
      "nutrition": {"calories": 1950, "protein": 145, "carbs": 190, "fats": 68}
    },
    "Wednesday": {
      "breakfast": "Smoothie Bowl",
      "lunch": "Quinoa Bowl",
      "dinner": "Chicken Curry",
      "nutrition": {"calories": 2100, "protein": 155, "carbs": 210, "fats": 72}
    },
    "Thursday": {
      "breakfast": "Eggs Benedict",
      "lunch": "Fish Tacos",
      "dinner": "Pasta Primavera",
      "nutrition": {"calories": 2050, "protein": 148, "carbs": 205, "fats": 71}
    },
    "Friday": {
      "breakfast": "Pancakes",
      "lunch": "Caesar Salad",
      "dinner": "Pork Tenderloin",
      "nutrition": {"calories": 1980, "protein": 142, "carbs": 195, "fats": 69}
    },
    "Saturday": {
      "breakfast": "French Toast",
      "lunch": "Sushi Bowl",
      "dinner": "Lamb Chops",
      "nutrition": {"calories": 2150, "protein": 160, "carbs": 215, "fats": 74}
    },
    "Sunday": {
      "breakfast": "Breakfast Burrito",
      "lunch": "Mediterranean Bowl",
      "dinner": "Roast Chicken",
      "nutrition": {"calories": 2080, "protein": 152, "carbs": 200, "fats": 73}
    }
  },
  "nutrition": {"calories": 2050, "protein": 150, "carbs": 202, "fats": 71}
}`;

                const apiResponse = await callOpenRouter(prompt);
                console.log("API Response:", apiResponse);
                const { meals, nutrition, dailyNutrition } = parseMealPlanResponse(apiResponse);

                // Update state
                setCurrentMeals(meals);
                setCurrentNutrition(nutrition);
                setDailyNutrition(dailyNutrition);
                console.log("Parsed Meals:", meals);
                console.log("Parsed Nutrition:", nutrition);
                console.log("Parsed Daily Nutrition:", dailyNutrition);

                // Store in Firebase
                if (userId) {
                  const userRef = doc(db, "users", userId);
                  await setDoc(userRef, {
                    currentMeals: meals,
                    nutrition: nutrition,
                    dailyNutrition: dailyNutrition,
                    updatedAt: new Date()
                  }, { merge: true });
                }
              } catch (err) {
                console.error("Failed to generate meal plan:", err);
                alert("Failed to generate meal plan: " + (err.message || "Unknown error"));
              } finally {
                setIsLoading(false);
              }
            }}>
              {isLoading ? "Generating..." : "Generate Meal Plan"}
            </button>
          </div>

          {/* Goal Tracker */}
          <div className="goal-tracker card">
            <h2>Goal Tracker</h2>

            {/* Weight Goal Section */}
            <div className="weight-goal-section">
              <h3>Weight Goal</h3>
              <div className="weight-inputs">
                <div className="input-group">
                  <label>Current Weight (kg)</label>
                  <input
                    type="number"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    placeholder="Enter current weight"
                  />
                </div>
                <div className="input-group">
                  <label>Target Weight (kg)</label>
                  <input
                    type="number"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="Enter target weight"
                  />
                </div>
                <div className="input-group">
                  <label>Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Personal Goals Section */}
            <div className="personal-goals-section">
              <h3>Personal Goals</h3>
              <div className="add-goal">
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  placeholder="Add a new goal..."
                  onKeyDown={(e) => e.key === 'Enter' && addPersonalGoal()}
                />
                <button onClick={addPersonalGoal} className="add-goal-btn">Add Goal</button>
              </div>

              <div className="goals-list">
                {personalGoals.map(goal => (
                  <div key={goal.id} className={`goal-item ${goal.completed ? 'completed' : ''}`}>
                    <div className="goal-content">
                      <input
                        type="checkbox"
                        checked={goal.completed}
                        onChange={() => toggleGoalCompletion(goal.id)}
                      />
                      <span className="goal-text">{goal.text}</span>
                    </div>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="delete-goal-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {personalGoals.length === 0 && (
                  <p className="no-goals">No goals yet. Add your first goal above!</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          {/* Daily Nutrition Display - Interactive */}
          <div className="daily-nutrition-display card">
            <h2>Daily Nutrition</h2>
            {hoveredDay ? (
              <div className="selected-day-nutrition">
                <h3>{hoveredDay}</h3>
                <div className="nutrition-stats">
                  <div className="stat">
                    <p>Calories</p>
                    <strong>{dailyNutrition[hoveredDay]?.calories || "--"}</strong>
                    <span>kcal</span>
                  </div>
                  <div className="stat">
                    <p>Protein</p>
                    <strong>{dailyNutrition[hoveredDay]?.protein || "--"}</strong>
                    <span>g</span>
                  </div>
                  <div className="stat">
                    <p>Carbs</p>
                    <strong>{dailyNutrition[hoveredDay]?.carbs || "--"}</strong>
                    <span>g</span>
                  </div>
                  <div className="stat">
                    <p>Fats</p>
                    <strong>{dailyNutrition[hoveredDay]?.fats || "--"}</strong>
                    <span>g</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="nutrition-placeholder">
                <p>Hover over a day in the meal plan to see detailed nutrition information</p>
                <div className="weekly-average">
                  <h4>Weekly Average</h4>
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
              </div>
            )}
          </div>

          {/* Profile Card */}
          <div className="profile card">
            <div className="profile-header">
              <h2>My Profile</h2>
            </div>

            {!isEditing ? (
              <div id="profile-content">
                <p>Username: <span>{username}</span></p>
                <p>Age: <span>{age}</span></p>
                <p>Sex: <span>{sex}</span></p>
                <p>Height: <span>{height}</span></p>
                <p>Weight: <span>{weight}</span></p>
                <p>Activity Level: <span>{activityLevel}</span></p>
                <p>Goal:<span>{goal}</span></p>
                <p>Allergies: <span>{allergies.length ? allergies.join(', ') : 'None'}</span></p>
                <p>Preferences: <span>{preferences.length ? preferences.join(', ') : 'None'}</span></p>
                {!isEditing && <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit</button>}

              </div>
            ) : (
              <div id="profile-edit">
                <p>
                  <span>Username</span>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
                </p>
                <p>
                  <span>Age</span>
                  <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                </p>
                <p>
                  <span>Sex</span>
                  <select value={sex} onChange={(e) => setSex(e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </p>
                <p>
                  <span>Height</span>
                  <input type="text" value={height} onChange={(e) => setHeight(e.target.value)} />
                </p>
                <p>
                  <span>Weight</span>
                  <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </p>
                <p>
                  <span>Activity Level</span>
                  <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                    <option>Moderate</option>
                    <option>Intense</option>
                    <option>Light</option>
                  </select>
                </p>
                <p>
                  <span>Goal</span>
                  <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                    <option>Maintain weight</option>
                    <option>Lose weight</option>
                    <option>Gain weight</option>
                  </select>
                </p>
                <p>
                  <span>Allergies</span>
                  <div className="checkbox-group">
                    {allergyOptions.map(option => (
                      <label key={option}>
                        <input
                          type="checkbox"
                          checked={allergies.includes(option)}
                          onChange={() => toggleCheckbox(option, allergies, setAllergies)}
                        /> {option}
                      </label>
                    ))}
                  </div>
                </p>
                <p>
                  <span>Preferences</span>
                  <div className="checkbox-group">
                    {preferenceOptions.map(option => (
                      <label key={option}>
                        <input
                          type="checkbox"
                          checked={preferences.includes(option)}
                          onChange={() => toggleCheckbox(option, preferences, setPreferences)}
                        /> {option}
                      </label>
                    ))}
                  </div>
                </p>
                <button className="save-btn" onClick={handleSave}>Save</button>
                {saveSuccess && <p style={{color: 'green', textAlign: 'center'}}>Profile saved successfully!</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;


