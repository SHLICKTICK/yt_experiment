"""
NGROK SETUP GUIDE FOR STREAMSNAP
=================================

WHAT IS NGROK?
--------------
Ngrok creates a secure tunnel from the public internet to your local computer.
It gives you a temporary public URL (like https://abc123.ngrok.io) that forwards
all traffic to your local server running on port 8000.

WHY USE NGROK FOR STREAMSNAP?
------------------------------
- Access StreamSnap from your phone ANYWHERE (not just same Wi-Fi)
- No router configuration needed
- Works behind firewalls and NAT
- HTTPS enabled automatically (secure connection)

⚠️  SECURITY WARNING ⚠️
------------------------
Your StreamSnap app has NO authentication. Anyone with the ngrok URL can:
- Download videos using your bandwidth
- Potentially abuse the service
- Access your download history

RECOMMENDED: Add token-based authentication before exposing publicly.

STEP-BY-STEP SETUP
==================

STEP 1: Install ngrok
---------------------
Choose your method:

METHOD A - Using pip (Python):
    pip install pyngrok --break-system-packages

METHOD B - Using system package manager:
    macOS:  brew install ngrok
    Ubuntu: sudo snap install ngrok
    Windows: Download from https://ngrok.com/download

METHOD C - Direct download:
    Visit https://ngrok.com/download and download for your OS


STEP 2: Sign Up for Free Account (Required)
--------------------------------------------
1. Go to https://ngrok.com/signup
2. Create free account
3. Get your authtoken from dashboard
4. Run: ngrok config add-authtoken YOUR_TOKEN_HERE

   OR if using pyngrok:
   from pyngrok import ngrok
   ngrok.set_auth_token("YOUR_TOKEN_HERE")


STEP 3: Start StreamSnap with ngrok
------------------------------------
OPTION A - Using the helper script (recommended):
    python3 start_with_ngrok.py

OPTION B - Manual two-step process:
    Terminal 1: python3 app.py
    Terminal 2: ngrok http 8000

OPTION C - Using pyngrok in Python:
    See start_with_ngrok.py for implementation


STEP 4: Get Your Public URL
----------------------------
After starting ngrok, you'll see output like:

    Forwarding: https://abc123def456.ngrok.io -> http://localhost:8000

Copy the HTTPS URL (e.g., https://abc123def456.ngrok.io)


STEP 5: Access from Mobile
---------------------------
1. On your phone, open browser
2. Navigate to: https://YOUR_NGROK_URL.ngrok.io
3. Tap "Share" → "Add to Home Screen" (iOS) or menu → "Install" (Android)
4. Use as native app!


STEP 6: Share with Others (Optional)
-------------------------------------
Send the ngrok URL to anyone. They can access from anywhere in the world.

⚠️ Remember: This exposes your app to the public internet!


IMPORTANT NOTES
===============

URL Changes on Restart:
- Free ngrok URLs change every time you restart
- Paid plans offer reserved domains

Rate Limits (Free Tier):
- Limited bandwidth per month
- Connection time limits
- Check ngrok.com/pricing for details

Security Recommendations:
1. Add authentication (see AUTH_TOKEN in app.py)
2. Only share URL with trusted people
3. Monitor usage
4. Consider setting up CORS restrictions
5. Add rate limiting

Troubleshooting:
- If ngrok fails, check your auth token
- Ensure port 8000 is not blocked by firewall
- Verify app.py is running first
- Check ngrok dashboard at http://127.0.0.1:4040


ALTERNATIVE: TAILSCALE
======================
For more secure, permanent access without public exposure:
1. Install Tailscale on computer and phone
2. Both devices join same Tailscale network
3. Access via Tailscale IP address
4. No public exposure, encrypted end-to-end

"""

print(__doc__)
