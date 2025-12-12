/* ============================================
   STRANGER THINGS CONTROLS PANEL
   ============================================
   React component for theme controls
   ============================================ */

import { useState, useEffect } from 'react';

export function StrangerControlsPanel({ themeEngine }) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'hawkins',
    enableJumpscare: true,
    particleCount: 50,
    fogLayers: 3,
    enableDemogorgon: true,
    enableVecna: true,
    enableMindFlayer: true,
    showIntro: false,
    reduceMotion: false
  });

  useEffect(() => {
    if (themeEngine) {
      const currentSettings = themeEngine.settings || {};
      setSettings(prev => ({ ...prev, ...currentSettings }));
    }
  }, [themeEngine]);

  const handleThemeToggle = () => {
    const newTheme = settings.theme === 'hawkins' ? 'upside-down' : 'hawkins';
    setSettings(prev => ({ ...prev, theme: newTheme }));
    if (themeEngine) {
      themeEngine.toggleTheme();
    }
  };

  const handleJumpscareToggle = (enabled) => {
    setSettings(prev => ({ ...prev, enableJumpscare: enabled }));
    if (themeEngine) {
      themeEngine.setJumpscareEnabled(enabled);
    }
  };

  const handleParticleChange = (count) => {
    setSettings(prev => ({ ...prev, particleCount: count }));
    if (themeEngine) {
      themeEngine.setParticleCount(count);
    }
  };

  const handleFogChange = (layers) => {
    setSettings(prev => ({ ...prev, fogLayers: layers }));
    if (themeEngine) {
      themeEngine.setFogLayers(layers);
    }
  };

  const handleDemogorgon = () => {
    if (themeEngine && settings.enableDemogorgon) {
      themeEngine.triggerDemogorgon({ autoSwitchTheme: false });
    }
  };

  const handleVecna = () => {
    if (themeEngine && settings.enableVecna) {
      const target = document.querySelector('main') || document.body;
      themeEngine.triggerVecnaCurse(target);
    }
  };

  const handleMindFlayer = () => {
    if (themeEngine && settings.enableMindFlayer) {
      themeEngine.triggerMindFlayerCrawl(2);
    }
  };

  const handleIntro = () => {
    if (themeEngine) {
      themeEngine.playSeason4Intro({ 
        title: 'ROOM DUTY',
        duration: 8000,
        mode: 'upsidedown'
      });
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-stranger-red text-white rounded-full shadow-lg hover:neon-red transition-all"
        title="Open Stranger Things Controls"
        aria-label="Open theme controls"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6M1 12h6m6 0h6"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-stranger-surface border border-stranger-border rounded-lg shadow-2xl p-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stranger-text">Stranger Things Controls</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-stranger-text-secondary hover:text-stranger-text"
          aria-label="Close controls"
        >
          ✕
        </button>
      </div>

      {/* Theme Toggle */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stranger-text">
          Theme
        </label>
        <button
          onClick={handleThemeToggle}
          className="w-full btn-stranger"
        >
          Switch to {settings.theme === 'hawkins' ? 'Upside Down' : 'Hawkins'}
        </button>
      </div>

      {/* Jumpscare Toggle */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-stranger-text">Enable Jumpscare</span>
          <input
            type="checkbox"
            checked={settings.enableJumpscare}
            onChange={(e) => handleJumpscareToggle(e.target.checked)}
            className="w-4 h-4"
          />
        </label>
        <p className="text-xs text-stranger-text-secondary">
          ⚠️ Contains flashing effects
        </p>
      </div>

      {/* Particle Density */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stranger-text">
          Particle Density: {settings.particleCount}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.particleCount}
          onChange={(e) => handleParticleChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-stranger-text-secondary">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Fog Layers */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stranger-text">
          Fog Layers: {settings.fogLayers}
        </label>
        <input
          type="range"
          min="0"
          max="5"
          value={settings.fogLayers}
          onChange={(e) => handleFogChange(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Horror Effects */}
      <div className="space-y-2 border-t border-stranger-border pt-4">
        <label className="block text-sm font-medium text-stranger-text mb-2">
          Horror Effects
        </label>
        <div className="space-y-2">
          <button
            onClick={handleDemogorgon}
            disabled={!settings.enableDemogorgon}
            className="w-full btn-stranger text-sm disabled:opacity-50"
          >
            Trigger Demogorgon
          </button>
          <button
            onClick={handleVecna}
            disabled={!settings.enableVecna}
            className="w-full btn-stranger text-sm disabled:opacity-50"
          >
            Trigger Vecna Curse
          </button>
          <button
            onClick={handleMindFlayer}
            disabled={!settings.enableMindFlayer}
            className="w-full btn-stranger text-sm disabled:opacity-50"
          >
            Trigger Mind Flayer
          </button>
        </div>
      </div>

      {/* Intro */}
      <div className="space-y-2 border-t border-stranger-border pt-4">
        <button
          onClick={handleIntro}
          className="w-full btn-stranger text-sm"
        >
          Play Season 4 Intro
        </button>
      </div>

      {/* Accessibility */}
      <div className="space-y-2 border-t border-stranger-border pt-4">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-stranger-text">Reduce Motion</span>
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => {
              setSettings(prev => ({ ...prev, reduceMotion: e.target.checked }));
              if (e.target.checked && themeEngine) {
                themeEngine.disableHeavyAnimations();
              }
            }}
            className="w-4 h-4"
          />
        </label>
      </div>
    </div>
  );
}

