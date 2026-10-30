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

const openWrappedBtn = document.getElementById('openWrappedBtn');
const wrappedModal = document.getElementById('wrappedModal');
const closeWrappedBtn = document.getElementById('closeWrappedBtn');
const wrappedTopTool = document.getElementById('wrappedTopTool');
const wrappedSpend = document.getElementById('wrappedSpend');
const wrappedTime = document.getElementById('wrappedTime');
const wrappedBreakdown = document.getElementById('wrappedBreakdown');
const wrappedAvg = document.getElementById('wrappedAvg');
const copyWrappedBtn = document.getElementById('copyWrappedBtn');
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
const wrappedLockedState = document.getElementById('wrappedLockedState');
const wrappedUnlockedState = document.getElementById('wrappedUnlockedState');
const lockedMonthBadge = document.getElementById('lockedMonthBadge');
const countdownClock = document.getElementById('countdownClock');
const lockedActionBtn = document.getElementById('lockedActionBtn');
const lockedBtnText = document.getElementById('lockedBtnText');
const toggleDropSimBtn = document.getElementById('toggleDropSimBtn');
const toggleDropLockBtn = document.getElementById('toggleDropLockBtn');

const wrappedLockedView = document.getElementById('wrappedLockedView');
const wrappedUnlockedView = document.getElementById('wrappedUnlockedView');
const modalCountdownClock = document.getElementById('modalCountdownClock');
const wrappedMonthTitle = document.getElementById('wrappedMonthTitle');
const wrappedPersonaBadge = document.getElementById('wrappedPersonaBadge');
const wrappedPersona = document.getElementById('wrappedPersona');
const copyWrappedTwitterBtn = document.getElementById('copyWrappedTwitterBtn');
const copyWrappedLinkedInBtn = document.getElementById('copyWrappedLinkedInBtn');

// First-Time "Companion First" Onboarding Elements
const onboardingView = document.getElementById('onboardingView');
const dashboardView = document.getElementById('dashboardView');
const onboardingDownloadBtn = document.getElementById('onboardingDownloadBtn');
const onboardingSkipBtn = document.getElementById('onboardingSkipBtn');
const onboardingPairingBox = document.getElementById('onboardingPairingBox');
const onboardingPairingDot = document.getElementById('onboardingPairingDot');
const onboardingPairingStatus = document.getElementById('onboardingPairingStatus');
const onboardingPairingSubtext = document.getElementById('onboardingPairingSubtext');

// Set this to the direct DMG asset URL from the project's GitHub Releases page
// before publishing the extension, for example:
// https://github.com/your-github-username/devwrap/releases/latest/download/DevWrap-Desktop-Companion-macos.dmg
// Leave empty while developing: the Download buttons will show local setup steps
// instead of opening a broken external link.
const DESKTOP_COMPANION_DMG_URL = '';

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
  }
  if (subName.includes('code') || rawDom.includes('code') || subName.includes('vs code') || rawDom.includes('visualstudio')) {
    tokens.add('code');
    tokens.add('vscode');
    tokens.add('visual studio code');
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
 * and saves desktop hours to chrome.storage.local under their respective tool cards.
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

    // Ensure subscriptions and usageData are loaded from storage if memory state is empty
    if (subscriptions.length === 0) {
      const stored = await chrome.storage.local.get(['subscriptions', 'usageData']);
      if (stored.subscriptions && stored.subscriptions.length > 0) {
        subscriptions = stored.subscriptions;
      }
      if (stored.usageData) {
        usageData = stored.usageData;
      }
    }

    // Update usageData for monitored subscriptions
    const month = getCurrentMonthKey();
    let hasChanges = false;

    subscriptions.forEach(sub => {
      const dom = normalizeDomain(sub.domain);

      // Aggregate desktop heartbeats matching custom process filters
      // (case-insensitive substring match on process name and window title)
      let matchingSeconds = 0;
      heartbeats.forEach(hb => {
        const dur = Number(hb.duration_seconds) || 15;
        if (matchesSubscriptionHeartbeat(sub, hb)) {
          matchingSeconds += dur;
        }
      });

      if (!usageData[dom]) {
        usageData[dom] = {
          webSeconds: 0,
          desktopSeconds: 0,
          baselineDesktopSeconds: 0,
          totalSeconds: 0,
          dailySeconds: {},
          monthlySeconds: {},
          lastActive: null
        };
      }

      const baseline = usageData[dom].baselineDesktopSeconds || 0;
      const newDesktopSeconds = baseline + matchingSeconds;

      if (usageData[dom].desktopSeconds !== newDesktopSeconds) {
        usageData[dom].desktopSeconds = newDesktopSeconds;
        usageData[dom].totalSeconds = (usageData[dom].webSeconds || 0) + newDesktopSeconds;
        if (!usageData[dom].monthlySeconds) usageData[dom].monthlySeconds = {};
        usageData[dom].monthlySeconds[month] = usageData[dom].totalSeconds;
        hasChanges = true;
      }
    });

    await chrome.storage.local.set({
      desktopHeartbeats: heartbeats,
      desktopStats: statsByFilter,
      lastDesktopSync: Date.now(),
      usageData
    });

    renderUI();
  } catch (err) {
    console.warn('[DevWrap] Error ingesting desktop stats:', err);
  }
}

// -------------------------------------------------------------
// Unified Telemetry Calculations (Web + Desktop)
// -------------------------------------------------------------

/**
 * Calculates unified active seconds for a subscription across Web and Desktop IDEs.
 */
function getUnifiedSecondsForSub(sub) {
  const currentMonth = getCurrentMonthKey();
  const dom = normalizeDomain(sub.domain);
  const usage = usageData[dom];

  if (!usage) return 0;

  // If explicit desktopSeconds or webSeconds exist, sum them
  if (usage.desktopSeconds !== undefined || usage.webSeconds !== undefined) {
    return (usage.webSeconds || 0) + (usage.desktopSeconds || 0);
  }

  return usage.monthlySeconds?.[currentMonth] !== undefined
    ? usage.monthlySeconds[currentMonth]
    : (usage.totalSeconds || 0);
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
          'onboardingCompleted'
        ], (stored) => {
          subscriptions = stored.subscriptions || [];
          usageData = stored.usageData || {};
          desktopConnected = !!stored.desktopConnected;
          desktopStats = stored.desktopStats || {};
          simulateDropDay = !!stored.simulateDropDay;
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
 * Computes & Renders Summary Metrics (Total Spend, Total Hours, Avg ROI)
 */
function renderSummaryHeader() {
  let totalMonthlySpend = 0;
  let totalTrackedSeconds = 0;

  subscriptions.forEach(sub => {
    totalMonthlySpend += Number(sub.monthlyCost) || 0;
    totalTrackedSeconds += getUnifiedSecondsForSub(sub);
  });

  const totalTrackedHours = totalTrackedSeconds / 3600;

  totalSpendEl.textContent = `$${totalMonthlySpend.toFixed(2)}`;
  subCountEl.textContent = `${subscriptions.length} subscription${subscriptions.length === 1 ? '' : 's'}`;
  totalHoursEl.textContent = `${totalTrackedHours.toFixed(1)} hrs`;

  if (totalTrackedHours > 0) {
    const avgRate = totalMonthlySpend / totalTrackedHours;
    avgCostPerHourEl.textContent = `Avg $${avgRate.toFixed(2)}/hr`;
  } else {
    avgCostPerHourEl.textContent = 'Avg $0.00/hr';
  }
}

/**
 * Renders Subscriptions List Cards & Filter State
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

    const seconds = getUnifiedSecondsForSub(sub);
    const hours = seconds / 3600;
    const roi = getRoiEvaluation(sub.monthlyCost, hours);

    return roi.category === currentFilter;
  });

  if (filteredSubs.length === 0) {
    subListEl.innerHTML = `
      <div class="card-glow rounded-xl p-4 text-center text-slate-400 text-xs">
        No tools match the "${currentFilter === 'high' ? 'High ROI' : 'Waste Alert'}" filter.
      </div>
    `;
    return;
  }

  filteredSubs.forEach(sub => {
    const dom = normalizeDomain(sub.domain);
    const totalSeconds = getUnifiedSecondsForSub(sub);
    const hours = totalSeconds / 3600;
    const roi = getRoiEvaluation(sub.monthlyCost, hours);
    const isActivelyTracking = activeSession && activeSession.domain === dom;

    const card = document.createElement('div');
    card.className = `card-glow rounded-xl p-3 sub-item-card ${isActivelyTracking ? 'is-active-tab' : ''}`;
    card.dataset.id = sub.id;

    const toolIcon = getToolIcon(sub);
    const isDesktop = sub.type === 'desktop';

    // 1. Display Minutes + Hours on Tracked Cards:
    // - Calculate elapsed minutes and hours
    // - If totalSeconds > 0, display formatted text as: `${mins}m (${hrs}h)` (e.g. "14m (0.2h)")
    // - If totalSeconds === 0, display "No usage" (text-rose-400)
    let trackedTimeHtml = '';
    if (totalSeconds > 0) {
      const mins = Math.floor(totalSeconds / 60);
      const hrs = (totalSeconds / 3600).toFixed(1);
      trackedTimeHtml = `<div class="text-xs font-bold text-emerald-400">${mins}m (${hrs}h)</div>`;
    } else {
      trackedTimeHtml = `<div class="text-xs font-bold text-rose-400">No usage</div>`;
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
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${roi.badgeClass}">
            ● ${roi.label}
          </span>
          <button class="delete-btn text-slate-500 hover:text-rose-400 p-1 text-xs transition" data-id="${sub.id}" title="Remove tool">
            ✕
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 bg-slate-900/60 rounded-lg p-2 border border-slate-800/80 text-center">
        <div>
          <div class="text-[9px] text-slate-500 uppercase tracking-wider">Spend</div>
          <div class="text-xs font-bold text-slate-200">$${Number(sub.monthlyCost).toFixed(2)}/mo</div>
        </div>
        <div>
          <div class="text-[9px] text-slate-500 uppercase tracking-wider">Tracked Time</div>
          ${trackedTimeHtml}
        </div>
        <div>
          <div class="text-[9px] text-slate-500 uppercase tracking-wider">Effective Cost</div>
          <div class="text-xs font-bold ${roi.category === 'waste' ? 'text-rose-400' : 'text-indigo-300'}">${roi.costPerHourText}</div>
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
 * Calculates whether today is the 1st of the month in UTC (00:00 UTC to 23:59 UTC),
 * and the remaining time until the 1st day of the upcoming month at 00:00 UTC.
 */
function getDropStatus() {
  const now = new Date();
  const utcDay = now.getUTCDate();
  const isUnlocked = simulateDropDay || (utcDay === 1);

  // Upcoming month 1st day at 00:00:00 UTC
  let targetYear = now.getUTCFullYear();
  let targetMonth = now.getUTCMonth() + 1;
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear++;
  }
  const nextDropDate = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
  const diffMs = Math.max(0, nextDropDate.getTime() - now.getTime());

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const monthName = now.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }).toUpperCase();
  const year = now.getUTCFullYear();

  return {
    isUnlocked,
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
 * Ticks the countdown clock and updates the dual-state trigger UI in real-time.
 */
function updateDropCountdownUI() {
  const status = getDropStatus();
  const pad = (n) => String(n).padStart(2, '0');

  const formattedCountdown = `${status.days}d : ${pad(status.hours)}h : ${pad(status.minutes)}m : ${pad(status.seconds)}s`;
  const shortCountdown = `${status.days}d ${status.hours}h`;

  if (countdownClock) {
    countdownClock.textContent = formattedCountdown;
  }
  if (modalCountdownClock) {
    modalCountdownClock.textContent = formattedCountdown;
  }
  if (lockedMonthBadge) {
    lockedMonthBadge.textContent = `🔒 ${status.monthName} STACK WRAPPED LOCKED: ${status.days}d : ${pad(status.hours)}h : ${pad(status.minutes)}m`;
  }
  if (lockedBtnText) {
    lockedBtnText.textContent = `🔒 Next Stack Wrapped Unlocks in ${shortCountdown}`;
  }
  if (wrappedMonthTitle) {
    wrappedMonthTitle.textContent = `${status.monthName} ${status.year} DEV STACK WRAPPED`;
  }

  if (status.isUnlocked) {
    if (wrappedLockedState) wrappedLockedState.classList.add('hidden');
    if (wrappedUnlockedState) wrappedUnlockedState.classList.remove('hidden');
  } else {
    if (wrappedLockedState) wrappedLockedState.classList.remove('hidden');
    if (wrappedUnlockedState) wrappedUnlockedState.classList.add('hidden');
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
  if (totalHours === 0) return '⚡ 10x Code Artisan';

  if (aiHours / totalHours >= 0.4) return '🧠 AI Prompt Architect';
  if (codeHours / totalHours >= 0.4) return '⚡ 10x Code Artisan';
  if (devOpsHours / totalHours >= 0.3) return '🛠️ Systems & API Overlord';
  if (designHours / totalHours >= 0.3) return '🎨 Pixel-Perfect Architect';
  if (totalDesktopHours > totalWebHours * 1.5) return '💻 Deep Focus IDE Craftsman';
  return '🚀 Full-Stack Polymath';
}

/**
 * Opens Locked Privacy Shield Modal view.
 * Hides raw monthly stack totals and specific hourly rates to build anticipation.
 */
function openLockedPrivacyModal() {
  updateDropCountdownUI();
  if (wrappedUnlockedView) wrappedUnlockedView.classList.add('hidden');
  if (wrappedLockedView) wrappedLockedView.classList.remove('hidden');
  if (wrappedModal) wrappedModal.classList.remove('hidden');
}

/**
 * Sums both:
 * 1. Web Tab Hours (tracked natively in Chrome)
 * 2. Desktop IDE Hours (fetched from http://127.0.0.1:8080/stats)
 * Generates the high-contrast 16:9 terminal card featuring top producer tool,
 * hourly rate, persona badge, and social share formatting.
 */
async function openDevStackWrapped() {
  const status = getDropStatus();

  // Strict Lock Check: If not unlocked, show Privacy Shield
  if (!status.isUnlocked) {
    showToast(`🔒 Stack Wrapped unlocks in ${status.days}d ${status.hours}h!`);
    openLockedPrivacyModal();
    return;
  }

  // Ingest latest stats if connected
  if (desktopConnected) {
    await ingestDesktopStats();
  }

  const currentMonth = getCurrentMonthKey();
  let totalMonthlySpend = 0;
  let totalWebSeconds = 0;
  let totalDesktopSeconds = 0;

  let topTool = null;
  let topUnifiedHours = -1;

  subscriptions.forEach(sub => {
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

    totalWebSeconds += webSec;
    totalDesktopSeconds += desktopSec;

    if (unifiedHours > topUnifiedHours) {
      topUnifiedHours = unifiedHours;
      topTool = sub;
    }
  });

  const totalWebHours = totalWebSeconds / 3600;
  const totalDesktopHours = totalDesktopSeconds / 3600;
  const combinedTotalHours = totalWebHours + totalDesktopHours;
  const avgRate = combinedTotalHours > 0 ? (totalMonthlySpend / combinedTotalHours) : 0;

  const topToolRate = (topTool && topUnifiedHours > 0)
    ? (Number(topTool.monthlyCost) / topUnifiedHours).toFixed(2)
    : '0.00';

  const persona = calculateDeveloperPersona(totalWebHours, totalDesktopHours, topTool);

  // Render 16:9 Terminal Card
  if (wrappedPersona) wrappedPersona.textContent = persona;
  if (wrappedTopTool) {
    wrappedTopTool.textContent = topTool
      ? `${topTool.name} (${topUnifiedHours.toFixed(1)} hrs @ $${topToolRate}/hr)`
      : 'None tracked';
  }
  if (wrappedSpend) wrappedSpend.textContent = `$${totalMonthlySpend.toFixed(2)}/mo`;
  if (wrappedTime) wrappedTime.textContent = `${combinedTotalHours.toFixed(1)} hrs`;
  if (wrappedBreakdown) {
    wrappedBreakdown.textContent = `↳ 🌐 Web: ${totalWebHours.toFixed(1)}h | 💻 Desktop IDE: ${totalDesktopHours.toFixed(1)}h`;
  }
  if (wrappedAvg) wrappedAvg.textContent = `$${avgRate.toFixed(2)}/hr`;

  // Display Unlocked View
  if (wrappedLockedView) wrappedLockedView.classList.add('hidden');
  if (wrappedUnlockedView) wrappedUnlockedView.classList.remove('hidden');
  if (wrappedModal) wrappedModal.classList.remove('hidden');
}

// Dev simulator toggles for instant verification of locked & unlocked drop states
if (toggleDropSimBtn) {
  toggleDropSimBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    simulateDropDay = true;
    await chrome.storage.local.set({ simulateDropDay: true });
    updateDropCountdownUI();
    showToast('✨ Simulating Global Drop Day (Unlocked)!');
  });
}

if (toggleDropLockBtn) {
  toggleDropLockBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    simulateDropDay = false;
    await chrome.storage.local.set({ simulateDropDay: false });
    updateDropCountdownUI();
    showToast('🔒 Re-locked State Active (Days 2-31)');
  });
}

if (lockedActionBtn) {
  lockedActionBtn.addEventListener('click', () => {
    const status = getDropStatus();
    showToast(`🔒 Stack Wrapped unlocks in ${status.days}d ${status.hours}h!`);
    openLockedPrivacyModal();
  });
}

if (openWrappedBtn) {
  openWrappedBtn.addEventListener('click', openDevStackWrapped);
}

// Onboarding Action Button Listeners
if (onboardingDownloadBtn) {
  onboardingDownloadBtn.addEventListener('click', () => {
    if (DESKTOP_COMPANION_DMG_URL) {
      showToast('Downloading the macOS companion... Install it once to enable launch at login.');
      window.open(DESKTOP_COMPANION_DMG_URL, '_blank', 'noopener,noreferrer');
    } else {
      showToast('No public release is configured yet. Showing local setup instructions.');
      if (companionModal) companionModal.classList.remove('hidden');
    }
  });
}

if (onboardingSkipBtn) {
  onboardingSkipBtn.addEventListener('click', async () => {
    onboardingCompleted = true;
    await chrome.storage.local.set({ onboardingCompleted: true });
    showDashboardView();
    showToast('Tracking Web-Only tools for now. You can pair Desktop Companion anytime!');
  });
}

// Close listeners for modal triggers
document.querySelectorAll('.close-wrapped-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    if (wrappedModal) wrappedModal.classList.add('hidden');
  });
});

if (closeWrappedBtn) {
  closeWrappedBtn.addEventListener('click', () => {
    if (wrappedModal) wrappedModal.classList.add('hidden');
  });
}

// Copy for X / Twitter Formatter
if (copyWrappedTwitterBtn) {
  copyWrappedTwitterBtn.addEventListener('click', async () => {
    const status = getDropStatus();
    const personaText = wrappedPersona ? wrappedPersona.textContent : '10x Code Artisan';
    const topToolText = wrappedTopTool ? wrappedTopTool.textContent : 'Cursor Pro';
    const spendText = wrappedSpend ? wrappedSpend.textContent : '$0/mo';
    const timeText = wrappedTime ? wrappedTime.textContent : '0 hrs';
    const breakdownText = wrappedBreakdown ? wrappedBreakdown.textContent.replace('↳ ', '') : 'Web: 0h | Desktop: 0h';
    const avgText = wrappedAvg ? wrappedAvg.textContent : '$0/hr';

    const twitterShareText = `⚡ ${status.monthName} ${status.year} DEV STACK WRAPPED 🚀
Tracked via DevWrap (100% Local-First Hybrid Telemetry)

🎖️ Persona: ${personaText}
🏆 TOP PRODUCER: ${topToolText}
⏱️ UNIFIED DEV TIME: ${timeText} (${breakdownText})
📊 TOTAL SPEND: ${spendText}
💡 EFFECTIVE HOURLY COST: ${avgText}

"Building with an AI dev stack that costs less than 1 cup of coffee per active hour."

#DevStack #BuildingInPublic #DeveloperTools #AI #DevWrap`;

    try {
      await navigator.clipboard.writeText(twitterShareText);
      copyWrappedTwitterBtn.innerHTML = '<span>✅</span> Copied for X!';
      showToast('Copied post formatted for X / Twitter! 𝕏');
      setTimeout(() => {
        copyWrappedTwitterBtn.innerHTML = '<span>𝕏</span> Share on X';
      }, 2500);
    } catch (e) {
      showToast('Failed to copy text.');
    }
  });
}

// Copy for LinkedIn Formatter
if (copyWrappedLinkedInBtn) {
  copyWrappedLinkedInBtn.addEventListener('click', async () => {
    const status = getDropStatus();
    const personaText = wrappedPersona ? wrappedPersona.textContent : '10x Code Artisan';
    const topToolText = wrappedTopTool ? wrappedTopTool.textContent : 'Cursor Pro';
    const spendText = wrappedSpend ? wrappedSpend.textContent : '$0/mo';
    const timeText = wrappedTime ? wrappedTime.textContent : '0 hrs';
    const breakdownText = wrappedBreakdown ? wrappedBreakdown.textContent.replace('↳ ', '') : '';
    const avgText = wrappedAvg ? wrappedAvg.textContent : '$0/hr';

    const linkedInShareText = `🚀 Reflecting on my Developer Stack ROI for ${status.monthName} ${status.year}.

Using DevWrap's private hybrid telemetry (tracking both web browser tools and local desktop IDEs via companion daemon), here is my dev stack breakdown:

🎖️ Persona: ${personaText}
🏆 Top Producer Tool: ${topToolText}
⏱️ Total Active Building Time: ${timeText}
   ${breakdownText}
💳 Monthly Tool Subscriptions: ${spendText}
💡 Effective Stack Cost: ${avgText} / hour of deep work

Optimizing tool ROI matters as much as optimizing code performance. When tools pay for themselves in flow state, the math is undeniable.

#SoftwareEngineering #Productivity #DeveloperTools #BuildingInPublic #DevOps #AI`;

    try {
      await navigator.clipboard.writeText(linkedInShareText);
      copyWrappedLinkedInBtn.innerHTML = '<span>✅</span> Copied for LinkedIn!';
      showToast('Copied post formatted for LinkedIn! 💼');
      setTimeout(() => {
        copyWrappedLinkedInBtn.innerHTML = '<span>💼</span> Post to LinkedIn';
      }, 2500);
    } catch (e) {
      showToast('Failed to copy text.');
    }
  });
}

// Legacy / Quick Copy Button
if (copyWrappedBtn) {
  copyWrappedBtn.addEventListener('click', async () => {
    const status = getDropStatus();
    const personaText = wrappedPersona ? wrappedPersona.textContent : '10x Code Artisan';
    const topToolText = wrappedTopTool ? wrappedTopTool.textContent : 'Cursor Pro';
    const spendText = wrappedSpend ? wrappedSpend.textContent : '$0/mo';
    const timeText = wrappedTime ? wrappedTime.textContent : '0 hrs';
    const breakdownText = wrappedBreakdown ? wrappedBreakdown.textContent.replace('↳ ', '') : '';
    const avgText = wrappedAvg ? wrappedAvg.textContent : '$0/hr';

    const shareText = `⚡ ${status.monthName} ${status.year} DEV STACK ROI WRAPPED 🚀
Tracked via DevWrap (Unified Web + Desktop Telemetry)

🎖️ Persona: ${personaText}
🏆 TOP PRODUCER: ${topToolText}
📊 TOTAL SPEND: ${spendText}
⏱️ TOTAL DEV TIME: ${timeText} (${breakdownText})
💡 AVG HOURLY COST: ${avgText}

"Building with an AI dev stack that costs less than 1 cup of coffee per active hour."

#DevStack #BuildingInPublic #DeveloperTools #AI #DevWrap`;

    try {
      await navigator.clipboard.writeText(shareText);
      copyWrappedBtn.innerHTML = '<span>✅</span> Copied to Clipboard!';
      showToast('Copied tweetable card text to clipboard! 🎉');
      setTimeout(() => {
        copyWrappedBtn.innerHTML = '<span>📋</span> Copy Tweetable Card Text';
      }, 2500);
    } catch (e) {
      showToast('Failed to copy to clipboard.');
    }
  });
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

  // Run 5-second health check and ingestion loop while popup is active
  setInterval(checkDesktopCompanionHealth, 5000);
});
