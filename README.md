# Algoman - Real-time Binance Trading Dashboard

![Dashboard](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node.js-v14+-green)
![Python](https://img.shields.io/badge/Python-3.8+-blue)

Algoman is a real-time cryptocurrency trading dashboard that fetches live data from Binance and displays it with beautiful, interactive charts and real-time updates via WebSocket.

## Features

✨ **Real-time Data Updates** - Live cryptocurrency prices via Binance API
📊 **Interactive Charts** - Chart.js powered candlestick and price charts
🔄 **Multi-Symbol Support** - Track multiple cryptocurrencies simultaneously
⚡ **WebSocket Integration** - Instant data delivery without polling
🎨 **Modern UI** - Cyberpunk-themed dark dashboard
📱 **Responsive Design** - Works seamlessly on desktop and mobile
🔌 **Easy Setup** - Simple configuration with environment variables

## Project Structure

```
Algoman/
├── server.js                    # Express.js server with WebSocket support
├── binance_live.py             # Python Binance API client
├── package.json                # Node.js dependencies
├── requirements.txt            # Python dependencies
├── .env.example                # Example environment variables
├── .gitignore                  # Git ignore patterns
├── public/
│   ├── index-dashboard.html    # Main HTML dashboard
│   └── app.js                  # Client-side JavaScript
└── README.md                   # This file
```

## Prerequisites

- **Node.js** >= 14.0.0
- **Python** >= 3.8
- **npm** >= 6.0.0
- **Binance API Key** (Free tier works fine for non-trading operations)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/itscurebits-byte/Algoman.git
cd Algoman
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or with Python 3 explicitly:

```bash
pip3 install -r requirements.txt
```

**Troubleshooting Python Dependencies:**
- If you get permission errors, use: `pip install --user -r requirements.txt`
- For virtual environment (recommended):
  ```bash
  python3 -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  pip install -r requirements.txt
  ```

### 3. Install Node.js Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Binance API credentials:

```env
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
PORT=3000
TRADING_SYMBOLS=BTCUSDT,ETHUSDT,BNBUSDT
UPDATE_INTERVAL=5000
```

**Getting Binance API Keys:**
1. Go to https://www.binance.com
2. Create a free account if you don't have one
3. Navigate to Account → API Management
4. Create a new API key
5. Copy the API Key and Secret to your `.env` file
6. ⚠️ **Important**: Disable trading permissions for security!

## Usage

### Option 1: Run with Python Data Fetcher (Recommended)

```bash
npm start
```

This will:
1. Start the Express.js server on port 3000
2. Spawn a Python process to fetch Binance data
3. Serve the dashboard at `http://localhost:3000`

### Option 2: Run with Mock Data (Testing)

If you don't have Binance API keys or want to test:

```bash
npm start
```

The server will automatically fall back to mock data if the Python process fails.

### Option 3: Development Mode (with auto-reload)

```bash
npm run dev
```

This requires `nodemon` to be installed (already in devDependencies).

## Dashboard Features

### Symbol Selection
- Select a cryptocurrency from the dropdown
- Click "+ Add Symbol" to add multiple symbols to your dashboard
- Click the ✕ button on any card to remove it

### Real-time Data
- **Current Price** - Live price updates
- **24h Change** - Percentage and absolute price change
- **High/Low** - 24-hour high and low prices
- **Volume** - Trading volume in the last 24 hours
- **Bid/Ask** - Current buy and sell prices

### Charts
- **Price Charts** - Interactive line charts showing price history
- Auto-updates every 5 seconds with new data
- Displays last 20 data points for clarity

### Connection Status
- Green indicator when connected to live data
- Red indicator when offline
- Real-time alerts for connection changes

## API Documentation

### WebSocket Events (Client → Server)

```javascript
// Subscribe to symbol updates
socket.emit('subscribe-symbol', 'BTCUSDT');

// Unsubscribe from symbol
socket.emit('unsubscribe-symbol', 'BTCUSDT');

// Request current data for symbol
socket.emit('request-symbol-data', 'BTCUSDT');
```

### WebSocket Events (Server → Client)

```javascript
// Receive live data for all subscribed symbols
socket.on('binance-data', (event) => {
    console.log(event.data);
    // {
    //   'BTCUSDT': { price, high, low, volume, ... },
    //   'ETHUSDT': { price, high, low, volume, ... },
    //   ...
    // }
});

// Receive data for specific symbol
socket.on('symbol-data', (event) => {
    console.log(event.symbol, event.data);
});
```

### HTTP Endpoints

```bash
# Get all available symbols
GET /api/symbols

# Get current cached data
GET /api/data

# Get server health status
GET /api/health
```

## Troubleshooting

### Issue: ModuleNotFoundError: No module named 'binance'

**Solution:**
```bash
pip install python-binance
```

### Issue: Connection refused on port 3000

**Solution:**
```bash
# Check if port 3000 is in use
lsof -i :3000  # On macOS/Linux
netstat -ano | findstr :3000  # On Windows

# Kill the process or change the PORT in .env
```

### Issue: Binance API authentication fails

**Solution:**
1. Verify API key and secret are correct in `.env`
2. Check API key has not expired
3. Ensure API key IP restrictions allow your IP
4. Create a new API key if problems persist

### Issue: Python process not starting

**Solution:**
1. Verify Python 3 is installed: `python3 --version`
2. Check dependencies: `pip3 list | grep binance`
3. Test Python script: `python3 binance_live.py`
4. Check server logs for detailed error messages

### Issue: Charts not updating

**Solution:**
1. Check browser console for JavaScript errors
2. Verify WebSocket connection: Look for green "Live" indicator
3. Try refreshing the page
4. Clear browser cache

## Performance Optimization

### Server-side
- Data updates every 5 seconds (configurable via `UPDATE_INTERVAL`)
- Connection pooling for Binance API
- Efficient JSON serialization
- Graceful error handling and reconnection

### Client-side
- Efficient DOM updates (only changed elements)
- Chart animation disabled for real-time updates
- WebSocket for low-latency data delivery
- Responsive image loading

### Scaling
For production use:
1. Use PM2 for process management
2. Add Redis for data caching
3. Implement rate limiting
4. Use CDN for static assets
5. Set up multiple server instances behind load balancer

## Development

### Running Tests

```bash
# Test Python module
python3 binance_live.py

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/symbols
```

### Adding New Features

1. **New Chart Type**: Modify `createChart()` in `app.js`
2. **New API Endpoint**: Add route in `server.js`
3. **New Symbol**: Add to `TRADING_SYMBOLS` in `.env`
4. **Custom Styling**: Edit CSS in `index-dashboard.html`

### Code Structure

**Backend (server.js)**
- Express server setup
- WebSocket connection handling
- Python process spawning
- API route definitions

**Python (binance_live.py)**
- Binance API client initialization
- Data fetching methods
- Error handling
- Stream management

**Frontend (app.js)**
- AlgomanDashboard class for state management
- WebSocket event handlers
- Chart.js integration
- UI update logic

## Security Best Practices

⚠️ **Important Security Notes:**

1. **Never commit `.env` file** - It contains API secrets
2. **Use read-only API keys** - Disable trading on your Binance API key
3. **Restrict API IP** - Only allow requests from your server IP
4. **Use HTTPS in production** - For data encryption
5. **Keep dependencies updated** - Run `npm audit` and `pip audit` regularly
6. **Validate all inputs** - Especially user-provided data
7. **Rate limit API calls** - Prevent abuse

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Roadmap

- [ ] User authentication and saved preferences
- [ ] Price alerts and notifications
- [ ] Historical data export
- [ ] Advanced technical indicators
- [ ] Mobile app (React Native)
- [ ] Trading simulator
- [ ] Advanced charting with TradingView Lightweight Charts
- [ ] Database integration for historical data
- [ ] Multi-exchange support

## Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review existing GitHub issues
3. Create a new GitHub issue with details
4. Include error logs and environment info

## Disclaimer

This project is for educational purposes only. It is not financial advice. Always do your own research before making trading decisions. The developers are not responsible for any financial losses.

## Author

**itscurebits-byte** - [GitHub Profile](https://github.com/itscurebits-byte)

## Acknowledgments

- [Binance API](https://binance-docs.github.io/apidocs/) - Cryptocurrency data
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [Socket.IO](https://socket.io/) - Real-time communication
- [Express.js](https://expressjs.com/) - Web framework

---

⭐ If you find this project useful, please consider giving it a star! 🌟
