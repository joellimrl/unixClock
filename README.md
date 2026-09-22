# Unix Clock

A live Unix timestamp clock with a scrollable timeline of significant timestamps and a Unix-to-GMT converter. Built with plain HTML, CSS, and JavaScript; no build step or application dependencies.

## Run locally

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open [localhost:8080](http://localhost:8080). An HTTP server is required for JavaScript modules and milestone data.

## Features

- A large central Unix clock, updated every second, with its GMT date and time.
- Past and future milestones sit in separate panels beside the central clock on wide screens, and below it on tablets. On phones, the past sits above the clock and the future below it. Focusing or scrolling a panel expands it while keeping the clock visible; tapping the clock or choosing **Back to now** restores the balanced layout. Scroll or swipe inside either panel to explore, or focus a list and use the arrow keys. The gesture area extends across the clock workspace: left/right controls past/future on desktop and tablets; above/below the clock’s midpoint controls past/future on phones. Swipes keep their starting timeline even when crossing the clock. The layout shares the available screen height so desktop, tablet, and phone views keep scrolling inside the milestone panels. Exceptionally short windows can still scroll the page to keep controls reachable. **Back to now** returns both lists to the nearest milestones.
- Select any milestone to open its GMT conversion, or open **Converter** to enter a custom timestamp.
- Explicit seconds and milliseconds modes, negative timestamps, validation, ISO 8601 output, and copy controls.
- Keyboard accessible modal with Escape to close, responsive layouts, and reduced-motion/high-contrast preferences.
- Clock and converter remain available if milestone data cannot load.

The clock uses the device's system time. GMT output always uses UTC+00:00, without daylight saving adjustments. Unix time does not count leap seconds. Google Fonts provides DM Sans and Space Grotesk; system fonts are used when unavailable.

## Project structure

- `index.html` — clock, timeline, and converter markup
- `styles.css` — responsive light theme
- `script.js` — clock, milestones, scrolling, and converter interactions
- `time-utils.mjs` — timestamp validation and conversion
- `time-utils.test.mjs` — conversion regression tests
- `data/milestones.json` — editable milestone data

## Add a milestone

Add an entry to the `milestones` array in `data/milestones.json`. Dates are calculated from timestamps in GMT, and entries are sorted automatically.

```json
{
  "timestamp": 1234567890,
  "description": "A perfect sequence",
  "significance": "All ten digits, in order"
}
```

## Test

With Node.js 18 or newer:

```sh
node --test time-utils.test.mjs
```

Tests cover epoch zero, dates before the epoch, the 2038 boundary, millisecond precision, invalid input, supported date range limits, and BC date labels.
