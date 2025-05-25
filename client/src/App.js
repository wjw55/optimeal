import Login from './components/Login/Login';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Register from './components/Register/Register';
import Dashboard from './components/Dashboard/Dashboard';
function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Main routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </div>
  );
}

// Welcome component (for the root path)
function Welcome() {
  return (
    <div>
      <h1>Welcome to OPTIMEAL!</h1>
      <image src="/Downloads/" alt="Welcome to OPTIMEAL" />
      <p>
        OPTIMEAL is your go-to platform for personalized meal planning and nutrition tracking.
        <br />
        <strong>Get started by logging in or registering!</strong>
      </p>
      <p>
        <a href="/login">Login</a> or <a href="/register">Register</a>
      </p>
    </div>
  );
}

// Optional: 404 Not Found component
function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/">Return to Home</a>
    </div>
  );
}

export default App;