/**
 * CopyPaste Freedom — Settings Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation tabs
  const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const toast = document.getElementById('toast');

  // Defaults inputs
  const defaultFreedomMode = document.getElementById('defaultFreedomMode');
  const defaultTextSelection = document.getElementById('defaultTextSelection');
  const defaultCopy = document.getElementById('defaultCopy');
  const defaultPaste = document.getElementById('defaultPaste');
  const defaultCut = document.getElementById('defaultCut');
  const defaultRightClick = document.getElementById('defaultRightClick');
  const btnSaveDefaults = document.getElementById('btnSaveDefaults');

  // Website rules inputs
  const newSiteHost = document.getElementById('newSiteHost');
  const newSiteStatus = document.getElementById('newSiteStatus');
  const btnAddSite = document.getElementById('btnAddSite');
  const siteRulesList = document.getElementById('siteRulesList');
  const siteRulesCount = document.getElementById('siteRulesCount');
  const btnClearAllRules = document.getElementById('btnClearAllRules');

  // Scan History inputs (v1.1)
  const searchHistory = document.getElementById('searchHistory');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const btnClearHistory = document.getElementById('btnClearHistory');
  const scanHistoryContainer = document.getElementById('scanHistoryContainer');
  let cachedScanHistory = [];

  // Factory reset
  const btnFactoryReset = document.getElementById('btnFactoryReset');

  const INITIAL_DEFAULTS = {
    freedomMode: true,
    textSelection: true,
    copy: true,
    paste: true,
    cut: true,
    rightClick: true
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // Tab switching
  function switchTab(targetId) {
    navBtns.forEach(b => {
      if (b.getAttribute('data-tab') === targetId) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    tabPanes.forEach(p => {
      if (p.id === targetId) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    if (targetId === 'tab-history') {
      loadScanHistory();
    }
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Load defaults
  function loadGlobalDefaults() {
    chrome.storage.local.get(['defaults'], (res) => {
      const d = res.defaults || INITIAL_DEFAULTS;
      defaultFreedomMode.checked = d.freedomMode !== false;
      defaultTextSelection.checked = d.textSelection !== false;
      defaultCopy.checked = d.copy !== false;
      defaultPaste.checked = d.paste !== false;
      defaultCut.checked = d.cut !== false;
      defaultRightClick.checked = d.rightClick !== false;
    });
  }

  // Save defaults
  btnSaveDefaults.addEventListener('click', () => {
    const updatedDefaults = {
      freedomMode: defaultFreedomMode.checked,
      textSelection: defaultTextSelection.checked,
      copy: defaultCopy.checked,
      paste: defaultPaste.checked,
      cut: defaultCut.checked,
      rightClick: defaultRightClick.checked
    };

    chrome.storage.local.set({ defaults: updatedDefaults }, () => {
      showToast('Global defaults saved successfully');
    });
  });

  // Load and render site rules
  function loadSiteRules() {
    chrome.storage.local.get(['siteSettings', 'excludedSites'], (res) => {
      const siteSettings = res.siteSettings || {};
      const excludedSites = res.excludedSites || [];

      // Combine keys
      const allHosts = new Set([...Object.keys(siteSettings), ...excludedSites]);
      siteRulesCount.textContent = `${allHosts.size} rule${allHosts.size === 1 ? '' : 's'} configured`;

      if (allHosts.size === 0) {
        siteRulesList.innerHTML = `
          <div class="empty-state">
            <p>No site-specific rules yet.</p>
            <p class="sub">Websites you customize via the extension popup will appear here.</p>
          </div>
        `;
        return;
      }

      siteRulesList.innerHTML = '';
      allHosts.forEach(host => {
        const isExcluded = excludedSites.includes(host);
        const config = siteSettings[host];

        let statusClass = 'enabled';
        let statusLabel = 'ENABLED';

        if (isExcluded) {
          statusClass = 'excluded';
          statusLabel = 'EXCLUDED';
        } else if (config && !config.freedomMode) {
          statusClass = 'disabled';
          statusLabel = 'DISABLED';
        }

        const row = document.createElement('div');
        row.className = 'site-rule-row';
        row.innerHTML = `
          <span class="site-rule-host">${escapeHtml(host)}</span>
          <div class="site-rule-actions">
            <span class="rule-status-badge ${statusClass}">${statusLabel}</span>
            <button class="btn-remove-rule" title="Remove rule for ${escapeHtml(host)}" data-host="${escapeHtml(host)}">✕</button>
          </div>
        `;
        siteRulesList.appendChild(row);
      });

      // Bind delete buttons
      document.querySelectorAll('.btn-remove-rule').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const hostToRemove = btn.getAttribute('data-host');
          removeSiteRule(hostToRemove);
        });
      });
    });
  }

  function cleanHostname(val) {
    let clean = (val || '').trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, '');
    clean = clean.replace(/\/.*$/, '');
    return clean;
  }

  function removeSiteRule(host) {
    chrome.storage.local.get(['siteSettings', 'excludedSites'], (res) => {
      const siteSettings = res.siteSettings || {};
      let excludedSites = res.excludedSites || [];

      delete siteSettings[host];
      excludedSites = excludedSites.filter(h => h !== host);

      chrome.storage.local.set({ siteSettings, excludedSites }, () => {
        loadSiteRules();
        showToast(`Rule removed for ${host}`);
      });
    });
  }

  // Add site rule
  btnAddSite.addEventListener('click', () => {
    const raw = newSiteHost.value;
    const host = cleanHostname(raw);
    const status = newSiteStatus.value;

    if (!host) {
      alert('Please enter a valid website hostname (e.g. example.com)');
      return;
    }

    chrome.storage.local.get(['defaults', 'siteSettings', 'excludedSites'], (res) => {
      const defaults = res.defaults || INITIAL_DEFAULTS;
      const siteSettings = res.siteSettings || {};
      let excludedSites = res.excludedSites || [];

      excludedSites = excludedSites.filter(h => h !== host);

      if (status === 'excluded') {
        excludedSites.push(host);
        delete siteSettings[host];
      } else if (status === 'disabled') {
        siteSettings[host] = { ...defaults, freedomMode: false };
      } else {
        siteSettings[host] = {
          freedomMode: true,
          textSelection: true,
          copy: true,
          paste: true,
          cut: true,
          rightClick: true
        };
      }

      chrome.storage.local.set({ siteSettings, excludedSites }, () => {
        newSiteHost.value = '';
        loadSiteRules();
        showToast(`Rule added for ${host}`);
      });
    });
  });

  // Clear all rules
  btnClearAllRules.addEventListener('click', () => {
    if (!confirm('Are you sure you want to remove all custom website rules?')) return;
    chrome.storage.local.set({ siteSettings: {}, excludedSites: [] }, () => {
      loadSiteRules();
      showToast('All custom website rules cleared');
    });
  });

  // Website Scan History (v1.1)
  function loadScanHistory() {
    chrome.storage.local.get(['scanHistory'], (res) => {
      cachedScanHistory = res.scanHistory || [];
      renderScanHistory(searchHistory ? searchHistory.value : '');
    });
  }

  function renderScanHistory(filterQuery = '') {
    if (!scanHistoryContainer) return;
    const q = (filterQuery || '').trim().toLowerCase();

    let list = cachedScanHistory;
    if (q) {
      list = list.filter(item => {
        const hMatch = item.hostname && item.hostname.toLowerCase().includes(q);
        const rMatch = item.restrictions && item.restrictions.some(r => r.toLowerCase().includes(q));
        const sMatch = item.status && item.status.toLowerCase().includes(q);
        return hMatch || rMatch || sMatch;
      });
    }

    if (historyCountBadge) {
      historyCountBadge.textContent = `${cachedScanHistory.length} site${cachedScanHistory.length === 1 ? '' : 's'} scanned`;
    }

    if (list.length === 0) {
      if (cachedScanHistory.length === 0) {
        scanHistoryContainer.innerHTML = `
          <div class="empty-state">
            <p>No website scan history recorded yet.</p>
            <p class="sub">As you browse and scan pages with CopyPaste Freedom, hostnames and restriction results will appear here.</p>
          </div>
        `;
      } else {
        scanHistoryContainer.innerHTML = `
          <div class="empty-state">
            <p>No matching websites found.</p>
            <p class="sub">Try searching with a different hostname or restriction keyword.</p>
          </div>
        `;
      }
      return;
    }

    scanHistoryContainer.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-row';

      const restrictions = item.restrictions || [];
      let tagsHtml = '';
      if (restrictions.length > 0) {
        tagsHtml = restrictions.map(r => `<span class="history-tag">${escapeHtml(r)}</span>`).join('');
      } else {
        tagsHtml = '<span class="history-tag tag-clear">NO RESTRICTIONS</span>';
      }

      // Determine status badge class
      const st = (item.status || 'Clear').toLowerCase();
      let statusClass = 'status-clear';
      let statusLabel = item.status || 'CLEAR';

      if (st.includes('neutralized') || st.includes('fixed')) {
        statusClass = 'status-neutralized';
        statusLabel = 'ALL NEUTRALIZED';
      } else if (st.includes('unsupported')) {
        statusClass = 'status-unsupported';
        statusLabel = 'UNSUPPORTED';
      } else if (st.includes('active') || st.includes('detected') || st.includes('restricted')) {
        statusClass = 'status-warning';
        statusLabel = `${restrictions.length} RESTRICTED`;
      }

      row.innerHTML = `
        <div class="history-main">
          <div class="history-host-line">
            <span class="history-host">${escapeHtml(item.hostname)}</span>
          </div>
          <div class="history-tags">
            ${tagsHtml}
          </div>
          <div class="history-meta">
            <span>Scanned: ${escapeHtml(item.dateStr || 'Recently')}</span>
          </div>
        </div>
        <div class="history-status-actions">
          <span class="history-status-badge ${statusClass}">${statusLabel}</span>
          <button class="btn-remove-history" title="Remove from scan history" data-host="${escapeHtml(item.hostname)}">✕</button>
        </div>
      `;

      scanHistoryContainer.appendChild(row);
    });

    // Bind individual delete buttons
    scanHistoryContainer.querySelectorAll('.btn-remove-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const host = btn.getAttribute('data-host');
        removeScanHistoryItem(host);
      });
    });
  }

  function removeScanHistoryItem(host) {
    chrome.storage.local.get(['scanHistory'], (res) => {
      let history = res.scanHistory || [];
      history = history.filter(h => h.hostname !== host);
      chrome.storage.local.set({ scanHistory: history }, () => {
        cachedScanHistory = history;
        renderScanHistory(searchHistory ? searchHistory.value : '');
        showToast(`History removed for ${host}`);
      });
    });
  }

  // Live search in history
  if (searchHistory) {
    searchHistory.addEventListener('input', () => {
      renderScanHistory(searchHistory.value);
    });
  }

  // Clear all scan history
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      if (!confirm('Are you sure you want to clear all website scan history?')) return;
      chrome.storage.local.set({ scanHistory: [] }, () => {
        cachedScanHistory = [];
        renderScanHistory('');
        showToast('Website scan history cleared');
      });
    });
  }

  // Factory reset
  btnFactoryReset.addEventListener('click', () => {
    if (!confirm('Warning: This will reset all extension defaults and remove all website rules and scan history. Proceed?')) {
      return;
    }

    chrome.storage.local.clear(() => {
      chrome.storage.local.set({
        defaults: INITIAL_DEFAULTS,
        siteSettings: {},
        excludedSites: [],
        scanHistory: []
      }, () => {
        loadGlobalDefaults();
        loadSiteRules();
        loadScanHistory();
        showToast('Factory reset complete');
      });
    });
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Handle URL Hash navigation (e.g. options.html#history)
  function handleHashNavigation() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#history' || hash === '#tab-history') {
      switchTab('tab-history');
    } else if (hash === '#sites' || hash === '#tab-sites') {
      switchTab('tab-sites');
    } else if (hash === '#docs' || hash === '#tab-docs') {
      switchTab('tab-docs');
    } else if (hash === '#about' || hash === '#tab-about') {
      switchTab('tab-about');
    }
  }

  // Initial load
  loadGlobalDefaults();
  loadSiteRules();
  loadScanHistory();
  handleHashNavigation();
});
