# Stranger Things Cinematic Theme System

A complete, production-ready theme system that transforms your website into an immersive Stranger Things cinematic universe with two complete worlds: **Hawkins** (light) and **Upside Down** (dark).

## 🎬 Features

- **Dual Themes**: Seamless switching between Hawkins (warm vintage) and Upside Down (horror abyss)
- **Cinematic Transitions**: Dimensional tear animations (900-1200ms) with shockwaves and camera shake
- **Atmospheric Layers**: 5 composited layers (abyss, veins, fog, spores, ash) with GPU acceleration
- **VHS/Glitch System**: RGB channel shifts, scanlines, horizontal tears, frame jitter
- **Interactive Reactions**: Cursor flashlight, expanding vines, heartbeat pulse
- **Horror Animations**: Demogorgon jumpscare, Vecna curse, Mind Flayer shadow crawl
- **Season 4 Intro**: Optional 6-12 second cinematic intro sequence
- **Performance Optimized**: GPU-accelerated CSS, requestAnimationFrame for particles, mobile fallbacks
- **Accessibility**: Respects `prefers-reduced-motion`, content warnings, skip options

## 📦 Installation

### 1. Copy Files

Copy the entire `stranger-theme` folder to your project:

```
your-project/
├── cursor-output/
│   └── stranger-theme/
│       ├── theme.css
│       ├── theme.js
│       ├── controls-panel.jsx (React)
│       ├── assets/
│       │   ├── demogorgon-sprite.svg
│       │   └── mind-flayer-mask.svg
│       └── README.md
```

### 2. Include CSS

Add to your HTML `<head>` or import in your main CSS/SCSS:

```html
<link rel="stylesheet" href="cursor-output/stranger-theme/theme.css">
```

Or in your main CSS:

```css
@import './cursor-output/stranger-theme/theme.css';
```

### 3. Include JavaScript

#### ES6 Module (Recommended)

```javascript
import StrangerTheme from './cursor-output/stranger-theme/theme.js';

const themeEngine = new StrangerTheme({
  defaultTheme: 'hawkins',
  enableJumpscare: true,
  particleCount: 50,
  fogLayers: 3
});
```

#### Script Tag

```html
<script type="module" src="cursor-output/stranger-theme/theme.js"></script>
<script>
  const themeEngine = new StrangerTheme();
</script>
```

### 4. React Integration

```jsx
import { useEffect, useRef } from 'react';
import StrangerTheme from './cursor-output/stranger-theme/theme.js';
import { StrangerControlsPanel } from './cursor-output/stranger-theme/controls-panel.jsx';

function App() {
  const themeEngineRef = useRef(null);

  useEffect(() => {
    // Initialize theme engine
    themeEngineRef.current = new StrangerTheme({
      defaultTheme: 'hawkins',
      enableJumpscare: false, // Disable by default for safety
      particleCount: 50
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div>
      {/* Your app content */}
      <StrangerControlsPanel themeEngine={themeEngineRef.current} />
    </div>
  );
}
```

## 🎮 API Reference

### Initialization

```javascript
const themeEngine = new StrangerTheme({
  defaultTheme: 'hawkins' | 'upside-down',  // Default theme
  enableJumpscare: true,                     // Enable Demogorgon jumpscare
  particleCount: 50,                         // Number of particles
  fogLayers: 3,                              // Number of fog layers
  glitchIntensity: 0.3,                      // Glitch intensity (0-1)
  enableAudio: false                         // Enable audio hooks
});
```

### Theme Control

```javascript
// Toggle between themes
themeEngine.toggleTheme();

// Get current theme
const currentTheme = themeEngine.getTheme();

// Apply specific theme
themeEngine.applyTheme('upside-down', true); // (theme, animate)
```

### Horror Animations

```javascript
// Trigger Demogorgon jumpscare
themeEngine.triggerDemogorgon({
  autoSwitchTheme: false,  // Auto-switch to Upside Down after
  audioSrc: 'path/to/sound.mp3'  // Optional audio file
});

// Trigger Vecna curse on element
const targetElement = document.querySelector('.card');
themeEngine.triggerVecnaCurse(targetElement);

// Trigger Mind Flayer shadow crawl
themeEngine.triggerMindFlayerCrawl(2); // intensity (1-5)
```

### Season 4 Intro

```javascript
themeEngine.playSeason4Intro({
  title: 'YOUR SITE NAME',
  duration: 8000,  // milliseconds
  mode: 'upsidedown'  // or 'hawkins'
});

// Skip intro
themeEngine.skipIntro();
```

### Performance Settings

```javascript
// Adjust particle count
themeEngine.setParticleCount(100);

// Adjust fog layers
themeEngine.setFogLayers(5);

// Disable jumpscare
themeEngine.setJumpscareEnabled(false);

// Disable heavy animations (for reduced motion)
themeEngine.disableHeavyAnimations();
```

## 🎨 CSS Classes

### Theme Classes

Apply to `<body>`:

- `theme-hawkins` - Warm vintage Hawkins theme
- `theme-upside-down` - Dark horror Upside Down theme

### Component Classes

- `.btn-hawkins` - Hawkins-style button
- `.btn-upside-down` - Upside Down neon button
- `.card-hawkins` - Hawkins card style
- `.card-upside-down` - Upside Down card with veins
- `.hero-title` - Cinematic title styling

### Effect Classes

- `.vhs-glitch` - VHS glitch effect
- `.rgb-shift` - RGB channel shift
- `.scanlines` - Scanline overlay
- `.heartbeat-pulse` - Heartbeat animation
- `.vecna-curse` - Vecna floating effect
- `.camera-shake` - Camera shake animation

## ⚙️ Configuration

### Settings Persistence

Settings are automatically saved to `localStorage` under `stranger-theme-settings`:

```javascript
{
  theme: 'upside-down',
  disableJumpscare: false,
  particleCount: 50,
  fogLayers: 3,
  skipIntro: false
}
```

### Disable Jumpscare Globally

Add data attribute to HTML:

```html
<html data-jumpscare="off">
```

Or in settings:

```javascript
themeEngine.setJumpscareEnabled(false);
```

## 🎯 Integration Examples

### Plain HTML

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="cursor-output/stranger-theme/theme.css">
</head>
<body class="theme-hawkins">
  <h1 class="hero-title">My Site</h1>
  <button class="btn-hawkins" onclick="toggleTheme()">Toggle Theme</button>
  
  <script type="module">
    import StrangerTheme from './cursor-output/stranger-theme/theme.js';
    window.themeEngine = new StrangerTheme();
    window.toggleTheme = () => window.themeEngine.toggleTheme();
  </script>
</body>
</html>
```

### React Component

```jsx
import { useEffect, useState } from 'react';
import StrangerTheme from './cursor-output/stranger-theme/theme.js';

function MyComponent() {
  const [themeEngine, setThemeEngine] = useState(null);

  useEffect(() => {
    const engine = new StrangerTheme({ defaultTheme: 'hawkins' });
    setThemeEngine(engine);
  }, []);

  return (
    <div>
      <button onClick={() => themeEngine?.toggleTheme()}>
        Toggle Theme
      </button>
    </div>
  );
}
```

## 🚀 Performance

### GPU Acceleration

All animations use `transform` and `opacity` for GPU acceleration. Heavy calculations use `requestAnimationFrame`.

### Mobile Optimization

- Automatically detects mobile devices
- Reduces particle count by 66%
- Limits fog layers to 1
- Disables heavy effects on low-memory devices

### Reduced Motion

Respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  /* All animations disabled */
}
```

## ⚠️ Safety & Accessibility

### Content Warnings

- Jumpscare is **opt-in only** by default
- Flashing effects are clearly marked
- Skip options for all animations
- Settings persist user preferences

### Accessibility Features

- `aria-live` regions for theme changes
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support

## 🎬 Customization

### Custom Colors

Override CSS variables:

```css
:root {
  --upside-red: #FF0000;
  --upside-blue: #00FFFF;
  --hawkins-bg: #F0F0F0;
}
```

### Custom Animations

Extend the `StrangerTheme` class:

```javascript
class MyTheme extends StrangerTheme {
  customEffect() {
    // Your custom effect
  }
}
```

## 📝 Changelog

### v1.0.0
- Initial release
- Dual theme system (Hawkins / Upside Down)
- Cinematic transitions
- Atmospheric layers
- VHS/glitch effects
- Horror animations
- Season 4 intro
- Performance optimizations
- Accessibility features

## 🐛 Troubleshooting

### Particles not showing

- Check `particleCount` setting
- Verify `spores-container` exists in DOM
- Check browser console for errors

### Performance issues

- Reduce `particleCount`
- Reduce `fogLayers`
- Enable `performance-low` class
- Check GPU acceleration in browser

### Theme not switching

- Verify CSS is loaded
- Check JavaScript console
- Ensure `applyTheme()` is called
- Verify body class is updating

## 📄 License

This theme system is provided as-is for integration into your projects. Modify and customize as needed.

## 🙏 Credits

Inspired by the Stranger Things series. This is a fan-made theme system for educational and entertainment purposes.

---

**Ready to enter the Upside Down?** 🌀

