import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Intercept and prevent flashlight element creation at the DOM level
(function preventFlashlightCreation() {
  const isFlashlightElement = (element) => {
    if (!element || typeof element !== 'object') return false;
    
    // Check ID
    if (element.id === 'cursor-flashlight' || 
        (typeof element.id === 'string' && element.id.includes('flashlight'))) {
      return true;
    }
    
    // Check classList
    if (element.classList && element.classList.contains('cursor-flashlight')) {
      return true;
    }
    
    // Check className (can be string or DOMTokenList)
    if (element.className) {
      const classNameStr = typeof element.className === 'string' 
        ? element.className 
        : String(element.className);
      if (classNameStr.includes('flashlight') || classNameStr.includes('cursor-flashlight')) {
        return true;
      }
    }
    
    return false;
  };
  
  const isScanlineElement = (element) => {
    if (!element || typeof element !== 'object') return false;
    if (element.classList && element.classList.contains('scanlines')) {
      return true;
    }
    if (element.className) {
      const classNameStr = typeof element.className === 'string' 
        ? element.className 
        : String(element.className);
      if (classNameStr.includes('scanlines')) {
        return true;
      }
    }
    return false;
  };
  
  // Override appendChild to catch flashlight and scanline elements
  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child) {
    if (isFlashlightElement(child)) {
      console.log('Prevented flashlight element creation');
      return child; // Don't actually append it
    }
    if (isScanlineElement(child)) {
      console.log('Prevented scanline element creation');
      return child; // Don't actually append it
    }
    return originalAppendChild.call(this, child);
  };
  
  // Override insertBefore as well
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    if (isFlashlightElement(newNode)) {
      console.log('Prevented flashlight element insertion');
      return newNode; // Don't actually insert it
    }
    if (isScanlineElement(newNode)) {
      console.log('Prevented scanline element insertion');
      return newNode; // Don't actually insert it
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
})();

// Aggressively remove veins layer, spores, ash and other animated elements
(function removeAnimatedElements() {
  const removeAnimated = () => {
    // Remove veins
    const veinsLayer = document.getElementById('veins-layer');
    if (veinsLayer) {
      veinsLayer.style.display = 'none';
      veinsLayer.style.visibility = 'hidden';
      veinsLayer.style.opacity = '0';
      veinsLayer.remove();
    }
    const allVeins = document.querySelectorAll('.veins-layer, .vein, svg path.vein');
    allVeins.forEach(el => {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
      el.remove();
    });
    
    // Remove spores and ash (snow particles)
    const spores = document.getElementById('spores-container');
    if (spores) {
      spores.style.display = 'none';
      spores.style.visibility = 'hidden';
      spores.style.opacity = '0';
      spores.remove();
    }
    const ash = document.getElementById('ash-container');
    if (ash) {
      ash.style.display = 'none';
      ash.style.visibility = 'hidden';
      ash.style.opacity = '0';
      ash.remove();
    }
    const allParticles = document.querySelectorAll('.spores-container, .ash-container, .spore, .ash-flake, .ash-ember');
    allParticles.forEach(el => {
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
  };
  removeAnimated();
  
  if (document.body) {
    const observer = new MutationObserver(() => {
      removeAnimated();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(removeAnimated, 200);
  }
})();

// Aggressively remove cursor flashlight effect immediately
(function removeFlashlight() {
  const removeAllFlashlights = () => {
    // Remove by ID
    const byId = document.getElementById('cursor-flashlight');
    if (byId) {
      byId.style.display = 'none';
      byId.style.visibility = 'hidden';
      byId.style.opacity = '0';
      byId.remove();
    }
    
    // Remove by class
    const byClass = document.querySelectorAll('.cursor-flashlight');
    byClass.forEach(el => {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
      el.remove();
    });
    
    // Remove any element with flashlight in ID or class
    const allElements = document.querySelectorAll('[id*="flashlight"], [class*="flashlight"]');
    allElements.forEach(el => {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
      el.remove();
    });
    
    // Remove any fixed position element with radial-gradient that might follow cursor
    const allFixed = document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"]');
    allFixed.forEach(el => {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundImage || '';
      const inlineStyle = el.getAttribute('style') || '';
      
      // Check if it has radial gradient with cursor variables or is full screen
      if ((bg.includes('radial-gradient') && (bg.includes('cursor') || bg.includes('var(--cursor'))) ||
          (inlineStyle.includes('radial-gradient') && (inlineStyle.includes('cursor') || inlineStyle.includes('--cursor'))) ||
          (el.style.backgroundImage && el.style.backgroundImage.includes('radial-gradient') && 
           (el.style.backgroundImage.includes('cursor') || el.style.backgroundImage.includes('--cursor')))) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.remove();
      }
      
      // Also check if it's a full-screen overlay that might be the flashlight
      if (style.width === '100%' && style.height === '100%' && 
          (style.position === 'fixed' || style.position === 'absolute') &&
          (bg.includes('radial-gradient') || inlineStyle.includes('radial-gradient'))) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.remove();
      }
    });
  };
  
  // Remove immediately
  if (document.body) {
    removeAllFlashlights();
  }
  
  // Remove on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAllFlashlights);
  } else {
    removeAllFlashlights();
  }
  
  // Watch for new elements being added
  if (document.body) {
    const observer = new MutationObserver(() => {
      removeAllFlashlights();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'id']
    });
    
    // Also remove periodically as backup - more frequent
    setInterval(removeAllFlashlights, 200);
  }
  
  // Also remove on window load
  window.addEventListener('load', removeAllFlashlights);
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

