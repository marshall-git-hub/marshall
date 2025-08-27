// Get trailer ID from URL
const urlParams = new URLSearchParams(window.location.search)
const trailerId = urlParams.get("id")

// Global variables
let tires = []
let trailer = null
let trailerSlots = [
  { id: "left-front", position: "Ľavé predné", tire: null },
  { id: "left-middle", position: "Ľavé stredné", tire: null },
  { id: "left-rear", position: "Ľavé zadné", tire: null },
  { id: "right-front", position: "Pravé predné", tire: null },
  { id: "right-middle", position: "Pravé stredné", tire: null },
  { id: "right-rear", position: "Pravé zadné", tire: null },
]

// Load data from database
async function loadData() {
  try {
    // Load trailer data
    const trailers = await DatabaseService.getTrailers()
    trailer = trailers.find(t => t.id === trailerId)
    
    if (!trailer) {
      window.location.href = "trailer.html"
      return
    }
    
    // Update trailer plate display
    trailerPlate.textContent = trailer.licensePlate
    
    // Load vehicle kilometers
    const km = await DatabaseService.getVehicleKm(trailerId);
    if (km !== null) {
      trailer.kilometers = km;
    }
    updateTrailerDisplay();
    
    // Load tires
    tires = await DatabaseService.getTires()
    
    // Load trailer slots
    await loadTireSlots()
    
    renderSlots()
    updateStatus()
  } catch (error) {
    console.error('Error loading data:', error)
  }
}
// DatabaseService implementation using Firestore

async function loadTireSlots() {
  try {
    const savedSlots = await DatabaseService.getTireSlots('trailer', trailerId)
    if (savedSlots.length > 0) {
      trailerSlots = savedSlots
    }
  } catch (error) {
    console.error('Error loading tire slots:', error)
  }
}

let currentSlot = null
let slotToRemove = null

// DOM elements
const trailerPlate = document.getElementById("trailerPlate")
const assignedStatus = document.getElementById("assignedStatus")
const completionBadge = document.getElementById("completionBadge")
const trailerTires = document.getElementById("trailerTires")
const assignModal = document.getElementById("assignModal")
const closeAssignModal = document.getElementById("closeAssignModal")
const assignModalTitle = document.getElementById("assignModalTitle")
const tireSelection = document.getElementById("tireSelection")
const removeTireModal = document.getElementById("removeTireModal")
const cancelRemoveTire = document.getElementById("cancelRemoveTire")
const storageOptionBtns = document.querySelectorAll(".storage-option-btn")

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadData()
  
  // Set up real-time listeners
  DatabaseService.onTiresUpdate((updatedTires) => {
    tires = updatedTires
  })
  
  // Set up real-time listener for trailer updates
  DatabaseService.onTrailersUpdate((updatedTrailers) => {
    const updatedTrailer = updatedTrailers.find(t => t.id === trailerId)
    if (updatedTrailer) {
      trailer = updatedTrailer
      updateTrailerDisplay()
    }
  })
  
  // Set up real-time listener for tire slots updates
  DatabaseService.onTireSlotsUpdate('trailer', trailerId, (updatedSlots) => {
    if (updatedSlots.length > 0) {
      trailerSlots = updatedSlots
      renderSlots()
      updateStatus()
    }
  })

  // Set up real-time listener for vehicle KM updates
  DatabaseService.onVehicleKmUpdate(trailerId, (updatedKm) => {
    if (updatedKm !== null && trailer) {
      trailer.kilometers = updatedKm;
      updateTrailerDisplay(); // Update the header KM display
      renderSlots(); // Re-render slots to update tire KMs
    }
  });
})

// Event listeners
closeAssignModal.addEventListener("click", () => closeAssignModalHandler())

function renderSlots() {
    trailerTires.innerHTML = trailerSlots.map(slot => createSlotCard(slot)).join('');
    addDragAndDropListeners();
}

function getKmStatusClass(km) {
    if (km > 200000) {
        return 'status-red';
    } else if (km >= 150000) {
        return 'status-orange';
    } else {
        return 'status-green';
    }
}

function createSlotCard(slot) {
    const isAssigned = !!slot.tire;
    let currentKm = 0;
    if (isAssigned && trailer) {
        const vehicleKm = trailer.kilometers || 0;
        const tireKm = slot.tire.km || 0;
        const kmOnAssign = slot.tire.kmOnAssign !== undefined ? slot.tire.kmOnAssign : vehicleKm;
        const kmTraveled = vehicleKm - kmOnAssign;
        currentKm = tireKm + (kmTraveled > 0 ? kmTraveled : 0);
    }

    const kmStatusClass = getKmStatusClass(currentKm);

    return `
        <div class="tire-slot-card" data-slot-id="${slot.id}">
            <div class="tire-slot-header">
                <h3>${slot.position}</h3>
            </div>
            <div class="tire-slot-content">
                ${
                  isAssigned
                    ? `
                    <div class="assigned-tire-new" draggable="true">
                        <div class="tire-brand-new">${slot.tire.brand} <strong>${slot.tire.type}</strong></div>
                        <div class="tire-size-new">${slot.tire.size}</div>
                        <div class="tire-details-grid-new">
                            <div class="tire-detail-item-new">
                                <span class="detail-label-new">ID</span>
                                <span class="detail-value-new">${slot.tire.customId || slot.tire.id}</span>
                            </div>
                            <div class="tire-detail-item-new">
                                <span class="detail-label-new">DOT</span>
                                <span class="detail-value-new">${slot.tire.dot || '-'}</span>
                            </div>
                        </div>
                        <div class="tire-km-new ${kmStatusClass}">
                            <span class="km-label">Najazdené km</span>
                            <span class="km-value">${formatKm(currentKm)}</span>
                        </div>
                    </div>
                `
                    : `
                    <div class="empty-slot" onclick="openAssignModal('${slot.id}')">
                        <div class="empty-slot-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19z" stroke-dasharray="2 2"/>
                                <path d="M12 8v8m-4-4h8"/>
                            </svg>
                        </div>
                        <div class="empty-slot-text">Priradiť pneumatiku</div>
                    </div>
                `
                }
            </div>
            <div class="tire-slot-footer">
            ${
              slot.tire
                ? `
                <button class="slot-btn-new remove-btn-new" onclick="removeTire('${slot.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    <span>Odobrať</span>
                </button>
            `
                : ``
            }
            </div>
        </div>
    `;
}

function formatKm(km) {
  return km.toLocaleString('sk-SK')
}

function openAssignModal(slotId) {
    currentSlot = slotId;
    const slot = trailerSlots.find((s) => s.id === slotId);
    assignModalTitle.textContent = `Priradiť pneumatiku k ${slot.position}`;

    const searchInput = document.getElementById('tireSearchInput');
    
    const renderTireList = (filter = '') => {
        const lowerCaseFilter = filter.toLowerCase();
        const availableTires = tires.filter((t) => {
            if (t.status !== "available") return false;
            if (!filter) return true;
            return (
                (t.customId && t.customId.toLowerCase().includes(lowerCaseFilter)) ||
                (t.brand && t.brand.toLowerCase().includes(lowerCaseFilter)) ||
                (t.type && t.type.toLowerCase().includes(lowerCaseFilter)) ||
                (t.size && t.size.toLowerCase().includes(lowerCaseFilter))
            );
        });

        if (availableTires.length > 0) {
            tireSelection.innerHTML = availableTires
                .map(
                    (tire) => `
                        <div class="tire-option" onclick="assignTire('${slotId}', '${tire.id}')">
                            <div class="tire-option-header">
                                <span style="font-weight: 700; font-size: 1.1em;">${tire.customId || tire.id}</span>
                            </div>
                            <div class="tire-option-details">
                                <span>${tire.brand} ${tire.type}</span>
                                <span style="font-weight: 500;">${tire.size}</span>
                            </div>
                            <div class="tire-option-details" style="margin-top: 0.5rem; font-size: 0.8em; color: #6b7280;">
                                <span>DOT: ${tire.dot || '-'}</span>
                                <span>Najazdené km: ${formatKm(tire.km ?? 0)}</span>
                            </div>
                        </div>
                    `
                )
                .join("");
        } else {
            tireSelection.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">Žiadne vyhovujúce pneumatiky v sklade</p>';
        }
    };

    renderTireList();
    searchInput.addEventListener('input', (e) => renderTireList(e.target.value));
    assignModal.classList.add("active");
    searchInput.focus();
}

function closeAssignModalHandler() {
  assignModal.classList.remove("active")
  currentSlot = null
}

async function assignTire(slotId, tireId) {
  const tireToAssign = tires.find((t) => t.id === tireId);
  const slotIndex = trailerSlots.findIndex((s) => s.id === slotId);

  if (tireToAssign && slotIndex !== -1) {
    try {
      // 1. Fetch the absolute latest vehicle KM from the DB before assigning.
      const kmAtAssignment = await DatabaseService.getVehicleKm(trailerId) || 0;
      
      // Create a clean tire object for the slot, adding the kmOnAssign property.
      const tireForSlot = {
        id: tireToAssign.id,
        customId: tireToAssign.customId,
        brand: tireToAssign.brand,
        type: tireToAssign.type,
        size: tireToAssign.size,
        dot: tireToAssign.dot,
        km: tireToAssign.km, // The tire's base KM
        kmOnAssign: kmAtAssignment // Vehicle's KM at this moment
      };

      trailerSlots[slotIndex].tire = tireForSlot;

      // 2. Update the tire's main status to 'assigned'
      await DatabaseService.updateTire(tireId, { status: "assigned" });

      // 3. Save the updated slots array to the database
      await DatabaseService.updateTireSlots('trailer', trailerId, trailerSlots);

      // No need to manually reload data, the on-snapshot listener will do it.
      closeAssignModalHandler();
    } catch (error) {
      console.error('Error assigning tire:', error);
      alert('Chyba pri priraďovaní pneumatiky. Skúste to znova.');
    }
  }
}

function removeTire(slotId) {
  slotToRemove = slotId
  removeTireModal.classList.add("active")
}

function closeRemoveTireModal() {
  removeTireModal.classList.remove("active")
  slotToRemove = null
}

async function finalizeTireRemoval(location) {
    const slotIndex = trailerSlots.findIndex((s) => s.id === slotToRemove);
    const slot = trailerSlots[slotIndex];

    if (slotIndex !== -1 && slot.tire) {
        try {
            const tireId = slot.tire.id;
            let newStatus = "available";
            if (location === "Predaj") {
                newStatus = "forSale";
            } else if (location === "Vyhodne") {
                newStatus = "disposed";
            }

            const vehicleKm = trailer.kilometers || 0;
            const tireBaseKm = slot.tire.km || 0;
            const kmOnAssign = slot.tire.kmOnAssign !== undefined ? slot.tire.kmOnAssign : vehicleKm;
            const kmTraveled = vehicleKm - kmOnAssign;
            const newTotalKm = tireBaseKm + (kmTraveled > 0 ? kmTraveled : 0);

            // First, update the tire's status and mileage.
            await DatabaseService.updateTire(tireId, {
                status: newStatus,
                km: newTotalKm,
            });

            // Create a temporary copy of the slots before modification.
            const oldSlots = JSON.parse(JSON.stringify(trailerSlots));

            // Now, remove the tire from the slot.
            trailerSlots[slotIndex].tire = null;

            // Finally, update the tire slots, which will also trigger the logging.
            // The logging function will now fetch the updated tire status.
            await DatabaseService.updateTireSlots("trailer", trailerId, trailerSlots);

            closeRemoveTireModal();
        } catch (error) {
            console.error("Error removing tire:", error);
            alert("Chyba pri odoberaní pneumatiky. Skúste to znova.");
        }
    }
}

cancelRemoveTire.addEventListener("click", closeRemoveTireModal)

storageOptionBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const location = btn.dataset.location
    finalizeTireRemoval(location)
  })
})

function formatLicensePlate(plate) {
  if (plate && plate.length === 7) {
    return `${plate.slice(0, 2)} ${plate.slice(2, 5)} ${plate.slice(5, 7)}`;
  }
  return plate;
}

function updateTrailerDisplay() {
  if (trailer) {
    trailerPlate.textContent = formatLicensePlate(trailer.licensePlate)
    if (trailer.kilometers !== undefined) {
      const kmElement = document.getElementById("trailerKm");
      if (kmElement) {
        kmElement.textContent = `${trailer.kilometers.toLocaleString('sk-SK')} km`;
      }
    }
    updateStatus()
  }
}

function updateStatus() {
  const assignedCount = trailerSlots.filter((slot) => slot.tire).length
  const totalSlots = trailerSlots.length
  const isComplete = assignedCount === totalSlots

  assignedStatus.textContent = `${assignedCount}/${totalSlots} Priradené`
  completionBadge.textContent = isComplete ? "Úplné" : "Neúplné"
  completionBadge.className = `status-badge ${isComplete ? "complete" : "incomplete"}`
}

// Close modal when clicking outside
assignModal.addEventListener("click", (e) => {
  if (e.target === assignModal) {
    closeAssignModalHandler()
  }
})

function addDragAndDropListeners() {
    const slots = document.querySelectorAll('.tire-slot-card');
    let draggedItem = null;
    let touchDraggedItem = null;
    let longPressTimer = null;
    let isDragging = false;

    slots.forEach(slot => {
        // Mouse events
        slot.addEventListener('dragstart', (e) => {
            const tireCard = e.target.closest('.assigned-tire-new');
            if (tireCard) {
                draggedItem = e.target.closest('.tire-slot-card');
                setTimeout(() => {
                    if (draggedItem) {
                        draggedItem.style.opacity = '0.5';
                    }
                }, 0);
            } else {
                e.preventDefault();
            }
        });

        slot.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.style.opacity = '1';
                draggedItem = null;
            }
        });

        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetSlot = e.target.closest('.tire-slot-card');
            if (targetSlot && targetSlot !== draggedItem) {
                targetSlot.classList.add('drag-over');
            }
        });

        slot.addEventListener('dragleave', (e) => {
            const targetSlot = e.target.closest('.tire-slot-card');
            if (targetSlot) {
                targetSlot.classList.remove('drag-over');
            }
        });

        slot.addEventListener('drop', async (e) => {
            e.preventDefault();
            const toSlot = e.target.closest('.tire-slot-card');
            if (draggedItem && toSlot) {
                toSlot.classList.remove('drag-over');
                const fromSlotId = draggedItem.dataset.slotId;
                const toSlotId = toSlot.dataset.slotId;

                if (fromSlotId !== toSlotId) {
                    await swapTires(fromSlotId, toSlotId);
                }
            }
        });

        // Touch events
        slot.addEventListener('touchstart', (e) => {
            const tireCard = e.target.closest('.assigned-tire-new');
            if (tireCard) {
                longPressTimer = setTimeout(() => {
                    isDragging = true;
                    touchDraggedItem = e.target.closest('.tire-slot-card');
                    touchDraggedItem.style.opacity = '0.5';
                }, 300); // 300ms for long press
            }
        });

        slot.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                const touch = e.touches[0];
                const targetSlot = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.tire-slot-card');
                slots.forEach(s => s.classList.remove('drag-over'));
                if (targetSlot && targetSlot !== touchDraggedItem) {
                    targetSlot.classList.add('drag-over');
                }
            } else {
                clearTimeout(longPressTimer);
            }
        });

        slot.addEventListener('touchend', async (e) => {
            clearTimeout(longPressTimer);
            if (isDragging && touchDraggedItem) {
                touchDraggedItem.style.opacity = '1';
                const touch = e.changedTouches[0];
                const toSlot = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.tire-slot-card');
                slots.forEach(s => s.classList.remove('drag-over'));

                if (toSlot) {
                    const fromSlotId = touchDraggedItem.dataset.slotId;
                    const toSlotId = toSlot.dataset.slotId;

                    if (fromSlotId !== toSlotId) {
                        await swapTires(fromSlotId, toSlotId);
                    }
                }
            }
            isDragging = false;
            touchDraggedItem = null;
        });

        slot.addEventListener('touchcancel', () => {
            clearTimeout(longPressTimer);
            if (touchDraggedItem) {
                touchDraggedItem.style.opacity = '1';
            }
            isDragging = false;
            touchDraggedItem = null;
        });
    });
}

async function swapTires(fromSlotId, toSlotId) {
    const fromSlotIndex = trailerSlots.findIndex(s => s.id === fromSlotId);
    const toSlotIndex = trailerSlots.findIndex(s => s.id === toSlotId);

    if (fromSlotIndex !== -1 && toSlotIndex !== -1) {
        const fromTire = trailerSlots[fromSlotIndex].tire;
        const toTire = trailerSlots[toSlotIndex].tire;

        // Swap tires
        trailerSlots[fromSlotIndex].tire = toTire;
        trailerSlots[toSlotIndex].tire = fromTire;

        try {
            await DatabaseService.updateTireSlots('trailer', trailerId, trailerSlots);
            // The real-time listener will re-render the slots
        } catch (error) {
            console.error('Error swapping tires:', error);
            // Revert the swap in case of an error
            trailerSlots[fromSlotIndex].tire = fromTire;
            trailerSlots[toSlotIndex].tire = toTire;
            renderSlots();
        }
    }
}
