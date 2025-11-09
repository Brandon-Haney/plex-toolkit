// Plex Toolkit - Popup Script (Redesigned)

// ========================================
// Constants
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

// ========================================
// DOM Elements
// ========================================

const elements = {
  // Toggles
  enablePIP: document.getElementById('enablePIP'),
  enableSkipIntro: document.getElementById('enableSkipIntro'),
  enableSkipCredits: document.getElementById('enableSkipCredits'),
  enablePlayNext: document.getElementById('enablePlayNext'),
  enableCustomSkip: document.getElementById('enableCustomSkip'),

  // Sliders
  introSlider: document.getElementById('delaySkipIntroSlider'),
  creditsSlider: document.getElementById('delaySkipCreditsSlider'),
  playNextSlider: document.getElementById('delayPlayNextSlider'),
  skipBackSlider: document.getElementById('skipBackSlider'),
  skipForwardSlider: document.getElementById('skipForwardSlider'),

  // Delay value displays
  introDelayValue: document.getElementById('introDelayValue'),
  creditsDelayValue: document.getElementById('creditsDelayValue'),
  playNextDelayValue: document.getElementById('playNextDelayValue'),
  skipBackValue: document.getElementById('skipBackValue'),
  skipForwardValue: document.getElementById('skipForwardValue'),

  // Card bodies (expandable sections)
  introDetails: document.getElementById('introDetails'),
  creditsDetails: document.getElementById('creditsDetails'),
  playNextDetails: document.getElementById('playNextDetails'),
  customSkipDetails: document.getElementById('customSkipDetails'),

  // Cards
  introCard: document.querySelector('[data-feature="intro"]'),
  creditsCard: document.querySelector('[data-feature="credits"]'),
  playNextCard: document.querySelector('[data-feature="playnext"]'),
  customSkipCard: document.querySelector('[data-feature="customskip"]'),

  // Other
  toast: document.getElementById('toast'),
  resetAll: document.getElementById('resetAll')
};

// ========================================
// Utility Functions
// ========================================

/**
 * Format delay value for display
 */
function formatDelay(ms) {
  if (ms === 0) return 'Instant';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format skip time value for display (in seconds)
 */
function formatSkipTime(seconds) {
  return `${seconds}s`;
}

/**
 * Show toast notification
 */
function showToast(message = 'Settings saved!', duration = 2000) {
  const toast = elements.toast;
  const messageEl = toast.querySelector('.toast-message');

  messageEl.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/**
 * Update slider visual progress
 */
function updateSliderProgress(slider) {
  const value = slider.value;
  const max = slider.max;
  const percentage = (value / max) * 100;
  slider.style.setProperty('--value', `${percentage}%`);
}

/**
 * Save a setting to Chrome storage
 */
function saveSetting(key, value) {
  chrome.storage.local.set({ [key]: value }, () => {
    console.log(`[Plex Toolkit] Setting saved: ${key} = ${value}`);
    showToast();
  });
}

// ========================================
// Settings Management
// ========================================

/**
 * Load settings from Chrome storage and update UI
 */
function loadSettings() {
  chrome.storage.local.get(DEFAULT_SETTINGS, (settings) => {
    // Update toggles
    elements.enablePIP.checked = settings[STORAGE_KEYS.ENABLE_PIP];
    elements.enableSkipIntro.checked = settings[STORAGE_KEYS.ENABLE_SKIP_INTRO];
    elements.enableSkipCredits.checked = settings[STORAGE_KEYS.ENABLE_SKIP_CREDITS];
    elements.enablePlayNext.checked = settings[STORAGE_KEYS.ENABLE_PLAY_NEXT];
    elements.enableCustomSkip.checked = settings[STORAGE_KEYS.ENABLE_CUSTOM_SKIP];

    // Update sliders
    elements.introSlider.value = settings[STORAGE_KEYS.DELAY_SKIP_INTRO];
    elements.creditsSlider.value = settings[STORAGE_KEYS.DELAY_SKIP_CREDITS];
    elements.playNextSlider.value = settings[STORAGE_KEYS.DELAY_PLAY_NEXT];
    elements.skipBackSlider.value = settings[STORAGE_KEYS.CUSTOM_SKIP_BACK];
    elements.skipForwardSlider.value = settings[STORAGE_KEYS.CUSTOM_SKIP_FORWARD];

    // Update delay displays
    updateDelayDisplay('intro', settings[STORAGE_KEYS.DELAY_SKIP_INTRO]);
    updateDelayDisplay('credits', settings[STORAGE_KEYS.DELAY_SKIP_CREDITS]);
    updateDelayDisplay('playnext', settings[STORAGE_KEYS.DELAY_PLAY_NEXT]);
    updateSkipTimeDisplay('skipback', settings[STORAGE_KEYS.CUSTOM_SKIP_BACK]);
    updateSkipTimeDisplay('skipforward', settings[STORAGE_KEYS.CUSTOM_SKIP_FORWARD]);

    // Update slider progress bars
    updateSliderProgress(elements.introSlider);
    updateSliderProgress(elements.creditsSlider);
    updateSliderProgress(elements.playNextSlider);
    updateSliderProgress(elements.skipBackSlider);
    updateSliderProgress(elements.skipForwardSlider);

    console.log('[Plex Toolkit] Settings loaded:', settings);
  });
}

/**
 * Update delay value display
 */
function updateDelayDisplay(type, value) {
  let displayEl;
  if (type === 'intro') {
    displayEl = elements.introDelayValue;
  } else if (type === 'credits') {
    displayEl = elements.creditsDelayValue;
  } else if (type === 'playnext') {
    displayEl = elements.playNextDelayValue;
  }

  if (!displayEl) return;

  displayEl.textContent = formatDelay(value);

  // Add animation class
  displayEl.style.transform = 'scale(1.1)';
  setTimeout(() => {
    displayEl.style.transform = 'scale(1)';
  }, 200);
}

/**
 * Update skip time value display
 */
function updateSkipTimeDisplay(type, value) {
  let displayEl;
  if (type === 'skipback') {
    displayEl = elements.skipBackValue;
  } else if (type === 'skipforward') {
    displayEl = elements.skipForwardValue;
  }

  if (!displayEl) return;

  displayEl.textContent = formatSkipTime(value);

  // Add animation class
  displayEl.style.transform = 'scale(1.1)';
  setTimeout(() => {
    displayEl.style.transform = 'scale(1)';
  }, 200);
}

/**
 * Toggle card expansion state (show/hide delay settings)
 */
function toggleCardExpansion(feature) {
  const card = document.querySelector(`[data-feature="${feature}"]`);
  if (!card) return;

  if (card.classList.contains('expanded')) {
    card.classList.remove('expanded');
  } else {
    // Add a small delay for smooth animation
    requestAnimationFrame(() => {
      card.classList.add('expanded');
    });
  }
}

/**
 * Reset all settings to defaults
 */
function resetAllSettings() {
  // Confirm with user
  if (!confirm('Reset all settings to default values?')) {
    return;
  }

  // Reset all settings
  chrome.storage.local.set(DEFAULT_SETTINGS, () => {
    console.log('[Plex Toolkit] All settings reset to defaults');

    // Reload all settings and update UI
    loadSettings();

    // Show confirmation
    showToast('Settings reset to defaults', 2000);
  });
}

// ========================================
// Event Listeners
// ========================================

/**
 * Initialize all event listeners
 */
function initEventListeners() {
  // PIP toggle
  elements.enablePIP.addEventListener('change', (e) => {
    saveSetting(STORAGE_KEYS.ENABLE_PIP, e.target.checked);
  });

  // Skip Intro toggle
  elements.enableSkipIntro.addEventListener('change', (e) => {
    saveSetting(STORAGE_KEYS.ENABLE_SKIP_INTRO, e.target.checked);
  });

  // Skip Credits toggle
  elements.enableSkipCredits.addEventListener('change', (e) => {
    saveSetting(STORAGE_KEYS.ENABLE_SKIP_CREDITS, e.target.checked);
  });

  // Auto-Play Next toggle
  elements.enablePlayNext.addEventListener('change', (e) => {
    saveSetting(STORAGE_KEYS.ENABLE_PLAY_NEXT, e.target.checked);
  });

  // Custom Skip toggle
  elements.enableCustomSkip.addEventListener('change', (e) => {
    saveSetting(STORAGE_KEYS.ENABLE_CUSTOM_SKIP, e.target.checked);
  });

  // Card header click handlers for expansion
  const introHeader = elements.introCard?.querySelector('.card-header');
  const creditsHeader = elements.creditsCard?.querySelector('.card-header');
  const playNextHeader = elements.playNextCard?.querySelector('.card-header');
  const customSkipHeader = elements.customSkipCard?.querySelector('.card-header');

  if (introHeader) {
    introHeader.addEventListener('click', () => {
      toggleCardExpansion('intro');
    });

    // Prevent toggle switches from triggering card expansion
    const introSwitch = introHeader.querySelector('.switch');
    if (introSwitch) {
      introSwitch.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  if (creditsHeader) {
    creditsHeader.addEventListener('click', () => {
      toggleCardExpansion('credits');
    });

    // Prevent toggle switches from triggering card expansion
    const creditsSwitch = creditsHeader.querySelector('.switch');
    if (creditsSwitch) {
      creditsSwitch.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  if (playNextHeader) {
    playNextHeader.addEventListener('click', () => {
      toggleCardExpansion('playnext');
    });

    // Prevent toggle switches from triggering card expansion
    const playNextSwitch = playNextHeader.querySelector('.switch');
    if (playNextSwitch) {
      playNextSwitch.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  if (customSkipHeader) {
    customSkipHeader.addEventListener('click', () => {
      toggleCardExpansion('customskip');
    });

    // Prevent toggle switches from triggering card expansion
    const customSkipSwitch = customSkipHeader.querySelector('.switch');
    if (customSkipSwitch) {
      customSkipSwitch.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  // Intro delay slider
  elements.introSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 0;
    updateDelayDisplay('intro', value);
    updateSliderProgress(e.target);
  });

  elements.introSlider.addEventListener('change', (e) => {
    const value = parseInt(e.target.value) || 0;
    saveSetting(STORAGE_KEYS.DELAY_SKIP_INTRO, value);
  });

  // Credits delay slider
  elements.creditsSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 0;
    updateDelayDisplay('credits', value);
    updateSliderProgress(e.target);
  });

  elements.creditsSlider.addEventListener('change', (e) => {
    const value = parseInt(e.target.value) || 0;
    saveSetting(STORAGE_KEYS.DELAY_SKIP_CREDITS, value);
  });

  // Play Next delay slider
  elements.playNextSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 0;
    updateDelayDisplay('playnext', value);
    updateSliderProgress(e.target);
  });

  elements.playNextSlider.addEventListener('change', (e) => {
    const value = parseInt(e.target.value) || 0;
    saveSetting(STORAGE_KEYS.DELAY_PLAY_NEXT, value);
  });

  // Skip back slider
  elements.skipBackSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 10;
    updateSkipTimeDisplay('skipback', value);
    updateSliderProgress(e.target);
  });

  elements.skipBackSlider.addEventListener('change', (e) => {
    const value = parseInt(e.target.value) || 10;
    saveSetting(STORAGE_KEYS.CUSTOM_SKIP_BACK, value);
  });

  // Skip forward slider
  elements.skipForwardSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 30;
    updateSkipTimeDisplay('skipforward', value);
    updateSliderProgress(e.target);
  });

  elements.skipForwardSlider.addEventListener('change', (e) => {
    const value = parseInt(e.target.value) || 30;
    saveSetting(STORAGE_KEYS.CUSTOM_SKIP_FORWARD, value);
  });

  // Reset all button
  elements.resetAll.addEventListener('click', (e) => {
    e.preventDefault();
    resetAllSettings();
  });

  // Add hover effects to cards
  const cards = document.querySelectorAll('.feature-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-2px)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
    });
  });
}

// ========================================
// Initialization
// ========================================

/**
 * Initialize popup
 */
function init() {
  console.log('[Plex Toolkit] Popup initializing...');

  // Load settings
  loadSettings();

  // Initialize event listeners
  initEventListeners();

  // Add entrance animation
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '1';
  });
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
