/**
 * ParkingSpot AI - Leaflet Map Integration
 */

let mapInstance = null;
let markerGroup = null;
let routePolyline = null;
let userMarker = null;
let currentUserCoords = [40.7580, -73.9855]; // Default Times Square fallback

// Initialize map on search page
function initMap(spots, onSpotSelectCallback) {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // Initialize leaflet map
  mapInstance = L.map('map', {
    zoomControl: false // We will customize controls or position them nicely
  }).setView(currentUserCoords, 14);

  // Position zoom controls in top-right for cleaner aesthetics
  L.control.zoom({ position: 'topright' }).addTo(mapInstance);

  // Load custom minimalist map tiles (CartoDB Positron maps fit industrial minimalism perfectly!)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(mapInstance);

  markerGroup = L.layerGroup().addTo(mapInstance);

  // Locate User
  detectUserLocation(() => {
    // Re-draw map user pin and center
    plotUserPin();
    plotParkingSpots(spots, onSpotSelectCallback);
  });

  plotUserPin();
  plotParkingSpots(spots, onSpotSelectCallback);
}

// Locate User via Geolocation
function detectUserLocation(onSuccess) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentUserCoords = [position.coords.latitude, position.coords.longitude];
        if (mapInstance) {
          mapInstance.setView(currentUserCoords, 14);
        }
        if (onSuccess) onSuccess();
      },
      (error) => {
        console.warn('Geolocation error, using Manhattan fallback: ', error.message);
        if (onSuccess) onSuccess(); // Execute anyway with fallback coords
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    if (onSuccess) onSuccess();
  }
}

// Plot User Position Pin
function plotUserPin() {
  if (!mapInstance) return;

  if (userMarker) {
    userMarker.setLatLng(currentUserCoords);
  } else {
    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div class="user-pulse"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    userMarker = L.marker(currentUserCoords, { icon: userIcon }).addTo(mapInstance);
  }
}

// Plot Custom Price Markers on the Map
function plotParkingSpots(spots, onSpotSelectCallback) {
  if (!mapInstance || !markerGroup) return;

  markerGroup.clearLayers();

  spots.forEach(spot => {
    // Select color depending on occupancy
    let statusClass = 'marker-available';
    if (spot.availableSlots === 0) {
      statusClass = 'marker-full';
    } else if (spot.availableSlots < 5) {
      statusClass = 'marker-nearly-full';
    }

    // Create premium-looking price badge icon
    const priceText = spot.availableSlots === 0 ? 'FULL' : `$${spot.pricePerHour.toFixed(2)}`;
    const markerHtml = `
      <div class="custom-map-pin ${statusClass}" data-id="${spot.id}">
        <span class="pin-price">${priceText}</span>
        <span class="pin-car-icon">${spot.type === 'Car' ? '🚗' : '🚲'}</span>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'map-price-badge-icon',
      html: markerHtml,
      iconSize: [80, 36],
      iconAnchor: [40, 18]
    });

    const marker = L.marker([spot.lat, spot.lng], { icon: customIcon });
    
    // Bind click event
    marker.on('click', () => {
      focusSpotOnMap(spot.id);
      if (onSpotSelectCallback) {
        onSpotSelectCallback(spot);
      }
    });

    markerGroup.addLayer(marker);
  });
}

// Focus a spot and zoom in
function focusSpotOnMap(spotId, zoomLevel = 16) {
  if (!mapInstance) return;

  const spots = getSpots();
  const spot = spots.find(s => s.id === spotId);
  if (!spot) return;

  mapInstance.setView([spot.lat, spot.lng], zoomLevel);

  // Trigger outline highlight in map DOM
  document.querySelectorAll('.custom-map-pin').forEach(el => {
    el.classList.remove('highlighted');
    if (el.getAttribute('data-id') === spotId) {
      el.classList.add('highlighted');
    }
  });
}

// Draw polyline directions from User location to parking spot
function drawRouteToSpot(spot) {
  if (!mapInstance) return;

  // Clear previous route
  if (routePolyline) {
    mapInstance.removeLayer(routePolyline);
  }

  // Generate realistic-looking path coordinates with slight curves/angles (simulating city blocks)
  const userLat = currentUserCoords[0];
  const userLng = currentUserCoords[1];
  const spotLat = spot.lat;
  const spotLng = spot.lng;

  // Create simple grid-like city routing path
  const intermediatePoint1 = [spotLat, userLng]; // Turn point

  const routeCoords = [
    [userLat, userLng],
    intermediatePoint1,
    [spotLat, spotLng]
  ];

  // Terracotta Orange path line
  routePolyline = L.polyline(routeCoords, {
    color: '#D97A54',
    weight: 4,
    opacity: 0.8,
    dashArray: '5, 10', // Dashed line looks very engineering-modern
    lineJoin: 'round'
  }).addTo(mapInstance);

  // Fit map bounds to show full route
  const bounds = L.latLngBounds([[userLat, userLng], [spotLat, spotLng]]);
  mapInstance.fitBounds(bounds, { padding: [50, 50] });
}

// CSS injection for Leaflet map indicators
const customMapStyles = `
  .user-location-marker {
    background: transparent;
  }
  .user-pulse {
    width: 16px;
    height: 16px;
    background: #007AFF;
    border: 3px solid #FFFFFF;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(0, 122, 255, 0.6);
    position: relative;
  }
  .user-pulse::after {
    content: '';
    width: 32px;
    height: 32px;
    background: rgba(0, 122, 255, 0.2);
    border-radius: 50%;
    position: absolute;
    top: -11px;
    left: -11px;
    animation: user-pulse-anim 2s infinite ease-out;
  }
  @keyframes user-pulse-anim {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(1.8); opacity: 0; }
  }

  /* Custom Price Pins styling */
  .custom-map-pin {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: var(--color-dark);
    color: var(--color-white);
    font-family: var(--font-headings);
    font-weight: 700;
    font-size: 0.85rem;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    border: 1.5px solid var(--color-white);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--transition-fast);
  }
  .custom-map-pin:hover, .custom-map-pin.highlighted {
    transform: scale(1.08);
    box-shadow: 0 8px 16px rgba(0,0,0,0.25);
    border-color: var(--color-primary);
  }
  .custom-map-pin::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid var(--color-dark);
  }
  .custom-map-pin.highlighted::after {
    border-top-color: var(--color-primary);
  }

  .custom-map-pin.marker-available {
    background-color: #2E7D32;
  }
  .custom-map-pin.marker-available::after {
    border-top-color: #2E7D32;
  }

  .custom-map-pin.marker-nearly-full {
    background-color: #E65100;
  }
  .custom-map-pin.marker-nearly-full::after {
    border-top-color: #E65100;
  }

  .custom-map-pin.marker-full {
    background-color: #C62828;
  }
  .custom-map-pin.marker-full::after {
    border-top-color: #C62828;
  }

  .pin-price {
    margin-right: 4px;
  }
  .pin-car-icon {
    font-size: 0.85rem;
  }
`;

// Proactively inject Leaflet custom styles in DOM
const styleSheet = document.createElement("style");
styleSheet.innerText = customMapStyles;
document.head.appendChild(styleSheet);
