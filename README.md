# Plex Toolkit

A Chrome extension that enhances your Plex Web App experience with Picture-in-Picture support and automatic intro/credit skipping.

## Features

### Picture-in-Picture (PIP)
- Adds a PIP button to the Plex player controls
- Watch your content in a floating window while using other apps
- Toggle on/off from the settings popup

### Auto Skip Intro
- Automatically clicks the "Skip Intro" button when it appears
- Configurable delay (0-10000ms) before skipping
- Can be toggled on/off independently

### Auto Skip Credits
- Automatically clicks the "Skip Credits" button at the end of episodes
- Configurable delay (0-10000ms) before skipping
- Can be toggled on/off independently

## Installation

### Development Mode (Unpacked Extension)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked"
4. Select the `plex-toolkit` folder
5. The extension should now be installed and active

### Usage

1. Navigate to [Plex Web App](https://app.plex.tv)
2. Start playing any video
3. You should see a new PIP button in the player controls (if enabled)
4. The extension will automatically skip intros and credits based on your settings

### Settings

Click the extension icon in your Chrome toolbar to open the settings popup where you can:

- **Toggle Picture-in-Picture**: Enable/disable the PIP button
- **Toggle Auto Skip Intro**: Enable/disable automatic intro skipping
- **Toggle Auto Skip Credits**: Enable/disable automatic credit skipping
- **Set Delays**: Configure delays (in milliseconds) before auto-skipping
- **Reset Delays**: Quickly reset delay values to 0

## Technical Details

### Files
- `manifest.json` - Extension configuration
- `content.js` - Main content script that runs on Plex pages
- `popup.html` - Settings UI
- `popup.js` - Settings logic
- `popup.css` - Settings styling
- `icons/` - Extension icons

### Permissions
- `storage` - Required to save user settings

### Browser Support
- Chrome (Manifest V3)
- Other Chromium-based browsers (Edge, Opera, Brave, etc.)

## How It Works

The extension uses a content script that:
1. Monitors the Plex player DOM for specific elements
2. Adds a PIP button to the player controls when detected
3. Watches for "Skip Intro" and "Skip Credits" buttons
4. Automatically clicks them based on video progress and user settings
5. Uses Chrome's storage API to persist settings across sessions

## Credits

This extension was inspired by and learned from:
- [PiPlex](https://chrome.google.com/webstore/detail/emomdmkodkbdnclppngmiigeniijnbpi) - For PIP functionality
- [Plex Skipper](https://chrome.google.com/webstore/detail/ceicccfeikoipigeghddpocceifjelph) - For auto-skip functionality

## Version History

### v1.0.0 (Initial Release)
- Picture-in-Picture support
- Auto skip intro functionality
- Auto skip credits functionality
- Configurable delays
- Settings popup interface

## License

This extension is provided as-is for personal use.

## Support

For issues or feature requests, please create an issue in the repository.
