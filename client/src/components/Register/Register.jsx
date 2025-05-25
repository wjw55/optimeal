    // components/Register.jsx
    import React from 'react';
    import './Register.css';
    import { Link } from 'react-router-dom'; // Import Link for navigation

    const Register = () => {
        return (
        <div className="container">
            <h2>Register</h2>
            <form action="/register" method="POST">
                <input type="email" name="email" placeholder="Email" required />
                <input type="password" name="password" placeholder="Password" required />
                <button type="submit">Register</button>
            </form>
            <p>
                Already have an account? <Link to="/login">Login here</Link>
            </p >
        </div>
        );
    };

    export default Register;

