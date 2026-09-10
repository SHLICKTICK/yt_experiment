#!/usr/bin/env python3
"""
StreamSnap with ngrok tunnel.

This script starts the Flask app and creates an ngrok tunnel automatically.
You can access StreamSnap from anywhere using the public ngrok URL.

USAGE:
    python3 start_with_ngrok.py

REQUIREMENTS:
    pip install pyngrok flask yt_dlp --break-system-packages

SECURITY WARNING:
    This exposes your app to the public internet!
    Anyone with the URL can use your downloader.
"""

import sys
import time
import threading
from pathlib import Path


# Check if pyngrok is installed
try:
    from pyngrok import ngrok, conf
    #NGROK_AUTHTOKEN = "3J3WguGAYkA0TR9kVpEhGsPBioy_6t3hVTiUtpWJ43RFFFmaY"
except ImportError:
    print("❌ pyngrok not installed!")
    print("\nInstall it with:")
    print("    pip install pyngrok --break-system-packages")
    print("\nThen sign up at https://ngrok.com/signup to get your authtoken")
    print("And run: ngrok config add-authtoken YOUR_TOKEN")
    sys.exit(1)

# Import the Flask app
sys.path.insert(0, str(Path(__file__).parent))
from app import app, DOWNLOAD_DIR


ngrok.set_auth_token("3J3WguGAYkA0TR9kVpEhGsPBioy_6t3hVTiUtpWJ43RFFFmaY")


def start_flask_app():
    """Start the Flask app in a separate thread."""
    print("\n🚀 Starting StreamSnap backend...")
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True, use_reloader=False)

def main():
    print("=" * 60)
    print("🌍 STREAMSNAP WITH NGROK")
    print("=" * 60)
    
    # Check for ngrok auth token
    try:
        # Try to get the current auth token
        current_token = conf.get_default().auth_token
        if not current_token or current_token == "YOUR_AUTH_TOKEN":
            raise ValueError("No auth token configured")
    except Exception:
        print("\n⚠️  Ngrok auth token not configured!")
        print("\nPlease set up ngrok:")
        print("1. Sign up at: https://ngrok.com/signup")
        print("2. Get your authtoken from the dashboard")
        print("3. Run: ngrok config add-authtoken YOUR_TOKEN")
        print("\nOR set it in this script by adding:")
        print('    ngrok.set_auth_token("YOUR_TOKEN_HERE")')
        print("\nExiting...")
        sys.exit(1)
    
    # Create ngrok tunnel
    print("\n🔗 Creating ngrok tunnel to port 8000...")
    try:
        public_url = ngrok.connect(8000)
        print(f"\n✅ Tunnel created successfully!")
    except Exception as e:
        print(f"\n❌ Failed to create tunnel: {e}")
        print("\nTroubleshooting:")
        print("- Check your ngrok auth token")
        print("- Ensure you have an active ngrok account")
        print("- Visit https://dashboard.ngrok.com to check your status")
        sys.exit(1)
    
    # Display the public URL
    print("\n" + "=" * 60)
    print("📱 YOUR STREAMSNAP IS NOW PUBLICLY ACCESSIBLE!")
    print("=" * 60)
    print(f"\n🌐 Public URL: {public_url}")
    print(f"\n📋 Quick actions:")
    print(f"   • Open on phone: {public_url}")
    print(f"   • Share with others: {public_url}")
    print(f"   • Add to home screen for PWA experience")
    
    print("\n⚠️  SECURITY WARNING ⚠️")
    print("-" * 60)
    print("Anyone with this URL can:")
    print("  • Download videos using your bandwidth")
    print("  • Access the service from anywhere")
    print("  • Potentially abuse the downloader")
    print("\nRecommendations:")
    print("  • Only share with trusted people")
    print("  • Monitor usage at: http://127.0.0.1:4040")
    print("  • Consider adding authentication")
    print("  • Close the tunnel when done (Ctrl+C)")
    print("=" * 60)
    
    print("\n📊 Ngrok dashboard: http://127.0.0.1:4040")
    print("   (View traffic, inspect requests, see connections)")
    
    print("\nPress Ctrl+C to stop the server and close the tunnel\n")
    
    # Start Flask app in background thread
    flask_thread = threading.Thread(target=start_flask_app, daemon=True)
    flask_thread.start()
    
    # Keep the main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down...")
        ngrok.disconnect()
        print("✅ Tunnel closed. Goodbye!")

if __name__ == "__main__":
    main()
