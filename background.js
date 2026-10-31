/**
 * DevWrap - Background Service Worker (Hybrid Telemetry Engine)
 * Manifest V3 compliant time tracking for Web Browser tabs and Desktop IDEs.
 * 
 * Features:
 * - 100% local privacy: All metrics saved in chrome.storage.local
 * - Active tab detection across window focus & tab switches (Web Tab Hours)
 * - chrome.idle integration (120s threshold) pausing inactive web time accumulation
 * - Live Health Check Connection: Pings http://127.0.0.1:8080/health every 5 seconds
 * - Desktop Stats Ingestion: Fetches http://127.0.0.1:8080/stats and aggregates active seconds
 *   for Cursor, VS Code, Terminal, Postman, etc. into respective tool cards
 * - Monthly background check (every 30 days) via chrome.alarms firing notifications & badge
 */

// Idle threshold in seconds (2 minutes)
const IDLE_DETECTION_INTERVAL_SECONDS = 120;

// Alarm identifiers
const SYNC_ALARM_NAME = 'devwrap_heartbeat_sync';
const MONTHLY_REPORT_ALARM_NAME = 'devwrap_monthly_report';
const THIRTY_DAYS_IN_MINUTES = 30 * 24 * 60; // 43,200 minutes

// Desktop Companion Endpoints
const COMPANION_HEALTH_URL = 'http://127.0.0.1:8080/health';
const COMPANION_STATS_URL = 'http://127.0.0.1:8080/stats';
const COMPANION_FILTERS_URL = 'http://127.0.0.1:8080/filters';
const COMPANION_POLL_INTERVAL_MS = 5000; // 5 seconds
let isPollingCompanion = false;

// Helper to get formatted date keys in local calendar time
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
  return `${year}-${month}`; // "YYYY-MM"
}

// Older quick-add builds created fabricated demo minutes. Remove only those
// known records once; deleting a subscription never deletes real usage data.
async function removeLegacyPresetDemoUsage() {
  // V2 also handles records from the original popup, which stored its seeded
  // value in webSeconds/desktopSeconds rather than just totalSeconds.
  const migrationKey = 'removedLegacyPresetDemoUsageV2';
  const stored = await chrome.storage.local.get([migrationKey, 'usageData']);
  if (stored[migrationKey]) return;

  const usageData = stored.usageData || {};
  const demoTotalsByDomain = {
    'cursor.com': 102600,
    'claude.ai': 65520,
    'chatgpt.com': 54000,
    'github.com': 14400,
    'vercel.com': 21600,
    'figma.com': 18000,
    'postman.com': 1800
  };
  let changed = false;

  Object.entries(demoTotalsByDomain).forEach(([domain, total]) => {
    const usage = usageData[domain];
    const hasLegacyDemoTotal = usage && [
      usage.totalSeconds,
      usage.webSeconds,
      usage.desktopSeconds
    ].some(value => Number(value) === total);

    if (hasLegacyDemoTotal) {
      delete usageData[domain];
      changed = true;
    }
  });

  await chrome.storage.local.set({
    [migrationKey]: true,
    ...(changed ? { usageData } : {})
  });
}

/**
 * Normalizes user-entered domain or tab hostname for consistent matching.
 */
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

/**
 * Checks whether a given URL belongs to a target subscription domain.
 */
function isUrlMatchingDomain(url, targetDomain) {
  if (!url || !targetDomain) return false;
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
    
    let hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    let target = normalizeDomain(targetDomain);
    
    return hostname === target || hostname.endsWith('.' + target);
  } catch (e) {
    return false;
  }
}

// In-memory active tracking state for Web Browser Tabs
let currentSession = null; // { domain: string, subName: string, startTime: number, tabId: number }
let isUserIdle = false;
let isWindowFocused = true;

/**
 * Commits currently elapsed seconds from active web session to chrome.storage.local
 */
async function commitCurrentSession() {
  if (!currentSession || !currentSession.startTime || !currentSession.domain) {
    return;
  }

  const now = Date.now();
  const elapsedMs = now - currentSession.startTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  if (elapsedSeconds <= 0) {
    return;
  }

  // Only advance start time by the whole seconds committed so partial ms are preserved
  currentSession.startTime += elapsedSeconds * 1000;

  const domain = currentSession.domain;
  const today = getTodayKey();
  const month = getCurrentMonthKey();

  try {
    const result = await chrome.storage.local.get(['usageData']);
    const usageData = result.usageData || {};

    if (!usageData[domain]) {
      usageData[domain] = {
        webSeconds: 0,
        desktopSeconds: 0,
        baselineDesktopSeconds: 0,
        totalSeconds: 0,
        dailySeconds: {},
        monthlySeconds: {},
        dailyWebSeconds: {},
        dailyDesktopSeconds: {},
        lastActive: now
      };
    }

    if (!usageData[domain].dailySeconds) usageData[domain].dailySeconds = {};
    if (!usageData[domain].dailyWebSeconds) usageData[domain].dailyWebSeconds = {};
    if (!usageData[domain].dailyDesktopSeconds) usageData[domain].dailyDesktopSeconds = {};
    if (!usageData[domain].monthlySeconds) usageData[domain].monthlySeconds = {};

    usageData[domain].webSeconds = (usageData[domain].webSeconds || 0) + elapsedSeconds;
    usageData[domain].totalSeconds = (usageData[domain].totalSeconds || 0) + elapsedSeconds;
    usageData[domain].dailyWebSeconds[today] = (usageData[domain].dailyWebSeconds[today] || 0) + elapsedSeconds;

    const desktopToday = usageData[domain].dailyDesktopSeconds[today] || 0;
    usageData[domain].dailySeconds[today] = (usageData[domain].dailyWebSeconds[today] || 0) + desktopToday;

    usageData[domain].monthlySeconds[month] = (usageData[domain].monthlySeconds[month] || 0) + elapsedSeconds;
    usageData[domain].lastActive = now;

    await chrome.storage.local.set({ usageData });
  } catch (error) {
    console.error('[DevWrap] Error committing session time:', error);
  }
}

/**
 * Re-evaluates active browser state and starts or stops tracking.
 */
async function evaluateActiveTracking() {
  if (isUserIdle || !isWindowFocused) {
    if (currentSession) {
      await commitCurrentSession();
      currentSession = null;
    }
    return;
  }

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    
    if (!activeTab || !activeTab.url) {
      if (currentSession) {
        await commitCurrentSession();
        currentSession = null;
      }
      return;
    }

    const { subscriptions = [] } = await chrome.storage.local.get(['subscriptions']);
    const matchedSub = subscriptions.find(sub => isUrlMatchingDomain(activeTab.url, sub.domain));

    if (matchedSub) {
      const normalizedSubDomain = normalizeDomain(matchedSub.domain);

      if (currentSession && currentSession.domain === normalizedSubDomain) {
        currentSession.tabId = activeTab.id;
        return;
      }

      if (currentSession) {
        await commitCurrentSession();
      }

      currentSession = {
        domain: normalizedSubDomain,
        subName: matchedSub.name,
        startTime: Date.now(),
        tabId: activeTab.id
      };
    } else {
      if (currentSession) {
        await commitCurrentSession();
        currentSession = null;
      }
    }
  } catch (error) {
    console.error('[DevWrap] Error evaluating active tab:', error);
  }
}

// Continuous 1-second active tracking interval for web tabs
let activeWebTrackingTimer = null;
function startActiveWebTrackingLoop() {
  if (activeWebTrackingTimer) clearInterval(activeWebTrackingTimer);
  activeWebTrackingTimer = setInterval(async () => {
    if (currentSession && !isUserIdle && isWindowFocused) {
      await commitCurrentSession();
    }
  }, 1000);
}
startActiveWebTrackingLoop();

// -------------------------------------------------------------
// Live Health Check & Desktop Stats Ingestion Loop
// -------------------------------------------------------------

/**
 * Pings http://127.0.0.1:8080/health and ingests stats from http://127.0.0.1:8080/stats.
 * Aggregates active seconds for Cursor, VS Code, Terminal, Postman, Antigravity, etc.,
 * and updates chrome.storage.local.
 */
async function pollDesktopCompanion() {
  if (isPollingCompanion) return;
  isPollingCompanion = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // 1. Health check
    const healthRes = await fetch(COMPANION_HEALTH_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (healthRes.ok) {
      const healthData = await healthRes.json();
      if (healthData && (healthData.status === 'ok' || healthData.status === 'OK')) {
        await chrome.storage.local.set({ desktopConnected: true });

        // 2. Sync filters list
        try {
          const filtersRes = await fetch(COMPANION_FILTERS_URL, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          if (filtersRes.ok) {
            const filters = await filtersRes.json();
            if (Array.isArray(filters)) {
              await chrome.storage.local.set({ desktopFilters: filters });
            }
          }
        } catch (e) {
          // Ignore
        }

        // 3. Ingest desktop stats
        await ingestDesktopStats();
        return;
      }
    }

    await chrome.storage.local.set({ desktopConnected: false });
  } catch (err) {
    await chrome.storage.local.set({ desktopConnected: false });
  } finally {
    isPollingCompanion = false;
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
 * Ingests recorded heartbeats from http://127.0.0.1:8080/stats,
 * dynamically aggregates active seconds matching custom process filters
 * (case-insensitive substring match on process name and window title),
 * and persists them into usageData and chrome.storage.local.
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

    // Dynamically aggregate duration seconds per tool filter
    const statsByFilter = {};

    heartbeats.forEach(hb => {
      const filterKey = (hb.matched_filter || hb.app_name || '').toLowerCase().trim();
      const dur = Number(hb.duration_seconds) || 15;
      if (filterKey) {
        statsByFilter[filterKey] = (statsByFilter[filterKey] || 0) + dur;
      }
    });

    // Update usageData for monitored subscriptions
    const stored = await chrome.storage.local.get(['subscriptions', 'usageData']);
    const subscriptions = stored.subscriptions || [];
    const usageData = stored.usageData || {};
    const today = getTodayKey();
    const month = getCurrentMonthKey();
    let hasChanges = false;

    subscriptions.forEach(sub => {
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

      if (!usageData[dom]) {
        usageData[dom] = {
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

      if (!usageData[dom].dailySeconds) usageData[dom].dailySeconds = {};
      if (!usageData[dom].dailyWebSeconds) usageData[dom].dailyWebSeconds = {};
      if (!usageData[dom].dailyDesktopSeconds) usageData[dom].dailyDesktopSeconds = {};
      if (!usageData[dom].monthlySeconds) usageData[dom].monthlySeconds = {};

      // Record daily desktop tracking and update combined daily totals
      Object.entries(dailyDesktop).forEach(([dayKey, sec]) => {
        usageData[dom].dailyDesktopSeconds[dayKey] = sec;
        const webSec = usageData[dom].dailyWebSeconds[dayKey] || 0;
        usageData[dom].dailySeconds[dayKey] = webSec + sec;
      });

      const baseline = usageData[dom].baselineDesktopSeconds || 0;
      const newDesktopSeconds = baseline + matchingSeconds;

      if (usageData[dom].desktopSeconds !== newDesktopSeconds) {
        usageData[dom].desktopSeconds = newDesktopSeconds;
        usageData[dom].totalSeconds = (usageData[dom].webSeconds || 0) + newDesktopSeconds;
        usageData[dom].monthlySeconds[month] = usageData[dom].totalSeconds;
        hasChanges = true;
      }
    });

    // Save raw heartbeats, aggregated stats, and usageData
    await chrome.storage.local.set({
      desktopHeartbeats: heartbeats,
      desktopStats: statsByFilter,
      lastDesktopSync: Date.now(),
      usageData
    });
  } catch (err) {
    console.warn('[DevWrap] Failed to ingest desktop stats:', err);
  }
}

// Start 5-second interval health check and stats ingestion loop
let companionPollTimer = null;
function startCompanionPollingLoop() {
  pollDesktopCompanion();
  if (companionPollTimer) clearInterval(companionPollTimer);
  companionPollTimer = setInterval(pollDesktopCompanion, COMPANION_POLL_INTERVAL_MS);
}

startCompanionPollingLoop();

/**
 * Triggers monthly report notification and badge alert
 */
function triggerMonthlyReportNotification() {
  try {
    if (chrome.notifications) {
      chrome.notifications.create('devwrap_monthly_report_notif', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'DevWrap - Dev Stack Value Tracker',
        message: 'Your Monthly Dev Stack ROI Report is Ready!',
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.warn('[DevWrap] Notification creation error:', chrome.runtime.lastError);
        } else {
          console.log('[DevWrap] Monthly notification fired:', notificationId);
        }
      });
    }

    if (chrome.action && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#6366F1' });
    }
  } catch (e) {
    console.error('[DevWrap] Error triggering monthly notification:', e);
  }
}

/**
 * Global Monthly Drop & Lock System - Background Notification Engine
 * On the 1st of every month at 00:00 UTC (or when simulating drop):
 * 1. Triggers native OS desktop alert: "🔒 Your Monthly Dev Stack Wrapped is UNLOCKED!"
 * 2. Sets extension icon badge text to "DROP" (emerald)
 */
async function checkMonthlyDropStatus() {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const isLastDay = tomorrow.getDate() === 1;
    const isFirstDay = now.getDate() === 1;
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const stored = await chrome.storage.local.get(['simulateDropDay', 'lastDropNotifiedMonth']);
    const isDropDay = !!stored.simulateDropDay || isLastDay || isFirstDay;

    if (isDropDay) {
      if (chrome.action && chrome.action.setBadgeText) {
        chrome.action.setBadgeText({ text: 'DROP' });
        chrome.action.setBadgeBackgroundColor({ color: '#10B981' }); // Emerald green
      }

      // Fire notification once per monthly drop cycle
      if (stored.lastDropNotifiedMonth !== currentMonthKey) {
        triggerDropUnlockedNotification();
        await chrome.storage.local.set({ lastDropNotifiedMonth: currentMonthKey });
      }
    } else {
      // Clear DROP badge if no longer drop day
      if (chrome.action && chrome.action.getBadgeText) {
        chrome.action.getBadgeText({}, (text) => {
          if (text === 'DROP') {
            chrome.action.setBadgeText({ text: '' });
          }
        });
      }
    }
  } catch (err) {
    console.error('[DevWrap] Error checking monthly drop status:', err);
  }
}

/**
 * Triggers native OS alert on global drop release
 */
function triggerDropUnlockedNotification() {
  try {
    if (chrome.notifications) {
      chrome.notifications.create('devwrap_monthly_drop_notif', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🔒 Your Monthly Dev Stack Wrapped is UNLOCKED!',
        message: 'Your Web + Desktop telemetry drop is ready. Click to generate and flex your monthly stack ROI.',
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.warn('[DevWrap] Drop notification error:', chrome.runtime.lastError);
        } else {
          console.log('[DevWrap] Drop unlocked notification fired:', notificationId);
        }
      });
    }

    if (chrome.action && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({ text: 'DROP' });
      chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
    }
  } catch (e) {
    console.error('[DevWrap] Error triggering drop notification:', e);
  }
}

// -------------------------------------------------------------
// Lifecycle & Installation Setup
// -------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[DevWrap] Installed with reason:', details.reason);

  try {
    chrome.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL_SECONDS);
  } catch (e) {
    console.warn('[DevWrap] Idle interval set error:', e);
  }

  chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: 1 });
  chrome.alarms.create(MONTHLY_REPORT_ALARM_NAME, {
    periodInMinutes: THIRTY_DAYS_IN_MINUTES,
    delayInMinutes: THIRTY_DAYS_IN_MINUTES
  });

  const stored = await chrome.storage.local.get(['subscriptions', 'usageData', 'desktopConnected']);
  if (!stored.subscriptions) {
    console.log('[DevWrap] Initializing empty subscription storage');
    await chrome.storage.local.set({
      subscriptions: [],
      usageData: stored.usageData || {},
      desktopConnected: false
    });
  }

  await removeLegacyPresetDemoUsage();

  startCompanionPollingLoop();
  evaluateActiveTracking();
  checkMonthlyDropStatus();
});

try {
  chrome.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL_SECONDS);
} catch (e) {
  // Ignore
}

chrome.alarms.get(SYNC_ALARM_NAME, (alarm) => {
  if (!alarm) {
    chrome.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: 1 });
  }
});

chrome.alarms.get(MONTHLY_REPORT_ALARM_NAME, (alarm) => {
  if (!alarm) {
    chrome.alarms.create(MONTHLY_REPORT_ALARM_NAME, {
      periodInMinutes: THIRTY_DAYS_IN_MINUTES,
      delayInMinutes: THIRTY_DAYS_IN_MINUTES
    });
  }
});

// -------------------------------------------------------------
// Event Listeners for State & Activity Detection
// -------------------------------------------------------------

chrome.tabs.onActivated.addListener(async () => {
  await evaluateActiveTracking();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    if (tab.active) {
      await evaluateActiveTracking();
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (currentSession && currentSession.tabId === tabId) {
    await commitCurrentSession();
    currentSession = null;
    await evaluateActiveTracking();
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (currentSession) {
      await commitCurrentSession();
    }
  } else {
    isWindowFocused = true;
    await evaluateActiveTracking();
  }
});

chrome.idle.onStateChanged.addListener(async (newState) => {
  if (newState === 'idle' || newState === 'locked') {
    isUserIdle = true;
    if (currentSession) {
      await commitCurrentSession();
      currentSession = null;
    }
  } else if (newState === 'active') {
    isUserIdle = false;
    await evaluateActiveTracking();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM_NAME) {
    if (currentSession && !isUserIdle && isWindowFocused) {
      await commitCurrentSession();
    }
    await checkMonthlyDropStatus();
  } else if (alarm.name === MONTHLY_REPORT_ALARM_NAME) {
    console.log('[DevWrap] 30-day monthly background check alarm fired');
    triggerMonthlyReportNotification();
  }
});

if (chrome.notifications && chrome.notifications.onClicked) {
  chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === 'devwrap_monthly_report_notif') {
      if (chrome.action && chrome.action.setBadgeText) {
        chrome.action.setBadgeText({ text: '' });
      }
    } else if (notificationId === 'devwrap_monthly_drop_notif') {
      console.log('[DevWrap] User clicked drop unlocked notification');
    }
  });
}

// Storage change listener to react instantly to simulateDropDay toggles
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.simulateDropDay !== undefined) {
      checkMonthlyDropStatus();
    }
  }
});

// -------------------------------------------------------------
// Message API for Popup UI
// -------------------------------------------------------------

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    switch (request.action) {
      case 'FLUSH_AND_GET_DATA': {
        await removeLegacyPresetDemoUsage();
        await commitCurrentSession();
        // Immediately fetch and aggregate latest desktop stats on popup open
        await ingestDesktopStats();
        
        const data = await chrome.storage.local.get([
          'subscriptions',
          'usageData',
          'desktopConnected',
          'desktopStats',
          'desktopHeartbeats',
          'simulateDropDay',
          'forceLocked',
          'onboardingCompleted'
        ]);
        
        try {
          chrome.action.getBadgeText({}, (currentBadge) => {
            if (currentBadge !== 'DROP') {
              chrome.action.setBadgeText({ text: '' });
            }
          });
        } catch (e) {
          // Ignore
        }

        await evaluateActiveTracking();

        sendResponse({
          success: true,
          subscriptions: data.subscriptions || [],
          usageData: data.usageData || {},
          desktopConnected: !!data.desktopConnected,
          desktopStats: data.desktopStats || {},
          desktopHeartbeats: data.desktopHeartbeats || [],
          simulateDropDay: !!data.simulateDropDay,
          forceLocked: !!data.forceLocked,
          onboardingCompleted: !!data.onboardingCompleted,
          activeSession: currentSession ? {
            domain: currentSession.domain,
            subName: currentSession.subName,
            startTime: currentSession.startTime,
            isTracking: true
          } : null
        });
        break;
      }

      case 'TRIGGER_COMPANION_SYNC': {
        await pollDesktopCompanion();
        const data = await chrome.storage.local.get(['desktopConnected', 'usageData', 'desktopStats']);
        sendResponse({
          success: true,
          desktopConnected: !!data.desktopConnected,
          usageData: data.usageData || {},
          desktopStats: data.desktopStats || {}
        });
        break;
      }

      case 'GET_CURRENT_TAB_INFO': {
        try {
          const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (tab && tab.url && ['http:', 'https:'].includes(new URL(tab.url).protocol)) {
            const urlObj = new URL(tab.url);
            const domain = normalizeDomain(urlObj.hostname);
            let cleanTitle = tab.title || domain;
            cleanTitle = cleanTitle.split(' - ')[0].split(' | ')[0].trim();

            sendResponse({
              success: true,
              domain: domain,
              title: cleanTitle
            });
          } else {
            sendResponse({ success: false, error: 'Not a standard web page' });
          }
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'ADD_SUBSCRIPTION': {
        try {
          const { domain, name, monthlyCost, type, planTier } = request.payload;
          const cleanDom = normalizeDomain(domain);
          const parsedCost = parseFloat(monthlyCost);
          const toolType = type === 'desktop' ? 'desktop' : 'web';

          if (!cleanDom || isNaN(parsedCost) || parsedCost < 0) {
            sendResponse({ success: false, error: 'Invalid domain or cost.' });
            return;
          }

          const { subscriptions = [], usageData = {} } = await chrome.storage.local.get(['subscriptions', 'usageData']);
          
          const existing = subscriptions.find(s => normalizeDomain(s.domain) === cleanDom);
          if (existing) {
            sendResponse({ success: false, error: 'A tool with this domain/identifier is already being tracked.' });
            return;
          }

          const newSub = {
            id: 'sub_' + Date.now(),
            name: (name && name.trim()) || cleanDom,
            domain: cleanDom,
            monthlyCost: parsedCost,
            planTier: ['free', 'paid', 'custom'].includes(planTier) ? planTier : 'custom',
            type: toolType,
            createdAt: new Date().toISOString()
          };

          subscriptions.push(newSub);

          if (!usageData[cleanDom]) {
            usageData[cleanDom] = {
              webSeconds: 0,
              desktopSeconds: 0,
              baselineDesktopSeconds: 0,
              totalSeconds: 0,
              dailySeconds: {},
              monthlySeconds: {},
              lastActive: null
            };
          }

          if (toolType === 'desktop') {
            const filterId = (cleanDom.includes('.') ? cleanDom.split('.')[0] : cleanDom) || (name || '').toLowerCase().trim();
            if (filterId) {
              fetch(COMPANION_FILTERS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filter: filterId })
              }).catch(() => {});
            }
          }

          await chrome.storage.local.set({ subscriptions, usageData });
          await evaluateActiveTracking();

          // Immediately trigger a fetch to http://127.0.0.1:8080/stats on new subscription
          await ingestDesktopStats();

          sendResponse({ success: true, subscription: newSub });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'SYNC_DESKTOP_STATS': {
        await ingestDesktopStats();
        const data = await chrome.storage.local.get([
          'subscriptions',
          'usageData',
          'desktopConnected',
          'desktopStats',
          'desktopHeartbeats'
        ]);
        sendResponse({ success: true, ...data });
        break;
      }

      case 'DELETE_SUBSCRIPTION': {
        try {
          const { id } = request.payload;
          const { subscriptions = [] } = await chrome.storage.local.get(['subscriptions']);
          
          const subToDelete = subscriptions.find(s => s.id === id);
          const updatedSubs = subscriptions.filter(s => s.id !== id);

          if (subToDelete && currentSession && currentSession.domain === normalizeDomain(subToDelete.domain)) {
            currentSession = null;
          }

          if (subToDelete && subToDelete.type === 'desktop') {
            const cleanDom = normalizeDomain(subToDelete.domain);
            const filterId = (cleanDom.includes('.') ? cleanDom.split('.')[0] : cleanDom) || (subToDelete.name || '').toLowerCase().trim();
            if (filterId) {
              fetch(COMPANION_FILTERS_URL, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filter: filterId })
              }).catch(() => {
                fetch('http://127.0.0.1:8080/filters/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ filter: filterId })
                }).catch(() => {});
              });
            }
          }

          await chrome.storage.local.set({ subscriptions: updatedSubs });
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'TRIGGER_MONTHLY_CHECK': {
        triggerMonthlyReportNotification();
        sendResponse({ success: true });
        break;
      }

      case 'CHECK_DROP_STATUS': {
        await checkMonthlyDropStatus();
        sendResponse({ success: true });
        break;
      }

      case 'TRIGGER_TEST_DROP': {
        triggerDropUnlockedNotification();
        sendResponse({ success: true });
        break;
      }

      case 'CLEAR_REPORT_BADGE': {
        try {
          chrome.action.setBadgeText({ text: '' });
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  })();

  return true;
});
