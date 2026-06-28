/**
 * Algoman Server - Real-time Binance Data Dashboard
 * Pure Node.js implementation - NO Python required
 */

const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

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
const SYMBOLS = (process.env.TRADING_SYMBOLS || 'BTCUSDT,ETHUSDT,BNBUSDT').split(',').map(s => s.trim());
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 5000;

// Binance API endpoints
const BINANCE_API = 'https://api.binance.com/api/v3';

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store active connections and data
let connectedClients = new Set();
let cachedData = {};
let dataFetcherInterval = null;

/**
 * Fetch ticker data from Binance API
 */
async function fetchBinanceData() {
    try {
        const data = {};
        
        for (const symbol of SYMBOLS) {
            try {
                const response = await axios.get(`${BINANCE_API}/ticker/24hr?symbol=${symbol}`, {
                    timeout: 5000
                });
                
                const ticker = response.data;
                
                data[symbol] = {
                    symbol: symbol,
                    price: parseFloat(ticker.lastPrice),
                    high: parseFloat(ticker.highPrice),
                    low: parseFloat(ticker.lowPrice),
                    volume: parseFloat(ticker.volume),
                    priceChange: parseFloat(ticker.priceChange),
                    priceChangePercent: parseFloat(ticker.priceChangePercent),
                    bidPrice: parseFloat(ticker.bidPrice),
                    askPrice: parseFloat(ticker.askPrice),
                    openPrice: parseFloat(ticker.openPrice),
                    closePrice: parseFloat(ticker.lastPrice),
                    count: parseInt(ticker.count),
                    timestamp: new Date().toISOString()
                };
                
                console.log(`[Binance] ${symbol}: $${data[symbol].price}`);
            } catch (err) {
                console.error(`[Binance Error] Failed to fetch ${symbol}: ${err.message}`);
            }
        }
        
        if (Object.keys(data).length > 0) {
            cachedData = data;
            // Broadcast to all connected clients
            io.emit('binance-data', {
                data: data,
                timestamp: new Date().toISOString()
            });
        }
    } catch (err) {
        console.error(`[Binance Error] ${err.message}`);
    }
}

/**
 * Start data fetcher
 */
function startDataFetcher() {
    console.log('[Server] Starting Binance data fetcher (Node.js)...');
    
    // Fetch immediately
    fetchBinanceData();
    
    // Then fetch at intervals
    dataFetcherInterval = setInterval(fetchBinanceData, UPDATE_INTERVAL);
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
        connectedClients: connectedClients.size,
        cachedSymbols: Object.keys(cachedData),
        dataSource: 'Binance REST API (Node.js)'
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
    
    if (dataFetcherInterval) {
        clearInterval(dataFetcherInterval);
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
    console.log(`  - Data Source: Binance REST API (Node.js)`);
    console.log(`  - Dashboard: http://localhost:${PORT}\n`);

    startDataFetcher();
});

module.exports = { io, app, server };
