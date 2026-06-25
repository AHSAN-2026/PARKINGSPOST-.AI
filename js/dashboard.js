/**
 * ParkingSpot AI - User Dashboard controller
 */

let countdownInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  // Only execute on dashboard page
  if (!document.getElementById('dashboard-active-booking')) return;

  const user = getCurrentUser();
  if (!user) {
    // If not logged in, redirect to index or show placeholder
    document.getElementById('dashboard-active-booking').innerHTML = `
      <div style="grid-column: 1/-1; padding: 4rem 2rem; background: var(--bg-card); border: var(--border-grid); border-radius: var(--radius-sm); text-align: center;">
        <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Authentication Required</h2>
        <p class="text-muted mb-3">Please sign in to access your user portal, active reservations, and booking history.</p>
        <button onclick="showLoginModal()" class="btn btn-primary">Sign In Now</button>
      </div>
    `;
    
    // Hide details section
    const detailsSec = document.getElementById('dashboard-details-section');
    if (detailsSec) detailsSec.style.display = 'none';
    return;
  }

  // Set Profile Information
  document.getElementById('profile-name').innerText = user.name;
  document.getElementById('profile-email').innerText = user.email;

  // Load Dashboard Data
  loadDashboardData();
  
  // Setup Profile Update Form
  setupProfileForm();
});

function loadDashboardData() {
  const user = getCurrentUser();
  const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
  const userBookings = bookings.filter(b => b.userEmail === user.email);

  // Check and process any expired bookings (convert Active -> Completed)
  processExpiredBookings(userBookings);

  // Find Active Booking (if any)
  const activeBooking = userBookings.find(b => b.status === 'Active');
  renderActiveBooking(activeBooking);

  // Render History (Completed & Cancelled)
  const historyBookings = userBookings.filter(b => b.status !== 'Active');
  renderBookingHistory(historyBookings);

  // Render Favorites
  renderFavorites();
}

function processExpiredBookings(userBookings) {
  let updatedAny = false;
  const now = new Date().getTime();
  const allBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
  const spots = getSpots();

  allBookings.forEach(booking => {
    if (booking.status === 'Active') {
      const expiry = new Date(booking.expiryTime).getTime();
      if (now >= expiry) {
        booking.status = 'Completed';
        updatedAny = true;

        // Restore slot availability
        const targetIdx = spots.findIndex(s => s.id === booking.spotId);
        if (targetIdx !== -1) {
          spots[targetIdx].availableSlots = Math.min(
            spots[targetIdx].availableSlots + 1, 
            spots[targetIdx].totalSlots
          );
        }
      }
    }
  });

  if (updatedAny) {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(allBookings));
    saveSpots(spots);
  }
}

function renderActiveBooking(booking) {
  const container = document.getElementById('dashboard-active-booking');
  if (!container) return;

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  if (!booking) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; padding: 3rem 2rem; background: var(--bg-card); border: var(--border-grid); border-radius: var(--radius-sm); text-align: center; width: 100%;">
        <p class="text-muted" style="margin-bottom: 1.25rem;">You do not have any active parking reservations at this time.</p>
        <a href="search.html" class="btn btn-primary btn-sm">Find & Book Spot</a>
      </div>
    `;
    return;
  }

  // Active Booking HTML with countdown timer
  container.innerHTML = `
    <div class="active-booking-card" style="background: var(--bg-card); border: var(--border-grid); padding: 2rem; border-radius: var(--radius-sm); display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; width: 100%;">
      <div>
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
          <span class="badge badge-available">Active Reservation</span>
          <span style="font-size: 0.8rem; font-family: var(--font-headings); font-weight: 700; color: var(--color-primary);">${booking.bookingId}</span>
        </div>
        <h3 style="font-size: 1.4rem; margin-bottom: 0.25rem;">${booking.spotName}</h3>
        <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 1.5rem;">📍 ${booking.spotAddress}</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
          <div>
            <span class="text-muted" style="display:block; font-size: 0.75rem; text-transform:uppercase; font-weight:600;">Check-In Time</span>
            <strong>${new Date(booking.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
          <div>
            <span class="text-muted" style="display:block; font-size: 0.75rem; text-transform:uppercase; font-weight:600;">Checkout Time</span>
            <strong>${new Date(booking.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
        </div>

        <div style="display:flex; gap: 1rem;">
          <button id="cancel-booking-btn" class="btn btn-outline btn-sm" data-id="${booking.bookingId}">Cancel Booking</button>
          <a href="search.html" class="btn btn-primary btn-sm">Navigate on Map</a>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: var(--border-grid); padding-left: 2rem; text-align: center;">
        <span class="text-muted" style="font-size: 0.8rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Time Remaining</span>
        <div id="countdown-timer" style="font-family: var(--font-headings); font-weight: 800; font-size: 2.25rem; color: var(--color-dark); margin-bottom: 0.5rem;">00:00:00</div>
        <span style="font-size: 0.8rem; color: #2E7D32; background: #E8F5E9; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Paid: $${booking.pricePaid.toFixed(2)}</span>
      </div>
    </div>
  `;

  // Start Live Countdown Timer
  const expiryTime = new Date(booking.expiryTime).getTime();
  const timerElement = document.getElementById('countdown-timer');

  const updateTimer = () => {
    const now = new Date().getTime();
    const difference = expiryTime - now;

    if (difference <= 0) {
      clearInterval(countdownInterval);
      timerElement.innerText = "00:00:00";
      showToast("Your reservation duration has expired.");
      loadDashboardData(); // Reload to slide this into completed history
      return;
    }

    const hrs = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((difference % (1000 * 60)) / 1000);

    const pad = (n) => n < 10 ? '0' + n : n;
    timerElement.innerText = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);

  // Cancellation Event
  document.getElementById('cancel-booking-btn').addEventListener('click', (e) => {
    const id = e.target.getAttribute('data-id');
    if (confirm("Are you sure you want to cancel this booking? This will release your reserved parking spot.")) {
      cancelBooking(id);
    }
  });
}

function cancelBooking(bookingId) {
  const allBookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
  const targetBooking = allBookings.find(b => b.bookingId === bookingId);
  
  if (targetBooking) {
    targetBooking.status = 'Cancelled';
    
    // Restore slot in database
    const spots = getSpots();
    const spotIdx = spots.findIndex(s => s.id === targetBooking.spotId);
    if (spotIdx !== -1) {
      spots[spotIdx].availableSlots = Math.min(
        spots[spotIdx].availableSlots + 1,
        spots[spotIdx].totalSlots
      );
      saveSpots(spots);
    }

    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(allBookings));
    showToast("Booking cancelled successfully.");
    loadDashboardData();
  }
}

function renderBookingHistory(historyList) {
  const container = document.getElementById('dashboard-history-list');
  if (!container) return;

  if (historyList.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: #888;">No historical bookings recorded.</td>
      </tr>
    `;
    return;
  }

  // Sort: most recent checks first
  historyList.sort((a, b) => new Date(b.bookingTime) - new Date(a.bookingTime));

  container.innerHTML = '';
  historyList.forEach(item => {
    const isCompleted = item.status === 'Completed';
    const tr = document.createElement('tr');
    tr.style.borderBottom = 'var(--border-grid)';
    tr.innerHTML = `
      <td style="padding: 1rem 0; font-family: var(--font-headings); font-weight: 700; font-size: 0.85rem; color: var(--color-primary);">${item.bookingId}</td>
      <td style="padding: 1rem 0;">
        <div style="font-weight: 600;">${item.spotName}</div>
        <div style="font-size: 0.75rem; color:#888;">${item.spotAddress}</div>
      </td>
      <td style="padding: 1rem 0;">${new Date(item.bookingTime).toLocaleDateString()}</td>
      <td style="padding: 1rem 0;">$${item.pricePaid.toFixed(2)} (${item.hours}h)</td>
      <td style="padding: 1rem 0;">
        <span style="font-size:0.75rem; font-weight: 700; text-transform: uppercase; color: ${isCompleted ? '#2E7D32' : '#C62828'}; background: ${isCompleted ? '#E8F5E9' : '#FFEBEE'}; padding: 2px 8px; border-radius: 4px;">
          ${item.status}
        </span>
      </td>
    `;
    container.appendChild(tr);
  });
}

function renderFavorites() {
  const container = document.getElementById('dashboard-favorites');
  if (!container) return;

  const favIds = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  const spots = getSpots();
  const favSpots = spots.filter(s => favIds.includes(s.id));

  if (favSpots.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; background: var(--bg-card); border: var(--border-grid); border-radius: var(--radius-sm); text-align: center; width: 100%;">
        <p class="text-muted" style="font-size: 0.85rem;">No favorited locations saved. Mark spots as favorite in the search panel.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  favSpots.forEach(spot => {
    const card = document.createElement('div');
    card.style.background = 'var(--bg-card)';
    card.style.border = 'var(--border-grid)';
    card.style.padding = '1.25rem';
    card.style.borderRadius = 'var(--radius-sm)';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    
    card.innerHTML = `
      <div>
        <h4 style="font-size: 1rem; margin-bottom: 0.25rem;">${spot.name}</h4>
        <span style="font-size: 0.8rem; background: #EAE5DC; padding: 2px 6px; border-radius: 2px; font-weight: 600;">$${spot.pricePerHour.toFixed(2)}/hr</span>
      </div>
      <div style="display:flex; gap: 0.5rem;">
        <a href="search.html" onclick="localStorage.setItem('focus_spot_on_load', '${spot.id}')" class="btn btn-primary btn-sm" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">View</a>
        <button class="btn btn-outline btn-sm remove-fav-btn" data-id="${spot.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Remove</button>
      </div>
    `;

    card.querySelector('.remove-fav-btn').addEventListener('click', () => {
      removeFavorite(spot.id);
    });

    container.appendChild(card);
  });
}

function removeFavorite(spotId) {
  const favIds = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  const filtered = favIds.filter(id => id !== spotId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
  showToast("Removed from favorites");
  renderFavorites();
}

function setupProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = document.getElementById('profile-edit-name').value;
    const newPass = document.getElementById('profile-edit-password').value;
    
    if (newName.trim() === '') {
      showToast('Name cannot be blank');
      return;
    }

    const sessionUser = getCurrentUser();
    const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || [];
    const userIdx = users.findIndex(u => u.email === sessionUser.email);

    if (userIdx !== -1) {
      users[userIdx].name = newName;
      if (newPass.trim() !== '') {
        users[userIdx].password = newPass;
      }
      
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
      
      // Update session
      sessionUser.name = newName;
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));

      // Refresh layout greeting & page values
      injectLayout();
      document.getElementById('profile-name').innerText = newName;
      showToast('Profile updated successfully');

      // Clear input fields
      document.getElementById('profile-edit-name').value = '';
      document.getElementById('profile-edit-password').value = '';
    }
  });
}
