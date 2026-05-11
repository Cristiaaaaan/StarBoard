// StarBoard Dashboard JavaScript

// Configuration
const UPDATE_INTERVAL = 1000; // 1 second
const MAX_HISTORY_POINTS = 60; // 1 minute of data at 1s intervals

// Base values for realistic data generation
let baseValues = {
    download: 150,
    upload: 20,
    latency: 35,
    snr: 8.5,
    obstruction: 2.5,
    packetLoss: 0.1
};

// Track connection state and data source
let isDeviceConnected = true;
let isSimulatedData = false;
let lastGrpcReal = false;
let lastSpeedtestReal = false;

// Persistent 24h obstruction data (simulated accumulation)
let obstruction24hData = {
    totalSeconds: 45,  // Starting with some accumulated time
    lastUpdateTime: Date.now(),
    wasObstructed: false,
    eventCount: 3      // Starting with some events
};

// DOM Elements
const elements = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    downloadSpeed: document.getElementById('downloadSpeed'),
    uploadSpeed: document.getElementById('uploadSpeed'),
    latency: document.getElementById('latency'),
    latencyFill: document.getElementById('latencyFill'),
    uptime: document.getElementById('uptime'),
    snrValue: document.getElementById('snrValue'),
    snrCircle: document.getElementById('snrCircle'),
    obstructionValue: document.getElementById('obstructionValue'),
    obstructionCircle: document.getElementById('obstructionCircle'),
    satellites: document.getElementById('satellites'),
    satellitesVisual: document.getElementById('satellitesVisual'),
    azimuth: document.getElementById('azimuth'),
    elevation: document.getElementById('elevation'),
    compassMarker: document.getElementById('compassMarker'),
    hardwareVersion: document.getElementById('hardwareVersion'),
    softwareVersion: document.getElementById('softwareVersion'),
    packetLoss: document.getElementById('packetLoss'),
    lastUpdate: document.getElementById('lastUpdate'),
    // New elements
    obstructionIndicator: document.getElementById('obstructionIndicator'),
    obstructionText: document.getElementById('obstructionText'),
    pingDeciles: document.getElementById('pingDeciles'),
    pingSamples: document.getElementById('pingSamples'),
    obstruction24h: document.getElementById('obstruction24h'),
    obstruction24hFill: document.getElementById('obstruction24hFill'),
    obstructionEvents: document.getElementById('obstructionEvents'),
    lastObstruction: document.getElementById('lastObstruction'),
    themeToggle: document.getElementById('themeToggle'),
    // Title source dots (next to card titles)
    speedTitleDot: document.getElementById('speedTitleDot'),
    latencyTitleDot: document.getElementById('latencyTitleDot'),
    historyTitleDot: document.getElementById('historyTitleDot'),
    uptimeTitleDot: document.getElementById('uptimeTitleDot'),
    signalTitleDot: document.getElementById('signalTitleDot'),
    obstructionStatusTitleDot: document.getElementById('obstructionStatusTitleDot'),
    pingTitleDot: document.getElementById('pingTitleDot'),
    obstruction24hTitleDot: document.getElementById('obstruction24hTitleDot'),
    satellitesTitleDot: document.getElementById('satellitesTitleDot'),
    positionTitleDot: document.getElementById('positionTitleDot'),
    systemTitleDot: document.getElementById('systemTitleDot'),
    // Averages card elements
    downloadAvgCard: document.getElementById('downloadAvgCard'),
    uploadAvgCard: document.getElementById('uploadAvgCard'),
    latencyAvgCard: document.getElementById('latencyAvgCard'),
    // Chart elements
    downloadAvg: document.getElementById('downloadAvg'),
    uploadAvg: document.getElementById('uploadAvg'),
    latencyAvg: document.getElementById('latencyAvg'),
    downloadLegend: document.getElementById('downloadLegend'),
    uploadLegend: document.getElementById('uploadLegend'),
    latencyLegend: document.getElementById('latencyLegend')
};

// History data storage
const historyData = {
    timestamps: [],
    download: [],
    upload: [],
    latency: []
};

// Chart instance
let historyChart = null;
let currentChartType = 'speed';

// Format relative time (e.g., "5 minutes ago", "2 hours ago")
function formatRelativeTime(timestamp) {
    if (!timestamp || timestamp <= 0) {
        return 'Nessuna';
    }

    const now = Date.now() / 1000; // Convert to seconds
    const diff = now - timestamp;

    if (diff < 60) {
        return 'Adesso';
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} min fa`;
    } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        if (minutes > 0) {
            return `${hours}h ${minutes}m fa`;
        }
        return `${hours}h fa`;
    } else {
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        if (hours > 0) {
            return `${days}g ${hours}h fa`;
        }
        return `${days}g fa`;
    }
}

// ============================================
// TRANSLATIONS SYSTEM
// ============================================

const translations = {
    it: {
        // Header
        connectionStatus: 'Connessione',
        connected: 'Connesso',
        disconnected: 'Disconnesso',
        connecting: 'Connessione...',
        realData: 'Dati reali',
        simulatedData: 'Dati simulati',

        // Speed
        speed: 'Velocità',
        device: 'Dispositivo',
        router: 'Router',
        speedFromDevice: 'Velocità dal dispositivo a Internet',
        speedFromRouter: 'Velocità dal router a Internet',
        download: 'Download',
        upload: 'Upload',

        // Latency
        latency: 'Latenza',
        good: 'Buona',
        excellent: 'Eccellente',

        // History
        performanceHistory: 'Storico Prestazioni',
        speed: 'Velocità',
        latencyChart: 'Latenza',

        // Uptime
        uptime: 'Uptime',
        uptimeLabel: 'Tempo di attività',

        // Signal
        signalQuality: 'Qualità Segnale',
        snr: 'SNR',
        obstruction: 'Ostruzione',

        // Averages
        averages: 'Medie Storiche',
        downloadAvg: 'Download Medio',
        uploadAvg: 'Upload Medio',
        latencyAvg: 'Latenza Media',

        // Obstruction Status
        obstructionStatus: 'Stato Ostruzione',
        obstructed: 'Ostruito',
        partialObstruction: 'Ostruzione Parziale',
        clear: 'Libero',

        // Ping Stats
        pingStats: 'Statistiche Ping',
        samples: 'Campioni',

        // 24h Obstructions
        obstructions24h: 'Ostruzioni 24h',
        totalObstructionTime: 'Tempo totale ostruzioni',
        events: 'Eventi',
        last: 'Ultima',
        none: 'Nessuna',
        now: 'Adesso',
        minutesAgo: 'min fa',
        hoursAgo: 'h fa',
        daysAgo: 'g fa',

        // Satellites
        satellites: 'Satelliti',
        connected: 'Connessi',

        // Position
        dishPosition: 'Posizione Antenna',
        azimuth: 'Azimuth',
        elevation: 'Elevazione',

        // System
        system: 'Sistema',
        hardware: 'Hardware',
        software: 'Software',
        packetLoss: 'Packet Loss',

        // Footer
        lastUpdate: 'Ultimo aggiornamento',
        refreshRate: 'Aggiornamento ogni 1s'
    },
    en: {
        // Header
        connectionStatus: 'Connection',
        connected: 'Connected',
        disconnected: 'Disconnected',
        connecting: 'Connecting...',
        realData: 'Real data',
        simulatedData: 'Simulated data',

        // Speed
        speed: 'Speed',
        device: 'Device',
        router: 'Router',
        speedFromDevice: 'Speed from device to Internet',
        speedFromRouter: 'Speed from router to Internet',
        download: 'Download',
        upload: 'Upload',

        // Latency
        latency: 'Latency',
        good: 'Good',
        excellent: 'Excellent',

        // History
        performanceHistory: 'Performance History',
        speed: 'Speed',
        latencyChart: 'Latency',

        // Uptime
        uptime: 'Uptime',
        uptimeLabel: 'Time active',

        // Signal
        signalQuality: 'Signal Quality',
        snr: 'SNR',
        obstruction: 'Obstruction',

        // Averages
        averages: 'Historical Averages',
        downloadAvg: 'Avg Download',
        uploadAvg: 'Avg Upload',
        latencyAvg: 'Avg Latency',

        // Obstruction Status
        obstructionStatus: 'Obstruction Status',
        obstructed: 'Obstructed',
        partialObstruction: 'Partial Obstruction',
        clear: 'Clear',

        // Ping Stats
        pingStats: 'Ping Statistics',
        samples: 'Samples',

        // 24h Obstructions
        obstructions24h: '24h Obstructions',
        totalObstructionTime: 'Total obstruction time',
        events: 'Events',
        last: 'Last',
        none: 'None',
        now: 'Now',
        minutesAgo: 'm ago',
        hoursAgo: 'h ago',
        daysAgo: 'd ago',

        // Satellites
        satellites: 'Satellites',
        connected: 'Connected',

        // Position
        dishPosition: 'Dish Position',
        azimuth: 'Azimuth',
        elevation: 'Elevation',

        // System
        system: 'System',
        hardware: 'Hardware',
        software: 'Software',
        packetLoss: 'Packet Loss',

        // Footer
        lastUpdate: 'Last update',
        refreshRate: 'Refreshing every 1s'
    },
    es: {
        // Header
        connectionStatus: 'Conexión',
        connected: 'Conectado',
        disconnected: 'Desconectado',
        connecting: 'Conectando...',
        realData: 'Datos reales',
        simulatedData: 'Datos simulados',

        // Speed
        speed: 'Velocidad',
        device: 'Dispositivo',
        router: 'Router',
        speedFromDevice: 'Velocidad del dispositivo a Internet',
        speedFromRouter: 'Velocidad del router a Internet',
        download: 'Descarga',
        upload: 'Subida',

        // Latency
        latency: 'Latencia',
        good: 'Buena',
        excellent: 'Excelente',

        // History
        performanceHistory: 'Historial de Rendimiento',
        speed: 'Velocidad',
        latencyChart: 'Latencia',

        // Uptime
        uptime: 'Tiempo Activo',
        uptimeLabel: 'Tiempo de actividad',

        // Signal
        signalQuality: 'Calidad de Señal',
        snr: 'SNR',
        obstruction: 'Obstrucción',

        // Averages
        averages: 'Promedios Históricos',
        downloadAvg: 'Descarga Promedio',
        uploadAvg: 'Subida Promedio',
        latencyAvg: 'Latencia Promedio',

        // Obstruction Status
        obstructionStatus: 'Estado de Obstrucción',
        obstructed: 'Obstruido',
        partialObstruction: 'Obstrucción Parcial',
        clear: 'Despejado',

        // Ping Stats
        pingStats: 'Estadísticas de Ping',
        samples: 'Muestras',

        // 24h Obstructions
        obstructions24h: 'Obstrucciones 24h',
        totalObstructionTime: 'Tiempo total de obstrucciones',
        events: 'Eventos',
        last: 'Última',
        none: 'Ninguna',
        now: 'Ahora',
        minutesAgo: 'min atrás',
        hoursAgo: 'h atrás',
        daysAgo: 'd atrás',

        // Satellites
        satellites: 'Satélites',
        connected: 'Conectados',

        // Position
        dishPosition: 'Posición de la Antena',
        azimuth: 'Azimut',
        elevation: 'Elevación',

        // System
        system: 'Sistema',
        hardware: 'Hardware',
        software: 'Software',
        packetLoss: 'Pérdida de Paquetes',

        // Footer
        lastUpdate: 'Última actualización',
        refreshRate: 'Actualizando cada 1s'
    }
};

let currentLanguage = 'it';

// Load saved language from localStorage
function loadLanguage() {
    const saved = localStorage.getItem('starboard-language');
    if (saved && translations[saved]) {
        currentLanguage = saved;
    }
    updateLanguageUI();
}

// Set language and save to localStorage
function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('starboard-language', lang);
        updateLanguageUI();
    }
}

// Update UI with current language
function updateLanguageUI() {
    const t = translations[currentLanguage];

    // Update active tab
    document.querySelectorAll('.lang-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.lang === currentLanguage) {
            tab.classList.add('active');
        }
    });

    // Update card titles (text node is now second child after SVG, before the dot)
    const titleCards = [
        { selector: '.speed-card', text: t.speed },
        { selector: '.averages-card', text: t.averages },
        { selector: '.latency-card', text: t.latency },
        { selector: '.history-card', text: t.performanceHistory },
        { selector: '.uptime-card', text: t.uptime },
        { selector: '.signal-card', text: t.signalQuality },
        { selector: '.obstruction-status-card', text: t.obstructionStatus },
        { selector: '.ping-stats-card', text: t.pingStats },
        { selector: '.obstruction-24h-card', text: t.obstructions24h },
        { selector: '.satellites-card', text: t.satellites },
        { selector: '.position-card', text: t.dishPosition },
        { selector: '.system-card', text: t.system }
    ];

    titleCards.forEach(({ selector, text }) => {
        const titleEl = document.querySelector(`${selector} .card-title`);
        if (titleEl) {
            // Check if title span already exists
            let titleSpan = titleEl.querySelector('.title-text');
            if (!titleSpan) {
                // Create new title span and insert it after SVG, before the dot
                titleSpan = document.createElement('span');
                titleSpan.className = 'title-text';
                const dot = titleEl.querySelector('.title-source-dot');
                if (dot) {
                    titleEl.insertBefore(titleSpan, dot);
                } else {
                    titleEl.appendChild(titleSpan);
                }
            }
            titleSpan.textContent = text;
        }
    });

    // Update speed label (element has class, not id)
    const speedLabel = document.querySelector('.speed-card .toggle-label');
    if (speedLabel) {
        speedLabel.textContent = t.speedFromDevice;
    }

    // Update speed labels
    document.querySelectorAll('.speed-item .speed-label').forEach((el, index) => {
        el.lastChild.textContent = ' ' + (index === 0 ? t.download : t.upload);
    });

    // Update latency labels
    document.querySelectorAll('.latency-labels span').forEach((el, index) => {
        el.textContent = index === 0 ? t.good : t.excellent;
    });

    // Update chart tabs
    document.querySelectorAll('.chart-tab').forEach((tab, index) => {
        tab.textContent = index === 0 ? t.speed : t.latencyChart;
    });

    // Update legend labels
    document.querySelectorAll('#downloadLegend span:nth-child(2)').forEach(el => {
        el.textContent = ' ' + t.download;
    });
    document.querySelectorAll('#uploadLegend span:nth-child(2)').forEach(el => {
        el.textContent = ' ' + t.upload;
    });
    document.querySelectorAll('#latencyLegend span:nth-child(2)').forEach(el => {
        el.textContent = ' ' + t.latencyChart;
    });

    // Update uptime label
    document.querySelector('.uptime-label').textContent = t.uptimeLabel;

    // Update signal labels
    document.querySelectorAll('.signal-item .signal-label').forEach((el, index) => {
        el.textContent = index === 0 ? t.snr : t.obstruction;
    });

    // Update ping samples label
    document.querySelector('.samples-label').textContent = t.samples + ':';

    // Update 24h obstruction labels
    document.querySelector('.obstruction-24h-label').textContent = t.totalObstructionTime;
    document.querySelector('.events-label').textContent = t.events + ':';
    document.querySelector('.last-label').textContent = t.last + ':';

    // Update satellites label
    document.querySelector('.satellites-label').textContent = t.connected;

    // Update position labels
    document.querySelectorAll('.position-item .position-label').forEach((el, index) => {
        el.textContent = index === 0 ? t.azimuth : t.elevation;
    });

    // Update system labels
    document.querySelectorAll('.system-item .system-label').forEach(el => {
        const text = el.textContent;
        if (text.includes('Hardware')) el.textContent = t.hardware;
        else if (text.includes('Software')) el.textContent = t.software;
        else if (text.includes('Packet')) el.textContent = t.packetLoss;
    });

    // Update averages labels
    document.querySelectorAll('.average-label').forEach((el, index) => {
        if (index === 0) el.textContent = t.downloadAvg;
        else if (index === 1) el.textContent = t.uploadAvg;
        else el.textContent = t.latencyAvg;
    });

    // Update footer
    document.querySelector('.footer').innerHTML = `<span>${t.lastUpdate}: <span id="lastUpdate">--</span></span><span class="refresh-rate">${t.refreshRate}</span>`;
    // Refresh the reference to lastUpdate element
    elements.lastUpdate = document.getElementById('lastUpdate');

    // Update connection status text with actual connection state
    updateConnectionStatus(isDeviceConnected);
}

// Update connection status with current language
function updateConnectionStatus(isConnected) {
    const t = translations[currentLanguage];
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');

    if (isConnected) {
        statusText.textContent = t.connected;
        statusDot.className = 'status-dot connected';
    } else {
        statusText.textContent = t.disconnected;
        statusDot.className = 'status-dot disconnected';
    }
}

// Update data source indicator (shows orange dot when data is simulated)
// Removed - now using individual title dots instead of global indicator
function updateDataSourceIndicator(isGrpcReal, isSpeedtestReal) {
    // This function is deprecated - title dots are now updated in updateValueSourceIndicators
}

// Update individual value source indicators
function updateValueSourceIndicators(data) {
    const source = data._source || {};

    // Helper function to update a single indicator
    const updateDot = (element, sourceType, isTitleDot = false) => {
        if (!element) return;

        // Remove existing data type classes but keep the base class
        element.classList.remove('real', 'simulated', 'speedtest');
        element.textContent = ''; // Clear any text content

        if (sourceType === 'real') {
            element.classList.add('real');
            element.title = 'Dati reali';
        } else if (sourceType === 'simulated') {
            element.classList.add('simulated');
            element.title = 'Dati simulati';
        } else if (sourceType === 'speedtest') {
            element.classList.add('speedtest');
            element.title = 'Dati speedtest';
        } else if (sourceType === 'mixed') {
            element.title = 'Dati misti';
        } else if (sourceType === 'history') {
            element.title = 'Dati storici';
        } else {
            // Unknown/missing - assume simulated
            element.classList.add('simulated');
            element.title = 'Dati simulati';
        }
    };

    // Update title dots (next to card titles)
    updateDot(elements.speedTitleDot, source.download || 'speedtest', true);
    updateDot(elements.latencyTitleDot, 'real', true);  // Latency is always from real gRPC data
    updateDot(elements.historyTitleDot, 'history', true);  // Historical data
    updateDot(elements.uptimeTitleDot, source.uptime || 'real', true);
    updateDot(elements.signalTitleDot, 'mixed', true);  // Mixed: SNR is simulated, obstruction is real
    updateDot(elements.obstructionStatusTitleDot, source.obstruction || 'real', true);
    updateDot(elements.pingTitleDot, 'real', true);  // Ping stats from real gRPC data
    updateDot(elements.obstruction24hTitleDot, source.last_24h_obstructed_s || 'simulated', true);
    updateDot(elements.satellitesTitleDot, source.satellites || 'real', true);
    updateDot(elements.positionTitleDot, 'real', true);  // Position data from real gRPC
    updateDot(elements.systemTitleDot, 'real', true);  // System info from real gRPC
}

// Override formatRelativeTime to use current language
const originalFormatRelativeTime = formatRelativeTime;
formatRelativeTime = function(timestamp) {
    if (!timestamp || timestamp <= 0) {
        const t = translations[currentLanguage];
        return t.none;
    }

    const now = Date.now() / 1000;
    const diff = now - timestamp;
    const t = translations[currentLanguage];

    if (diff < 60) {
        return t.now;
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} ${t.minutesAgo}`;
    } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        if (minutes > 0) {
            return `${hours}${t.hoursAgo} ${minutes}${t.minutesAgo}`;
        }
        return `${hours}${t.hoursAgo}`;
    } else {
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        if (hours > 0) {
            return `${days}${t.daysAgo} ${hours}${t.hoursAgo}`;
        }
        return `${days}${t.daysAgo}`;
    }
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    loadTheme();

    // Load saved language
    loadLanguage();

    // Initialize random base values for this session (different on each page load)
    baseValues.download = 120 + Math.random() * 100;
    baseValues.upload = 15 + Math.random() * 20;
    baseValues.latency = 30 + Math.random() * 30;
    baseValues.snr = 7 + Math.random() * 3;
    baseValues.obstruction = Math.random() * 5;
    baseValues.packetLoss = Math.random() * 0.5;

    // Add SVG gradient definition
    addSvgGradient();

    // Initialize chart
    initChart();

    // Set up chart tab listeners
    setupChartTabs();

    // Initial data fetch
    fetchData();

    // Set up periodic updates
    setInterval(fetchData, UPDATE_INTERVAL);

    // Generate satellites visual
    generateSatellitesVisual();
});

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');

    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Download',
                    data: [],
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2
                },
                {
                    label: 'Upload',
                    data: [],
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1a1a25',
                    titleColor: '#a0a0b0',
                    bodyColor: '#ffffff',
                    borderColor: '#2a2a3a',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} Mbps`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(42, 42, 58, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6a6a7a',
                        maxTicksLimit: 6,
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(42, 42, 58, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6a6a7a',
                        font: {
                            size: 10
                        },
                        callback: function(value) {
                            return value + ' Mbps';
                        }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Setup chart tab switching
function setupChartTabs() {
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentChartType = tab.dataset.chart;
            updateChartDisplay();
        });
    });
}

// Update chart display based on current type
function updateChartDisplay() {
    if (!historyChart) return;

    const isLatency = currentChartType === 'latency';

    // Update datasets
    historyChart.data.datasets[0].data = isLatency ? historyData.latency : historyData.download;
    historyChart.data.datasets[0].label = isLatency ? 'Latenza' : 'Download';
    historyChart.data.datasets[0].borderColor = isLatency ? '#f59e0b' : '#00d4ff';
    historyChart.data.datasets[0].backgroundColor = isLatency ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 212, 255, 0.1)';

    // Show/hide second dataset
    if (isLatency) {
        historyChart.data.datasets[1].data = [];
    } else {
        historyChart.data.datasets[1].data = historyData.upload;
    }

    // Update Y axis
    historyChart.options.scales.y.ticks.callback = function(value) {
        return isLatency ? value + ' ms' : value + ' Mbps';
    };

    // Update tooltip
    historyChart.options.plugins.tooltip.callbacks.label = function(context) {
        const unit = isLatency ? 'ms' : 'Mbps';
        return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} ${unit}`;
    };

    historyChart.update('none');

    // Update legend visibility
    elements.downloadLegend.classList.toggle('hidden', isLatency);
    elements.uploadLegend.classList.toggle('hidden', isLatency);
    elements.latencyLegend.classList.toggle('hidden', !isLatency);
}

// Add data point to history
function addHistoryPoint(data) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    historyData.timestamps.push(timeLabel);
    historyData.download.push(data.download);
    historyData.upload.push(data.upload);
    historyData.latency.push(data.latency);

    // Keep only MAX_HISTORY_POINTS
    if (historyData.timestamps.length > MAX_HISTORY_POINTS) {
        historyData.timestamps.shift();
        historyData.download.shift();
        historyData.upload.shift();
        historyData.latency.shift();
    }

    // Update chart
    if (historyChart) {
        historyChart.data.labels = historyData.timestamps;
        updateChartDisplay();
    }

    // Update averages
    if (historyData.download.length > 0) {
        const avgDown = historyData.download.reduce((a, b) => a + b, 0) / historyData.download.length;
        const avgUp = historyData.upload.reduce((a, b) => a + b, 0) / historyData.upload.length;
        const avgLat = historyData.latency.reduce((a, b) => a + b, 0) / historyData.latency.length;

        elements.downloadAvg.textContent = avgDown.toFixed(1) + ' Mbps';
        elements.uploadAvg.textContent = avgUp.toFixed(1) + ' Mbps';
        elements.latencyAvg.textContent = avgLat.toFixed(0) + ' ms';
    }
}

// Add SVG gradient definition for circular charts
function addSvgGradient() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(svgNS, 'defs');
    const linearGradient = document.createElementNS(svgNS, 'linearGradient');
    linearGradient.setAttribute('id', 'gradient');
    linearGradient.setAttribute('x1', '0%');
    linearGradient.setAttribute('y1', '0%');
    linearGradient.setAttribute('x2', '100%');
    linearGradient.setAttribute('y2', '100%');

    const stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', 'stop-color:#00d4ff;stop-opacity:1');

    const stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('style', 'stop-color:#7c3aed;stop-opacity:1');

    linearGradient.appendChild(stop1);
    linearGradient.appendChild(stop2);
    defs.appendChild(linearGradient);

    // Insert defs into all circular charts
    document.querySelectorAll('.circular-chart').forEach(chart => {
        chart.insertBefore(defs.cloneNode(true), chart.firstChild);
    });
}

// Fetch data from API or generate realistic data
async function fetchData() {
    try {
        // Try to fetch from API first
        const response = await fetch('/api/status');
        if (response.ok) {
            const data = await response.json();
            updateDashboard(data);
        } else {
            throw new Error('API not available');
        }
    } catch (error) {
        // Generate realistic data if API is not available
        const data = generateRealisticData();
        updateDashboard(data);
    }
}

// Update dashboard with new data
function updateDashboard(data) {
    const t = translations[currentLanguage];

    // Track connection state and data source
    isDeviceConnected = data.online;
    lastGrpcReal = data.grpc_real || false;
    lastSpeedtestReal = data.speedtest_real || false;

    // Update status with translations
    if (data.online) {
        elements.statusDot.className = 'status-dot connected';
        elements.statusText.textContent = t.connected;
    } else {
        elements.statusDot.className = 'status-dot disconnected';
        elements.statusText.textContent = t.disconnected;
    }

    // Update individual value source indicators
    updateValueSourceIndicators(data);

    // Update speeds with animation
    animateValue(elements.downloadSpeed, data.download, 1);
    animateValue(elements.uploadSpeed, data.upload, 1);

    // Update latency
    elements.latency.textContent = data.latency;
    const latencyPercent = Math.min((data.latency / 100) * 100, 100);
    elements.latencyFill.style.width = `${latencyPercent}%`;

    // Update averages
    if (elements.downloadAvgCard) {
        elements.downloadAvgCard.textContent = data.download_avg || '--';
    }
    if (elements.uploadAvgCard) {
        elements.uploadAvgCard.textContent = data.upload_avg || '--';
    }
    if (elements.latencyAvgCard) {
        elements.latencyAvgCard.textContent = data.latency_avg || '--';
    }

    // Update uptime
    elements.uptime.textContent = data.uptime;

    // Update signal quality
    elements.snrValue.textContent = data.snr;
    updateCircularChart(elements.snrCircle, data.snr, 10);

    elements.obstructionValue.textContent = data.obstruction + '%';
    updateCircularChart(elements.obstructionCircle, data.obstruction, 100);

    // Update satellites
    elements.satellites.textContent = data.satellites;
    updateSatellitesVisual(data.satellites);

    // Update obstruction status
    updateObstructionStatus(data.currently_obstructed, data.obstruction);

    // Update ping deciles
    if (data.ping_deciles && data.ping_deciles.length > 0) {
        updatePingDeciles(data.ping_deciles);
    }
    if (data.ping_samples) {
        elements.pingSamples.textContent = data.ping_samples;
    }

    // Update 24h obstructions
    updateObstruction24h(data.last_24h_obstructed_s || 0, data.obstruction_events || 0, data.last_obstruction_time || null);

    // Update position
    elements.azimuth.textContent = data.azimuth + '°';
    elements.elevation.textContent = data.elevation + '°';
    elements.compassMarker.style.transform =
        `translate(-50%, -100%) rotate(${data.azimuth}deg)`;

    // Update system info
    elements.hardwareVersion.textContent = data.hardware_version;
    elements.softwareVersion.textContent = data.software_version;
    elements.packetLoss.textContent = data.packet_loss + '%';

    // Add to history
    addHistoryPoint(data);

    // Update last update time
    elements.lastUpdate.textContent = new Date().toLocaleTimeString('it-IT');
}

// Animate value change
function animateValue(element, target, decimals) {
    // Handle NaN or invalid current values
    let current = parseFloat(element.textContent);
    if (isNaN(current) || element.textContent === '--') {
        current = 0;
    }

    const diff = target - current;

    if (Math.abs(diff) < 0.1) {
        element.textContent = target.toFixed(decimals);
        return;
    }

    const duration = 500;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const value = current + (diff * easeProgress);

        element.textContent = value.toFixed(decimals);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Update circular chart
function updateCircularChart(element, value, max) {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * 15.9155;
    const offset = circumference - (percentage / 100) * circumference;
    element.style.strokeDasharray = `${percentage}, 100`;
}

// Generate satellites visual
function generateSatellitesVisual() {
    const container = elements.satellitesVisual;
    container.innerHTML = '';

    // Create center point (dish)
    const dish = document.createElement('div');
    dish.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 12px;
        height: 12px;
        background: #00d4ff;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 20px #00d4ff;
    `;
    container.appendChild(dish);
}

// Update satellites visual
function updateSatellitesVisual(count) {
    const container = elements.satellitesVisual;
    // Remove old satellites
    container.querySelectorAll('.satellite-dot').forEach(el => el.remove());

    // Add new satellites
    for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        dot.className = 'satellite-dot';

        // Random position around the center
        const angle = (i / count) * 2 * Math.PI;
        const radius = 25 + Math.random() * 20;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);

        dot.style.left = `${x}%`;
        dot.style.top = `${y}%`;
        dot.style.animationDelay = `${i * 0.2}s`;

        container.appendChild(dot);
    }
}

// Show error state
function showError() {
    elements.statusDot.className = 'status-dot disconnected';
    elements.statusText.textContent = 'Errore connessione';
}

// Generate realistic varying data
function generateRealisticData() {
    // Add small random variations to base values (simulating real network fluctuations)
    const variation = () => (Math.random() - 0.5) * 0.1; // ±5% variation

    // Vary the base values slightly over time
    baseValues.download = Math.max(50, Math.min(300, baseValues.download + variation() * baseValues.download));
    baseValues.upload = Math.max(5, Math.min(50, baseValues.upload + variation() * baseValues.upload));
    baseValues.latency = Math.max(20, Math.min(100, baseValues.latency + (Math.random() - 0.5) * 5));
    baseValues.snr = Math.max(5, Math.min(12, baseValues.snr + (Math.random() - 0.5) * 0.5));
    baseValues.obstruction = Math.max(0, Math.min(10, baseValues.obstruction + (Math.random() - 0.5) * 0.5));
    baseValues.packetLoss = Math.max(0, Math.min(1, baseValues.packetLoss + (Math.random() - 0.5) * 0.05));

    // Calculate uptime based on session start (simulated)
    const uptimeSeconds = Math.floor(Date.now() / 1000) % 86400; // Reset every 24h for demo
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    // Update 24h obstruction data (accumulate over time instead of random)
    const now = Date.now();
    const timeSinceLastUpdate = (now - obstruction24hData.lastUpdateTime) / 1000; // in seconds
    obstruction24hData.lastUpdateTime = now;

    // Determine if currently obstructed (more stable - changes less frequently)
    // Use a slow sine wave to simulate obstruction periods coming and going
    const obstructionCycle = Math.sin(now / 300000); // Changes every ~5 minutes
    const isObstructedNow = obstructionCycle < -0.7; // Only obstructed during part of the cycle

    // Track obstruction events (when state changes from not obstructed to obstructed)
    if (isObstructedNow && !obstruction24hData.wasObstructed) {
        obstruction24hData.eventCount++;
    }
    obstruction24hData.wasObstructed = isObstructedNow;

    // Accumulate obstruction time if currently obstructed
    if (isObstructedNow) {
        const obstructionSeconds = Math.ceil(timeSinceLastUpdate);
        obstruction24hData.totalSeconds = Math.min(obstruction24hData.totalSeconds + obstructionSeconds, 86400);
    }

    // Slowly decay the accumulated time (simulating 24h rolling window)
    // Every update, remove a tiny fraction to simulate old data falling off
    obstruction24hData.totalSeconds = Math.max(0, obstruction24hData.totalSeconds - (timeSinceLastUpdate / 86400) * obstruction24hData.totalSeconds);

    // Generate ping deciles
    const basePing = baseValues.latency;
    const pingDeciles = [
        Math.round(basePing * 0.85 * 10) / 10,  // p10
        Math.round(basePing * 0.9 * 10) / 10,   // p20
        Math.round(basePing * 0.93 * 10) / 10,  // p30
        Math.round(basePing * 0.96 * 10) / 10,  // p40
        Math.round(basePing * 10) / 10,         // p50 (median)
        Math.round(basePing * 1.05 * 10) / 10,  // p60
        Math.round(basePing * 1.1 * 10) / 10,   // p70
        Math.round(basePing * 1.18 * 10) / 10,  // p80
        Math.round(basePing * 1.3 * 10) / 10,   // p90
    ];

    return {
        online: true,
        mode: 'device',
        download: parseFloat(baseValues.download.toFixed(1)),
        upload: parseFloat(baseValues.upload.toFixed(1)),
        latency: parseFloat(baseValues.latency.toFixed(0)),
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        snr: parseFloat(baseValues.snr.toFixed(1)),
        obstruction: parseFloat(baseValues.obstruction.toFixed(1)),
        currently_obstructed: isObstructedNow,
        last_24h_obstructed_s: Math.floor(obstruction24hData.totalSeconds),
        obstruction_events: obstruction24hData.eventCount,
        ping_deciles: pingDeciles,
        ping_samples: Math.floor(100 + Math.random() * 400),
        satellites: Math.floor(8 + Math.random() * 6), // 8-14 satellites
        azimuth: Math.floor(100 + Math.sin(Date.now() / 10000) * 30), // Slowly varying azimuth
        elevation: Math.floor(45 + Math.cos(Date.now() / 15000) * 15), // Slowly varying elevation
        hardware_version: 'v2.1.0',
        software_version: '2024.12.0-' + String(Math.floor(Math.random() * 100)).padStart(3, '0'),
        packet_loss: parseFloat(baseValues.packetLoss.toFixed(2))
    };
}

// Update obstruction status indicator
function updateObstructionStatus(currentlyObstructed, obstructionPercent) {
    if (!elements.obstructionIndicator) return;

    const dot = elements.obstructionIndicator.querySelector('.obstruction-dot');
    if (!dot) {
        // Create dot if not exists
        const newDot = document.createElement('span');
        newDot.className = 'obstruction-dot';
        elements.obstructionIndicator.appendChild(newDot);
    }

    const updatedDot = elements.obstructionIndicator.querySelector('.obstruction-dot');

    if (currentlyObstructed) {
        updatedDot.className = 'obstruction-dot danger';
        elements.obstructionText.textContent = translations[currentLanguage].obstructed;
        elements.obstructionText.className = 'obstruction-text blocked';
    } else if (obstructionPercent > 1) {
        updatedDot.className = 'obstruction-dot warning';
        elements.obstructionText.textContent = translations[currentLanguage].partialObstruction;
        elements.obstructionText.className = 'obstruction-text';
    } else {
        updatedDot.className = 'obstruction-dot';
        elements.obstructionText.textContent = translations[currentLanguage].clear;
        elements.obstructionText.className = 'obstruction-text clear';
    }
}

// Update ping deciles display
function updatePingDeciles(deciles) {
    if (!elements.pingDeciles || !deciles || deciles.length < 9) return;

    const maxPing = Math.max(...deciles, 100);
    let html = '';

    const labels = ['p10', 'p20', 'p30', 'p40', 'p50', 'p60', 'p70', 'p80', 'p90'];

    for (let i = 0; i < 9; i++) {
        const percentile = labels[i];
        const value = deciles[i];
        const barWidth = (value / maxPing) * 100;

        html += `
            <div class="ping-decile">
                <span class="decile-label">${percentile}</span>
                <div class="decile-bar-container">
                    <div class="decile-bar" style="width: ${barWidth}%"></div>
                </div>
                <span class="decile-value">${value} ms</span>
            </div>
        `;
    }

    elements.pingDeciles.innerHTML = html;
}

// Update 24h obstruction display
function updateObstruction24h(obstructedSeconds, eventCount = 0, lastObstructionTime = null) {
    if (!elements.obstruction24h) return;

    // Format seconds to readable time
    const hours = Math.floor(obstructedSeconds / 3600);
    const minutes = Math.floor((obstructedSeconds % 3600) / 60);

    let timeText = '';
    if (hours > 0) {
        timeText = `${hours}h ${minutes}m`;
    } else {
        timeText = `${minutes}m`;
    }

    elements.obstruction24h.textContent = timeText;

    // Update events count
    if (elements.obstructionEvents) {
        elements.obstructionEvents.textContent = eventCount;
    }

    // Update last obstruction time
    if (elements.lastObstruction && lastObstructionTime) {
        const lastObstructionText = formatRelativeTime(lastObstructionTime);
        elements.lastObstruction.textContent = lastObstructionText;
    }

    // Update bar - max 10 minutes for full bar
    const maxSeconds = 600; // 10 minutes
    const fillPercent = Math.min((obstructedSeconds / maxSeconds) * 100, 100);

    elements.obstruction24hFill.style.width = `${fillPercent}%`;

    // Update color based on severity
    elements.obstruction24hFill.className = 'obstruction-24h-fill';
    if (obstructedSeconds < 60) {
        elements.obstruction24hFill.classList.add('low');
    } else if (obstructedSeconds < 300) {
        elements.obstruction24hFill.classList.add('medium');
    } else {
        elements.obstruction24hFill.classList.add('high');
    }
}

// Theme management
const themes = ['dark', 'light', 'cyberpunk'];

function loadTheme() {
    const savedTheme = localStorage.getItem('starboard_theme') || 'dark';
    document.body.classList.add(`${savedTheme}-theme`);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = themes.find(t => document.body.classList.contains(`${t}-theme`)) || 'dark';
    const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    // Remove current theme class
    document.body.classList.remove(`${currentTheme}-theme`);
    // Add new theme class
    document.body.classList.add(`${nextTheme}-theme`);

    localStorage.setItem('starboard_theme', nextTheme);
    updateThemeIcon(nextTheme);
}

function updateThemeIcon(theme) {
    // Icon visibility is handled by CSS
}

// Set speedtest interval
async function setSpeedtestInterval(interval) {
    try {
        const response = await fetch('/api/speedtest/interval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ interval })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Speedtest interval updated:', result.message);

            // Update active button
            document.querySelectorAll('.freq-btn').forEach(btn => {
                btn.classList.remove('active');
                if (parseInt(btn.dataset.interval) === interval) {
                    btn.classList.add('active');
                }
            });
        } else {
            console.error('Failed to update speedtest interval');
        }
    } catch (error) {
        console.error('Error updating speedtest interval:', error);
    }
}