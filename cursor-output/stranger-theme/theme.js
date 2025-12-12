/* ============================================
   STRANGER THINGS CINEMATIC THEME ENGINE
   ============================================
   Modular ES6 module for theme management
   GPU-accelerated, performance-optimized
   ============================================ */

class StrangerTheme {
  constructor(options = {}) {
    this.options = {
      defaultTheme: options.defaultTheme || 'hawkins',
      enableJumpscare: options.enableJumpscare !== false,
      particleCount: options.particleCount || 50,
      fogLayers: options.fogLayers || 3,
      glitchIntensity: options.glitchIntensity || 0.3,
      enableAudio: options.enableAudio || false,
      audioContext: null,
      ...options
    };
    
    this.currentTheme = this.options.defaultTheme;
    this.isTransitioning = false;
    this.particles = [];
    this.ashFlakes = [];
    this.heartbeatInterval = null;
    this.glitchInterval = null;
    this.cursorX = 0;
    this.cursorY = 0;
    this.performanceMode = this.detectPerformance();
    this.settings = this.loadSettings();
    
    this.init();
  }

  init() {
    // Apply saved theme
    if (this.settings.theme) {
      this.currentTheme = this.settings.theme;
    }
    
    this.applyTheme(this.currentTheme, false);
    this.setupEventListeners();
    this.createAtmosphericLayers();
    this.startHeartbeat();
    this.startGlitchSystem();
    
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.disableHeavyAnimations();
    }
  }

  detectPerformance() {
    // Simple performance detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    
    if (isMobile || hasLowMemory) {
      this.options.particleCount = Math.floor(this.options.particleCount / 3);
      this.options.fogLayers = 1;
      document.body.classList.add('performance-low');
      return 'low';
    }
    
    return 'high';
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('stranger-theme-settings');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('stranger-theme-settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Could not save theme settings');
    }
  }

  setupEventListeners() {
    // Cursor tracking for flashlight
    document.addEventListener('mousemove', (e) => {
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;
      this.updateFlashlight();
    });

    // Touch support for mobile
    document.addEventListener('touchmove', (e) => {
      if (e.touches[0]) {
        this.cursorX = e.touches[0].clientX;
        this.cursorY = e.touches[0].clientY;
        this.updateFlashlight();
      }
    });

    // Scroll-based vine expansion
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) > 50) {
        this.expandVines();
        lastScrollY = currentScrollY;
      }
    });

    // Reduced motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (e.matches) {
        this.disableHeavyAnimations();
      }
    });
  }

  applyTheme(theme, animate = true) {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.currentTheme = theme;
    this.settings.theme = theme;
    this.saveSettings();

    if (animate) {
      this.playDimensionalTear(theme === 'upside-down');
    } else {
      document.body.className = `theme-${theme}`;
      this.isTransitioning = false;
    }

    // Update UI components
    this.updateUIComponents();
  }

  playDimensionalTear(toUpsideDown) {
    const tear = document.createElement('div');
    tear.className = 'dimensional-tear';
    if (!toUpsideDown) {
      tear.classList.add('reverse');
    }
    document.body.appendChild(tear);

    // Apply camera shake
    document.body.classList.add('camera-shake');

    // Create shockwave
    const shockwave = document.createElement('div');
    shockwave.className = 'shockwave';
    document.body.appendChild(shockwave);

    // Update theme after animation
    setTimeout(() => {
      document.body.className = `theme-${this.currentTheme}`;
      
      // Remove tear and shockwave
      setTimeout(() => {
        tear.remove();
        shockwave.remove();
        document.body.classList.remove('camera-shake');
        this.isTransitioning = false;
        
        // Enable Upside Down layers if needed
        if (this.currentTheme === 'upside-down') {
          this.enableUpsideDownLayers();
        } else {
          this.disableUpsideDownLayers();
        }
      }, 100);
    }, 1000);
  }

  createAtmosphericLayers() {
    // Abyss background
    const abyss = document.createElement('div');
    abyss.className = 'abyss-background';
    abyss.id = 'abyss-bg';
    document.body.appendChild(abyss);

    // Veins layer
    const veinsContainer = document.createElement('div');
    veinsContainer.className = 'veins-layer';
    veinsContainer.id = 'veins-layer';
    document.body.appendChild(veinsContainer);
    this.createVeins(veinsContainer);

    // Fog layers
    for (let i = 1; i <= this.options.fogLayers; i++) {
      const fog = document.createElement('div');
      fog.className = `fog-layer fog-${i}`;
      fog.id = `fog-${i}`;
      document.body.appendChild(fog);
    }

    // Spores container
    const sporesContainer = document.createElement('div');
    sporesContainer.className = 'spores-container';
    sporesContainer.id = 'spores-container';
    document.body.appendChild(sporesContainer);
    this.createSpores(sporesContainer);

    // Ash container
    const ashContainer = document.createElement('div');
    ashContainer.className = 'ash-container';
    ashContainer.id = 'ash-container';
    document.body.appendChild(ashContainer);
    this.createAsh(ashContainer);

    // Cursor flashlight
    const flashlight = document.createElement('div');
    flashlight.className = 'cursor-flashlight';
    flashlight.id = 'cursor-flashlight';
    document.body.appendChild(flashlight);

    // Scanlines
    const scanlines = document.createElement('div');
    scanlines.className = 'scanlines';
    document.body.appendChild(scanlines);

    // Initially disable Upside Down layers
    this.disableUpsideDownLayers();
  }

  createVeins(container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    // Create multiple vein paths
    const paths = [
      'M 0,100 Q 200,50 400,100 T 800,100',
      'M 100,0 Q 150,200 100,400 T 100,800',
      'M 800,0 Q 750,200 800,400 T 800,800',
      'M 0,700 Q 200,750 400,700 T 800,700'
    ];

    paths.forEach((path, i) => {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path);
      pathEl.setAttribute('class', 'vein');
      pathEl.style.animationDelay = `${i * 0.5}s`;
      svg.appendChild(pathEl);
    });

    container.appendChild(svg);
  }

  createSpores(container) {
    const count = this.options.particleCount;
    this.particles = [];

    for (let i = 0; i < count; i++) {
      const spore = document.createElement('div');
      spore.className = 'spore';
      this.initParticle(spore, container, true);
      this.particles.push(spore);
    }
  }

  createAsh(container) {
    const emberCount = Math.floor(this.options.particleCount / 2);
    const flakeCount = Math.floor(this.options.particleCount / 4);

    // Create embers
    for (let i = 0; i < emberCount; i++) {
      const ember = document.createElement('div');
      ember.className = 'ash-ember';
      this.initParticle(ember, container, false);
      this.ashFlakes.push(ember);
    }

    // Create flakes
    for (let i = 0; i < flakeCount; i++) {
      const flake = document.createElement('div');
      flake.className = 'ash-flake';
      const size = Math.random() * 3 + 2;
      flake.style.width = `${size}px`;
      flake.style.height = `${size}px`;
      this.initParticle(flake, container, false);
      this.ashFlakes.push(flake);
    }
  }

  initParticle(element, container, isSpore) {
    const startX = Math.random() * window.innerWidth;
    const startY = isSpore ? Math.random() * window.innerHeight : -10;
    const duration = (Math.random() * 10 + 10) * 1000;
    const delay = Math.random() * 2000;
    const horizontalDrift = (Math.random() - 0.5) * 100;

    element.style.left = `${startX}px`;
    element.style.top = `${startY}px`;
    element.style.animation = `none`;

    container.appendChild(element);

    // Animate using requestAnimationFrame for better performance
    this.animateParticle(element, startX, startY, duration, delay, horizontalDrift, isSpore);
  }

  animateParticle(element, startX, startY, duration, delay, horizontalDrift, isSpore) {
    let startTime = null;
    const direction = isSpore ? 1 : -1; // Spores go up, ash goes down

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime - delay;

      if (elapsed < 0) {
        requestAnimationFrame(animate);
        return;
      }

      const progress = (elapsed % duration) / duration;
      const y = startY + (direction * progress * window.innerHeight * 1.5);
      const x = startX + Math.sin(progress * Math.PI * 2) * horizontalDrift;

      element.style.transform = `translate3d(${x - startX}px, ${y - startY}px, 0)`;
      element.style.opacity = Math.sin(progress * Math.PI) * 0.8;

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  enableUpsideDownLayers() {
    document.getElementById('abyss-bg').style.display = 'block';
    document.getElementById('veins-layer').style.display = 'block';
    document.getElementById('spores-container').style.display = 'block';
    document.getElementById('ash-container').style.display = 'block';
    document.getElementById('cursor-flashlight').style.display = 'block';
    
    for (let i = 1; i <= this.options.fogLayers; i++) {
      const fog = document.getElementById(`fog-${i}`);
      if (fog) fog.style.display = 'block';
    }
  }

  disableUpsideDownLayers() {
    document.getElementById('abyss-bg').style.display = 'none';
    document.getElementById('veins-layer').style.display = 'none';
    document.getElementById('spores-container').style.display = 'none';
    document.getElementById('ash-container').style.display = 'none';
    document.getElementById('cursor-flashlight').style.display = 'none';
    
    for (let i = 1; i <= this.options.fogLayers; i++) {
      const fog = document.getElementById(`fog-${i}`);
      if (fog) fog.style.display = 'none';
    }
  }

  updateFlashlight() {
    const flashlight = document.getElementById('cursor-flashlight');
    if (flashlight && this.currentTheme === 'upside-down') {
      flashlight.style.setProperty('--cursor-x', `${this.cursorX}px`);
      flashlight.style.setProperty('--cursor-y', `${this.cursorY}px`);
    }
  }

  expandVines() {
    if (this.currentTheme !== 'upside-down') return;
    
    const veins = document.querySelectorAll('.vein');
    veins.forEach(vein => {
      vein.style.animation = 'none';
      setTimeout(() => {
        vein.style.animation = 'vein-crawl 4s ease-in-out, vein-pulse 1s ease-in-out infinite';
      }, 10);
    });
  }

  startHeartbeat() {
    if (this.currentTheme !== 'upside-down') return;
    
    const interval = 900 + Math.random() * 300; // 0.9-1.2s
    
    this.heartbeatInterval = setInterval(() => {
      if (this.currentTheme === 'upside-down') {
        document.body.classList.add('heartbeat-pulse');
        setTimeout(() => {
          document.body.classList.remove('heartbeat-pulse');
        }, 200);
        
        // Intensify fog on heartbeat
        const fogs = document.querySelectorAll('.fog-layer');
        fogs.forEach(fog => {
          fog.style.filter = 'brightness(1.2)';
          setTimeout(() => {
            fog.style.filter = 'brightness(1)';
          }, 300);
        });
      }
    }, interval);
  }

  startGlitchSystem() {
    // Small glitch every 8-20 seconds
    const scheduleGlitch = () => {
      const delay = 8000 + Math.random() * 12000;
      setTimeout(() => {
        if (this.currentTheme === 'upside-down' && !this.isTransitioning) {
          this.triggerGlitch('small');
          scheduleGlitch();
        }
      }, delay);
    };
    
    scheduleGlitch();
  }

  triggerGlitch(intensity = 'small') {
    const body = document.body;
    
    if (intensity === 'small') {
      body.classList.add('frame-jitter');
      setTimeout(() => {
        body.classList.remove('frame-jitter');
      }, 100);
    } else if (intensity === 'medium') {
      body.classList.add('rgb-shift', 'frame-jitter');
      setTimeout(() => {
        body.classList.remove('rgb-shift', 'frame-jitter');
      }, 300);
    } else if (intensity === 'large') {
      body.classList.add('rgb-shift', 'frame-jitter', 'camera-shake');
      setTimeout(() => {
        body.classList.remove('rgb-shift', 'frame-jitter', 'camera-shake');
      }, 500);
    }
  }

  triggerDemogorgon(options = {}) {
    if (!this.options.enableJumpscare || this.settings.disableJumpscare) {
      return;
    }

    // Ramp up glitch
    this.triggerGlitch('large');

    // Create container
    const container = document.createElement('div');
    container.className = 'demogorgon-container';
    document.body.appendChild(container);

    // Create popup (using SVG or image)
    const popup = document.createElement('div');
    popup.className = 'demogorgon-popup';
    popup.innerHTML = '<svg width="400" height="400" viewBox="0 0 400 400"><circle cx="200" cy="200" r="150" fill="#E50914" opacity="0.8"><animate attributeName="r" values="150;180;150" dur="0.5s" repeatCount="2"/></circle><text x="200" y="220" text-anchor="middle" fill="white" font-size="24" font-weight="bold">DEMOGORGON</text></svg>';
    container.appendChild(popup);

    // Screen flash
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    document.body.appendChild(flash);

    // Remove after animation
    setTimeout(() => {
      container.remove();
      flash.remove();
      
      // Optional: auto-switch theme
      if (options.autoSwitchTheme) {
        setTimeout(() => {
          this.applyTheme('upside-down');
        }, 500);
      }
    }, 1000);

    // Optional audio hook
    if (this.options.enableAudio && options.audioSrc) {
      const audio = new Audio(options.audioSrc);
      audio.volume = 0.5;
      audio.play().catch(e => console.warn('Audio play failed:', e));
    }
  }

  triggerVecnaCurse(targetElement) {
    if (!targetElement) return;
    
    targetElement.classList.add('vecna-curse');
    
    // Create ghostly duplicates
    for (let i = 0; i < 2; i++) {
      const clone = targetElement.cloneNode(true);
      clone.style.position = 'absolute';
      clone.style.opacity = '0.3';
      clone.style.filter = 'blur(10px) contrast(0.5)';
      clone.style.pointerEvents = 'none';
      clone.style.zIndex = '-1';
      clone.style.transform = `translate(${i * 10}px, ${i * 10}px)`;
      targetElement.parentNode.appendChild(clone);
      
      setTimeout(() => {
        clone.remove();
      }, 3000);
    }
  }

  triggerMindFlayerCrawl(intensity = 1) {
    const shadow = document.createElement('div');
    shadow.className = 'mind-flayer-shadow';
    shadow.id = 'mind-flayer-shadow';
    document.body.appendChild(shadow);

    // Animate shadow position
    const animateShadow = () => {
      const x = 50 + Math.sin(Date.now() / 2000) * 20;
      const y = 50 + Math.cos(Date.now() / 2000) * 20;
      shadow.style.setProperty('--shadow-x', `${x}%`);
      shadow.style.setProperty('--shadow-y', `${y}%`);
      
      if (this.currentTheme === 'upside-down') {
        requestAnimationFrame(animateShadow);
      }
    };
    
    animateShadow();

    // Increase intensity
    if (intensity > 1) {
      shadow.style.animationDuration = `${20 / intensity}s`;
      document.body.classList.add('camera-shake');
      setTimeout(() => {
        document.body.classList.remove('camera-shake');
      }, 2000);
    }
  }

  playSeason4Intro(options = {}) {
    if (this.settings.skipIntro) return;
    
    const intro = document.createElement('div');
    intro.className = 'season4-intro';
    intro.id = 'season4-intro';
    document.body.appendChild(intro);

    const content = document.createElement('div');
    content.className = 'intro-content';
    
    const title = document.createElement('h1');
    title.className = 'intro-title';
    title.textContent = options.title || 'ROOM DUTY';
    content.appendChild(title);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'skip-intro-btn';
    skipBtn.textContent = 'Skip Intro';
    skipBtn.onclick = () => {
      this.skipIntro();
    };
    intro.appendChild(skipBtn);
    intro.appendChild(content);

    intro.classList.add('active');

    // Sequence animation
    setTimeout(() => {
      // Rift forms
      this.playDimensionalTear(true);
    }, 2000);

    setTimeout(() => {
      // End intro
      this.skipIntro();
      if (options.mode === 'upsidedown') {
        this.applyTheme('upside-down', false);
      }
    }, options.duration || 8000);
  }

  skipIntro() {
    const intro = document.getElementById('season4-intro');
    if (intro) {
      intro.classList.remove('active');
      setTimeout(() => {
        intro.remove();
      }, 500);
    }
    this.settings.skipIntro = true;
    this.saveSettings();
  }

  updateUIComponents() {
    // Update buttons
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach(btn => {
      if (this.currentTheme === 'hawkins') {
        btn.classList.remove('btn-upside-down');
        btn.classList.add('btn-hawkins');
      } else {
        btn.classList.remove('btn-hawkins');
        btn.classList.add('btn-upside-down');
      }
    });

    // Update cards
    const cards = document.querySelectorAll('.card, [class*="card"]');
    cards.forEach(card => {
      if (this.currentTheme === 'hawkins') {
        card.classList.remove('card-upside-down');
        card.classList.add('card-hawkins');
      } else {
        card.classList.remove('card-hawkins');
        card.classList.add('card-upside-down');
      }
    });

    // Update titles
    const titles = document.querySelectorAll('h1, h2, .hero-title');
    titles.forEach(title => {
      title.classList.add('hero-title');
    });
  }

  disableHeavyAnimations() {
    this.options.particleCount = 0;
    this.options.fogLayers = 0;
    this.disableUpsideDownLayers();
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'hawkins' ? 'upside-down' : 'hawkins';
    this.applyTheme(newTheme);
  }

  // Public API
  getTheme() {
    return this.currentTheme;
  }

  setParticleCount(count) {
    this.options.particleCount = count;
    this.settings.particleCount = count;
    this.saveSettings();
    // Recreate particles
    const container = document.getElementById('spores-container');
    if (container) {
      container.innerHTML = '';
      this.createSpores(container);
    }
  }

  setFogLayers(count) {
    this.options.fogLayers = count;
    this.settings.fogLayers = count;
    this.saveSettings();
  }

  setJumpscareEnabled(enabled) {
    this.options.enableJumpscare = enabled;
    this.settings.disableJumpscare = !enabled;
    this.saveSettings();
  }
}

// Export for ES6 modules
export default StrangerTheme;

// Also support global usage
if (typeof window !== 'undefined') {
  window.StrangerTheme = StrangerTheme;
}

