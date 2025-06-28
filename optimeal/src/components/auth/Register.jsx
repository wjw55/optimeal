import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from './firebase.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import './Register.css';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';



const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          createdAt: new Date()
        });

        navigate('/dashboard');
      } catch (err) {
        setError(err.message);
        console.error('Registration error:', err);
      }
    };
  return (
    <div className="container">
      <h2>Create Your Account</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Register</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default Register;
