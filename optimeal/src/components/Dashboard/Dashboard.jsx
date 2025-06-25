import './Dashboard.css'
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link for navigation
import { useState } from 'react'; // Import useState for state management
//import userImg from './Images/user-profile-icon-free-vector.jpg'; // Import user image
import { db, auth } from '../auth/firebase'; // Import Firebase auth and db
import { collection, doc, getDoc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { signOut } from 'firebase/auth';




function App() {
  const [isEditing, setIsEditing] = useState(false);
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
  const navigate = useNavigate();
  const [currentNutrition, setCurrentNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [saveSuccess, setSaveSuccess] = useState(false);

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
          // Load all profile fields from Firestore
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
        }
      } else {
        // User is not authenticated, redirect to login
        navigate('/login');
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
      age,
      sex,
      height,
      activityLevel,
      weight,
      goal,
      allergies,
      preferences,
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
      const cleanResponse = apiResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const data = JSON.parse(cleanResponse);

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
        acc[day] = data.days[day] || {
          breakfast: "",
          lunch: "",
          dinner: "",
          groceries: {}
        };
        return acc;
      }, {});

      console.log("Final ordered meals:", orderedMeals);

      return {
        meals: orderedMeals,
        nutrition: data.nutrition || { calories: 0, protein: 0, carbs: 0, fats: 0 }
      };
    } catch (error) {
      console.error("Parsing error:", error);
      throw new Error("Failed to parse meal plan response");
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
          {/*<a href="#">Social</a>*/}
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
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(dayName => (
                  <tr key={dayName}>
                    <td>{dayName}</td>
                    <td>{currentMeals[dayName]?.breakfast || ''}</td>
                    <td>{currentMeals[dayName]?.lunch || ''}</td>
                    <td>{currentMeals[dayName]?.dinner || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button class="generate-btn" onClick={async () => {
              setIsLoading(true);
              setError(null);

              try {
                // Build the prompt using user profile data
                const prompt = `Generate a 7-day meal plan for 
                                Age: ${age}
                                Sex: ${sex}
                                Height: ${height}
                                Weight: ${weight}
                                Activity Level: ${activityLevel}
                                Goal: ${goal}
                                Dietary restrictions: ${allergies.join(', ') || 'none'}
                                Preferences: ${preferences.join(', ') || 'none'}

                                Return ONLY pure JSON (no markdown, no notes) in this exact format:
                                {
                                  "days": {
                                    "Monday": {
                                    "breakfast": "1-2 word description",
                                    "lunch": "1-2 word description",
                                    "dinner": "1-2 word description",
                                    "groceries": {
                                      "breakfast": ["ingredient1", "ingredient2"],
                                      "lunch": ["ingredient1", "ingredient2"],
                                      "dinner": ["ingredient1", "ingredient2"]
                                    }
                                  },
                                  // From Monday to Sunday
                                },
                                "nutrition": {
                                  "calories": number,
                                  "protein": number,
                                  "carbs": number,
                                  "fats": number
                                }
                                }`;

                const apiResponse = await callOpenRouter(prompt);
                console.log("API Response:", apiResponse);
                const { meals, nutrition } = parseMealPlanResponse(apiResponse);

                // Update state
                setCurrentMeals(meals);
                setCurrentNutrition(nutrition);
                console.log("Parsed Meals:", meals);
                console.log("Parsed Nutrition:", nutrition);

                // Store in Firebase
                if (userId) {
                  const userRef = doc(db, "users", userId);
                  await setDoc(userRef, {
                    currentMeals: meals,
                    nutrition: nutrition,
                    updatedAt: new Date()
                  }, { merge: true });
                }
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

          {/* Profile Card */}
          <div className="profile card">
            <div className="profile-header">
              <h2>My Profile</h2>
            </div>

            {!isEditing ? (
              <div id="profile-content">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;


