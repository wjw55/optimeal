import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Field from '../ui/Field';
import AuthShell from './AuthShell';
import { friendlyAuthError } from './authErrors';
import { auth, provider } from './firebase';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setPendingAction('email');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/dashboard');
    } catch (error) {
      setMessage({ variant: 'error', text: friendlyAuthError(error, 'We could not log you in. Check your details and try again.') });
    } finally {
      setPendingAction('');
    }
  };

  const handleGoogleLogin = async () => {
    setMessage(null);
    setPendingAction('google');
    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (error) {
      setMessage({ variant: 'error', text: friendlyAuthError(error, 'Google sign-in did not finish. Please try again.') });
    } finally {
      setPendingAction('');
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setMessage({ variant: 'error', text: 'Enter your email first, then choose “Forgot password?”.' });
      return;
    }
    setMessage(null);
    setPendingAction('reset');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage({ variant: 'success', text: 'Password reset email sent. Check your inbox and spam folder.' });
    } catch (error) {
      setMessage({ variant: 'error', text: friendlyAuthError(error, 'We could not send the reset email. Please try again.') });
    } finally {
      setPendingAction('');
    }
  };

  const busy = Boolean(pendingAction);
  return (
    <AuthShell eyebrow="Welcome back" title="Log in to Optimeal" description="Continue planning your meals, recipes, and groceries." footer={<p>New to Optimeal? <Link to="/register">Create an account</Link></p>}>
      {message && <Alert variant={message.variant}>{message.text}</Alert>}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Field label="Email address" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <div className="ui-field">
          <label className="ui-field__label" htmlFor="login-password">Password</label>
          <div className="auth-password-wrap">
            <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-controls="login-password">{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <div className="auth-form-actions">
          <button className="auth-text-button" type="button" onClick={handlePasswordReset} disabled={busy}>Forgot password?</button>
        </div>
        <Button type="submit" block pending={pendingAction === 'email'} disabled={busy && pendingAction !== 'email'}>{pendingAction === 'email' ? 'Logging in…' : 'Log in'}</Button>
      </form>
      <div className="auth-divider">or</div>
      <Button type="button" variant="secondary" block onClick={handleGoogleLogin} pending={pendingAction === 'google'} disabled={busy && pendingAction !== 'google'}>
        <span className="auth-google-mark" aria-hidden="true">G</span> Continue with Google
      </Button>
    </AuthShell>
  );
}

export default Login;
