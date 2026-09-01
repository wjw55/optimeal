export function friendlyAuthError(error, fallback = 'Something went wrong. Please try again.') {
  const messages = {
    'auth/email-already-in-use': 'An account already uses this email. Try logging in instead.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-password': 'Enter your password.',
    'auth/network-request-failed': 'Check your connection and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/user-not-found': 'No account was found for this email.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.'
  };
  return messages[error?.code] || fallback;
}
