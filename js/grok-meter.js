/* 流量表：林怡瑄（Grok）頭上的半圓儀表，跟著人走，顯示 usage.json 裡 grok 的本週額度已使用 %。
 * 數字是手動核對後寫進 usage.json 的（不是即時），儀表上會寫資料時間。
 * 不吃滑鼠事件；她頭上的工作／對話泡泡會往上讓開，不會疊在一起。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const ID = 'linyixuan';
  const R = 34, LEN = Math.PI * R; // 半圓弧長

  const short = (s) => (s ? s.slice(5).replace('-', '/') : '—'); // 2026-11-08 14:13 → 11/08 14:13
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const color = (p) => (p >= 85 ? '#ff5a4e' : p >= 60 ? '#ffb020' : '#46d483');

  function render(el, g) {
    const w = g && g.limits && g.limits.week;
    if (!w || w.usedPercent == null) {
      el.innerHTML = '<div class="g-title">Grok 流量</div><div class="g-src">讀不到用量紀錄</div>';
      return;
    }
    const p = Math.max(0, Math.min(100, w.usedPercent));
    const arc = 'M ' + (40 - R) + ' 40 A ' + R + ' ' + R + ' 0 0 1 ' + (40 + R) + ' 40';
    el.innerHTML =
      '<div class="g-title">Grok 本週流量' + (g.plan ? '<em>' + esc(g.plan) + '</em>' : '') + '</div>' +
      '<div class="g-dial"><svg viewBox="0 0 80 44" width="96" height="53">' +
      '<path d="' + arc + '" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="' + arc + '" fill="none" stroke="' + color(p) + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' +
      ((LEN * p) / 100).toFixed(1) + ' ' + LEN.toFixed(1) + '"/></svg>' +
      '<b style="color:' + color(p) + '">' + p + '%</b></div>' +
      '<div class="g-sub">已使用・與方案其他應用共用</div>' +
      '<div class="g-src">' + short(w.resetsAt) + ' 重設</div>' +
      '<div class="g-src">資料 ' + short(g.asOf) + '・非即時</div>';
  }

  function start(app) {
    const a = app.sim.byId[ID];
    const rig = app.rigs[ID];
    const bub = app.bubbles[ID];
    if (!a || !rig) return;
    const el = document.createElement('div');
    el.className = 'grok-meter';
    el.style.display = 'none';
    document.getElementById('bubbles').appendChild(el);
    let shown = false, h = 0; // h：流量表高度（px），重新畫過才重量

    async function load() {
      let g = null;
      try {
        const r = await fetch('usage.json?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        g = (await r.json()).grok;
      } catch (e) {
        console.warn('[office3d] 讀不到 usage.json（Grok 流量表）：', e.message);
      }
      render(el, g);
      h = 0;
    }
    load();
    setInterval(load, 5 * 60 * 1000);

    const v = new app.camera.position.constructor();
    function frame() {
      requestAnimationFrame(frame);
      const W = window.innerWidth, H = window.innerHeight;
      let show = a.visible;
      if (show) {
        v.set(a.x, 2.3 + rig.cur.figY, a.z).project(app.camera);
        show = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        if (show) el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)';
      }
      if (show !== shown) {
        el.style.display = show ? 'block' : 'none';
        shown = show;
      }
      // 頭上的泡泡排在流量表上面
      if (shown && !h) h = el.offsetHeight;
      if (bub) bub.lift = shown ? h + 6 : 0;
    }
    requestAnimationFrame(frame);
  }

  // 等 main.js 把場景建好（O.app 出現）再開始
  (function wait() {
    if (O.app && O.app.camera && O.app.sim) start(O.app);
    else setTimeout(wait, 200);
  })();
})();
