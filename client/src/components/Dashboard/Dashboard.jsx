import './Dashboard.css'
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { useState } from 'react'; // Import useState for state management

const Dashboard = () => {
    return (
            <div class="dashboard">
                <div class="dashboard-header">
                    <h1>OPTIMEAL</h1>
                </div>
                <div class="dashboard-content">
                    <h2>Dashboard</h2>
                    <div class="weeklymealplan-container">
                        <h3>Weekly Meal Plan</h3>
                        <div class="mealplan">
                            <div class="day">
                                <h4>Monday</h4>
                                <p>Breakfast: Oatmeal</p>
                                <p>Lunch: Salad</p>
                                <p>Dinner: Grilled Chicken</p>
                            </div>
                            <div class="day">
                                <h4>Tuesday</h4>
                                <p>Breakfast: Smoothie</p>
                                <p>Lunch: Quinoa Bowl</p>
                                <p>Dinner: Stir-fry Vegetables</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="dashboard-footer">
                </div>
            </div>
    );
}

export default Dashboard;
    