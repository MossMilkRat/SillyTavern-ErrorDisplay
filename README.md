# SillyTavern Error Display Extension

A SillyTavern extension that displays API errors, generation failures, and system errors in a convenient UI panel instead of requiring you to check the browser console.

## Features

- **Collapsible Error Panel**: Appears at the bottom-right of your screen
- **Color-Coded Error Types**: 
  - 🔴 API Errors (red)
  - 🟡 Generation Errors (yellow)
  - 🔵 System Errors (blue)
- **Configurable Options**:
  - Toggle toast notifications
  - Auto-expand panel on new errors
  - Filter which error types to log
  - Set maximum number of errors to keep (10-500)
- **Detailed Information**: View error messages, details, and stack traces
- **Easy Management**: Clear all errors with one click

## Installation

1. Navigate to your SillyTavern directory
2. Go to `public/scripts/extensions/third-party/`
3. Create a new folder named `error-display`
4. Place these three files in the folder:
   - `index.js`
   - `style.css`
   - `manifest.json`
5. Restart SillyTavern
6. Go to Extensions menu and enable "Error Display"

## Usage

Once installed, the error panel will appear at the bottom-right of your screen. By default, it's collapsed showing just the header with an error count.

### Controls

- **Toggle Panel**: Click the ▲/▼ button or click anywhere on the header
- **Clear Errors**: Click the trash icon to clear all logged errors
- **Settings**: Configure the extension in Extensions > Error Display

### Settings

Access settings through the Extensions menu:

- **Enable Error Display**: Master toggle for the extension
- **Show Toast Notifications**: Display popup notifications for new errors
- **Auto-Expand Panel on Error**: Automatically open the panel when a new error occurs
- **Maximum Errors to Keep**: How many errors to store (10-500)
- **Error Types to Log**: Choose which types of errors to capture
  - API Errors
  - Generation Errors
  - System Errors

## What Errors Are Captured?

- **API Errors**: Failed HTTP requests, 4xx/5xx status codes
- **Generation Errors**: Message generation failures from the AI
- **System Errors**: Console errors and JavaScript exceptions

## Troubleshooting

If the extension isn't working:

1. Check the browser console (F12) for any errors loading the extension
2. Verify all three files are in the correct directory
3. Make sure the extension is enabled in the Extensions menu
4. Try clearing your browser cache and restarting SillyTavern

## Version

1.0.0

## Author

Blitzen

## License

Free to use and modify
