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

  const vh = window.innerHeight - 80;
  const vw = window.innerWidth - 32;
  const scale = Math.min(vw / TARGET_W, vh / TARGET_H);

  wrapper.style.transformOrigin = 'top left';
  wrapper.style.transform = `scale(${scale})`;
  wrapper.style.width = `${TARGET_W}px`;
  wrapper.style.height = `${TARGET_H}px`;
}
