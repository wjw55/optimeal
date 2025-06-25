import React, { useState, useEffect } from 'react';
import './grocery.css';
import { db, auth } from '../auth/firebase'
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const meals = ['breakfast', 'lunch', 'dinner'];

const GroceryList = () => {
  const [expandedMeals, setExpandedMeals] = useState({});
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedMeal, setSelectedMeal] = useState('breakfast');
  const [mealPlan, setMealPlan] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemCount, setItemCount] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMealPlan = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists() && userSnap.data().currentMeals) {
            const data = userSnap.data().currentMeals;
            console.log("Fetched meal plan:", data);

            // Ensure each day has a groceries object
            const updatedMealPlan = { ...data };
            days.forEach(day => {
              if (!updatedMealPlan[day]) {
                updatedMealPlan[day] = { breakfast: "", lunch: "", dinner: "", groceries: {} };
              }
              if (!updatedMealPlan[day].groceries) {
                updatedMealPlan[day].groceries = {};
              }
              meals.forEach(meal => {
                if (!updatedMealPlan[day].groceries[meal]) {
                  updatedMealPlan[day].groceries[meal] = [];
                }
              });
            });

            setMealPlan(updatedMealPlan);
          } else {
            // Initialize empty meal plan if none exists
            const emptyMealPlan = days.reduce((acc, day) => {
              acc[day] = {
                breakfast: "",
                lunch: "",
                dinner: "",
                groceries: meals.reduce((mealAcc, meal) => {
                  mealAcc[meal] = [];
                  return mealAcc;
                }, {})
              };
              return acc;
            }, {});

            setMealPlan(emptyMealPlan);
            // Save the empty structure to Firebase
            await setDoc(userRef, { currentMeals: emptyMealPlan }, { merge: true });
          }
        }
      } catch (error) {
        console.error("Error fetching meal plan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMealPlan();
  }, []);

  const toggleMeal = (day, meal) => {
    const key = `${day}-${meal}`;
    setExpandedMeals(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAddItem = async () => {
    if (!itemName || !itemCount || selectedDay === 'all' || !mealPlan) return;

    try {
      const newMealPlan = JSON.parse(JSON.stringify(mealPlan)); // Deep clone to avoid reference issues

      // Ensure the groceries structure exists
      if (!newMealPlan[selectedDay].groceries) {
        newMealPlan[selectedDay].groceries = {};
      }

      if (!newMealPlan[selectedDay].groceries[selectedMeal]) {
        newMealPlan[selectedDay].groceries[selectedMeal] = [];
      }

      // Add new item (without AI: prefix to indicate user-added)
      newMealPlan[selectedDay].groceries[selectedMeal].push(`${itemName} (${itemCount})`);

      // Update state
      setMealPlan(newMealPlan);

      // Update database
      await updateDatabase(newMealPlan);

      // Reset form
      setItemName('');
      setItemCount('');
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleDeleteItem = async (day, meal, index) => {
    try {
      const newMealPlan = JSON.parse(JSON.stringify(mealPlan)); // Deep clone
      newMealPlan[day].groceries[meal].splice(index, 1);

      // Update state
      setMealPlan(newMealPlan);

      // Update database
      await updateDatabase(newMealPlan);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const handleToggleItem = async (day, meal, index) => {
    try {
      const newMealPlan = JSON.parse(JSON.stringify(mealPlan)); // Deep clone
      const item = newMealPlan[day].groceries[meal][index];

      // Toggle checked status by adding/removing "✓ " prefix
      if (item.startsWith("✓ ")) {
        newMealPlan[day].groceries[meal][index] = item.substring(2);
      } else {
        newMealPlan[day].groceries[meal][index] = "✓ " + item;
      }

      // Update state
      setMealPlan(newMealPlan);

      // Update database
      await updateDatabase(newMealPlan);
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const updateDatabase = async (updatedMealPlan) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        console.log("Saving to Firebase:", updatedMealPlan);
        await setDoc(userRef, { currentMeals: updatedMealPlan }, { merge: true });
        console.log("Successfully saved to Firebase");
      }
    } catch (error) {
      console.error("Error updating database:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading) {
    return <div className="loading">Loading grocery list...</div>;
  }

  return (
    <div>
      <div className="navbar">
        <div className="branding">
          <h1>OPTIMEAL</h1>
        </div>

        <nav>
          <Link to='/dashboard'>Dashboard</Link>
          <Link to='/recipes'>Recipes</Link>
          <Link to="/grocery">Grocery List</Link>
          {/*<a href="#">Settings</a>*/ }
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </nav>
      </div>

      <h1 className="title">Grocery List</h1>

      <div className="grocery-form">
        {/* First row: Item and Count */}
        <div className="form-row">
          <input
            type="text"
            placeholder="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="item-input"
          />
          <input
            type="number"
            placeholder="Count"
            value={itemCount}
            onChange={(e) => setItemCount(e.target.value)}
            className="count-input"
          />
        </div>
        
        {/* Second row: Day and Meal selects */}
        <div className="form-row">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="day-meal-select"
          >
            <option value="all" disabled>Select Day</option>
            {days.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
          
          <select
            value={selectedMeal}
            onChange={(e) => setSelectedMeal(e.target.value)}
            className="day-meal-select"
          >
            {meals.map(meal => (
              <option key={meal} value={meal}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</option>
            ))}
          </select>
        </div>
        
        {/* Third row: Add button centered */}
        <div className="button-container">
          <button className="add-btn" onClick={handleAddItem}>Add</button>
        </div>
      </div>

      <select
        className="day-select"
        value={selectedDay === 'all' ? 'all' : selectedDay}
        onChange={(e) => setSelectedDay(e.target.value)}
      >
        <option value="all">All Days</option>
        {days.map(day => (
          <option key={day} value={day}>{day}</option>
        ))}
      </select>

      {mealPlan && days
        .filter(day => selectedDay === 'all' || day === selectedDay)
        .map(day => (
          <div className="box" key={day}>
            <h2>{day}</h2>
            <hr />
            {meals.map(meal => {
              const key = `${day}-${meal}`;
              const groceryList = mealPlan[day]?.groceries?.[meal] || [];

              return (
                <div key={key}>
                  <button
                    className="meal-box"
                    onClick={() => toggleMeal(day, meal)}
                  >
                    <h4>{meal.charAt(0).toUpperCase() + meal.slice(1)}</h4>
                  </button>
                  <div className={`meal-content ${expandedMeals[key] ? 'expanded' : ''}`}>
                    {/* AI Generated Meal */}
                    {mealPlan[day]?.[meal] && (
                      <div className="ai-meal-box">
                        <h5>AI Generated Meal</h5>
                        <p>{mealPlan[day]?.[meal]}</p>
                      </div>
                    )}
                    
                    {/* Grocery Items */}
                    <div className="user-ingredients-box">
                      <h5>Grocery Items</h5>
                      {groceryList.length > 0 ? (
                        <ul className="grocery-items">
                          {groceryList.map((item, index) => (
                            <li 
                              key={index} 
                              className={item.startsWith("✓ ") ? "checked" : ""}
                              onClick={() => handleToggleItem(day, meal, index)}
                            >
                              <span>{item.startsWith("✓ ") ? item.substring(2) : item}</span>
                              <button 
                                className="delete-item" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteItem(day, meal, index);
                                }}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="empty-message">No items added yet</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
};

export default GroceryList;
