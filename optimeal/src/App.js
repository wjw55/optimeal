import Login from './components/auth/Login';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import Welcome from './components/Welcome/Welcome'
import PrivateRoute from './components/auth/PrivateRoute';
import GroceryList from './components/Grocery/grocery'
import Recipe from './components/Recipe/Recipe'; 
import NewRecipe from './components/Recipe/NewRecipe';
import ExploreRecipes from './components/Recipe/ExploreRecipes';
import SavedRecipes from './components/Recipe/SavedRecipes';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Main routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>}/>
          <Route path="/grocery" element={<PrivateRoute><GroceryList /></PrivateRoute>} />
          <Route path="/recipes" element={<PrivateRoute><Recipe /></PrivateRoute>}>
            <Route index element={<NewRecipe />} /> {/* Default view */}
            <Route path="new" element={<NewRecipe />} />
            <Route path="explore" element={<ExploreRecipes />} />
            <Route path="saved" element={<SavedRecipes />} />
          </Route>
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
