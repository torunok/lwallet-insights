let TARGET_W = 1080;
let TARGET_H = 1920;

export function setTargetSize(w, h) {
  TARGET_W = Number(w) || 1080;
  TARGET_H = Number(h) || 1920;
}

export function initAutoscale() { applyScale(); }

export function applyScale() {
  const wrapper = document.getElementById('canvas-wrapper');
  if (!wrapper) return;

  // Визначаємо висоту appbar для правильного розрахунку
  const appbarHeight = 80;
  const padding = 32;
  
  // Для великих екранів збільшуємо відступи
  let adjustedPadding = padding;
  let adjustedAppbarHeight = appbarHeight;
  
  if (window.innerWidth >= 3840 && window.innerHeight >= 2160) {
    // 4K
    adjustedPadding = 56;
    adjustedAppbarHeight = 96;
  } else if (window.innerWidth >= 2560 && window.innerHeight >= 1440) {
    // 2K
    adjustedPadding = 40;
    adjustedAppbarHeight = 88;
  }

  const vh = window.innerHeight - adjustedAppbarHeight;
  const vw = window.innerWidth - adjustedPadding;
  const scale = Math.min(vw / TARGET_W, vh / TARGET_H);

  // Для великих екранів використовуємо центрування
  const isLargeScreen = window.innerWidth >= 2560 && window.innerHeight >= 1440;
  wrapper.style.transformOrigin = isLargeScreen ? 'center center' : 'top left';
  wrapper.style.transform = `scale(${scale})`;
  wrapper.style.width = `${TARGET_W}px`;
  wrapper.style.height = `${TARGET_H}px`;
}
