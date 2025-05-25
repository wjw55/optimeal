import Login from './components/Login/Login';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Register from './components/Register/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Welcome from './components/Welcome/Welcome'
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