/**
 * CopyPaste Freedom — Background Service Worker
 * Manages default settings, badges, and tab transitions.
 */

const DEFAULT_SETTINGS = {
  freedomMode: true,
  textSelection: true,
  copy: true,
  paste: true,
  cut: true,
  rightClick: true
};

function initStorage() {
  chrome.storage.local.get(['defaults', 'siteSettings', 'excludedSites'], (res) => {
    const updates = {};
    if (!res.defaults) {
      updates.defaults = DEFAULT_SETTINGS;
    }
    if (!res.siteSettings) {
      updates.siteSettings = {};
    }
    if (!res.excludedSites) {
      updates.excludedSites = [];
    }
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
}

chrome.runtime.onInstalled.addListener(initStorage);
chrome.runtime.onStartup.addListener(initStorage);
initStorage();

function getHostFromUrl(url) {
  try {
    if (!url) return null;
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return 'local-file';
    if (parsed.protocol.startsWith('http')) return parsed.hostname;
    return null;
  } catch {
    return null;
  }
}

function updateBadgeForTab(tabId, url) {
  const host = getHostFromUrl(url);
  if (!host) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  chrome.storage.local.get(['defaults', 'siteSettings', 'excludedSites'], (res) => {
    const defaults = res.defaults || DEFAULT_SETTINGS;
    const siteSettings = res.siteSettings || {};
    const excludedSites = res.excludedSites || [];

    const isExcluded = excludedSites.includes(host);
    const siteConfig = siteSettings[host];
    const isFreedomActive = !isExcluded && (siteConfig ? siteConfig.freedomMode : defaults.freedomMode);

    if (isFreedomActive) {
      chrome.action.setBadgeText({ tabId, text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#B7FF00' });
      chrome.action.setBadgeTextColor({ tabId, color: '#080A0A' });
    } else {
      chrome.action.setBadgeText({ tabId, text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#2A3230' });
      chrome.action.setBadgeTextColor({ tabId, color: '#9DA5A0' });
    }
  });
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    updateBadgeForTab(tab.id, tab.url);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    updateBadgeForTab(tabId, tab.url);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        updateBadgeForTab(tabs[0].id, tabs[0].url);
      }
    });
  }
});
