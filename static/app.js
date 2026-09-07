(() => {
  const urlInput = document.getElementById("url-input");
  const pasteBtn = document.getElementById("paste-btn");
  const mediaSection = document.getElementById("media-section");
  const thumbEl = document.getElementById("media-thumb");
  const durationEl = document.getElementById("media-duration");
  const titleEl = document.getElementById("media-title");
  const metaEl = document.getElementById("media-meta");
  const videoOptionsEl = document.getElementById("video-options");
  const audioOptionsEl = document.getElementById("audio-options");
  const downloadBtn = document.getElementById("download-btn");
  const downloadBtnLabel = document.getElementById("download-btn-label");
  const statusEl = document.getElementById("status-text");
  const errorEl = document.getElementById("error-text");

  let currentUrl = null;
  let selectedQuality = "1080";
  let pollHandle = null;

  function fmtDuration(sec) {
    if (!sec && sec !== 0) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }
  function clearError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  function renderQualityOption(container, name, key, label, size, checked) {
    const wrapper = document.createElement("label");
    wrapper.className = "cursor-pointer relative";
    wrapper.innerHTML = `
      <input class="peer sr-only" name="${name}" type="radio" value="${key}" ${checked ? "checked" : ""}/>
      <div class="w-full flex items-center justify-between p-3 rounded-xl border border-surface-variant bg-surface peer-checked:bg-on-background peer-checked:text-on-secondary peer-checked:border-on-background transition-colors hover:bg-surface-container-low">
        <span class="font-label-caps text-label-caps">${label}</span>
        <span class="font-body-sm text-body-sm text-secondary peer-checked:text-secondary-fixed">${size || "—"}</span>
      </div>`;
    const input = wrapper.querySelector("input");
    input.addEventListener("change", () => {
      selectedQuality = key;
    });
    container.appendChild(wrapper);
  }

  async function fetchInfo() {
    const url = urlInput.value.trim();
    if (!url) return;
    clearError();
    statusEl.textContent = "Fetching media info…";
    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Could not fetch info");
        statusEl.textContent = "";
        return;
      }
      currentUrl = url;
      titleEl.textContent = data.title;
      metaEl.textContent = [data.uploader, data.view_count ? `${data.view_count.toLocaleString()} views` : null]
        .filter(Boolean).join(" • ");
      durationEl.textContent = fmtDuration(data.duration);
      if (data.thumbnail) thumbEl.src = data.thumbnail;

      videoOptionsEl.innerHTML = "";
      audioOptionsEl.innerHTML = "";
      renderQualityOption(videoOptionsEl, "video_quality", "1080", "1080p MP4", data.qualities["1080"], true);
      renderQualityOption(videoOptionsEl, "video_quality", "720", "720p MP4", data.qualities["720"], false);
      renderQualityOption(videoOptionsEl, "video_quality", "480", "480p MP4", data.qualities["480"], false);
      renderQualityOption(audioOptionsEl, "audio_quality", "audio320", "MP3 320kbps", data.qualities["audio320"], false);
      renderQualityOption(audioOptionsEl, "audio_quality", "audio128", "MP3 128kbps", data.qualities["audio128"], false);
      selectedQuality = "1080";

      mediaSection.classList.remove("hidden");
      statusEl.textContent = "";
    } catch (e) {
      showError("Network error contacting the backend.");
      statusEl.textContent = "";
    }
  }

  // Also select audio radios into the same "selectedQuality" via delegated listener
  document.addEventListener("change", (e) => {
    if (e.target.matches('input[name="audio_quality"]')) {
      selectedQuality = e.target.value;
      document.querySelectorAll('input[name="video_quality"]').forEach((r) => (r.checked = false));
    }
    if (e.target.matches('input[name="video_quality"]')) {
      selectedQuality = e.target.value;
      document.querySelectorAll('input[name="audio_quality"]').forEach((r) => (r.checked = false));
    }
  });

  async function pollProgress(jobId) {
    try {
      const res = await fetch(`/api/progress/${jobId}`);
      const job = await res.json();
      if (job.status === "downloading") {
        downloadBtnLabel.textContent = `Downloading ${job.percent || ""}`.trim();
        statusEl.textContent = [job.speed, job.eta ? `ETA ${job.eta}` : ""].filter(Boolean).join(" • ");
      } else if (job.status === "processing") {
        downloadBtnLabel.textContent = "Processing…";
      } else if (job.status === "finished") {
        clearInterval(pollHandle);
        downloadBtnLabel.textContent = "Download Now";
        downloadBtn.disabled = false;
        statusEl.textContent = "Done — saving to your device…";
        window.location.href = `/api/file/${jobId}`;
      } else if (job.status === "error") {
        clearInterval(pollHandle);
        downloadBtnLabel.textContent = "Download Now";
        downloadBtn.disabled = false;
        showError(job.error || "Download failed.");
        statusEl.textContent = "";
      }
    } catch {
      // transient network hiccup; keep polling
    }
  }

  async function startDownload() {
    if (!currentUrl) return;
    clearError();
    downloadBtn.disabled = true;
    downloadBtnLabel.textContent = "Starting…";
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: currentUrl, quality: selectedQuality }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Could not start download");
        downloadBtn.disabled = false;
        downloadBtnLabel.textContent = "Download Now";
        return;
      }
      pollHandle = setInterval(() => pollProgress(data.job_id), 1000);
    } catch {
      showError("Network error contacting the backend.");
      downloadBtn.disabled = false;
      downloadBtnLabel.textContent = "Download Now";
    }
  }

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      urlInput.value = text.trim();
      fetchInfo();
    } catch {
      urlInput.focus();
    }
  });

  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchInfo();
  });
  urlInput.addEventListener("blur", fetchInfo);

  downloadBtn.addEventListener("click", startDownload);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
})();
