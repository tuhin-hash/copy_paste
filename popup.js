/**
 * CopyPaste Freedom — Popup Controller (v1.1)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Header & Host elements
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const currentHostEl = document.getElementById('currentHost');
  const hostStatusPill = document.getElementById('hostStatusPill');

  // Compact Scan Summary elements
  const scanSummaryBanner = document.getElementById('scanSummaryBanner');
  const summaryIcon = document.getElementById('summaryIcon');
  const summaryText = document.getElementById('summaryText');
  const summaryPill = document.getElementById('summaryPill');

  // Master switch
  const masterToggle = document.getElementById('masterToggle');
  const masterCard = document.querySelector('.master-card');
  const masterStateLabel = document.getElementById('masterStateLabel');
  const masterDesc = document.getElementById('masterDesc');
  const featuresCount = document.getElementById('featuresCount');

  // Individual toggles
  const toggleSelection = document.getElementById('toggleSelection');
  const toggleCopy = document.getElementById('toggleCopy');
  const togglePaste = document.getElementById('togglePaste');
  const toggleCut = document.getElementById('toggleCut');
  const toggleRightClick = document.getElementById('toggleRightClick');

  // Diagnostic items
  const diagSelection = document.getElementById('diagSelection');
  const diagSelectionDetail = document.getElementById('diagSelectionDetail');
  const diagCopy = document.getElementById('diagCopy');
  const diagCopyDetail = document.getElementById('diagCopyDetail');
  const diagPaste = document.getElementById('diagPaste');
  const diagPasteDetail = document.getElementById('diagPasteDetail');
  const diagRightClick = document.getElementById('diagRightClick');
  const diagRightClickDetail = document.getElementById('diagRightClickDetail');
  const btnRescan = document.getElementById('btnRescan');

  // Detailed breakdown elements
  const btnToggleDetails = document.getElementById('btnToggleDetails');
  const scanDetailsPanel = document.getElementById('scanDetailsPanel');
  const reportSelectDetail = document.getElementById('reportSelectDetail');
  const reportCopyDetail = document.getElementById('reportCopyDetail');
  const reportPasteDetail = document.getElementById('reportPasteDetail');
  const reportRightClickDetail = document.getElementById('reportRightClickDetail');
  const reportTimestamp = document.getElementById('reportTimestamp');

  // Site actions
  const btnEnableSite = document.getElementById('btnEnableSite');
  const btnDisableSite = document.getElementById('btnDisableSite');
  const btnResetSite = document.getElementById('btnResetSite');

  // Footer links
  const linkOptions = document.getElementById('linkOptions');
  const linkScanHistory = document.getElementById('linkScanHistory');
  const linkTestLab = document.getElementById('linkTestLab');

  let activeTab = null;
  let currentHost = 'unknown';
  let isExcluded = false;

  const DEFAULT_SETTINGS = {
    freedomMode: true,
    textSelection: true,
    copy: true,
    paste: true,
    cut: true,
    rightClick: true
  };

  let currentSettings = { ...DEFAULT_SETTINGS };

  // Helper to extract hostname
  function parseHost(url) {
    if (!url) return 'unknown';
    try {
      const u = new URL(url);
      if (u.protocol === 'file:') return 'local-file';
      if (u.protocol.startsWith('http')) return u.hostname;
      return u.protocol.replace(':', '');
    } catch {
      return 'unknown';
    }
  }

  // Get active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTab = tabs[0];
      currentHost = parseHost(activeTab.url);
      currentHostEl.textContent = currentHost;
      currentHostEl.title = activeTab.url || currentHost;
    }
  } catch (err) {
    console.warn('Failed to query tab:', err);
  }

  // Ensure content script is present
  async function ensureContentScript() {
    if (!activeTab || !activeTab.id || !activeTab.url) return;
    if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://')) return;

    try {
      await chrome.tabs.sendMessage(activeTab.id, { action: 'PING' });
    } catch {
      try {
        await chrome.scripting.insertCSS({
          target: { tabId: activeTab.id },
          files: ['content.css']
        });
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content.js']
        });
      } catch (e) {
        // Fallback or restricted page
      }
    }
  }

  // Update UI components with settings
  function renderUI() {
    const isFM = currentSettings.freedomMode;

    masterToggle.checked = isFM;
    toggleSelection.checked = currentSettings.textSelection;
    toggleCopy.checked = currentSettings.copy;
    togglePaste.checked = currentSettings.paste;
    toggleCut.checked = currentSettings.cut;
    toggleRightClick.checked = currentSettings.rightClick;

    if (isFM) {
      statusBadge.className = 'status-badge active';
      statusText.textContent = 'ACTIVE';

      masterCard.classList.remove('inactive');
      masterStateLabel.className = 'master-state-active';
      masterStateLabel.textContent = 'ACTIVE';
      masterDesc.textContent = 'Restoring text selection and clipboard events';
    } else {
      statusBadge.className = 'status-badge inactive';
      statusText.textContent = 'INACTIVE';

      masterCard.classList.add('inactive');
      masterStateLabel.className = 'master-state-inactive';
      masterStateLabel.textContent = 'INACTIVE';
      masterDesc.textContent = 'Native website restrictions active';
    }

    // Calculate active count
    const toggles = [
      currentSettings.textSelection,
      currentSettings.copy,
      currentSettings.paste,
      currentSettings.cut,
      currentSettings.rightClick
    ];
    const enabledCount = toggles.filter(Boolean).length;
    featuresCount.textContent = `${enabledCount} / 5 Enabled`;
  }

  // Load state from chrome storage
  function loadStoredSettings() {
    chrome.storage.local.get(['defaults', 'siteSettings', 'excludedSites'], (res) => {
      const defaults = res.defaults || DEFAULT_SETTINGS;
      const siteSettings = res.siteSettings || {};
      const excludedSites = res.excludedSites || [];

      isExcluded = excludedSites.includes(currentHost);

      if (isExcluded) {
        currentSettings = {
          freedomMode: false,
          textSelection: false,
          copy: false,
          paste: false,
          cut: false,
          rightClick: false
        };
      } else if (siteSettings[currentHost]) {
        currentSettings = { ...defaults, ...siteSettings[currentHost] };
      } else {
        currentSettings = { ...defaults };
      }

      renderUI();
      runScan();
    });
  }

  // Save changes to storage and send to tab
  function saveCurrentSettings() {
    chrome.storage.local.get(['siteSettings', 'excludedSites'], (res) => {
      const siteSettings = res.siteSettings || {};
      let excludedSites = res.excludedSites || [];

      if (currentSettings.freedomMode) {
        excludedSites = excludedSites.filter(h => h !== currentHost);
      }

      siteSettings[currentHost] = { ...currentSettings };

      chrome.storage.local.set({ siteSettings, excludedSites }, () => {
        renderUI();
        if (activeTab && activeTab.id) {
          chrome.tabs.sendMessage(activeTab.id, {
            action: 'UPDATE_SETTINGS',
            settings: currentSettings
          }).then(() => {
            runScan();
          }).catch(() => {});
        }
      });
    });
  }

  // Run Smart Website Scan
  async function runScan() {
    btnRescan.classList.add('spinning');
    summaryText.textContent = 'Analyzing page restrictions...';
    summaryPill.textContent = 'Scanning';
    summaryPill.className = 'summary-pill';
    scanSummaryBanner.className = 'scan-summary-banner';

    if (!activeTab || !activeTab.id) {
      setDiagnosticsUnknown();
      btnRescan.classList.remove('spinning');
      return;
    }

    try {
      chrome.tabs.sendMessage(activeTab.id, { action: 'SCAN_RESTRICTIONS' }, (response) => {
        btnRescan.classList.remove('spinning');
        if (chrome.runtime.lastError || !response || !response.diagnostics) {
          setDiagnosticsUnknown();
          return;
        }

        const d = response.diagnostics;
        const items = d.items || {};
        const summary = d.summary || {};

        // Update 4 diagnostic badges with status (Fixed, Detected, Clear, Unsupported)
        updateDiagItem(diagSelection, diagSelectionDetail, items.textSelection || { status: d.textSelection ? 'Detected' : 'Clear', vector: 'CSS user-select' });
        updateDiagItem(diagCopy, diagCopyDetail, items.copy || { status: d.copy ? 'Detected' : 'Clear', vector: 'Copy event guard' });
        updateDiagItem(diagPaste, diagPasteDetail, items.paste || { status: d.paste ? 'Detected' : 'Clear', vector: 'Paste unblocker' });
        updateDiagItem(diagRightClick, diagRightClickDetail, items.rightClick || { status: d.rightClick ? 'Detected' : 'Clear', vector: 'Contextmenu guard' });

        // Update detailed diagnostics panel
        if (items.textSelection) reportSelectDetail.textContent = items.textSelection.detail;
        if (items.copy) reportCopyDetail.textContent = items.copy.detail;
        if (items.paste) reportPasteDetail.textContent = items.paste.detail;
        if (items.rightClick) reportRightClickDetail.textContent = items.rightClick.detail;
        reportTimestamp.textContent = `Last scanned: ${new Date().toLocaleTimeString()}`;

        // Update Compact Summary Banner
        const totalDet = summary.totalDetected || 0;
        const totalFix = summary.totalFixed || 0;

        if (summary.status === 'Unsupported') {
          scanSummaryBanner.className = 'scan-summary-banner status-warning';
          summaryIcon.textContent = '🔒';
          summaryText.textContent = summary.text || 'Protected or canvas-rendered surface';
          summaryPill.textContent = 'UNSUPPORTED';
          hostStatusPill.textContent = 'Unsupported';
          hostStatusPill.className = 'host-pill';
        } else if (summary.status === 'Unknown') {
          scanSummaryBanner.className = 'scan-summary-banner';
          summaryIcon.textContent = '❓';
          summaryText.textContent = summary.text || 'Diagnostic verification inconclusive';
          summaryPill.textContent = 'UNKNOWN';
          hostStatusPill.textContent = 'Indeterminate';
          hostStatusPill.className = 'host-pill';
        } else if (totalDet === 0) {
          scanSummaryBanner.className = 'scan-summary-banner';
          summaryIcon.textContent = '✓';
          summaryText.textContent = 'No restrictions detected on this page';
          summaryPill.textContent = 'CLEAR';
          hostStatusPill.textContent = 'Unrestricted';
          hostStatusPill.className = 'host-pill';
        } else if (totalFix === totalDet && totalDet > 0) {
          scanSummaryBanner.className = 'scan-summary-banner status-neutralized';
          summaryIcon.textContent = '⚡';
          summaryText.textContent = `${totalDet} restriction${totalDet === 1 ? '' : 's'} detected • All Neutralized`;
          summaryPill.textContent = 'FIXED';
          hostStatusPill.textContent = 'Neutralized';
          hostStatusPill.className = 'host-pill neutralized';
        } else {
          scanSummaryBanner.className = 'scan-summary-banner status-warning';
          summaryIcon.textContent = '⚠️';
          const unhandled = totalDet - totalFix;
          summaryText.textContent = summary.text || `${totalDet} restriction${totalDet === 1 ? '' : 's'} detected • ${unhandled} Active`;
          summaryPill.textContent = 'DETECTED';
          hostStatusPill.textContent = 'Restricted';
          hostStatusPill.className = 'host-pill restricted';
        }

        // Save scan to local history
        recordScanHistory(currentHost, d);
      });
    } catch {
      setDiagnosticsUnknown();
      btnRescan.classList.remove('spinning');
    }
  }

  function updateDiagItem(badgeEl, detailEl, item) {
    const st = (item.status || 'Clear').toLowerCase();
    badgeEl.textContent = item.status || 'Clear';

    if (st === 'fixed') {
      badgeEl.className = 'scan-status badge-fixed';
    } else if (st === 'detected') {
      badgeEl.className = 'scan-status badge-detected';
    } else if (st === 'unsupported') {
      badgeEl.className = 'scan-status badge-unsupported';
    } else if (st === 'unknown') {
      badgeEl.className = 'scan-status badge-neutral';
    } else {
      badgeEl.className = 'scan-status badge-clear';
    }

    if (detailEl && item.vector) {
      detailEl.textContent = item.vector;
    }
  }

  function isProtectedUrl(url) {
    if (!url) return false;
    return (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('view-source:') ||
      url.startsWith('devtools://')
    );
  }

  function setDiagnosticsUnsupported() {
    [diagSelection, diagCopy, diagPaste, diagRightClick].forEach(el => {
      el.textContent = 'Unsupported';
      el.className = 'scan-status badge-unsupported';
    });
    if (diagSelectionDetail) diagSelectionDetail.textContent = 'Protected surface';
    if (diagCopyDetail) diagCopyDetail.textContent = 'Protected surface';
    if (diagPasteDetail) diagPasteDetail.textContent = 'Protected surface';
    if (diagRightClickDetail) diagRightClickDetail.textContent = 'Protected surface';

    if (reportSelectDetail) reportSelectDetail.textContent = 'Chrome security policy restricts extensions on internal system pages';
    if (reportCopyDetail) reportCopyDetail.textContent = 'Chrome security policy restricts extensions on internal system pages';
    if (reportPasteDetail) reportPasteDetail.textContent = 'Chrome security policy restricts extensions on internal system pages';
    if (reportRightClickDetail) reportRightClickDetail.textContent = 'Chrome security policy restricts extensions on internal system pages';

    scanSummaryBanner.className = 'scan-summary-banner status-warning';
    summaryIcon.textContent = '🔒';
    summaryText.textContent = 'Protected browser surface';
    summaryPill.textContent = 'UNSUPPORTED';
    hostStatusPill.textContent = 'Unsupported';
    hostStatusPill.className = 'host-pill';
  }

  function setDiagnosticsUnknown() {
    if (activeTab && activeTab.url && isProtectedUrl(activeTab.url)) {
      setDiagnosticsUnsupported();
      return;
    }

    [diagSelection, diagCopy, diagPaste, diagRightClick].forEach(el => {
      el.textContent = 'Unknown';
      el.className = 'scan-status badge-neutral';
    });
    scanSummaryBanner.className = 'scan-summary-banner';
    summaryIcon.textContent = 'ℹ️';
    summaryText.textContent = 'Diagnostic scan unavailable';
    summaryPill.textContent = 'UNKNOWN';
    hostStatusPill.textContent = 'Standard';
    hostStatusPill.className = 'host-pill';
  }

  // Maintain local history of scanned website hostnames (Zero private data)
  function recordScanHistory(hostname, scanResult) {
    if (!hostname || hostname === 'unknown' || hostname === 'newtab') return;

    chrome.storage.local.get(['scanHistory'], (res) => {
      let history = res.scanHistory || [];

      // Determine detected list
      const detectedList = [];
      const items = scanResult.items || {};
      if (items.textSelection && items.textSelection.detected) detectedList.push('Text Selection');
      if (items.copy && items.copy.detected) detectedList.push('Copy');
      if (items.paste && items.paste.detected) detectedList.push('Paste');
      if (items.rightClick && items.rightClick.detected) detectedList.push('Right-Click');

      const entry = {
        hostname: hostname,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        restrictions: detectedList,
        restrictionsCount: detectedList.length,
        status: (scanResult.summary && scanResult.summary.status) || (detectedList.length > 0 ? 'All Neutralized' : 'Clear')
      };

      // Filter out existing entry for same hostname and prepend latest
      history = [entry, ...history.filter(h => h.hostname !== hostname)].slice(0, 50);
      chrome.storage.local.set({ scanHistory: history });
    });
  }

  // Toggle Detailed Breakdown Accordion
  btnToggleDetails.addEventListener('click', () => {
    const isHidden = scanDetailsPanel.classList.contains('hidden');
    if (isHidden) {
      scanDetailsPanel.classList.remove('hidden');
      btnToggleDetails.classList.add('expanded');
    } else {
      scanDetailsPanel.classList.add('hidden');
      btnToggleDetails.classList.remove('expanded');
    }
  });

  // Event Listeners for Toggles
  masterToggle.addEventListener('change', () => {
    currentSettings.freedomMode = masterToggle.checked;
    saveCurrentSettings();
  });

  toggleSelection.addEventListener('change', () => {
    currentSettings.textSelection = toggleSelection.checked;
    saveCurrentSettings();
  });

  toggleCopy.addEventListener('change', () => {
    currentSettings.copy = toggleCopy.checked;
    saveCurrentSettings();
  });

  togglePaste.addEventListener('change', () => {
    currentSettings.paste = togglePaste.checked;
    saveCurrentSettings();
  });

  toggleCut.addEventListener('change', () => {
    currentSettings.cut = toggleCut.checked;
    saveCurrentSettings();
  });

  toggleRightClick.addEventListener('change', () => {
    currentSettings.rightClick = toggleRightClick.checked;
    saveCurrentSettings();
  });

  btnRescan.addEventListener('click', () => {
    runScan();
  });

  // Action Buttons
  btnEnableSite.addEventListener('click', () => {
    currentSettings = {
      freedomMode: true,
      textSelection: true,
      copy: true,
      paste: true,
      cut: true,
      rightClick: true
    };
    saveCurrentSettings();
  });

  btnDisableSite.addEventListener('click', () => {
    currentSettings.freedomMode = false;
    saveCurrentSettings();
  });

  btnResetSite.addEventListener('click', () => {
    chrome.storage.local.get(['defaults', 'siteSettings', 'excludedSites'], (res) => {
      const siteSettings = res.siteSettings || {};
      let excludedSites = res.excludedSites || [];

      delete siteSettings[currentHost];
      excludedSites = excludedSites.filter(h => h !== currentHost);

      chrome.storage.local.set({ siteSettings, excludedSites }, () => {
        loadStoredSettings();
      });
    });
  });

  // Links
  linkOptions.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
  });

  linkScanHistory.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html#history') });
  });

  linkTestLab.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('test.html') });
  });

  // Initial setup
  await ensureContentScript();
  loadStoredSettings();
});
