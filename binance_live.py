"""
Binance Live Data Fetcher using python-binance
Fetches real-time data for multiple trading symbols
"""

import os
import json
import time
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
            print("✓ Connected to Binance API")
        except BinanceAPIException as e:
            print(f"✗ Binance API Error: {e}")
            raise
        except BinanceRequestException as e:
            print(f"✗ Binance Request Error: {e}")
            raise
    
    def get_current_price(self, symbol):
        """Get current price for a single symbol"""
        try:
            ticker = self.client.get_symbol_ticker(symbol=symbol)
            return float(ticker['price'])
        except BinanceAPIException as e:
            print(f"✗ Error fetching {symbol}: {e}")
            return None
    
    def get_24h_stats(self, symbol):
        """Get 24-hour statistics for a symbol"""
        try:
            stats = self.client.get_ticker(symbol=symbol)
            return {
                'symbol': symbol,
                'price': float(stats['lastPrice']),
                'high': float(stats['highPrice']),
                'low': float(stats['lowPrice']),
                'volume': float(stats['volume']),
                'priceChange': float(stats['priceChange']),
                'priceChangePercent': float(stats['priceChangePercent']),
                'bidPrice': float(stats['bidPrice']),
                'askPrice': float(stats['askPrice']),
                'timestamp': datetime.now().isoformat()
            }
        except BinanceAPIException as e:
            print(f"✗ Error fetching 24h stats for {symbol}: {e}")
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
                    'time': kline[0] / 1000,  # Convert to seconds
                    'open': float(kline[1]),
                    'high': float(kline[2]),
                    'low': float(kline[3]),
                    'close': float(kline[4]),
                    'volume': float(kline[7])
                })
            
            return formatted_klines
        except BinanceAPIException as e:
            print(f"✗ Error fetching klines for {symbol}: {e}")
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
        except BinanceAPIException as e:
            print(f"✗ Error fetching order book for {symbol}: {e}")
            return None
    
    def get_multiple_symbols_data(self, symbols):
        """Fetch data for multiple symbols at once"""
        data = {}
        for symbol in symbols:
            stats = self.get_24h_stats(symbol)
            if stats:
                data[symbol] = stats
        
        return data
    
    def stream_symbol_data(self, symbols, callback, interval=5):
        """
        Stream data for multiple symbols at regular intervals
        
        Args:
            symbols: List of trading symbols (e.g., ['BTCUSDT', 'ETHUSDT'])
            callback: Function to call with updated data
            interval: Update interval in seconds
        """
        print(f"Starting live stream for symbols: {symbols}")
        try:
            while True:
                data = self.get_multiple_symbols_data(symbols)
                if data:
                    callback(data)
                time.sleep(interval)
        except KeyboardInterrupt:
            print("Stream stopped by user")
        except Exception as e:
            print(f"✗ Streaming error: {e}")


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
    test_connection()
