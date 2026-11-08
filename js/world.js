/* 場景：地板、窗牆、玻璃隔間、家具、桌上小物、窗外城市。
 * 家具位置寫在 js/layout.js 的 furniture；這裡負責把它們畫出來。
 * 家具都是靜態的，最後會合併成少數幾個網格以維持流暢（時鐘指針、電玩手把這種會動的除外）。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const DEG = Math.PI / 180;
  let K, gold, silver, screenTex, F;

  const C = {
    wall: '#4b4038', frame: '#2a2a2e', wood: '#c8995f', woodDark: '#3b2a20',
    deskSide: '#5b5d63', pot: '#efefec', leaf: '#3f8a3a', leaf2: '#5aa64a',
  };

  O.buildWorld = function (scene) {
    K = O.Kit;
    F = O.LAYOUT.furniture;
    gold = K.mat('#d4a838', { metal: 0.85, rough: 0.3 });
    silver = K.mat('#c8ccd2', { metal: 0.8, rough: 0.3 });
    screenTex = makeScreenTexture();
    const S = new THREE.Group();
    const out = { desks: {}, city: null, clocks: [], controllers: [], tv: null };
    floor(S);
    exteriorWalls(S, out);
    roomWalls(S);
    bossRoom(S);
    meetingRoom(S);
    auditRoom(S);
    pantry(S, out);
    workZone(S);
    lounge(S, out);
    F.plants.forEach((p) => plant(S, p.x, p.z, p.s));
    F.floorLamps.forEach((p) => floorLamp(S, p.x, p.z));
    railings(S);
    signs(S);
    O.TEAM.forEach((m) => memberSeat(S, m, out));
    K.mergeDeep(S);
    scene.add(S);
    out.group = S;
    out.city = city(scene);
    return out;
  };

  /* ------------------------------------------------------------ 貼圖 */
  function marbleTexture(base, vein, seed) {
    const t = K.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      const r = K.rng(seed);
      g.strokeStyle = vein;
      for (let i = 0; i < 9; i++) {
        g.lineWidth = 1 + r() * 2.5;
        g.globalAlpha = 0.25 + r() * 0.5;
        g.beginPath();
        g.moveTo(r() * w, r() * h);
        g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h);
        g.stroke();
      }
      g.globalAlpha = 1;
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function makeScreenTexture() {
    return K.canvasTexture(128, 80, (g, w, h) => {
      g.fillStyle = '#16233b';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#25395c';
      g.fillRect(0, 0, w, 9);
      const r = K.rng(3);
      const cols = ['#7fd3ff', '#ffd27f', '#a8f0b8', '#e8e8ff'];
      for (let y = 14; y < h - 4; y += 7) {
        const ind = 6 + Math.floor(r() * 3) * 8;
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(ind, y, 20 + r() * 70, 3);
      }
    });
  }
  function chartTexture() {
    return K.canvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#0f1a2e';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#25406a';
      g.lineWidth = 2;
      for (let y = 40; y < 220; y += 36) {
        g.beginPath(); g.moveTo(24, y); g.lineTo(300, y); g.stroke();
      }
      const bars = [50, 80, 70, 110, 95, 140, 165];
      bars.forEach((v, i) => {
        g.fillStyle = i === bars.length - 1 ? '#7fe0ff' : '#3fa9e0';
        g.fillRect(36 + i * 38, 220 - v, 24, v);
      });
      g.strokeStyle = '#9ff0c0';
      g.lineWidth = 4;
      g.beginPath();
      bars.forEach((v, i) => (i ? g.lineTo(48 + i * 38, 200 - v) : g.moveTo(48, 200 - v)));
      g.stroke();
      g.lineWidth = 26;
      [['#3fa9e0', 0, 1.3], ['#7fe0ff', 1.3, 2.4], ['#f2c35a', 2.4, 3.5], ['#2b4a78', 3.5, Math.PI * 2]].forEach((s) => {
        g.strokeStyle = s[0];
        g.beginPath(); g.arc(410, 128, 62, s[1], s[2]); g.stroke();
      });
    });
  }
  // 會議室大螢幕：簡報畫面（只有圖形，沒有文字）
  function slideTexture() {
    return K.canvasTexture(512, 288, (g, w, h) => {
      g.fillStyle = '#f4f6fa';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#2b4a78';
      g.fillRect(0, 0, w, 40);
      g.fillStyle = '#ffffff';
      g.fillRect(24, 14, 160, 12);
      // 三個步驟方塊 + 箭頭
      ['#3fa9e0', '#f2b632', '#4cc47a'].forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(40 + i * 150, 80, 110, 70);
        g.fillStyle = '#ffffff';
        g.fillRect(56 + i * 150, 104, 78, 8);
        g.fillRect(56 + i * 150, 120, 50, 8);
        if (i < 2) {
          g.fillStyle = '#7a8597';
          g.beginPath();
          g.moveTo(158 + i * 150, 105); g.lineTo(184 + i * 150, 115); g.lineTo(158 + i * 150, 125);
          g.fill();
        }
      });
      g.fillStyle = '#c8d0dc';
      for (let i = 0; i < 4; i++) g.fillRect(40, 182 + i * 22, 260 - i * 40, 10);
      g.fillStyle = '#4cc47a';
      g.beginPath(); g.arc(410, 220, 44, -Math.PI / 2, Math.PI); g.lineTo(410, 220); g.fill();
      g.fillStyle = '#d6dde8';
      g.beginPath(); g.arc(410, 220, 44, Math.PI, Math.PI * 1.5); g.lineTo(410, 220); g.fill();
    });
  }
  // 白板上的塗鴉：流程圖、長條圖、打勾清單、笑臉、便利貼、一句口號
  function doodleTexture() {
    return K.canvasTexture(512, 290, (g, w, h) => {
      g.fillStyle = '#fbfbf8';
      g.fillRect(0, 0, w, h);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      // 流程圖
      g.strokeStyle = '#2a5ac0';
      g.lineWidth = 4;
      [[24, 30], [24, 110], [24, 190]].forEach(([x, y], i) => {
        g.strokeRect(x, y, 96, 46);
        if (i < 2) {
          g.beginPath(); g.moveTo(x + 48, y + 48); g.lineTo(x + 48, y + 78);
          g.moveTo(x + 40, y + 70); g.lineTo(x + 48, y + 79); g.lineTo(x + 56, y + 70); g.stroke();
        }
      });
      g.fillStyle = '#2a5ac0';
      [[40, 50], [40, 130], [40, 210]].forEach(([x, y]) => g.fillRect(x, y, 60, 6));
      // 長條圖
      g.strokeStyle = '#2f8a3a';
      g.beginPath(); g.moveTo(160, 40); g.lineTo(160, 160); g.lineTo(300, 160); g.stroke();
      g.fillStyle = '#4cc47a';
      [40, 70, 55, 95].forEach((v, i) => g.fillRect(176 + i * 30, 158 - v, 20, v));
      g.strokeStyle = '#c0302a';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(186, 120); g.lineTo(216, 90); g.lineTo(246, 104); g.lineTo(280, 56);
      g.lineTo(272, 58); g.moveTo(280, 56); g.lineTo(280, 66); g.stroke();
      // 打勾清單
      for (let i = 0; i < 3; i++) {
        const y = 40 + i * 36;
        g.strokeStyle = '#333';
        g.lineWidth = 3;
        g.strokeRect(330, y, 20, 20);
        g.strokeStyle = '#c0302a';
        g.lineWidth = 4;
        g.beginPath(); g.moveTo(333, y + 10); g.lineTo(341, y + 18); g.lineTo(356, y - 2); g.stroke();
        g.strokeStyle = '#555';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(364, y + 10); g.lineTo(440 - i * 14, y + 10); g.stroke();
      }
      // 笑臉
      g.strokeStyle = '#e07a1a';
      g.lineWidth = 4;
      g.beginPath(); g.arc(200, 225, 28, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(200, 228, 16, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      g.fillStyle = '#e07a1a';
      g.fillRect(189, 213, 6, 6); g.fillRect(205, 213, 6, 6);
      // 便利貼
      [['#ffe066', 452, 26, 0.08], ['#ff9ec4', 456, 96, -0.06], ['#9be3ff', 450, 166, 0.05]].forEach(([c, x, y, a]) => {
        g.save(); g.translate(x + 24, y + 24); g.rotate(a);
        g.fillStyle = c; g.fillRect(-24, -24, 48, 48);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-16, -8, 32, 4); g.fillRect(-16, 4, 22, 4);
        g.restore();
      });
      // 口號
      g.fillStyle = '#c0302a';
      g.font = 'bold 30px ' + K.FONT;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText('把事情做完就好！', 262, 230);
      g.strokeStyle = '#c0302a';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(262, 252); g.lineTo(492, 248); g.stroke();
    });
  }
  // 掛畫（抽象畫）
  function paintingTexture(kind) {
    return K.canvasTexture(256, 192, (g, w, h) => {
      if (kind === 0) {
        // 山與太陽
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#ffcf8a'); sky.addColorStop(1, '#ff8a6a');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(180, 62, 28, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#5a6fa8'; g.beginPath(); g.moveTo(0, 150); g.lineTo(80, 70); g.lineTo(150, 150); g.fill();
        g.fillStyle = '#3c4f86'; g.beginPath(); g.moveTo(90, 160); g.lineTo(170, 90); g.lineTo(256, 160); g.fill();
        g.fillStyle = '#2f6b4a'; g.fillRect(0, 150, w, h - 150);
      } else {
        // 色塊
        g.fillStyle = '#f6f1e6'; g.fillRect(0, 0, w, h);
        [['#e0503c', 14, 14, 110, 90], ['#f2b632', 134, 14, 108, 54], ['#2a5ac0', 134, 78, 60, 100], ['#3fa7b5', 14, 114, 110, 64], ['#222', 204, 78, 38, 100]]
          .forEach(([c, x, y, ww, hh]) => { g.fillStyle = c; g.fillRect(x, y, ww, hh); });
      }
    });
  }
  // 電視：沒在玩時的暗畫面、打電動時的遊戲畫面（方塊小人跑關卡，沒有任何文字或標誌）
  function tvOffTexture() {
    return K.canvasTexture(128, 72, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#20232b'); gr.addColorStop(0.5, '#0d0e12'); gr.addColorStop(1, '#16181e');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.beginPath(); g.moveTo(10, 0); g.lineTo(40, 0); g.lineTo(18, h); g.lineTo(0, h); g.fill();
    });
  }
  function tvGameTexture() {
    const t = K.canvasTexture(512, 288, (g, w, h) => {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#4fb8ff'); sky.addColorStop(1, '#c8f0ff');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff';
      [[40, 50], [220, 34], [380, 64]].forEach(([x, y]) => { g.fillRect(x, y, 70, 18); g.fillRect(x + 14, y - 12, 40, 14); });
      g.fillStyle = '#6fd04a'; g.fillRect(0, 210, w, 78);
      g.fillStyle = '#9a5a2a'; g.fillRect(0, 236, w, 52);
      for (let x = 0; x < w; x += 32) { g.fillStyle = x % 64 ? '#b06a32' : '#8a4c22'; g.fillRect(x, 236, 32, 14); }
      // 方塊與金幣
      [[120, 140], [300, 120], [440, 150]].forEach(([x, y]) => {
        g.fillStyle = '#f2b632'; g.fillRect(x, y, 34, 34);
        g.fillStyle = '#c88a10'; g.fillRect(x + 12, y + 10, 10, 14);
      });
      g.fillStyle = '#ffd84a';
      [[180, 170], [210, 160], [240, 170], [360, 90], [390, 90]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); });
      // 兩個玩家角色（紅、藍方塊小人）
      [['#e0503c', 60, 172], ['#2a7ae0', 256, 172]].forEach(([c, x, y]) => {
        g.fillStyle = c; g.fillRect(x, y, 26, 38);
        g.fillStyle = '#f6d1ad'; g.fillRect(x + 3, y - 20, 20, 20);
        g.fillStyle = '#222'; g.fillRect(x + 7, y - 13, 4, 5); g.fillRect(x + 15, y - 13, 4, 5);
      });
      // 上方兩條血條
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(16, 12, 150, 16); g.fillRect(w - 166, 12, 150, 16);
      g.fillStyle = '#e0503c'; g.fillRect(19, 15, 110, 10);
      g.fillStyle = '#2a7ae0'; g.fillRect(w - 163, 15, 128, 10);
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }

  /* ------------------------------------------------------------ 小工具 */
  // 沿 x 或 z 軸放一排東西：axis 'x' 表示牆沿 x 方向、位於 z = fixed
  function putter(S, axis, fixed) {
    return (w, h, d, c, along, y, off, o) =>
      axis === 'x' ? K.box(S, w, h, d, c, along, y, fixed + (off || 0), o) : K.box(S, d, h, w, c, fixed + (off || 0), y, along, o);
  }
  // 依 layout 的家具資料開一個群組（原點在家具中心，+z 是家具正面）
  const place = (S, f, y) => K.group(S, f.x, y || 0, f.z, (f.rot || 0) * DEG);
  function shade(hex, k) {
    const c = new THREE.Color(hex);
    c.multiplyScalar(k);
    return '#' + c.getHexString();
  }
  function plant(S, x, z, s) {
    s = s || 1;
    const g = K.group(S, x, 0, z);
    g.scale.setScalar(s);
    K.box(g, 0.42, 0.45, 0.42, C.pot, 0, 0.225, 0);
    K.box(g, 0.36, 0.04, 0.36, '#4a3426', 0, 0.44, 0, { cast: false });
    K.box(g, 0.04, 0.5, 0.04, '#5a4a2a', 0, 0.7, 0);
    const r = K.rng(Math.floor(x * 13 + z * 7 + 99));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.4;
      const y = 0.75 + r() * 0.55;
      const len = 0.35 + r() * 0.2;
      K.box(g, 0.14, 0.03, len, i % 2 ? C.leaf : C.leaf2, Math.sin(a) * len * 0.45, y, Math.cos(a) * len * 0.45, { ry: a, rx: -0.5 });
    }
    K.box(g, 0.2, 0.2, 0.2, C.leaf2, 0, 1.25, 0, { ry: 0.6 });
  }
  function floorLamp(S, x, z) {
    K.cyl(S, 0.16, 0.18, 0.03, gold, x, 0.015, z);
    K.box(S, 0.03, 1.4, 0.03, gold, x, 0.72, z);
    const shadeMat = K.mat('#fff1d6', { emissive: '#ffcf8a', emissiveIntensity: 0.2, glow: { day: 0.15, night: 1.3 } });
    K.cyl(S, 0.17, 0.24, 0.32, shadeMat, x, 1.5, z, { cast: false });
  }
  function rug(S, x, z, rot, w, d, base, border, stripes) {
    const g = K.group(S, x, 0, z, (rot || 0) * DEG);
    K.box(g, w, 0.02, d, border, 0, 0.012, 0, { cast: false });
    K.box(g, w - 0.24, 0.022, d - 0.24, base, 0, 0.014, 0, { cast: false });
    if (stripes) for (let i = 0; i < 4; i++) K.box(g, w - 0.5, 0.024, 0.06, border, 0, 0.016, -d / 2 + 0.5 + i * ((d - 1) / 3), { cast: false });
  }
  /* 牆上的時鐘（指針會跟著台北時間走）。ry：時鐘面向的角度 */
  function wallClock(S, x, y, z, ry, out, size) {
    const g = K.group(S, x, y, z, ry);
    const s = size || 1;
    K.cyl(g, 0.27 * s, 0.27 * s, 0.05, '#2a2a2e', 0, 0, 0, { rx: Math.PI / 2, seg: 24 });
    K.cyl(g, 0.24 * s, 0.24 * s, 0.02, '#fbfaf6', 0, 0, 0.022, { rx: Math.PI / 2, seg: 24, cast: false });
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const big = k % 3 === 0;
      K.box(g, big ? 0.03 : 0.015, big ? 0.06 : 0.035, 0.01, '#2a2a2e', Math.sin(a) * 0.19 * s, Math.cos(a) * 0.19 * s, 0.034, { rz: -a, cast: false });
    }
    const hour = K.group(g, 0, 0, 0.04);
    const minute = K.group(g, 0, 0, 0.046);
    K.box(hour, 0.03, 0.12 * s, 0.01, '#1b1b1e', 0, 0.05 * s, 0, { cast: false, noMerge: true });
    K.box(minute, 0.02, 0.18 * s, 0.01, '#c0302a', 0, 0.08 * s, 0, { cast: false, noMerge: true });
    K.box(g, 0.04, 0.04, 0.02, '#1b1b1e', 0, 0, 0.055, { cast: false, noMerge: true });
    out.clocks.push({ hour, minute });
  }
  /* 掛畫：畫面朝 ry 方向 */
  function painting(S, x, y, z, ry, w, h, kind) {
    const g = K.group(S, x, y, z, ry);
    K.box(g, w, h, 0.05, '#3b2a20', 0, 0, 0);
    const t = paintingTexture(kind);
    K.box(g, w - 0.1, h - 0.1, 0.01, K.mat('#ffffff', { map: t }), 0, 0, 0.03, { cast: false });
  }

  /* ------------------------------------------------------------ 地板 */
  function floor(S) {
    const tile = K.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#bdb6ab';
      g.fillRect(0, 0, w, h);
      const r = K.rng(7);
      g.strokeStyle = 'rgba(255,255,255,0.22)';
      for (let i = 0; i < 5; i++) {
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        g.moveTo(r() * w, r() * h);
        g.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h);
        g.stroke();
      }
      g.strokeStyle = 'rgba(80,70,60,0.35)';
      g.lineWidth = 3;
      g.strokeRect(0, 0, w, h);
    });
    tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
    tile.repeat.set(12, 9);
    K.box(S, 24, 0.1, 18, K.mat('#ffffff', { map: tile, rough: 0.5 }), 0, -0.05, 0, { cast: false });
    K.box(S, 24.2, 0.5, 18.2, '#5d554d', 0, -0.36, 0, { cast: false }); // 樓板厚度

    // 董事長室：深色大理石地板 + 地毯
    const bm = marbleTexture('#2f2b29', '#d9d2c8', 11);
    bm.repeat.set(4, 3.5);
    K.box(S, 8, 0.02, 7, K.mat('#ffffff', { map: bm, rough: 0.3, metal: 0.1 }), -8, 0.01, -5.5, { cast: false });
    K.box(S, 4.6, 0.02, 3.2, '#5a3530', -8, 0.03, -4.9, { cast: false });
    K.box(S, 4.3, 0.022, 2.9, '#6e443c', -8, 0.032, -4.9, { cast: false });
    // 會議室：木地板 + 長桌下的地毯
    K.box(S, 6.5, 0.02, 7, '#c9a77a', -0.75, 0.01, -5.5, { cast: false });
    for (let i = 0; i < 12; i++) K.box(S, 0.02, 0.021, 7, '#b8956a', -3.75 + i * 0.55, 0.011, -5.5, { cast: false });
    rug(S, F.meetingTable.x, F.meetingTable.z, 0, 3.0, 4.6, '#56657d', '#3e4a5e');
    // 稽查室
    K.box(S, 9.5, 0.02, 7, '#9aa0a8', 7.25, 0.01, -5.5, { cast: false });
    // 茶水間：淺色磁磚
    K.box(S, 3.8, 0.02, 5.8, '#ece6da', -10.1, 0.01, 4.0, { cast: false });
    for (let i = 0; i < 6; i++) K.box(S, 3.8, 0.021, 0.025, '#d6cfc1', -10.1, 0.011, 1.1 + i * 1.0 + 0.5, { cast: false });
    for (let i = 0; i < 4; i++) K.box(S, 0.025, 0.021, 5.8, '#d6cfc1', -11.6 + i * 1.0, 0.011, 4.0, { cast: false });
    // 地毯：沙發區、白板區
    const rc = O.LAYOUT.at(F.sofa, 0, 1.0);
    rug(S, rc[0], rc[1], F.sofa.rot, 4.2, 3.4, '#e3dccf', '#cfc6b6', true);
    rug(S, -3.3, 6.75, 0, 3.6, 3.0, '#8fa4bf', '#6f84a0');
  }

  /* ------------------------------------------------------------ 外牆（大片窗戶） */
  function windowRun(S, axis, fixed, a1, a2, inward) {
    const put = putter(S, axis, fixed);
    const len = a2 - a1, mid = (a1 + a2) / 2;
    const wall = K.mat(C.wall, {});
    const glass = K.mat('#a9c8dc', { opacity: 0.1, rough: 0.05, side: 'double' });
    const led = K.mat('#fff1d6', { emissive: '#ffcf8a', emissiveIntensity: 0.2, glow: { day: 0.1, night: 1.4 } });
    put(len, 0.5, 0.25, wall, mid, 0.25, 0);
    put(len, 0.5, 0.25, wall, mid, 2.95, 0);
    put(len, 2.2, 0.03, glass, mid, 1.6, 0, { cast: false, receive: false });
    const n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i <= n; i++) put(0.1, 2.2, 0.16, C.frame, a1 + (i * len) / n, 1.6, 0);
    put(len, 0.05, 0.05, led, mid, 2.68, inward * 0.15, { cast: false });
  }
  function exteriorWalls(S, out) {
    windowRun(S, 'x', -9, -12, 12, 1);
    windowRun(S, 'z', -12, -9, 1.2, 1);
    // 茶水間的實牆（掛時鐘和畫）
    K.box(S, 0.25, 3.2, 5.2, C.wall, -12, 1.6, 3.8);
    K.box(S, 0.03, 3.0, 5.2, '#e6dccb', -11.86, 1.5, 3.8, { cast: false });
    K.box(S, 0.02, 0.62, 3.0, '#d9e6ea', -11.84, 1.27, F.counter.z, { cast: false }); // 吧台後的磁磚
    painting(S, -11.83, 1.9, 1.9, Math.PI / 2, 0.8, 0.6, 0);
    wallClock(S, -11.83, 2.15, 3.15, Math.PI / 2, out);
    painting(S, -11.83, 1.9, 4.25, Math.PI / 2, 0.55, 0.7, 1);
    // 電梯牆
    K.box(S, 0.25, 3.2, 2.6, C.wall, -12, 1.6, 7.7);
    K.box(S, 0.06, 2.35, 1.6, '#1f1f22', -11.86, 1.18, 7.7);
    const steel = K.mat('#a6aab0', { metal: 0.7, rough: 0.35 });
    K.box(S, 0.04, 2.2, 0.72, steel, -11.82, 1.1, 7.33);
    K.box(S, 0.04, 2.2, 0.72, steel, -11.82, 1.1, 8.07);
    K.box(S, 0.03, 0.12, 0.06, K.mat('#222', { emissive: '#7fd3ff', emissiveIntensity: 1 }), -11.84, 1.2, 6.7, { cast: false });
    wallClock(S, -11.83, 2.65, 7.7, Math.PI / 2, out, 0.8);
    K.box(S, 0.3, 3.2, 0.3, C.frame, -12, 1.6, -9);
  }

  /* ------------------------------------------------------------ 玻璃隔間
   * st.thick：稽查室用的厚牆框 + 雙層玻璃（隔音感）；st.blinds：百葉簾半拉下 */
  function glassWall(S, axis, fixed, a1, a2, gaps, st) {
    const put = putter(S, axis, fixed);
    const len = a2 - a1, mid = (a1 + a2) / 2;
    const T = st.thick ? 0.22 : 0.1;          // 牆框厚度
    const top = st.thick ? 0.3 : 0.12;        // 上方橫樑高度
    const base = st.thick ? 0.2 : 0.12;
    put(len, top, T, st.frame, mid, 2.72 - top / 2, 0);
    const segs = [];
    let cur = a1;
    (gaps || []).forEach((gp) => {
      segs.push([cur, gp[0]]);
      cur = gp[1];
    });
    segs.push([cur, a2]);
    segs.forEach(([s1, s2]) => {
      const L = s2 - s1, M = (s1 + s2) / 2;
      if (L <= 0.01) return;
      put(L, base, T, st.base, M, base / 2, 0);
      if (st.trim) put(L, 0.025, T + 0.005, st.trim, M, base + 0.01, 0, { cast: false });
      const gh = 2.72 - top - base;
      if (st.thick) {
        put(L, gh, 0.02, st.glass, M, base + gh / 2, -0.07, { cast: false, receive: false });
        put(L, gh, 0.02, st.glass, M, base + gh / 2, 0.07, { cast: false, receive: false });
        // 牆框裡的隔音條
        put(L, 0.04, T + 0.01, '#1c1c20', M, base + 0.02, 0, { cast: false });
        put(L, 0.04, T + 0.01, '#1c1c20', M, 2.72 - top - 0.02, 0, { cast: false });
      } else {
        put(L, gh, 0.03, st.glass, M, base + gh / 2, 0, { cast: false, receive: false });
      }
      if (st.blinds) {
        // 百葉簾：上半部一片片橫條，拉到一半高
        const yTop = 2.72 - top - 0.03, yBot = 1.5;
        for (let y = yTop; y > yBot; y -= 0.075) put(L - 0.06, 0.022, 0.06, st.blinds, M, y, 0, { cast: false });
        put(L - 0.04, 0.05, 0.08, '#b9b4aa', M, yBot - 0.03, 0, { cast: false });
        put(0.01, yTop - yBot, 0.01, '#9a958c', s1 + 0.2, (yTop + yBot) / 2, 0.045, { cast: false });
      }
      const n = Math.max(1, Math.round(L / 1.6));
      for (let i = 0; i <= n; i++) put(st.thick ? 0.14 : 0.07, 2.72, T + 0.02, st.frame, s1 + (i * L) / n, 1.36, 0);
    });
  }
  function roomWalls(S) {
    const L = O.LAYOUT.rooms;
    const bossSt = {
      frame: '#3b2a20', base: '#2e211a', trim: gold,
      glass: K.mat('#f3e2c4', { opacity: 0.16, rough: 0.05, side: 'double' }),
    };
    const meetSt = {
      frame: '#8a8f98', base: '#6a6f78',
      glass: K.mat('#e2f0f8', { opacity: 0.14, rough: 0.05, side: 'double' }),
    };
    const auditSt = {
      thick: true, frame: '#2a2a2e', base: '#3a3a40', blinds: '#ebe7de',
      glass: K.mat('#cfe6f2', { opacity: 0.17, rough: 0.05, side: 'double' }),
    };
    const door = (r) => [[r.doorX - r.doorW / 2, r.doorX + r.doorW / 2]];
    const b = L.boss, m = L.meeting, a = L.audit;
    glassWall(S, 'x', b.maxZ, b.minX, b.maxX, door(b), bossSt);
    glassWall(S, 'z', b.maxX, b.minZ, b.maxZ, [], bossSt);
    glassWall(S, 'x', m.maxZ, m.minX + 0.06, m.maxX - 0.12, door(m), meetSt);
    glassWall(S, 'x', a.maxZ, a.minX, a.maxX, door(a), auditSt);
    glassWall(S, 'z', a.minX, a.minZ, a.maxZ, [], auditSt);
    glassWall(S, 'z', a.maxX, a.minZ, a.maxZ, [], auditSt);
  }

  /* ------------------------------------------------------------ 董事長室 */
  function trophy(P, x, y, z, s) {
    const g = K.group(P, x, y, z);
    g.scale.setScalar(s || 1);
    K.box(g, 0.12, 0.05, 0.12, C.woodDark, 0, 0.025, 0);
    K.cyl(g, 0.015, 0.02, 0.08, gold, 0, 0.09, 0, { seg: 8 });
    K.cyl(g, 0.065, 0.03, 0.1, gold, 0, 0.18, 0, { seg: 12 });
    K.box(g, 0.02, 0.05, 0.02, gold, 0.07, 0.19, 0, { cast: false });
    K.box(g, 0.02, 0.05, 0.02, gold, -0.07, 0.19, 0, { cast: false });
    return g;
  }
  function crown(P, x, y, z, s) {
    const g = K.group(P, x, y, z);
    g.scale.setScalar(s || 1);
    K.box(g, 0.22, 0.03, 0.22, C.woodDark, 0, 0.015, 0);
    K.cyl(g, 0.11, 0.1, 0.07, gold, 0, 0.065, 0, { seg: 10 });
    const gems = ['#c0302a', '#2a5ac0', '#c0302a', '#2aa05a', '#2a5ac0'];
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5;
      K.box(g, 0.055, 0.12, 0.03, gold, Math.sin(a) * 0.095, 0.15, Math.cos(a) * 0.095, { ry: a });
      K.box(g, 0.03, 0.03, 0.03, K.mat(gems[k], { rough: 0.2, metal: 0.2 }), Math.sin(a) * 0.095, 0.225, Math.cos(a) * 0.095, { ry: a + 0.785, cast: false });
      K.box(g, 0.026, 0.026, 0.01, K.mat(gems[(k + 2) % 5], { rough: 0.2 }), Math.sin(a + 0.63) * 0.108, 0.065, Math.cos(a + 0.63) * 0.108, { ry: a + 0.63, cast: false });
    }
    return g;
  }
  function bossRoom(S) {
    // 窗前木質牆板
    K.box(S, 3.4, 2.2, 0.08, '#4a3426', -8, 1.6, -8.82);
    for (let i = 0; i <= 10; i++) K.box(S, 0.06, 2.2, 0.03, '#5c4230', -9.6 + i * 0.32, 1.6, -8.77, { cast: false });
    K.box(S, 3.4, 0.04, 0.05, K.mat('#fff1d6', { emissive: '#ffc870', emissiveIntensity: 0.3, glow: { day: 0.2, night: 1.5 } }), -8, 2.68, -8.74, { cast: false });
    // 矮櫃 + 大皇冠擺飾
    K.box(S, 2.4, 0.7, 0.5, C.woodDark, -8, 0.35, -8.5);
    K.box(S, 2.45, 0.04, 0.52, K.mat('#ffffff', { map: marbleTexture('#25221f', '#e8dfd0', 5), rough: 0.25 }), -8, 0.72, -8.5);
    K.box(S, 2.42, 0.025, 0.51, gold, -8, 0.1, -8.5, { cast: false });
    crown(S, -8, 0.74, -8.5, 1.9);
    K.box(S, 0.3, 0.2, 0.18, '#7a1f2a', -9.0, 0.84, -8.5);
    K.box(S, 0.3, 0.2, 0.18, '#26304a', -8.98, 0.84, -8.32, { ry: 0.1 });
    trophy(S, -7.0, 0.74, -8.5, 1.4);

    // 獎盃櫃（左牆）
    const cx = -11.62, cz = -5, W = 3.6;
    K.box(S, 0.04, 2.3, W, C.woodDark, -11.84, 1.15, cz);
    K.box(S, 0.45, 2.3, 0.06, C.woodDark, cx, 1.15, cz - W / 2);
    K.box(S, 0.45, 2.3, 0.06, C.woodDark, cx, 1.15, cz + W / 2);
    K.box(S, 0.47, 0.06, W + 0.04, C.woodDark, cx, 2.3, cz);
    K.box(S, 0.45, 0.75, W, '#4a3426', cx, 0.375, cz);
    for (let i = 0; i < 4; i++) K.box(S, 0.02, 0.18, 0.03, gold, -11.38, 0.45, cz - 1.35 + i * 0.9, { cast: false });
    const shelfLed = K.mat('#fff1d6', { emissive: '#ffc870', emissiveIntensity: 0.3, glow: { day: 0.3, night: 1.4 } });
    [0.77, 1.28, 1.8].forEach((y, si) => {
      K.box(S, 0.42, 0.04, W - 0.08, C.woodDark, cx, y, cz);
      K.box(S, 0.02, 0.015, W - 0.12, shelfLed, -11.42, y + 0.48, cz, { cast: false });
      for (let k = 0; k < 4; k++) {
        const z = cz - 1.3 + k * 0.85 + (si % 2) * 0.2;
        if ((k + si) % 3 === 2) {
          K.box(S, 0.2, 0.26, 0.05, ['#7a1f2a', '#26304a', '#2c4a36'][k % 3], cx, y + 0.15, z - 0.05);
          K.box(S, 0.2, 0.24, 0.05, '#c9b48a', cx, y + 0.14, z + 0.02);
        } else trophy(S, cx, y + 0.02, z, 1.1 + ((k + si) % 2) * 0.35);
      }
    });
  }

  /* ------------------------------------------------------------ 會議室 */
  function meetingRoom(S) {
    const T = F.meetingTable;
    const g = place(S, T);
    K.box(g, T.w, 0.06, T.d, '#efece6', 0, 0.73, 0);
    K.box(g, T.w + 0.02, 0.02, T.d + 0.02, '#8a8f98', 0, 0.695, 0, { cast: false });
    [-1, 1].forEach((s) => K.box(g, T.w - 0.3, 0.68, 0.08, '#5b5f68', 0, 0.35, s * (T.d / 2 - 0.35)));
    K.box(g, 0.08, 0.06, T.d - 0.7, '#5b5f68', 0, 0.62, 0);
    // 桌上：投影線盒、水瓶、筆記本
    K.box(g, 0.24, 0.03, 0.12, '#2a2a2e', 0, 0.775, 0);
    [[0.35, -1.0], [-0.35, 0.1], [0.35, 1.0]].forEach(([x, z], i) => {
      K.box(g, 0.2, 0.012, 0.27, i % 2 ? '#26304a' : '#f6f6f4', x, 0.766, z, { ry: 0.15, cast: false });
    });
    K.cyl(g, 0.045, 0.045, 0.22, K.mat('#bfe3f5', { rough: 0.2 }), -0.1, 0.87, -0.5, { seg: 12 });
    K.cyl(g, 0.045, 0.045, 0.22, K.mat('#bfe3f5', { rough: 0.2 }), 0.1, 0.87, 0.6, { seg: 12 });
    // 椅子
    O.LAYOUT.places.filter((p) => p.meet && p.seat === 'chair').forEach((p) => chair(K.group(S, p.x, 0, p.z, (p.face || 0) * DEG), 'office', '#2f4f7a'));
    const h = O.LAYOUT.spots.meetHost;
    chair(K.group(S, h.x, 0, h.z, h.face * DEG), 'office', '#2f4f7a');
    // 大螢幕 + 下方矮櫃
    const sc = F.meetingScreen;
    K.box(S, sc.w - 0.4, 0.5, sc.d, '#3b3f48', sc.x, 0.25, sc.z);
    K.box(S, sc.w - 0.38, 0.03, sc.d + 0.02, '#c8995f', sc.x, 0.515, sc.z);
    K.box(S, 3.0, 1.72, 0.08, '#16171b', sc.x, 1.72, -8.8);
    const slide = slideTexture();
    K.box(S, 2.86, 1.6, 0.01, K.mat('#ffffff', { map: slide, emissive: '#ffffff', emissiveMap: slide, emissiveIntensity: 0.75 }), sc.x, 1.72, -8.755, { cast: false });
    K.box(S, 0.12, 0.08, 0.1, '#2a2a2e', sc.x - 1.0, 0.56, sc.z);
  }

  /* ------------------------------------------------------------ 稽查室 */
  function auditRoom(S) {
    const T = F.auditTable;
    K.box(S, T.w, 0.06, T.d, C.wood, T.x, 0.73, T.z);
    const hx = T.w / 2 - 0.15, hz = T.d / 2 - 0.15;
    [[hx, hz], [hx, -hz], [-hx, hz], [-hx, -hz]].forEach(([x, z]) => K.box(S, 0.08, 0.7, 0.08, '#2a2a2e', T.x + x, 0.35, T.z + z));
    K.box(S, T.w - 0.4, 0.08, 0.06, '#2a2a2e', T.x, 0.66, T.z + T.d / 2 - 0.08);
    // 牆上大螢幕（只有圖表，沒有文字）
    K.box(S, 2.9, 1.55, 0.06, '#16171b', T.x, 1.75, -8.8);
    const chart = chartTexture();
    K.box(S, 2.75, 1.4, 0.01, K.mat('#ffffff', { map: chart, emissive: '#ffffff', emissiveMap: chart, emissiveIntensity: 0.85 }), T.x, 1.75, -8.765, { cast: false });
    // 右側牆的檔案櫃
    const cab = F.auditCabinet;
    const g = place(S, cab);
    K.box(g, cab.w, 2.0, cab.d, '#3a3a40', 0, 1.0, 0);
    const binders = ['#26304a', '#7a1f2a', '#2c4a36', '#c9a24a', '#5a5f6a'];
    [0.35, 0.85, 1.35, 1.8].forEach((y, r) => {
      K.box(g, cab.w - 0.1, 0.03, cab.d + 0.01, '#2a2a2e', 0, y - 0.2, 0);
      for (let k = 0; k < 11; k++)
        K.box(g, 0.16, 0.34, 0.26, binders[(k + r) % binders.length], -1.25 + k * 0.23, y - 0.02, 0.03, { cast: false });
    });
  }

  /* ------------------------------------------------------------ 茶水間 */
  function pantry(S) {
    const c = F.counter;
    const g = place(S, c);
    K.box(g, c.w, c.h - 0.05, c.d, '#f2efe8', 0, (c.h - 0.05) / 2, 0);
    K.box(g, c.w + 0.04, 0.05, c.d + 0.04, '#3a3a3e', 0, c.h - 0.025, 0);
    for (let i = 0; i < 4; i++) {
      K.box(g, 0.012, c.h - 0.2, 0.01, '#d8d3c8', -c.w / 2 + 0.75 * (i + 0.5) - 0.37, (c.h - 0.05) / 2, c.d / 2 + 0.005, { cast: false });
      K.box(g, 0.14, 0.02, 0.02, silver, -c.w / 2 + 0.75 * (i + 0.5), c.h - 0.17, c.d / 2 + 0.015, { cast: false });
    }
    const y0 = c.h;
    // 咖啡機（在這台前面泡咖啡）
    const cm = K.group(g, 0.9, y0, -0.05);
    K.box(cm, 0.42, 0.55, 0.42, '#2b2b30', 0, 0.275, 0);
    K.box(cm, 0.3, 0.16, 0.3, '#4a3426', 0, 0.63, -0.02);
    K.box(cm, 0.12, 0.06, 0.12, silver, 0, 0.2, 0.2);
    K.box(cm, 0.18, 0.1, 0.02, K.mat('#111', { emissive: '#7fd3ff', emissiveIntensity: 0.9 }), 0, 0.42, 0.215, { cast: false });
    K.box(cm, 0.2, 0.02, 0.18, '#555', 0, 0.02, 0.15, { cast: false });
    K.cyl(cm, 0.04, 0.035, 0.08, '#f6f6f6', 0, 0.07, 0.15, { seg: 10 });
    for (let i = 0; i < 3; i++) K.cyl(g, 0.045, 0.04, 0.09, ['#f6f6f6', '#c8612a', '#3fa7b5'][i], 0.45 - i * 0.12, y0 + 0.045, 0.05, { seg: 10 });
    // 水槽、水龍頭
    K.box(g, 0.5, 0.012, 0.36, '#9aa0a8', -0.35, y0 + 0.002, 0, { cast: false });
    K.box(g, 0.04, 0.26, 0.04, silver, -0.35, y0 + 0.13, -0.2);
    K.box(g, 0.04, 0.04, 0.16, silver, -0.35, y0 + 0.25, -0.12);
    // 熱水壺、餅乾罐、小盆栽
    K.box(g, 0.16, 0.22, 0.16, '#e0503c', -0.95, y0 + 0.11, -0.05);
    K.box(g, 0.05, 0.04, 0.05, '#2a2a2e', -0.95, y0 + 0.24, -0.05, { cast: false });
    K.cyl(g, 0.09, 0.09, 0.18, K.mat('#dff3ff', { rough: 0.15 }), -1.3, y0 + 0.09, -0.1, { seg: 12 });
    K.box(g, 0.12, 0.08, 0.12, '#c88a3a', -1.3, y0 + 0.08, -0.1, { cast: false });
    // 冰箱
    const fr = F.fridge;
    const fg = place(S, fr);
    K.box(fg, fr.w, 1.85, fr.d, '#e9ecef', 0, 0.925, 0);
    K.box(fg, fr.w + 0.01, 0.015, fr.d + 0.01, '#b9bec4', 0, 1.18, 0, { cast: false });
    K.box(fg, 0.04, 0.4, 0.04, silver, -fr.w / 2 + 0.1, 1.45, fr.d / 2 + 0.02);
    K.box(fg, 0.04, 0.5, 0.04, silver, -fr.w / 2 + 0.1, 0.85, fr.d / 2 + 0.02);
    [['#e0503c', 0.15, 1.55], ['#f2b632', 0.25, 1.4], ['#3fa7b5', 0.05, 0.9]].forEach(([col, x, y]) => K.box(fg, 0.07, 0.07, 0.02, col, x, y, fr.d / 2 + 0.01, { cast: false }));
    K.box(fg, 0.16, 0.2, 0.01, '#fbfaf6', 0.18, 1.62, fr.d / 2 + 0.012, { cast: false });
    // 飲水機
    const wt = F.water;
    const wg = place(S, wt);
    K.box(wg, 0.38, 0.95, 0.38, '#f0f0f2', 0, 0.475, 0);
    K.cyl(wg, 0.15, 0.15, 0.42, K.mat('#8fc8f0', { opacity: 0.55, rough: 0.1 }), 0, 1.16, 0, { cast: false });
    K.box(wg, 0.06, 0.05, 0.06, '#2a6ac0', -0.06, 0.78, 0.2, { cast: false });
    K.box(wg, 0.06, 0.05, 0.06, '#c0302a', 0.06, 0.78, 0.2, { cast: false });
    K.box(wg, 0.2, 0.02, 0.14, '#555', 0, 0.55, 0.16, { cast: false });
    // 高腳吧台 + 吧台椅
    const b = F.bar;
    const bg = place(S, b);
    K.box(bg, b.w, 0.06, b.d, C.wood, 0, b.h - 0.03, 0);
    K.box(bg, b.w - 0.3, b.h - 0.08, 0.1, '#3a3a3e', 0, (b.h - 0.08) / 2, 0);
    K.box(bg, b.w - 0.2, 0.04, 0.5, '#3a3a3e', 0, 0.02, 0);
    K.box(bg, b.w - 0.3, 0.03, 0.03, silver, 0, 0.28, 0.24, { cast: false });
    K.box(bg, 0.25, 0.02, 0.18, '#f6f6f4', -0.6, b.h + 0.01, 0.05, { ry: 0.2, cast: false });
    K.cyl(bg, 0.12, 0.08, 0.07, '#efe6d2', 0.7, b.h + 0.035, 0, { seg: 14 });
    for (let i = 0; i < 4; i++) K.box(bg, 0.05, 0.03, 0.05, ['#c88a3a', '#f2b632', '#e0503c', '#c88a3a'][i], 0.66 + (i % 2) * 0.06, b.h + 0.075, -0.03 + (i >> 1) * 0.06, { cast: false });
    F.stools.forEach((s) => {
      K.cyl(S, 0.2, 0.2, 0.06, '#2f4f7a', s.x, 0.7, s.z, { seg: 16 });
      K.cyl(S, 0.03, 0.03, 0.66, silver, s.x, 0.35, s.z, { seg: 8 });
      K.torus(S, 0.14, 0.012, silver, s.x, 0.3, s.z, { rx: Math.PI / 2 });
      K.cyl(S, 0.18, 0.2, 0.03, '#3a3a3e', s.x, 0.015, s.z, { seg: 16 });
    });
  }

  /* ------------------------------------------------------------ 白板、影印機、書櫃 */
  function bookRow(P, x0, x1, y, z, seed, h) {
    const r = K.rng(seed);
    const cols = ['#26304a', '#7a1f2a', '#2c4a36', '#c9a24a', '#5a5f6a', '#e0503c', '#3fa7b5', '#efe6d2'];
    let x = x0;
    while (x < x1 - 0.06) {
      const bw = 0.04 + r() * 0.05, bh = (h || 0.26) * (0.75 + r() * 0.25);
      if (r() < 0.1) { x += 0.08; continue; }
      K.box(P, bw, bh, 0.22, cols[Math.floor(r() * cols.length)], x + bw / 2, y + bh / 2, z, { cast: false, rz: r() < 0.08 ? 0.25 : 0 });
      x += bw + 0.005;
    }
  }
  function bookcase(S, f, seed) {
    const g = place(S, f);
    const wood = '#8a6a48';
    const h = f.h;
    K.box(g, 0.05, h, f.d, wood, f.w / 2 - 0.025, h / 2, 0);
    K.box(g, 0.05, h, f.d, wood, -f.w / 2 + 0.025, h / 2, 0);
    if (!f.open) K.box(g, f.w, h, 0.03, shade(wood, 0.8), 0, h / 2, -f.d / 2 + 0.015);
    const rows = Math.max(2, Math.round(h / 0.45));
    for (let i = 0; i <= rows; i++) K.box(g, f.w, 0.04, f.d, wood, 0, 0.02 + (i * (h - 0.04)) / rows, 0);
    for (let i = 0; i < rows; i++) {
      const y = 0.04 + (i * (h - 0.04)) / rows;
      bookRow(g, -f.w / 2 + 0.08, f.w / 2 - 0.08, y, 0, seed + i * 17, (h - 0.04) / rows - 0.08);
    }
    if (f.open) K.box(g, f.w * 0.5, 0.18, 0.18, '#efefec', f.w * 0.2, h + 0.09, 0);
  }
  function workZone(S) {
    // 白板（可移動式，有腳架）
    const wb = F.whiteboard;
    const g = place(S, wb);
    [-1, 1].forEach((s) => {
      K.box(g, 0.05, 2.0, 0.05, '#9a9ca2', s * (wb.w / 2 - 0.05), 1.0, 0);
      K.box(g, 0.08, 0.04, wb.d, '#5b5d63', s * (wb.w / 2 - 0.05), 0.02, 0);
    });
    K.box(g, wb.w, 1.25, 0.05, '#c8ccd2', 0, 1.4, 0);
    const tex = doodleTexture();
    K.box(g, wb.w - 0.08, 1.17, 0.01, K.mat('#ffffff', { map: tex, rough: 0.6 }), 0, 1.4, 0.03, { cast: false });
    K.box(g, wb.w * 0.6, 0.03, 0.08, '#9a9ca2', 0, 0.76, 0.05);
    ['#c0302a', '#2a5ac0', '#2f8a3a', '#141416'].forEach((col, i) => K.box(g, 0.12, 0.025, 0.025, col, -0.3 + i * 0.18, 0.79, 0.06, { cast: false }));
    K.box(g, 0.12, 0.05, 0.06, '#3a3a3e', 0.5, 0.8, 0.06, { cast: false });

    // 影印機
    const cp = F.copier;
    const cg = place(S, cp);
    K.box(cg, cp.w, 0.95, cp.d, '#e1e2e6', 0, 0.475, 0);
    K.box(cg, cp.w, 0.08, cp.d, '#5b5d63', 0, 0.99, 0);
    K.box(cg, cp.w - 0.1, 0.03, cp.d - 0.1, '#2a2a2e', 0, 1.045, 0, { cast: false });
    for (let i = 0; i < 3; i++) K.box(cg, cp.w - 0.12, 0.02, 0.02, '#a6a8ae', 0, 0.2 + i * 0.22, cp.d / 2 + 0.005, { cast: false });
    K.box(cg, 0.3, 0.1, 0.12, '#3a3a3e', cp.w / 2 - 0.2, 1.06, cp.d / 2 - 0.08, { rx: -0.4 });
    K.box(cg, 0.16, 0.05, 0.01, K.mat('#111', { emissive: '#7fe0a0', emissiveIntensity: 0.8 }), cp.w / 2 - 0.2, 1.08, cp.d / 2 - 0.02, { rx: -0.4, cast: false });
    K.box(cg, 0.36, 0.03, 0.26, '#ffffff', -0.1, 0.8, cp.d / 2 + 0.1, { cast: false });
    K.box(cg, 0.4, 0.02, 0.3, '#5b5d63', -0.1, 0.78, cp.d / 2 + 0.1, { cast: false });

    F.bookcases.forEach((b, i) => bookcase(S, b, 31 + i * 7));
  }

  /* ------------------------------------------------------------ 沙發休憩區 */
  O.makeController = function (parent, color) {
    const g = K.group(parent, 0, 0, 0);
    const body = color || '#f2f2f4';
    K.box(g, 0.16, 0.035, 0.07, body, 0, 0, 0);
    K.box(g, 0.05, 0.04, 0.09, body, 0.065, -0.005, -0.03, { ry: 0.25 });
    K.box(g, 0.05, 0.04, 0.09, body, -0.065, -0.005, -0.03, { ry: -0.25 });
    K.box(g, 0.07, 0.006, 0.04, '#1b1b1e', 0, 0.02, 0.005, { cast: false });
    K.box(g, 0.022, 0.012, 0.022, '#2a2a2e', 0.045, 0.022, 0.01, { cast: false });
    K.box(g, 0.022, 0.012, 0.022, '#2a2a2e', -0.045, 0.022, 0.01, { cast: false });
    K.box(g, 0.05, 0.004, 0.006, K.mat('#0b0b0d', { emissive: '#5fa8ff', emissiveIntensity: 1.2 }), 0, 0.02, 0.034, { cast: false });
    K.mergeChildren(g);
    return g;
  };
  function beanbag(P, x, z, ry, color) {
    const g = K.group(P, x, 0, z, ry);
    const dark = shade(color, 0.82);
    K.box(g, 0.9, 0.16, 0.9, dark, 0, 0.08, 0);
    K.box(g, 0.84, 0.14, 0.8, color, 0, 0.22, 0.03);
    K.box(g, 0.86, 0.46, 0.32, color, 0, 0.36, -0.3, { rx: -0.28 });
    K.box(g, 0.2, 0.3, 0.6, dark, 0.37, 0.3, -0.05);
    K.box(g, 0.2, 0.3, 0.6, dark, -0.37, 0.3, -0.05);
    K.box(g, 0.12, 0.04, 0.12, '#f6f6f4', 0.25, 0.42, -0.42, { rx: -0.28, cast: false });
    return g;
  }
  function lounge(S, out) {
    // 三人座沙發
    const sf = F.sofa;
    const fabric = '#8f8b88', cushion = '#a7a29d';
    const g = place(S, sf);
    K.box(g, sf.w, 0.36, sf.d, fabric, 0, 0.18, 0);
    [-0.75, 0, 0.75].forEach((x) => K.box(g, 0.74, 0.1, 0.68, cushion, x, 0.41, 0.1));
    K.box(g, sf.w, 0.56, 0.24, fabric, 0, 0.62, -sf.d / 2 + 0.12);
    [-0.75, 0, 0.75].forEach((x) => K.box(g, 0.7, 0.36, 0.12, cushion, x, 0.66, -sf.d / 2 + 0.28, { rx: -0.12 }));
    [-1, 1].forEach((s) => K.box(g, 0.18, 0.58, sf.d, fabric, s * (sf.w / 2 - 0.09), 0.29, 0));
    K.box(g, 0.32, 0.3, 0.12, '#f2b632', 0.95, 0.6, -0.2, { rx: -0.2, rz: 0.15 });
    K.box(g, 0.32, 0.3, 0.12, '#3fa7b5', -0.95, 0.6, -0.2, { rx: -0.2, rz: -0.15 });

    // 茶几 + 兩支手把（打電動時會被拿走）
    const ct = F.coffeeTable;
    const tg = place(S, ct);
    K.box(tg, ct.w, 0.05, ct.d, '#8a5a36', 0, 0.4, 0);
    K.box(tg, ct.w - 0.1, 0.03, ct.d - 0.1, '#6a4428', 0, 0.12, 0);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => K.box(tg, 0.05, 0.4, 0.05, '#2a2a2e', a * (ct.w / 2 - 0.06), 0.2, b * (ct.d / 2 - 0.06)));
    K.cyl(tg, 0.11, 0.08, 0.07, '#efe6d2', -0.3, 0.46, -0.05, { seg: 14 });
    for (let i = 0; i < 4; i++) K.box(tg, 0.05, 0.03, 0.05, ['#f2b632', '#e0503c'][i % 2], -0.33 + (i % 2) * 0.06, 0.5, -0.08 + (i >> 1) * 0.06, { cast: false });
    K.box(tg, 0.26, 0.02, 0.2, '#26304a', 0.05, 0.435, 0.12, { ry: 0.3, cast: false });
    [0.25, 0.42].forEach((x, i) => {
      const c = O.makeController(K.group(tg, x, 0.44, -0.08 + i * 0.12, 0.3 - i * 0.5), i ? '#1d1d20' : '#f2f2f4');
      c.traverse((m) => m.isMesh && (m.userData.noMerge = true));
      out.controllers.push(c);
    });

    // 角落的電視櫃 + 電視 + 遊戲主機
    const tv = F.tv;
    const vg = place(S, tv);
    K.box(vg, tv.w, 0.48, tv.d, '#3b2a20', 0, 0.24, 0);
    K.box(vg, tv.w + 0.02, 0.03, tv.d + 0.02, '#c8995f', 0, 0.495, 0);
    K.box(vg, 0.012, 0.36, 0.01, '#2a1e16', -0.3, 0.24, tv.d / 2 + 0.003, { cast: false });
    K.box(vg, 0.012, 0.36, 0.01, '#2a1e16', 0.3, 0.24, tv.d / 2 + 0.003, { cast: false });
    K.box(vg, 0.3, 0.03, 0.2, '#1b1b1e', 0, 0.525, -0.02);
    K.box(vg, 0.08, 0.2, 0.05, '#1b1b1e', 0, 0.62, -0.05);
    K.box(vg, 1.66, 0.96, 0.07, '#111114', 0, 1.2, -0.05);
    const offTex = tvOffTexture(), gameTex = tvGameTexture();
    const tvMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: offTex, emissive: new THREE.Color('#ffffff'), emissiveMap: offTex, emissiveIntensity: 0.15, roughness: 0.25 });
    K.box(vg, 1.56, 0.86, 0.01, tvMat, 0, 1.2, -0.012, { cast: false });
    // 遊戲主機：白色直立式（兩片白色側板夾著黑色中間，旁邊一條藍燈）
    const ps = K.group(vg, 0.68, 0.51, -0.02);
    K.box(ps, 0.035, 0.42, 0.3, '#f4f4f6', 0.035, 0.21, 0);
    K.box(ps, 0.035, 0.42, 0.3, '#f4f4f6', -0.035, 0.21, 0);
    K.box(ps, 0.04, 0.38, 0.28, '#151518', 0, 0.2, 0);
    K.box(ps, 0.005, 0.3, 0.005, K.mat('#0b0b0d', { emissive: '#5fa8ff', emissiveIntensity: 1.5 }), 0, 0.22, 0.152, { cast: false });
    K.box(ps, 0.12, 0.02, 0.12, '#151518', 0, 0.01, 0);
    // 電視旁的小音箱
    K.box(vg, 0.12, 0.26, 0.12, '#2a2a2e', -0.72, 0.64, 0);
    out.tv = { mat: tvMat, offTex, gameTex };

    // 懶骨頭（沛蓁的那一顆在 memberSeat 裡畫）
    // 方向和 js/layout.js 的碰撞範圍用同一個數值（b.rot）
    F.beanbags.forEach((b) => beanbag(S, b.x, b.z, b.rot * DEG, b.color));
  }

  /* ------------------------------------------------------------ 前緣與右緣的矮欄杆 */
  function railings(S) {
    const glass = K.mat('#cfe6f2', { opacity: 0.18, rough: 0.05, side: 'double' });
    const run = (axis, fixed, a1, a2) => {
      const put = putter(S, axis, fixed);
      const len = a2 - a1, mid = (a1 + a2) / 2;
      put(len, 0.06, 0.08, C.frame, mid, 1.0, 0);
      put(len, 0.85, 0.02, glass, mid, 0.5, 0, { cast: false, receive: false });
      const n = Math.round(len / 2);
      for (let i = 0; i <= n; i++) put(0.06, 1.0, 0.06, C.frame, a1 + (i * len) / n, 0.5, 0);
    };
    run('x', 9, -12, 12);
    run('z', 12, -2, 9);
  }

  /* ------------------------------------------------------------ 門牌 */
  function signs(S) {
    const plate = (text, x, z) => {
      const t = K.textTexture([{ text, y: 0.5, size: 70, color: '#f3e6c8' }], { w: 320, h: 96, bg: '#2a2420' });
      K.box(S, 1.1, 0.32, 0.03, K.mat('#ffffff', { map: t, rough: 0.6 }), x, 2.92, z + 0.13, { cast: false });
    };
    const R = O.LAYOUT.rooms;
    plate('董事長室', R.boss.doorX, R.boss.maxZ);
    plate('會議室', R.meeting.doorX, R.meeting.maxZ);
    plate('稽查室', R.audit.doorX, R.audit.maxZ);
  }

  /* ------------------------------------------------------------ 座位（椅子、桌子、桌上小物） */
  function chair(g, style, color) {
    const metal = K.mat('#9a9ca2', { metal: 0.7, rough: 0.35 });
    if (style === 'exec') {
      K.box(g, 0.62, 0.1, 0.58, '#1d1d20', 0, 0.4, 0);
      K.box(g, 0.64, 0.95, 0.13, '#1d1d20', 0, 0.98, -0.31, { rx: -0.08 });
      K.box(g, 0.5, 0.2, 0.12, '#2a2a2e', 0, 1.5, -0.35, { rx: -0.08 });
      K.box(g, 0.08, 0.06, 0.45, '#2a2a2e', 0.34, 0.62, -0.02);
      K.box(g, 0.08, 0.06, 0.45, '#2a2a2e', -0.34, 0.62, -0.02);
      K.box(g, 0.05, 0.2, 0.05, '#2a2a2e', 0.34, 0.5, -0.02);
      K.box(g, 0.05, 0.2, 0.05, '#2a2a2e', -0.34, 0.5, -0.02);
    } else {
      const c = color || '#2c2c31';
      K.box(g, 0.56, 0.08, 0.52, c, 0, 0.4, 0);
      K.box(g, 0.54, 0.56, 0.07, c, 0, 0.8, -0.29);
      K.box(g, 0.05, 0.3, 0.04, '#2c2c31', 0, 0.5, -0.28);
    }
    K.cyl(g, 0.035, 0.035, 0.3, metal, 0, 0.2, 0, { seg: 8 });
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5;
      K.box(g, 0.05, 0.035, 0.3, metal, Math.sin(a) * 0.14, 0.04, Math.cos(a) * 0.14, { ry: a });
    }
  }
  function standardDesk(g, dist, w, d) {
    const led = K.mat('#fff1d6', { emissive: '#ffcf8a', emissiveIntensity: 0.2, glow: { day: 0.1, night: 1.2 } });
    K.box(g, w, 0.05, d, C.wood, 0, 0.735, dist);
    K.box(g, 0.05, 0.71, d - 0.05, C.deskSide, w / 2 - 0.04, 0.355, dist);
    K.box(g, 0.05, 0.71, d - 0.05, C.deskSide, -w / 2 + 0.04, 0.355, dist);
    K.box(g, w - 0.1, 0.4, 0.03, C.deskSide, 0, 0.5, dist + d / 2 - 0.06);
    K.box(g, w, 0.015, 0.02, led, 0, 0.705, dist + d / 2 - 0.01, { cast: false });
  }
  function marbleDesk(g, dist, w) {
    const marble = K.mat('#ffffff', { map: marbleTexture('#26231f', '#e6ddcc', 21), rough: 0.25, metal: 0.05 });
    const led = K.mat('#fff1d6', { emissive: '#ffc870', emissiveIntensity: 0.3, glow: { day: 0.2, night: 1.5 } });
    K.box(g, w + 0.1, 0.08, 1.25, marble, 0, 0.74, dist);
    K.box(g, w, 0.66, 0.08, '#3b2a20', 0, 0.36, dist + 0.55);
    K.box(g, w + 0.02, 0.03, 0.09, gold, 0, 0.12, dist + 0.555, { cast: false });
    K.box(g, w + 0.02, 0.03, 0.09, gold, 0, 0.66, dist + 0.555, { cast: false });
    K.box(g, 0.55, 0.7, 1.1, '#2e211a', w / 2 - 0.3, 0.35, dist);
    K.box(g, 0.55, 0.7, 1.1, '#2e211a', -w / 2 + 0.3, 0.35, dist);
    K.box(g, w, 0.02, 0.02, led, 0, 0.04, dist + 0.6, { cast: false });
  }
  // 懶骨頭旁的小邊桌（桌面高 0.45）
  function sideTable(g, x, z) {
    K.box(g, 0.6, 0.04, 0.5, C.wood, x, 0.43, z);
    K.box(g, 0.56, 0.03, 0.46, '#8a6a48', x, 0.12, z);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => K.box(g, 0.04, 0.42, 0.04, '#5b5d63', x + a * 0.26, 0.21, z + b * 0.21));
  }

  function todayInTaipei() {
    try {
      const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
      const get = (t) => (p.find((x) => x.type === t) || {}).value;
      return { m: get('month'), d: get('day') };
    } catch (e) {
      const d = new Date();
      return { m: String(d.getMonth() + 1), d: String(d.getDate()) };
    }
  }

  /* 桌上小物：原點在桌面上，+z 是遠離座位的方向，+x 是坐著的人的左手邊 */
  const PROPS = {
    monitor(g, ctx, sp) {
      const s = sp.small ? 0.8 : 1;
      K.box(g, 0.24 * s, 0.02, 0.16 * s, '#2a2b30', 0, 0.01, 0);
      K.box(g, 0.05, 0.24 * s, 0.04, '#2a2b30', 0, 0.13 * s, 0.03);
      K.box(g, 0.6 * s, 0.36 * s, 0.035, '#1b1c20', 0, 0.42 * s, 0);
      K.box(g, 0.56 * s, 0.32 * s, 0.004, ctx.screenMat, 0, 0.42 * s, -0.019, { cast: false });
    },
    dualMonitor(g, ctx, sp) {
      const s = sp.small ? 0.8 : 1;
      PROPS.monitor(K.group(g, 0.31 * s, 0, 0, 0.25), ctx, sp);
      PROPS.monitor(K.group(g, -0.31 * s, 0, 0, -0.25), ctx, sp);
    },
    laptop(g, ctx, sp) {
      const al = K.mat('#a3a4aa', { metal: 0.5, rough: 0.4 });
      K.box(g, 0.34, 0.018, 0.24, al, 0, 0.009, 0);
      K.box(g, 0.3, 0.004, 0.12, '#2a2a2e', 0, 0.019, -0.02, { cast: false });
      const lid = K.group(g, 0, 0.018, 0.12);
      lid.rotation.x = 0.28;
      K.box(lid, 0.34, 0.23, 0.012, al, 0, 0.115, 0);
      K.box(lid, 0.31, 0.2, 0.003, ctx.screenMat, 0, 0.115, -0.008, { cast: false });
      if (sp.logo === 'sun') {
        for (let k = 0; k < 6; k++)
          K.box(lid, 0.08, 0.012, 0.003, '#f26a1b', 0, 0.115, 0.008, { rz: (k * Math.PI) / 6, cast: false });
      }
    },
    keyboard(g) {
      K.box(g, 0.44, 0.02, 0.15, '#2a2a2e', 0, 0.01, 0);
      K.box(g, 0.06, 0.02, 0.09, '#2a2a2e', -0.32, 0.01, 0);
    },
    lamp(g, ctx, sp) {
      const col = sp.color ? K.mat(sp.color, { metal: 0.8, rough: 0.3 }) : '#2f3035';
      K.cyl(g, 0.08, 0.09, 0.025, col, 0, 0.012, 0, { seg: 12 });
      K.box(g, 0.025, 0.38, 0.025, col, 0, 0.2, 0);
      K.box(g, 0.025, 0.025, 0.2, col, 0, 0.39, -0.09);
      K.box(g, 0.16, 0.08, 0.16, col, 0, 0.37, -0.19);
      K.box(g, 0.12, 0.012, 0.12, ctx.lampMat, 0, 0.328, -0.19, { cast: false });
    },
    crown(g, ctx, sp) { crown(g, 0, 0, 0, sp.scale || 1); },
    trophy(g, ctx, sp) { trophy(g, 0, 0, 0, sp.scale || 1.2); },
    globe(g) {
      K.cyl(g, 0.07, 0.08, 0.02, gold, 0, 0.01, 0, { seg: 12 });
      K.box(g, 0.015, 0.08, 0.015, gold, 0, 0.06, 0);
      K.torus(g, 0.115, 0.007, gold, 0, 0.2, 0, { rz: 0.4, ry: 0.3 });
      K.sphere(g, 0.1, K.mat('#c9a24a', { metal: 0.75, rough: 0.3 }), 0, 0.2, 0);
      K.box(g, 0.06, 0.05, 0.02, '#8a6a20', 0.03, 0.23, 0.09, { cast: false });
      K.box(g, 0.05, 0.04, 0.02, '#8a6a20', -0.05, 0.17, 0.08, { cast: false });
    },
    paperStack(g) {
      K.box(g, 0.22, 0.05, 0.3, '#f6f6f4', 0, 0.025, 0);
      K.box(g, 0.22, 0.01, 0.3, '#ececea', 0.02, 0.055, 0.01, { ry: 0.1, cast: false });
    },
    reportStack(g) {
      K.box(g, 0.22, 0.06, 0.3, '#f6f6f4', 0, 0.03, 0);
      K.box(g, 0.22, 0.02, 0.3, '#26304a', 0.0, 0.07, 0.0, { ry: 0.12 });
      K.box(g, 0.2, 0.015, 0.28, '#2a2a2e', -0.02, 0.09, 0.02, { ry: -0.1 });
    },
    robotPad(g) {
      K.cyl(g, 0.1, 0.1, 0.015, '#f2f2f4', 0, 0.008, 0, { seg: 16 });
      K.cyl(g, 0.104, 0.104, 0.006, K.mat('#0a1a20', { emissive: '#5fe3ff', emissiveIntensity: 1.3 }), 0, 0.012, 0, { seg: 16, cast: false });
    },
    books(g) {
      ['#26304a', '#c8612a', '#2c4a36'].forEach((c, i) => K.box(g, 0.24, 0.05, 0.32, c, 0, 0.025 + i * 0.05, 0, { ry: (i - 1) * 0.12 }));
    },
    plantSmall(g) {
      K.box(g, 0.12, 0.12, 0.12, C.pot, 0, 0.06, 0);
      for (let k = 0; k < 5; k++) {
        const a = (k * Math.PI * 2) / 5;
        K.box(g, 0.05, 0.02, 0.14, k % 2 ? C.leaf : C.leaf2, Math.sin(a) * 0.05, 0.16, Math.cos(a) * 0.05, { ry: a, rx: -0.6 });
      }
      K.box(g, 0.07, 0.09, 0.07, C.leaf2, 0, 0.19, 0, { ry: 0.5 });
    },
    approvalBinder(g) {
      K.box(g, 0.3, 0.03, 0.38, '#26304a', 0, 0.015, 0);
      K.box(g, 0.27, 0.02, 0.34, '#f6f6f4', 0, 0.04, 0);
      K.box(g, 0.1, 0.025, 0.04, silver, 0, 0.055, 0.16, { cast: false });
      const t = K.textTexture([{ text: '待核准', y: 0.5, size: 76, color: '#ffffff' }], { w: 256, h: 256, bg: '#d0302a' });
      K.box(g, 0.17, 0.004, 0.17, K.mat('#ffffff', { map: t }), 0.02, 0.053, -0.04, { ry: 0.12, cast: false });
    },
    piggyBank(g) {
      K.box(g, 0.18, 0.13, 0.12, gold, 0, 0.095, 0);
      K.box(g, 0.04, 0.05, 0.05, gold, 0, 0.09, -0.08);
      K.box(g, 0.012, 0.012, 0.005, '#6a4a10', 0.01, 0.09, -0.106, { cast: false });
      K.box(g, 0.012, 0.012, 0.005, '#6a4a10', -0.01, 0.09, -0.106, { cast: false });
      K.box(g, 0.035, 0.035, 0.02, gold, 0.05, 0.17, -0.04, { cast: false });
      K.box(g, 0.035, 0.035, 0.02, gold, -0.05, 0.17, -0.04, { cast: false });
      K.box(g, 0.07, 0.006, 0.015, '#3a2a10', 0, 0.161, 0.01, { cast: false });
      [[0.06, 0.04], [-0.06, 0.04], [0.06, -0.04], [-0.06, -0.04]].forEach(([x, z]) => K.box(g, 0.03, 0.03, 0.03, gold, x, 0.015, z, { cast: false }));
      K.cyl(g, 0.03, 0.03, 0.008, gold, 0.14, 0.004, 0.02, { seg: 12, cast: false });
    },
    calendar(g, ctx, sp) {
      let lines;
      if (sp.today) {
        const t = todayInTaipei();
        lines = [{ text: t.m + ' 月', y: 0.13, size: 40, color: '#ffffff' }, { text: t.d, y: 0.62, size: 120, color: '#222' }];
      } else {
        const main = sp.text || '';
        lines = [
          { text: sp.sub || '', y: 0.13, size: 40, color: '#ffffff' },
          { text: main, y: 0.62, size: main.length > 3 ? 56 : 92, color: '#c0302a' },
        ];
      }
      const t = K.textTexture(lines, { w: 256, h: 220, bg: '#fbfaf6', header: '#c0302a' });
      K.box(g, 0.26, 0.02, 0.09, '#2a2a2e', 0, 0.01, 0);
      K.box(g, 0.24, 0.2, 0.012, K.mat('#ffffff', { map: t }), 0, 0.12, 0, { cast: false });
    },
    stamp(g) {
      K.box(g, 0.12, 0.015, 0.08, '#4a1418', 0.09, 0.008, 0);
      K.box(g, 0.07, 0.035, 0.05, '#c0302a', -0.04, 0.018, 0);
      K.cyl(g, 0.02, 0.022, 0.07, '#5a3a24', -0.04, 0.07, 0, { seg: 10 });
      K.sphere(g, 0.026, '#5a3a24', -0.04, 0.115, 0);
    },
    nineGrid(g) {
      const fr = '#2f4a37', W = 0.42, D = 0.3;
      K.box(g, W, 0.02, D, fr, 0, 0.01, 0);
      K.box(g, W, 0.02, D, fr, 0, 0.42, 0);
      K.box(g, 0.02, 0.42, D, fr, W / 2 - 0.01, 0.215, 0);
      K.box(g, 0.02, 0.42, D, fr, -W / 2 + 0.01, 0.215, 0);
      K.box(g, 0.015, 0.4, D, fr, 0.068, 0.215, 0);
      K.box(g, 0.015, 0.4, D, fr, -0.068, 0.215, 0);
      K.box(g, W, 0.015, D, fr, 0, 0.145, 0);
      K.box(g, W, 0.015, D, fr, 0, 0.28, 0);
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 3; k++) {
          const x = -0.135 + k * 0.135, y = 0.075 + r * 0.135;
          K.box(g, 0.11, 0.1, 0.26, '#b8322c', x, y - 0.008, 0, { cast: false });
          K.box(g, 0.09, 0.02, 0.24, '#f1e6cf', x, y + 0.045, 0, { cast: false });
        }
    },
    indexLedger(g) {
      K.box(g, 0.24, 0.05, 0.32, '#2c4a36', 0, 0.025, 0);
      K.box(g, 0.22, 0.04, 0.3, '#f1ebdd', 0.008, 0.028, 0, { cast: false });
      ['#ffd54a', '#6fd0f2', '#f27ac0', '#9be36a', '#c0302a'].forEach((c, i) =>
        K.box(g, 0.035, 0.012, 0.04, c, 0.135, 0.03, -0.12 + i * 0.06, { cast: false }));
      K.box(g, 0.12, 0.003, 0.06, '#f1ebdd', 0, 0.051, 0.05, { cast: false });
    },
    scales(g) {
      K.box(g, 0.12, 0.02, 0.08, silver, 0, 0.01, 0);
      K.box(g, 0.015, 0.22, 0.015, silver, 0, 0.12, 0);
      K.box(g, 0.24, 0.012, 0.012, silver, 0, 0.23, 0);
      [0.11, -0.11].forEach((x) => {
        K.box(g, 0.004, 0.09, 0.004, silver, x, 0.185, 0, { cast: false });
        K.cyl(g, 0.045, 0.035, 0.012, silver, x, 0.14, 0, { seg: 12 });
      });
    },
    docTray(g) {
      const c = '#3a3a40';
      K.box(g, 0.3, 0.015, 0.38, c, 0, 0.008, 0);
      K.box(g, 0.3, 0.015, 0.38, c, 0, 0.1, 0);
      K.box(g, 0.012, 0.11, 0.38, c, 0.15, 0.055, 0);
      K.box(g, 0.012, 0.11, 0.38, c, -0.15, 0.055, 0);
      K.box(g, 0.26, 0.02, 0.33, '#f6f6f4', 0, 0.025, 0, { cast: false });
      K.box(g, 0.26, 0.03, 0.33, '#f6f6f4', 0, 0.125, 0, { cast: false });
    },
  };
  O.PROPS = PROPS;

  /* desk.type 'none' 表示坐在共用桌（稽查室長桌）。換位子時忘了改桌型，桌上小物會浮在半空中，這裡先提醒 */
  function checkSharedTable(m, dist) {
    const f = (m.seat.face || 0) * DEG;
    const x = m.seat.x + Math.sin(f) * dist, z = m.seat.z + Math.cos(f) * dist;
    const ok = (O.LAYOUT.sharedTables || []).some((t) => x >= t.minX && x <= t.maxX && z >= t.minZ && z <= t.maxZ);
    if (!ok) console.warn('[office3d] ' + m.name + ' 的 desk.type 是 none（共用桌），但座位前面沒有共用桌；換到別處請把 desk.type 改成 standard');
  }

  function memberSeat(S, m, out) {
    const seat = m.seat;
    const g = K.group(S, seat.x, 0, seat.z, (seat.face || 0) * DEG);
    const d = m.desk || { type: 'standard' };
    if (d.type !== 'beanbag') chair(g, m.chair || 'office');
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: new THREE.Color('#ffcf7a'), emissiveIntensity: 1, roughness: 0.6 });
    const screenMat = new THREE.MeshStandardMaterial({
      color: '#ffffff', map: screenTex, emissive: new THREE.Color('#ffffff'), emissiveMap: screenTex, emissiveIntensity: 0.9, roughness: 0.4,
    });
    out.desks[m.id] = { lampMat, screenMat };
    const dist = d.dist != null ? d.dist : 0.75;
    let top;
    if (d.type === 'beanbag') {
      // 懶骨頭 + 邊桌：桌上小物放在邊桌上
      beanbag(g, 0, 0, 0, d.color || '#3f7a52');
      const side = d.side || [0.85, 0.1];
      sideTable(g, side[0], side[1]);
      top = K.group(g, side[0], 0.45, side[1]);
    } else {
      if (d.type === 'none') checkSharedTable(m, dist);
      if (d.type === 'marble') marbleDesk(g, dist, d.width || 2.6);
      else if (d.type === 'standard') standardDesk(g, dist, d.width || 1.8, d.depth || 0.8);
      top = K.group(g, 0, d.type === 'marble' ? 0.78 : 0.76, dist);
    }
    const ctx = { screenMat, lampMat, member: m };
    (m.deskProps || []).forEach((p) => {
      const sp = typeof p === 'string' ? { type: p } : p;
      const fn = PROPS[sp.type];
      if (!fn) {
        console.warn('[office3d] 不認得的桌上小物：', sp.type);
        return;
      }
      fn(K.group(top, sp.x || 0, sp.y || 0, sp.z || 0, (sp.rot || 0) * DEG), ctx, sp);
    });
  }

  /* ------------------------------------------------------------ 窗外城市 */
  function city(scene) {
    const N = 170;
    const r = K.rng(42);
    const facade = K.canvasTexture(64, 128, (g, w, h) => {
      g.fillStyle = '#8a93a3';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3b4656';
      for (let y = 4; y < h - 4; y += 8) for (let x = 4; x < w - 4; x += 10) g.fillRect(x, y, 6, 5);
    });
    const lit = K.canvasTexture(64, 128, (g, w, h) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      const rr = K.rng(9);
      for (let y = 4; y < h - 4; y += 8)
        for (let x = 4; x < w - 4; x += 10)
          if (rr() < 0.55) {
            g.fillStyle = rr() < 0.8 ? '#ffd9a0' : '#bfe3ff';
            g.fillRect(x, y, 6, 5);
          }
    });
    const mat = new THREE.MeshStandardMaterial({ map: facade, emissive: new THREE.Color('#ffffff'), emissiveMap: lit, emissiveIntensity: 0, roughness: 0.85 });
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) {
      const ang = r() * Math.PI * 2;
      const dist = 38 + r() * 110;
      const w = 6 + r() * 12, d = 6 + r() * 12, h = 25 + r() * (dist < 70 ? 70 : 95);
      p.set(Math.cos(ang) * dist, -50 + h / 2, Math.sin(ang) * dist);
      s.set(w, h, d);
      q.setFromAxisAngle(up, r() * 0.6);
      m4.compose(p, q, s);
      mesh.setMatrixAt(i, m4);
      col.setHSL(0.6, 0.06, 0.45 + r() * 0.4);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    K.box(scene, 700, 1, 700, '#2b2f38', 0, -50.5, 0, { cast: false, receive: false });
    return { mat };
  }
})();
