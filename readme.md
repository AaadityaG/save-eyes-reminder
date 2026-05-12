# Eye Break Reminder

A beautiful desktop app that reminds you to take regular eye breaks to protect your vision.

## Download

📥 **[Click here to Download Eye Break Reminder Setup 1.0.0.exe](https://github.com/AaadityaG/save-eyes-reminder/blob/main/releases/Eye%20Break%20Reminder%20Setup%201.0.0.exe)**

*Direct download link for Windows*

## Installation

1. Download the installer from the link above
2. Run `Eye Break Reminder Setup 1.0.0.exe`
3. Follow the installation wizard
4. The app will launch automatically and run in your system tray

## Features

- ⏰ Customizable break intervals (default: 30 minutes)
- 🌿 Gentle break reminders with countdown timer
- 🎨 Beautiful nature-inspired interface
- 📱 Minimizes to system tray
- 🚀 Auto-starts on system login
- ⏸️ Pause/resume functionality

## Build from Source

```bash
# Install dependencies
npm install

# Build the Windows installer
npm run build:win
```

After the build completes, you'll find the installer in the `dist` folder:
- `dist/Eye Break Reminder Setup 1.0.0.exe` - Run this to install

## Development

```bash
# Start the app in development mode
npm start
```

## Usage

- The app runs in your system tray and reminds you to take eye breaks
- Click the tray icon to open the main window
- Use the settings to customize break intervals and duration
- Enable/disable auto-start timer on launch