"""
Automated Trading Bot for Binance
Executes paper trades based on market analysis
"""

import os
import json
import time
from datetime import datetime
from dotenv import load_dotenv
from binance.client import Client
from binance.exceptions import BinanceAPIException, BinanceRequestException
import sys

# Load environment variables
load_dotenv()

class TradingBot:
    def __init__(self):
        """Initialize the trading bot"""
        api_key = os.getenv('BINANCE_API_KEY')
        api_secret = os.getenv('BINANCE_API_SECRET')
        
        if not api_key or not api_secret:
            raise ValueError("BINANCE_API_KEY and BINANCE_API_SECRET must be set in .env file")
        
        self.client = Client(api_key, api_secret)
        self.paper_trading = {
            'USDT': 10000,  # Paper trading balance
            'BTC': 0,
            'ETH': 0,
            'BNB': 0
        }
        self.trades = []
        self.print_status("✓ Trading Bot Initialized")
    
    def print_status(self, message):
        """Print status message"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {message}", flush=True)
        sys.stdout.flush()
    
    def get_current_price(self, symbol):
        """Get current price for a symbol with validation"""
        try:
            ticker = self.client.get_symbol_ticker(symbol=symbol)
            price = float(ticker['price'])
            
            # Validate price
            if price is None or price <= 0:
                self.print_status(f"⚠ Warning: Got invalid price {price} for {symbol}")
                return None
            
            return price
        except Exception as e:
            self.print_status(f"✗ Error fetching price for {symbol}: {e}")
            return None
    
    def get_24h_change(self, symbol):
        """Get 24-hour price change percentage"""
        try:
            stats = self.client.get_ticker(symbol=symbol)
            change_percent = float(stats['priceChangePercent'])
            return change_percent
        except Exception as e:
            self.print_status(f"✗ Error fetching 24h change for {symbol}: {e}")
            return 0
    
    def paper_trade_buy(self, symbol, quantity, price):
        """Execute a paper trade buy with validation"""
        if price is None or price <= 0:
            self.print_status(f"✗ Cannot execute buy: Invalid price {price}")
            return False
        
        if quantity <= 0:
            self.print_status(f"✗ Cannot execute buy: Invalid quantity {quantity}")
            return False
        
        cost = quantity * price
        if cost > self.paper_trading['USDT']:
            self.print_status(f"⚠ Insufficient USDT balance. Need: ${cost:.2f}, Have: ${self.paper_trading['USDT']:.2f}")
            return False
        
        # Determine asset key
        if symbol == 'BTCUSDT':
            symbol_key = 'BTC'
            self.paper_trading['BTC'] += quantity
        elif symbol == 'ETHUSDT':
            symbol_key = 'ETH'
            self.paper_trading['ETH'] += quantity
        elif symbol == 'BNBUSDT':
            symbol_key = 'BNB'
            self.paper_trading['BNB'] += quantity
        else:
            self.print_status(f"✗ Unknown symbol: {symbol}")
            return False
        
        self.paper_trading['USDT'] -= cost
        
        trade = {
            'type': 'BUY',
            'symbol': symbol,
            'quantity': quantity,
            'price': price,
            'cost': cost,
            'timestamp': datetime.now().isoformat()
        }
        self.trades.append(trade)
        self.print_status(f"✓ BUY: {quantity:.8f} {symbol_key} @ ${price:.2f} (Cost: ${cost:.2f})")
        self.print_status(f"   Remaining USDT: ${self.paper_trading['USDT']:.2f}")
        return True
    
    def paper_trade_sell(self, symbol, quantity, price):
        """Execute a paper trade sell with validation"""
        if price is None or price <= 0:
            self.print_status(f"✗ Cannot execute sell: Invalid price {price}")
            return False
        
        if quantity <= 0:
            self.print_status(f"✗ Cannot execute sell: Invalid quantity {quantity}")
            return False
        
        # Determine asset key and check balance
        if symbol == 'BTCUSDT':
            symbol_key = 'BTC'
            if self.paper_trading['BTC'] < quantity:
                self.print_status(f"⚠ Insufficient {symbol_key} balance. Have: {self.paper_trading['BTC']:.8f}, Need: {quantity:.8f}")
                return False
            self.paper_trading['BTC'] -= quantity
        elif symbol == 'ETHUSDT':
            symbol_key = 'ETH'
            if self.paper_trading['ETH'] < quantity:
                self.print_status(f"⚠ Insufficient {symbol_key} balance. Have: {self.paper_trading['ETH']:.8f}, Need: {quantity:.8f}")
                return False
            self.paper_trading['ETH'] -= quantity
        elif symbol == 'BNBUSDT':
            symbol_key = 'BNB'
            if self.paper_trading['BNB'] < quantity:
                self.print_status(f"⚠ Insufficient {symbol_key} balance. Have: {self.paper_trading['BNB']:.8f}, Need: {quantity:.8f}")
                return False
            self.paper_trading['BNB'] -= quantity
        else:
            self.print_status(f"✗ Unknown symbol: {symbol}")
            return False
        
        proceeds = quantity * price
        self.paper_trading['USDT'] += proceeds
        
        trade = {
            'type': 'SELL',
            'symbol': symbol,
            'quantity': quantity,
            'price': price,
            'proceeds': proceeds,
            'timestamp': datetime.now().isoformat()
        }
        self.trades.append(trade)
        self.print_status(f"✓ SELL: {quantity:.8f} {symbol_key} @ ${price:.2f} (Proceeds: ${proceeds:.2f})")
        self.print_status(f"   Total USDT: ${self.paper_trading['USDT']:.2f}")
        return True
    
    def get_portfolio_value(self):
        """Calculate total portfolio value in USDT"""
        try:
            total = self.paper_trading['USDT']
            
            if self.paper_trading['BTC'] > 0:
                btc_price = self.get_current_price('BTCUSDT')
                if btc_price:
                    total += self.paper_trading['BTC'] * btc_price
            
            if self.paper_trading['ETH'] > 0:
                eth_price = self.get_current_price('ETHUSDT')
                if eth_price:
                    total += self.paper_trading['ETH'] * eth_price
            
            if self.paper_trading['BNB'] > 0:
                bnb_price = self.get_current_price('BNBUSDT')
                if bnb_price:
                    total += self.paper_trading['BNB'] * bnb_price
            
            return total
        except Exception as e:
            self.print_status(f"Error calculating portfolio value: {e}")
            return self.paper_trading['USDT']
    
    def execute_trading_strategy(self, symbols, buy_threshold=-5, sell_threshold=5, trade_amount_percent=2):
        """
        Execute trading strategy based on 24-hour price changes
        
        Args:
            symbols: List of trading symbols
            buy_threshold: Buy when 24h change < this value
            sell_threshold: Sell when 24h change > this value
            trade_amount_percent: Percentage of portfolio to use per trade
        """
        self.print_status("=" * 70)
        self.print_status("Executing Trading Strategy")
        self.print_status("=" * 70)
        
        for symbol in symbols:
            try:
                price = self.get_current_price(symbol)
                change_24h = self.get_24h_change(symbol)
                
                if price is None or price <= 0:
                    self.print_status(f"⚠ Skipping {symbol}: Invalid price data ({price})")
                    continue
                
                self.print_status(f"\n📊 {symbol}: Price=${price:.2f}, 24h Change={change_24h:.2f}%")
                
                portfolio_value = self.get_portfolio_value()
                trade_amount = (portfolio_value * trade_amount_percent) / 100
                quantity = trade_amount / price
                
                # BUY signal: Price is down significantly
                if change_24h < buy_threshold:
                    self.print_status(f"📈 BUY Signal: Price down {change_24h:.2f}% (threshold: {buy_threshold}%)")
                    self.paper_trade_buy(symbol, quantity, price)
                
                # SELL signal: Price is up significantly
                elif change_24h > sell_threshold:
                    self.print_status(f"📉 SELL Signal: Price up {change_24h:.2f}% (threshold: {sell_threshold}%)")
                    
                    # Get the asset quantity
                    if symbol == 'BTCUSDT':
                        hold_quantity = self.paper_trading['BTC']
                    elif symbol == 'ETHUSDT':
                        hold_quantity = self.paper_trading['ETH']
                    elif symbol == 'BNBUSDT':
                        hold_quantity = self.paper_trading['BNB']
                    else:
                        hold_quantity = 0
                    
                    if hold_quantity > 0:
                        self.paper_trade_sell(symbol, hold_quantity, price)
                    else:
                        self.print_status(f"⏸ No holdings to sell")
                else:
                    self.print_status(f"⏸ No trading signal (within thresholds)")
                
            except Exception as e:
                self.print_status(f"✗ Error processing {symbol}: {e}")
        
        # Print portfolio summary
        self.print_portfolio_summary()
    
    def print_portfolio_summary(self):
        """Print paper trading portfolio summary"""
        self.print_status("\n" + "=" * 70)
        self.print_status("📋 Portfolio Summary")
        self.print_status("=" * 70)
        self.print_status(f"USDT Cash: ${self.paper_trading['USDT']:.2f}")
        
        if self.paper_trading['BTC'] > 0:
            btc_price = self.get_current_price('BTCUSDT')
            btc_value = self.paper_trading['BTC'] * btc_price if btc_price else 0
            self.print_status(f"BTC: {self.paper_trading['BTC']:.8f} (${btc_value:.2f})")
        
        if self.paper_trading['ETH'] > 0:
            eth_price = self.get_current_price('ETHUSDT')
            eth_value = self.paper_trading['ETH'] * eth_price if eth_price else 0
            self.print_status(f"ETH: {self.paper_trading['ETH']:.8f} (${eth_value:.2f})")
        
        if self.paper_trading['BNB'] > 0:
            bnb_price = self.get_current_price('BNBUSDT')
            bnb_value = self.paper_trading['BNB'] * bnb_price if bnb_price else 0
            self.print_status(f"BNB: {self.paper_trading['BNB']:.8f} (${bnb_value:.2f})")
        
        portfolio_value = self.get_portfolio_value()
        initial_value = 10000
        pnl = portfolio_value - initial_value
        pnl_percent = (pnl / initial_value) * 100 if initial_value > 0 else 0
        
        self.print_status(f"\nTotal Portfolio Value: ${portfolio_value:.2f}")
        self.print_status(f"P&L: ${pnl:.2f} ({pnl_percent:+.2f}%)")
        self.print_status(f"Total Trades Executed: {len(self.trades)}")
        self.print_status("=" * 70 + "\n")
    
    def run_continuous_trading(self, symbols, interval=120):
        """
        Run trading strategy continuously
        
        Args:
            symbols: List of trading symbols
            interval: Interval in seconds between trades
        """
        self.print_status(f"🤖 Starting continuous trading every {interval} seconds...")
        self.print_status(f"📍 Monitoring symbols: {symbols}\n")
        
        try:
            iteration = 0
            while True:
                iteration += 1
                self.print_status(f"\n--- Trading Cycle #{iteration} ---")
                self.execute_trading_strategy(symbols)
                self.print_status(f"⏳ Next trade check in {interval} seconds...")
                time.sleep(interval)
        except KeyboardInterrupt:
            self.print_status("\n\n🛑 Trading stopped by user")
            self.print_portfolio_summary()


if __name__ == "__main__":
    try:
        # Get configuration from environment
        symbols_env = os.getenv('TRADING_SYMBOLS', 'BTCUSDT,ETHUSDT,BNBUSDT')
        symbols = [s.strip() for s in symbols_env.split(',')]
        trade_interval = int(os.getenv('TRADE_INTERVAL', '120'))  # 2 minutes default
        
        # Initialize and run trading bot
        bot = TradingBot()
        bot.run_continuous_trading(symbols, interval=trade_interval)
    except Exception as e:
        print(f"✗ Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
