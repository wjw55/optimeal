import { useState } from 'react';
import './Login.css'; // Import the CSS file for styling
import { Link, useNavigate } from 'react-router-dom'; // Import Link for navigation
import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';



const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const user = result.user;
      console.log("Google login successful", user);
      navigate('/dashboard');
    } catch (error) {
      console.error("Google login failed:", error.message);
    }
  };


  return (
    <div className="login-container">
      <h2>Login to OPTIMEAL</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="login-btn" type="submit">Login</button>
        <p>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </form>
      <div className="social-login">
        <p>Or login with</p>
        <button 
          className="google-btn-icon" 
          onClick={handleGoogleLogin}
          type="button"
        >
          <img 
            src="https://developers.google.com/identity/images/g-logo.png"  
            alt="Google Logo" 
            className="google-icon" 
          />
        </button>
      </div>
    </div>
  );
};

export default Login;
