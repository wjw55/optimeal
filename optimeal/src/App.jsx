import { lazy, Suspense, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Link, Route, Routes, useLocation } from 'react-router-dom';
import Welcome from './components/Welcome/Welcome'
import LoadingPanel from './components/ui/LoadingPanel';
import RouteErrorBoundary from './components/ui/RouteErrorBoundary';

const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const PrivateRoute = lazy(() => import('./components/auth/PrivateRoute'));
const GroceryList = lazy(() => import('./components/Grocery/grocery'));
const Recipe = lazy(() => import('./components/Recipe/Recipe'));
const NewRecipe = lazy(() => import('./components/Recipe/NewRecipe'));
const ExploreRecipes = lazy(() => import('./components/Recipe/ExploreRecipes'));
const SavedRecipes = lazy(() => import('./components/Recipe/SavedRecipes'));
const Social = lazy(() => import('./components/Social/Social'));
const CompleteProfile = lazy(() => import('./components/Dashboard/CompleteProfile'));



function App() {
  return (
    <div className="App">
      <Router>
        <RouteMeta />
        <RouteErrorBoundary>
        <Suspense fallback={<LoadingPanel>Loading page…</LoadingPanel>}>
        <Routes>
          {/* Main routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/demo" element={<Dashboard demoMode />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<PrivateRoute><CompleteProfile /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>}/>
          <Route path="/grocery" element={<PrivateRoute><GroceryList /></PrivateRoute>} />
          <Route path="/social" element={<PrivateRoute><Social /></PrivateRoute>} />
          <Route path="/recipes" element={<PrivateRoute><Recipe /></PrivateRoute>}>
            <Route index element={<NewRecipe />} /> {/* Default view */}
            <Route path="new" element={<NewRecipe />} />
            <Route path="explore" element={<ExploreRecipes />} />
            <Route path="saved" element={<SavedRecipes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </Router>
    </div>
  );
}


function NotFound() {
  return (
    <main className="not-found">
      <p className="not-found__code">404</p>
      <h1>That page is not on the menu.</h1>
      <p>The link may be out of date. Return home or explore the public Optimeal demo.</p>
      <div className="not-found__actions">
        <Link className="ui-button ui-button--primary" to="/">Return home</Link>
        <Link className="ui-button ui-button--secondary" to="/demo">Try the demo</Link>
      </div>
    </main>
  );
}

function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles = {
      '/': 'Optimeal · Personalized weekly meal planning',
      '/demo': 'Product demo · Optimeal',
      '/login': 'Log in · Optimeal',
      '/register': 'Create account · Optimeal',
      '/complete-profile': 'Complete your profile · Optimeal',
      '/dashboard': 'Dashboard · Optimeal',
      '/grocery': 'Grocery list · Optimeal',
      '/social': 'Community · Optimeal'
    };
    const recipeTitle = pathname.startsWith('/recipes') ? 'Recipes · Optimeal' : null;
    document.title = titles[pathname] || recipeTitle || 'Page not found · Optimeal';
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default App;
