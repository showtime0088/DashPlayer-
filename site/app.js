const els = {
  root: document.documentElement,
  themeToggle: document.querySelector("#themeToggle"),
  video: document.querySelector("#video"),
  videoInput: document.querySelector("#videoInput"),
  subtitleInput: document.querySelector("#subtitleInput"),
  emptyState: document.querySelector("#emptyState"),
  subtitleOverlay: document.querySelector("#subtitleOverlay"),
  subtitleList: document.querySelector("#subtitleList"),
  subtitleSearch: document.querySelector("#subtitleSearch"),
  currentSentence: document.querySelector("#currentSentence"),
  prevLine: document.querySelector("#prevLine"),
  repeatLine: document.querySelector("#repeatLine"),
  nextLine: document.querySelector("#nextLine"),
  speedSelect: document.querySelector("#speedSelect"),
  restoreSound: document.querySelector("#restoreSound"),
  refreshAudioStatus: document.querySelector("#refreshAudioStatus"),
  audioStatus: document.querySelector("#audioStatus"),
  copyCurrent: document.querySelector("#copyCurrent"),
  lookupInput: document.querySelector("#lookupInput"),
  lookupButton: document.querySelector("#lookupButton"),
  lookupSelected: document.querySelector("#lookupSelected"),
  lookupResult: document.querySelector("#lookupResult"),
  aiBaseUrl: document.querySelector("#aiBaseUrl"),
  aiKey: document.querySelector("#aiKey"),
  aiModel: document.querySelector("#aiModel"),
  aiPrompt: document.querySelector("#aiPrompt"),
  saveAiConfig: document.querySelector("#saveAiConfig"),
  askAi: document.querySelector("#askAi"),
  aiResult: document.querySelector("#aiResult"),
};

const state = {
  subtitles: [],
  filteredIndexes: [],
  activeIndex: -1,
  videoUrl: "",
  videoFile: null,
  audioCheckTimer: 0,
};

const defaultAiPrompt =
  "请用中文解释这句英文字幕，包含：1. 直译；2. 自然表达；3. 重点词组；4. 适合跟读的发音提示。字幕：";

function initTheme() {
  const saved = localStorage.getItem("dashplayer-web-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(saved || (prefersDark ? "dark" : "light"));
}

function setTheme(theme) {
  els.root.dataset.theme = theme;
  els.themeToggle.textContent = theme === "dark" ? "☀" : "☾";
  localStorage.setItem("dashplayer-web-theme", theme);
}

function loadAiConfig() {
  const config = JSON.parse(localStorage.getItem("dashplayer-ai-config") || "{}");
  els.aiBaseUrl.value = config.baseUrl || "https://api.openai.com/v1/chat/completions";
  els.aiKey.value = config.apiKey || "";
  els.aiModel.value = config.model || "";
  els.aiPrompt.value = config.prompt || defaultAiPrompt;
}

function saveAiConfig() {
  localStorage.setItem(
    "dashplayer-ai-config",
    JSON.stringify({
      baseUrl: els.aiBaseUrl.value.trim(),
      apiKey: els.aiKey.value.trim(),
      model: els.aiModel.value.trim(),
      prompt: els.aiPrompt.value.trim() || defaultAiPrompt,
    }),
  );
  els.aiResult.textContent = "已保存到当前浏览器。正式上线时，建议改成后端代理，避免 API Key 暴露在网页里。";
}

function getFileExtension(file) {
  const match = file?.name?.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function getBrowserSupportHint(file) {
  if (!file) return "尚未选择视频。";

  const extension = getFileExtension(file);
  const type = file.type || "";
  const support = type ? els.video.canPlayType(type) : "";
  const commonSafeFormats = ["mp4", "m4v", "mov", "webm", "mp3", "m4a", "wav", "ogg"];
  const riskyFormats = ["mkv", "avi", "rmvb", "flv", "ts", "m2ts"];

  if (support === "probably") return `浏览器报告可以播放：${type}`;
  if (support === "maybe") return `浏览器报告可能可以播放：${type}`;

  if (riskyFormats.includes(extension)) {
    return `${extension.toUpperCase()} 在 Windows 浏览器里经常出现有画面没声音，尤其是 AC3、EAC3、DTS 音轨。建议转成 MP4(H.264 + AAC)。`;
  }

  if (commonSafeFormats.includes(extension)) {
    return `文件扩展名 ${extension.toUpperCase()} 通常可播放；如果没声音，优先检查系统音量、浏览器标签页是否静音，以及视频音频编码是否为 AAC/MP3/Opus。`;
  }

  return "无法从文件类型判断兼容性。网页播放器依赖浏览器解码能力，推荐 MP4(H.264 + AAC)。";
}

function getAudioTrackSummary() {
  const tracks = els.video.audioTracks;
  if (!tracks) return "当前浏览器没有暴露音轨列表。";
  if (!tracks.length) return "浏览器没有检测到可用音轨。";
  return Array.from(tracks)
    .map((track, index) => `音轨 ${index + 1}: ${track.label || "未命名"} ${track.enabled ? "已启用" : "未启用"}`)
    .join("；");
}

function restoreSound() {
  els.video.defaultMuted = false;
  els.video.muted = false;
  els.video.volume = 1;

  const tracks = els.video.audioTracks;
  if (tracks?.length) {
    Array.from(tracks).forEach((track, index) => {
      track.enabled = index === 0;
    });
  }

  updateAudioStatus("已尝试取消静音、音量调到 100%，并启用第一个音轨。");
}

function updateAudioStatus(prefix = "") {
  const file = state.videoFile;
  const decodedBytes = Number(els.video.webkitAudioDecodedByteCount || 0);
  const decodedText = decodedBytes ? `${Math.round(decodedBytes / 1024)} KB` : "暂未检测到";
  const statusItems = [
    `文件：${file ? file.name : "未选择"}`,
    `音量：${Math.round(els.video.volume * 100)}%，${els.video.muted ? "已静音" : "未静音"}`,
    `音轨：${getAudioTrackSummary()}`,
    `已解码音频：${decodedText}`,
    `兼容性：${getBrowserSupportHint(file)}`,
  ];

  if (file && !els.video.muted && els.video.volume > 0 && els.video.readyState >= 2 && !decodedBytes) {
    statusItems.push("如果视频已经播放但仍然没有声音，最常见原因是音频编码不被 Windows 浏览器支持。");
  }

  els.audioStatus.innerHTML = `
    ${prefix ? `<strong>${escapeHtml(prefix)}</strong>` : ""}
    <ul>
      ${statusItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function scheduleAudioStatusUpdates() {
  window.clearInterval(state.audioCheckTimer);
  state.audioCheckTimer = window.setInterval(() => {
    if (!state.videoFile) return;
    updateAudioStatus();
  }, 2500);
}

function parseTimestamp(value) {
  const clean = value.trim().replace(",", ".");
  const parts = clean.split(":");
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function parseSubtitleFile(raw) {
  const normalized = raw
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .replace(/^WEBVTT.*\n+/i, "");

  const blocks = normalized.split(/\n{2,}/);
  const entries = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex === -1) continue;

    const [startRaw, endRaw] = lines[timeLineIndex].split("-->").map((item) => item.trim().split(/\s+/)[0]);
    const text = lines.slice(timeLineIndex + 1).join("\n").replace(/<[^>]+>/g, "");
    if (!text) continue;

    entries.push({
      start: parseTimestamp(startRaw),
      end: parseTimestamp(endRaw),
      text,
    });
  }

  return entries
    .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.end) && entry.end >= entry.start)
    .sort((a, b) => a.start - b.start);
}

function findActiveSubtitle(time) {
  let low = 0;
  let high = state.subtitles.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const item = state.subtitles[mid];
    if (time < item.start) {
      high = mid - 1;
    } else if (time > item.end) {
      low = mid + 1;
    } else {
      return mid;
    }
  }

  return -1;
}

function setActiveSubtitle(index, shouldScroll = true) {
  if (state.activeIndex === index) return;

  const previous = els.subtitleList.querySelector(".subtitle-item.active");
  if (previous) previous.classList.remove("active");

  state.activeIndex = index;
  const item = state.subtitles[index];

  if (!item) {
    els.subtitleOverlay.classList.remove("visible");
    els.subtitleOverlay.textContent = "";
    els.currentSentence.textContent = state.subtitles.length ? "当前时间没有字幕。" : "还没有加载字幕。";
    return;
  }

  els.subtitleOverlay.classList.add("visible");
  els.subtitleOverlay.innerHTML = `<span>${escapeHtml(item.text)}</span>`;
  els.currentSentence.textContent = item.text;

  const activeButton = els.subtitleList.querySelector(`[data-index="${index}"]`);
  if (activeButton) {
    activeButton.classList.add("active");
    if (shouldScroll) activeButton.scrollIntoView({ block: "nearest" });
  }
}

function renderSubtitles() {
  const query = els.subtitleSearch.value.trim().toLowerCase();
  state.filteredIndexes = state.subtitles
    .map((_, index) => index)
    .filter((index) => !query || state.subtitles[index].text.toLowerCase().includes(query));

  if (!state.subtitles.length) {
    els.subtitleList.innerHTML = '<div class="notice">加载 SRT 或 VTT 字幕后，这里会显示完整字幕列表。</div>';
    return;
  }

  if (!state.filteredIndexes.length) {
    els.subtitleList.innerHTML = '<div class="notice">没有匹配的字幕。</div>';
    return;
  }

  const html = state.filteredIndexes
    .map((index) => {
      const item = state.subtitles[index];
      const activeClass = index === state.activeIndex ? " active" : "";
      return `
        <button class="subtitle-item${activeClass}" type="button" data-index="${index}">
          <span class="subtitle-time">${formatTime(item.start)}</span>
          <span class="subtitle-text">${escapeHtml(item.text)}</span>
        </button>
      `;
    })
    .join("");

  els.subtitleList.innerHTML = html;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char];
  });
}

function jumpToSubtitle(index, autoplay = true) {
  const item = state.subtitles[index];
  if (!item) return;
  els.video.currentTime = Math.max(0, item.start + 0.02);
  setActiveSubtitle(index);
  if (autoplay) els.video.play().catch(() => {});
}

function stepSubtitle(direction) {
  if (!state.subtitles.length) return;
  const fallback = findActiveSubtitle(els.video.currentTime);
  const current = state.activeIndex >= 0 ? state.activeIndex : fallback;
  const next = Math.min(Math.max((current < 0 ? 0 : current) + direction, 0), state.subtitles.length - 1);
  jumpToSubtitle(next);
}

function getSelectedText() {
  return window.getSelection().toString().trim();
}

function getCurrentText() {
  return state.subtitles[state.activeIndex]?.text || "";
}

async function lookupWord(word) {
  const clean = word.trim().replace(/[^a-zA-Z' -]/g, "").split(/\s+/)[0];
  if (!clean) {
    els.lookupResult.textContent = "请输入或选中一个英文单词。";
    return;
  }

  els.lookupInput.value = clean;
  els.lookupResult.textContent = "查询中...";

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`);
    if (!response.ok) throw new Error("没有查到这个词。");
    const [entry] = await response.json();
    const phonetic = entry.phonetic || entry.phonetics?.find((item) => item.text)?.text || "";
    const definitions = entry.meanings
      ?.flatMap((meaning) =>
        (meaning.definitions || []).slice(0, 2).map((definition) => {
          const example = definition.example ? `\n  例句：${definition.example}` : "";
          return `- ${meaning.partOfSpeech}: ${definition.definition}${example}`;
        }),
      )
      .slice(0, 5)
      .join("\n");

    els.lookupResult.textContent = `${entry.word}${phonetic ? ` ${phonetic}` : ""}\n${definitions || "没有可展示的释义。"}`;
  } catch (error) {
    els.lookupResult.innerHTML = `<span class="error-text">${escapeHtml(error.message || "查询失败。")}</span>`;
  }
}

async function askAi() {
  const text = getSelectedText() || getCurrentText();
  const baseUrl = els.aiBaseUrl.value.trim();
  const apiKey = els.aiKey.value.trim();
  const model = els.aiModel.value.trim();
  const prompt = els.aiPrompt.value.trim() || defaultAiPrompt;

  if (!text) {
    els.aiResult.textContent = "当前没有可分析的字幕。";
    return;
  }

  if (!baseUrl || !apiKey || !model) {
    els.aiResult.textContent = "请先填写接口地址、API Key 和模型名。";
    return;
  }

  els.aiResult.textContent = "AI 分析中...";

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "你是英语学习助手，回答要简洁、准确、适合中文母语者。",
          },
          {
            role: "user",
            content: `${prompt}\n\n${text}`,
          },
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `接口返回 ${response.status}`);
    }

    const content = data.choices?.[0]?.message?.content || data.output_text || "";
    els.aiResult.textContent = content || "接口返回了结果，但没有找到文本内容。";
  } catch (error) {
    els.aiResult.innerHTML = `<span class="error-text">${escapeHtml(
      `${error.message || "AI 请求失败。"} 如果浏览器提示 CORS，请把这个接口放到你自己的后端代理或边缘函数后面。`,
    )}</span>`;
  }
}

function bindEvents() {
  els.themeToggle.addEventListener("click", () => {
    setTheme(els.root.dataset.theme === "dark" ? "light" : "dark");
  });

  els.videoInput.addEventListener("change", () => {
    const file = els.videoInput.files?.[0];
    if (!file) return;
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    state.videoFile = file;
    state.videoUrl = URL.createObjectURL(file);
    els.video.src = state.videoUrl;
    restoreSound();
    scheduleAudioStatusUpdates();
    els.emptyState.classList.add("hidden");
  });

  els.subtitleInput.addEventListener("change", async () => {
    const file = els.subtitleInput.files?.[0];
    if (!file) return;
    const raw = await file.text();
    state.subtitles = parseSubtitleFile(raw);
    state.activeIndex = -1;
    renderSubtitles();
    setActiveSubtitle(findActiveSubtitle(els.video.currentTime));
  });

  els.video.addEventListener("timeupdate", () => {
    setActiveSubtitle(findActiveSubtitle(els.video.currentTime));
  });

  els.video.addEventListener("loadedmetadata", () => {
    els.video.playbackRate = Number(els.speedSelect.value);
    restoreSound();
  });

  els.video.addEventListener("volumechange", () => {
    updateAudioStatus();
  });

  els.video.addEventListener("playing", () => {
    updateAudioStatus("正在播放。");
  });

  els.video.addEventListener("error", () => {
    const message = els.video.error?.message || "浏览器无法播放这个文件。";
    updateAudioStatus(`${message} 建议换成 MP4(H.264 + AAC)。`);
  });

  els.speedSelect.addEventListener("change", () => {
    els.video.playbackRate = Number(els.speedSelect.value);
  });

  els.restoreSound.addEventListener("click", restoreSound);
  els.refreshAudioStatus.addEventListener("click", () => updateAudioStatus("已刷新声音状态。"));

  els.prevLine.addEventListener("click", () => stepSubtitle(-1));
  els.nextLine.addEventListener("click", () => stepSubtitle(1));
  els.repeatLine.addEventListener("click", () => {
    const index = state.activeIndex >= 0 ? state.activeIndex : findActiveSubtitle(els.video.currentTime);
    jumpToSubtitle(index >= 0 ? index : 0);
  });

  els.subtitleList.addEventListener("click", (event) => {
    const item = event.target.closest(".subtitle-item");
    if (!item) return;
    jumpToSubtitle(Number(item.dataset.index));
  });

  els.subtitleSearch.addEventListener("input", renderSubtitles);

  els.copyCurrent.addEventListener("click", async () => {
    const text = getCurrentText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    els.currentSentence.textContent = `${text}\n\n已复制。`;
  });

  els.lookupButton.addEventListener("click", () => lookupWord(els.lookupInput.value));
  els.lookupSelected.addEventListener("click", () => lookupWord(getSelectedText() || getCurrentText()));
  els.lookupInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") lookupWord(els.lookupInput.value);
  });

  els.saveAiConfig.addEventListener("click", saveAiConfig);
  els.askAi.addEventListener("click", askAi);

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea, select")) return;
    if (event.key === "ArrowLeft") stepSubtitle(-1);
    if (event.key === "ArrowRight") stepSubtitle(1);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      els.repeatLine.click();
    }
    if (event.key === " ") {
      event.preventDefault();
      if (els.video.paused) els.video.play().catch(() => {});
      else els.video.pause();
    }
  });
}

initTheme();
loadAiConfig();
renderSubtitles();
bindEvents();
