/* 用量牌：GPT、Claude 座位桌子前面各掛一塊小牌，顯示 usage.json 的用量。
 * usage.json 由 tools/collect-usage.py 從這台電腦的本機紀錄產生（不是即時），牌子上會寫資料來源和時間。
 * 牌子固定在桌子正面，不跟著人走，不擋頭上的泡泡；不吃滑鼠事件，不影響拖曳、點人物。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const IDS = ['gpt', 'claude'];
  const plates = {};

  const fmt = (n) => {
    if (n == null) return '—';
    if (n >= 1e8) return (n / 1e8).toFixed(2) + ' 億';
    if (n >= 1e4) return Math.round(n / 1e4).toLocaleString('en-US') + ' 萬';
    return n.toLocaleString('en-US');
  };
  const short = (s) => (s ? s.slice(5).replace('-', '/') : '—'); // 2026-11-06 23:43 → 11/06 23:43
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function bar(label, w) {
    if (!w || w.usedPercent == null) return '';
    const p = Math.max(0, Math.min(100, w.usedPercent));
    const tail = w.resetPassed ? '（已重置）' : '';
    return '<div class="u-row"><span>' + label + '</span><b>' + p + '%</b><i>' + tail + '</i></div>' +
      '<div class="u-bar"><span style="width:' + p + '%"></span></div>';
  }

  function render(id, u) {
    const el = plates[id].el;
    if (!u) {
      el.innerHTML = '<div class="u-title">' + (id === 'gpt' ? 'GPT' : 'Claude') + ' 用量</div><div class="u-src">讀不到用量紀錄</div>';
      return;
    }
    let h = '<div class="u-title">' + esc(u.label) + ' 用量' + (u.plan ? '<em>' + esc(u.plan) + '</em>' : '') + '</div>';
    if (u.limits) {
      h += bar('7 天額度', u.limits.week) + bar('5 小時', u.limits.fiveHour);
      h += '<div class="u-row"><span>7 天 token</span><b>' + fmt(u.tokens7d) + '</b></div>';
    } else {
      h += '<div class="u-row"><span>今天 token</span><b>' + fmt(u.tokensToday) + '</b></div>';
      h += '<div class="u-row"><span>7 天 token</span><b>' + fmt(u.tokens7d) + '</b></div>';
      h += '<div class="u-src u-note">額度 % 本機沒有紀錄</div>';
    }
    h += '<div class="u-src">' + esc(u.source) + ' ' + short(u.asOf) + '・非即時</div>';
    el.innerHTML = h;
    el.title = (u.source || '') + '，資料時間 ' + (u.asOf || '') + '（台北時間，非即時）；token 含快取讀取';
  }

  function apply(json) {
    IDS.forEach((id) => render(id, json && json[id]));
  }

  async function load() {
    try {
      const r = await fetch('usage.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      apply(await r.json());
    } catch (e) {
      console.warn('[office3d] 讀不到 usage.json：', e.message);
      apply(null);
    }
  }

  function start(app) {
    const layer = document.getElementById('bubbles');
    IDS.forEach((id) => {
      const m = O.TEAM.find((t) => t.id === id);
      if (!m) return;
      const el = document.createElement('div');
      el.className = 'usage-plate ' + id;
      layer.appendChild(el);
      // 桌子前緣（座位往面向的方向），牌子從桌面邊緣往下掛
      const f = ((m.seat.face || 0) * Math.PI) / 180;
      const dist = ((m.desk && m.desk.dist) != null ? m.desk.dist : 0.75) + 0.45;
      plates[id] = { el, x: m.seat.x + Math.sin(f) * dist, y: 0.72, z: m.seat.z + Math.cos(f) * dist, shown: true };
    });
    load();
    setInterval(load, 5 * 60 * 1000);

    const v = new app.camera.position.constructor();
    function frame() {
      requestAnimationFrame(frame);
      const W = window.innerWidth, H = window.innerHeight;
      IDS.forEach((id) => {
        const p = plates[id];
        if (!p) return;
        v.set(p.x, p.y, p.z).project(app.camera);
        const show = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        if (show) p.el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,0)';
        if (show !== p.shown) {
          p.el.style.display = show ? 'block' : 'none';
          p.shown = show;
        }
      });
    }
    requestAnimationFrame(frame);
  }

  // 等 main.js 把場景建好（O.app 出現）再開始
  (function wait() {
    if (O.app && O.app.camera) start(O.app);
    else setTimeout(wait, 200);
  })();
})();
