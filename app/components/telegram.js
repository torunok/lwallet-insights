// app/components/telegram.js
import { page1 } from './page1.js';
import { page2 } from './page2.js';

export function pageTelegram(state) {
  return `
  <article class="tg-post">
    <div class="tg-board">
      <section class="tg-column tg-column-left">
        <div class="tg-scale tg-scale-left">
          ${page1(state)}
        </div>
      </section>
      <section class="tg-column tg-column-right">
        <div class="tg-scale tg-scale-right">
          ${page2(state)}
        </div>
      </section>
    </div>
  </article>`;
}
