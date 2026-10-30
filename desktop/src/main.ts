interface DevAppHeartbeat {
  app_name: string;
  title: string;
  process_id: number;
  matched_filter: string;
  timestamp: number;
  duration_seconds: number;
}

interface DiscoveredProcess {
  name: string;
  process: string;
  title?: string;
}

const heartbeatCountEl = document.getElementById("heartbeat-count");
const heartbeatRowsEl = document.getElementById("heartbeat-rows");
const testHealthBtn = document.getElementById("test-health-btn");

const filterTagListEl = document.getElementById("filter-tag-list");
const filterCountEl = document.getElementById("filter-count");
const addFilterForm = document.getElementById("add-filter-form") as HTMLFormElement | null;
const addFilterInput = document.getElementById("add-filter-input") as HTMLInputElement | null;
const addFilterBtn = document.getElementById("add-filter-btn") as HTMLButtonElement | null;
const processDropdown = document.getElementById("process-dropdown");
const comboboxWrapper = document.getElementById("combobox-wrapper");

let activeFilters: string[] = [];
let runningProcesses: DiscoveredProcess[] = [];

/**
 * Fetch and render currently monitored process filters from GET /filters
 */
async function fetchFilters() {
  try {
    const res = await fetch("http://127.0.0.1:8080/filters");
    if (res.ok) {
      const filters: string[] = await res.json();
      activeFilters = filters;
      renderFilters(filters);
    }
  } catch (err) {
    // If companion server is booting up
  }
}

/**
 * Fetch running applications on user's system from GET /processes
 */
async function fetchProcesses() {
  try {
    const res = await fetch("http://127.0.0.1:8080/processes");
    if (res.ok) {
      runningProcesses = await res.json();
      // If user has search input active, refresh dropdown suggestions
      if (addFilterInput && addFilterInput.value.trim()) {
        renderProcessDropdown(addFilterInput.value);
      }
    }
  } catch (err) {
    // Companion offline or starting up
  }
}

/**
 * Render dynamic filter tag pills with interactive delete button
 */
function renderFilters(filters: string[]) {
  activeFilters = filters;

  if (filterCountEl) {
    filterCountEl.textContent = `${filters.length} active filter${filters.length === 1 ? "" : "s"}`;
  }

  if (!filterTagListEl) return;

  if (filters.length === 0) {
    filterTagListEl.innerHTML = `<span class="tag-pill" style="color: #64748B;">No active filters</span>`;
    return;
  }

  filterTagListEl.innerHTML = filters
    .map(
      (f) => `
      <span class="tag-pill" title="Monitored tool: ${escapeHtml(f)}">
        <span class="filter-dot">●</span>
        <span class="tag-name">${escapeHtml(f)}</span>
        <button type="button" class="tag-delete-btn" data-filter="${escapeHtml(f)}" title="Remove '${escapeHtml(f)}' from watchlist">✕</button>
      </span>
    `
    )
    .join("");

  // Attach delete handlers to individual pill buttons
  filterTagListEl.querySelectorAll(".tag-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const filter = (btn as HTMLElement).dataset.filter;
      if (filter) {
        await deleteFilter(filter);
      }
    });
  });
}

/**
 * Delete filter from watchlist via DELETE /filters
 */
async function deleteFilter(filterName: string) {
  const clean = filterName.trim().toLowerCase();
  if (!clean) return;

  try {
    let res = await fetch("http://127.0.0.1:8080/filters", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ filter: clean }),
    });

    if (!res.ok) {
      // Fallback for environments with strict DELETE restrictions
      res = await fetch("http://127.0.0.1:8080/filters/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ filter: clean }),
      });
    }

    if (res.ok) {
      const updatedFilters: string[] = await res.json();
      renderFilters(updatedFilters);
    }
  } catch (err) {
    console.error("Failed to delete filter:", err);
  }
}

/**
 * Post custom desktop app filter to POST /filters
 */
async function registerCustomFilter(filterName: string) {
  const clean = filterName.trim().toLowerCase();
  if (!clean) return;

  if (addFilterBtn) addFilterBtn.disabled = true;

  try {
    const res = await fetch("http://127.0.0.1:8080/filters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ filter: clean }),
    });

    if (res.ok) {
      const updatedFilters: string[] = await res.json();
      renderFilters(updatedFilters);
      if (addFilterInput) {
        addFilterInput.value = "";
      }
      hideProcessDropdown();
    }
  } catch (err) {
    console.error("Failed to add filter:", err);
  } finally {
    if (addFilterBtn) addFilterBtn.disabled = false;
  }
}

function normalizeSearchText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Filter running processes and render autocomplete dropdown suggestions
 */
function renderProcessDropdown(query: string) {
  if (!processDropdown) return;

  const rawQ = query.trim();
  const normQ = normalizeSearchText(rawQ);

  if (!normQ) {
    hideProcessDropdown();
    return;
  }

  // Filter running processes matching the user query
  const matches = runningProcesses.filter((proc) => {
    const nName = normalizeSearchText(proc.name);
    const nProc = normalizeSearchText(proc.process);
    const nTitle = normalizeSearchText(proc.title || "");
    return (
      nName.includes(normQ) ||
      nProc.includes(normQ) ||
      nTitle.includes(normQ) ||
      (normQ === "code" && (nName.includes("vscode") || nProc === "code")) ||
      (normQ === "vscode" && (nName.includes("code") || nProc === "code"))
    );
  });

  if (matches.length === 0) {
    processDropdown.innerHTML = `
      <div class="dropdown-header">RUNNING APPLICATIONS</div>
      <div class="process-empty">No running apps match "${escapeHtml(rawQ)}". Press Enter to add custom filter.</div>
    `;
    processDropdown.classList.remove("hidden");
    return;
  }

  processDropdown.innerHTML = `
    <div class="dropdown-header">RUNNING APPLICATIONS (${matches.length})</div>
    ${matches
      .slice(0, 10)
      .map((proc) => {
        const isMonitored = activeFilters.some((f) => f.toLowerCase() === proc.process.toLowerCase());
        return `
          <div class="process-item" data-process="${escapeHtml(proc.process)}" role="button">
            <div class="process-left">
              <span class="process-name">${escapeHtml(proc.name)}</span>
              <span class="process-badge">${escapeHtml(proc.process)}</span>
              ${proc.title ? `<span class="process-title" title="${escapeHtml(proc.title)}">"${escapeHtml(proc.title)}"</span>` : ""}
            </div>
            <span class="process-action" style="${isMonitored ? "color: #94A3B8; background: rgba(255,255,255,0.05);" : ""}">
              ${isMonitored ? "● Monitored" : "+ Add"}
            </span>
          </div>
        `;
      })
      .join("")}
  `;

  // Attach click events on suggested items
  processDropdown.querySelectorAll(".process-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const processName = (item as HTMLElement).dataset.process;
      if (processName) {
        await registerCustomFilter(processName);
      }
    });
  });

  processDropdown.classList.remove("hidden");
}

function hideProcessDropdown() {
  if (processDropdown) {
    processDropdown.classList.add("hidden");
  }
}

async function fetchStats() {
  try {
    const res = await fetch("http://127.0.0.1:8080/stats");
    if (res.ok) {
      const data: DevAppHeartbeat[] = await res.json();
      renderHeartbeats(data);
    }
  } catch (err) {
    // If daemon is booting up
  }
}

function renderHeartbeats(items: DevAppHeartbeat[]) {
  if (heartbeatCountEl) {
    heartbeatCountEl.textContent = String(items.length);
  }

  if (!heartbeatRowsEl) return;

  if (items.length === 0) {
    heartbeatRowsEl.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">Waiting for active developer window detection...</td>
      </tr>
    `;
    return;
  }

  // Show newest first
  const reversed = [...items].reverse();

  heartbeatRowsEl.innerHTML = reversed
    .slice(0, 20)
    .map((hb) => {
      const timeStr = new Date(hb.timestamp * 1000).toLocaleTimeString();
      return `
        <tr>
          <td style="font-weight: 600; color: #FFFFFF;">${escapeHtml(hb.app_name)}</td>
          <td><span class="tag">${escapeHtml(hb.matched_filter)}</span></td>
          <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(hb.title)}">${escapeHtml(hb.title)}</td>
          <td style="font-family: ui-monospace, monospace; color: #94A3B8;">${hb.process_id}</td>
          <td style="color: #64748B;">${timeStr}</td>
        </tr>
      `;
    })
    .join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

if (testHealthBtn) {
  testHealthBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("http://127.0.0.1:8080/health");
      const json = await res.json();
      alert(`GET /health: ${JSON.stringify(json)}`);
    } catch (err) {
      alert(`GET /health failed: ${err}`);
    }
  });
}

// Combobox Input and Form Handlers
if (addFilterInput) {
  addFilterInput.addEventListener("input", () => {
    renderProcessDropdown(addFilterInput.value);
  });

  addFilterInput.addEventListener("focus", async () => {
    if (runningProcesses.length === 0) {
      await fetchProcesses();
    }
    if (addFilterInput.value.trim()) {
      renderProcessDropdown(addFilterInput.value);
    }
  });

  addFilterInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideProcessDropdown();
    }
  });
}

if (addFilterForm && addFilterInput) {
  addFilterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = addFilterInput.value;
    if (val) {
      await registerCustomFilter(val);
    }
  });
}

// Close dropdown on outside click
document.addEventListener("click", (e) => {
  if (comboboxWrapper && !comboboxWrapper.contains(e.target as Node)) {
    hideProcessDropdown();
  }
});

// Poll stats, filters, and running processes
window.addEventListener("DOMContentLoaded", () => {
  fetchFilters();
  fetchProcesses();
  fetchStats();
  setInterval(fetchStats, 3000);
  setInterval(fetchFilters, 5000);
  setInterval(fetchProcesses, 10000);
});
