/**
 * ParkingSpot AI - Authentication Actions
 */

const USERS_DB_KEY = 'registered_users';

// Seed default tester account
function initAuthDatabase() {
  if (!localStorage.getItem(USERS_DB_KEY)) {
    const defaultUsers = [
      {
        name: 'Alex Driver',
        email: 'test@parking.ai',
        password: 'password'
      }
    ];
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(defaultUsers));
  }
}

// Log in user
function loginUser(email, password) {
  const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || [];
  const matchedUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  
  if (matchedUser) {
    // Store in session
    const sessionUser = {
      name: matchedUser.name,
      email: matchedUser.email
    };
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  }
  return { success: false, message: 'Invalid email or password' };
}

// Register user
function registerUser(name, email, password) {
  if (password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || [];
  const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

  if (exists) {
    return { success: false, message: 'Account with this email already exists' };
  }

  const newUser = { name, email, password };
  users.push(newUser);
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));

  // Log them in immediately
  const sessionUser = { name: newUser.name, email: newUser.email };
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));

  return { success: true, user: sessionUser };
}

// Event Bindings
document.addEventListener('DOMContentLoaded', () => {
  initAuthDatabase();

  // Watch Login Form
  document.body.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'login-form') {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      const result = loginUser(email, password);
      if (result.success) {
        showToast(`Welcome back, ${result.user.name}!`);
        hideLoginModal();
        // Wait and reload or update navbar
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showToast(result.message);
      }
    }

    // Watch Signup Form
    if (e.target && e.target.id === 'signup-form') {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;

      const result = registerUser(name, email, password);
      if (result.success) {
        showToast(`Account created! Welcome, ${result.user.name}`);
        hideLoginModal();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showToast(result.message);
      }
    }
  });
});
