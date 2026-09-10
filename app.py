"""
StreamSnap backend.

Serves the PWA static files AND exposes a small JSON API that wraps
yt_dlp so the phone (browser) never needs to run Python itself.

Run with:
    pip install -r requirements.txt --break-system-packages
    python3 app.py

Then, on your phone (same Wi-Fi network), open:
    http://<this-machine's-LAN-IP>:8000
and "Add to Home Screen" to install it as a PWA.
"""
import os
import uuid
import threading
import traceback
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory, abort
import yt_dlp

BASE_DIR = Path(__file__).parent.resolve()
DOWNLOAD_DIR = BASE_DIR / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

app = Flask(__name__, static_folder="static", static_url_path="")

# In-memory job store: job_id -> dict(status, percent, speed, eta, filename, error)
JOBS = {}
JOBS_LOCK = threading.Lock()

QUALITY_MAP = {
    "1080": {"format": "bestvideo[height<=1080]+bestaudio/best[height<=1080]"},
    "720":  {"format": "bestvideo[height<=720]+bestaudio/best[height<=720]"},
    "480":  {"format": "bestvideo[height<=480]+bestaudio/best[height<=480]"},
    "audio320": {"format": "bestaudio/best", "audio": True, "bitrate": "320"},
    "audio128": {"format": "bestaudio/best", "audio": True, "bitrate": "128"},
}


def human_size(n):
    if not n:
        return None
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/info", methods=["POST"])
def api_info():
    data = request.get_json(force=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "Missing url"}), 400

    ydl_opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        return jsonify({"error": f"Invalid link or restricted video: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    formats = info.get("formats", [])

    def best_size_for_height(max_h):
        candidates = [
            f for f in formats
            if f.get("height") and f["height"] <= max_h and f.get("vcodec") != "none"
        ]
        if not candidates:
            return None
        best = max(candidates, key=lambda f: f.get("height") or 0)
        size = best.get("filesize") or best.get("filesize_approx")
        return human_size(size)

    audio_candidates = [f for f in formats if f.get("vcodec") == "none" and f.get("acodec") != "none"]
    audio_size = None
    if audio_candidates:
        best_audio = max(audio_candidates, key=lambda f: f.get("abr") or 0)
        audio_size = human_size(best_audio.get("filesize") or best_audio.get("filesize_approx"))

    result = {
        "title": info.get("title", "Untitled"),
        "uploader": info.get("uploader", ""),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
        "view_count": info.get("view_count"),
        "qualities": {
            "1080": best_size_for_height(1080),
            "720": best_size_for_height(720),
            "480": best_size_for_height(480),
            "audio320": audio_size,
            "audio128": audio_size,
        },
    }
    return jsonify(result)


def _run_download(job_id, url, quality_key):
    opts_spec = QUALITY_MAP[quality_key]
    job_dir = DOWNLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    def hook(d):
        with JOBS_LOCK:
            job = JOBS.get(job_id)
            if not job:
                return
            if d["status"] == "downloading":
                job["status"] = "downloading"
                job["percent"] = (d.get("_percent_str") or "").strip()
                job["speed"] = (d.get("_speed_str") or "").strip()
                job["eta"] = (d.get("_eta_str") or "").strip()
            elif d["status"] == "finished":
                job["status"] = "processing"

    ydl_opts = {
        "format": opts_spec["format"],
        "outtmpl": str(job_dir / "%(title)s.%(ext)s"),
        "progress_hooks": [hook],
        "quiet": True,
        "no_warnings": True,
    }
    if opts_spec.get("audio"):
        ydl_opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": opts_spec.get("bitrate", "192"),
        }]

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(url, download=True)
        files = list(job_dir.glob("*"))
        if not files:
            raise RuntimeError("No output file produced")
        filename = files[0].name
        with JOBS_LOCK:
            JOBS[job_id].update({"status": "finished", "filename": filename, "percent": "100%"})
    except Exception as e:
        traceback.print_exc()
        with JOBS_LOCK:
            JOBS[job_id].update({"status": "error", "error": str(e)})


@app.route("/api/download", methods=["POST"])
def api_download():
    data = request.get_json(force=True) or {}
    url = (data.get("url") or "").strip()
    quality = data.get("quality")
    if not url or quality not in QUALITY_MAP:
        return jsonify({"error": "Missing or invalid url/quality"}), 400

    job_id = uuid.uuid4().hex
    with JOBS_LOCK:
        JOBS[job_id] = {"status": "queued", "percent": "0%", "speed": "", "eta": ""}

    t = threading.Thread(target=_run_download, args=(job_id, url, quality), daemon=True)
    t.start()
    return jsonify({"job_id": job_id})


@app.route("/api/progress/<job_id>")
def api_progress(job_id):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job:
            return jsonify({"error": "Unknown job"}), 404
        return jsonify(job)


@app.route("/api/file/<job_id>")
def api_file(job_id):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
    if not job or job.get("status") != "finished":
        abort(404)
    job_dir = DOWNLOAD_DIR / job_id
    return send_from_directory(job_dir, job["filename"], as_attachment=True)


if __name__ == "__main__":
    # host="0.0.0.0" so your phone can reach it over the LAN
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True)


