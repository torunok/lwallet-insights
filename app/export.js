import { getRoute } from './router.js';
import { PAGE_SPECS } from './config.js';

export async function exportImage(opts = {}) {
  const area = document.getElementById('screen-shot-area');
  const wrapper = document.getElementById('canvas-wrapper');
  if (!area || !wrapper) return;

  const {
    format = 'png',
    scale = 2,
    transparent = true,
    filenameSuffix = '',
  } = opts;

  if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }

  const route = area.dataset.route || getRoute();
  const spec = PAGE_SPECS[route] || {};
  const baseW = Number(area.dataset.baseWidth) || Number(spec.exportW) || Number(spec.w) || 1080;
  const baseH = Number(area.dataset.baseHeight) || Number(spec.exportH) || Number(spec.h) || 1920;

  const prevTransform = wrapper.style.transform;
  const prevWidth = wrapper.style.width;
  const prevHeight = wrapper.style.height;
  const prevCanvasWVar = area.style.getPropertyValue('--canvas-width');
  const prevCanvasHVar = area.style.getPropertyValue('--canvas-height');

  // читаємо фактичний розмір полотна
  area.style.setProperty('--canvas-width', `${baseW}px`);
  area.style.setProperty('--canvas-height', `${baseH}px`);
  const rect = area.getBoundingClientRect();
  const computed = getComputedStyle(area);
  const measuredW = Math.round(parseFloat(computed.width))  || rect.width;
  const measuredH = Math.round(parseFloat(computed.height)) || rect.height;
  const W = baseW || measuredW || 1080;
  const H = baseH || measuredH || 1920;

  wrapper.style.transform = 'none';
  wrapper.style.width = `${W}px`;
  wrapper.style.height = `${H}px`;

  try {
    const adjustPage1LayoutForDoc = (doc) => {
      if (route !== 'page-1') return;
      const docArea = doc.getElementById('screen-shot-area');
      if (!docArea) return;
      const story = docArea.querySelector('.instagram-story');
      if (!story) return;
      const group = story.querySelector('.group');
      const btc = story.querySelector('.frame');
      const eth = story.querySelector('.frame-3');
      const popular = story.querySelector('.frame-10');
      if (!group || !btc || !eth || !popular) return;

      const groupRect = group.getBoundingClientRect();
      const maxBottom = Math.max(btc.getBoundingClientRect().bottom, eth.getBoundingClientRect().bottom);
      const currentTop = popular.getBoundingClientRect().top - groupRect.top;
      const desiredGap = 24;
      const desiredTop = Math.ceil(maxBottom - groupRect.top + desiredGap);
      if (desiredTop > currentTop) {
        popular.style.setProperty('top', `${desiredTop}px`);
      }

      const market = story.querySelector('.frame-4');
      if (market) {
        const popularBottom = popular.getBoundingClientRect().bottom - groupRect.top;
        const marketTop = market.getBoundingClientRect().top - groupRect.top;
        const marketGap = 24;
        const desiredMarketTop = Math.ceil(popularBottom + marketGap);
        if (desiredMarketTop > marketTop) {
          market.style.setProperty('top', `${desiredMarketTop}px`);
        }
      }
    };

    await new Promise(requestAnimationFrame);

    const useTransparent = format === 'png' ? !!transparent : false;
    const bg = useTransparent ? null : getComputedStyle(area).backgroundColor || '#0f1116';

    const canvas = await html2canvas(area, {
      useCORS: true,
      backgroundColor: bg,
      scale: Number(scale) || 2,
      scrollX: 0, scrollY: 0,
      windowWidth: W, windowHeight: H,
      onclone: (doc) => {
        adjustPage1LayoutForDoc(doc);
      },
    });

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mime, format === 'jpeg' ? 0.92 : undefined);

    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    a.download = `lw-insights-${date}${filenameSuffix}.${format}`;
    a.href = dataUrl;
    a.click();
  } finally {
    wrapper.style.transform = prevTransform;
    wrapper.style.width = prevWidth;
    wrapper.style.height = prevHeight;
    if (prevCanvasWVar) { area.style.setProperty('--canvas-width', prevCanvasWVar); }
    else { area.style.removeProperty('--canvas-width'); }
    if (prevCanvasHVar) { area.style.setProperty('--canvas-height', prevCanvasHVar); }
    else { area.style.removeProperty('--canvas-height'); }
  }
}
