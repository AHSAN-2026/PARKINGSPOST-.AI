/**
 * ParkingSpot AI - Global Application Logic
 */

// Global State
const APP_STORAGE_KEY = 'parking_spots_db';
const USER_SESSION_KEY = 'parking_user_session';
const BOOKINGS_KEY = 'parking_user_bookings';
const FAVORITES_KEY = 'parking_user_favorites';

// Seed Mock Parking Database if empty
const MOCK_SPOTS = [
  {
    id: 'spot-1',
    name: 'Sleek Industrial Garages',
    address: '455 Climate Way, Tech District',
    lat: 40.758896,
    lng: -73.985130,
    totalSlots: 25,
    availableSlots: 18,
    pricePerHour: 4.50,
    type: 'Car',
    hours: '24/7'
  },
  {
    id: 'spot-2',
    name: 'Grotesk Street Parking',
    address: '108 Design Quarter Rd',
    lat: 40.754932,
    lng: -73.984016,
    totalSlots: 10,
    availableSlots: 1,
    pricePerHour: 2.00,
    type: 'Bike',
    hours: '6:00 AM - 10:00 PM'
  },
  {
    id: 'spot-3',
    name: 'Satoshi Plaza Underground',
    address: '22 Financial Center Blvd',
    lat: 40.756200,
    lng: -73.990200,
    totalSlots: 50,
    availableSlots: 4,
    pricePerHour: 8.00,
    type: 'Car',
    hours: '24/7'
  },
  {
    id: 'spot-4',
    name: 'Inter-City Express Lot',
    address: '890 Transit Hub Ave',
    lat: 40.762100,
    lng: -73.981300,
    totalSlots: 30,
    availableSlots: 0,
    pricePerHour: 3.50,
    type: 'Car',
    hours: '5:00 AM - 1:00 AM'
  },
  {
    id: 'spot-5',
    name: 'Neue Montreal Deck',
    address: '312 Art District Pkwy',
    lat: 40.750500,
    lng: -73.987500,
    totalSlots: 40,
    availableSlots: 35,
    pricePerHour: 5.00,
    type: 'Car',
    hours: '24/7'
  },
  {
    id: 'spot-6',
    name: 'Eco-Solar Charging Lot',
    address: '77 Green Zone lane',
    lat: 40.748200,
    lng: -73.978900,
    totalSlots: 20,
    availableSlots: 3,
    pricePerHour: 6.00,
    type: 'Car',
    hours: '24/7'
  }
];

// Initialize database
function initDatabase() {
  if (!localStorage.getItem(APP_STORAGE_KEY)) {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(MOCK_SPOTS));
  }
  if (!localStorage.getItem(BOOKINGS_KEY)) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(FAVORITES_KEY)) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([]));
  }
}

// Get database spots
function getSpots() {
  return JSON.parse(localStorage.getItem(APP_STORAGE_KEY));
}

// Update database spots
function saveSpots(spots) {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(spots));
}

// Get Session User
function getCurrentUser() {
  return JSON.parse(localStorage.getItem(USER_SESSION_KEY));
}

// Toast Alert System
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation reflow
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Auto-remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 4000);
}

// Inject Navbar and Footer
function injectLayout() {
  const headerEl = document.querySelector('header');
  const footerEl = document.querySelector('footer');
  const user = getCurrentUser();

  // Determine active page
  const currentPath = window.location.pathname;
  const isHome = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('Ahsan/parking-app/');
  const isSearch = currentPath.endsWith('search.html');
  const isDashboard = currentPath.endsWith('dashboard.html');

  if (headerEl) {
    headerEl.innerHTML = `
      <div class="container navbar">
        <a href="index.html" class="logo">
          PARKINGSPOST<span>.AI</span>
        </a>
        <ul class="nav-links">
          <li><a href="index.html" class="${isHome ? 'active' : ''}">Home</a></li>
          <li><a href="search.html" class="${isSearch ? 'active' : ''}">Find Parking</a></li>
          <li><a href="dashboard.html" class="${isDashboard ? 'active' : ''}">Dashboard</a></li>
        </ul>
        <div class="nav-actions">
          ${user 
            ? `<span class="user-greeting" style="font-weight: 500; font-size: 0.9rem;">Hello, <strong>${user.name}</strong></span>
               <button id="logout-btn" class="btn btn-outline btn-sm">Logout</button>`
            : `<button id="login-trigger-btn" class="btn btn-primary btn-sm">Login</button>`
          }
        </div>
      </div>
    `;

    // Logout Action
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem(USER_SESSION_KEY);
        showToast('Logged out successfully');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      });
    }

    // Login Modal Trigger
    const loginTriggerBtn = document.getElementById('login-trigger-btn');
    if (loginTriggerBtn) {
      loginTriggerBtn.addEventListener('click', () => {
        showLoginModal();
      });
    }
  }

  if (footerEl) {
    footerEl.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-info">
            <h3>PARKINGSPOST.AI</h3>
            <p>Next-generation smart parking discovery using real-time IoT nodes and architectural minimalism.</p>
            <p style="font-size: 0.8rem; color: #555;">Inspired by CURA Climate Design System.</p>
          </div>
          <div class="footer-links">
            <h4>Application</h4>
            <ul>
              <li><a href="index.html">Home Landing</a></li>
              <li><a href="search.html">Parking Search Map</a></li>
              <li><a href="dashboard.html">User Portal</a></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">API Documentation</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 ParkingSpot AI. All rights reserved.</p>
          <div>
            <a href="#" style="margin-right: 1.5rem;">Twitter</a>
            <a href="#">Github</a>
          </div>
        </div>
      </div>
    `;
  }
}

// Global Auth Modals Overlay Setup
function createAuthModal() {
  const modalHTML = `
    <div id="auth-modal-overlay" class="modal-overlay">
      <div class="modal">
        <button class="modal-close" id="auth-modal-close">&times;</button>
        
        <!-- Login Form -->
        <div id="login-form-container">
          <h2>Access Spot Finder</h2>
          <form id="login-form">
            <div class="form-group">
              <label class="form-label" for="login-email">Email Address</label>
              <input class="form-input" type="email" id="login-email" required placeholder="name@domain.com">
            </div>
            <div class="form-group">
              <label class="form-label" for="login-password">Password</label>
              <input class="form-input" type="password" id="login-password" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Sign In</button>
          </form>
          <p class="text-center mt-3 text-muted" style="font-size: 0.85rem;">
            Don't have an account? <button id="switch-to-signup" class="btn-text text-primary">Sign up</button>
          </p>
        </div>

        <!-- Signup Form -->
        <div id="signup-form-container" style="display: none;">
          <h2>Create Account</h2>
          <form id="signup-form">
            <div class="form-group">
              <label class="form-label" for="signup-name">Full Name</label>
              <input class="form-input" type="text" id="signup-name" required placeholder="Jane Doe">
            </div>
            <div class="form-group">
              <label class="form-label" for="signup-email">Email Address</label>
              <input class="form-input" type="email" id="signup-email" required placeholder="name@domain.com">
            </div>
            <div class="form-group">
              <label class="form-label" for="signup-password">Password</label>
              <input class="form-input" type="password" id="signup-password" required placeholder="Minimum 6 characters">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Create Account</button>
          </form>
          <p class="text-center mt-3 text-muted" style="font-size: 0.85rem;">
            Already have an account? <button id="switch-to-login" class="btn-text text-primary">Sign in</button>
          </p>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Bind Events
  const overlay = document.getElementById('auth-modal-overlay');
  const closeBtn = document.getElementById('auth-modal-close');
  const loginContainer = document.getElementById('login-form-container');
  const signupContainer = document.getElementById('signup-form-container');
  const toSignupBtn = document.getElementById('switch-to-signup');
  const toLoginBtn = document.getElementById('switch-to-login');

  closeBtn.addEventListener('click', hideLoginModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideLoginModal();
  });

  toSignupBtn.addEventListener('click', () => {
    loginContainer.style.display = 'none';
    signupContainer.style.display = 'block';
  });

  toLoginBtn.addEventListener('click', () => {
    signupContainer.style.display = 'none';
    loginContainer.style.display = 'block';
  });
}

function showLoginModal() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) {
    // Reset view to Login first
    document.getElementById('login-form-container').style.display = 'block';
    document.getElementById('signup-form-container').style.display = 'none';
    overlay.classList.add('show');
  }
}

function hideLoginModal() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (overlay) overlay.classList.remove('show');
}

// Run Initializations
document.addEventListener('DOMContentLoaded', () => {
  initDatabase();
  createAuthModal();
  injectLayout();
});
