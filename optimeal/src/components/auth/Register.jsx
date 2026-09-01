import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Field from '../ui/Field';
import { auth, db } from './firebase';
import AuthShell from './AuthShell';
import { friendlyAuthError } from './authErrors';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setPending(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'users', userCredential.user.uid), { email: userCredential.user.email, createdAt: serverTimestamp() });
      navigate('/complete-profile');
    } catch (registrationError) {
      setError(friendlyAuthError(registrationError, 'We could not create your account. Please try again.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell eyebrow="Get started" title="Create your account" description="It takes a few minutes to set your goals and food preferences after signup." footer={<p>Already have an account? <Link to="/login">Log in</Link></p>}>
      {error && <Alert variant="error">{error}</Alert>}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Field label="Email address" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <div className="ui-field">
          <label className="ui-field__label" htmlFor="register-password">Password</label>
          <div className="auth-password-wrap">
            <input id="register-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-controls="register-password">{showPassword ? 'Hide' : 'Show'}</button>
          </div>
          <p className="password-requirements">Use at least 8 characters. A longer, unique passphrase is best.</p>
        </div>
        <Field label="Confirm password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} error={confirmation && confirmation !== password ? 'Passwords do not match.' : ''} required />
        <Button type="submit" block pending={pending}>{pending ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </AuthShell>
  );
}

export default Register;
