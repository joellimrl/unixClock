# Unix Timestamp Clock

A real-time Unix timestamp clock with milestone tracking that displays the current Unix timestamp alongside significant historical and future timestamp milestones.

## Features

- **Real-time Clock**: Updates every second with current Unix timestamp
- **Milestone Tracking**: Shows past and future significant Unix timestamps
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Clean UI**: Minimalist design focusing on the timestamp display
- **Performance Optimized**: Handles browser tab visibility changes efficiently

## Project Structure

```
unixClock/
├── index.html              # Main application (requires HTTP server)
├── test.html              # Standalone test version (works with file://)
├── styles.css             # All styling and responsive design
├── script.js              # Main UnixClock class and logic
├── start-server.bat       # Windows batch file to start local server
├── README.md              # Project documentation
└── data/
    └── milestones.json    # Milestone timestamp data
```

## Getting Started

### Option 1: Quick Test (File-based)
1. Open `test.html` directly in your browser
2. No server required - uses inline milestone data

### Option 2: Full Version (HTTP Server)
1. **Using the batch file (Windows):**
   - Double-click `start-server.bat`
   - Open http://localhost:8080 in your browser

2. **Using Python manually:**
   ```bash
   cd unixClock
   python -m http.server 8080
   ```
   - Open http://localhost:8080 in your browser

3. **Using Node.js (if available):**
   ```bash
   npx serve .
   ```

## How It Works

### Main Components

1. **UnixClock Class**: Manages the real-time clock and milestone categorization
2. **Milestone System**: Loads and categorizes timestamps into past/future
3. **Responsive UI**: Adapts layout for different screen sizes
4. **State Management**: Efficiently tracks current time and milestone states

### Key Features

- **Accurate Timing**: Uses `Math.floor(Date.now() / 1000)` for precise Unix timestamps
- **Smart Updates**: Only re-renders milestones when categorization changes
- **Visibility Handling**: Pauses updates when browser tab is hidden
- **Error Resilient**: Continues working even if milestone data fails to load

## Customization

### Adding New Milestones

Edit `data/milestones.json` to add new milestone timestamps:

```json
{
  "timestamp": 1234567890,
  "description": "Your milestone description",
  "significance": "Why this timestamp is important (optional)"
}
```

### Configuration Options

In `script.js`, modify the `config` object:

```javascript
this.config = {
    updateFrequency: 1000,        // Update interval in milliseconds
    maxDisplayedMilestones: 3,    // Number of milestones to show per section
    milestoneDataPath: './data/milestones.json'  // Path to milestone data
};
```

## Browser Compatibility

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Required Features**: ES6+ support, Fetch API, CSS Grid/Flexbox
- **Responsive**: Works on all screen sizes from mobile to desktop

## Technical Details

### Performance Optimizations

- DOM element references cached on initialization
- Milestone re-categorization only occurs when needed
- Efficient string comparison to detect changes
- Automatic cleanup of intervals and event listeners

### Accessibility Features

- Semantic HTML structure with proper ARIA labels
- Screen reader friendly time element markup
- High contrast mode support
- Reduced motion preferences respected

### State Management

The application maintains state for:
- Current timestamp and datetime
- All loaded milestones
- Categorized past/future milestones
- Clock running status and update interval

## Development Notes

### Code Standards

- ES6+ JavaScript with modern syntax
- Mobile-first responsive CSS design
- Semantic HTML structure
- Error handling and logging
- Clean separation of concerns

### Testing

1. **Real-time Updates**: Verify timestamp updates every second
2. **Milestone Transitions**: Test when timestamps pass milestone boundaries
3. **Responsive Design**: Check layout on different screen sizes
4. **Error Handling**: Test with missing or invalid milestone data
5. **Browser Compatibility**: Test across different browsers

## License

This project is created for educational and demonstration purposes.

## Contributing

To contribute improvements:
1. Test your changes thoroughly
2. Ensure responsive design works across devices
3. Maintain accessibility standards
4. Follow existing code patterns and naming conventions
