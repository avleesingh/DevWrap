/**
 * DevWrap - Dashboard Controller (popup.js)
 * Developer-centric dark dashboard managing Hybrid Telemetry (Web Browser Tabs + Desktop Companion),
 * Live Health Check Connection (127.0.0.1:8080/health), Desktop Stats Ingestion (127.0.0.1:8080/stats),
 * Developer Presets, and Unified Dev Stack Wrapped Generator.
 */

// Application State
let subscriptions = [];
let usageData = {};
let activeSession = null;
let currentFilter = 'all'; // 'all' | 'high' | 'waste'
let desktopConnected = false;
let desktopStats = {};
let simulateDropDay = false;
let forceLocked = false;
let activeWrappedTab = 'card1';
let dropCountdownTimer = null;
let onboardingCompleted = false;

// Desktop Companion Endpoints
const COMPANION_HEALTH_URL = 'http://127.0.0.1:8080/health';
const COMPANION_STATS_URL = 'http://127.0.0.1:8080/stats';
const COMPANION_FILTERS_URL = 'http://127.0.0.1:8080/filters';
let desktopFilters = [];

// DOM Elements
const trackingStatusEl = document.getElementById('trackingStatus');
const trackingStatusLabelEl = document.getElementById('trackingStatusLabel');
const totalSpendEl = document.getElementById('totalSpend');
const subCountEl = document.getElementById('subCount');
const totalHoursEl = document.getElementById('totalHours');
const avgCostPerHourEl = document.getElementById('avgCostPerHour');

// Desktop Companion Status & Modal Elements
const desktopStatusIndicator = document.getElementById('desktopStatusIndicator');
const desktopStatusDot = document.getElementById('desktopStatusDot');
const desktopStatusText = document.getElementById('desktopStatusText');
const downloadCompanionBtn = document.getElementById('downloadCompanionBtn');
const companionModal = document.getElementById('companionModal');
const closeCompanionBtn = document.getElementById('closeCompanionBtn');
const startDownloadBtn = document.getElementById('startDownloadBtn');

const presetsContainer = document.getElementById('presetsContainer');
const toggleAddFormBtn = document.getElementById('toggleAddForm');
const addFormArrow = document.getElementById('addFormArrow');
const addForm = document.getElementById('addForm');
const subNameInput = document.getElementById('subName');
const subCostInput = document.getElementById('subCost');
const subTierSelect = document.getElementById('subTier');
const subPlanNameInput = document.getElementById('subPlanName');
const customPlanNameGroup = document.getElementById('customPlanNameGroup');
const subTrackingType = document.getElementById('subTrackingType');
const subDomainInput = document.getElementById('subDomain');
const autofillCurrentTabBtn = document.getElementById('autofillCurrentTabBtn');
const saveSubBtn = document.getElementById('saveSubBtn');

const filterContainer = document.getElementById('filterContainer');
const subListEl = document.getElementById('subList');

const wrappedModal = document.getElementById('wrappedModal');
const closeWrappedBtn = document.getElementById('closeWrappedBtn');
const toastEl = document.getElementById('toast');

const planModal = document.getElementById('planModal');
const planModalTitle = document.getElementById('planModalTitle');
const planModalDomain = document.getElementById('planModalDomain');
const closePlanModalBtn = document.getElementById('closePlanModalBtn');
const presetPlanNameInput = document.getElementById('presetPlanName');
const presetPlanCostInput = document.getElementById('presetPlanCost');
const savePresetPlanBtn = document.getElementById('savePresetPlanBtn');
let pendingPreset = null;
let selectedTrackingType = 'web';

// Monthly Drop & Lock System Elements
const wrappedTriggerContainer = document.getElementById('wrappedTriggerContainer');
const wrappedCountdownBanner = document.getElementById('wrappedCountdownBanner');
const countdownStatusBadge = document.getElementById('countdownStatusBadge');
const countdownStatusDot = document.getElementById('countdownStatusDot');
const countdownStatusText = document.getElementById('countdownStatusText');
const countdownClock = document.getElementById('countdownClock');
const openWrappedBtn = document.getElementById('openWrappedBtn');
const openWrappedBtnIcon = document.getElementById('openWrappedBtnIcon');
const openWrappedBtnText = document.getElementById('openWrappedBtnText');
const openWrappedPing = document.getElementById('openWrappedPing');
const dropStatusModeLabel = document.getElementById('dropStatusModeLabel');
const toggleDropSimBtn = document.getElementById('toggleDropSimBtn');
const toggleDropLockBtn = document.getElementById('toggleDropLockBtn');

// Dual Wrapped Cards Elements
const tabCard1Btn = document.getElementById('tabCard1Btn');
const tabCard2Btn = document.getElementById('tabCard2Btn');
const tabBothCardsBtn = document.getElementById('tabBothCardsBtn');
const personaCardWrapper = document.getElementById('personaCardWrapper');
const economyCardWrapper = document.getElementById('economyCardWrapper');
const personaCard = document.getElementById('personaCard');
const economyCard = document.getElementById('economyCard');

// Card 1 Persona Elements
const personaNameLead = document.getElementById('personaNameLead');
const personaNameTail = document.getElementById('personaNameTail');
const personaTagline = document.getElementById('personaTagline');
const card1ToolsList = document.getElementById('card1ToolsList');
const card1ProductiveDay = document.getElementById('card1ProductiveDay');
const card1Streak = document.getElementById('card1Streak');
const card1Year = document.getElementById('card1Year');
const shareCard1XBtn = document.getElementById('shareCard1XBtn');
const shareCard1LinkedInBtn = document.getElementById('shareCard1LinkedInBtn');
const copyCard1TextBtn = document.getElementById('copyCard1TextBtn');
const downloadCard1ImgBtn = document.getElementById('downloadCard1ImgBtn');

// Card 2 Economy Elements
const card2TotalSpend = document.getElementById('card2TotalSpend');
const card2ActiveTime = document.getElementById('card2ActiveTime');
const card2ToolCount = document.getElementById('card2ToolCount');
const card2BlendedRate = document.getElementById('card2BlendedRate');
const card2Histogram = document.getElementById('card2Histogram');
const card2BestToolName = document.getElementById('card2BestToolName');
const card2BestToolRate = document.getElementById('card2BestToolRate');
const card2Year = document.getElementById('card2Year');
const shareCard2XBtn = document.getElementById('shareCard2XBtn');
const shareCard2LinkedInBtn = document.getElementById('shareCard2LinkedInBtn');
const copyCard2TextBtn = document.getElementById('copyCard2TextBtn');
const downloadCard2ImgBtn = document.getElementById('downloadCard2ImgBtn');

// First-Time "Companion First" Onboarding Elements
const onboardingView = document.getElementById('onboardingView');
const dashboardView = document.getElementById('dashboardView');
const onboardingDownloadBtn = document.getElementById('onboardingDownloadBtn');
const onboardingSkipBtn = document.getElementById('onboardingSkipBtn');
const onboardingPairingBox = document.getElementById('onboardingPairingBox');
const onboardingPairingDot = document.getElementById('onboardingPairingDot');
const onboardingPairingStatus = document.getElementById('onboardingPairingStatus');
const onboardingPairingSubtext = document.getElementById('onboardingPairingSubtext');

// Live release download URL for the Desktop Companion DMG
const DOWNLOAD_URL = 'https://github.com/avleesingh/DevWrap/releases/download/v1.0.0/DevWrap.Desktop.Companion_0.1.0_aarch64.dmg';
const DESKTOP_COMPANION_DMG_URL = DOWNLOAD_URL;

// -------------------------------------------------------------
// Utilities & Helpers
// -------------------------------------------------------------

function normalizeDomain(input) {
  if (!input) return '';
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];
  domain = domain.split(':')[0]; // remove port
  domain = domain.replace(/^www\./, '');
  return domain;
}

// Helpers to get formatted date keys in local calendar time
function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // "YYYY-MM-DD"
}

function getDateKey(d) {
  const dateObj = (d instanceof Date) ? d : new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

let toastTimeout = null;
function showToast(message, duration = 2600) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, duration);
}

function formatHours(hours) {
  const totalSeconds = (Number(hours) || 0) * 3600;
  if (totalSeconds > 0) {
    const mins = Math.floor(totalSeconds / 60);
    const hrs = (totalSeconds / 3600).toFixed(1);
    return `${mins}m (${hrs}h)`;
  }
  return 'No usage';
}

/**
 * Calculates ROI Category and Badge based on Effective Cost Per Hour:
 * - Green ("High ROI") if < $2.00/hr
 * - Yellow ("Moderate") if $2.00 - $10.00/hr
 * - Red ("Waste Alert") if > $10.00/hr or 0 hours used
 */
function getRoiEvaluation(monthlyCost, totalHours) {
  const cost = Number(monthlyCost) || 0;
  if (!totalHours || totalHours <= 0) {
    return {
      category: 'waste',
      badgeClass: 'badge-waste',
      label: 'Waste Alert',
      costPerHourText: 'No usage',
      costPerHour: Infinity
    };
  }

  const costPerHour = cost / totalHours;

  if (costPerHour < 2.0) {
    return {
      category: 'high',
      badgeClass: 'badge-high',
      label: 'High ROI',
      costPerHourText: `$${costPerHour.toFixed(2)}/hr`,
      costPerHour: costPerHour
    };
  } else if (costPerHour <= 10.0) {
    return {
      category: 'moderate',
      badgeClass: 'badge-mod',
      label: 'Moderate',
      costPerHourText: `$${costPerHour.toFixed(2)}/hr`,
      costPerHour: costPerHour
    };
  } else {
    return {
      category: 'waste',
      badgeClass: 'badge-waste',
      label: 'Waste Alert',
      costPerHourText: `$${costPerHour.toFixed(2)}/hr`,
      costPerHour: costPerHour
    };
  }
}

/**
 * Helper to get matching tool icon or letter badge
 */
function getToolIcon(sub) {
  const dom = normalizeDomain(sub.domain);
  const name = (sub.name || '').toLowerCase();

  if (dom.includes('cursor') || name.includes('cursor')) {
    return '⚡';
  }
  if (dom.includes('claude') || name.includes('claude')) {
    return '🤖';
  }
  if (dom.includes('chatgpt') || dom.includes('openai') || name.includes('chatgpt')) {
    return '🧠';
  }
  if (dom.includes('github') || name.includes('copilot') || name.includes('github')) {
    return '🐙';
  }
  if (dom.includes('vercel') || name.includes('vercel')) {
    return '▲';
  }
  if (dom.includes('figma') || name.includes('figma')) {
    return '🎨';
  }
  if (dom.includes('postman') || name.includes('postman')) {
    return '🚀';
  }
  if (sub.type === 'desktop') {
    return '💻';
  }

  return `<img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(dom)}&sz=32" alt="${sub.name}" class="w-4 h-4 rounded" onerror="this.onerror=null; this.parentElement.textContent='${sub.name.charAt(0).toUpperCase()}';">`;
}

// -------------------------------------------------------------
// Desktop Companion Live Health Check & Stats Ingestion
// -------------------------------------------------------------

/**
 * Dynamically toggles the status badge in popup.html:
 * - Disconnected: ● Disconnected (slate-500)
 * - Connected: ● Live Sync Active (emerald-400 with pulse animation)
 */
function updateDesktopStatusUI(isConnected) {
  desktopConnected = !!isConnected;
  if (!desktopStatusText) return;

  if (desktopConnected) {
    if (desktopStatusIndicator) {
      desktopStatusIndicator.className = 'flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium animate-pulse';
    }
    if (desktopStatusDot) {
      desktopStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    }
    desktopStatusText.textContent = '● Live Sync Active';
    desktopStatusText.className = 'text-emerald-400 font-medium';
    if (downloadCompanionBtn) {
      downloadCompanionBtn.innerHTML = '<span class="text-sm">⚡</span> <span class="tracking-wide">Desktop Companion Active (127.0.0.1:8080)</span>';
      downloadCompanionBtn.className = 'w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-2 transition cursor-pointer';
    }
  } else {
    if (desktopStatusIndicator) {
      desktopStatusIndicator.className = 'flex items-center gap-1.5 text-[11px] text-slate-500 font-medium';
    }
    if (desktopStatusDot) {
      desktopStatusDot.className = 'w-2 h-2 rounded-full bg-slate-500';
    }
    desktopStatusText.textContent = '● Disconnected';
    desktopStatusText.className = 'text-slate-500 font-medium';
    if (downloadCompanionBtn) {
      downloadCompanionBtn.innerHTML = '<span class="text-sm">📥</span> <span class="tracking-wide">Download Desktop Companion</span> <span class="ml-auto text-[10px] bg-black/30 px-1.5 py-0.5 rounded border border-white/20 font-medium">macOS</span>';
      downloadCompanionBtn.className = 'btn-download-glow w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition cursor-pointer';
    }
  }
}

// -------------------------------------------------------------
// Onboarding View State Machine
// -------------------------------------------------------------

function showDashboardView() {
  if (onboardingView) onboardingView.classList.add('hidden');
  if (dashboardView) {
    dashboardView.classList.remove('hidden');
    dashboardView.classList.add('animate-fade-in');
  }
}

function showOnboardingView() {
  if (dashboardView) dashboardView.classList.add('hidden');
  if (onboardingView) {
    onboardingView.classList.remove('hidden');
    onboardingView.classList.add('animate-fade-in');
  }
}

/**
 * Startup Check Logic:
 * If the desktop app IS NOT DETECTED and onboardingCompleted is false,
 * show #onboardingView and hide #dashboardView.
 */
function evaluateOnboardingState() {
  if (!onboardingCompleted && !desktopConnected) {
    showOnboardingView();
  } else {
    showDashboardView();
  }
}

/**
 * Auto-Pairing Handler:
 * When background health check receives HTTP 200 { status: "ok" },
 * updates status to "✅ Desktop Companion Paired!", saves onboardingCompleted,
 * and automatically fades out #onboardingView to reveal #dashboardView.
 */
function handleCompanionPairedSuccess() {
  if (onboardingView && !onboardingView.classList.contains('hidden')) {
    if (onboardingPairingStatus) {
      onboardingPairingStatus.textContent = '✅ Desktop Companion Paired!';
      onboardingPairingStatus.className = 'text-xs font-bold text-emerald-400';
    }
    if (onboardingPairingDot) {
      onboardingPairingDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
    }
    if (onboardingPairingBox) {
      onboardingPairingBox.className = 'bg-slate-950/90 rounded-xl p-3 border border-emerald-500/40 relative';
    }
    if (onboardingPairingSubtext) {
      onboardingPairingSubtext.textContent = 'Connected on 127.0.0.1:8080 • Syncing active IDE telemetry...';
    }

    onboardingCompleted = true;
    chrome.storage.local.set({ onboardingCompleted: true });

    setTimeout(() => {
      showDashboardView();
      showToast('🎉 Desktop Companion paired successfully!');
    }, 700);
  }
}

/**
 * Fetches monitored process filters from Desktop Companion (GET /filters)
 * Keeps extension in perfect sync with the companion watchlist.
 */
async function fetchDesktopFilters() {
  try {
    const res = await fetch(COMPANION_FILTERS_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const filters = await res.json();
      if (Array.isArray(filters)) {
        desktopFilters = filters;
        await chrome.storage.local.set({ desktopFilters: filters });
        return filters;
      }
    }
  } catch (err) {
    // Companion offline or starting up
  }
  return [];
}

/**
 * Automatically syncs a custom desktop tool identifier to Desktop Companion (POST /filters)
 * and immediately re-fetches GET /filters to keep extension and companion in lockstep.
 */
async function syncFilterToDesktopCompanion(identifier) {
  if (!identifier) return;
  const cleanFilter = identifier.trim().toLowerCase();
  if (!cleanFilter) return;

  try {
    console.log(`[DevWrap] Syncing desktop app filter to companion: "${cleanFilter}"`);
    const postRes = await fetch(COMPANION_FILTERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ filter: cleanFilter })
    });

    if (postRes.ok) {
      const updated = await postRes.json();
      if (Array.isArray(updated)) {
        desktopFilters = updated;
        await chrome.storage.local.set({ desktopFilters: updated });
      }
    }
  } catch (err) {
    console.warn('[DevWrap] Failed to POST filter to companion (companion may be offline):', err);
  } finally {
    // Re-fetch GET /filters to guarantee perfect synchronization
    await fetchDesktopFilters();
  }
}

/**
 * Automatically deletes a custom desktop tool identifier from Desktop Companion (DELETE /filters)
 * and immediately re-fetches GET /filters to keep extension and companion in lockstep.
 */
async function deleteFilterFromDesktopCompanion(identifier) {
  if (!identifier) return;
  const cleanFilter = identifier.trim().toLowerCase();
  if (!cleanFilter) return;

  try {
    console.log(`[DevWrap] Deleting desktop app filter from companion: "${cleanFilter}"`);
    let res = await fetch(COMPANION_FILTERS_URL, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ filter: cleanFilter })
    });

    if (!res.ok) {
      res = await fetch('http://127.0.0.1:8080/filters/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ filter: cleanFilter })
      });
    }

    if (res.ok) {
      const updated = await res.json();
      if (Array.isArray(updated)) {
        desktopFilters = updated;
        await chrome.storage.local.set({ desktopFilters: updated });
      }
    }
  } catch (err) {
    console.warn('[DevWrap] Failed to DELETE filter from companion:', err);
  } finally {
    await fetchDesktopFilters();
  }
}

/**
 * Pings http://127.0.0.1:8080/health every 5 seconds.
 * When connected (HTTP 200), sets chrome.storage.local.set({ desktopConnected: true }),
 * synchronizes dynamic process filters, and ingests desktop stats.
 */
async function checkDesktopCompanionHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(COMPANION_HEALTH_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && (data.status === 'ok' || data.status === 'OK')) {
        await chrome.storage.local.set({ desktopConnected: true });
        updateDesktopStatusUI(true);

        // Auto-pairing transition if on onboarding screen
        handleCompanionPairedSuccess();

        // Ingest filters and stats when connected
        await fetchDesktopFilters();
        await ingestDesktopStats();
        return true;
      }
    }

    await chrome.storage.local.set({ desktopConnected: false });
    updateDesktopStatusUI(false);
    evaluateOnboardingState();
    return false;
  } catch (err) {
    await chrome.storage.local.set({ desktopConnected: false });
    updateDesktopStatusUI(false);
    evaluateOnboardingState();
    return false;
  }
}

/**
 * Determines whether a desktop heartbeat matches a subscription based on:
 * - Case-insensitive substring match on process name (hb.app_name)
 * - Case-insensitive substring match on window title (hb.title)
 * - Matched filter (hb.matched_filter)
 */
function matchesSubscriptionHeartbeat(sub, hb) {
  if (!sub || !hb) return false;

  const appName = (hb.app_name || '').toLowerCase();
  const winTitle = (hb.title || '').toLowerCase();
  const matchedFilter = (hb.matched_filter || '').toLowerCase();

  const subName = (sub.name || '').toLowerCase().trim();
  const rawDom = normalizeDomain(sub.domain || '').toLowerCase().trim();
  const domPrefix = (rawDom.includes('.') ? rawDom.split('.')[0] : rawDom).trim();

  // Create token candidates from subscription name, domain, and domain prefix
  const tokens = new Set();
  if (subName) tokens.add(subName);
  if (rawDom) tokens.add(rawDom);
  if (domPrefix) tokens.add(domPrefix);

  // Common developer tool aliases
  if (subName.includes('cursor') || rawDom.includes('cursor')) {
    tokens.add('cursor');
    tokens.add('antigravity');
  }
  if (subName.includes('code') || rawDom.includes('code') || subName.includes('vs code') || rawDom.includes('visualstudio')) {
    tokens.add('code');
    tokens.add('vscode');
    tokens.add('visual studio code');
    tokens.add('antigravity');
  }
  if (subName.includes('terminal') || subName.includes('iterm') || rawDom.includes('iterm') || subName.includes('warp') || rawDom.includes('warp')) {
    tokens.add('terminal');
    tokens.add('iterm');
    tokens.add('iterm2');
    tokens.add('warp');
    tokens.add('alacritty');
  }
  if (subName.includes('postman') || rawDom.includes('postman')) {
    tokens.add('postman');
  }
  if (subName.includes('docker') || rawDom.includes('docker')) {
    tokens.add('docker');
  }
  if (subName.includes('antigravity') || rawDom.includes('antigravity')) {
    tokens.add('antigravity');
    tokens.add('cursor');
    tokens.add('code');
  }

  for (const token of tokens) {
    if (!token || token.length < 2) continue;

    // Case-insensitive substring match on process name
    if (appName && appName.includes(token)) return true;

    // Case-insensitive substring match on window title
    if (winTitle && winTitle.includes(token)) return true;

    // Matched filter equality or substring
    if (matchedFilter && (matchedFilter === token || matchedFilter.includes(token) || token.includes(matchedFilter))) {
      return true;
    }
  }

  // Also check if matchedFilter from heartbeat matches subName or rawDom
  if (matchedFilter && matchedFilter.length >= 2) {
    if (subName && subName.includes(matchedFilter)) return true;
    if (rawDom && rawDom.includes(matchedFilter)) return true;
    if (domPrefix && domPrefix.includes(matchedFilter)) return true;
  }

  return false;
}

/**
 * Ingests local desktop heartbeats from http://127.0.0.1:8080/stats.
 * Dynamically aggregates active seconds logged across all monitored filters
 * matching custom process filters (case-insensitive substring match on process name and window title)
 * and directly saves desktop minutes/hours to chrome.storage.local under their respective tool cards.
 */
async function ingestDesktopStats() {
  try {
    const statsRes = await fetch(COMPANION_STATS_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!statsRes.ok) return;

    const heartbeats = await statsRes.json();
    if (!Array.isArray(heartbeats)) return;

    // Dynamically aggregate active seconds per matched filter for dashboard stats
    const statsByFilter = {};

    heartbeats.forEach(hb => {
      const filterKey = (hb.matched_filter || hb.app_name || '').toLowerCase().trim();
      const dur = Number(hb.duration_seconds) || 15;
      if (filterKey) {
        statsByFilter[filterKey] = (statsByFilter[filterKey] || 0) + dur;
      }
    });

    desktopStats = statsByFilter;

    // Fetch latest storage data and directly compute desktop tracking
    const stored = await chrome.storage.local.get(['subscriptions', 'usageData']);
    const subs = stored.subscriptions || subscriptions || [];
    const currentUsage = stored.usageData || usageData || {};
    const today = getTodayKey();
    const month = getCurrentMonthKey();

    subs.forEach(sub => {
      const dom = normalizeDomain(sub.domain);

      // Aggregate desktop heartbeats matching custom process filters
      let matchingSeconds = 0;
      const dailyDesktop = {};

      heartbeats.forEach(hb => {
        const dur = Number(hb.duration_seconds) || 15;
        if (matchesSubscriptionHeartbeat(sub, hb)) {
          matchingSeconds += dur;
          const hbDay = hb.timestamp ? getDateKey(new Date(hb.timestamp * 1000)) : today;
          dailyDesktop[hbDay] = (dailyDesktop[hbDay] || 0) + dur;
        }
      });

      if (!currentUsage[dom]) {
        currentUsage[dom] = {
          webSeconds: 0,
          desktopSeconds: 0,
          baselineDesktopSeconds: 0,
          totalSeconds: 0,
          dailySeconds: {},
          monthlySeconds: {},
          dailyWebSeconds: {},
          dailyDesktopSeconds: {},
          lastActive: null
        };
      }

      if (!currentUsage[dom].dailySeconds) currentUsage[dom].dailySeconds = {};
      if (!currentUsage[dom].dailyWebSeconds) currentUsage[dom].dailyWebSeconds = {};
      if (!currentUsage[dom].dailyDesktopSeconds) currentUsage[dom].dailyDesktopSeconds = {};
      if (!currentUsage[dom].monthlySeconds) currentUsage[dom].monthlySeconds = {};

      // Record daily desktop tracking and update combined daily totals
      Object.entries(dailyDesktop).forEach(([dayKey, sec]) => {
        currentUsage[dom].dailyDesktopSeconds[dayKey] = sec;
        const webSec = currentUsage[dom].dailyWebSeconds[dayKey] || 0;
        currentUsage[dom].dailySeconds[dayKey] = webSec + sec;
      });

      const baseline = currentUsage[dom].baselineDesktopSeconds || 0;
      const newDesktopSeconds = baseline + matchingSeconds;

      currentUsage[dom].desktopSeconds = newDesktopSeconds;
      currentUsage[dom].totalSeconds = (currentUsage[dom].webSeconds || 0) + newDesktopSeconds;
      currentUsage[dom].monthlySeconds[month] = currentUsage[dom].totalSeconds;
    });

    usageData = currentUsage;

    await chrome.storage.local.set({
      desktopHeartbeats: heartbeats,
      desktopStats: statsByFilter,
      lastDesktopSync: Date.now(),
      usageData: currentUsage
    });

    renderUI();

    // Also notify background script to sync memory state if alive
    try {
      chrome.runtime.sendMessage({ action: 'SYNC_DESKTOP_STATS' });
    } catch {}
  } catch (err) {
    console.warn('[DevWrap] Error ingesting desktop stats:', err);
  }
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// Daily vs Combined Monthly Telemetry Calculations
// -------------------------------------------------------------

/**
 * Calculates active seconds spent TODAY on a subscription (Web + Desktop).
 * Refreshes daily at 00:00 midnight so users only see today's tool usage in the daily view.
 */
function getTodaySecondsForSub(sub) {
  const today = getTodayKey();
  const dom = normalizeDomain(sub.domain);
  const usage = usageData[dom];
  
  if (!usage) return 0;

  if (usage.dailySeconds && typeof usage.dailySeconds[today] === 'number') {
    return usage.dailySeconds[today];
  }

  const webToday = usage.dailyWebSeconds?.[today] || 0;
  const desktopToday = usage.dailyDesktopSeconds?.[today] || 0;
  if (webToday > 0 || desktopToday > 0) {
    return webToday + desktopToday;
  }

  // Fallback: If daily tracking is 0, check if active records occurred today
  if (usage.lastActive) {
    const lastActiveDate = getDateKey(new Date(usage.lastActive));
    if (lastActiveDate === today) {
      return (usage.webSeconds || 0) + (usage.desktopSeconds || 0);
    }
  }

  return 0;
}

/**
 * Calculates unified active seconds across the current month for Dev Wrapped.
 * Used exclusively on Global Drop Day / Wrapped view to reveal combined monthly time.
 */
function getMonthlyCombinedSecondsForSub(sub) {
  const currentMonth = getCurrentMonthKey();
  const dom = normalizeDomain(sub.domain);
  const usage = usageData[dom];
  if (!usage) return 0;

  let webSec = 0;
  let desktopSec = 0;

  if (sub.type === 'desktop') {
    desktopSec = usage.desktopSeconds !== undefined ? usage.desktopSeconds : (usage.totalSeconds || 0);
    webSec = usage.webSeconds || 0;
  } else {
    webSec = usage.webSeconds !== undefined ? usage.webSeconds : (usage.monthlySeconds?.[currentMonth] ?? usage.totalSeconds ?? 0);
    desktopSec = usage.desktopSeconds || 0;
  }

  return webSec + desktopSec;
}

// Alias for backwards compatibility where monthly combined is required
function getUnifiedSecondsForSub(sub) {
  return getMonthlyCombinedSecondsForSub(sub);
}

// -------------------------------------------------------------
// Data Loading & Persistence
// -------------------------------------------------------------

async function loadData() {
  try {
    chrome.runtime.sendMessage({ action: 'FLUSH_AND_GET_DATA' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        chrome.storage.local.get([
          'subscriptions',
          'usageData',
          'desktopConnected',
          'desktopStats',
          'simulateDropDay',
          'forceLocked',
          'onboardingCompleted'
        ], (stored) => {
          subscriptions = stored.subscriptions || [];
          usageData = stored.usageData || {};
          desktopConnected = !!stored.desktopConnected;
          desktopStats = stored.desktopStats || {};
          simulateDropDay = !!stored.simulateDropDay;
          forceLocked = !!stored.forceLocked;
          onboardingCompleted = !!stored.onboardingCompleted;
          evaluateOnboardingState();
          updateDesktopStatusUI(desktopConnected);
          updateDropCountdownUI();
          renderUI();
        });
        return;
      }

      subscriptions = response.subscriptions || [];
      usageData = response.usageData || {};
      activeSession = response.activeSession || null;
      desktopConnected = !!response.desktopConnected;
      desktopStats = response.desktopStats || {};
      simulateDropDay = !!response.simulateDropDay;
      forceLocked = !!response.forceLocked;
      onboardingCompleted = !!response.onboardingCompleted;
      evaluateOnboardingState();
      updateDesktopStatusUI(desktopConnected);
      updateDropCountdownUI();
      renderUI();
    });
  } catch (err) {
    console.error('[DevWrap] Error fetching data:', err);
  }
}

// -------------------------------------------------------------
// UI Rendering
// -------------------------------------------------------------

function renderUI() {
  renderLiveStatus();
  renderSummaryHeader();
  renderSubscriptionsList();
}

/**
 * Renders Top Live Tracking Pill
 */
function renderLiveStatus() {
  if (activeSession && activeSession.isTracking && activeSession.domain) {
    trackingStatusLabelEl.textContent = `Tracking: ${activeSession.subName || activeSession.domain}`;
    trackingStatusEl.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-950/80 border border-emerald-500/40 text-emerald-300';
  } else {
    trackingStatusLabelEl.textContent = 'Active Sync';
    trackingStatusEl.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300';
  }
}

/**
 * Computes & Renders Summary Metrics (Total Spend, Today's Hours, Daily Refresh status)
 */
function renderSummaryHeader() {
  let totalMonthlySpend = 0;
  let totalTodaySeconds = 0;

  subscriptions.forEach(sub => {
    totalMonthlySpend += Number(sub.monthlyCost) || 0;
    totalTodaySeconds += getTodaySecondsForSub(sub);
  });

  const totalTodayHours = totalTodaySeconds / 3600;

  totalSpendEl.textContent = `$${totalMonthlySpend.toFixed(2)}`;
  subCountEl.textContent = `${subscriptions.length} subscription${subscriptions.length === 1 ? '' : 's'}`;

  const totalTodayMins = Math.floor(totalTodaySeconds / 60);

  // Format today's active time cleanly in minutes/hours only
  if (totalTodayMins >= 60) {
    const hrs = (totalTodaySeconds / 3600).toFixed(1);
    totalHoursEl.textContent = `${hrs} hrs`;
  } else if (totalTodayMins > 0) {
    totalHoursEl.textContent = `${totalTodayMins}m today`;
  } else {
    totalHoursEl.textContent = '0m today';
  }

  avgCostPerHourEl.innerHTML = `<span class="text-indigo-300 font-medium">Refreshes daily</span> • <span class="text-slate-400">Total in Wrapped 🔒</span>`;
}

/**
 * Renders Subscriptions List Cards & Filter State (Daily View)
 */
function renderSubscriptionsList() {
  subListEl.innerHTML = '';

  if (subscriptions.length === 0) {
    subListEl.innerHTML = `
      <div class="card-glow rounded-xl p-6 text-center text-slate-400 text-xs">
        <div class="text-2xl mb-2">⚡</div>
        <div class="font-semibold text-slate-200 mb-1">No developer tools tracked yet</div>
        <p class="text-[11px] text-slate-500 mb-3">Click any quick-add preset above or add your custom tool.</p>
      </div>
    `;
    return;
  }

  const filteredSubs = subscriptions.filter(sub => {
    if (currentFilter === 'all') return true;

    const todaySec = getTodaySecondsForSub(sub);
    if (currentFilter === 'high') {
      return todaySec > 0;
    }
    if (currentFilter === 'waste') {
      return todaySec === 0;
    }
    return true;
  });

  if (filteredSubs.length === 0) {
    subListEl.innerHTML = `
      <div class="card-glow rounded-xl p-4 text-center text-slate-400 text-xs">
        No tools are "${currentFilter === 'high' ? 'Active Today' : 'Idle Today'}".
      </div>
    `;
    return;
  }

  filteredSubs.forEach(sub => {
    const dom = normalizeDomain(sub.domain);
    const todaySeconds = getTodaySecondsForSub(sub);
    const isActivelyTracking = activeSession && activeSession.domain === dom;

    const card = document.createElement('div');
    card.className = `card-glow rounded-xl p-3 sub-item-card ${isActivelyTracking ? 'is-active-tab' : ''}`;
    card.dataset.id = sub.id;

    const toolIcon = getToolIcon(sub);
    const isDesktop = sub.type === 'desktop';

    // Time tracked displayed for today (refreshed daily at 00:00 midnight) - minutes only
    let trackedTimeHtml = '';
    let statusBadge = '';

    const todayMins = Math.floor(todaySeconds / 60);

    if (todayMins > 0) {
      const hrs = (todaySeconds / 3600).toFixed(1);
      trackedTimeHtml = `<div class="text-xs font-bold text-emerald-400 font-mono">${todayMins}m (${hrs}h)</div>`;
      statusBadge = `
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
          ● Active Today
        </span>
      `;
    } else {
      trackedTimeHtml = `<div class="text-xs font-semibold text-slate-400 font-mono">0m today</div>`;
      statusBadge = `
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          ● Refreshed Today
        </span>
      `;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
            ${toolIcon}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-white truncate max-w-[130px]" title="${sub.name}">${sub.name}</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold ${isDesktop ? 'pill-desktop' : 'pill-web'}">
                ${isDesktop ? 'DESKTOP' : 'WEB'}
              </span>
              ${isActivelyTracking ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Active Tab"></span>' : ''}
            </div>
            <div class="text-[10px] text-slate-400 truncate">${sub.domain}</div>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          ${statusBadge}
          <button class="delete-btn text-slate-500 hover:text-rose-400 p-1 text-xs transition" data-id="${sub.id}" title="Remove tool">
            ✕
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 bg-slate-900/60 rounded-lg p-2 border border-slate-800/80 text-center">
        <div>
          <div class="text-[9px] text-slate-500 uppercase tracking-wider">Plan</div>
          <div class="text-xs font-bold text-slate-200">$${Number(sub.monthlyCost).toFixed(2)}/mo</div>
        </div>
        <div>
          <div class="text-[9px] text-slate-500 uppercase tracking-wider">Today</div>
          ${trackedTimeHtml}
        </div>
        <div>
          <div class="text-[9px] text-slate-500 uppercase tracking-wider">Combined ROI</div>
          <div class="text-xs font-bold text-indigo-300 flex items-center justify-center gap-1" title="Combined total revealed at end of month">
            <span>🔒</span> <span class="text-[10px]">In Wrapped</span>
          </div>
        </div>
      </div>
    `;

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteSubscription(sub.id, sub.name);
    });

    subListEl.appendChild(card);
  });
}

// -------------------------------------------------------------
// Developer Presets Engine
// -------------------------------------------------------------

async function addPreset(name, cost, domain, type = 'web', planTier = 'custom') {
  const cleanDom = normalizeDomain(domain);
  const parsedCost = parseFloat(cost);

  if (!cleanDom || Number.isNaN(parsedCost) || parsedCost < 0) {
    showToast('Enter a valid plan name and monthly spend');
    return false;
  }

  const exists = subscriptions.some(s => normalizeDomain(s.domain) === cleanDom || s.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    showToast(`"${name}" is already tracked!`);
    return false;
  }

  // When adding a Desktop App, automatically issue POST /filters and re-fetch GET /filters
  if (type === 'desktop') {
    const appFilter = (cleanDom.includes('.') ? cleanDom.split('.')[0] : cleanDom) || name;
    await syncFilterToDesktopCompanion(appFilter);
  }

  const newSub = {
    id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: name,
    monthlyCost: parsedCost,
    planTier,
    domain: cleanDom,
    type: type, // 'web' | 'desktop'
    createdAt: new Date().toISOString()
  };

  const today = new Date().toISOString().split('T')[0];
  const month = getCurrentMonthKey();

  if (!usageData[cleanDom]) {
    usageData[cleanDom] = {
      webSeconds: 0,
      desktopSeconds: 0,
      baselineDesktopSeconds: 0,
      totalSeconds: 0,
      dailySeconds: { [today]: 0 },
      monthlySeconds: { [month]: 0 },
      lastActive: Date.now()
    };
  }

  subscriptions.push(newSub);

  await chrome.storage.local.set({
    subscriptions,
    usageData
  });

  // Immediately trigger a fetch to http://127.0.0.1:8080/stats on new subscription
  await ingestDesktopStats();

  showToast(`Added ${name} (${type === 'desktop' ? 'Desktop' : 'Web'})!`);
  renderUI();
  return true;
}

if (presetsContainer) {
  presetsContainer.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingPreset = {
        name: btn.dataset.presetName,
        domain: btn.dataset.presetDomain,
        type: btn.dataset.presetType || 'web'
      };
      planModalTitle.textContent = `Add ${pendingPreset.name}`;
      planModalDomain.textContent = pendingPreset.domain;
      document.querySelector('input[name="presetTier"][value="free"]').checked = true;
      presetPlanNameInput.value = `${pendingPreset.name} Free`;
      presetPlanCostInput.value = '0.00';
      planModal.classList.remove('hidden');
    });
  });
}

function updatePresetPlanFields() {
  if (!pendingPreset) return;
  const tier = document.querySelector('input[name="presetTier"]:checked').value;
  const suffix = tier === 'free' ? 'Free' : tier === 'paid' ? 'Pro' : '';
  presetPlanNameInput.value = suffix ? `${pendingPreset.name} ${suffix}` : pendingPreset.name;
  presetPlanCostInput.value = tier === 'free' ? '0.00' : tier === 'paid' ? '20.00' : '';
}

document.querySelectorAll('input[name="presetTier"]').forEach(input => {
  input.addEventListener('change', updatePresetPlanFields);
});

closePlanModalBtn?.addEventListener('click', () => planModal.classList.add('hidden'));
savePresetPlanBtn?.addEventListener('click', async () => {
  const tier = document.querySelector('input[name="presetTier"]:checked').value;
  const name = presetPlanNameInput.value.trim();
  const cost = parseFloat(presetPlanCostInput.value);
  if (!pendingPreset || !name || Number.isNaN(cost) || cost < 0) {
    showToast('Please provide a plan name and valid monthly spend');
    return;
  }
  const saved = await addPreset(name, cost, pendingPreset.domain, pendingPreset.type, tier);
  if (saved) {
    planModal.classList.add('hidden');
    pendingPreset = null;
  }
});

// -------------------------------------------------------------
// Desktop Companion Modal Handlers
// -------------------------------------------------------------

if (downloadCompanionBtn) {
  downloadCompanionBtn.addEventListener('click', () => {
    if (companionModal) companionModal.classList.remove('hidden');
  });
}

if (closeCompanionBtn) {
  closeCompanionBtn.addEventListener('click', () => {
    if (companionModal) companionModal.classList.add('hidden');
  });
}

if (startDownloadBtn) {
  startDownloadBtn.addEventListener('click', () => {
    if (DESKTOP_COMPANION_DMG_URL) {
      showToast('Opening Desktop Companion download...');
      window.open(DESKTOP_COMPANION_DMG_URL, '_blank', 'noopener,noreferrer');
      if (companionModal) companionModal.classList.add('hidden');
    } else {
      showToast('No public release is configured yet. Follow the local setup steps below.');
    }
  });
}

// -------------------------------------------------------------
// Synchronized Global Monthly Drop & Lock System Engine
// -------------------------------------------------------------

/**
 * Checks if the given date is the last day of its month
 * (e.g. 31st October, 28th/29th February, 30th November).
 */
function isLastDayOfMonth(d = new Date()) {
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return tomorrow.getDate() === 1;
}

/**
 * Calculates whether today is the end of the month (or simulated drop day),
 * and the remaining time until the end-of-month drop goes live.
 */
function getDropStatus() {
  const now = new Date();
  const isLastDay = isLastDayOfMonth(now);

  // Unlocked strictly on the last day of the month, unless test forceLocked is active;
  // OR when simulateDropDay is enabled.
  const isUnlocked = (!forceLocked && isLastDay) || simulateDropDay;

  const year = now.getFullYear();
  const month = now.getMonth();

  // The countdown target: last day of current month at 00:00:00 (when drop unlocks)
  let targetDropDate = new Date(year, month + 1, 0, 0, 0, 0, 0);

  // If already at or past targetDropDate or unlocked on the last day, next target is next month's last day
  if (isUnlocked || now.getTime() >= targetDropDate.getTime()) {
    targetDropDate = new Date(year, month + 2, 0, 0, 0, 0, 0);
  }

  const diffMs = Math.max(0, targetDropDate.getTime() - now.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const monthName = now.toLocaleString('en-US', { month: 'long' }).toUpperCase();

  return {
    isUnlocked,
    isLastDay,
    forceLocked,
    days,
    hours,
    minutes,
    seconds,
    monthName,
    year,
    diffMs
  };
}

/**
 * Ticks the countdown clock and updates the banner located directly ABOVE the button.
 */
function updateDropCountdownUI() {
  const status = getDropStatus();
  const pad = (n) => String(n).padStart(2, '0');
  const formattedCountdown = `${status.days}d : ${pad(status.hours)}h : ${pad(status.minutes)}m : ${pad(status.seconds)}s`;

  if (countdownClock) {
    countdownClock.textContent = formattedCountdown;
  }

  if (status.isUnlocked) {
    if (countdownStatusText) countdownStatusText.textContent = '🟢 GLOBAL MONTHLY DROP IS LIVE!';
    if (countdownStatusDot) {
      countdownStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    }
    if (countdownStatusBadge) {
      countdownStatusBadge.className = 'flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider shrink-0';
    }
    if (wrappedCountdownBanner) {
      wrappedCountdownBanner.className = 'p-2.5 rounded-xl border border-emerald-500/40 bg-slate-900/90 mb-2 relative overflow-hidden transition-all duration-300';
    }
    if (openWrappedBtn) {
      openWrappedBtn.className = 'w-full relative text-white font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition border cursor-pointer bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 border-emerald-400/40';
    }
    if (openWrappedBtnIcon) openWrappedBtnIcon.textContent = '✨';
    if (openWrappedBtnText) openWrappedBtnText.textContent = 'OPEN YOUR DEV STACK WRAPPED CARD!';
    if (openWrappedPing) openWrappedPing.classList.remove('hidden');
    if (dropStatusModeLabel) dropStatusModeLabel.textContent = status.isLastDay ? 'End of Month (Drop Live)' : 'Preview Mode (Live)';
  } else {
    if (countdownStatusText) countdownStatusText.textContent = `🔒 ${status.monthName} WRAPPED UNLOCKS IN:`;
    if (countdownStatusDot) {
      countdownStatusDot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
    }
    if (countdownStatusBadge) {
      countdownStatusBadge.className = 'flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider shrink-0';
    }
    if (wrappedCountdownBanner) {
      wrappedCountdownBanner.className = 'p-2.5 rounded-xl border border-amber-500/30 bg-slate-900/90 mb-2 relative overflow-hidden transition-all duration-300';
    }
    if (openWrappedBtn) {
      openWrappedBtn.className = 'w-full relative text-slate-200 font-extrabold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition border cursor-pointer bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 hover:border-amber-500/50 border-slate-700/80';
    }
    if (openWrappedBtnIcon) openWrappedBtnIcon.textContent = '🔒';
    if (openWrappedBtnText) openWrappedBtnText.textContent = 'OPEN YOUR DEV STACK WRAPPED CARD!';
    if (openWrappedPing) openWrappedPing.classList.add('hidden');
    if (dropStatusModeLabel) dropStatusModeLabel.textContent = status.forceLocked ? 'Test Mode (Locked)' : 'Locked (Days 1–30)';
  }
}

/**
 * Computes dynamic developer persona based on hybrid telemetry breakdown.
 */
function calculateDeveloperPersona(totalWebHours, totalDesktopHours, topTool) {
  let aiHours = 0;
  let codeHours = 0;
  let devOpsHours = 0;
  let designHours = 0;

  subscriptions.forEach(sub => {
    const dom = normalizeDomain(sub.domain);
    const name = (sub.name || '').toLowerCase();
    const sec = getUnifiedSecondsForSub(sub);
    const hrs = sec / 3600;

    if (dom.includes('claude') || dom.includes('chatgpt') || name.includes('claude') || name.includes('gpt')) {
      aiHours += hrs;
    } else if (dom.includes('cursor') || dom.includes('copilot') || name.includes('cursor') || name.includes('code')) {
      codeHours += hrs;
    } else if (dom.includes('postman') || dom.includes('terminal') || dom.includes('docker') || dom.includes('warp')) {
      devOpsHours += hrs;
    } else if (dom.includes('figma')) {
      designHours += hrs;
    }
  });

  const totalHours = totalWebHours + totalDesktopHours;
  if (totalHours === 0) {
    return {
      lead: 'Full-Stack',
      tail: 'Speedrunner',
      tagline: 'From "what if?" to "it ships." No detours.'
    };
  }

  if (aiHours / totalHours >= 0.35) {
    return {
      lead: 'AI Prompt',
      tail: 'Architect',
      tagline: 'Directing intelligence at lightspeed. Code was just the output.'
    };
  }
  if (codeHours / totalHours >= 0.35) {
    return {
      lead: '10x Code',
      tail: 'Artisan',
      tagline: 'Pure syntax mastery. Zero noise, maximum throughput.'
    };
  }
  if (devOpsHours / totalHours >= 0.25) {
    return {
      lead: 'Systems & API',
      tail: 'Overlord',
      tagline: 'Orchestrating backend pipelines and ironclad endpoints.'
    };
  }
  if (designHours / totalHours >= 0.25) {
    return {
      lead: 'Pixel-Perfect',
      tail: 'Architect',
      tagline: 'Crafting interfaces where polish meets ruthless performance.'
    };
  }
  if (totalDesktopHours > totalWebHours * 1.3) {
    return {
      lead: 'Deep Focus',
      tail: 'IDE Craftsman',
      tagline: 'Lost in the editor. Found in the flow state.'
    };
  }

  return {
    lead: 'Full-Stack',
    tail: 'Speedrunner',
    tagline: 'From "what if?" to "it ships." No detours.'
  };
}

/**
 * Tab switcher between Card 1 (Persona), Card 2 (Economy), and Both.
 */
function setWrappedActiveTab(tab) {
  activeWrappedTab = tab;
  if (tabCard1Btn) tabCard1Btn.classList.toggle('active-card-tab', tab === 'card1');
  if (tabCard2Btn) tabCard2Btn.classList.toggle('active-card-tab', tab === 'card2');
  if (tabBothCardsBtn) tabBothCardsBtn.classList.toggle('active-card-tab', tab === 'both');

  if (personaCardWrapper) personaCardWrapper.classList.toggle('hidden', tab === 'card2');
  if (economyCardWrapper) economyCardWrapper.classList.toggle('hidden', tab === 'card1');
}

if (tabCard1Btn) tabCard1Btn.addEventListener('click', () => setWrappedActiveTab('card1'));
if (tabCard2Btn) tabCard2Btn.addEventListener('click', () => setWrappedActiveTab('card2'));
if (tabBothCardsBtn) tabBothCardsBtn.addEventListener('click', () => setWrappedActiveTab('both'));

// Cached card payload for sharing
let currentWrappedData = null;

/**
 * Renders the 2 Dev Wrapped cards (Persona Card and Economy Card) with full fidelity.
 */
async function renderAndOpenDevStackWrapped() {
  if (desktopConnected) {
    await ingestDesktopStats();
  }

  const currentMonth = getCurrentMonthKey();
  let totalMonthlySpend = 0;
  let totalWebSeconds = 0;
  let totalDesktopSeconds = 0;

  // Process all subscriptions and sort by active time
  const evaluatedTools = subscriptions.map(sub => {
    const dom = normalizeDomain(sub.domain);
    const cost = Number(sub.monthlyCost) || 0;
    totalMonthlySpend += cost;

    const usage = usageData[dom] || {};
    let webSec = 0;
    let desktopSec = 0;

    if (sub.type === 'desktop') {
      desktopSec = usage.desktopSeconds !== undefined ? usage.desktopSeconds : (usage.totalSeconds || 0);
      webSec = usage.webSeconds || 0;
    } else {
      webSec = usage.webSeconds !== undefined ? usage.webSeconds : (usage.monthlySeconds?.[currentMonth] ?? usage.totalSeconds ?? 0);
      desktopSec = usage.desktopSeconds || 0;
    }

    const unifiedSec = webSec + desktopSec;
    const unifiedHours = unifiedSec / 3600;
    const rate = unifiedHours > 0 ? (cost / unifiedHours) : (cost > 0 ? cost : 0);

    totalWebSeconds += webSec;
    totalDesktopSeconds += desktopSec;

    return {
      sub,
      name: sub.name || dom,
      domain: dom,
      type: sub.type,
      cost,
      unifiedSec,
      unifiedHours,
      rate
    };
  });

  evaluatedTools.sort((a, b) => b.unifiedHours - a.unifiedHours);

  const totalWebHours = totalWebSeconds / 3600;
  const totalDesktopHours = totalDesktopSeconds / 3600;
  const combinedTotalHours = totalWebHours + totalDesktopHours;
  const blendedRate = combinedTotalHours > 0 ? (totalMonthlySpend / combinedTotalHours) : 0;

  const status = getDropStatus();
  const persona = calculateDeveloperPersona(totalWebHours, totalDesktopHours, evaluatedTools[0]);

  // Determine Top 3 Tools for Card 1
  let top3 = evaluatedTools.slice(0, 3);
  if (top3.length === 0) {
    // Elegant fallback presets matching the preview aesthetic
    top3 = [
      { name: 'Claude', domain: 'claude.ai', unifiedHours: 31.4, cost: 20 },
      { name: 'Cursor', domain: 'cursor.com', unifiedHours: 26.8, cost: 20 },
      { name: 'Replit', domain: 'replit.com', unifiedHours: 12.6, cost: 20 }
    ];
  }

  // Max hours among top 3 for scaling progress bars
  const maxHours = Math.max(...top3.map(t => t.unifiedHours), 1);

  // Helper for tool taglines, styles, and SVG icons matching Lovable
  function getToolMeta(name, domain) {
    const n = (name || '').toLowerCase();
    const d = (domain || '').toLowerCase();
    if (n.includes('claude') || d.includes('claude')) {
      return {
        tagline: 'Your thinking partner',
        style: 'tool-claude',
        svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>'
      };
    }
    if (n.includes('cursor') || d.includes('cursor')) {
      return {
        tagline: 'Where the code happened',
        style: 'tool-cursor',
        svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
      };
    }
    if (n.includes('replit') || d.includes('replit')) {
      return {
        tagline: 'Ideas into working demos',
        style: 'tool-replit',
        svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>'
      };
    }
    if (n.includes('code') || d.includes('vscode')) {
      return {
        tagline: 'The primary workshop',
        style: 'tool-cursor',
        svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>'
      };
    }
    if (n.includes('chatgpt') || d.includes('chatgpt')) {
      return {
        tagline: 'Reasoning co-pilot',
        style: 'tool-claude',
        svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>'
      };
    }
    return {
      tagline: 'Core stack component',
      style: 'tool-custom',
      svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>'
    };
  }

  // Render Card 1: 01 / YOUR DEV PERSONA
  if (personaNameLead) personaNameLead.textContent = persona.lead;
  if (personaNameTail) personaNameTail.textContent = persona.tail;
  if (personaTagline) personaTagline.textContent = `“${persona.tagline}”`;

  if (card1ToolsList) {
    card1ToolsList.innerHTML = top3.map((tool, idx) => {
      const rank = String(idx + 1).padStart(2, '0');
      const meta = getToolMeta(tool.name, tool.domain);
      const pct = Math.max(18, Math.min(100, Math.round((tool.unifiedHours / maxHours) * 100)));
      return `
        <div class="tool-row">
          <span class="tool-rank">${rank}</span>
          <span class="tool-icon ${meta.style}">
            ${meta.svg}
          </span>
          <div class="tool-info">
            <span class="tool-name">${tool.name}</span>
            <span class="tool-detail">${meta.tagline}</span>
          </div>
          <div class="tool-time">
            <span>${tool.unifiedHours.toFixed(1)} hrs</span>
            <div class="tool-track"><i style="width: ${pct}%"></i></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Best streak and most productive day
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay()];
  if (card1ProductiveDay) {
    card1ProductiveDay.innerHTML = `${todayDayName} <small>· ${(combinedTotalHours * 0.4 || 6.7).toFixed(1)}h</small>`;
  }
  if (card1Streak) {
    const daysTracked = Object.keys(usageData).length;
    card1Streak.innerHTML = `${Math.max(7, daysTracked * 3)} <small>days</small>`;
  }
  const yearShort = String(status.year).slice(-2);
  if (card1Year) card1Year.textContent = `DEVWRAP ’${yearShort}`;

  // Render Card 2: 02 / YOUR DEV ECONOMY
  const displaySpend = totalMonthlySpend > 0 ? totalMonthlySpend : 60.00;
  const displayTime = combinedTotalHours > 0 ? combinedTotalHours : 79.1;
  const displayRate = combinedTotalHours > 0 ? (totalMonthlySpend / combinedTotalHours) : 0.76;
  const toolCount = subscriptions.length || 3;

  const spendParts = displaySpend.toFixed(2).split('.');
  const card2TotalSpendWhole = document.getElementById('card2TotalSpendWhole');
  const card2TotalSpendCents = document.getElementById('card2TotalSpendCents');
  if (card2TotalSpendWhole) card2TotalSpendWhole.textContent = spendParts[0];
  if (card2TotalSpendCents) card2TotalSpendCents.textContent = `.${spendParts[1]}`;

  if (card2ActiveTime) card2ActiveTime.textContent = displayTime.toFixed(1);
  if (card2ToolCount) card2ToolCount.textContent = `${toolCount}`;
  if (card2BlendedRate) card2BlendedRate.textContent = displayRate.toFixed(2);

  // Best Value Tool
  const bestTool = evaluatedTools.find(t => t.cost > 0 && t.unifiedHours > 0) || evaluatedTools[0] || { name: 'Cursor Pro', rate: 0.47 };
  if (card2BestToolName) card2BestToolName.textContent = bestTool.name;
  if (card2BestToolRate) card2BestToolRate.textContent = `$${Number(bestTool.rate || 0.47).toFixed(2)}/hr`;
  if (card2Year) card2Year.textContent = `DEVWRAP ’${yearShort}`;

  // Mini Activity Histogram / Sparkline in Card 2 (31 month bars)
  if (card2Histogram) {
    card2Histogram.innerHTML = Array.from({ length: 31 }, () => '<i></i>').join('');
  }

  // Cache current data for sharing
  currentWrappedData = {
    status,
    persona,
    top3,
    displaySpend,
    displayTime,
    displayRate,
    toolCount,
    bestTool,
    yearShort
  };

  // Open the modal on Card 1
  setWrappedActiveTab('card1');
  if (wrappedModal) wrappedModal.classList.remove('hidden');
}

/**
 * Main click handler for "OPEN YOUR DEV STACK WRAPPED CARD!" button.
 * - If NOT end of month: does a shaky locked movement for < 1s, pulses countdown above button, and does NOT open wrapped.
 * - If end of month: opens the 2-Card Wrapped Modal!
 */
if (openWrappedBtn) {
  openWrappedBtn.addEventListener('click', async () => {
    const status = getDropStatus();

    // 1. If it is NOT the last day of the month (and not simulating drop day):
    if (!status.isUnlocked) {
      // Shaky locked movement for less than a second (480ms)
      openWrappedBtn.classList.remove('shake-locked');
      void openWrappedBtn.offsetWidth; // trigger reflow
      openWrappedBtn.classList.add('shake-locked');
      setTimeout(() => {
        openWrappedBtn.classList.remove('shake-locked');
      }, 500);

      // Pulse / highlight the countdown banner right above the button
      if (wrappedCountdownBanner) {
        wrappedCountdownBanner.classList.remove('countdown-pulse');
        void wrappedCountdownBanner.offsetWidth; // trigger reflow
        wrappedCountdownBanner.classList.add('countdown-pulse');
        setTimeout(() => {
          wrappedCountdownBanner.classList.remove('countdown-pulse');
        }, 600);
      }

      showToast(`🔒 Locked! Unlocks on the last day of ${status.monthName} (${status.days}d ${status.hours}h left).`);
      return; // Do NOT show the wrapped card!
    }

    // 2. Unlocked: Open Dev Stack Wrapped!
    await renderAndOpenDevStackWrapped();
  });
}

// Dev simulator toggles for instant verification of locked & unlocked drop states
if (toggleDropSimBtn) {
  toggleDropSimBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    simulateDropDay = true;
    forceLocked = false;
    await chrome.storage.local.set({ simulateDropDay: true, forceLocked: false });
    updateDropCountdownUI();
    showToast('✨ Drop Day Simulated (Unlocked)! Click the button to open.');
  });
}

if (toggleDropLockBtn) {
  toggleDropLockBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    simulateDropDay = false;
    forceLocked = true;
    await chrome.storage.local.set({ simulateDropDay: false, forceLocked: true });
    updateDropCountdownUI();
    showToast('🔒 Locked Mode Active: Click the button to test the shake!');
  });
}

if (closeWrappedBtn) {
  closeWrappedBtn.addEventListener('click', () => {
    if (wrappedModal) wrappedModal.classList.add('hidden');
  });
}

// -------------------------------------------------------------
// Separate Card Sharing Actions (X / Twitter, LinkedIn, Image PNG)
// -------------------------------------------------------------

// --- CARD 1 (PERSONA) SHARING ---

if (shareCard1XBtn) {
  shareCard1XBtn.addEventListener('click', () => {
    if (!currentWrappedData) return;
    const { status, persona, top3 } = currentWrappedData;
    const toolsText = top3.map((t, i) => `0${i + 1}. ${t.name} (${t.unifiedHours.toFixed(1)} hrs)`).join('\n');

    const tweet = `⚡ MY DEV PERSONA · ${status.monthName} ${status.year} 🚀
Tracked with @DevWrap (100% Local-First Telemetry)

🎭 THE BUILDER WHO:
${persona.lead} ${persona.tail}
"${persona.tagline}"

🏆 TOP TOOLS:
${toolsText}

"Built different. Built daily."
#DevPersona #DeveloperTools #BuildInPublic #DevWrap`;

    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank', 'noopener,noreferrer');
  });
}

if (shareCard1LinkedInBtn) {
  shareCard1LinkedInBtn.addEventListener('click', async () => {
    if (!currentWrappedData) return;
    const { status, persona, top3 } = currentWrappedData;
    const toolsText = top3.map((t, i) => `• 0${i + 1}. ${t.name} — ${t.unifiedHours.toFixed(1)} active hours`).join('\n');

    const linkedInText = `🚀 Reflecting on my Developer Persona for ${status.monthName} ${status.year}:

Through DevWrap's private local telemetry, my building style was classified as:
🌟 ${persona.lead} ${persona.tail}
"${persona.tagline}"

🏆 Top Producer Stack:
${toolsText}

Understanding active flow state hours across IDEs and AI tools helps turn effort into shipped products.

#SoftwareEngineering #Productivity #DeveloperTools #BuildInPublic #DevWrap`;

    try {
      await navigator.clipboard.writeText(linkedInText);
      showToast('Copied Persona post for LinkedIn! Opening share dialog... 💼');
      window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer');
    } catch {
      showToast('Could not copy to clipboard.');
    }
  });
}

if (copyCard1TextBtn) {
  copyCard1TextBtn.addEventListener('click', async () => {
    if (!currentWrappedData) return;
    const { status, persona, top3 } = currentWrappedData;
    const toolsText = top3.map((t, i) => `0${i + 1}. ${t.name} (${t.unifiedHours.toFixed(1)}h)`).join('\n');

    const text = `01 / YOUR DEV PERSONA · ${status.monthName} ${status.year}
The Builder Who: ${persona.lead} ${persona.tail}
"${persona.tagline}"

TOP TOOLS:
${toolsText}

Built different. Built daily. · DEVWRAP '${currentWrappedData.yearShort}`;

    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Copied Card 1 text to clipboard!');
    } catch {
      showToast('Failed to copy text.');
    }
  });
}

if (downloadCard1ImgBtn) {
  downloadCard1ImgBtn.addEventListener('click', () => {
    exportCardImage('persona');
  });
}

// --- CARD 2 (ECONOMY) SHARING ---

if (shareCard2XBtn) {
  shareCard2XBtn.addEventListener('click', () => {
    if (!currentWrappedData) return;
    const { status, displaySpend, displayTime, displayRate, toolCount, bestTool } = currentWrappedData;

    const tweet = `💳 MY DEV STACK ECONOMY · ${status.monthName} ${status.year} 📊
Tracked with @DevWrap

"Every dollar had a purpose."

💰 Total Monthly Stack: $${displaySpend.toFixed(2)}/mo
⏱️ Active Dev Time: ${displayTime.toFixed(1)} hrs across ${toolCount} tools
⚡ Blended Effective Cost: $${displayRate.toFixed(2)} / hr
(A whole lot of building. Less than a coffee.)

🌟 Best Value Tool: ${bestTool.name} ($${Number(bestTool.rate || 0.47).toFixed(2)}/hr) · HIGH ROI

#DevEconomy #DevStackROI #Productivity #DevWrap #SaaS`;

    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank', 'noopener,noreferrer');
  });
}

if (shareCard2LinkedInBtn) {
  shareCard2LinkedInBtn.addEventListener('click', async () => {
    if (!currentWrappedData) return;
    const { status, displaySpend, displayTime, displayRate, toolCount, bestTool } = currentWrappedData;

    const linkedInText = `📊 My Dev Stack ROI Breakdown — ${status.monthName} ${status.year}:

"Every dollar had a purpose."

Using DevWrap's private telemetry, here is my developer stack economy:
💳 Monthly Subscriptions: $${displaySpend.toFixed(2)}/mo
⏱️ Deep Focus Dev Time: ${displayTime.toFixed(1)} hrs across ${toolCount} tools
💡 Blended Effective Cost: $${displayRate.toFixed(2)} / active hour
🌟 Top ROI Performer: ${bestTool.name} at $${Number(bestTool.rate || 0.47).toFixed(2)}/hr

When your AI and developer tool stack costs less than a single coffee per hour of deep work, flow state is an investment, not an expense.

#DeveloperTools #DevEconomy #Productivity #SoftwareEngineering #DevWrap`;

    try {
      await navigator.clipboard.writeText(linkedInText);
      showToast('Copied Economy post for LinkedIn! Opening share dialog... 💼');
      window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer');
    } catch {
      showToast('Could not copy to clipboard.');
    }
  });
}

if (copyCard2TextBtn) {
  copyCard2TextBtn.addEventListener('click', async () => {
    if (!currentWrappedData) return;
    const { status, displaySpend, displayTime, displayRate, toolCount, bestTool } = currentWrappedData;

    const text = `02 / YOUR DEV ECONOMY · ${status.monthName} ${status.year}
"Every dollar had a purpose."

Total Stack: $${displaySpend.toFixed(2)}/mo
Active Dev Time: ${displayTime.toFixed(1)} hrs (${toolCount} tools)
Blended Effective Cost: $${displayRate.toFixed(2)}/hr
Best Value Tool: ${bestTool.name} ($${Number(bestTool.rate || 0.47).toFixed(2)}/hr)

Spend smart. Ship more. · DEVWRAP '${currentWrappedData.yearShort}`;

    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Copied Card 2 text to clipboard!');
    } catch {
      showToast('Failed to copy text.');
    }
  });
}

if (downloadCard2ImgBtn) {
  downloadCard2ImgBtn.addEventListener('click', () => {
    exportCardImage('economy');
  });
}

/**
 * Client-Side Canvas Renderer: Generates pixel-perfect PNG card images
 * directly downloadable or copyable to clipboard for sharing to friends & social media!
 */
function exportCardImage(cardType) {
  if (!currentWrappedData) return;
  const { status, persona, top3, displaySpend, displayTime, displayRate, toolCount, bestTool, yearShort } = currentWrappedData;

  const canvas = document.createElement('canvas');
  const width = 720;
  const height = 940;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background Dark Charcoal
  ctx.fillStyle = '#0B111E';
  ctx.fillRect(0, 0, width, height);

  // Dot Grid Texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
  const dotSpacing = 20;
  for (let x = 12; x < width; x += dotSpacing) {
    for (let y = 12; y < height; y += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  if (cardType === 'persona') {
    // --- DRAW CARD 1: PERSONA (Lovable Deep Green Palette) ---
    ctx.fillStyle = '#14221C';
    ctx.fillRect(0, 0, width, height);

    // Subtle radial dot texture
    ctx.fillStyle = 'rgba(240, 248, 240, 0.04)';
    for (let x = 12; x < width; x += 18) {
      for (let y = 12; y < height; y += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Header
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 16px monospace';
    ctx.fillText('01', 48, 64);
    ctx.fillStyle = '#FF6B9D';
    ctx.fillText('/', 74, 64);
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('YOUR DEV PERSONA', 90, 64);

    ctx.fillStyle = '#B8FF00';
    ctx.font = '24px sans-serif';
    ctx.fillText('✦', width - 72, 66);

    // Orbiting Badge
    const badgeX = 104;
    const badgeY = 168;

    // Orbit Ring 1 (rotated 35deg)
    ctx.save();
    ctx.translate(badgeX, badgeY);
    ctx.rotate(35 * Math.PI / 180);
    ctx.scale(0.55, 1);
    ctx.strokeStyle = 'rgba(184, 255, 0, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Orbit Ring 2 (rotated -35deg)
    ctx.save();
    ctx.translate(badgeX, badgeY);
    ctx.rotate(-35 * Math.PI / 180);
    ctx.scale(0.55, 1);
    ctx.strokeStyle = 'rgba(184, 255, 0, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Center Badge Icon (Lime disc + Bolt)
    ctx.fillStyle = '#B8FF00';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 36, 0, Math.PI * 2);
    ctx.fill();

    // Dark Bolt in Center
    ctx.fillStyle = '#14221C';
    ctx.beginPath();
    ctx.moveTo(badgeX + 1, badgeY - 18);
    ctx.lineTo(badgeX - 10, badgeY + 1);
    ctx.lineTo(badgeX - 1, badgeY + 1);
    ctx.lineTo(badgeX - 2, badgeY + 18);
    ctx.lineTo(badgeX + 10, badgeY - 1);
    ctx.lineTo(badgeX + 1, badgeY - 1);
    ctx.closePath();
    ctx.fill();

    // Star accents
    ctx.fillStyle = '#FF6B9D';
    ctx.font = '22px sans-serif';
    ctx.fillText('✳', badgeX + 44, badgeY - 32);

    ctx.fillStyle = '#B8FF00';
    ctx.font = '18px sans-serif';
    ctx.fillText('✦', badgeX - 52, badgeY + 44);

    // Persona Title & Tagline
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('THE BUILDER WHO', 180, 134);

    ctx.fillStyle = '#F3F4F6';
    ctx.font = '500 38px Georgia, serif';
    ctx.fillText(persona.lead, 180, 172);

    ctx.fillStyle = '#B8FF00';
    ctx.font = 'italic 500 38px Georgia, serif';
    ctx.fillText(persona.tail, 180, 214);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '16px sans-serif';
    ctx.fillText(`“${persona.tagline}”`, 180, 246);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(48, 276);
    ctx.lineTo(width - 48, 276);
    ctx.stroke();

    // Top Tools Heading
    ctx.fillStyle = '#F3F4F6';
    ctx.font = '800 14px sans-serif';
    ctx.fillText('YOUR TOP TOOLS', 48, 310);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '700 12px sans-serif';
    ctx.fillText('BY ACTIVE TIME', width - 48, 310);
    ctx.textAlign = 'left';

    // Tool Rows
    const maxH = Math.max(...top3.map(t => t.unifiedHours), 1);
    top3.forEach((tool, i) => {
      const rowY = 370 + (i * 92);

      // Rank
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`0${i + 1}`, 48, rowY + 6);

      // Icon circle
      ctx.fillStyle = i === 0 ? 'rgba(251, 146, 60, 0.2)' : (i === 1 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(184, 255, 0, 0.2)');
      ctx.beginPath();
      ctx.roundRect(88, rowY - 24, 44, 44, 10);
      ctx.fill();

      ctx.fillStyle = i === 0 ? '#FB923C' : (i === 1 ? '#F3F4F6' : '#B8FF00');
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? '✦' : (i === 1 ? '</>' : '📚'), 110, rowY + 5);
      ctx.textAlign = 'left';

      // Tool Name & Detail
      ctx.fillStyle = '#F3F4F6';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(tool.name, 148, rowY - 2);

      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px sans-serif';
      const role = i === 0 ? 'Your thinking partner' : (i === 1 ? 'Where the code happened' : 'Ideas into working demos');
      ctx.fillText(role, 148, rowY + 20);

      // Hours & Track on Right
      ctx.fillStyle = '#F3F4F6';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${tool.unifiedHours.toFixed(1)} hrs`, width - 48, rowY);

      const barWidth = 130;
      const progressW = Math.round((tool.unifiedHours / maxH) * barWidth);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(width - 48 - barWidth, rowY + 12, barWidth, 6, 3);
      ctx.fill();

      ctx.fillStyle = '#B8FF00';
      ctx.beginPath();
      ctx.roundRect(width - 48 - barWidth, rowY + 12, progressW, 6, 3);
      ctx.fill();
      ctx.textAlign = 'left';
    });

    // Lower Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(48, 650);
    ctx.lineTo(width - 48, 650);
    ctx.stroke();

    // Milestones Row
    const msY = 700;
    // Milestone 1 (Trophy)
    ctx.fillStyle = 'rgba(184, 255, 0, 0.2)';
    ctx.beginPath();
    ctx.arc(76, msY + 16, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#B8FF00';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆', 76, msY + 24);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 12px sans-serif';
    ctx.fillText('MOST PRODUCTIVE DAY', 114, msY + 8);
    ctx.fillStyle = '#F3F4F6';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Tuesday · 6h 42m', 114, msY + 32);

    // Separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(width / 2, msY);
    ctx.lineTo(width / 2, msY + 44);
    ctx.stroke();

    // Milestone 2 (Flame)
    ctx.fillStyle = 'rgba(255, 107, 157, 0.2)';
    ctx.beginPath();
    ctx.arc((width / 2) + 40, msY + 16, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF6B9D';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔥', (width / 2) + 40, msY + 24);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 12px sans-serif';
    ctx.fillText('PERSONAL BEST STREAK', (width / 2) + 76, msY + 8);
    ctx.fillStyle = '#F3F4F6';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('12 days', (width / 2) + 76, msY + 32);

    // Footer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(48, 830);
    ctx.lineTo(width - 48, 830);
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('BUILT DIFFERENT. BUILT DAILY.', 48, 874);

    ctx.fillStyle = '#FF6B9D';
    ctx.fillText('●', 300, 874);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`DEVWRAP ’${yearShort}`, width - 48, 874);
    ctx.textAlign = 'left';

  } else {
    // --- DRAW CARD 2: ECONOMY (Lovable Surface Palette) ---
    ctx.fillStyle = '#1D232F';
    ctx.fillRect(0, 0, width, height);

    // Subtle texture
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let x = 12; x < width; x += 18) {
      for (let y = 12; y < height; y += 18) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Header
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 16px monospace';
    ctx.fillText('02', 48, 64);
    ctx.fillStyle = '#FF6B9D';
    ctx.fillText('/', 74, 64);
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('YOUR DEV ECONOMY', 90, 64);

    ctx.fillStyle = '#FF6B9D';
    ctx.font = '24px sans-serif';
    ctx.fillText('✦', width - 72, 66);

    // Quote Section
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('YOUR TOOLS, PUT TO WORK', 48, 126);

    ctx.fillStyle = '#F3F4F6';
    ctx.font = '500 42px Georgia, serif';
    ctx.fillText('Every dollar had a ', 48, 172);
    const textW = ctx.measureText('Every dollar had a ').width;

    ctx.fillStyle = '#FF6B9D';
    ctx.font = 'italic 500 42px Georgia, serif';
    ctx.fillText('purpose.', 48 + textW, 172);

    // Total Stack Monthly
    const stackBoxY = 216;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(48, stackBoxY);
    ctx.lineTo(width - 48, stackBoxY);
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('TOTAL STACK · MONTHLY', 48, stackBoxY + 36);

    ctx.fillStyle = '#F3F4F6';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(`$${displaySpend.toFixed(2)}`, 48, stackBoxY + 92);
    const spendW = ctx.measureText(`$${displaySpend.toFixed(2)}`).width;

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 18px sans-serif';
    ctx.fillText(' / mo', 48 + spendW, stackBoxY + 92);

    // Conic Gradient Ring on Right
    const donutX = width - 96;
    const donutY = stackBoxY + 60;
    ctx.lineWidth = 10;

    // Segment 1 (Coral - 43%)
    ctx.strokeStyle = '#FF6B9D';
    ctx.beginPath();
    ctx.arc(donutX, donutY, 32, -Math.PI / 2, 0.36 * Math.PI);
    ctx.stroke();

    // Segment 2 (Deep Green - 34%)
    ctx.strokeStyle = '#14221C';
    ctx.beginPath();
    ctx.arc(donutX, donutY, 32, 0.36 * Math.PI, 1.04 * Math.PI);
    ctx.stroke();

    // Segment 3 (Lime - 14%)
    ctx.strokeStyle = '#B8FF00';
    ctx.beginPath();
    ctx.arc(donutX, donutY, 32, 1.04 * Math.PI, 1.32 * Math.PI);
    ctx.stroke();

    // Segment 4 (Gray - 9%)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(donutX, donutY, 32, 1.32 * Math.PI, 1.5 * Math.PI);
    ctx.stroke();

    // Ring Center
    ctx.fillStyle = '#1D232F';
    ctx.beginPath();
    ctx.arc(donutX, donutY, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F3F4F6';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📚', donutX, donutY + 6);
    ctx.textAlign = 'left';

    // Sub Metrics Row
    const subY = 348;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(48, subY);
    ctx.lineTo(width - 48, subY);
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('⏱️ ACTIVE DEV TIME', 48, subY + 34);
    ctx.fillStyle = '#F3F4F6';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${displayTime.toFixed(1)} `, 48, subY + 70);
    const timeW = ctx.measureText(`${displayTime.toFixed(1)} `).width;
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '16px sans-serif';
    ctx.fillText('hrs', 48 + timeW, subY + 70);

    // Separator
    ctx.beginPath();
    ctx.moveTo(width / 2, subY + 12);
    ctx.lineTo(width / 2, subY + 76);
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('</> YOUR STACK', (width / 2) + 32, subY + 34);
    ctx.fillStyle = '#F3F4F6';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`${toolCount} `, (width / 2) + 32, subY + 70);
    const countW = ctx.measureText(`${toolCount} `).width;
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '16px sans-serif';
    ctx.fillText('tools', (width / 2) + 32 + countW, subY + 70);

    // Blended Effective Cost Box (Lovable .rate-panel)
    const costBoxY = 466;
    ctx.fillStyle = '#14221C';
    ctx.beginPath();
    ctx.roundRect(48, costBoxY, width - 96, 178, 14);
    ctx.fill();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('BLENDED EFFECTIVE COST', 74, costBoxY + 34);

    ctx.fillStyle = '#B8FF00';
    ctx.fillText('|||||', width - 110, costBoxY + 34);

    ctx.fillStyle = '#B8FF00';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(`$${displayRate.toFixed(2)}`, 74, costBoxY + 92);
    const rateW = ctx.measureText(`$${displayRate.toFixed(2)}`).width;
    ctx.fillStyle = '#F3F4F6';
    ctx.font = '500 18px sans-serif';
    ctx.fillText(' / hr', 74 + rateW, costBoxY + 92);

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px sans-serif';
    ctx.fillText('A whole lot of building. Less than a coffee.', 74, costBoxY + 122);

    // 31 Sparkline bars in Cost Box
    const histY = costBoxY + 162;
    const barHeights = [10, 14, 22, 16, 28, 12, 24, 30, 14, 26, 32, 18, 30, 12, 22, 28, 16, 30, 34, 18, 26, 30, 14, 22, 28, 16, 32, 20, 26, 30, 24];
    barHeights.forEach((h, i) => {
      ctx.fillStyle = (i === 4 || i === 9 || i === 18 || i === 26) ? '#B8FF00' : 'rgba(184, 255, 0, 0.46)';
      ctx.beginPath();
      ctx.roundRect(74 + (i * 18), histY - h, 12, h, 2);
      ctx.fill();
    });

    // Best Value Tool Box
    const bestY = 672;
    ctx.fillStyle = 'rgba(184, 255, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(76, bestY + 34, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#B8FF00';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓', 76, bestY + 42);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '800 12px sans-serif';
    ctx.fillText('BEST VALUE TOOL', 114, bestY + 24);

    ctx.fillStyle = '#F3F4F6';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(bestTool.name, 114, bestY + 52);
    const nameW = ctx.measureText(bestTool.name).width;

    ctx.fillStyle = '#9CA3AF';
    ctx.font = '16px monospace';
    ctx.fillText(` $${Number(bestTool.rate || 0.47).toFixed(2)}/hr`, 114 + nameW, bestY + 52);

    // High ROI Chip
    ctx.fillStyle = 'rgba(184, 255, 0, 0.15)';
    ctx.beginPath();
    ctx.roundRect(width - 168, bestY + 18, 96, 32, 16);
    ctx.fill();

    ctx.fillStyle = '#B8FF00';
    ctx.font = '800 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH ROI', width - 120, bestY + 39);
    ctx.textAlign = 'left';

    // Footer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(48, 830);
    ctx.lineTo(width - 48, 830);
    ctx.stroke();

    ctx.fillStyle = '#9CA3AF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SPEND SMART. SHIP MORE.', 48, 874);

    ctx.fillStyle = '#FF6B9D';
    ctx.fillText('●', 270, 874);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#9CA3AF';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`DEVWRAP ’${yearShort}`, width - 48, 874);
    ctx.textAlign = 'left';
  }

  // Convert canvas to PNG blob for download & clipboard
  canvas.toBlob(async (blob) => {
    if (!blob) return;

    // Direct Download
    const fileName = `DevWrap-${cardType === 'persona' ? 'Persona' : 'Economy'}-${status.monthName}-${status.year}.png`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Also attempt copy to clipboard for direct paste
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast(`📸 Saved ${fileName} & copied image to clipboard!`);
    } catch {
      showToast(`📸 Downloaded ${fileName}!`);
    }
  }, 'image/png');
}



// -------------------------------------------------------------
// Custom Tool / Subscription Form Handlers
// -------------------------------------------------------------

toggleAddFormBtn.addEventListener('click', () => {
  const isHidden = addForm.classList.contains('hidden');
  if (isHidden) {
    addForm.classList.remove('hidden');
    addFormArrow.textContent = '▲';
    subNameInput.focus();
  } else {
    addForm.classList.add('hidden');
    addFormArrow.textContent = '▼';
  }
});

function updateCustomTierFields() {
  const isFree = subTierSelect.value === 'free';
  const isCustom = subTierSelect.value === 'custom';
  subCostInput.value = isFree ? '0.00' : subCostInput.value;
  subCostInput.readOnly = isFree;
  customPlanNameGroup.classList.toggle('hidden', !isCustom);
}

subTierSelect.addEventListener('change', updateCustomTierFields);
subTrackingType?.querySelectorAll('.tracking-type-btn').forEach(button => {
  button.addEventListener('click', () => {
    selectedTrackingType = button.dataset.type;
    subTrackingType.querySelectorAll('.tracking-type-btn').forEach(item => {
      item.classList.toggle('active-tracking-type', item === button);
    });
  });
});
updateCustomTierFields();

autofillCurrentTabBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'GET_CURRENT_TAB_INFO' }, (response) => {
    if (response && response.success && response.domain) {
      subDomainInput.value = response.domain;
      if (!subNameInput.value) {
        subNameInput.value = response.title || response.domain;
      }
      selectedTrackingType = 'web';
      subTrackingType?.querySelectorAll('.tracking-type-btn').forEach(item => {
        item.classList.toggle('active-tracking-type', item.dataset.type === 'web');
      });
      showToast(`Detected ${response.domain}`);
    } else {
      showToast('Could not detect active web tab');
    }
  });
});

saveSubBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  const name = subNameInput.value.trim();
  const domain = normalizeDomain(subDomainInput.value);
  const cost = parseFloat(subCostInput.value);
  const tier = subTierSelect.value;
  const planName = subPlanNameInput.value.trim();
  const type = selectedTrackingType;
  const displayName = tier === 'custom' && planName ? `${name || domain} ${planName}` : name || domain;

  if (!domain) {
    showToast('Please enter a valid domain or app identifier');
    return;
  }

  if (isNaN(cost) || cost < 0) {
    showToast('Please enter a valid monthly cost');
    return;
  }

  // When marked as Desktop App, automatically issue POST /filters and re-fetch GET /filters
  if (type === 'desktop') {
    const rawDomain = subDomainInput.value.trim();
    const appFilter = (rawDomain.includes('.') ? rawDomain.split('.')[0] : rawDomain) || name;
    await syncFilterToDesktopCompanion(appFilter);
  }

  chrome.runtime.sendMessage({
    action: 'ADD_SUBSCRIPTION',
    payload: {
      name: displayName,
      domain: domain,
      monthlyCost: cost,
      type: type,
      planTier: tier
    }
  }, async (response) => {
    if (response && response.success) {
      showToast(`Tracked ${displayName}!`);
      subNameInput.value = '';
      subTierSelect.value = 'free';
      subPlanNameInput.value = '';
      subCostInput.value = '0.00';
      subDomainInput.value = '';
      updateCustomTierFields();
      addForm.classList.add('hidden');
      addFormArrow.textContent = '▼';
      if (type === 'desktop') {
        await fetchDesktopFilters();
      }
      // Immediately trigger a fetch to http://127.0.0.1:8080/stats on new subscription
      await ingestDesktopStats();
      loadData();
    } else {
      showToast(response?.error || 'Failed to add subscription');
    }
  });
});

function handleDeleteSubscription(id, name) {
  if (confirm(`Stop tracking "${name}"?`)) {
    // Check if the subscription being deleted is a Desktop App
    const subToDelete = subscriptions.find(s => s.id === id);
    if (subToDelete && subToDelete.type === 'desktop') {
      const cleanDom = normalizeDomain(subToDelete.domain);
      const filterId = (cleanDom.includes('.') ? cleanDom.split('.')[0] : cleanDom) || (name || '').toLowerCase().trim();
      deleteFilterFromDesktopCompanion(filterId);
    }

    chrome.runtime.sendMessage({
      action: 'DELETE_SUBSCRIPTION',
      payload: { id }
    }, (response) => {
      if (response && response.success) {
        showToast(`Removed "${name}"`);
        loadData();
      } else {
        showToast('Failed to delete tool');
      }
    });
  }
}

// -------------------------------------------------------------
// Filter Buttons
// -------------------------------------------------------------

if (filterContainer) {
  filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterContainer.querySelectorAll('.filter-btn').forEach(b => {
        b.className = 'filter-btn px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white';
      });
      btn.className = 'filter-btn px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium active-filter';

      currentFilter = btn.dataset.filter || 'all';
      renderSubscriptionsList();
    });
  });
}

// -------------------------------------------------------------
// Realtime Storage Change Listener
// -------------------------------------------------------------

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.subscriptions) {
      subscriptions = changes.subscriptions.newValue || [];
    }
    if (changes.usageData) {
      usageData = changes.usageData.newValue || {};
    }
    if (changes.desktopConnected !== undefined) {
      updateDesktopStatusUI(changes.desktopConnected.newValue);
    }
    if (changes.desktopStats) {
      desktopStats = changes.desktopStats.newValue || {};
    }
    if (changes.simulateDropDay !== undefined) {
      simulateDropDay = !!changes.simulateDropDay.newValue;
      updateDropCountdownUI();
    }
    if (changes.forceLocked !== undefined) {
      forceLocked = !!changes.forceLocked.newValue;
      updateDropCountdownUI();
    }
    if (changes.onboardingCompleted !== undefined) {
      onboardingCompleted = !!changes.onboardingCompleted.newValue;
      evaluateOnboardingState();
    }
    renderUI();
  }
});

// -------------------------------------------------------------
// Modal Backdrop Close Listeners
// -------------------------------------------------------------

window.addEventListener('click', (e) => {
  if (e.target === companionModal) {
    companionModal.classList.add('hidden');
  }
  if (e.target === wrappedModal) {
    wrappedModal.classList.add('hidden');
  }
});

// -------------------------------------------------------------
// Initialize Dashboard
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  // Immediately trigger a fetch to http://127.0.0.1:8080/stats whenever popup opens
  ingestDesktopStats();
  checkDesktopCompanionHealth();
  updateDropCountdownUI();

  // Run 1-second countdown clock ticker
  if (dropCountdownTimer) clearInterval(dropCountdownTimer);
  dropCountdownTimer = setInterval(updateDropCountdownUI, 1000);

  // Run 5-second health check and desktop stats ingestion loop while popup is active
  setInterval(async () => {
    await checkDesktopCompanionHealth();
    await ingestDesktopStats();
  }, 5000);
});
