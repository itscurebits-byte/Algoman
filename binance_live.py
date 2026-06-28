"""
Binance Live Data Fetcher using python-binance
Fetches real-time data for multiple trading symbols and continuously streams it
"""

import os
import json
import time
import sys
from datetime import datetime
from dotenv import load_dotenv
from binance.client import Client
from binance.exceptions import BinanceAPIException, BinanceRequestException

# Load environment variables from .env file
load_dotenv()

class BinanceLiveDataFetcher:
    def __init__(self):
        """Initialize Binance API client with credentials from environment"""
        api_key = os.getenv('BINANCE_API_KEY')
        api_secret = os.getenv('BINANCE_API_SECRET')
        
        if not api_key or not api_secret:
            raise ValueError(
                "BINANCE_API_KEY and BINANCE_API_SECRET must be set in .env file"
            )
        
        try:
            self.client = Client(api_key, api_secret)
            self.log_output("✓ Connected to Binance API")
        except BinanceAPIException as e:
            self.log_error(f"✗ Binance API Error: {e}")
            raise
        except BinanceRequestException as e:
            self.log_error(f"✗ Binance Request Error: {e}")
            raise
    
    def log_output(self, message):
        """Print to stdout and flush immediately"""
        print(message, flush=True)
        sys.stdout.flush()
    
    def log_error(self, message):
        """Print to stderr and flush immediately"""
        print(message, file=sys.stderr, flush=True)
        sys.stderr.flush()
    
    def get_current_price(self, symbol):
        """Get current price for a single symbol"""
        try:
            ticker = self.client.get_symbol_ticker(symbol=symbol)
            price = float(ticker['price'])
            if price is None or price <= 0:
                self.log_error(f"✗ Invalid price {price} for {symbol}")
                return None
            return price
        except (BinanceAPIException, BinanceRequestException) as e:
            self.log_error(f"✗ Error fetching {symbol}: {e}")
            return None
    
    def get_24h_stats(self, symbol):
        """Get 24-hour statistics for a symbol"""
        try:
            stats = self.client.get_ticker(symbol=symbol)
            
            # Validate critical data
            price = float(stats['lastPrice'])
            if price is None or price <= 0:
                self.log_error(f"✗ Invalid price data for {symbol}")
                return None
            
            return {
                'symbol': symbol,
                'price': price,
                'high': float(stats['highPrice']),
                'low': float(stats['lowPrice']),
                'volume': float(stats['volume']),
                'priceChange': float(stats['priceChange']),
                'priceChangePercent': float(stats['priceChangePercent']),
                'bidPrice': float(stats['bidPrice']),
                'askPrice': float(stats['askPrice']),
                'openPrice': float(stats['openPrice']),
                'closePrice': float(stats['closePrice']),
                'count': int(stats['count']),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            self.log_error(f"✗ Error fetching 24h stats for {symbol}: {e}")
            return None
    
    def get_klines(self, symbol, interval='1h', limit=100):
        """Get historical klines (candlestick) data"""
        try:
            klines = self.client.get_klines(
                symbol=symbol,
                interval=interval,
                limit=limit
            )
            
            formatted_klines = []
            for kline in klines:
                formatted_klines.append({
                    'time': kline[0] / 1000,
                    'open': float(kline[1]),
                    'high': float(kline[2]),
                    'low': float(kline[3]),
                    'close': float(kline[4]),
                    'volume': float(kline[7])
                })
            
            return formatted_klines
        except (BinanceAPIException, BinanceRequestException) as e:
            self.log_error(f"✗ Error fetching klines for {symbol}: {e}")
            return None
    
    def get_order_book(self, symbol, limit=5):
        """Get order book (depth) data"""
        try:
            depth = self.client.get_order_book(symbol=symbol, limit=limit)
            return {
                'symbol': symbol,
                'bids': [[float(price), float(qty)] for price, qty in depth['bids']],
                'asks': [[float(price), float(qty)] for price, qty in depth['asks']],
                'timestamp': datetime.now().isoformat()
            }
        except (BinanceAPIException, BinanceRequestException) as e:
            self.log_error(f"✗ Error fetching order book for {symbol}: {e}")
            return None
    
    def get_multiple_symbols_data(self, symbols):
        """Fetch data for multiple symbols at once"""
        data = {}
        for symbol in symbols:
            try:
                stats = self.get_24h_stats(symbol)
                if stats:
                    data[symbol] = stats
            except Exception as e:
                self.log_error(f"Error getting data for {symbol}: {e}")
        
        return data
    
    def stream_symbol_data(self, symbols, interval=5):
        """
        Stream data for multiple symbols continuously
        Outputs JSON to stdout for the Node.js server to capture
        
        Args:
            symbols: List of trading symbols (e.g., ['BTCUSDT', 'ETHUSDT'])
            interval: Update interval in seconds
        """
        self.log_output(f"[STREAM] Starting live stream for symbols: {symbols}")
        
        try:
            while True:
                try:
                    data = self.get_multiple_symbols_data(symbols)
                    if data and len(data) > 0:
                        # Output JSON data for Node.js server to capture
                        json_output = json.dumps(data)
                        self.log_output(json_output)
                    else:
                        self.log_error("[STREAM] Failed to fetch valid data, retrying...")
                except Exception as e:
                    self.log_error(f"[STREAM] Error fetching data: {e}")
                
                time.sleep(interval)
        except KeyboardInterrupt:
            self.log_output("[STREAM] Stream stopped by user")
        except Exception as e:
            self.log_error(f"[STREAM] Fatal error: {e}")


def test_connection():
    """Test Binance API connection"""
    try:
        fetcher = BinanceLiveDataFetcher()
        
        # Test fetching price for Bitcoin
        symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
        print(f"\nTesting with symbols: {symbols}")
        
        data = fetcher.get_multiple_symbols_data(symbols)
        
        if data:
            print("\n✓ Successfully fetched data:")
            print(json.dumps(data, indent=2))
        else:
            print("✗ Failed to fetch data")
        
    except Exception as e:
        print(f"✗ Connection test failed: {e}")
        print("\nMake sure you have:")
        print("1. Installed python-binance: pip install python-binance")
        print("2. Created .env file with BINANCE_API_KEY and BINANCE_API_SECRET")


if __name__ == "__main__":
    # Get symbols from environment or use defaults
    symbols_env = os.getenv('TRADING_SYMBOLS', 'BTCUSDT,ETHUSDT,BNBUSDT')
    symbols = [s.strip() for s in symbols_env.split(',')]
    
    # Get update interval from environment
    update_interval = int(os.getenv('UPDATE_INTERVAL', '5'))
    
    # If 'test' argument is passed, run test mode
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        test_connection()
    else:
        # Run continuous stream mode
        try:
            fetcher = BinanceLiveDataFetcher()
            fetcher.stream_symbol_data(symbols, interval=update_interval)
        except Exception as e:
            print(f"✗ Fatal error: {e}", file=sys.stderr)
            sys.exit(1)
