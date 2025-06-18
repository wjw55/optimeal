import React, { useState, useEffect } from 'react';
import './grocery.css';
import {db, auth } from '../auth/firebase'
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import userImg from './Images/user-profile-icon-free-vector.jpg';


const days = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const meals = ['Breakfast', 'Lunch', 'Dinner'];


const GroceryList = () => {
  const [expandedMeals, setExpandedMeals] = useState({});
  const [selectedDay, setSelectedDay] = useState('all'); // State for selected day
  const [mealPlan, setMealPlan] = useState(null);
  const [userId, setUserId] = useState(null);
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const meals = ['breakfast', 'lunch', 'dinner'];

  const toggleMeal = (day, meal) => {
    const key = `${day}-${meal}`;
    setExpandedMeals(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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

  const navigate = useNavigate();

  useEffect(() => {
    const fetchMealPlan = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().currentMeals) {
          setMealPlan(userSnap.data().currentMeals);
        }
      }
    };

    fetchMealPlan();
  }, []);


  return (
    <div>
        {/* Navbar */}
      <div className="navbar">
        <div className="branding">
          <h1>OPTIMEAL</h1>
          <div className="avatar card">
            <img src={userImg} alt="User Profile" className="user-profile" />
          </div>
        </div>
        
        <nav>
          <Link to='/dashboard'>Dashboard</Link>
          <a href="#">Meals</a>
          <Link to="/grocery">Grocery List</Link>
          <a href="#">Settings</a>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
          
        </nav>
      </div>
      <h1 className="title">Grocery List</h1>
      <select className="day-select"
        value={selectedDay}
        onChange={(e) => setSelectedDay(e.target.value)}>
        <option value="all">All</option>
        <option value="Monday">Monday</option>
        <option value="Tuesday">Tuesday</option>
        <option value="Wednesday">Wednesday</option>
        <option value="Thursday">Thursday</option>
        <option value="Friday">Friday</option>
        <option value="Saturday">Saturday</option>
        <option value="Sunday">Sunday</option>
        </select>
        {days
          .filter(day => selectedDay === 'all' || day === selectedDay)
          .map(day => (
          <div className="box" key={day}>
            <h2>{day}</h2>
            <hr />
            {meals.map(meal => {
              const key = `${day}-${meal.toLowerCase()}`;
              const groceryList = mealPlan?.[day]?.groceries?.[meal] || [];
              

              return (
                  <div key={key}>
                    <button
                      className="meal-box"
                      onClick={() => toggleMeal(day, meal)}
                    >
                      <h4>{meal}</h4>
                    </button>
                    <div className={`meal-content ${expandedMeals[key] ? 'expanded' : ''}`}>
                      <h4>{mealPlan?.[day]?.[meal.toLowerCase()]}</h4>
                      <ul>
                        {groceryList.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
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
