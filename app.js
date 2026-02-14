/**
 * Frecuencia App Logic
 * Stores data in localStorage under key 'frecuencia_episodes'
 * Data format: Array of objects { id, timestamp, date, time }
 */

const STORAGE_KEY = 'frecuencia_episodes';

// State
// State
let episodes = [];

// DOM Elements Container
let els = {};

function initElements() {
    els = {
        registerBtn: document.getElementById('btn-register'),
        lastTime: document.getElementById('last-time'),
        lastDate: document.getElementById('last-date'),
        timeSince: document.getElementById('time-since'),
        undoBtn: document.getElementById('btn-undo'),
        todayCount: document.getElementById('today-count'),
        currentClock: document.getElementById('current-clock'),
        // totalHistoryMain removed as it doesn't exist in HTML
        weeklyList: document.getElementById('weekly-list-container'),

        // Stats View Elements
        statTotalHistory: document.getElementById('stat-total-history'),
        statDailyAvg: document.getElementById('stat-daily-avg'),
        statIntervalAvg: document.getElementById('stat-interval-avg'),
        statMinInterval: document.getElementById('stat-min-interval'),
        statMaxInterval: document.getElementById('stat-max-interval'),

        // Modals
        confirmModal: document.getElementById('confirm-modal'),
        modalForm: document.querySelector('#confirm-modal form'),

        // Today Card
        todayCountCard: document.querySelector('.row-today-count'),

        dayDetailsModal: document.getElementById('day-details-modal'),
        modalDateTitle: document.getElementById('modal-date-title'),
        dayEpisodesList: document.getElementById('day-episodes-list'),
        btnCloseModal: document.getElementById('btn-close-modal'),

        editTimeModal: document.getElementById('edit-time-modal'),
        editTimeForm: document.querySelector('#edit-time-modal form'),
        editTimeInput: document.getElementById('edit-time-input'),
        editNotesInput: document.getElementById('edit-notes-input'),

        // Manual Entry Modal
        manualEntryModal: document.getElementById('manual-entry-modal'),
        manualEntryForm: document.querySelector('#manual-entry-modal form'),
        manualDateInput: document.getElementById('manual-date'),
        manualTimeInput: document.getElementById('manual-time'),
        manualNotesInput: document.getElementById('manual-notes'),
        btnManualEntry: document.getElementById('btn-manual-entry'),

        navBtns: document.querySelectorAll('.nav-btn'),
        views: document.querySelectorAll('.view')
    };

    // Debug: Check for missing critical elements
    for (const [key, element] of Object.entries(els)) {
        if (!element && key !== 'totalHistoryMain') {
            console.warn(`DOM Element not found: ${key}`);
        }
    }
}

let currentEditingId = null; // Track which episode is being edited

// --- Initialization ---
// --- Initialization ---
// --- Initialization ---
function init() {
    try {
        console.log("Initializing Frecuencia...");
        initElements(); // Initialize DOM elements cache
        loadData();
        console.log("Loaded episodes:", episodes.length);

        setupEventListeners();
        renderDashboard();
        renderWeeklyStats();

        // Setup interval to update "time since" every minute
        setInterval(updateTimeSince, 60000);

        startClock(); // Start the clock safely


        // Debug: Show data count in console/alert if requested
        // console.log("Episodes data:", episodes);
    } catch (error) {
        console.error("Initialization error:", error);
        alert("Error al iniciar: " + error.message);
    }
}

// Ensure DOM is ready before running init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Start independent systems
// Real-time clock - Runs immediately and independently of data loading
function startClock() {
    updateClock(); // Initial call
    setInterval(updateClock, 1000);
}

function updateClock() {
    try {
        const clockEl = document.getElementById('current-clock');
        if (clockEl) {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            // Using innerHTML to separate the colon for styling
            clockEl.innerHTML = `${h}<span class="blink">:</span>${m}`;
        }
    } catch (e) {
        console.error("Clock update error:", e);
    }
}

// --- Data Layer ---
function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            episodes = JSON.parse(raw);
            // Sort by timestamp desc just in case
            episodes.sort((a, b) => b.timestamp - a.timestamp);
        } catch (e) {
            console.error('Data corrupted, resetting', e);
            episodes = [];
        }
    }
}

function saveData() {
    recalculateIntervals();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(episodes));
    renderDashboard();
}

function recalculateIntervals() {
    // Ensure sorted DESC
    episodes.sort((a, b) => b.timestamp - a.timestamp);

    for (let i = 0; i < episodes.length; i++) {
        if (i < episodes.length - 1) {
            const current = episodes[i];
            const prev = episodes[i + 1];
            const diffMs = current.timestamp - prev.timestamp;
            current.interval = Math.floor(diffMs / 60000); // Minutes
        } else {
            // Oldest episode has no previous
            episodes[i].interval = null;
        }
    }
}

function addEpisode() {
    const now = new Date();
    const episode = {
        id: generateId(),
        timestamp: now.getTime(),
        date: formatDate(now), // YYYY-MM-DD
        time: formatTime(now),  // HH:mm
        interval: null, // Calculated/Updated dynamically
        notes: "" // Optional notes
    };

    // Add to beginning of array
    episodes.unshift(episode);

    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(50);

    saveData();
}

function removeLastEpisode() {
    if (episodes.length === 0) return;
    episodes.shift(); // Remove first element (newest)
    saveData();
}

// --- Render Logic ---
function renderDashboard() {
    console.log("Rendering Dashboard. Episodes:", episodes.length);

    // Safety: ensure critical elements are selected directly if els is missing/stale
    const lastTimeEl = document.getElementById('last-time');
    const lastDateEl = document.getElementById('last-date');
    const undoBtnEl = document.getElementById('btn-undo');
    const todayCountEl = document.getElementById('today-count');
    const timeSinceEl = document.getElementById('time-since');

    // Top Section - Always render basic structure if empty
    if (episodes.length === 0) {
        // Empty State
        if (lastTimeEl) lastTimeEl.textContent = "--:--";
        if (lastDateEl) lastDateEl.textContent = "--/--/----";
        if (todayCountEl) todayCountEl.textContent = "0";
        if (undoBtnEl) undoBtnEl.style.display = "none";
        if (timeSinceEl) timeSinceEl.textContent = "Primer episodio";

        renderWeeklyStats();
        return;
    }

    const last = episodes[0];

    // Top Section
    if (lastTimeEl) lastTimeEl.textContent = last.time;
    if (lastDateEl) lastDateEl.textContent = new Date(last.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Undo visibility
    if (undoBtnEl) undoBtnEl.style.display = "inline-flex";

    // Today Count
    const todayStr = formatDate(new Date());
    // Ensure we are comparing apples to apples (string YYYY-MM-DD)
    const todayCount = episodes.filter(e => e.date === todayStr).length;

    if (todayCountEl) todayCountEl.textContent = todayCount;

    // Time Since
    updateTimeSince();

    // Middle Stats: Total History
    // if (els.totalHistoryMain) els.totalHistoryMain.textContent = episodes.length; // Removed as element is missing from HTML

    renderWeeklyStats();
}

function updateTimeSince() {
    if (episodes.length === 0) return;

    // Fetch directly to ensure we have the element
    const timeSinceEl = document.getElementById('time-since');
    if (!timeSinceEl) return;

    const last = episodes[0];
    const diffMs = Date.now() - last.timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;

    timeSinceEl.textContent = `${h} h ${m} min`;
}

function renderWeeklyStats() {
    console.log("Rendering Weekly Stats...");

    const container = document.getElementById('weekly-list-container');
    if (!container) {
        console.error("Weekly list container not found!");
        return;
    }

    try {
        // Calculate last 3 days stats
        const stats = calculateWeeklyStats();
        console.log("Stats:", stats);

        container.innerHTML = '';

        // Update specific check
        if (!stats || !stats.days || stats.days.length === 0) {
            container.innerHTML = '<li style="padding:1rem; text-align:center;"><i>No hay datos para mostrar</i></li>';
            return;
        }

        // Show all days, do not filter.
        stats.days.forEach(dayStat => {
            const li = document.createElement('li');
            li.className = 'weekly-item';

            // Force explicit styles if CSS fails (Single row layout)
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '12px 10px'; // Slightly more padding
            li.style.borderBottom = '1px solid #f1f5f9';
            li.style.color = '#333';
            li.style.fontSize = '0.95rem';

            let intervalText = '';
            if (dayStat.count > 1 && dayStat.avgInterval !== null) {
                intervalText = `${Math.floor(dayStat.avgInterval / 60)}h ${dayStat.avgInterval % 60}m`;
            } else if (dayStat.count > 0) {
                intervalText = '-';
            }

            // Fix date formatting for display: dd/mm/yyyy
            const [y, m, d] = dayStat.date.split('-').map(Number);
            // Construct date string manually to avoid timezone shifts
            const dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

            li.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; white-space:nowrap;">
                    <span style="font-weight:600; min-width:80px; font-size:0.9rem;">${dateStr}</span>
                    <span style="color:#0f172a; font-weight:700; font-size:0.9rem; margin-left: auto; margin-right: 15px;">${dayStat.count} eps</span>
                    <span style="color:#64748b; font-size:0.85rem; min-width:50px; text-align:right; margin-right: 10px;">${intervalText}</span>
                    <i data-lucide="chevron-right" width="16" height="16" style="color:#cbd5e1;"></i>
                </div>
            `;
            // Make list item clickable to open details
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => openDayDetails(dayStat.date));

            container.appendChild(li);
        });

        // Re-run icons for the new chevrons
        lucide.createIcons();
    } catch (e) {
        console.error("Error rendering weekly stats:", e);
        container.innerHTML = `<li style="color:red">Error: ${e.message}</li>`;
    }
}

// --- Date Details & Editing ---
function openDayDetails(dateStr) {
    const d = new Date(dateStr);
    els.modalDateTitle.textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    // Render list for this day
    const dayEpisodes = episodes.filter(e => e.date === dateStr);
    els.dayEpisodesList.innerHTML = '';

    dayEpisodes.forEach(ep => {
        const row = document.createElement('li');
        row.className = 'episode-row';

        let notesIndicator = ep.notes ? `<i data-lucide="file-text" width="14" height="14" style="margin-left:8px; color:var(--color-text-muted);"></i>` : '';

        row.innerHTML = `
            <div style="display:flex; align-items:center;">
                <span class="episode-time">${ep.time}</span>
                ${notesIndicator}
            </div>
            <div class="row-actions-group">
                <button class="btn-icon edit" aria-label="Editar">
                    <i data-lucide="edit-2" width="18" height="18"></i>
                </button>
                <button class="btn-icon delete" aria-label="Eliminar episode">
                    <i data-lucide="trash-2" width="18" height="18"></i>
                </button>
            </div>
        `;

        // Edit click
        const editBtn = row.querySelector('.btn-icon.edit');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openEditTime(ep.id, ep.time, ep.notes);
        });

        // Delete click
        // ... (delete logic)
        const deleteBtn = row.querySelector('.btn-icon.delete');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Eliminar este episodio?')) {
                deleteEpisode(ep.id);
            }
        });

        els.dayEpisodesList.appendChild(row);
    });

    lucide.createIcons();
    els.dayDetailsModal.showModal();
}

function openEditTime(id, currentTime, currentNotes) {
    currentEditingId = id;
    els.editTimeInput.value = currentTime;
    els.editNotesInput.value = currentNotes || "";
    els.editTimeModal.showModal();
}

function saveEpisodeTime(newTime, newNotes) {
    if (!currentEditingId) return;

    const epIndex = episodes.findIndex(e => e.id === currentEditingId);
    if (epIndex === -1) return;

    const ep = episodes[epIndex];

    // Conserve original date, update time components
    // ...
    const [year, month, day] = ep.date.split('-').map(Number);
    const [hours, minutes] = newTime.split(':').map(Number);

    const newDateObj = new Date(year, month - 1, day, hours, minutes);

    // Update fields
    ep.timestamp = newDateObj.getTime();
    ep.time = newTime;
    ep.notes = newNotes;

    // Resort episodes as time might have changed order
    episodes.sort((a, b) => b.timestamp - a.timestamp);

    saveData();

    // Refresh UI
    els.editTimeModal.close();

    // Refresh Detail Modal if open (it is)
    openDayDetails(ep.date);

    // Dashboard will auto-refresh via saveData -> renderDashboard
}

function deleteEpisode(id) {
    // ... (unchanged)
    episodes = episodes.filter(e => e.id !== id);
    saveData();

    // Refresh UI if modal is open
    const openDateTitle = els.modalDateTitle.textContent;
    if (openDateTitle && els.dayDetailsModal.open) {
        els.dayDetailsModal.close();
    }

    renderDashboard();
}

function addManualEpisode(dateStr, timeStr, notesStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Note: Month is 0-indexed in Date constructor
    const newDateObj = new Date(year, month - 1, day, hours, minutes);

    const episode = {
        id: generateId(),
        timestamp: newDateObj.getTime(),
        date: dateStr,
        time: timeStr,
        interval: null,
        notes: notesStr || ""
    };

    episodes.push(episode);
    episodes.sort((a, b) => b.timestamp - a.timestamp);

    saveData();
    els.manualEntryModal.close();

    // Provide visual feedback? User will see it in stats or list if within range
    renderDashboard();
}

// --- Export & Backup Logic ---
function exportCSV() {
    if (episodes.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Fecha,Hora,Intervalo(min),Notas\n";

    episodes.forEach(e => {
        const row = [
            e.id,
            e.date,
            e.time,
            e.interval || "",
            `"${(e.notes || "").replace(/"/g, '""')}"` // Escape quotes in notes
        ].join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `frecuencia_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportJSON() {
    if (episodes.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }
    const dataStr = JSON.stringify(episodes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", `frecuencia_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error("Formato inválido");
            
            if (confirm(`Se han encontrado ${imported.length} registros. ¿Deseas reemplazarlos por los actuales?`)) {
                episodes = imported;
                saveData();
                alert("Datos restaurados correctamente.");
                location.reload(); // Refresh to ensure everything is clean
            }
        } catch (err) {
            alert("Error al importar el archivo: " + err.message);
        }
    };
    reader.readAsText(file);
}


// --- Event Listeners ---
// --- Event Listeners ---
function setupEventListeners() {
    // 1. Register Button
    const registerBtn = document.getElementById('btn-register');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            registerBtn.style.transform = 'scale(0.95)';
            setTimeout(() => registerBtn.style.transform = '', 100);
            addEpisode();
        });
    } else {
        console.error("Register button not found!");
    }

    // 2. Undo Button
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            const confirmModal = document.getElementById('confirm-modal');
            if (confirmModal) confirmModal.showModal();
        });
    }

    // 3. Modals & Forms
    const modalForm = document.querySelector('#confirm-modal form');
    if (modalForm) {
        modalForm.addEventListener('submit', (e) => {
            const val = e.submitter.value;
            if (val === 'confirm') {
                removeLastEpisode();
            }
        });
    }

    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            const dayDetailsModal = document.getElementById('day-details-modal');
            if (dayDetailsModal) dayDetailsModal.close();
        });
    }

    const editTimeForm = document.querySelector('#edit-time-modal form');
    if (editTimeForm) {
        editTimeForm.addEventListener('submit', (e) => {
            const val = e.submitter.value;
            if (val === 'save') {
                const editTimeInput = document.getElementById('edit-time-input');
                const editNotesInput = document.getElementById('edit-notes-input');
                if (editTimeInput) saveEpisodeTime(editTimeInput.value, editNotesInput ? editNotesInput.value : "");
            }
        });
    }

    const todayCountCard = document.querySelector('.row-today-count');
    if (todayCountCard) {
        todayCountCard.addEventListener('click', () => {
            const todayStr = formatDate(new Date());
            openDayDetails(todayStr);
        });
    }

    const btnManualEntry = document.getElementById('btn-manual-entry');
    if (btnManualEntry) {
        btnManualEntry.addEventListener('click', () => {
            const now = new Date();
            const manualDateInput = document.getElementById('manual-date');
            const manualTimeInput = document.getElementById('manual-time');
            const manualNotesInput = document.getElementById('manual-notes');
            const manualEntryModal = document.getElementById('manual-entry-modal');

            if (manualDateInput) manualDateInput.value = formatDate(now);
            if (manualTimeInput) manualTimeInput.value = formatTime(now);
            if (manualNotesInput) manualNotesInput.value = "";
            if (manualEntryModal) manualEntryModal.showModal();
        });
    }

    const manualEntryForm = document.querySelector('#manual-entry-modal form');
    if (manualEntryForm) {
        manualEntryForm.addEventListener('submit', (e) => {
            const val = e.submitter.value;
            if (val === 'save') {
                const d = document.getElementById('manual-date').value;
                const t = document.getElementById('manual-time').value;
                const n = document.getElementById('manual-notes').value;
                addManualEpisode(d, t, n);
            }
        });
    }

    // Data Management Listeners
    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.addEventListener('click', exportCSV);

    const btnBackup = document.getElementById('btn-backup-json');
    if (btnBackup) btnBackup.addEventListener('click', exportJSON);

    const btnRestore = document.getElementById('btn-restore-json');
    const inputRestore = document.getElementById('input-restore');
    if (btnRestore && inputRestore) {
        btnRestore.addEventListener('click', () => inputRestore.click());
        inputRestore.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importJSON(e.target.files[0]);
            }
        });
    }

    // ... nav btns
    const navBtns = document.querySelectorAll('.nav-btn');
    if (navBtns.length > 0) {
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // Get target BEFORE modifying classes
                const targetId = btn.getAttribute('data-target'); // use getAttribute for safety

                console.log("Nav Click:", targetId);

                // 1. Toggle Buttons Visuals
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 2. Toggle Views
                const dashboard = document.getElementById('dashboard');
                const stats = document.getElementById('stats');

                if (targetId === 'dashboard') {
                    if (dashboard) {
                        dashboard.style.display = 'flex';
                        dashboard.classList.add('active');
                    }
                    if (stats) {
                        stats.style.display = 'none';
                        stats.classList.remove('active');
                    }
                    renderDashboard();
                } else if (targetId === 'stats') {
                    if (dashboard) {
                        dashboard.style.display = 'none';
                        dashboard.classList.remove('active');
                    }
                    if (stats) {
                        stats.style.display = 'flex';
                        stats.classList.add('active');
                    }
                    // Defer chart rendering
                    setTimeout(() => renderCharts(), 50);
                }
            });
        });
    } else {
        console.error("No navigation buttons found!");
    }
}

// --- Chart.js Placeholder ---
// --- Chart.js Placeholder ---
let chartInstance = null;
function renderCharts() {
    console.log("Rendering Charts...");
    const canvas = document.getElementById('historyChart');

    if (!canvas) {
        console.error("Canvas element 'historyChart' not found");
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error("Chart.js library not loaded");
        // Optional: show a fallback message on the canvas parent or alert
        const container = canvas.parentElement;
        if (container) container.innerHTML = '<p style="text-align:center; padding:20px;">Error: Librería de gráficos no cargada.</p>';
        return;
    }

    try {
        const ctx = canvas.getContext('2d');

        // Prepare data: Last 7 days (simplified for better mobile view)
        const labels = [];
        const data = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const str = formatDate(d);
            labels.push(d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
            data.push(episodes.filter(e => e.date === str).length);
        }

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Episodios',
                    data: data,
                    backgroundColor: '#0284c7',
                    borderRadius: 4,
                    barThickness: 20 // Fixed width for cleaner look
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0, stepSize: 1 },
                        grid: { display: true, drawBorder: false }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: '#1e293b',
                        padding: 10,
                        cornerRadius: 4
                    }
                },
                animation: {
                    duration: 500
                }
            }
        });

    } catch (e) {
        console.error("Error creating chart:", e);
        // Fallback: simple text message in canvas container
        const container = canvas.parentElement;
        if (container) container.innerHTML = `<p style="text-align:center; color:#666; font-size:0.9rem;">Gráfico no disponible (${e.message})</p>`;
    }

    // Always calculate stats, even if chart fails
    calculateDetailedStats();
}

function calculateDetailedStats() {
    console.log("Calculating Detailed Stats...");
    if (episodes.length === 0) return;

    const statTotalHistory = document.getElementById('stat-total-history');
    const statDailyAvg = document.getElementById('stat-daily-avg');
    const statIntervalAvg = document.getElementById('stat-interval-avg');
    const statMinInterval = document.getElementById('stat-min-interval');
    const statMaxInterval = document.getElementById('stat-max-interval');

    // 0. Total History
    if (statTotalHistory) statTotalHistory.textContent = episodes.length;

    // 1. Daily Average
    const first = episodes[episodes.length - 1]; // sorted DESC, so last is first
    const firstDate = new Date(first.timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - firstDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const avgDaily = (episodes.length / diffDays).toFixed(1);
    if (statDailyAvg) statDailyAvg.textContent = avgDaily;

    // 2. Interval Stats (Global)
    let intervals = [];
    for (let i = 0; i < episodes.length - 1; i++) {
        const diff = episodes[i].timestamp - episodes[i + 1].timestamp;
        intervals.push(diff / 60000); // minutes
    }

    if (intervals.length > 0) {
        const total = intervals.reduce((a, b) => a + b, 0);
        const avg = Math.floor(total / intervals.length);
        const min = Math.floor(Math.min(...intervals));
        const max = Math.floor(Math.max(...intervals));

        if (statIntervalAvg) statIntervalAvg.textContent = `${Math.floor(avg / 60)}h ${avg % 60}m`;
        if (statMinInterval) statMinInterval.textContent = `${Math.floor(min / 60)}h ${min % 60}m`;
        if (statMaxInterval) statMaxInterval.textContent = `${Math.floor(max / 60)}h ${max % 60}m`;
    } else {
        if (statIntervalAvg) statIntervalAvg.textContent = "--";
        if (statMinInterval) statMinInterval.textContent = "--";
        if (statMaxInterval) statMaxInterval.textContent = "--";
    }
}

// Start
// --- Calculation Business Logic ---
function calculateWeeklyStats() {
    // Get last 3 days dates
    const days = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(formatDate(d));
    }

    const result = {
        days: [],
        allIntervals: []
    };

    days.forEach(dateStr => {
        // Get episodes for this day, sorted ASCENDING for interval calc
        const daysEpisodes = episodes
            .filter(e => e.date === dateStr)
            .sort((a, b) => a.timestamp - b.timestamp);

        // Filter for specific time rule: 08:00 - 23:59
        // 08:00 is 8*60 = 480 mins from midnight
        const validEpisodes = daysEpisodes.filter(e => {
            const d = new Date(e.timestamp);
            const minutesFromMidnight = d.getHours() * 60 + d.getMinutes();
            return minutesFromMidnight >= 480; // >= 08:00
        });

        // Calculate intervals between VALID consecutive episodes
        let intervals = [];
        for (let i = 1; i < validEpisodes.length; i++) {
            const diffMs = validEpisodes[i].timestamp - validEpisodes[i - 1].timestamp;
            intervals.push(Math.floor(diffMs / 60000));
        }

        const dailyAvg = intervals.length > 0
            ? Math.floor(intervals.reduce((a, b) => a + b, 0) / intervals.length)
            : null;

        result.allIntervals.push(...intervals);
        result.days.push({
            date: dateStr,
            count: daysEpisodes.length, // Display total count
            avgInterval: dailyAvg
        });
    });

    return result;
}

// --- Helpers ---
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatTime(date) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Start
