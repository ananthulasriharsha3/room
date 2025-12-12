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
    // Hide the control panel button
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-[#131316] border border-[#2A2A2A] rounded-lg shadow-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold text-[#E4E4E4]">Stranger Things Controls</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[#A0A0A0] hover:text-[#E4E4E4]"
          aria-label="Close controls"
        >
          ✕
        </button>
      </div>

      {/* Theme Toggle */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#E4E4E4]">
          Theme
        </label>
        <div className="text-sm text-[#A0A0A0] p-2 bg-[#0B0B0D] rounded border border-[#2A2A2A]">
          <p className="font-semibold text-[#E50914] mb-1">Upside Down Mode</p>
          <p className="text-xs">Continuous horror effects are active</p>
        </div>
      </div>

      {/* Jumpscare Toggle */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#E4E4E4]">Enable Jumpscare</span>
          <input
            type="checkbox"
            checked={settings.enableJumpscare}
            onChange={(e) => handleJumpscareToggle(e.target.checked)}
            className="w-4 h-4"
          />
        </label>
        <p className="text-xs text-[#A0A0A0]">
          ⚠️ Contains flashing effects
        </p>
      </div>

      {/* Particle Density */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#E4E4E4]">
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
        <div className="flex justify-between text-xs text-[#A0A0A0]">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Fog Layers */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#E4E4E4]">
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

      {/* Intro */}
      <div className="space-y-2 border-t border-[#2A2A2A] pt-4">
        <button
          onClick={handleIntro}
          className="w-full bg-[#E50914] text-white px-4 py-2 rounded font-semibold hover:shadow-[0_0_20px_rgba(229,9,20,0.8)] transition-all text-sm"
        >
          Play Season 4 Intro
        </button>
      </div>

      {/* Accessibility */}
      <div className="space-y-2 border-t border-[#2A2A2A] pt-4">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#E4E4E4]">Reduce Motion</span>
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

