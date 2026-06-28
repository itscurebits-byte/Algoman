/**
 * Algoman Dashboard - Client-side JavaScript
 * Manages WebSocket connections, data updates, and UI rendering
 */

class AlgomanDashboard {
    constructor() {
        this.socket = null;
        this.currentSymbol = 'BTCUSDT';
        this.displayedSymbols = new Set(['BTCUSDT']);
        this.chartInstances = new Map();
        this.symbolData = new Map();
        this.isConnected = false;
        this.updateInterval = 5000; // 5 seconds

        this.init();
    }

    /**
     * Initialize the dashboard
     */
    init() {
        console.log('[Dashboard] Initializing Algoman Dashboard...');
        
        // Setup WebSocket connection
        this.setupWebSocket();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Render initial dashboard
        this.renderDashboard();
    }

    /**
     * Setup WebSocket connection to the server
     */
    setupWebSocket() {
        console.log('[WebSocket] Connecting to server...');
        
        this.socket = io({
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        // Connection established
        this.socket.on('connect', () => {
            console.log('[WebSocket] Connected:', this.socket.id);
            this.isConnected = true;
            this.updateStatus(true);
            this.showAlert('Connected to live data stream', 'success');
        });

        // Receive live binance data
        this.socket.on('binance-data', (event) => {
            console.log('[WebSocket] Received data:', event);
            this.handleBinanceData(event.data);
        });

        // Receive single symbol data
        this.socket.on('symbol-data', (event) => {
            console.log('[WebSocket] Received symbol data:', event);
            this.symbolData.set(event.symbol, event.data);
            this.updateSymbolCard(event.symbol);
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
            console.error('[WebSocket] Connection error:', error);
            this.isConnected = false;
            this.updateStatus(false);
            this.showAlert('Connection error: ' + error.message, 'error');
        });

        // Disconnected
        this.socket.on('disconnect', (reason) => {
            console.log('[WebSocket] Disconnected:', reason);
            this.isConnected = false;
            this.updateStatus(false);
        });
    }

    /**
     * Setup event listeners for UI controls
     */
    setupEventListeners() {
        const symbolSelect = document.getElementById('symbol-select');
        if (symbolSelect) {
            symbolSelect.addEventListener('change', (e) => {
                this.currentSymbol = e.target.value;
                console.log('[Dashboard] Symbol changed to:', this.currentSymbol);
            });
        }
    }

    /**
     * Handle incoming Binance data
     */
    handleBinanceData(data) {
        if (!data || typeof data !== 'object') {
            console.warn('[Dashboard] Invalid data received:', data);
            return;
        }

        // Store data for all symbols
        Object.entries(data).forEach(([symbol, symbolData]) => {
            this.symbolData.set(symbol, symbolData);
        });

        // Update displayed symbols
        this.displayedSymbols.forEach(symbol => {
            if (this.symbolData.has(symbol)) {
                this.updateSymbolCard(symbol);
            }
        });
    }

    /**
     * Render the dashboard
     */
    renderDashboard() {
        const dashboard = document.getElementById('dashboard');
        
        if (!dashboard) {
            console.error('[Dashboard] Dashboard container not found');
            return;
        }

        dashboard.innerHTML = '';

        if (this.displayedSymbols.size === 0) {
            dashboard.innerHTML = '<div class="no-data">No symbols selected. Select a symbol from the dropdown above.</div>';
            return;
        }

        // Render a card for each displayed symbol
        this.displayedSymbols.forEach(symbol => {
            const data = this.symbolData.get(symbol);
            const card = this.createSymbolCard(symbol, data);
            dashboard.appendChild(card);
        });
    }

    /**
     * Create a symbol card element
     */
    createSymbolCard(symbol, data) {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `card-${symbol}`;
        card.setAttribute('data-symbol', symbol);

        if (!data) {
            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-title">${symbol}</div>
                        <div class="card-subtitle">Loading...</div>
                    </div>
                    <button onclick="dashboard.removeSymbolCard('${symbol}')" style="background: var(--danger-color);">✕</button>
                </div>
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            `;
            return card;
        }

        const priceChangeClass = data.priceChangePercent >= 0 ? 'positive' : 'negative';
        const priceChangeSymbol = data.priceChangePercent >= 0 ? '▲' : '▼';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">${symbol}</div>
                    <div class="card-subtitle">Last updated: ${new Date(data.timestamp).toLocaleTimeString()}</div>
                </div>
                <button onclick="dashboard.removeSymbolCard('${symbol}')" style="background: var(--danger-color); padding: 0.5rem 1rem;">✕</button>
            </div>

            <div class="price-display" style="font-family: 'Courier New', monospace;">
                $${this.formatPrice(data.price)}
            </div>

            <div class="price-change ${priceChangeClass}">
                ${priceChangeSymbol} ${Math.abs(data.priceChangePercent).toFixed(2)}% 
                (${data.priceChange >= 0 ? '+' : ''}${data.priceChange.toFixed(2)})
            </div>

            <div class="stats-grid">
                <div class="stat">
                    <div class="stat-label">24h High</div>
                    <div class="stat-value">$${this.formatPrice(data.high)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">24h Low</div>
                    <div class="stat-value">$${this.formatPrice(data.low)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Volume</div>
                    <div class="stat-value">${this.formatNumber(data.volume)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Bid/Ask</div>
                    <div class="stat-value">${this.formatPrice(data.bidPrice)} / ${this.formatPrice(data.askPrice)}</div>
                </div>
            </div>

            <div class="chart-container">
                <canvas id="chart-${symbol}"></canvas>
            </div>

            <div class="order-book">
                <div class="order-book-side">
                    <div class="order-book-title bids">Bids (Buy)</div>
                    <div id="bids-${symbol}"></div>
                </div>
                <div class="order-book-side">
                    <div class="order-book-title asks">Asks (Sell)</div>
                    <div id="asks-${symbol}"></div>
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Update a symbol card with new data
     */
    updateSymbolCard(symbol) {
        const data = this.symbolData.get(symbol);
        if (!data) return;

        const card = document.getElementById(`card-${symbol}`);
        if (!card) {
            // Card doesn't exist, render it
            const dashboard = document.getElementById('dashboard');
            if (dashboard) {
                dashboard.appendChild(this.createSymbolCard(symbol, data));
            }
            return;
        }

        // Update price display
        const priceDisplay = card.querySelector('.price-display');
        if (priceDisplay) {
            priceDisplay.textContent = `$${this.formatPrice(data.price)}`;
        }

        // Update price change
        const priceChangeClass = data.priceChangePercent >= 0 ? 'positive' : 'negative';
        const priceChangeSymbol = data.priceChangePercent >= 0 ? '▲' : '▼';
        const priceChange = card.querySelector('.price-change');
        if (priceChange) {
            priceChange.className = `price-change ${priceChangeClass}`;
            priceChange.textContent = `${priceChangeSymbol} ${Math.abs(data.priceChangePercent).toFixed(2)}% (${data.priceChange >= 0 ? '+' : ''}${data.priceChange.toFixed(2)})`;
        }

        // Update stats
        const stats = card.querySelectorAll('.stat-value');
        if (stats.length >= 4) {
            stats[0].textContent = `$${this.formatPrice(data.high)}`;
            stats[1].textContent = `$${this.formatPrice(data.low)}`;
            stats[2].textContent = this.formatNumber(data.volume);
            stats[3].textContent = `${this.formatPrice(data.bidPrice)} / ${this.formatPrice(data.askPrice)}`;
        }

        // Update chart
        this.updateChart(symbol);
    }

    /**
     * Update or create chart for a symbol
     */
    updateChart(symbol) {
        const canvasId = `chart-${symbol}`;
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const data = this.symbolData.get(symbol);
        if (!data) return;

        const ctx = canvas.getContext('2d');
        const priceChangePercent = data.priceChangePercent || 0;
        const color = priceChangePercent >= 0 ? '#00ff41' : '#ff0055';

        if (this.chartInstances.has(symbol)) {
            // Update existing chart
            const chartInstance = this.chartInstances.get(symbol);
            chartInstance.data.labels.push(new Date().toLocaleTimeString());
            chartInstance.data.datasets[0].data.push(data.price);
            
            // Keep only last 20 data points
            if (chartInstance.data.labels.length > 20) {
                chartInstance.data.labels.shift();
                chartInstance.data.datasets[0].data.shift();
            }
            
            chartInstance.update('none'); // Update without animation
        } else {
            // Create new chart
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [new Date().toLocaleTimeString()],
                    datasets: [{
                        label: `${symbol} Price`,
                        data: [data.price],
                        borderColor: color,
                        backgroundColor: color + '20',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointBackgroundColor: color
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#e0e0e0',
                                font: { size: 12 }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: {
                                color: '#3d3d5c',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#999',
                                callback: function(value) {
                                    return '$' + value.toFixed(0);
                                }
                            }
                        },
                        x: {
                            grid: {
                                display: false,
                                drawBorder: false
                            },
                            ticks: {
                                color: '#999',
                                font: { size: 10 }
                            }
                        }
                    }
                }
            });

            this.chartInstances.set(symbol, chart);
        }
    }

    /**
     * Add a new symbol card
     */
    addSymbolCard() {
        const select = document.getElementById('symbol-select');
        if (!select) return;

        const symbol = select.value;
        
        if (this.displayedSymbols.has(symbol)) {
            this.showAlert(`${symbol} is already displayed`, 'warning');
            return;
        }

        console.log('[Dashboard] Adding symbol:', symbol);
        this.displayedSymbols.add(symbol);
        
        // Request data for this symbol
        if (this.socket && this.isConnected) {
            this.socket.emit('subscribe-symbol', symbol);
            this.socket.emit('request-symbol-data', symbol);
        }

        this.renderDashboard();
    }

    /**
     * Remove a symbol card
     */
    removeSymbolCard(symbol) {
        console.log('[Dashboard] Removing symbol:', symbol);
        this.displayedSymbols.delete(symbol);
        
        if (this.socket && this.isConnected) {
            this.socket.emit('unsubscribe-symbol', symbol);
        }
        
        // Destroy chart instance
        if (this.chartInstances.has(symbol)) {
            this.chartInstances.get(symbol).destroy();
            this.chartInstances.delete(symbol);
        }

        this.renderDashboard();
    }

    /**
     * Refresh data
     */
    refreshData() {
        console.log('[Dashboard] Refreshing data...');
        if (this.socket && this.isConnected) {
            this.socket.emit('request-symbol-data', this.currentSymbol);
            this.showAlert('Data refreshed', 'success');
        } else {
            this.showAlert('Not connected to server', 'error');
        }
    }

    /**
     * Update connection status indicator
     */
    updateStatus(connected) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');

        if (indicator) {
            if (connected) {
                indicator.classList.remove('offline');
                indicator.classList.add('online');
            } else {
                indicator.classList.add('offline');
                indicator.classList.remove('online');
            }
        }

        if (text) {
            text.textContent = connected ? 'Live' : 'Offline';
        }
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const alertsContainer = document.getElementById('alerts');
        if (!alertsContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = `[${type.toUpperCase()}] ${message}`;

        alertsContainer.appendChild(alert);
        alertsContainer.classList.add('show');

        // Auto-remove after 5 seconds
        setTimeout(() => {
            alert.remove();
            if (alertsContainer.children.length === 0) {
                alertsContainer.classList.remove('show');
            }
        }, 5000);
    }

    /**
     * Format price for display
     */
    formatPrice(price) {
        if (price >= 1000) {
            return parseFloat(price).toFixed(2);
        } else if (price >= 1) {
            return parseFloat(price).toFixed(4);
        } else {
            return parseFloat(price).toFixed(8);
        }
    }

    /**
     * Format large numbers
     */
    formatNumber(num) {
        if (num >= 1e9) {
            return (num / 1e9).toFixed(2) + 'B';
        } else if (num >= 1e6) {
            return (num / 1e6).toFixed(2) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(2) + 'K';
        }
        return num.toFixed(2);
    }
}

// Initialize dashboard when DOM is ready
let dashboard;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dashboard = new AlgomanDashboard();
        console.log('[App] Algoman Dashboard initialized');
    });
} else {
    dashboard = new AlgomanDashboard();
    console.log('[App] Algoman Dashboard initialized');
}

// Global functions for HTML onclick handlers
function addSymbolCard() {
    if (dashboard) dashboard.addSymbolCard();
}

function refreshData() {
    if (dashboard) dashboard.refreshData();
}