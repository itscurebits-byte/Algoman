/**
 * Algoman Server - Real-time Binance Data Dashboard
 * Serves the frontend and manages WebSocket connections for live data
 */

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configuration
const PORT = process.env.PORT || 3000;
const PYTHON_SCRIPT = path.join(__dirname, 'binance_live.py');
const SYMBOLS = process.env.TRADING_SYMBOLS?.split(',') || ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 5000; // 5 seconds default

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store active connections and data
let pythonProcess = null;
let connectedClients = new Set();
let cachedData = {};

/**
 * Start Python process for fetching Binance data
 */
function startPythonDataFetcher() {
    console.log('[Server] Starting Python data fetcher...');
    
    pythonProcess = spawn('python3', [PYTHON_SCRIPT], {
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
        }
    });

    pythonProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[Python] ${output}`);
        
        // Try to parse JSON data from Python output
        try {
            const jsonData = JSON.parse(output);
            if (jsonData && typeof jsonData === 'object') {
                cachedData = jsonData;
                // Broadcast to all connected clients
                io.emit('binance-data', {
                    data: jsonData,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (e) {
            // Not JSON, just a log message
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python Error] ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`[Server] Python process exited with code ${code}`);
        pythonProcess = null;
        
        // Restart after 5 seconds if it crashes
        if (code !== 0) {
            console.log('[Server] Restarting Python process in 5 seconds...');
            setTimeout(startPythonDataFetcher, 5000);
        }
    });

    pythonProcess.on('error', (err) => {
        console.error(`[Server] Failed to start Python process: ${err.message}`);
        console.log('[Server] Make sure python3 and dependencies are installed');
    });
}

/**
 * Mock data fetcher (fallback when Python is not available)
 */
function generateMockData() {
    const data = {};
    SYMBOLS.forEach(symbol => {
        const basePrice = {
            'BTCUSDT': 65000,
            'ETHUSDT': 3500,
            'BNBUSDT': 600
        }[symbol] || 1000;
        
        const change = (Math.random() - 0.5) * 100;
        const price = basePrice + change;
        
        data[symbol] = {
            symbol: symbol,
            price: parseFloat(price.toFixed(2)),
            high: parseFloat((price * 1.02).toFixed(2)),
            low: parseFloat((price * 0.98).toFixed(2)),
            volume: parseFloat((Math.random() * 10000).toFixed(2)),
            priceChange: parseFloat(change.toFixed(2)),
            priceChangePercent: parseFloat(((change / basePrice) * 100).toFixed(2)),
            bidPrice: parseFloat((price * 0.999).toFixed(2)),
            askPrice: parseFloat((price * 1.001).toFixed(2)),
            timestamp: new Date().toISOString()
        };
    });
    return data;
}

/**
 * Start mock data broadcaster (for development/fallback)
 */
function startMockDataBroadcaster() {
    console.log('[Server] Starting mock data broadcaster (development mode)');
    
    setInterval(() => {
        const mockData = generateMockData();
        io.emit('binance-data', {
            data: mockData,
            timestamp: new Date().toISOString(),
            isMock: true
        });
    }, UPDATE_INTERVAL);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index-dashboard.html'));
});

app.get('/api/symbols', (req, res) => {
    res.json({ symbols: SYMBOLS });
});

app.get('/api/data', (req, res) => {
    res.json({
        data: cachedData,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        pythonProcessRunning: pythonProcess !== null,
        connectedClients: connectedClients.size,
        cachedSymbols: Object.keys(cachedData)
    });
});

// WebSocket Events
io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);
    connectedClients.add(socket.id);

    // Send cached data immediately on connection
    if (Object.keys(cachedData).length > 0) {
        socket.emit('binance-data', {
            data: cachedData,
            timestamp: new Date().toISOString()
        });
    }

    // Handle symbol subscription
    socket.on('subscribe-symbol', (symbol) => {
        console.log(`[WebSocket] ${socket.id} subscribed to ${symbol}`);
        socket.join(`symbol-${symbol}`);
    });

    socket.on('unsubscribe-symbol', (symbol) => {
        console.log(`[WebSocket] ${socket.id} unsubscribed from ${symbol}`);
        socket.leave(`symbol-${symbol}`);
    });

    // Handle requests for specific symbol data
    socket.on('request-symbol-data', (symbol) => {
        if (cachedData[symbol]) {
            socket.emit('symbol-data', {
                symbol: symbol,
                data: cachedData[symbol]
            });
        }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
        connectedClients.delete(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error(`[WebSocket Error] ${socket.id}: ${error}`);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down gracefully...');
    
    if (pythonProcess) {
        pythonProcess.kill();
    }
    
    server.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════╗`);
    console.log(`║  Algoman - Binance Live Dashboard     ║`);
    console.log(`║  Server listening on port ${PORT}        ║`);
    console.log(`╚════════════════════════════════════════╝\n`);
    
    console.log(`[Server] Configuration:`);
    console.log(`  - Symbols: ${SYMBOLS.join(', ')}`);
    console.log(`  - Update Interval: ${UPDATE_INTERVAL}ms`);
    console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // Try to start Python data fetcher
    // If it fails, fall back to mock data
    try {
        startPythonDataFetcher();
    } catch (err) {
        console.warn('[Server] Python process unavailable, using mock data');
        startMockDataBroadcaster();
    }
});

module.exports = { io, app, server };
