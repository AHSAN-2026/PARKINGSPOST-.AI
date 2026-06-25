/**
 * ParkingSpot AI - Search and Booking Systems
 */

let selectedSpot = null;
let parkingSpots = [];

// Initialize Search System
document.addEventListener('DOMContentLoaded', () => {
  // Only execute on search page
  if (!document.getElementById('parking-list')) return;

  parkingSpots = getSpots();

  // Initial draw of listings
  renderSpotList(parkingSpots);

  // Initialize Map
  initMap(parkingSpots, (spot) => {
    selectSpot(spot.id);
  });

  // Search Filter Events
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');
  const sortFilter = document.getElementById('sort-filter');

  const triggerSearch = () => {
    const query = searchInput.value;
    const type = typeFilter.value;
    const sort = sortFilter.value;
    filterAndSortSpots(query, type, sort);
  };

  searchInput.addEventListener('input', triggerSearch);
  typeFilter.addEventListener('change', triggerSearch);
  sortFilter.addEventListener('change', triggerSearch);

  // Setup Real-time availability simulation (every 30 seconds)
  setInterval(simulateLiveAvailability, 30000);

  // Set up Reserve Form Submission inside Checkout slideout
  setupBookingEvents();
});

// Render sidebar spot list cards
function renderSpotList(spots) {
  const container = document.getElementById('parking-list');
  if (!container) return;

  if (spots.length === 0) {
    container.innerHTML = `
      <div class="empty-search-state">
        <p>No parking locations found matching your parameters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  spots.forEach(spot => {
    // Determine badge and availability strings
    let badgeClass = 'badge-available';
    let statusText = 'Available';
    if (spot.availableSlots === 0) {
      badgeClass = 'badge-full';
      statusText = 'Full';
    } else if (spot.availableSlots < 5) {
      badgeClass = 'badge-nearly-full';
      statusText = `Nearly Full (${spot.availableSlots} left)`;
    } else {
      statusText = `${spot.availableSlots} Available`;
    }

    const card = document.createElement('div');
    card.className = `spot-card ${selectedSpot && selectedSpot.id === spot.id ? 'active' : ''}`;
    card.id = `card-${spot.id}`;
    card.innerHTML = `
      <div class="spot-card-header">
        <span class="badge ${badgeClass}">${statusText}</span>
        <span class="spot-price">$${spot.pricePerHour.toFixed(2)}/hr</span>
      </div>
      <h3>${spot.name}</h3>
      <p class="spot-address">${spot.address}</p>
      <div class="spot-meta">
        <span>🕒 ${spot.hours}</span>
        <span>${spot.type === 'Car' ? '🚗 Cars' : '🚲 Bikes'}</span>
      </div>
      <div class="spot-actions">
        <button class="btn btn-outline btn-sm directions-btn" data-id="${spot.id}">Directions</button>
        <button class="btn btn-primary btn-sm reserve-btn" data-id="${spot.id}" ${spot.availableSlots === 0 ? 'disabled' : ''}>Reserve</button>
      </div>
    `;

    // Add click event on card body (not buttons)
    card.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        selectSpot(spot.id);
        focusSpotOnMap(spot.id);
      }
    });

    container.appendChild(card);
  });

  // Bind Buttons inside cards
  container.querySelectorAll('.directions-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const spotId = btn.getAttribute('data-id');
      const spot = spots.find(s => s.id === spotId);
      selectSpot(spotId);
      focusSpotOnMap(spotId);
      drawRouteToSpot(spot);
      showToast(`Showing route to ${spot.name}`);
    });
  });

  container.querySelectorAll('.reserve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const spotId = btn.getAttribute('data-id');
      openReservationFlow(spotId);
    });
  });
}

// Select a spot and highlight card
function selectSpot(spotId) {
  document.querySelectorAll('.spot-card').forEach(el => el.classList.remove('active'));
  
  const card = document.getElementById(`card-${spotId}`);
  if (card) {
    card.classList.add('active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  parkingSpots = getSpots();
  selectedSpot = parkingSpots.find(s => s.id === spotId);
}

// Filter and Sortspots
function filterAndSortSpots(query, type, sortBy) {
  let filtered = getSpots();

  // Apply Query
  if (query.trim() !== '') {
    const term = query.toLowerCase();
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.address.toLowerCase().includes(term)
    );
  }

  // Apply Type
  if (type !== 'all') {
    filtered = filtered.filter(s => s.type === type);
  }

  // Apply Sorting
  if (sortBy === 'cheapest') {
    filtered.sort((a, b) => a.pricePerHour - b.pricePerHour);
  } else if (sortBy === 'available') {
    filtered.sort((a, b) => b.availableSlots - a.availableSlots);
  } else if (sortBy === 'closest') {
    // Mock sort - since we don't have true relative distances on load, we just sort by index or random coordinates proximity
    // Here we'll just sort by ID length / string comparison to provide a stable, distinct sorting action
    filtered.sort((a, b) => a.id.localeCompare(b.id));
  }

  renderSpotList(filtered);
  
  // Update map pins to reflect filters
  plotParkingSpots(filtered, (spot) => {
    selectSpot(spot.id);
  });
}

// Simulation of real-time sensor updates
function simulateLiveAvailability() {
  const currentSpots = getSpots();
  let updatedAny = false;

  const updatedSpots = currentSpots.map(spot => {
    // 30% chance each spot changes
    if (Math.random() < 0.3) {
      updatedAny = true;
      const change = Math.random() > 0.5 ? 1 : -1;
      
      let newAvail = spot.availableSlots + change;
      if (newAvail < 0) newAvail = 0;
      if (newAvail > spot.totalSlots) newAvail = spot.totalSlots;
      
      return { ...spot, availableSlots: newAvail };
    }
    return spot;
  });

  if (updatedAny) {
    saveSpots(updatedSpots);
    parkingSpots = updatedSpots;
    
    // Maintain current search filters
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('type-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    filterAndSortSpots(searchInput.value, typeFilter.value, sortFilter.value);
    showToast('Parking availability updated in real-time');
  }
}

// RESERVATION / CHECKOUT MANAGEMENT
function openReservationFlow(spotId) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please sign in to reserve a spot');
    showLoginModal();
    return;
  }

  const spots = getSpots();
  const spot = spots.find(s => s.id === spotId);
  if (!spot || spot.availableSlots === 0) return;

  selectedSpot = spot;

  // Show checkout modal
  const overlay = document.getElementById('checkout-modal-overlay');
  if (overlay) {
    document.getElementById('checkout-spot-name').innerText = spot.name;
    document.getElementById('checkout-spot-address').innerText = spot.address;
    document.getElementById('checkout-spot-rate').innerText = `$${spot.pricePerHour.toFixed(2)}/hr`;
    
    // Set default hours
    document.getElementById('checkout-hours').value = "1";
    updateCheckoutTotal();

    overlay.classList.add('show');
  }
}

function updateCheckoutTotal() {
  if (!selectedSpot) return;
  const hours = parseFloat(document.getElementById('checkout-hours').value) || 1;
  const total = selectedSpot.pricePerHour * hours;
  document.getElementById('checkout-total-price').innerText = `$${total.toFixed(2)}`;
}

function setupBookingEvents() {
  // Inject Checkout Modal in DOM if search.html exists
  const hasContainer = document.getElementById('parking-list');
  if (!hasContainer) return;

  const modalHTML = `
    <div id="checkout-modal-overlay" class="modal-overlay">
      <div class="modal" style="max-width: 550px;">
        <button class="modal-close" id="checkout-close">&times;</button>
        <h2>Confirm Reservation</h2>
        
        <div class="booking-details-box" style="background-color: var(--color-white); border: var(--border-grid); padding: 1.25rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem;">
          <h3 id="checkout-spot-name" style="font-size: 1.2rem; margin-bottom: 0.25rem;">Spot Name</h3>
          <p id="checkout-spot-address" class="text-muted" style="font-size: 0.85rem; margin-bottom: 0.75rem;">Spot Address</p>
          <div style="display:flex; justify-content:space-between; font-size: 0.9rem;">
            <span>Rate: <strong id="checkout-spot-rate">$0.00/hr</strong></span>
            <span>Type: <strong>🚗 Private Spot</strong></span>
          </div>
        </div>

        <form id="checkout-form">
          <div class="form-group">
            <label class="form-label" for="checkout-hours">Reservation Duration</label>
            <select class="form-input" id="checkout-hours">
              <option value="1">1 Hour</option>
              <option value="2">2 Hours</option>
              <option value="4">4 Hours</option>
              <option value="8">8 Hours</option>
              <option value="24">24 Hours</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <div class="payment-options" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
              <label class="payment-btn" style="border: 1px solid var(--color-dark); padding: 0.75rem; text-align: center; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-family: var(--font-headings); font-weight: 700; font-size: 0.85rem;">
                <input type="radio" name="payment_method" value="UPI" checked style="accent-color: var(--color-primary)"> UPI
              </label>
              <label class="payment-btn" style="border: 1px solid var(--border-color); padding: 0.75rem; text-align: center; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-family: var(--font-headings); font-weight: 700; font-size: 0.85rem;">
                <input type="radio" name="payment_method" value="CARD" style="accent-color: var(--color-primary)"> Credit Card
              </label>
            </div>
          </div>

          <div style="border-top: var(--border-grid); padding-top: 1.25rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <span style="font-weight: 700; font-size: 1.1rem; text-transform: uppercase;">Total Due</span>
            <span id="checkout-total-price" style="font-family: var(--font-headings); font-weight: 800; font-size: 1.5rem; color: var(--color-primary);">$0.00</span>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%;">Pay & Book Spot</button>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Bind Checkout Events
  const overlay = document.getElementById('checkout-modal-overlay');
  const closeBtn = document.getElementById('checkout-close');
  const hoursSelect = document.getElementById('checkout-hours');
  const form = document.getElementById('checkout-form');

  closeBtn.addEventListener('click', () => overlay.classList.remove('show'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('show');
  });

  hoursSelect.addEventListener('change', updateCheckoutTotal);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    processCheckoutBooking();
  });
}

function processCheckoutBooking() {
  const overlay = document.getElementById('checkout-modal-overlay');
  const payBtn = overlay.querySelector('button[type="submit"]');
  const hours = parseFloat(document.getElementById('checkout-hours').value) || 1;
  const payMethod = overlay.querySelector('input[name="payment_method"]:checked').value;
  const total = selectedSpot.pricePerHour * hours;

  // Simulate payment processing loader
  payBtn.disabled = true;
  payBtn.innerText = "Processing Payment...";

  setTimeout(() => {
    // 1. Decrement spots availability
    const allSpots = getSpots();
    const targetIdx = allSpots.findIndex(s => s.id === selectedSpot.id);
    if (targetIdx !== -1 && allSpots[targetIdx].availableSlots > 0) {
      allSpots[targetIdx].availableSlots -= 1;
      saveSpots(allSpots);
    }

    // 2. Add booking record
    const user = getCurrentUser();
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
    
    const now = new Date();
    const expiry = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const newBooking = {
      bookingId: 'BK-' + Math.floor(100000 + Math.random() * 900000),
      userEmail: user.email,
      spotId: selectedSpot.id,
      spotName: selectedSpot.name,
      spotAddress: selectedSpot.address,
      pricePaid: total,
      hours: hours,
      paymentMethod: payMethod,
      bookingTime: now.toISOString(),
      expiryTime: expiry.toISOString(),
      status: 'Active'
    };

    bookings.push(newBooking);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));

    // Reset button
    payBtn.disabled = false;
    payBtn.innerText = "Pay & Book Spot";
    
    // Hide modal
    overlay.classList.remove('show');

    // Notify user
    showToast(`Payment Approved! Booking ${newBooking.bookingId} active.`);

    // Refresh listings
    parkingSpots = getSpots();
    const searchInput = document.getElementById('search-input');
    const typeFilter = document.getElementById('type-filter');
    const sortFilter = document.getElementById('sort-filter');
    filterAndSortSpots(searchInput.value, typeFilter.value, sortFilter.value);

    // Redirect to Dashboard after brief delay to view booking countdown
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);

  }, 1500); // 1.5 seconds payment latency simulator
}
