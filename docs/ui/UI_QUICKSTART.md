# InflaShield UI — Quick Start Guide

## See the New UI

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   Navigate to http://localhost:3000

3. **Experience the transformation:**
   - Scroll through the full-page storytelling experience
   - Watch the 3D globe rotate with currency nodes
   - See the inflation ticker scroll
   - Read the animated statistics
   - Fill out the redesigned hedge form
   - Generate a signal to see the premium SignalCard

## What Changed

### Before
- Plain white background
- Simple gray form
- No animations
- Single-page centered layout
- Basic HTML inputs

### After
- Futuristic dark theme (#080F1C background)
- 3D animated globe with pulsing currency nodes
- Smooth scrolling with Lenis
- Custom magnetic cursor (desktop only)
- Full-scroll storytelling experience
- Glass morphism effects
- Gold gradient accents
- Animated progress bars
- Staggered entrance animations
- Premium typography (Urbanist, Space Grotesk, Syne)

## Key Features to Test

### 1. Hero Section
- **3D Globe**: Auto-rotating globe with 12 currency nodes
- **Animated Particles**: 80 drifting particles in background
- **Staggered Text**: Three-line headline with delays
- **CTA Buttons**: "Protect My Savings" and "See how it works"
- **Scroll Indicator**: Bouncing chevron at bottom

### 2. Inflation Ticker
- **Marquee**: Horizontal scrolling with 8 countries
- **Pause on Hover**: Stops when you hover over it
- **Seamless Loop**: Duplicated content for infinite scroll

### 3. Global Scale Section
- **Animated Numbers**: CountUp animation when scrolled into view
- **Glass Cards**: Semi-transparent with gold left border
- **Four Stats**: 2.6B people, 170+ currencies, $0 needed, 60 sec

### 4. How It Works
- **Three Steps**: Currency → Scoring → Execution
- **Ghost Numbers**: Large 01, 02, 03 in background
- **Icons**: Currency, chart, lightning
- **Connecting Line**: Dashed gold line on desktop

### 5. Hedge Form
- **Glass Card**: Gold-tinted glass morphism
- **Custom Dropdown**: Gold arrow, dark background
- **Risk Cards**: Three large cards instead of radio buttons
- **Animated Dot**: Moves between selected risk level
- **Gold Button**: Gradient with shimmer effect

### 6. Signal Card (appears after generating signal)
- **Circular Gauge**: Shows signal strength 0-100
- **Animated Bars**: Progress bars for allocation breakdown
- **Score Visualization**: Three color-coded bars
- **Collapsible Text**: "Show more" for long rationale
- **Gold Button**: "Execute on SoDEX" with arrow

## Custom Cursor (Desktop Only)

The app has a custom magnetic cursor with two elements:
1. **Small dot** (12px) — Follows mouse instantly
2. **Large ring** (40px) — Follows with spring physics

**Behaviors:**
- Scales up 1.5× on interactive elements
- Turns gold on buttons with `data-cursor="gold"`
- Hidden on touch devices automatically

## Smooth Scrolling

The entire app uses Lenis for buttery smooth scrolling:
- **Lerp**: 0.09 (smooth interpolation)
- **Smooth wheel**: Native smooth scroll feel
- **Sync touch**: Works on mobile too

## Typography System

- **Urbanist**: All body text, labels, descriptions
- **Space Grotesk**: Numbers, currency values, percentages
- **Syne**: Hero headlines, section titles

## Color Palette

- **Deep background**: #080F1C
- **Surface layers**: #0D1829, #121F34, #1A2B47
- **Gold accent**: #F5C842
- **Signal colors**: #10B981 (green), #EF4444 (red)
- **Text**: #E8EDF5 (primary), #8BA0BF (secondary), #4A6080 (tertiary)

## Performance Tips

- The 3D globe is lazy-loaded (dynamic import)
- Animations use GPU-accelerated properties
- Smooth scroll runs at 60fps
- Fonts load with `display: swap` (no layout shift)

## Troubleshooting

### "3D globe not showing"
- Check browser console for WebGL errors
- Try a different browser (Chrome, Firefox, Safari)
- Ensure hardware acceleration is enabled

### "Animations feel janky"
- Close other tabs to free up GPU
- Check if `prefers-reduced-motion` is enabled in OS settings
- Try disabling browser extensions

### "Custom cursor not visible"
- Only works on desktop (`pointer: fine`)
- Check if you're on a touch device
- Cursor is white/gold — may be hard to see on light backgrounds

### "Build warnings"
- pg-native warning is normal (not used in production)
- React hook warnings are from existing components, not the new UI

## Testing Checklist

- [ ] Hero section loads with 3D globe
- [ ] Inflation ticker scrolls horizontally
- [ ] Stats animate when scrolled into view
- [ ] Hedge form accepts input
- [ ] Risk cards can be selected
- [ ] Submit button shows loading state
- [ ] Signal card appears after generation
- [ ] Execute button works (opens ExecutionPanel)
- [ ] Smooth scrolling works throughout
- [ ] Custom cursor appears on desktop
- [ ] Mobile layout stacks correctly
- [ ] All fonts load properly

## Browser Support

**Tested on:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features:**
- Glass effect: All modern browsers
- 3D globe: Requires WebGL support
- Custom cursor: Desktop only
- Smooth scroll: All platforms

## Mobile Experience

- Custom cursor hidden on touch devices
- Two-column layouts stack vertically
- 3D globe above text on small screens
- All interactions work with touch
- Smooth scrolling on mobile too

## What to Show in Screenshots

1. **Hero with globe** — Full-screen shot
2. **Inflation ticker** — Capture the marquee
3. **Stats cards** — Show the animated numbers
4. **Hedge form** — Highlight the glass effect
5. **Risk cards** — Show the selected state
6. **Signal card** — Full card with allocations
7. **Dark theme** — Emphasize the color palette

---

Enjoy the new UI! 🎨✨
