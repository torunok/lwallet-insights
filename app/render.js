import { page1 } from './components/page1.js';
import { page2 } from './components/page2.js';
import { pageCombined, updateFearGauge } from './components/pageCombined.js';

export function render(route, state) {
  const root = document.getElementById('screen-shot-area');
  if (!root) return;

  const applyFearGauge = () => {
    if (typeof state.fearGreed === 'number') {
      updateFearGauge(state.fearGreed);
    }
  };

  switch (route) {
    case 'tg':
      root.innerHTML = pageCombined(state);
      applyFearGauge();
      break;

    case 'page-2':
      root.innerHTML = page2(state);
      applyFearGauge();
      break;

    case 'page-1':
    default:
      root.innerHTML = page1(state);
      applyFearGauge();
      break;
  }
}

