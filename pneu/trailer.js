// Global trailers array
let trailers = []
let allKms = {}
let allSlots = {}

// DOM elements
let trailerGrid, goodCount, warningCount, dangerCount

// Load trailers from database
async function loadTrailers() {
  try {
    // --- OPTIMIZATION: Load all data in parallel ---
    const [trailersData, kmsData, slotsData] = await Promise.all([
      DatabaseService.getTrailers(),
      DatabaseService.getAllVehicleKms(),
      DatabaseService.getAllTireSlots('trailer')
    ]);

    trailers = trailersData;
    allKms = kmsData;
    allSlots = slotsData;

    processTrailerData();
    
    renderTrailers()
    updateStats()
  } catch (error) {
    console.error('Error loading trailers:', error)
    // Fallback to empty array
    trailers = []
  }
}

// --- OPTIMIZATION: Centralized data processing ---
function processTrailerData() {
  trailers.forEach(trailer => {
    const vehicleKm = allKms[trailer.id] || 0;
    const slots = allSlots[trailer.id] || [];
    const assignedCount = slots.filter(slot => slot.tire).length;
    const totalSlots = slots.length > 0 ? slots.length : 6; // Default to 6 if no slots defined

    trailer.kilometers = vehicleKm;
    trailer.tiresAssigned = assignedCount;
    trailer.totalTires = totalSlots;
    trailer.status = calculateVehicleStatus(slots, vehicleKm);
  });
}

// Calculate vehicle status based on tire kilometers
function calculateVehicleStatus(vehicleSlots, vehicleKm) {
  const assignedTires = vehicleSlots.filter(slot => slot.tire);
  
  if (assignedTires.length === 0) {
    return 'unknown'; // No tires assigned, status is unknown
  }

  const currentTireKms = assignedTires.map(slot => {
    const tireKm = slot.tire.km || 0;
    const kmOnAssign = slot.tire.kmOnAssign !== undefined ? slot.tire.kmOnAssign : vehicleKm;
    const kmTraveled = vehicleKm - kmOnAssign;
    return tireKm + (kmTraveled > 0 ? kmTraveled : 0);
  });
  
  // Check if any tire has over 200,000 km (critical)
  const hasCriticalTire = currentTireKms.some(km => km >= 200000);
  if (hasCriticalTire) {
    return 'danger';
  }
  
  // Check if any tire has between 150,000-200,000 km (warning)
  const hasWarningTire = currentTireKms.some(km => km >= 150000 && km < 200000);
  if (hasWarningTire) {
    return 'warning';
  }
  
  // All tires are under 150,000 km (good)
  return 'good';
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize DOM elements
  trailerGrid = document.getElementById("trailerGrid")
  goodCount = document.getElementById("goodCount")
  warningCount = document.getElementById("warningCount")
  dangerCount = document.getElementById("dangerCount")
  
  await loadTrailers()
  
  // --- OPTIMIZATION: Use more efficient real-time listeners ---
  DatabaseService.onTrailersUpdate(async (updatedTrailers) => {
    trailers = updatedTrailers;
    processTrailerData();
    renderTrailers();
    updateStats();
  });

  DatabaseService.onAllVehicleKmsUpdate((updatedKms) => {
    allKms = updatedKms;
    processTrailerData();
    renderTrailers();
    updateStats();
  });
})

function renderTrailers() {
  trailerGrid.innerHTML = trailers.map((trailer) => createTrailerCard(trailer)).join("")
}

function updateStats() {
  const good = trailers.filter(t => t.status === 'good').length
  const warning = trailers.filter(t => t.status === 'warning').length
  const danger = trailers.filter(t => t.status === 'danger').length

  console.log('Updating trailer stats:', { good, warning, danger, total: trailers.length })
  console.log('Trailer statuses:', trailers.map(t => ({ id: t.id, status: t.status })))

  goodCount.textContent = `${good} V poriadku`
  warningCount.textContent = `${warning} Pozor`
  dangerCount.textContent = `${danger} Kritické`
}

function formatLicensePlate(plate) {
  if (plate && plate.length === 7) {
    return `${plate.slice(0, 2)} ${plate.slice(2, 5)} ${plate.slice(5, 7)}`;
  }
  return plate;
}

function getStatusText(status) {
  switch(status) {
    case 'good': return 'V poriadku';
    case 'warning': return 'Pozor';
    case 'danger': return 'Kritické';
    case 'unknown': return 'Neznáme';
    default: return 'Neznáme';
  }
}

function createTrailerCard(trailer) {
  const percentage = Math.round((trailer.tiresAssigned / trailer.totalTires) * 100)

  return `
        <div class="vehicle-card" onclick="window.location.href='trailer-detail.html?id=${trailer.id}'">
            <div class="vehicle-card-content">
                <div class="vehicle-info">
                    <div class="vehicle-icon ${trailer.status || 'good'}">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                            <path d="M15 18H9"/>
                            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                            <circle cx="17" cy="18" r="2"/>
                            <circle cx="7" cy="18" r="2"/>
                        </svg>
                    </div>
                    <div class="vehicle-details">
                        <h3>${formatLicensePlate(trailer.licensePlate)}</h3>
                        <div class="vehicle-meta">
                            <span>${trailer.tiresAssigned}/${trailer.totalTires} pneumatík</span>
                        </div>
                    </div>
                </div>
                <div class="vehicle-status">
                    <div class="status-icon ${trailer.status || 'unknown'}">
                        ${
                          trailer.status === 'good'
                            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>'
                            : trailer.status === 'warning'
                            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                            : trailer.status === 'danger'
                            ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
                            : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
                        }
                    </div>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-info">
                    <span>Stav pneumatík</span>
                    <span>${getStatusText(trailer.status)}</span>
                </div>
                <div class="progress-track">
                    <div class="progress-fill ${trailer.status || 'unknown'}" style="width: 100%"></div>
                </div>
            </div>
        </div>
    `
}
