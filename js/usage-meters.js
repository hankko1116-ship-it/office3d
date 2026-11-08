/* 流量表：林怡瑄（Grok）、GPT、Claude 頭上各一個半圓儀表，跟著人走，顯示 usage.json 的額度已使用 %。
 * usage.json 由 tools/live-usage.py 每分鐘重新產生並上線；這裡每 20 秒重新抓一次，數字變了就重畫，不用重新整理。
 * 儀表上寫的是每份紀錄的實際資料時間。不吃滑鼠事件；頭上的工作／對話泡泡會往上讓開，不會疊在一起。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const POLL = 20 * 1000;
  const R = 34, LEN = Math.PI * R; // 半圓弧長
  const ARC = 'M ' + (40 - R) + ' 40 A ' + R + ' ' + R + ' 0 0 1 ' + (40 + R) + ' 40';

  const short = (s) => (s ? s.slice(5).replace('-', '/') : '—'); // 2026-11-08 14:13 → 11/08 14:13
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const color = (p) => (p >= 85 ? '#ff5a4e' : p >= 60 ? '#ffb020' : '#46d483');
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const fmt = (n) => {
    if (n == null) return '—';
    if (n >= 1e8) return (n / 1e8).toFixed(2) + ' 億';
    if (n >= 1e4) return Math.round(n / 1e4).toLocaleString('en-US') + ' 萬';
    return n.toLocaleString('en-US');
  };

  // 每個人：用 usage.json 的哪一欄、大字是哪個 %、下面那行小字
  const METERS = [
    { id: 'linyixuan', key: 'grok', name: 'Grok', win: '本週',
      pick: (u) => u.limits && u.limits.week,
      sub: () => '已使用・與方案其他應用共用' },
    { id: 'gpt', key: 'gpt', name: 'GPT', win: '7 天',
      pick: (u) => u.limits && u.limits.week,
      sub: (u) => {
        const f = u.limits && u.limits.fiveHour;
        if (!f || f.usedPercent == null) return '7 天額度已使用';
        return f.resetPassed ? '5 小時額度：已重設' : '5 小時額度 ' + f.usedPercent + '%';
      } },
    { id: 'claude', key: 'claude', name: 'Claude', win: '本週',
      pick: (u) => u.limits && u.limits.week,
      sub: (u) => '7 天 ' + fmt(u.tokens7d) + ' token・今天 ' + fmt(u.tokensToday) },
  ];

  function dial(p) {
    const c = p == null ? 'rgba(255,255,255,0.45)' : color(p);
    return '<div class="g-dial"><svg viewBox="0 0 80 44" width="96" height="53">' +
      '<path d="' + ARC + '" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="8" stroke-linecap="round"/>' +
      (p == null ? '' : '<path d="' + ARC + '" fill="none" stroke="' + c + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' +
        ((LEN * p) / 100).toFixed(1) + ' ' + LEN.toFixed(1) + '"/>') + '</svg>' +
      (p == null ? '<b class="g-none">額度 % 本機沒有</b>' : '<b style="color:' + c + '">' + p + '%</b>') + '</div>';
  }

  function render(m, u) {
    if (!u) return '<div class="g-title">' + m.name + ' 流量</div><div class="g-src">讀不到用量紀錄</div>';
    const w = m.pick(u);
    const p = w && w.usedPercent != null ? Math.max(0, Math.min(100, w.usedPercent)) : null;
    const plan = u.plan ? '<em>' + esc(cap(u.plan)) + '</em>' : '';
    return '<div class="g-title">' + m.name + (p == null ? ' 流量' : ' ' + m.win + '流量') + plan + '</div>' +
      dial(p) +
      '<div class="g-sub">' + esc(m.sub(u)) + '</div>' +
      (w && w.resetsAt ? '<div class="g-src">' + short(w.resetsAt) + (w.resetPassed ? ' 已重設' : ' 重設') + '</div>' : '') +
      '<div class="g-src">資料 ' + short(u.asOf) + '</div>';
  }

  function start(app) {
    const layer = document.getElementById('bubbles');
    const list = [];
    METERS.forEach((m) => {
      const a = app.sim.byId[m.id];
      const rig = app.rigs[m.id];
      if (!a || !rig) return;
      const el = document.createElement('div');
      el.className = 'usage-meter ' + m.key;
      el.style.display = 'none';
      layer.appendChild(el);
      list.push({ m, a, rig, el, bub: app.bubbles[m.id], html: '', shown: false, h: 0 }); // h：高度（px），重畫過才重量
    });

    async function load() {
      let json = null;
      try {
        const r = await fetch('usage.json?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        json = await r.json();
      } catch (e) {
        console.warn('[office3d] 讀不到 usage.json（流量表）：', e.message);
        if (list.some((x) => x.html)) return; // 暫時讀不到就先留著上一次的數字
      }
      list.forEach((x) => {
        const html = render(x.m, json && json[x.m.key]);
        if (html === x.html) return; // 數字沒變不重畫
        x.html = html;
        x.el.innerHTML = html;
        x.h = 0;
      });
    }
    load();
    setInterval(load, POLL);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); }); // 切回分頁馬上更新

    const v = new app.camera.position.constructor();
    function frame() {
      requestAnimationFrame(frame);
      const W = window.innerWidth, H = window.innerHeight;
      list.forEach((x) => {
        let show = x.a.visible;
        if (show) {
          v.set(x.a.x, 2.3 + x.rig.cur.figY, x.a.z).project(app.camera);
          show = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
          if (show) x.el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)';
        }
        if (show !== x.shown) {
          x.el.style.display = show ? 'block' : 'none';
          x.shown = show;
        }
        // 頭上的泡泡排在流量表上面
        if (x.shown && !x.h) x.h = x.el.offsetHeight;
        if (x.bub) x.bub.lift = x.shown ? x.h + 6 : 0;
      });
    }
    requestAnimationFrame(frame);
  }

  // 等 main.js 把場景建好（O.app 出現）再開始
  (function wait() {
    if (O.app && O.app.camera && O.app.sim) start(O.app);
    else setTimeout(wait, 200);
  })();
})();
