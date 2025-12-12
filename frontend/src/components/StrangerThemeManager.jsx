import { useEffect, useRef } from 'react';
import StrangerTheme from '../stranger-theme/theme.js';
import { StrangerControlsPanel } from './StrangerControlsPanel';

let themeEngineInstance = null;

export function StrangerThemeManager() {
  const engineRef = useRef(null);

  useEffect(() => {
    // Aggressively remove any flashlight elements BEFORE initializing theme
    const removeFlashlights = () => {
      const allFlashlights = document.querySelectorAll('#cursor-flashlight, .cursor-flashlight, [id*="flashlight"], [class*="flashlight"]');
      allFlashlights.forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.remove();
      });
    };
    removeFlashlights();
    
    // Initialize theme engine only once
    if (!themeEngineInstance) {
      // Force Upside Down theme on body immediately
      document.body.className = 'theme-upside-down';
      
      // Remove flashlights again right before creating theme
      removeFlashlights();
      
      themeEngineInstance = new StrangerTheme({
        defaultTheme: 'upside-down', // Only Upside Down theme
        enableJumpscare: true, // Enable for continuous effects
        particleCount: 80, // More particles for better visibility
        fogLayers: 4, // More fog layers
        glitchIntensity: 0.5, // Higher glitch intensity
        continuousEffects: true, // Enable continuous random effects
        autoHorrorEffects: true // Auto-trigger horror effects randomly
      });
      
      // Make it globally accessible
      window.strangerThemeEngine = themeEngineInstance;
      
      // Remove flashlights after theme initialization
      setTimeout(removeFlashlights, 100);
    }
    
    engineRef.current = themeEngineInstance;
    
    // Set up continuous removal
    const removalInterval = setInterval(() => {
      // Remove flashlights
      const allFlashlights = document.querySelectorAll('#cursor-flashlight, .cursor-flashlight, [id*="flashlight"], [class*="flashlight"]');
      allFlashlights.forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.remove();
      });
      // Remove scanlines
      const allScanlines = document.querySelectorAll('.scanlines');
      allScanlines.forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.remove();
      });
    }, 100);
    
    return () => {
      clearInterval(removalInterval);
    };

    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <>
      <StrangerControlsPanel themeEngine={engineRef.current} />
    </>
  );
}

export function getStrangerThemeEngine() {
  return themeEngineInstance || window.strangerThemeEngine;
}

