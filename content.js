// Plex Toolkit - Content Script
// Combines PIP functionality and Auto Skip features

// ========================================
// Storage Keys and Default Settings
// ========================================
const STORAGE_KEYS = {
  ENABLE_PIP: 'enablePIP',
  ENABLE_SKIP_INTRO: 'enableSkipIntro',
  ENABLE_SKIP_CREDITS: 'enableSkipCredits',
  ENABLE_PLAY_NEXT: 'enablePlayNext',
  DELAY_SKIP_INTRO: 'delaySkipIntro',
  DELAY_SKIP_CREDITS: 'delaySkipCredits',
  DELAY_PLAY_NEXT: 'delayPlayNext',
  CUSTOM_SKIP_BACK: 'customSkipBack',
  CUSTOM_SKIP_FORWARD: 'customSkipForward',
  ENABLE_CUSTOM_SKIP: 'enableCustomSkip'
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.ENABLE_PIP]: true,
  [STORAGE_KEYS.ENABLE_SKIP_INTRO]: true,
  [STORAGE_KEYS.ENABLE_SKIP_CREDITS]: true,
  [STORAGE_KEYS.ENABLE_PLAY_NEXT]: true,
  [STORAGE_KEYS.DELAY_SKIP_INTRO]: 0,
  [STORAGE_KEYS.DELAY_SKIP_CREDITS]: 0,
  [STORAGE_KEYS.DELAY_PLAY_NEXT]: 0,
  [STORAGE_KEYS.CUSTOM_SKIP_BACK]: 15,
  [STORAGE_KEYS.CUSTOM_SKIP_FORWARD]: 15,
  [STORAGE_KEYS.ENABLE_CUSTOM_SKIP]: false
};

// Plex's original SVG path data for numbers (extracted from skip buttons)
// These are the exact vector graphics Plex uses
const PLEX_NUMBER_PATHS = {
  '0': 'M16 28C14.3431 28 13 29.3431 13 31V41C13 42.6569 14.3431 44 16 44H20C21.6569 44 23 42.6569 23 41V31C23 29.3431 21.6569 28 20 28H16ZM20 31H16V41H20V31Z',
  '1': 'M3 28V31H6V44H9V28H3Z',
  '3': 'M24 31H28V34.5H24V37.5H28V41H24V40H21V41C21 42.6569 22.3431 44 24 44H28C29.6569 44 31 42.6569 31 41V31C31 29.3431 29.6569 28 28 28H24C22.3431 28 21 29.3431 21 31V32H24V31Z'
};

// ========================================
// Global State
// ========================================
let settings = { ...DEFAULT_SETTINGS };
let pipButtonAdded = false;
let lastSkipButtonClicked = null; // Track the last button we clicked to avoid repeated clicks
let skipButtonVisible = false; // Track if skip button is currently visible
let playNextScheduled = false; // Track if we have a pending click scheduled
let playNextClickedSuccessfully = false; // Track if we successfully clicked the play next button
let skipButtonClickHandler = null; // Store reference to skip button click handler
let lastCustomSkipTime = null; // Track the last time we performed a custom skip
let skipDebounceTimer = null; // Debounce timer for skip operations
let videoSeekingHandler = null; // Handler for video seeking events
let expectedSeekTime = null; // The time we expect after a custom skip

// ========================================
// Utility Functions
// ========================================

/**
 * Get element by XPath
 */
function getElementByXpath(path) {
  return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

/**
 * Load settings from Chrome storage
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (result) => {
      settings = result;
      resolve(settings);
    });
  });
}

/**
 * Check if button is in viewport and visible
 * For skipButtons, we check opacity. For playNext, we're more lenient.
 */
function isElementVisible(element, skipOpacityCheck = false) {
  if (!element) return false;
  const style = window.getComputedStyle(element);

  // Skip opacity check for certain elements (like play next button that starts hidden)
  if (skipOpacityCheck) {
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

// ========================================
// PIP Functionality
// ========================================

/**
 * Add PIP button to Plex player controls
 */
function addPIPButton() {
  if (!settings[STORAGE_KEYS.ENABLE_PIP]) return;

  // Check if PIP button already exists
  const existingButton = document.querySelector('.plex-toolkit-pip-button');
  if (existingButton) {
    pipButtonAdded = true;
    return;
  }

  // If we thought we added it but it's not there, reset the flag
  if (pipButtonAdded && !existingButton) {
    pipButtonAdded = false;
  }

  // Find an existing button to clone styles from
  const otherButton = document.querySelector('[data-testid="closeButton"]');
  if (!otherButton) return;

  const buttonContainer = otherButton.parentElement;
  if (!buttonContainer) return;

  // Create PIP button
  const pipButton = document.createElement('button');
  pipButton.className = 'plex-toolkit-pip-button ' + otherButton.className;
  pipButton.setAttribute('aria-label', 'Picture in Picture');
  pipButton.setAttribute('data-tooltip', 'Picture in Picture');

  pipButton.innerHTML = `
    <svg fill="currentColor" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="pointer-events: none;">
      <path d="M418.5,139.4H232.4v139.8h186.1V139.4z M464.8,46.7H46.3C20.5,46.7,0,68.1,0,93.1v325.9
        c0,25.8,21.4,46.3,46.3,46.3h419.4c25.8,0,46.3-20.5,46.3-46.3V93.1C512,67.2,490.6,46.7,464.8,46.7z M464.8,418.9H46.3V92.2h419.4
        v326.8H464.8z"/>
    </svg>
  `;

  // Add click handler
  pipButton.onclick = togglePIP;

  // Add hover effects
  pipButton.addEventListener('mouseenter', () => {
    showTooltip(pipButton);
  });

  pipButton.addEventListener('mouseleave', () => {
    hideTooltip();
  });

  // Inject custom styles if not already present
  injectPIPStyles();

  buttonContainer.appendChild(pipButton);
  pipButtonAdded = true;

  // Monitor PIP state to update button appearance
  document.addEventListener('enterpictureinpicture', updatePIPButtonState);
  document.addEventListener('leavepictureinpicture', updatePIPButtonState);

  console.log('[Plex Toolkit] PIP button added');
}

/**
 * Inject custom styles for PIP button and tooltip
 */
function injectPIPStyles() {
  if (document.getElementById('plex-toolkit-styles')) return;

  const style = document.createElement('style');
  style.id = 'plex-toolkit-styles';
  style.textContent = `
    .plex-toolkit-pip-button {
      position: relative;
      transition: all 0.2s ease !important;
    }

    .plex-toolkit-pip-button:hover {
      transform: scale(1.1) !important;
    }

    .plex-toolkit-pip-button:active {
      transform: scale(0.95) !important;
    }

    .plex-toolkit-pip-button.pip-active {
      color: #e5a00d !important;
      animation: pipPulse 2s ease-in-out infinite;
    }

    @keyframes pipPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .plex-toolkit-tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      pointer-events: none;
      z-index: 10000;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(-5px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .plex-toolkit-tooltip.show {
      opacity: 1;
      transform: translateY(0);
    }

    .plex-toolkit-tooltip::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 5px solid rgba(0, 0, 0, 0.9);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Show tooltip for PIP button
 */
function showTooltip(button) {
  hideTooltip(); // Remove any existing tooltip

  const tooltip = document.createElement('div');
  tooltip.className = 'plex-toolkit-tooltip';
  tooltip.id = 'plex-toolkit-tooltip';

  const isActive = document.pictureInPictureElement !== null;
  tooltip.textContent = isActive ? 'Exit Picture in Picture' : 'Picture in Picture';

  document.body.appendChild(tooltip);

  // Position tooltip ABOVE the button
  const buttonRect = button.getBoundingClientRect();
  const tooltipHeight = tooltip.offsetHeight || 36; // Approximate height

  tooltip.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
  tooltip.style.top = `${buttonRect.top - tooltipHeight - 10}px`;
  tooltip.style.transform = 'translateX(-50%)';

  // Show with animation
  requestAnimationFrame(() => {
    tooltip.classList.add('show');
  });
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  const tooltip = document.getElementById('plex-toolkit-tooltip');
  if (tooltip) {
    tooltip.classList.remove('show');
    setTimeout(() => tooltip.remove(), 200);
  }
}

/**
 * Update PIP button appearance based on PIP state
 */
function updatePIPButtonState() {
  const pipButton = document.querySelector('.plex-toolkit-pip-button');
  if (!pipButton) return;

  if (document.pictureInPictureElement) {
    pipButton.classList.add('pip-active');
    pipButton.setAttribute('data-tooltip', 'Exit Picture in Picture');
  } else {
    pipButton.classList.remove('pip-active');
    pipButton.setAttribute('data-tooltip', 'Picture in Picture');
  }
}

/**
 * Toggle Picture-in-Picture mode
 */
function togglePIP() {
  // Find the video element - there's typically only one playing video on the page
  const videoElement = document.querySelector('video');

  if (!videoElement) {
    console.warn('[Plex Toolkit] Unable to locate video element');
    return;
  }

  // Verify the video is actually playing/loaded
  if (videoElement.readyState < 2) {
    console.warn('[Plex Toolkit] Video not ready for PIP');
    return;
  }

  if (document.pictureInPictureElement) {
    document.exitPictureInPicture()
      .then(() => console.log('[Plex Toolkit] Exited PIP mode'))
      .catch(err => console.error('[Plex Toolkit] Error exiting PIP:', err));
  } else {
    if (document.pictureInPictureEnabled) {
      videoElement.requestPictureInPicture()
        .then(() => console.log('[Plex Toolkit] Entered PIP mode'))
        .catch(err => console.error('[Plex Toolkit] Error entering PIP:', err));
    }
  }
}

// ========================================
// Auto Skip Functionality
// ========================================

/**
 * Detect if we're at intro or credits based on progress
 */
function detectSkipType() {
  const progressSlider = document.querySelector("[class*=Slider-thumb-]:not([aria-labelledby])");
  if (!progressSlider) return null;

  const currentValue = parseInt(progressSlider.getAttribute('aria-valuenow') || '0', 10);
  const maxValue = parseInt(progressSlider.getAttribute('aria-valuemax') || '1', 10);
  const progressPercent = (currentValue / maxValue) * 100;

  // If we're in the first 50% of the video, it's likely intro
  // If we're past 50%, it's likely credits
  return progressPercent < 50 ? 'intro' : 'credits';
}

/**
 * Simulate a proper click on the skip button with mouse events
 * This mimics a real user click more accurately
 */
function simulateClick(element) {
  const events = ['mousedown', 'mouseup', 'click'];
  events.forEach(eventType => {
    const event = new MouseEvent(eventType, {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1
    });
    element.dispatchEvent(event);
  });
}

/**
 * Click the skip button with optional delay
 */
function clickSkipButton(button, delay = 0) {
  setTimeout(() => {
    if (!button || !isElementVisible(button)) {
      console.log('[Plex Toolkit] Skip button no longer visible, aborting click');
      return;
    }

    // Focus the button if it's not already focused
    if (!button.classList.contains('isFocused')) {
      button.focus();
    }

    // Use simulated click for better compatibility
    simulateClick(button);

    // Mark this button as clicked
    lastSkipButtonClicked = button;

    console.log('[Plex Toolkit] Skip button clicked successfully');
  }, delay);
}

/**
 * Check and handle skip buttons (intro/credits)
 */
function handleSkipButtons() {
  const skipButton = document.querySelector("[class*=AudioVideoFullPlayer-overlayButton]");

  // If no skip button is visible, reset our tracking
  if (!skipButton || !isElementVisible(skipButton)) {
    if (skipButtonVisible) {
      console.log('[Plex Toolkit] Skip button disappeared, resetting tracking');
      skipButtonVisible = false;
      lastSkipButtonClicked = null;
    }
    return;
  }

  // Skip button is visible
  if (!skipButtonVisible) {
    console.log('[Plex Toolkit] Skip button appeared');
    skipButtonVisible = true;
  }

  // If we've already clicked this button, don't click again
  if (lastSkipButtonClicked === skipButton) {
    return;
  }

  const skipType = detectSkipType();
  console.log(`[Plex Toolkit] Skip type detected: ${skipType}`);

  if (skipType === 'intro' && settings[STORAGE_KEYS.ENABLE_SKIP_INTRO]) {
    const delay = settings[STORAGE_KEYS.DELAY_SKIP_INTRO] || 0;
    console.log(`[Plex Toolkit] Scheduling intro skip with ${delay}ms delay`);
    clickSkipButton(skipButton, delay);
  } else if (skipType === 'credits' && settings[STORAGE_KEYS.ENABLE_SKIP_CREDITS]) {
    const delay = settings[STORAGE_KEYS.DELAY_SKIP_CREDITS] || 0;
    console.log(`[Plex Toolkit] Scheduling credit skip with ${delay}ms delay`);
    clickSkipButton(skipButton, delay);
  }
}

// ========================================
// Auto-Play Next Episode Functionality
// ========================================

/**
 * Handle auto-play next episode
 * Automatically clicks the "Play Next" button when episode ends
 */
function handleAutoPlayNext() {
  if (!settings[STORAGE_KEYS.ENABLE_PLAY_NEXT]) return;

  // Check if Plex's built-in autoplay is enabled
  const autoPlayCheck = document.getElementById('autoPlayCheck');
  if (!autoPlayCheck || !autoPlayCheck.checked) {
    return; // Plex's autoplay is disabled, respect that
  }

  // Look for the "Play Next" button using class selector (language-agnostic)
  const playNextButton = document.querySelector("[class*=AudioVideoUpNext-playButton]");

  // If no play next button is found, reset tracking for next time
  if (!playNextButton) {
    // Only reset if we previously had a successful click - this allows for new episodes
    if (playNextClickedSuccessfully) {
      console.log('[Plex Toolkit] Play Next button gone, resetting for next episode');
      playNextScheduled = false;
      playNextClickedSuccessfully = false;
    }
    return;
  }

  // If we already successfully clicked, don't try again
  if (playNextClickedSuccessfully) {
    return;
  }

  // Check if button is actually visible (skip opacity check since Plex animates it)
  const isVisible = isElementVisible(playNextButton, true);

  if (!isVisible) {
    // Button exists but isn't visible yet (display:none or visibility:hidden)
    return;
  }

  // Button is visible now (even if opacity is 0)
  // If we already have a click scheduled, don't schedule another
  if (playNextScheduled) {
    return;
  }

  // Schedule the click
  playNextScheduled = true;
  const delay = settings[STORAGE_KEYS.DELAY_PLAY_NEXT] || 0;
  console.log(`[Plex Toolkit] Play Next button detected, scheduling click with ${delay}ms delay`);

  setTimeout(() => {
    // Re-query for the button (don't use stale reference)
    const currentButton = document.querySelector("[class*=AudioVideoUpNext-playButton]");

    // For the actual click, we also skip opacity check
    if (!currentButton || !isElementVisible(currentButton, true)) {
      console.log('[Plex Toolkit] Play Next button no longer available when timeout fired, will retry');
      // Reset scheduled flag so we can try again when it reappears
      playNextScheduled = false;
      return;
    }

    // Focus and click the button (even if opacity is 0, the click will work)
    currentButton.focus();
    simulateClick(currentButton);

    // Mark as successfully clicked
    playNextClickedSuccessfully = true;

    console.log('[Plex Toolkit] Play Next button clicked successfully');
  }, delay);
}

// ========================================
// Custom Skip Forward/Backward Functionality
// ========================================

/**
 * Update the visual labels on skip buttons to show custom values
 */
function updateSkipButtonVisuals() {
  const skipBackButton = document.querySelector('[data-testid="skipBackButton"]');
  const skipForwardButton = document.querySelector('[data-testid="skipForwardButton"]');

  if (!skipBackButton || !skipForwardButton) return;

  // If custom skip is disabled, restore original Plex visuals
  if (!settings[STORAGE_KEYS.ENABLE_CUSTOM_SKIP]) {
    const backSvg = skipBackButton.querySelector('svg');
    const forwardSvg = skipForwardButton.querySelector('svg');

    // Restore original number paths
    if (backSvg) {
      const paths = backSvg.querySelectorAll('path');
      paths.forEach(path => {
        path.style.opacity = '';
      });
      // Remove our custom text
      const customText = skipBackButton.querySelector('.plex-toolkit-skip-label');
      if (customText) customText.remove();
    }

    if (forwardSvg) {
      const paths = forwardSvg.querySelectorAll('path');
      paths.forEach(path => {
        path.style.opacity = '';
      });
      // Remove our custom text
      const customText = skipForwardButton.querySelector('.plex-toolkit-skip-label');
      if (customText) customText.remove();
    }

    return;
  }

  const customBackValue = settings[STORAGE_KEYS.CUSTOM_SKIP_BACK] || 10;
  const customForwardValue = settings[STORAGE_KEYS.CUSTOM_SKIP_FORWARD] || 30;

  // Update aria labels and titles
  skipBackButton.setAttribute('aria-label', `Skip Back ${customBackValue} Seconds`);
  skipBackButton.setAttribute('title', `Skip Back ${customBackValue} Seconds`);
  skipForwardButton.setAttribute('aria-label', `Skip Forward ${customForwardValue} Seconds`);
  skipForwardButton.setAttribute('title', `Skip Forward ${customForwardValue} Seconds`);

  // Hide Plex's original number paths (the "10" and "30" SVG paths)
  const backSvg = skipBackButton.querySelector('svg');
  const forwardSvg = skipForwardButton.querySelector('svg');

  if (backSvg) {
    // Prevent text clipping with CSS overflow
    if (!backSvg.hasAttribute('data-plex-toolkit-adjusted')) {
      backSvg.style.overflow = 'visible';
      backSvg.setAttribute('data-plex-toolkit-adjusted', 'true');
    }

    // Hide all path elements that represent the numbers
    // Keep only the arrow/icon paths visible
    const paths = backSvg.querySelectorAll('path');
    paths.forEach((path, index) => {
      // The first path is usually the arrow, skip it
      // Subsequent paths are the number digits
      if (index > 0) {
        path.style.opacity = '0';
      }
    });

    // Add or update our custom text
    if (!skipBackButton.querySelector('.plex-toolkit-skip-label')) {
      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.classList.add('plex-toolkit-skip-label');
      textElement.setAttribute('x', '25');
      textElement.setAttribute('y', '44');
      textElement.setAttribute('text-anchor', 'end');
      textElement.setAttribute('fill', 'currentColor');
      textElement.setAttribute('font-size', '22');
      textElement.setAttribute('font-weight', '700');
      textElement.setAttribute('letter-spacing', '0');
      textElement.setAttribute('font-variant-numeric', 'tabular-nums');
      textElement.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif');
      textElement.style.paintOrder = 'stroke';
      textElement.style.strokeLinejoin = 'round';

      // For single-digit values, add invisible leading zero for spacing
      if (customBackValue < 10) {
        const invisibleZero = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        invisibleZero.setAttribute('opacity', '0');
        invisibleZero.textContent = '0';
        textElement.appendChild(invisibleZero);

        const visibleDigit = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        visibleDigit.textContent = customBackValue;
        textElement.appendChild(visibleDigit);
      } else {
        textElement.textContent = customBackValue;
      }

      backSvg.appendChild(textElement);
    } else {
      const textElement = skipBackButton.querySelector('.plex-toolkit-skip-label');
      // Clear existing content
      textElement.innerHTML = '';

      // For single-digit values, add invisible leading zero for spacing
      if (customBackValue < 10) {
        const invisibleZero = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        invisibleZero.setAttribute('opacity', '0');
        invisibleZero.textContent = '0';
        textElement.appendChild(invisibleZero);

        const visibleDigit = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        visibleDigit.textContent = customBackValue;
        textElement.appendChild(visibleDigit);
      } else {
        textElement.textContent = customBackValue;
      }
    }
  }

  if (forwardSvg) {
    // Prevent text clipping with CSS overflow
    if (!forwardSvg.hasAttribute('data-plex-toolkit-adjusted')) {
      forwardSvg.style.overflow = 'visible';
      forwardSvg.setAttribute('data-plex-toolkit-adjusted', 'true');
    }

    // Hide all path elements that represent the numbers
    const paths = forwardSvg.querySelectorAll('path');
    paths.forEach((path, index) => {
      // The first path is usually the arrow, skip it
      if (index > 0) {
        path.style.opacity = '0';
      }
    });

    // Add or update our custom text
    if (!skipForwardButton.querySelector('.plex-toolkit-skip-label')) {
      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.classList.add('plex-toolkit-skip-label');
      textElement.setAttribute('x', '45');
      textElement.setAttribute('y', '44');
      textElement.setAttribute('text-anchor', 'end');
      textElement.setAttribute('fill', 'currentColor');
      textElement.setAttribute('font-size', '22');
      textElement.setAttribute('font-weight', '700');
      textElement.setAttribute('letter-spacing', '0');
      textElement.setAttribute('font-variant-numeric', 'tabular-nums');
      textElement.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif');
      textElement.style.paintOrder = 'stroke';
      textElement.style.strokeLinejoin = 'round';

      // For single-digit values, add invisible leading zero for spacing
      if (customForwardValue < 10) {
        const invisibleZero = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        invisibleZero.setAttribute('opacity', '0');
        invisibleZero.textContent = '0';
        textElement.appendChild(invisibleZero);

        const visibleDigit = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        visibleDigit.textContent = customForwardValue;
        textElement.appendChild(visibleDigit);
      } else {
        textElement.textContent = customForwardValue;
      }

      forwardSvg.appendChild(textElement);
    } else {
      const textElement = skipForwardButton.querySelector('.plex-toolkit-skip-label');
      // Clear existing content
      textElement.innerHTML = '';

      // For single-digit values, add invisible leading zero for spacing
      if (customForwardValue < 10) {
        const invisibleZero = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        invisibleZero.setAttribute('opacity', '0');
        invisibleZero.textContent = '0';
        textElement.appendChild(invisibleZero);

        const visibleDigit = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        visibleDigit.textContent = customForwardValue;
        textElement.appendChild(visibleDigit);
      } else {
        textElement.textContent = customForwardValue;
      }
    }
  }
}

/**
 * Setup video seeking handler to correct unwanted seeks from Plex
 * Uses property descriptor override to intercept ALL currentTime assignments
 */
function setupVideoSeekingHandler() {
  const videoElement = document.querySelector('video');
  if (!videoElement) return;

  if (!videoSeekingHandler && settings[STORAGE_KEYS.ENABLE_CUSTOM_SKIP]) {
    // Get the original currentTime property descriptor
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');

    if (!originalDescriptor || videoElement._plexToolkitOverridden) return;

    // Mark as overridden
    videoElement._plexToolkitOverridden = true;

    // Override the currentTime setter
    Object.defineProperty(videoElement, 'currentTime', {
      get: function() {
        return originalDescriptor.get.call(this);
      },
      set: function(value) {
        // If we're expecting a specific seek time and this isn't it, redirect to our expected time
        if (expectedSeekTime !== null) {
          const currentTime = originalDescriptor.get.call(this);

          // Check if this is Plex trying to set a wrong time
          if (Math.abs(value - expectedSeekTime) > 2 && Math.abs(currentTime - expectedSeekTime) < 10) {
            console.log(`[Plex Toolkit] Intercepting unwanted seek: ${value.toFixed(1)}s → ${expectedSeekTime.toFixed(1)}s`);
            value = expectedSeekTime;
          }

          // Clear expected time after a short delay
          setTimeout(() => {
            expectedSeekTime = null;
          }, 500);
        }

        originalDescriptor.set.call(this, value);
      },
      configurable: true
    });

    videoSeekingHandler = true; // Mark as installed
    console.log('[Plex Toolkit] Video currentTime property interceptor installed');
  }
}

/**
 * Handle custom skip button clicks at the document level
 * This intercepts clicks before they reach the button's handlers
 */
function setupCustomSkipButtons() {
  if (!settings[STORAGE_KEYS.ENABLE_CUSTOM_SKIP]) {
    // Remove handler if custom skip is disabled
    if (skipButtonClickHandler) {
      document.removeEventListener('click', skipButtonClickHandler, true);
      skipButtonClickHandler = null;
      console.log('[Plex Toolkit] Custom skip buttons disabled');
    }
    if (videoSeekingHandler) {
      videoSeekingHandler = null;
      console.log('[Plex Toolkit] Video currentTime interceptor disabled');
    }
    return;
  }

  // Setup video seeking handler (call every tick to ensure it's installed)
  setupVideoSeekingHandler();

  // Only set up click handler once
  if (skipButtonClickHandler) return;

  console.log('[Plex Toolkit] Setting up custom skip buttons...');

  // Create click handler function
  skipButtonClickHandler = (e) => {
    // Check if click was on skip back button
    const skipBackButton = e.target.closest('[data-testid="skipBackButton"]');
    if (skipBackButton) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const videoElement = document.querySelector('video');
      if (videoElement) {
        const userValue = settings[STORAGE_KEYS.CUSTOM_SKIP_BACK] || 10;
        const PLEX_DEFAULT_BACK = 10;
        const currentTime = videoElement.currentTime;
        const desiredTime = Math.max(0, currentTime - userValue);

        /**
         * Skip Back Strategy:
         * Since Plex always subtracts 10s from the set currentTime value, we compensate
         * by adding the difference: offset = PLEX_DEFAULT_BACK - userValue
         *
         * Example: User wants 5s back from 37s
         * - Offset: 10 - 5 = +5s
         * - We set: 37 + 5 = 42s
         * - Plex subtracts: 42 - 10 = 32s (37 - 5) ✓
         *
         * Special case: When current time < 10s, Plex's behavior is different,
         * so we set the desired time directly without compensation.
         */
        if (currentTime < PLEX_DEFAULT_BACK) {
          expectedSeekTime = desiredTime;
          videoElement.currentTime = desiredTime;
          console.log(`[Plex Toolkit] Skip back ${userValue}s: ${currentTime.toFixed(1)}s → ${desiredTime.toFixed(1)}s`);
        } else {
          const compensatedOffset = PLEX_DEFAULT_BACK - userValue;
          const targetTime = Math.max(0, currentTime + compensatedOffset);
          expectedSeekTime = targetTime;
          videoElement.currentTime = targetTime;
          console.log(`[Plex Toolkit] Skip back ${userValue}s: ${currentTime.toFixed(1)}s → ~${desiredTime.toFixed(1)}s`);
        }
      }
      return;
    }

    // Check if click was on skip forward button
    const skipForwardButton = e.target.closest('[data-testid="skipForwardButton"]');
    if (skipForwardButton) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const videoElement = document.querySelector('video');
      if (videoElement) {
        const userValue = settings[STORAGE_KEYS.CUSTOM_SKIP_FORWARD] || 30;
        const PLEX_DEFAULT_FORWARD = 30;
        const currentTime = videoElement.currentTime;

        /**
         * Skip Forward Strategy:
         * Since Plex always adds 30s to the set currentTime value, we compensate
         * by subtracting the difference: offset = userValue - PLEX_DEFAULT_FORWARD
         *
         * Example: User wants 5s forward from 32s
         * - Offset: 5 - 30 = -25s
         * - We set: 32 + (-25) = 7s
         * - Plex adds: 7 + 30 = 37s (32 + 5) ✓
         */
        const compensatedOffset = userValue - PLEX_DEFAULT_FORWARD;
        const targetTime = Math.min(videoElement.duration, currentTime + compensatedOffset);
        const desiredTime = Math.min(videoElement.duration, currentTime + userValue);

        expectedSeekTime = targetTime;
        videoElement.currentTime = targetTime;

        console.log(`[Plex Toolkit] Skip forward ${userValue}s: ${currentTime.toFixed(1)}s → ~${desiredTime.toFixed(1)}s`);
      }
      return;
    }
  };

  // Add handler at document level in capture phase (runs before button handlers)
  document.addEventListener('click', skipButtonClickHandler, true);
  console.log('[Plex Toolkit] Custom skip buttons enabled (document-level capture)');
}

// ========================================
// Main Monitoring Loop
// ========================================

/**
 * Main tick function that runs periodically
 */
function tick() {
  // Check for PIP button (addPIPButton handles its own state checking)
  if (settings[STORAGE_KEYS.ENABLE_PIP]) {
    const bottomNav = getElementByXpath("//html/body/div[1]/div[4]");
    if (bottomNav && bottomNav.childNodes.length !== 0) {
      addPIPButton();
    }
  }

  // Check for skip buttons
  if (settings[STORAGE_KEYS.ENABLE_SKIP_INTRO] || settings[STORAGE_KEYS.ENABLE_SKIP_CREDITS]) {
    handleSkipButtons();
  }

  // Check for auto-play next episode
  if (settings[STORAGE_KEYS.ENABLE_PLAY_NEXT]) {
    handleAutoPlayNext();
  }

  // Setup custom skip forward/backward buttons
  setupCustomSkipButtons();

  // Update skip button visuals (shows custom values or restores Plex defaults)
  updateSkipButtonVisuals();

  // Schedule next tick
  setTimeout(tick, 250);
}

// ========================================
// Initialization
// ========================================

/**
 * Initialize the extension
 */
async function init() {
  console.log('[Plex Toolkit] Initializing...');

  // Load settings
  await loadSettings();
  console.log('[Plex Toolkit] Settings loaded:', settings);

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      for (let key in changes) {
        settings[key] = changes[key].newValue;
        console.log(`[Plex Toolkit] Setting updated: ${key} = ${changes[key].newValue}`);

        // If PIP is disabled, remove the button
        if (key === STORAGE_KEYS.ENABLE_PIP && !changes[key].newValue) {
          const pipButton = document.querySelector('.plex-toolkit-pip-button');
          if (pipButton) {
            pipButton.remove();
            pipButtonAdded = false;
          }
        }
      }
    }
  });

  // Start monitoring
  tick();
}

// Start the extension when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
