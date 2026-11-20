/**
 * CopyPaste Freedom — Content Script
 * Restores text selection, copy, paste, cut, and right-click interactions.
 */

(() => {
  if (window.__CPF_CONTENT_SCRIPT_INITIALIZED__) {
    return;
  }
  window.__CPF_CONTENT_SCRIPT_INITIALIZED__ = true;
  try {
    if (document.documentElement) {
      document.documentElement.dataset.cpfLoaded = 'true';
      document.documentElement.dataset.cpfVersion = '1.1.0';
    }
  } catch {}

  const getHostname = () => {
    try {
      if (location.protocol === 'file:') {
        return 'local-file';
      }
      return location.hostname || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const currentHost = getHostname();

  const DEFAULT_SETTINGS = {
    freedomMode: true,
    textSelection: true,
    copy: true,
    paste: true,
    cut: true,
    rightClick: true
  };

  let activeSettings = { ...DEFAULT_SETTINGS };
  let isExcluded = false;
  let observer = null;
  let listenersAttached = false;

  // Load configuration from storage
  function loadSettings(callback) {
    chrome.storage.local.get(['defaults', 'siteSettings', 'excludedSites'], (res) => {
      const defaults = res.defaults || DEFAULT_SETTINGS;
      const siteSettings = res.siteSettings || {};
      const excludedSites = res.excludedSites || [];

      isExcluded = excludedSites.includes(currentHost);

      if (isExcluded) {
        activeSettings = {
          freedomMode: false,
          textSelection: false,
          copy: false,
          paste: false,
          cut: false,
          rightClick: false
        };
      } else if (siteSettings[currentHost]) {
        activeSettings = { ...defaults, ...siteSettings[currentHost] };
      } else {
        activeSettings = { ...defaults };
      }

      applySettings();
      if (callback) callback(activeSettings);
    });
  }

  // Update DOM classes and state based on active settings
  function applySettings() {
    const root = document.documentElement;
    if (!root) return;
    try {
      root.dataset.cpfFreedom = activeSettings.freedomMode ? 'on' : 'off';
      root.dataset.cpfSelect = activeSettings.textSelection ? 'on' : 'off';
    } catch {}

    if (activeSettings.freedomMode && activeSettings.textSelection) {
      root.classList.add('cpf-select-active');
      clearInlineUserSelect();
      syncFlutterSemantics();
    } else {
      root.classList.remove('cpf-select-active');
      restoreInlineUserSelect();
      removeShadowStyles();
    }

    if (activeSettings.freedomMode) {
      root.classList.add('cpf-freedom-enabled');
      cleanInlineHandlers();
      startObserver();
    } else {
      root.classList.remove('cpf-freedom-enabled');
      restoreInlineHandlers();
      stopObserver();
    }
  }

  // Clean inline blocking handlers while saving originals for clean restoration
  function cleanInlineHandlers() {
    if (!activeSettings.freedomMode) return;

    try {
      const topTargets = [document.documentElement, document.body].filter(Boolean);

      if (activeSettings.copy) {
        if (document.oncopy !== null) document.oncopy = null;
        if (window.oncopy !== null) window.oncopy = null;
        if (document.body && document.body.oncopy !== null) document.body.oncopy = null;
        topTargets.forEach(el => preserveAndRemoveAttr(el, 'oncopy'));
        document.querySelectorAll('[oncopy]').forEach(el => preserveAndRemoveAttr(el, 'oncopy'));
      }

      if (activeSettings.paste) {
        if (document.onpaste !== null) document.onpaste = null;
        if (window.onpaste !== null) window.onpaste = null;
        if (document.body && document.body.onpaste !== null) document.body.onpaste = null;
        topTargets.forEach(el => preserveAndRemoveAttr(el, 'onpaste'));
        document.querySelectorAll('[onpaste]').forEach(el => preserveAndRemoveAttr(el, 'onpaste'));
      }

      if (activeSettings.cut) {
        if (document.oncut !== null) document.oncut = null;
        if (window.oncut !== null) window.oncut = null;
        if (document.body && document.body.oncut !== null) document.body.oncut = null;
        topTargets.forEach(el => preserveAndRemoveAttr(el, 'oncut'));
        document.querySelectorAll('[oncut]').forEach(el => preserveAndRemoveAttr(el, 'oncut'));
      }

      if (activeSettings.rightClick) {
        if (document.oncontextmenu !== null) document.oncontextmenu = null;
        if (window.oncontextmenu !== null) window.oncontextmenu = null;
        if (document.body && document.body.oncontextmenu !== null) document.body.oncontextmenu = null;
        topTargets.forEach(el => preserveAndRemoveAttr(el, 'oncontextmenu'));
        document.querySelectorAll('[oncontextmenu]').forEach(el => preserveAndRemoveAttr(el, 'oncontextmenu'));
      }

      if (activeSettings.textSelection) {
        if (document.onselectstart !== null) document.onselectstart = null;
        if (window.onselectstart !== null) window.onselectstart = null;
        if (document.body && document.body.onselectstart !== null) document.body.onselectstart = null;
        if (document.ondragstart !== null) document.ondragstart = null;
        topTargets.forEach(el => {
          preserveAndRemoveAttr(el, 'onselectstart');
          preserveAndRemoveAttr(el, 'unselectable');
        });
        document.querySelectorAll('[onselectstart]').forEach(el => {
          preserveAndRemoveAttr(el, 'onselectstart');
          try { el.onselectstart = null; } catch {}
        });
        document.querySelectorAll('[unselectable]').forEach(el => {
          preserveAndRemoveAttr(el, 'unselectable');
          try { el.removeAttribute('unselectable'); } catch {}
        });
      }
    } catch {}
  }

  function preserveAndRemoveAttr(el, attrName) {
    if (!el || !el.hasAttribute(attrName)) return;
    const val = el.getAttribute(attrName);
    el.dataset['cpfOrig_' + attrName] = val;
    el.removeAttribute(attrName);
    try {
      if (el[attrName] !== undefined && el[attrName] !== null) {
        el[attrName] = null;
      }
    } catch {}
  }

  // Restore original website handlers when Freedom Mode is disabled
  function restoreInlineHandlers() {
    try {
      const elements = document.querySelectorAll('[data-cpf-orig_oncopy], [data-cpf-orig_onpaste], [data-cpf-orig_oncut], [data-cpf-orig_oncontextmenu], [data-cpf-orig_onselectstart], [data-cpf-orig_unselectable]');
      elements.forEach(el => {
        ['oncopy', 'onpaste', 'oncut', 'oncontextmenu', 'onselectstart', 'unselectable'].forEach(attr => {
          const key = 'cpfOrig_' + attr;
          if (el.dataset[key]) {
            el.setAttribute(attr, el.dataset[key]);
            delete el.dataset[key];
          }
        });
      });
    } catch {}
  }

  // Override inline style user-select: none on content nodes
  function clearInlineUserSelect() {
    if (!activeSettings.freedomMode || !activeSettings.textSelection) return;
    try {
      const styledEls = document.querySelectorAll('[style*="user-select"], [style*="userSelect"]');
      styledEls.forEach(el => {
        const s = el.style;
        if (s.userSelect === 'none' || s.webkitUserSelect === 'none') {
          el.dataset.cpfOrigUserSelect = s.userSelect || '';
          el.dataset.cpfOrigWebkitUserSelect = s.webkitUserSelect || '';
          s.removeProperty('user-select');
          s.removeProperty('-webkit-user-select');
        }
      });
    } catch {}
  }

  function restoreInlineUserSelect() {
    try {
      const styledEls = document.querySelectorAll('[data-cpf-orig-user-select]');
      styledEls.forEach(el => {
        if (el.dataset.cpfOrigUserSelect) {
          el.style.userSelect = el.dataset.cpfOrigUserSelect;
          delete el.dataset.cpfOrigUserSelect;
        }
        if (el.dataset.cpfOrigWebkitUserSelect) {
          el.style.webkitUserSelect = el.dataset.cpfOrigWebkitUserSelect;
          delete el.dataset.cpfOrigWebkitUserSelect;
        }
      });
    } catch {}
  }

  // Event interceptors using capture phase (true)
  function handleCopyCapture(e) {
    if (e._cpf_probe) return;
    if (activeSettings.freedomMode && activeSettings.copy) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  function handleCutCapture(e) {
    if (e._cpf_probe) return;
    if (activeSettings.freedomMode && activeSettings.cut) {
      const target = e.target;
      const isEditable = target && (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA'
      );
      if (isEditable) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }
  }

  function handlePasteCapture(e) {
    if (e._cpf_probe) return;
    if (activeSettings.freedomMode && activeSettings.paste) {
      const target = e.target;
      const isEditable = !target || (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true'
      );
      if (isEditable) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }
  }

  function handleContextMenuCapture(e) {
    if (e._cpf_probe) return;
    if (activeSettings.freedomMode && activeSettings.rightClick) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  function handleSelectStartCapture(e) {
    if (e._cpf_probe) return;
    if (activeSettings.freedomMode && activeSettings.textSelection) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  function handleKeyDownCapture(e) {
    if (!activeSettings.freedomMode) return;
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    if (!isCtrlOrMeta) return;

    const key = (e.key || '').toLowerCase();
    if (key === 'c' && activeSettings.copy) {
      e.stopPropagation();
    } else if (key === 'v' && activeSettings.paste) {
      e.stopPropagation();
    } else if (key === 'x' && activeSettings.cut) {
      const target = e.target;
      const isEditable = target && (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA'
      );
      if (isEditable) {
        e.stopPropagation();
      }
    } else if (key === 'a' && activeSettings.textSelection) {
      e.stopPropagation();
    }
  }

  function handleDragStartCapture(e) {
    if (activeSettings.freedomMode && activeSettings.textSelection) {
      e.stopPropagation();
    }
  }

  let isMouseDown = false;
  let pendingObserverWork = false;

  function attachListeners() {
    if (listenersAttached) return;
    window.addEventListener('copy', handleCopyCapture, true);
    window.addEventListener('cut', handleCutCapture, true);
    window.addEventListener('paste', handlePasteCapture, true);
    window.addEventListener('contextmenu', handleContextMenuCapture, true);
    window.addEventListener('selectstart', handleSelectStartCapture, true);
    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('dragstart', handleDragStartCapture, true);

    // Track mouse button state to prevent MutationObserver DOM interference during active drag
    window.addEventListener('mousedown', () => { isMouseDown = true; }, true);
    window.addEventListener('mouseup', () => {
      isMouseDown = false;
      if (pendingObserverWork) {
        pendingObserverWork = false;
        cleanInlineHandlers();
        clearInlineUserSelect();
        syncFlutterSemantics();
      }
    }, true);

    listenersAttached = true;
  }

  // MutationObserver for dynamic SPAs and injected elements
  let observerTimeout = null;
  function startObserver() {
    if (observer || !document.body) return;

    observer = new MutationObserver((mutations) => {
      // Filter out our own class mutations on html element to prevent loops
      const relevant = mutations.some(m => m.target !== document.documentElement || m.attributeName !== 'class');
      if (!relevant) return;

      if (observerTimeout) return;
      observerTimeout = setTimeout(() => {
        observerTimeout = null;
        if (isMouseDown) {
          pendingObserverWork = true;
          return;
        }
        cleanInlineHandlers();
        clearInlineUserSelect();
        syncFlutterSemantics();
      }, 150);
    });

    try {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'oncopy', 'onpaste', 'oncut', 'oncontextmenu', 'onselectstart']
      });
    } catch {}
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (observerTimeout) {
      clearTimeout(observerTimeout);
      observerTimeout = null;
    }
  }

  // Helper to discover all open shadow roots recursively
  function findAllShadowRoots(root = document.body) {
    const shadowRoots = [];
    if (!root) return shadowRoots;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node = walker.currentNode;
      while (node) {
        if (node.shadowRoot) {
          shadowRoots.push(node.shadowRoot);
          const inner = findAllShadowRoots(node.shadowRoot);
          inner.forEach(s => { if (!shadowRoots.includes(s)) shadowRoots.push(s); });
        }
        node = walker.nextNode();
      }
    } catch {}
    return shadowRoots;
  }

  // Inject shadow DOM styles and support Flutter accessibility semantics
  function syncFlutterSemantics() {
    if (!activeSettings.freedomMode || !activeSettings.textSelection) return;
    try {
      // 1. Look for Flutter's accessibility placeholder button to activate semantics tree
      const placeholder = document.querySelector('flt-semantics-placeholder') ||
                          document.querySelector('[aria-label="Enable accessibility"]') ||
                          document.querySelector('[aria-label*="accessibility" i]');
      if (placeholder && !document.querySelector('flt-semantics')) {
        try { placeholder.focus(); } catch {}
        try { placeholder.click(); } catch {}
      }

      // 2. Discover all open Shadow Roots across document and Flutter elements
      const allShadows = findAllShadowRoots(document.body);
      const flutterView = document.querySelector('flutter-view');
      const glassPane = document.querySelector('flt-glass-pane');
      if (flutterView && flutterView.shadowRoot && !allShadows.includes(flutterView.shadowRoot)) {
        allShadows.push(flutterView.shadowRoot);
      }
      if (glassPane && glassPane.shadowRoot && !allShadows.includes(glassPane.shadowRoot)) {
        allShadows.push(glassPane.shadowRoot);
      }

      allShadows.forEach(shadowRoot => {
        injectShadowStyles(shadowRoot);
      });
    } catch {}
  }

  function injectShadowStyles(shadowRoot) {
    try {
      if (shadowRoot.querySelector('#cpf-shadow-style')) return;
      const style = document.createElement('style');
      style.id = 'cpf-shadow-style';
      style.textContent = `
        * { -webkit-user-select: text !important; user-select: text !important; }
        ::selection { background-color: #B7FF00 !important; color: #080A0A !important; }
        ::-moz-selection { background-color: #B7FF00 !important; color: #080A0A !important; }
        flt-paragraph, flt-text, flt-semantics, flt-semantics-host { pointer-events: auto !important; }
      `;
      shadowRoot.appendChild(style);
    } catch {}
  }

  function removeShadowStyles() {
    try {
      const allShadows = findAllShadowRoots(document.body);
      allShadows.forEach(shadowRoot => {
        const s = shadowRoot.querySelector('#cpf-shadow-style');
        if (s) s.remove();
      });
    } catch {}
  }

  // Diagnostic scanner: detects active restrictions on the page and checks neutralization
  function scanRestrictions() {
    const rawDetected = {
      textSelection: false,
      copy: false,
      paste: false,
      rightClick: false
    };

    const isPdf = !!document.querySelector('embed[type="application/pdf"]') || location.pathname.endsWith('.pdf');

    // 0. Inspect Flutter Web and Canvas-based text rendering architecture
    function inspectFlutterArchitecture() {
      const flutterView = document.querySelector('flutter-view');
      const fltPane = document.querySelector('flt-glass-pane, flt-scene-host');
      const isFlutter = !!flutterView || !!fltPane;

      // Collect all search contexts: document, flutterView, flt-glass-pane, and all open shadow roots
      const searchContexts = [document];
      if (flutterView) searchContexts.push(flutterView);
      if (fltPane) searchContexts.push(fltPane);

      try {
        const shadows = findAllShadowRoots(document.body);
        shadows.forEach(s => {
          if (!searchContexts.includes(s)) searchContexts.push(s);
        });
      } catch {}

      if (flutterView && flutterView.shadowRoot && !searchContexts.includes(flutterView.shadowRoot)) {
        searchContexts.push(flutterView.shadowRoot);
      }
      if (fltPane && fltPane.shadowRoot && !searchContexts.includes(fltPane.shadowRoot)) {
        searchContexts.push(fltPane.shadowRoot);
      }
      try {
        const pane = document.querySelector('flt-glass-pane');
        if (pane && pane.shadowRoot && !searchContexts.includes(pane.shadowRoot)) {
          searchContexts.push(pane.shadowRoot);
        }
      } catch {}

      // Count canvases across all contexts
      let totalCanvases = 0;
      searchContexts.forEach(ctx => {
        try {
          totalCanvases += ctx.querySelectorAll('canvas').length;
        } catch {}
      });
      const hasCanvas = totalCanvases > 0;

      // Check for Flutter DOM renderer elements (<flt-scene>, <flt-paragraph>, <flt-text>, <flt-semantics>)
      let hasFltParagraph = false;
      searchContexts.forEach(ctx => {
        try {
          if (ctx.querySelectorAll('flt-paragraph, flt-text, flt-scene, flt-semantics').length > 0) {
            hasFltParagraph = true;
          }
        } catch {}
      });

      // Check for substantive DOM text nodes inside any context
      let hasSelectableDomText = false;
      let substantiveTextCount = 0;
      const textWalkerFilter = {
        acceptNode(node) {
          if (!node.nodeValue || node.nodeValue.trim().length < 2) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'canvas', 'flt-semantics-placeholder', 'flt-text-editing-host'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      };

      for (const ctx of searchContexts) {
        try {
          const textWalker = document.createTreeWalker(ctx, NodeFilter.SHOW_TEXT, textWalkerFilter);
          while (textWalker.nextNode()) {
            substantiveTextCount++;
            if (substantiveTextCount >= 5) {
              hasSelectableDomText = true;
              break;
            }
          }
          if (hasSelectableDomText) break;
        } catch {}
      }

      // Check for SVG text elements
      let hasSvgText = false;
      searchContexts.forEach(ctx => {
        try {
          if (ctx.querySelectorAll('svg text, svg tspan').length > 0) {
            hasSvgText = true;
          }
        } catch {}
      });

      if (!isFlutter) {
        // Non-Flutter page: check if there's a full-page Canvas app with zero DOM text
        if (hasCanvas && document.body) {
          const bodyText = (document.body.innerText || '').trim();
          if (bodyText.length === 0 && totalCanvases >= 1) {
            return { isFlutter: false, isCanvasRendered: true, isDomFlutter: false, isIndeterminate: false };
          }
        }
        return { isFlutter: false, isCanvasRendered: false, isDomFlutter: false, isIndeterminate: false };
      }

      // Confirmed CanvasKit: canvas presence, absence of DOM paragraph elements, and absence of substantive content text nodes
      if (hasCanvas && !hasFltParagraph && !hasSelectableDomText && !hasSvgText) {
        return { isFlutter: true, isCanvasRendered: true, isDomFlutter: false, isIndeterminate: false };
      } else if (hasFltParagraph || hasSelectableDomText || hasSvgText) {
        return { isFlutter: true, isCanvasRendered: false, isDomFlutter: true, isIndeterminate: false };
      } else if (flutterView && !hasCanvas && !hasSelectableDomText) {
        return { isFlutter: true, isCanvasRendered: false, isDomFlutter: false, isIndeterminate: true };
      }

      return { isFlutter: true, isCanvasRendered: false, isDomFlutter: false, isIndeterminate: false };
    }

    const flutterArch = inspectFlutterArchitecture();
    if (flutterArch.isCanvasRendered) {
      rawDetected.textSelection = true;
    }

    // Active selection capability check: truthful inspection of real user selection
    // Never mutates window.getSelection() or performs artificial programmatic Range probes!
    function probeTextSelectionCapability() {
      // 1. Check if user already has an active, non-collapsed selection
      const userSel = window.getSelection();
      if (userSel && !userSel.isCollapsed && userSel.toString().trim().length > 0) {
        return { verified: true, activeUserSelection: true };
      }
      return { verified: false, noActiveSelection: true };
    }

    try {
      // 1. Text Selection detection
      if (document.body) {
        const bodyStyle = window.getComputedStyle(document.body);
        const sel = bodyStyle.userSelect || bodyStyle.webkitUserSelect;
        if (sel === 'none') {
          rawDetected.textSelection = true;
        }
      }

      if (!rawDetected.textSelection && document.body) {
        const paragraphs = document.querySelectorAll('p, div, article, span, section');
        for (let i = 0; i < Math.min(paragraphs.length, 12); i++) {
          const style = window.getComputedStyle(paragraphs[i]);
          const sel = style.userSelect || style.webkitUserSelect;
          if (sel === 'none') {
            rawDetected.textSelection = true;
            break;
          }
        }
      }

      if (document.onselectstart !== null || (document.body && document.body.onselectstart !== null)) {
        rawDetected.textSelection = true;
      }

      if (document.body && (document.body.hasAttribute('onselectstart') || document.body.dataset.cpfOrig_onselectstart)) {
        rawDetected.textSelection = true;
      }

      if (document.querySelector('[data-cpf-orig_onselectstart], [data-cpf-orig-user-select]')) {
        rawDetected.textSelection = true;
      }

      // 2. Copy restriction detection
      if (document.oncopy !== null || window.oncopy !== null || (document.body && document.body.oncopy !== null)) {
        rawDetected.copy = true;
      } else if (document.body && (document.body.hasAttribute('oncopy') || document.body.dataset.cpfOrig_oncopy)) {
        rawDetected.copy = true;
      } else if (document.querySelector('[data-cpf-orig_oncopy]')) {
        rawDetected.copy = true;
      } else {
        try {
          const probe = new Event('copy', { cancelable: true, bubbles: true });
          probe._cpf_probe = true;
          (document.body || document.documentElement).dispatchEvent(probe);
          if (probe.defaultPrevented) {
            rawDetected.copy = true;
          }
        } catch {}
      }

      // 3. Paste restriction detection
      if (document.onpaste !== null || window.onpaste !== null || (document.body && document.body.onpaste !== null)) {
        rawDetected.paste = true;
      } else if (document.body && (document.body.hasAttribute('onpaste') || document.body.dataset.cpfOrig_onpaste)) {
        rawDetected.paste = true;
      } else if (document.querySelector('[data-cpf-orig_onpaste]')) {
        rawDetected.paste = true;
      } else {
        const inputs = document.querySelectorAll('input, textarea');
        for (let i = 0; i < Math.min(inputs.length, 5); i++) {
          const inp = inputs[i];
          if (inp.onpaste !== null || inp.hasAttribute('onpaste') || inp.dataset.cpfOrig_onpaste) {
            rawDetected.paste = true;
            break;
          }
        }

        if (!rawDetected.paste) {
          try {
            const probe = new Event('paste', { cancelable: true, bubbles: true });
            probe._cpf_probe = true;
            const target = inputs[0] || document.body || document.documentElement;
            target.dispatchEvent(probe);
            if (probe.defaultPrevented) {
              rawDetected.paste = true;
            }
          } catch {}
        }
      }

      // 4. Context menu restriction detection
      if (document.oncontextmenu !== null || window.oncontextmenu !== null || (document.body && document.body.oncontextmenu !== null)) {
        rawDetected.rightClick = true;
      } else if (document.body && (document.body.hasAttribute('oncontextmenu') || document.body.dataset.cpfOrig_oncontextmenu)) {
        rawDetected.rightClick = true;
      } else if (document.querySelector('[data-cpf-orig_oncontextmenu]')) {
        rawDetected.rightClick = true;
      } else {
        try {
          const probe = new MouseEvent('contextmenu', { cancelable: true, bubbles: true, clientX: 20, clientY: 20 });
          probe._cpf_probe = true;
          (document.body || document.documentElement).dispatchEvent(probe);
          if (probe.defaultPrevented) {
            rawDetected.rightClick = true;
          }
        } catch {}
      }
    } catch (err) {
      console.warn('CopyPaste Freedom scan error:', err);
    }

    // Determine neutralization status for each restriction
    function resolveStatus(detected, featureEnabled, featureName, vector) {
      if (isPdf) {
        return {
          detected: true,
          status: 'Unsupported',
          detail: 'Unsupported: Embedded Chrome PDF viewer controls',
          vector: vector
        };
      }

      if (featureName === 'Text Selection') {
        if (flutterArch.isCanvasRendered) {
          return {
            detected: true,
            status: 'Unsupported',
            detail: 'Unsupported: Confirmed CanvasKit architecture renders text as canvas pixels without DOM text nodes',
            vector: 'Flutter CanvasKit / HTML5 Canvas'
          };
        }
        if (flutterArch.isIndeterminate) {
          return {
            detected: true,
            status: 'Unknown',
            detail: 'Indeterminate: Content container architecture cannot be conclusively verified',
            vector: 'Custom Web Component'
          };
        }
        if (flutterArch.isDomFlutter) {
          if (activeSettings.freedomMode && featureEnabled) {
            const probe = probeTextSelectionCapability();
            if (probe.verified) {
              return {
                detected: true,
                status: 'Fixed',
                detail: 'Neutralized: DOM-based Flutter text selection verified functional',
                vector: 'Flutter DOM scene / flt-paragraph'
              };
            } else {
              return {
                detected: true,
                status: 'Detected',
                detail: 'Fix attempted: Overrides active, but Flutter DOM selection not verified',
                vector: 'Flutter flt-glass-pane'
              };
            }
          } else {
            return {
              detected: true,
              status: 'Detected',
              detail: 'Active restriction: Flutter glass-pane intercepting pointer events',
              vector: 'Flutter flt-glass-pane'
            };
          }
        }
      }

      if (!detected) {
        return {
          detected: false,
          status: 'Clear',
          detail: `No ${featureName.toLowerCase()} restrictions detected`,
          vector: vector
        };
      }

      if (activeSettings.freedomMode && featureEnabled) {
        // Verify that the interaction is ACTUALLY verified as restored
        let verified = false;
        let isFixAttempted = false;

        if (featureName === 'Text Selection') {
          // Never claim Fixed based only on computed CSS properties or applied class
          const selProbe = probeTextSelectionCapability();
          if (selProbe.verified) {
            verified = true;
          } else {
            isFixAttempted = true;
          }
        } else if (featureName === 'Copy Interaction') {
          verified = listenersAttached;
        } else if (featureName === 'Paste Interaction') {
          verified = listenersAttached;
        } else if (featureName === 'Right-Click Menu') {
          verified = listenersAttached;
        }

        if (verified) {
          return {
            detected: true,
            status: 'Fixed',
            detail: `Neutralized: ${featureName} restored and verified active`,
            vector: vector
          };
        } else if (isFixAttempted) {
          return {
            detected: true,
            status: 'Detected',
            detail: `Fix attempted: ${featureName} overrides active; drag to select text to verify`,
            vector: vector
          };
        } else {
          return {
            detected: true,
            status: 'Detected',
            detail: `Active restriction: ${featureName} override attempted but not verified`,
            vector: vector
          };
        }
      }

      return {
        detected: true,
        status: 'Detected',
        detail: `Active restriction: ${featureName} blocked by page script`,
        vector: vector
      };
    }

    const items = {
      textSelection: resolveStatus(rawDetected.textSelection, activeSettings.textSelection, 'Text Selection', 'CSS user-select: none / onselectstart'),
      copy: resolveStatus(rawDetected.copy, activeSettings.copy, 'Copy Interaction', 'JavaScript copy event preventDefault / oncopy'),
      paste: resolveStatus(rawDetected.paste, activeSettings.paste, 'Paste Interaction', 'JavaScript paste event preventDefault / onpaste'),
      rightClick: resolveStatus(rawDetected.rightClick, activeSettings.rightClick, 'Right-Click Menu', 'JavaScript contextmenu preventDefault / oncontextmenu')
    };

    const totalDetected = Object.values(items).filter(i => i.detected).length;
    const totalFixed = Object.values(items).filter(i => i.status === 'Fixed').length;
    const totalUnsupported = Object.values(items).filter(i => i.status === 'Unsupported').length;
    const totalUnknown = Object.values(items).filter(i => i.status === 'Unknown').length;

    let summaryStatus = 'Clear';
    let summaryText = 'No restrictions detected';

    if (totalUnsupported > 0) {
      summaryStatus = 'Unsupported';
      summaryText = flutterArch.isCanvasRendered
        ? 'Canvas-rendered text detected (Unsupported by native DOM selection)'
        : 'Unsupported protected browser surface';
    } else if (totalUnknown > 0) {
      summaryStatus = 'Unknown';
      summaryText = 'Diagnostic verification inconclusive';
    } else if (totalDetected === 0) {
      summaryStatus = 'Clear';
      summaryText = 'Standard unrestricted page';
    } else if (totalFixed === totalDetected && totalDetected > 0) {
      summaryStatus = 'All Neutralized';
      summaryText = `${totalDetected} restriction${totalDetected === 1 ? '' : 's'} neutralized & verified`;
    } else {
      summaryStatus = 'Restrictions Active';
      const unhandled = totalDetected - totalFixed;
      const hasAttempted = Object.values(items).some(i => i.detail && i.detail.includes('Fix attempted'));
      summaryText = hasAttempted
        ? `${totalDetected} restriction${totalDetected === 1 ? '' : 's'} detected • Fix Attempted (Unverified)`
        : `${unhandled} active restriction${unhandled === 1 ? '' : 's'}`;
    }

    return {
      // Legacy boolean flags for backwards compatibility
      textSelection: rawDetected.textSelection,
      copy: rawDetected.copy,
      paste: rawDetected.paste,
      rightClick: rawDetected.rightClick,
      // Rich v1.1 Smart Scan Report
      items: items,
      summary: {
        totalDetected: totalDetected,
        totalFixed: totalFixed,
        totalUnsupported: totalUnsupported,
        status: summaryStatus,
        text: summaryText,
        timestamp: Date.now()
      }
    };
  }

  // Message listener from popup and background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
      sendResponse({ pong: true, version: '1.0.0' });
      return false;
    }

    if (request.action === 'GET_STATUS') {
      loadSettings((settings) => {
        const diagnostics = scanRestrictions();
        sendResponse({
          hostname: currentHost,
          isExcluded: isExcluded,
          settings: settings,
          diagnostics: diagnostics
        });
      });
      return true; // Keep channel open for async response
    }

    if (request.action === 'UPDATE_SETTINGS') {
      activeSettings = { ...activeSettings, ...request.settings };
      applySettings();
      sendResponse({ success: true, settings: activeSettings });
      return false;
    }

    if (request.action === 'SCAN_RESTRICTIONS') {
      const diagnostics = scanRestrictions();
      sendResponse({ diagnostics: diagnostics });
      return false;
    }
  });

  // Storage change listener
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      loadSettings();
    }
  });

  // Initialize
  attachListeners();
  loadSettings();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applySettings();
      cleanInlineHandlers();
      clearInlineUserSelect();
      startObserver();
    });
  } else {
    applySettings();
    cleanInlineHandlers();
    clearInlineUserSelect();
    startObserver();
  }
})();
