# CopyPaste Freedom (v1.1)

> **"Your browser. Your rules."**  
> A premium, developer-grade Chrome extension (Manifest V3) that restores normal text selection, copy, paste, cut, and right-click context menus on websites that unnecessarily restrict them.

---

## What's New in v1.1.0

- 📊 **Smart Scan Report**:
  - Detailed live inspection classifying interactions as `Fixed` (neon green), `Detected` (amber), `Unsupported` (muted red), or `Clear` (grey).
  - High-visibility compact summary banner providing quick page status at a glance.
  - Expandable **Diagnostic Breakdown Accordion** detailing exact CSS selectors, event listeners, and neutralized vectors.
- 🕒 **Website Scan History**:
  - Dedicated audit log tab in the Options dashboard recording scanned website hostnames, timestamp, and restriction results.
  - Real-time search and filter across scanned domains and restriction types.
  - One-click "Clear History" and single-domain removal.
  - **Zero Private Data**: Only hostnames and restriction tags are retained; copied/pasted text and URL parameters are never stored.
- 🎛️ **Independent Feature Controls**:
  - Granular control over **Text Selection**, **Copy (Ctrl+C)**, **Paste (Ctrl+V)**, **Cut (Ctrl+X)**, and **Right-Click**.
  - Dynamic count badge displaying active sub-features in real time.
- 💎 **Refined UI & Theme**:
  - Enhanced black/charcoal surfaces, subtle neon green (`#B7FF00`) glows on active states, responsive layout, and smooth micro-animations.

---

## Overview

Modern web applications occasionally restrict basic browser interactions — disabling text highlighting, preventing <kbd>Ctrl+C</kbd> or <kbd>Ctrl+V</kbd>, or intercepting the native right-click menu. **CopyPaste Freedom** safely neutralizes these restrictions at the DOM level using capture-phase event guards and carefully scoped CSS overrides, without breaking buttons, navigation, or form controls.

---

## Key Features

- **Master Freedom Mode**: Instant site-wide toggle to activate or deactivate all interaction restorations.
- **Individual Controls**: Fine-grained toggles for:
  - **Enable Text Selection**: Neutralizes `user-select: none`, `-webkit-user-select: none`, and `selectstart` blockers.
  - **Enable Copy (Ctrl + C)**: Intercepts `copy` event cancellation and restores standard clipboard copying.
  - **Enable Paste (Ctrl + V)**: Unblocks pasting into text inputs, textareas, and contenteditable elements.
  - **Enable Cut (Ctrl + X)**: Enables cutting inside editable fields.
  - **Enable Right-Click Menu**: Stops `contextmenu` suppression and restores the native browser menu.
- **Smart Website Scan**: Live diagnostic analyzer detecting active CSS and JavaScript restriction patterns.
- **Per-Domain Settings**: Remembers your preferred configuration independently for each domain.
- **Global Defaults & Exceptions**: Dedicated Options page to configure baseline settings and whitelist/blacklist domains.
- **SPA & Dynamic DOM Support**: Intelligent, throttled `MutationObserver` unblocks dynamic content without performance degradation or infinite loops.
- **100% Local & Privacy-Preserving**: Operates entirely within your browser. Zero telemetry, zero external network requests, zero logging of clipboard contents.

---

## Design System

Designed with a high-end developer-tool aesthetic:
- **Primary Background**: Deep Black (`#080A0A`)
- **Secondary Background**: Charcoal (`#111414`)
- **Accent Highlight**: Neon Green (`#B7FF00`)
- **Glow Highlight**: Secondary Neon (`#8DFF3F`)
- **Typography**: Inter / Modern Sans-Serif
- **Borders & Cards**: Subtle semi-transparent borders with smooth hover transitions

---

## Project Structure

```
copy_paste/
├── manifest.json        # Chrome Extension Manifest V3 configuration
├── popup.html           # Extension toolbar popup interface
├── popup.css            # Dark/neon developer theme styling
├── popup.js             # Popup controller, real-time scanning & toggles
├── background.js        # Service worker managing defaults & tab badges
├── content.js           # Content script with capture-phase event engine
├── content.css          # Scoped CSS overrides for text selection
├── options.html         # Full-page dashboard for settings & domain rules
├── options.css          # Styling for options dashboard
├── options.js           # Controller for defaults, domain rules & factory reset
├── test.html            # Complete interactive local test lab
├── .gitignore           # Git ignore rules for clean repository state
├── icons/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
├── tests/               # Automated regression & verification test suite
│   └── full_extension_test.js
└── README.md            # Project documentation
```

---

## Technology Stack

- **Platform**: Google Chrome Extension Platform (Manifest V3)
- **Runtime Environment**: Chromium Blink Engine
- **Languages**: Modern Vanilla JavaScript (ES6+), HTML5, CSS3
- **APIs**: Chrome Storage API (`chrome.storage.local`), Chrome Scripting & Tabs API, MutationObserver, DOM Event Capture Architecture
- **Theme**: Premium Minimal Dark / Developer Aesthetic (Jet Black `#080A0A`, Charcoal `#111414`, Neon Green `#B7FF00`)
- **Testing**: Node.js Automated Verification Engine (122 functional & unit tests)

---

## Automated Verification & Testing

CopyPaste Freedom includes a comprehensive 13-suite automated test bench covering all interaction restores, MV3 conformance, icon dimensions, privacy guarantees, storage isolation, and Flutter Web architecture classification:

```bash
# Run the complete test suite (122 tests)
node tests/full_extension_test.js
```

### Test Suites Included:
1. Files & Manifest V3 Verification (15 tests)
2. Icon Image Verification (9 tests)
3. Code Syntax & Runtime Functionality (4 tests)
4. Functional Event Engine & Freedom Mode Mechanics (12 tests)
5. Storage & Domain Settings Resolution (4 tests)
6. Scoped CSS Overrides Audit (4 tests)
7. Smart Scan Report Diagnostic Structure (6 tests)
8. Website Scan History & Privacy Guarantee (11 tests)
9. Independent Feature Activation Verification (4 tests)
10. Flutter Web Compatibility & Smart Scan Truthfulness (7 tests)
11. False-Positive "Fixed" Prevention & Taxonomy Audit (11 tests)
12. Native Drag, Selectstart & Non-Interference Verification (12 tests)
13. WorkScribe & Shadow DOM Traversal Verification (8 tests)

---

## How to Install in Google Chrome

1. Open **Google Chrome**.
2. Navigate to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the project folder:
   ```
   D:\Copy_paste_project
   ```
6. The extension **CopyPaste Freedom** will now appear in your extensions list.
7. Click the **Extensions** icon (puzzle piece) in the Chrome toolbar and pin **CopyPaste Freedom** for quick access.

> **Note for Local File Testing (`file:///`)**:  
> To test on local files such as `test.html`, click **Details** on the CopyPaste Freedom extension card inside `chrome://extensions`, and enable **"Allow access to file URLs"**.

---

## How to Test Using the Included Test Lab

1. Open `test.html` in Chrome:
   - Either double-click `D:\Copy_paste_project\test.html`, or
   - Enter `file:///D:/Copy_paste_project/test.html` in the address bar, or
   - Click **"Test Lab"** at the bottom of the extension popup.
2. The Test Lab contains 8 interactive testing zones:
   - **Zone 1 (Text Selection)**: Try dragging to select text. When Freedom Mode is OFF, selection is impossible. When Freedom Mode is ON, text highlights with a neon green accent.
   - **Zone 2 (Copy)**: Try copying the secret token with <kbd>Ctrl+C</kbd>. When Freedom Mode is ON, copying succeeds.
   - **Zone 3 (Paste)**: Try pasting text into the protected input and textarea with <kbd>Ctrl+V</kbd>.
   - **Zone 4 (Cut)**: Try cutting text with <kbd>Ctrl+X</kbd>.
   - **Zone 5 (Right-Click)**: Right-click inside the box. When Freedom Mode is ON, the real Chrome context menu appears instead of a block notice.
   - **Zone 6 (SPA Dynamic Content)**: Click "+ Inject New Restricted Element" to test dynamic DOM unblocking.
   - **Zone 7 (Clipboard Verifier)**: Paste into the verification input to confirm clipboard contents.
   - **Zone 8 (Normal Controls)**: Verifies that buttons, navigation, and checkboxes continue to operate without interference.
   - **Zone 9 (Flutter Web Compatibility Diagnostic)**:
     - **9A (DOM-based Flutter Web)**: Verifies that `<flutter-view>` with genuine DOM text (`<flt-paragraph>`) is selectable and copyable when Freedom Mode is ON.
     - **9B (CanvasKit / WorkScribe Architecture)**: Demonstrates that `<flutter-view>` with canvas-rendered text (raster bitmap without DOM text nodes) is accurately detected and classified as **Unsupported**, preventing false "All Neutralized" reports.
3. Open the **CopyPaste Freedom** popup:
   - Notice the **WEBSITE SCAN** diagnostics detecting restrictions.
   - Toggle individual features or the master **FREEDOM MODE** switch to see real-time updates.

---

## Safety & Compatibility Boundaries

CopyPaste Freedom is strictly built to restore normal user interactions on standard web pages. It intentionally complies with security and legal boundaries:
- **DRM Protections**: Does not circumvent Widevine, FairPlay, or DRM video streams.
- **Paywalls & Authentication**: Does not bypass paid paywalls, user logins, or session tokens.
- **Sensitive Inputs**: Respects native browser password protections and OS security sandboxes.
- **Zero Telemetry & Local Storage**: All data and settings are stored locally via `chrome.storage.local`. Clipboard text is never stored or transmitted.

### Architectural Limitations: CanvasKit & WebGL Pixel Rendering
- **DOM-Based Web Pages**: On standard web pages, SPAs, and DOM-based Flutter Web (HTML renderer), CopyPaste Freedom successfully neutralizes CSS blockers and event cancellations, restoring native mouse-drag text selection and keyboard shortcuts.
- **CanvasKit / Skia Pixel Applications (e.g., WorkScribe)**: On applications where document content is rendered as rasterized 2D/WebGL pixels directly onto an HTML5 `<canvas>` with zero underlying DOM text nodes, native browser DOM text selection (`window.getSelection()`) cannot highlight canvas pixels. For these surfaces, CopyPaste Freedom's Smart Scan truthfully reports **`Unsupported`** rather than claiming a false fix. Clipboard paste/copy passthrough remains fully enabled for any application-provided selection or export controls.
