// Global tires array
let tires = []

// Load tires from database
async function loadTires() {
  try {
    tires = await DatabaseService.getTires()
    console.log('Loaded tires:', tires)
    if (tires.length > 0) {
      console.log('Sample tire structure:', tires[0])
      console.log('Sample tire ID:', tires[0].id)
      console.log('Sample tire customId:', tires[0].customId)
    }
    renderTires()
    updateStats()
  } catch (error) {
    console.error('Error loading tires:', error)
    // Fallback to empty array
    tires = []
  }
}

let editingTire = null

// DOM elements
const availableTiresContainer = document.getElementById("availableTires")
const forSaleTiresContainer = document.getElementById("forSaleTires")
const forSaleSection = document.getElementById("forSaleSection")
const disposedTiresContainer = document.getElementById("disposedTires")
const disposedSection = document.getElementById("disposedSection")
const availableCount = document.getElementById("availableCount")
const forSaleCount = document.getElementById("forSaleCount")
const disposedCount = document.getElementById("disposedCount")
const addTireBtn = document.getElementById("addTireBtn")
const tireModal = document.getElementById("tireModal")
const closeModal = document.getElementById("closeModal")
const tireForm = document.getElementById("tireForm")
const modalTitle = document.getElementById("modalTitle")
const submitText = document.getElementById("submitText")
const filterSearch = document.getElementById("filterSearch")
const groupDetailModal = document.getElementById("groupDetailModal")
const closeGroupDetailModal = document.getElementById("closeGroupDetailModal")
const groupDetailList = document.getElementById("groupDetailList")
const moveTireModal = document.getElementById("moveTireModal")
const closeMoveTireModal = document.getElementById("closeMoveTireModal")
const cancelMoveTire = document.getElementById("cancelMoveTire")
const moveTireIdDisplay = document.getElementById("moveTireIdDisplay")
const storageOptionBtns = document.querySelectorAll("#moveTireModal .storage-option-btn")

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadTires()
  
  // Set up real-time listener for tire updates
  DatabaseService.onTiresUpdate((updatedTires) => {
    tires = updatedTires
    renderTires()
    updateStats()
  })
  
  // Set up automatic formatting for tire size
  const tireSizeInput = document.getElementById("tireSize")
  if (tireSizeInput) {
    tireSizeInput.addEventListener("input", formatTireSize)
    tireSizeInput.dataset.lastLength = "0"
  }
})

// Event listeners
addTireBtn.addEventListener("click", () => openModal())
closeModal.addEventListener("click", () => closeModalHandler())
tireForm.addEventListener("submit", handleSubmit)

// Filter listeners
filterSearch.addEventListener("input", renderTires)

// Modal handlers
function openModal(tire = null) {
  editingTire = tire
  const currentDotDisplay = document.getElementById("currentDotDisplay")
  const tireDotInput = document.getElementById("tireDot")

  if (tire) {
    modalTitle.textContent = "Upraviť pneumatiku"
    submitText.textContent = "Aktualizovať pneumatiku"
    document.getElementById("tireBrand").value = tire.brand
    document.getElementById("tireType").value = tire.type
    document.getElementById("tireSize").value = tire.size
    document.getElementById("tireId").value = tire.customId || tire.id
    document.getElementById("tireKm").value = tire.km ?? 0
    
    // DOT handling
    if (tire.dot) {
      currentDotDisplay.textContent = `(Aktuálny: ${tire.dot})`
    } else {
      currentDotDisplay.textContent = ""
    }
    tireDotInput.value = "" // Clear input for new WWYY
    tireDotInput.required = false // Not required when editing

  } else {
    modalTitle.textContent = "Pridať novú pneumatiku"
    submitText.textContent = "Pridať pneumatiku"
    tireForm.reset()
    document.getElementById("tireKm").value = "0"
    currentDotDisplay.textContent = ""
    tireDotInput.required = true // Required for new tires
  }
  tireModal.classList.add("active")
  
  // Znovu nastaví event listener pre formátovanie rozmeru
  const tireSizeInput = document.getElementById("tireSize")
  if (tireSizeInput) {
    // Odstráni existujúci listener ak existuje
    tireSizeInput.removeEventListener("input", formatTireSize)
    // Pridá nový listener
    tireSizeInput.addEventListener("input", formatTireSize)
    // Inicializuje lastLength
    tireSizeInput.dataset.lastLength = "0"
  }
}

function closeModalHandler() {
  tireModal.classList.remove("active")
  editingTire = null
  tireForm.reset()
  
  // Odstráni event listener pre formátovanie rozmeru
  const tireSizeInput = document.getElementById("tireSize")
  if (tireSizeInput) {
    tireSizeInput.removeEventListener("input", formatTireSize)
  }
}

function convertDotToDate(dotValue) {
  if (!/^\d{4}$/.test(dotValue)) {
    return null; // Invalid format
  }
  const week = parseInt(dotValue.substring(0, 2), 10);
  const year = parseInt(dotValue.substring(2, 4), 10) + 2000;

  if (week < 1 || week > 53) {
    return null; // Invalid week
  }

  // Calculate month (approximation)
  const month = Math.ceil(week / 4.345);
  return `${String(month).padStart(2, '0')}/${year}`;
}

async function handleSubmit(e) {
  e.preventDefault()
  const brand = document.getElementById("tireBrand").value
  const type = document.getElementById("tireType").value
  let size = document.getElementById("tireSize").value
  const id = document.getElementById("tireId").value
  const dotInput = document.getElementById("tireDot").value
  const km = parseInt(document.getElementById("tireKm").value) || 0

  let dot = editingTire ? editingTire.dot : null;

  if (dotInput) {
    const convertedDot = convertDotToDate(dotInput);
    if (convertedDot) {
      dot = convertedDot;
    } else {
      alert("Neplatný formát DOT. Zadajte 4 číslice v tvare WWYY (napr. 1424).");
      return;
    }
  } else if (!editingTire) {
    alert("DOT je povinný údaj pre nové pneumatiky.");
    return;
  }

  try {
    if (editingTire) {
      console.log('Updating tire:', editingTire)
      console.log('Update data:', { brand, type, size, id, dot, km })
      // Update existing tire - editingTire.id je Firebase document ID
      await DatabaseService.updateTire(editingTire.id, {
        customId: id, // Uložíme custom ID ako customId
        brand, type, size, dot, km
      })
      console.log('Tire updated successfully')
    } else {
      // Add new tire
      const newTire = {
        customId: id, // Uložíme custom ID ako customId
        brand,
        type,
        size,
        status: "available",
        dot,
        km,
      }
      await DatabaseService.addTire(newTire)
    }
    // Re-render po uložení
    await loadTires()
    closeModalHandler()
  } catch (error) {
    console.error('Error saving tire:', error)
    alert('Chyba pri ukladaní pneumatiky. Skúste to znova.')
  }
}

async function deleteTire(tireId) {
  if (confirm("Ste si istí, že chcete vymazať túto pneumatiku?")) {
    try {
      console.log('Attempting to delete tire with ID:', tireId)
      console.log('Available tires:', tires)
      const tire = tires.find(t => t.id === tireId)
      console.log('Found tire:', tire)
      
      if (tire) {
        // tireId je už Firebase document ID
        await DatabaseService.deleteTire(tireId)
        console.log('Tire deleted successfully')
        // Re-render po mazaní
        await loadTires()
      } else {
        console.error('Tire not found for deletion')
        alert('Pneumatika nebola nájdená.')
      }
    } catch (error) {
      console.error('Error deleting tire:', error)
      alert('Chyba pri mazaní pneumatiky. Skúste to znova.')
    }
  }
}

function renderTires() {
  // Filtering
  let availableTires = tires.filter((t) => t.status === "available")
  let forSaleTires = tires.filter((t) => t.status === "forSale")
  let disposedTires = tires.filter((t) => t.status === "disposed")

  const searchVal = filterSearch.value.trim().toLowerCase()

  if (searchVal) {
    availableTires = availableTires.filter((t) => 
      t.brand.toLowerCase().includes(searchVal) || 
      t.type.toLowerCase().includes(searchVal) ||
      t.size.toLowerCase().includes(searchVal) ||
      (t.customId && t.customId.toLowerCase().includes(searchVal)) ||
      (t.id && t.id.toLowerCase().includes(searchVal)) ||
      (t.dot && t.dot.toLowerCase().includes(searchVal))
    )
    forSaleTires = forSaleTires.filter((t) => 
      t.brand.toLowerCase().includes(searchVal) || 
      t.type.toLowerCase().includes(searchVal) ||
      t.size.toLowerCase().includes(searchVal) ||
      (t.customId && t.customId.toLowerCase().includes(searchVal)) ||
      (t.id && t.id.toLowerCase().includes(searchVal)) ||
      (t.dot && t.dot.toLowerCase().includes(searchVal))
    )
    disposedTires = disposedTires.filter((t) => 
      t.brand.toLowerCase().includes(searchVal) || 
      t.type.toLowerCase().includes(searchVal) ||
      t.size.toLowerCase().includes(searchVal) ||
      (t.customId && t.customId.toLowerCase().includes(searchVal)) ||
      (t.id && t.id.toLowerCase().includes(searchVal)) ||
      (t.dot && t.dot.toLowerCase().includes(searchVal))
    )
  }

  // Grouping available tires (always group, even if only 1)
  const groups = {}
  availableTires.forEach((tire) => {
    const key = `${tire.brand}|${tire.type}|${tire.size}`
    if (!groups[key]) groups[key] = []
    groups[key].push(tire)
  })

  availableTiresContainer.innerHTML = Object.keys(groups)
    .map((key) => {
      const group = groups[key]
      const tire = group[0]
      return `
        <div class="tire-card group-card" onclick="showGroupDetail('${encodeURIComponent(key)}', 'available')">
          <div class="tire-card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div class="tire-info">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <h3>${tire.brand} ${tire.type}</h3>
              </div>
              <p>${tire.size}</p>
            </div>
            <span class="tire-count status-available" style="align-self: flex-start; margin-left: 1rem;">${group.length} ks</span>
          </div>
        </div>
      `
    })
    .join("")

  // Render forSale tires (grouped like available tires)
  if (forSaleTires.length > 0) {
    // Grouping forSale tires
    const forSaleGroups = {}
    forSaleTires.forEach((tire) => {
      const key = `${tire.brand}|${tire.type}|${tire.size}`
      if (!forSaleGroups[key]) forSaleGroups[key] = []
      forSaleGroups[key].push(tire)
    })

    forSaleTiresContainer.innerHTML = Object.keys(forSaleGroups)
      .map((key) => {
        const group = forSaleGroups[key]
        const tire = group[0]
        return `
          <div class="tire-card group-card" onclick="showGroupDetail('${encodeURIComponent(key)}', 'forSale')">
            <div class="tire-card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div class="tire-info">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <h3>${tire.brand} ${tire.type}</h3>
                </div>
                <p>${tire.size}</p>
              </div>
              <span class="tire-count status-forsale" style="align-self: flex-start; margin-left: 1rem;">${group.length} ks</span>
            </div>
          </div>
        `
      })
      .join("")
    forSaleSection.style.display = "block"
    // Initially hide the content
    const forSaleContent = forSaleSection.querySelector('.collapsible-content')
    if (forSaleContent) {
      forSaleContent.style.display = 'none'
    }
  } else {
    forSaleSection.style.display = "none"
  }

  // Render disposed tires (grouped like available tires)
  if (disposedTires.length > 0) {
    // Grouping disposed tires
    const disposedGroups = {}
    disposedTires.forEach((tire) => {
      const key = `${tire.brand}|${tire.type}|${tire.size}`
      if (!disposedGroups[key]) disposedGroups[key] = []
      disposedGroups[key].push(tire)
    })

    disposedTiresContainer.innerHTML = Object.keys(disposedGroups)
      .map((key) => {
        const group = disposedGroups[key]
        const tire = group[0]
        return `
          <div class="tire-card group-card" onclick="showGroupDetail('${encodeURIComponent(key)}', 'disposed')">
            <div class="tire-card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div class="tire-info">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <h3>${tire.brand} ${tire.type}</h3>
                </div>
                <p>${tire.size}</p>
              </div>
              <span class="tire-count status-disposed" style="align-self: flex-start; margin-left: 1rem;">${group.length} ks</span>
            </div>
          </div>
        `
      })
      .join("")
    disposedSection.style.display = "block"
    // Initially hide the content
    const disposedContent = disposedSection.querySelector('.collapsible-content')
    if (disposedContent) {
      disposedContent.style.display = 'none'
    }
  } else {
    disposedSection.style.display = "none"
  }
}

function createTireCard(tire) {
  return `
        <div class="tire-card" onclick="prefillFromGroup('${encodeURIComponent(tire.brand)}','${encodeURIComponent(tire.type)}','${encodeURIComponent(tire.size)}')">
            <div class="tire-card-header">
                <div class="tire-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <h3>${tire.brand} ${tire.type}</h3>
                    </div>
                    <p>${tire.size}</p>
                    <span class="tire-id">ID: ${tire.customId || tire.id}</span><br>
                    <span class="tire-id">DOT: ${tire.dot || "-"}</span><br>
                    <span class="tire-id">Najazdené km: ${formatKm(tire.km ?? 0)}</span>
                </div>
                <div class="tire-actions" onclick="event.stopPropagation()">
                    <button class="action-btn edit-btn" onclick="openModal(${JSON.stringify(tire).replace(/"/g, '&quot;')});event.stopPropagation()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteTire('${tire.id}');event.stopPropagation()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `
}

function updateStats() {
  const available = tires.filter((t) => t.status === "available").length
  const forSale = tires.filter((t) => t.status === "forSale").length
  const disposed = tires.filter((t) => t.status === "disposed").length

  availableCount.textContent = `${available} Dostupné`
  forSaleCount.textContent = `${forSale} Predávané`
  disposedCount.textContent = `${disposed} Vyradené`
}

// Remove saveTires function as it's no longer needed with Firebase

// Group detail logic
window.showGroupDetail = function (key, status = "available") {
  const decodedKey = decodeURIComponent(key)
  const [brand, type, size] = decodedKey.split("|")
  const group = tires.filter(
    (t) => t.status === status && t.brand === brand && t.type === type && t.size === size
  )
  const isMobile = window.innerWidth <= 500
  // Rozdelenie rozmeru na časti (napr. 355/50 R 22,5)
  let sizeMain = size, sizeR = '', sizeNum = ''
  const sizeMatch = size.match(/^(\d{3}\/\d{2}) ?R ?([\d,.]+)/i)
  if (sizeMatch) {
    sizeMain = sizeMatch[1]
    sizeR = 'R'
    sizeNum = sizeMatch[2]
  }
  
  // Určenie farby badge podľa statusu
  let badgeClass = "badge-count"
  if (status === "forSale") badgeClass = "badge badge-status badge-status-forsale"
  else if (status === "disposed") badgeClass = "badge badge-status badge-status-disposed"
  
  groupDetailList.innerHTML = `
    <div class="group-header-box">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="margin-bottom:0.5rem;">
            <span style="font-weight:700; font-size:1.15rem;">${brand} ${type}</span>
          </div>
          <div style="color:#6b7280; font-size:0.875rem;">${sizeMain} ${sizeR} ${sizeNum}</div>
        </div>
        <span class="${badgeClass}">${group.length} ks</span>
      </div>
    </div>
    <div class="group-table-box">
      <div style="display:flex; justify-content:center; align-items:center; margin-bottom:0.75rem;">
        <button class="add-btn group-mobile-add-btn" style="display:flex;align-items:center;gap:0.5rem;" onclick="prefillFromGroup('${encodeURIComponent(brand)}','${encodeURIComponent(type)}','${encodeURIComponent(size)}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Rýchle pridanie gumy
        </button>
      </div>
      <div class="group-table-scroll">
        ${isMobile ? renderGroupMobileList(group) : renderGroupTable(group)}
      </div>
    </div>
  `
  groupDetailModal.classList.add("active")
}

function renderGroupTable(group) {
  return `
    <table class="group-table">
      <thead>
        <tr>
          <th># ID</th>
          <th>DOT</th>
          <th>Najazdené km</th>
          <th style="text-align: right;">Akcie</th>
        </tr>
      </thead>
      <tbody>
        ${group
          .map(
            (t) => `
              <tr>
                <td>${t.customId || t.id}</td>
                <td>${t.dot || "-"}</td>
                <td>${formatKm(t.km ?? 0)} km</td>
                <td style="text-align: right;">
                  <button class="action-btn edit-btn" onclick="editTireFromGroup('${t.customId || t.id}')" title="Upraviť">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="action-btn move-btn" onclick="openMoveTireModal('${t.id}')" title="Presunúť">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m3 9 6-6 6 6"/><path d="m3 15 6 6 6-6"/></svg>
                  </button>
                  <button class="action-btn delete-btn" onclick="deleteTireFromGroup('${t.customId || t.id}')" title="Vymazať">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `
}

function renderGroupMobileList(group) {
  return `
    <div class="group-mobile-list">
      ${group
        .map(
          (t) => `
            <div class="group-mobile-card">
              <div class="group-mobile-row"><span class="group-mobile-label">ID:</span> <span class="group-mobile-id">${t.customId || t.id}</span></div>
              <div class="group-mobile-row"><span class="group-mobile-label">DOT:</span> <span class="group-mobile-km">${t.dot || "-"}</span></div>
              <div class="group-mobile-row"><span class="group-mobile-label">Najazdené km:</span> <span class="group-mobile-km">${formatKm(t.km ?? 0)} km</span></div>
              <div class="group-mobile-actions">
                <button class="group-mobile-btn edit" onclick="editTireFromGroup('${t.customId || t.id}')">Upraviť</button>
                <button class="group-mobile-btn delete" onclick="deleteTireFromGroup('${t.customId || t.id}')">Vymazať</button>
                <button class="group-mobile-btn move" onclick="openMoveTireModal('${t.id}')">Presunúť</button>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `
}
function formatKm(km) {
  return km.toLocaleString('sk-SK')
}

function renderTireStatusBadge(t) {
  // Príklad: podľa potreby rozšír o ďalšie stavy
  if (t.status === 'available') return '<span class="badge badge-status badge-status-available">Aktívna</span>'
  if (t.status === 'forSale') return '<span class="badge badge-status badge-status-forsale">Na predaj</span>'
  if (t.status === 'disposed') return '<span class="badge badge-status badge-status-disposed">Vyhodene</span>'
  if (t.status === 'maintenance') return '<span class="badge badge-status badge-status-maintenance">Údržba</span>'
  return '<span class="badge badge-status badge-status-available">Aktívna</span>'
}

window.editTireFromGroup = function(tireId) {
  console.log('editTireFromGroup called with tireId:', tireId)
  console.log('Available tires:', tires)
  // tireId je custom ID (napr. "R2V83292"), nie Firebase document ID
  const tire = tires.find(t => t.customId === tireId)
  console.log('Found tire:', tire)
  if (tire) {
    // Zatvor detail modal pred otvorením edit modalu
    groupDetailModal.classList.remove('active')
    // Krátky timeout aby sa modal zatvoril
    setTimeout(() => {
      openModal(tire)
    }, 100)
  }
}

window.deleteTireFromGroup = function(tireId) {
  console.log('deleteTireFromGroup called with tireId:', tireId)
  // tireId je custom ID (napr. "R2V83292"), nie Firebase document ID
  const tire = tires.find(t => t.customId === tireId)
  console.log('Found tire for deletion:', tire)
  
  if (tire) {
    // Zatvor detail modal pred mazaním
    groupDetailModal.classList.remove('active')
    // Krátky timeout aby sa modal zatvoril
    setTimeout(async () => {
      // Použijeme Firebase document ID pre mazanie
      await deleteTire(tire.id)
    }, 100)
  } else {
    console.error('Tire not found for deletion:', tireId)
    alert('Pneumatika nebola nájdená.')
  }
}
closeGroupDetailModal.addEventListener("click", () => {
  groupDetailModal.classList.remove("active")
})
groupDetailModal.addEventListener("click", (e) => {
  if (e.target === groupDetailModal) groupDetailModal.classList.remove("active")
})

// Move tire modal logic
let tireToMove = null

function openMoveTireModal(tireId) {
  tireToMove = tires.find(t => t.id === tireId)
  if (tireToMove) {
    moveTireIdDisplay.textContent = tireToMove.customId || tireToMove.id

    // Dynamically show/hide buttons based on the tire's current status
    storageOptionBtns.forEach(btn => {
      if (btn.dataset.status === tireToMove.status) {
        btn.style.display = 'none'
      } else {
        btn.style.display = 'block'
      }
    })

    moveTireModal.classList.add("active")
    groupDetailModal.classList.remove("active") // Close detail modal if open
  }
}

function closeMoveTireModalHandler() {
  moveTireModal.classList.remove("active")
  tireToMove = null
}

async function moveTire(newStatus) {
  if (tireToMove) {
    try {
      await DatabaseService.updateTire(tireToMove.id, { status: newStatus })
      await loadTires() // Reload and re-render
      closeMoveTireModalHandler()
    } catch (error) {
      console.error('Error moving tire:', error)
      alert('Chyba pri presúvaní pneumatiky.')
    }
  }
}

closeMoveTireModal.addEventListener("click", closeMoveTireModalHandler)
cancelMoveTire.addEventListener("click", closeMoveTireModalHandler)
moveTireModal.addEventListener("click", (e) => {
  if (e.target === moveTireModal) {
    closeMoveTireModalHandler()
  }
})

storageOptionBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const newStatus = btn.dataset.status
    moveTire(newStatus)
  })
})

// Rýchle predvyplnenie údajov z group detailu
globalThis.prefillFromGroup = function(brand, type, size) {
  openModal(); // Open a fresh modal
  document.getElementById("tireBrand").value = decodeURIComponent(brand)
  document.getElementById("tireType").value = decodeURIComponent(type)
  document.getElementById("tireSize").value = decodeURIComponent(size)
  groupDetailModal.classList.remove("active")
  document.getElementById("tireId").focus();
}

// Close modal when clicking outside
tireModal.addEventListener("click", (e) => {
  if (e.target === tireModal) {
    closeModalHandler()
  }
})

// Automatické formátovanie rozmeru
function formatTireSize(e) {
  const input = e.target
  const cursorPosition = input.selectionStart
  const oldValue = input.value
  
  // Ak užívateľ mazal (backspace), nechaj ho mazať
  if (oldValue.length < input.dataset.lastLength) {
    input.dataset.lastLength = oldValue.length
    return
  }
  
  let value = input.value.replace(/[^0-9]/g, '') // Odstráni všetko okrem číslic
  
  // Aplikuje formátovanie podľa vzoru: 111/11 R11.1
  let formattedValue = value
  
  // Po 3 číslach pridaj /
  if (value.length >= 3) {
    formattedValue = value.slice(0, 3) + '/' + value.slice(3)
  }
  
  // Po 5 číslach pridaj R (po /)
  if (value.length >= 5) {
    formattedValue = value.slice(0, 3) + '/' + value.slice(3, 5) + ' R' + value.slice(5)
  }
  
  // Po 7 číslach pridaj . (po R)
  if (value.length >= 7) {
    formattedValue = value.slice(0, 3) + '/' + value.slice(3, 5) + ' R' + value.slice(5, 7) + '.' + value.slice(7)
  }
  
  // Aktualizuje hodnotu v poli
  input.value = formattedValue
  input.dataset.lastLength = formattedValue.length
  
  // Nastaví kurzor na správnu pozíciu
  let newCursorPosition = cursorPosition
  
  // Po 3 číslach pridaj 1 pozíciu pre /
  if (value.length >= 3 && cursorPosition > 3) {
    newCursorPosition++
  }
  
  // Po 5 číslach pridaj 2 pozície pre " R"
  if (value.length >= 5 && cursorPosition > 5) {
    newCursorPosition += 2
  }
  
  // Po 7 číslach pridaj 1 pozíciu pre .
  if (value.length >= 7 && cursorPosition > 7) {
    newCursorPosition++
  }
  
  // Nastaví kurzor
  input.setSelectionRange(newCursorPosition, newCursorPosition)
}

// Dropdown functionality
window.toggleSection = function(sectionId) {
  const section = document.getElementById(sectionId)
  const content = section.querySelector('.collapsible-content')
  const arrow = section.querySelector('.dropdown-arrow')
  
  if (content.style.display === 'none' || content.style.display === '') {
    content.style.display = 'grid'
    arrow.style.transform = 'rotate(180deg)'
  } else {
    content.style.display = 'none'
    arrow.style.transform = 'rotate(0deg)'
  }
}
