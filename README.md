# StreamSnap — PWA Media Downloader

A single-page PWA frontend (installable on Android) backed by a small
Flask + yt-dlp server. Built for personal use.

## How it works

- **Backend** (`app.py`): runs on your computer/home server, does the
  actual downloading via `yt_dlp`, serves the finished file.
- **Frontend** (`static/`): the installable PWA. It's just HTML/CSS/JS
  — it calls the backend's JSON API and never runs Python itself.

Your phone and the backend need to be reachable from each other
(same Wi-Fi network is simplest).

## 1. Run the backend

```bash
cd streamsnap
pip install -r requirements.txt --break-system-packages   # or use a venv
# ffmpeg is required for MP3 audio extraction:
#   sudo apt install ffmpeg      (Linux)
#   brew install ffmpeg          (macOS)
python3 app.py
```

This starts the server on `http://0.0.0.0:8000`.

Find your computer's LAN IP:
- macOS: `ipconfig getifaddr en0`
- Linux: `hostname -I`
- Windows: `ipconfig` (look for IPv4 Address)

## 2. Install on your Android phone

1. Make sure your phone is on the **same Wi-Fi network**.
2. Open Chrome on the phone and go to `http://<your-computer-ip>:8000`.
3. Tap the Chrome menu (⋮) → **"Add to Home screen"** / **"Install app"**.
4. Launch it from the home screen icon — it now runs full-screen, no
   browser chrome, like a native app.

## 3. Using it

1. Paste (or type) a media URL.
2. Info, thumbnail, and available qualities load automatically.
3. Pick a video quality or an audio-only option.
4. Tap **Download Now** — progress shows live, and when it's done the
   file is handed to your phone's browser, which saves it to your
   normal **Downloads** folder.

## Notes / next steps

- **Persistent/remote access**: if you want this to work outside your
  home Wi-Fi (e.g. away from home), you'd host the backend on a small
  VPS, or tunnel it (Tailscale/ngrok), and point the PWA at that
  address instead.
- **Auth**: this backend has no login — anyone on your network (or
  with the tunnel URL) can use it. Fine for personal use on a trusted
  network; add a simple token/password check in `app.py` before
  exposing it more broadly.
- **Job cleanup**: downloaded files accumulate in `downloads/<job_id>/`
  on the server. Add a cleanup routine (e.g. delete job folders older
  than a day) if you'll be using this a lot.
- **Icons**: placeholder icons are in `static/icons/` — swap in your
  own branding if you like.
