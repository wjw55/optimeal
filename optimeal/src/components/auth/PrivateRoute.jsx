import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import LoadingPanel from '../ui/LoadingPanel';

function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <main><LoadingPanel>Checking your account…</LoadingPanel></main>;
  }

  return user ? children : <Navigate to="/login" replace />;
}

export default PrivateRoute;
