(() => {
  const urlInput = document.getElementById("url-input");
  const pasteBtn = document.getElementById("paste-btn");
  const mediaSection = document.getElementById("media-section");
  const loadingSection = document.getElementById("loading-section");
  const resultsSeparator = document.getElementById("results-separator");
  const mediaSection2 = document.getElementById("media-section-2");
  const progressSection = document.getElementById("progress-section");
  const progressBar = document.getElementById("progress-bar");
  const progressPercent = document.getElementById("progress-percent");
  const progressSpeed = document.getElementById("progress-speed");
  const progressEta = document.getElementById("progress-eta");
  const thumbEl = document.getElementById("media-thumb");
  const durationEl = document.getElementById("media-duration");
  const titleEl = document.getElementById("media-title");
  const metaEl = document.getElementById("media-meta");
  const videoOptionsEl = document.getElementById("video-options");
  const audioOptionsEl = document.getElementById("audio-options");
  const downloadBtn = document.getElementById("download-btn");
  const downloadBtnLabel = document.getElementById("download-btn-label");
  const downloadIcon = document.getElementById("download-icon");
  const statusEl = document.getElementById("status-text");
  const errorEl = document.getElementById("error-text");
  const successNotification = document.getElementById("success-notification");
  const successMessage = document.getElementById("success-message");
  const historySection = document.getElementById("history-section");
  const historyList = document.getElementById("history-list");
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  
  let currentUrl = null;
  let selectedQuality = "1080";
  let pollHandle = null;
  let downloadHistory = JSON.parse(localStorage.getItem("downloadHistory") || "[]");

  // Initialize theme from localStorage or system preference
  function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      themeIcon.textContent = "light_mode";
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      themeIcon.textContent = "dark_mode";
    }
  }
  
  // Toggle dark/light mode
  function toggleTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      themeIcon.textContent = "dark_mode";
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      themeIcon.textContent = "light_mode";
      localStorage.setItem("theme", "dark");
    }
  }

  function fmtDuration(sec) {
    if (!sec && sec !== 0) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
    if (navigator.vibrate) navigator.vibrate(50);
  }
  
  function clearError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }
  
  function showSuccess(message) {
    successMessage.textContent = message;
    successNotification.classList.remove("hidden");
    setTimeout(() => {
      successNotification.classList.add("hidden");
    }, 3000);
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
  }
  
  function addToHistory(title, quality, timestamp) {
    downloadHistory.unshift({ title, quality, timestamp, id: Date.now() });
    if (downloadHistory.length > 10) downloadHistory = downloadHistory.slice(0, 10);
    localStorage.setItem("downloadHistory", JSON.stringify(downloadHistory));
    renderHistory();
  }
  
  function renderHistory() {
    if (downloadHistory.length === 0) {
      historySection.classList.add("hidden");
      return;
    }
    
    historyList.innerHTML = downloadHistory.map(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="material-symbols-outlined text-secondary text-[18px]">file_download</span>
            <div class="truncate">
              <p class="font-body-sm text-body-sm text-on-surface truncate">${item.title}</p>
              <p class="font-label-caps text-label-caps text-secondary">${item.quality} • ${timeStr}</p>
            </div>
          </div>
          <span class="material-symbols-outlined text-secondary touch-target" aria-label="Copy to clipboard">content_copy</span>
        </div>
      `;
    }).join("");
    
    historySection.classList.remove("hidden");
  }

  function renderQualityOption(container, name, key, label, size, checked, available = true) {
    const wrapper = document.createElement("label");
    const isUnavailable = !available;
    
    wrapper.className = `relative ${!isUnavailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`;
    wrapper.setAttribute('data-tooltip', !available ? 'Quality not available for this video' : '');
    wrapper.classList.add('tooltip');
    
    wrapper.innerHTML = `
      <input class="peer sr-only" name="${name}" type="radio" value="${key}" ${checked ? "checked" : ""} ${!available ? 'disabled' : ''}/>
      <div class="w-full flex items-center justify-between p-3 rounded-xl border border-surface-variant bg-surface peer-checked:bg-on-background peer-checked:text-on-secondary peer-checked:border-on-background transition-all hover:bg-surface-container-low ${!available ? 'pointer-events-none' : ''}">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-[18px] ${checked ? 'text-primary' : 'text-secondary'}">${checked ? 'check_circle' : 'radio_button_unchecked'}</span>
          <span class="font-label-caps text-label-caps">${label}</span>
        </div>
        <span class="font-body-sm text-body-sm ${checked ? 'text-secondary-fixed' : 'text-secondary'}">${size || "—"}</span>
      </div>`;
    
    const input = wrapper.querySelector("input");
    if (available) {
      input.addEventListener("change", () => {
        selectedQuality = key;
        container.querySelectorAll('.material-symbols-outlined').forEach(icon => {
          icon.textContent = 'radio_button_unchecked';
          icon.classList.remove('text-primary');
          icon.classList.add('text-secondary');
        });
        const parentIcon = wrapper.querySelector('.material-symbols-outlined');
        if (parentIcon) {
          parentIcon.textContent = 'check_circle';
          parentIcon.classList.remove('text-secondary');
          parentIcon.classList.add('text-primary');
        }
      });
    }
    container.appendChild(wrapper);
  }

  async function fetchInfo() {
    const url = urlInput.value.trim();
    if (!url) return;
    
    // Validate URL format
    // const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    // if (!urlPattern.test(url)) {
    //   showError("Please enter a valid URL (e.g., https://youtube.com/watch?v=VIDEO_ID)");
    //   return;
    // }
    
    clearError();
    
    // Show loading state
    loadingSection.classList.remove("hidden");
    mediaSection.classList.add("hidden");
    mediaSection2.classList.add("hidden");
    resultsSeparator.classList.add("hidden");
    
    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Could not fetch info");
        loadingSection.classList.add("hidden");
        return;
      }
      
      loadingSection.classList.add("hidden");
      currentUrl = url;
      titleEl.textContent = data.title;
      metaEl.textContent = [data.uploader, data.view_count ? `${data.view_count.toLocaleString()} views` : null]
        .filter(Boolean).join(" • ");
      durationEl.textContent = fmtDuration(data.duration);
      if (data.thumbnail) thumbEl.src = data.thumbnail;

      videoOptionsEl.innerHTML = "";
      audioOptionsEl.innerHTML = "";
      
      // Render with checkmark icons and availability checking
      const v1080Available = !!data.qualities["1080"];
      const v720Available = !!data.qualities["720"];
      const v480Available = !!data.qualities["480"];
      const a320Available = !!data.qualities["audio320"];
      const a128Available = !!data.qualities["audio128"];
      
      // Determine which video quality to check by default (first available)
      let defaultVideoQuality = "1080";
      if (!v1080Available) {
        defaultVideoQuality = v720Available ? "720" : (v480Available ? "480" : "1080");
      }
      
      // Determine which audio quality to check by default (first available)
      let defaultAudioQuality = "audio320";
      if (!a320Available) {
        defaultAudioQuality = a128Available ? "audio128" : "audio320";
      }
      
      renderQualityOption(videoOptionsEl, "video_quality", "1080", "1080p MP4", data.qualities["1080"], defaultVideoQuality === "1080", v1080Available);
      renderQualityOption(videoOptionsEl, "video_quality", "720", "720p MP4", data.qualities["720"], defaultVideoQuality === "720", v720Available);
      renderQualityOption(videoOptionsEl, "video_quality", "480", "480p MP4", data.qualities["480"], defaultVideoQuality === "480", v480Available);
      renderQualityOption(audioOptionsEl, "audio_quality", "audio320", "MP3 320kbps", data.qualities["audio320"], defaultAudioQuality === "audio320", a320Available);
      renderQualityOption(audioOptionsEl, "audio_quality", "audio128", "MP3 128kbps", data.qualities["audio128"], defaultAudioQuality === "audio128", a128Available);
      
      selectedQuality = defaultVideoQuality;

      mediaSection.classList.remove("hidden");
      mediaSection2.classList.remove("hidden");
      resultsSeparator.classList.remove("hidden");
      statusEl.textContent = "";
    } catch (e) {
      showError("Network error contacting the backend.");
      loadingSection.classList.add("hidden");
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
      
      // Show progress section
      progressSection.classList.remove("hidden");
      
      if (job.status === "downloading") {
        const percent = parseInt(job.percent) || 0;
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        progressSpeed.textContent = job.speed || "";
        progressEta.textContent = job.eta ? `ETA ${job.eta}` : "";
        downloadBtnLabel.textContent = `Downloading...`;
        downloadIcon.textContent = "downloading";
      } else if (job.status === "processing") {
        downloadBtnLabel.textContent = "Processing…";
        downloadIcon.textContent = "settings";
        progressLabel.textContent = "Processing video...";
      } else if (job.status === "finished") {
        clearInterval(pollHandle);
        downloadBtnLabel.textContent = "Download Now";
        downloadIcon.textContent = "download";
        downloadBtn.disabled = false;
        progressSection.classList.add("hidden");
        
        // Add to history
        const qualityLabel = selectedQuality.startsWith("audio") ? 
          (selectedQuality === "audio320" ? "MP3 320kbps" : "MP3 128kbps") :
          `${selectedQuality}p MP4`;
        addToHistory(titleEl.textContent || "Unknown", qualityLabel, new Date().toISOString());
        
        showSuccess("Download started!");
        window.location.href = `/api/file/${jobId}`;
      } else if (job.status === "error") {
        clearInterval(pollHandle);
        downloadBtnLabel.textContent = "Download Now";
        downloadIcon.textContent = "download";
        downloadBtn.disabled = false;
        progressSection.classList.add("hidden");
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
    downloadIcon.textContent = "hourglass_empty";
    progressSection.classList.add("hidden");
    
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
        downloadIcon.textContent = "download";
        return;
      }
      pollHandle = setInterval(() => pollProgress(data.job_id), 1000);
    } catch {
      showError("Network error contacting the backend.");
      downloadBtn.disabled = false;
      downloadBtnLabel.textContent = "Download Now";
      downloadIcon.textContent = "download";
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
  
  urlInput.addEventListener("blur", () => {
    if (urlInput.value.trim()) fetchInfo();
  });
  
  // Show hint on focus
  urlInput.addEventListener("focus", () => {
    document.getElementById("url-hint").classList.remove("hidden");
  });
  
  urlInput.addEventListener("blur", (e) => {
    if (!urlInput.value.trim()) {
      document.getElementById("url-hint").classList.add("hidden");
    }
  });

  downloadBtn.addEventListener("click", startDownload);
  
  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
  
  // Initialize theme on load
  initTheme();
  
  // Render history on load
  renderHistory();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
})();
