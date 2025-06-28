import React, { useState } from 'react';
import { db, auth } from '../auth/firebase'; // adjust path if needed
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './CompleteProfile.css';


function CompleteProfile() {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('Male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('Maintain weight');
  const [activityLevel, setActivityLevel] = useState('Moderate');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(doc(db, 'users', user.uid), {
      username,
      age,
      sex,
      height,
      weight,
      goal,
      activityLevel,
      updatedAt: new Date()
    }, { merge: true });

    navigate('/dashboard');
  };

  return (
    <div className="complete-profile">
      <h2>Complete Your Profile</h2>
      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} required />

        <label>Age</label>
        <input type="number" value={age} onChange={e => setAge(e.target.value)} required />

        <label>Sex</label>
        <select value={sex} onChange={e => setSex(e.target.value)}>
          <option>Male</option>
          <option>Female</option>
        </select>

        <label>Height</label>
        <input value={height} onChange={e => setHeight(e.target.value)} required />

        <label>Weight</label>
        <input value={weight} onChange={e => setWeight(e.target.value)} required />

        <label>Activity Level</label>
        <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)}>
          <option>Light</option>
          <option>Moderate</option>
          <option>Intense</option>
        </select>

        <label>Goal</label>
        <select value={goal} onChange={e => setGoal(e.target.value)}>
          <option>Maintain weight</option>
          <option>Lose weight</option>
          <option>Gain weight</option>
        </select>

        <button type="submit">Save and Continue</button>
      </form>
    </div>
  );
}

export default CompleteProfile;
