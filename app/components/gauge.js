export function gauge(value = 50) {
  const safe = clamp(value, 0, 100);
  const deg = mapToDeg(safe); // 0..100 -> 0..180

  return `
    <section class="gauge">
      <h3>Індекс страху та жадібності</h3>
      <div class="gauge-canvas">
        <div class="gauge-dial"></div>
        <div class="gauge-needle" style="transform: translateX(-50%) rotate(${deg}deg)"></div>
      </div>
      <div class="gauge-value">${safe}</div>
      <div class="gauge-labels">
        <span>Страх</span>
        <span>Нейтрально</span>
        <span>Жадібність</span>
      </div>
    </section>
  `;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, Number(n) || 0)); }
function mapToDeg(n) { return (n / 100) * 180; }
