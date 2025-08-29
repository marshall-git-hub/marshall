document.addEventListener('DOMContentLoaded', () => {
    const vehicleListContainer = document.getElementById('vehicle-list-container');
    const addNewBtn = document.getElementById('add-new-btn');
    const modal = document.getElementById('add-vehicle-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addVehicleForm = document.getElementById('add-vehicle-form');

    let allVehicles = [];
    let filteredVehicles = [];

    // Modal handling
    addNewBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    addVehicleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const vehicleType = document.getElementById('vehicle-type').value;
        const licensePlate = document.getElementById('license-plate').value;
        const km = parseInt(document.getElementById('km').value, 10);

        try {
            if (vehicleType === 'trucks') {
                await DatabaseService.addTruck({ licensePlate, km, tires: {} });
            } else {
                await DatabaseService.addTrailer({ licensePlate, km, tires: {} });
            }
            modal.style.display = 'none';
            addVehicleForm.reset();
            loadVehicles(); // Reload the list
        } catch (error) {
            console.error('Error adding vehicle:', error);
            alert('Chyba pri pridávaní vozidla.');
        }
    });

    // Function to load all vehicles and create the accordion
    async function loadVehicles() {
        try {
            const trucks = await DatabaseService.getTrucks();
            const trailers = await DatabaseService.getTrailers();
            
            allVehicles = [
                ...trucks.map(t => ({ ...t, type: 'truck' })),
                ...trailers.map(t => ({ ...t, type: 'trailer' }))
            ];

            allVehicles.sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
            filteredVehicles = [...allVehicles];
            renderVehicleAccordion();

        } catch (error) {
            console.error('Error loading vehicles:', error);
            vehicleListContainer.innerHTML = '<p>Chyba pri načítaní vozidiel.</p>';
        }
    }

    // Function to render the vehicle accordion
    function renderVehicleAccordion() {
        vehicleListContainer.innerHTML = '';
        const icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="17" cy="18" r="2"/>
            <circle cx="7" cy="18" r="2"/>
        </svg>`;
        filteredVehicles.forEach(vehicle => {
            const item = document.createElement('div');
            item.className = 'vehicle-accordion-item';
            item.innerHTML = `
                <div class="vehicle-accordion-header">
                    <div class="vehicle-accordion-title">
                        <div class="vehicle-accordion-icon">${icon}</div>
                        <h2>${vehicle.licensePlate}</h2>
                    </div>
                    <div class="vehicle-accordion-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m6 9 6 6 6-6"/>
                        </svg>
                    </div>
                </div>
                <div class="vehicle-accordion-content">
                    <div class="history-container">
                        <div class="history-log">
                            <p>Načítavam históriu...</p>
                        </div>
                    </div>
                </div>
            `;
            vehicleListContainer.appendChild(item);
            const header = item.querySelector('.vehicle-accordion-header');
            header.addEventListener('click', () => toggleAccordionItem(item, vehicle));
        });
    // Search functionality
    document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'search-license-plate') {
            const value = e.target.value.trim().toLowerCase();
            filteredVehicles = allVehicles.filter(v => v.licensePlate.toLowerCase().includes(value));
            renderVehicleAccordion();
        }
    });
    }

    // Function to handle accordion expansion/collapse
    async function toggleAccordionItem(item, vehicle) {
        const isActive = item.classList.contains('active');

        // Close all other items
        document.querySelectorAll('.vehicle-accordion-item').forEach(otherItem => {
            if (otherItem !== item) {
                otherItem.classList.remove('active');
            }
        });

        // Toggle the clicked item
        if (isActive) {
            item.classList.remove('active');
        } else {
            item.classList.add('active');
            await displayHistory(item, vehicle);
        }
    }

    // Function to fetch and display tire change history
    async function displayHistory(item, vehicle) {
        const historyLog = item.querySelector('.history-log');

        try {
            const history = await DatabaseService.getTireChangeHistory(vehicle.id);

            if (history.length === 0) {
                historyLog.innerHTML = '<p>Pre toto vozidlo neexistuje žiadna história zmien.</p>';
            } else {
                const groupedHistory = groupHistory(history);
                renderHistory(historyLog, groupedHistory);
            }

        } catch (error) {
            console.error('Error fetching history:', error);
            historyLog.innerHTML = '<p>Chyba pri načítaní histórie. Skontrolujte, či ste vytvorili potrebný index vo Firebase.</p>';
        }
    }

    // Function to group history entries
    function groupHistory(history) {
        // Group by date and km, then collect all positions for that group
        const grouped = {};
        history.forEach(entry => {
            const datePart = entry.date ? entry.date.substring(0, 10) : '';
            const key = `${datePart}-${entry.vehicleKm}`;
            if (!grouped[key]) {
                grouped[key] = {
                    date: entry.date,
                    vehicleKm: entry.vehicleKm,
                    positions: []
                };
            }
            grouped[key].positions.push({
                position: translatePosition(entry.position),
                removedTire: entry.removedTire,
                installedTire: entry.installedTire
            });
        });
        // Sort positions for each group for consistent display
        return Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Function to render the history log
    function renderHistory(historyLog, groupedHistory) {
        historyLog.innerHTML = '';
        groupedHistory.forEach(group => {
            const groupElement = document.createElement('div');
            groupElement.className = 'history-group';
            groupElement.innerHTML = `
                <div class="history-group-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${new Date(group.date).toLocaleDateString()}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 12c-2 0-4-1-4-3s2-3 4-3 4 1 4 3-2 3-4 3z"></path>
                        <path d="M20 12c0-4.4-3.6-8-8-8s-8 3.6-8 8c0 2 .8 3.8 2.1 5.1l6.9 6.9 6.9-6.9c1.3-1.3 2.1-3.1 2.1-5.1z"></path>
                    </svg>
                    <span>${group.vehicleKm ? group.vehicleKm.toLocaleString('sk-SK') + ' km' : ''}</span>
                </div>
                <div class="history-entries">
                    ${group.positions.map(pos => `
                        <div class="history-entry" data-position="${pos.position}">
                            <div class="history-header">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="10" r="3"></circle>
                                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"></path>
                                </svg>
                                <h3>Pozícia: ${pos.position}</h3>
                            </div>
                            <div class="history-details">
                                <div class="tire-change-card removed">
                                    <div class="tire-change-header">
                                        <span class="dot removed"></span>
                                        <span>Odobratá</span>
                                    </div>
                                    <div class="tire-info">
                                        <div class="info-row"><span class="info-label">ID:</span><span class="info-value">${pos.removedTire?.customId || 'N/A'}</span></div>
                                        <div class="info-row"><span class="info-label">Typ:</span><span class="info-value">${(!pos.removedTire?.brand && !pos.removedTire?.type) ? 'N/A' : `${pos.removedTire?.brand || ''} ${pos.removedTire?.type || ''}`}</span></div>
                                        <div class="info-row"><span class="info-label">KM:</span><span class="info-value">${pos.removedTire?.km !== undefined && pos.removedTire?.km !== null ? pos.removedTire.km.toLocaleString('sk-SK') : 'N/A'}</span></div>
                                        <div class="info-row"><span class="info-label">Stav:</span><span class="info-value">${pos.removedTire?.status || 'N/A'}</span></div>
                                    </div>
                                </div>
                                <div class="change-arrow">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </div>
                                <div class="tire-change-card installed">
                                    <div class="tire-change-header">
                                        <span class="dot installed"></span>
                                        <span>Nainštalovaná</span>
                                    </div>
                                    <div class="tire-info">
                                        <div class="info-row"><span class="info-label">ID:</span><span class="info-value">${pos.installedTire?.customId || 'N/A'}</span></div>
                                        <div class="info-row"><span class="info-label">Typ:</span><span class="info-value">${pos.installedTire?.brand || ''} ${pos.installedTire?.type || ''}</span></div>
                                        <div class="info-row"><span class="info-label">KM:</span><span class="info-value">${pos.installedTire?.km !== undefined && pos.installedTire?.km !== null ? pos.installedTire.km.toLocaleString('sk-SK') : 'N/A'}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            historyLog.appendChild(groupElement);
        });
    }


    function translatePosition(position) {
      const translations = {
        "front-left": "Predné ľavé",
        "front-right": "Predné pravé",
        "rear-left-outer": "Zadné ľavé vonkajšie",
        "rear-left-inner": "Zadné ľavé vnútorné",
        "rear-right-outer": "Zadné pravé vonkajšie",
        "rear-right-inner": "Zadné pravé vnútorné",
        "left-front": "Ľavé predné",
        "left-middle": "Ľavé stredné",
        "left-rear": "Ľavé zadné",
        "right-front": "Pravé predné",
        "right-middle": "Pravé stredné",
        "right-rear": "Pravé zadné"
      };
      return translations[position] || position;
    }

    // Initial load
    loadVehicles();
});
