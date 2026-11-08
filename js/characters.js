/* 角色：全部用方塊組合（大頭小身體），外觀讀 js/team.js 的 appearance。
 * 角色本身面向 +z；角色的「左」是 +x。
 * 整個人放大 SCALE 倍（figure 群組）；下面身體各部位的數字都是放大前的尺寸。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const HC = 0.27; // 頭部中心在頸部支點上方的高度
  const SCALE = (O.FIGURE_SCALE = 1.3); // 人物放大倍率
  const HIP = 0.46;  // 髖關節高度（放大前）

  /* ---------------- 髮型 ----------------
   * 每一塊：[寬, 高, 深, x, y, z, rx, ry, rz, 用深色]，座標以頭部中心為原點 */
  const HAIR = {
    // 董事長：黑色短髮
    short: [
      [0.6, 0.14, 0.54, 0, 0.23, 0],
      [0.6, 0.36, 0.1, 0, 0.06, -0.25],
      [0.07, 0.22, 0.36, 0.295, 0.13, -0.05],
      [0.07, 0.22, 0.36, -0.295, 0.13, -0.05],
      [0.58, 0.09, 0.09, 0, 0.2, 0.255],
      [0.2, 0.1, 0.09, -0.15, 0.15, 0.265, 0, 0, 0.25],
      [0.2, 0.1, 0.09, 0.05, 0.15, 0.27, 0, 0, -0.15, 1],
      [0.16, 0.09, 0.09, 0.2, 0.16, 0.265, 0, 0, -0.35],
      [0.3, 0.1, 0.3, -0.1, 0.32, 0.05, 0, 0.3, 0.1, 1],
      [0.28, 0.1, 0.28, 0.12, 0.31, -0.08, 0, -0.2, -0.1],
    ],
    // 林怡瑄：黑色長直髮（中分、垂到腰）
    long: [
      [0.62, 0.16, 0.56, 0, 0.23, 0],
      [0.5, 0.1, 0.44, 0, 0.33, -0.02, 0, 0, 0, 1],
      [0.36, 0.08, 0.3, 0.04, 0.39, 0.02],
      [0.3, 0.13, 0.1, -0.14, 0.2, 0.26, 0, 0, 0.3],
      [0.3, 0.13, 0.1, 0.14, 0.2, 0.26, 0, 0, -0.3],
      [0.11, 0.78, 0.34, 0.33, -0.12, 0.0],
      [0.11, 0.78, 0.34, -0.33, -0.12, 0.0],
      [0.1, 0.36, 0.44, 0.36, 0.12, -0.03, 0, 0, 0, 1],
      [0.1, 0.36, 0.44, -0.36, 0.12, -0.03, 0, 0, 0, 1],
      [0.64, 1.0, 0.13, 0, -0.22, -0.27],
      [0.14, 0.3, 0.3, 0.36, -0.42, -0.02, 0, 0, -0.12, 1],
      [0.14, 0.3, 0.3, -0.36, -0.42, -0.02, 0, 0, 0.12, 1],
    ],
    // GPT：銀灰色蓬鬆捲髮
    wavy: [
      [0.62, 0.14, 0.56, 0, 0.24, 0],
      [0.6, 0.34, 0.12, 0, 0.04, -0.25],
      [0.07, 0.2, 0.36, 0.3, 0.12, -0.04],
      [0.07, 0.2, 0.36, -0.3, 0.12, -0.04],
      [0.26, 0.12, 0.22, -0.16, 0.33, 0.06, 0, 0, 0.35],
      [0.26, 0.12, 0.22, 0.14, 0.34, 0.04, 0, 0, -0.3, 1],
      [0.22, 0.12, 0.22, 0.0, 0.36, -0.14, 0.2, 0, 0],
      [0.2, 0.1, 0.2, -0.3, 0.26, -0.06, 0, 0, 0.7, 1],
      [0.2, 0.1, 0.2, 0.31, 0.26, -0.08, 0, 0, -0.7],
      [0.18, 0.1, 0.18, -0.29, 0.17, 0.12, 0, 0.3, 0.9],
      [0.18, 0.1, 0.18, 0.3, 0.15, 0.1, 0, -0.3, -0.9, 1],
      [0.24, 0.12, 0.09, -0.1, 0.19, 0.26, 0, 0, 0.45],
      [0.2, 0.11, 0.09, 0.13, 0.2, 0.26, 0, 0, -0.4, 1],
      [0.12, 0.14, 0.08, -0.22, 0.14, 0.25, 0, 0, 0.2],
      [0.2, 0.1, 0.2, 0.0, 0.24, -0.27, -0.4, 0, 0, 1],
    ],
    // Claude：棕色捲髮（份量多）
    curly: [
      [0.64, 0.16, 0.58, 0, 0.23, 0],
      [0.62, 0.38, 0.12, 0, 0.04, -0.26],
      [0.09, 0.28, 0.4, 0.31, 0.1, -0.03],
      [0.09, 0.28, 0.4, -0.31, 0.1, -0.03],
      [0.26, 0.14, 0.26, -0.17, 0.33, 0.08, 0.1, 0.3, 0.25],
      [0.26, 0.14, 0.26, 0.15, 0.34, 0.06, 0.1, -0.3, -0.25, 1],
      [0.28, 0.14, 0.26, 0.0, 0.37, -0.1, 0.25, 0, 0],
      [0.22, 0.14, 0.24, -0.29, 0.26, -0.05, 0, 0, 0.5, 1],
      [0.22, 0.14, 0.24, 0.3, 0.26, -0.06, 0, 0, -0.5],
      [0.18, 0.16, 0.2, -0.32, 0.08, 0.08, 0, 0, 0.2],
      [0.18, 0.16, 0.2, 0.32, 0.08, 0.08, 0, 0, -0.2, 1],
      [0.24, 0.13, 0.2, 0.0, 0.25, -0.26, -0.3, 0, 0, 1],
      [0.22, 0.15, 0.1, -0.15, 0.18, 0.27, 0, 0, 0.35],
      [0.2, 0.15, 0.1, 0.06, 0.19, 0.275, 0, 0, -0.2, 1],
      [0.16, 0.13, 0.1, 0.22, 0.17, 0.27, 0, 0, -0.45],
    ],
    // 陳思妤：深棕低馬尾（馬尾在左側，搭到肩上）
    ponytail: [
      [0.62, 0.15, 0.56, 0, 0.23, 0],
      [0.5, 0.1, 0.42, -0.02, 0.32, -0.02, 0, 0, 0, 1],
      [0.42, 0.15, 0.11, -0.06, 0.19, 0.26, 0, 0, -0.22],
      [0.2, 0.12, 0.1, 0.18, 0.21, 0.26, 0, 0, 0.15, 1],
      [0.1, 0.42, 0.14, -0.31, -0.05, 0.13],
      [0.08, 0.1, 0.1, -0.27, -0.28, 0.17, 0, 0, 0.4, 1],
      [0.08, 0.3, 0.36, 0.3, 0.06, -0.04],
      [0.08, 0.3, 0.3, -0.3, 0.08, -0.08],
      [0.62, 0.42, 0.12, 0, 0.0, -0.26],
      [0.13, 0.13, 0.13, 0.22, -0.16, -0.24, 0, 0, 0, 1],
      [0.15, 0.34, 0.15, 0.3, -0.38, -0.12, 0.3, 0, -0.2],
      [0.12, 0.14, 0.12, 0.33, -0.56, -0.02, 0.5, 0, -0.1, 1],
    ],
    // 王悅：深黑色側分短髮（到下巴）
    sidePart: [
      [0.62, 0.16, 0.56, 0, 0.23, 0],
      [0.52, 0.12, 0.46, 0.03, 0.33, -0.02, 0, 0, -0.08, 1],
      [0.46, 0.16, 0.12, 0.06, 0.2, 0.26, 0, 0, -0.28],
      [0.18, 0.14, 0.1, -0.2, 0.25, 0.26, 0, 0, 0.2, 1],
      [0.12, 0.22, 0.12, 0.27, 0.06, 0.2, 0, 0, -0.15],
      [0.09, 0.42, 0.26, 0.31, -0.02, -0.1],
      [0.09, 0.42, 0.26, -0.31, -0.02, -0.1],
      [0.62, 0.48, 0.12, 0, -0.02, -0.26],
      [0.1, 0.1, 0.28, 0.33, -0.24, -0.1, 0, 0, 0.4, 1],
      [0.1, 0.1, 0.28, -0.33, -0.24, -0.1, 0, 0, -0.4, 1],
    ],
    // 李沛蓁：深棕齊肩短髮、一刀平瀏海
    bob: [
      [0.62, 0.16, 0.56, 0, 0.23, 0],
      [0.52, 0.1, 0.46, 0, 0.33, -0.02, 0, 0, 0, 1],
      [0.58, 0.14, 0.09, 0, 0.14, 0.265],
      [0.58, 0.03, 0.095, 0, 0.075, 0.266, 0, 0, 0, 1],
      [0.1, 0.62, 0.34, 0.32, -0.12, -0.06],
      [0.1, 0.62, 0.34, -0.32, -0.12, -0.06],
      [0.64, 0.74, 0.13, 0, -0.12, -0.265],
      [0.12, 0.08, 0.36, 0.33, -0.42, -0.06, 0, 0, 0, 1],
      [0.12, 0.08, 0.36, -0.33, -0.42, -0.06, 0, 0, 0, 1],
      [0.64, 0.08, 0.14, 0, -0.46, -0.265, 0, 0, 0, 1],
    ],
    // 黃語彤：紅棕色高包頭
    bun: [
      [0.62, 0.17, 0.57, 0, 0.23, 0],
      [0.3, 0.12, 0.3, -0.15, 0.33, 0.08, 0, 0.2, 0.1, 1],
      [0.3, 0.12, 0.3, 0.15, 0.33, 0.06, 0, -0.2, -0.1],
      [0.34, 0.12, 0.3, 0, 0.34, -0.13, 0.1, 0, 0, 1],
      [0.34, 0.22, 0.32, 0, 0.48, -0.03],
      [0.28, 0.12, 0.26, 0, 0.62, -0.03, 0, 0.3, 0, 1],
      [0.2, 0.08, 0.2, 0, 0.71, -0.03],
      [0.36, 0.14, 0.11, -0.08, 0.2, 0.26, 0, 0, -0.25],
      [0.22, 0.12, 0.1, 0.17, 0.21, 0.26, 0, 0, 0.2, 1],
      [0.08, 0.26, 0.4, 0.3, 0.12, -0.04],
      [0.08, 0.26, 0.4, -0.3, 0.12, -0.04],
      [0.62, 0.36, 0.12, 0, 0.06, -0.26],
      [0.05, 0.26, 0.05, 0.27, -0.12, 0.16],
      [0.05, 0.26, 0.05, -0.27, -0.12, 0.16],
      [0.08, 0.05, 0.05, 0.25, -0.26, 0.17, 0, 0, 0, 1],
      [0.08, 0.05, 0.05, -0.25, -0.26, 0.17, 0, 0, 0, 1],
    ],
  };

  /* 抽象標誌（不放任何文字） */
  function knotLogo(K, parent, x, y, z, s, color, plane) {
    // 六個長方形環扣，依序轉 60 度、彼此交疊，組成中間有六角形空洞的交織結形。
    // bar(u, v, 長, 粗, 角度, 墊高)：u/v 是標誌平面上的座標；相鄰環扣一高一低，看起來像編在一起
    const bar = (u, v, len, th, ang, lift) => {
      const dz = 0.006, up = lift ? 0.002 : 0;
      if (plane === 'x') K.box(parent, dz, th * s, len * s, color, x + up, y + v * s, z + u * s, { rx: -ang, cast: false });
      else K.box(parent, len * s, th * s, dz, color, x + u * s, y + v * s, z + up, { rz: ang, cast: false });
    };
    const R = 0.042, SH = 0.015, LEN = 0.072, WID = 0.032, T = 0.014;
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      const c = Math.cos(a), sn = Math.sin(a), tx = -sn, ty = c;
      const cu = c * R + tx * SH, cv = sn * R + ty * SH, lift = k % 2 === 1;
      [-WID / 2, WID / 2].forEach((o) => bar(cu + c * o, cv + sn * o, LEN, T, a + Math.PI / 2, lift));
      [-LEN / 2 + T / 2, LEN / 2 - T / 2].forEach((o) => bar(cu + tx * o, cv + ty * o, WID, T, a, lift));
    }
  }
  function sunLogo(K, parent, x, y, z, s, color, plane) {
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 6;
      if (plane === 'x') K.box(parent, 0.005, 0.016 * s, 0.11 * s, color, x, y, z, { rx: a, cast: false });
      else K.box(parent, 0.11 * s, 0.016 * s, 0.006, color, x, y, z, { rz: a, cast: false });
    }
  }
  function scaleIcon(K, parent, x, y, z, s, color) {
    K.box(parent, 0.008 * s, 0.05 * s, 0.008, color, x, y, z, { cast: false });
    K.box(parent, 0.07 * s, 0.008 * s, 0.008, color, x, y + 0.025 * s, z, { cast: false });
    K.box(parent, 0.026 * s, 0.006 * s, 0.008, color, x - 0.03 * s, y - 0.002 * s, z, { cast: false });
    K.box(parent, 0.026 * s, 0.006 * s, 0.008, color, x + 0.03 * s, y - 0.002 * s, z, { cast: false });
    K.box(parent, 0.04 * s, 0.008 * s, 0.008, color, x, y - 0.026 * s, z, { cast: false });
  }

  /* 手持物「平放在桌上」的姿勢：正面朝上、上緣朝外 */
  const FLAT = (y) => ({ y, rx: -Math.PI / 2, rz: Math.PI });

  /* ---------------- 隨身小物 ----------------
   * ctx: { K, ap, head, torso, armL, armR, holdL, holdR, front, H(), hand(group, 哪隻手, 設定, 放桌上的姿勢) }
   * 手持物在打字、伸懶腰時會放到桌上，起身再拿起來。
   * 放桌上的位置會自動排；要指定就在 team.js 的那個小物加 deskAt: [左右, 前後]（相對座位，單位公尺）。 */
  const ITEMS = {
    badgeX(c, it) {
      const col = c.K.mat(it.color || '#c8ccd2', { metal: 0.8, rough: 0.3 });
      c.K.box(c.torso, 0.08, 0.018, 0.01, col, 0.12, 0.81, 0.14, { rz: 0.785, cast: false });
      c.K.box(c.torso, 0.08, 0.018, 0.01, col, 0.12, 0.81, 0.141, { rz: -0.785, cast: false });
    },
    headset(c, it) {
      const col = c.K.mat(it.color || '#c8ccd2', { metal: 0.7, rough: 0.3 });
      c.H(0.05, 0.11, 0.1, col, 0.395, -0.03, 0.08);
      c.H(0.02, 0.06, 0.02, '#222', 0.375, 0.04, 0.08);
      const dx = -0.26, dz = 0.13, len = Math.hypot(dx, dz);
      c.H(0.018, 0.018, len, col, 0.255, -0.11, 0.2, { ry: Math.atan2(dx, dz) });
      c.H(0.04, 0.03, 0.03, col, 0.12, -0.14, 0.27);
    },
    belt(c, it) {
      const col = c.K.mat(it.color || '#c8ccd2', { metal: 0.7, rough: 0.35 });
      c.K.box(c.torso, 0.075, 0.042, 0.012, col, 0, 0.555, 0.15, { cast: false });
      c.K.box(c.torso, 0.045, 0.02, 0.013, '#1a1a1c', 0, 0.555, 0.151, { cast: false });
    },
    tablet(c, it) {
      // 雙手拿在胸前
      const g = c.K.group(c.front, 0, 0.69, 0.27);
      g.rotation.x = -0.55;
      c.K.box(g, 0.32, 0.23, 0.02, c.K.mat('#9a9ca2', { metal: 0.6, rough: 0.35 }), 0, 0, 0);
      c.K.box(g, 0.29, 0.2, 0.006, '#2b2c31', 0, 0, 0.012, { cast: false });
      c.K.box(g, 0.05, 0.05, 0.01, '#2b2c31', -0.11, 0.07, -0.013, { cast: false });
      c.hand(g, 'front', it, FLAT(0.012));
    },
    headphones(c, it) {
      const col = it.color || '#141417';
      const glow = c.K.mat('#0b0b0d', { emissive: it.glow || '#5fe3ff', emissiveIntensity: 1.4 });
      c.H(0.46, 0.06, 0.08, col, 0, 0.42, -0.04);
      c.H(0.14, 0.06, 0.08, col, 0.28, 0.37, -0.04, { rz: -0.7 });
      c.H(0.14, 0.06, 0.08, col, -0.28, 0.37, -0.04, { rz: 0.7 });
      c.H(0.05, 0.22, 0.08, col, 0.35, 0.2, -0.02);
      c.H(0.05, 0.22, 0.08, col, -0.35, 0.2, -0.02);
      [1, -1].forEach((s) => {
        c.K.cyl(c.head, 0.11, 0.11, 0.09, col, s * 0.36, HC - 0.02, 0.0, { rz: Math.PI / 2 });
        c.K.cyl(c.head, 0.118, 0.118, 0.02, glow, s * 0.32, HC - 0.02, 0.0, { rz: Math.PI / 2, cast: false });
        knotLogo(c.K, c.head, s * 0.407, HC - 0.02, 0.0, 1.0, it.logo || '#f4f4f4', 'x');
      });
    },
    knotLogo(c, it) {
      knotLogo(c.K, c.torso, 0, 0.74, 0.135, 1.7, it.color || '#f4f4f4');
    },
    sleeveStripes(c, it) {
      c.K.box(c.armL, 0.137, 0.018, 0.147, it.color || '#e6e6ea', 0, -0.08, 0, { cast: false });
      c.K.box(c.armL, 0.137, 0.018, 0.147, it.color || '#e6e6ea', 0, -0.115, 0, { cast: false });
    },
    waistBag(c, it) {
      c.K.box(c.torso, 0.03, 0.56, 0.014, '#18181b', -0.015, 0.725, 0.142, { rz: 0.75, cast: false });
      c.K.box(c.torso, 0.46, 0.035, 0.27, '#18181b', 0, 0.55, 0);
      c.K.box(c.torso, 0.17, 0.11, 0.07, '#2a2a2e', 0.13, 0.53, 0.155);
      const glow = c.K.mat('#0a1a20', { emissive: it.glow || '#5fe3ff', emissiveIntensity: 1.2 });
      c.K.box(c.torso, 0.11, 0.055, 0.006, glow, 0.13, 0.535, 0.192, { cast: false });
      c.K.box(c.torso, 0.012, 0.035, 0.012, glow, 0.04, 0.5, 0.17, { cast: false });
    },
    robot(c, it) {
      const g = c.K.group(c.holdR, 0, 0.05, 0.04);
      const glow = c.K.mat('#0a1a20', { emissive: it.glow || '#5fe3ff', emissiveIntensity: 1.5 });
      c.K.box(g, 0.1, 0.1, 0.08, '#f2f2f4', 0, 0.06, 0);
      c.K.box(g, 0.035, 0.07, 0.04, '#e6e6ea', 0.07, 0.06, 0, { rz: -0.3 });
      c.K.box(g, 0.035, 0.07, 0.04, '#e6e6ea', -0.07, 0.06, 0, { rz: 0.3 });
      knotLogo(c.K, g, 0, 0.06, 0.042, 0.5, '#2a2a2e');
      const hd = c.K.group(g, 0, 0.17, 0);
      c.K.box(hd, 0.14, 0.1, 0.11, '#f6f6f8', 0, 0, 0);
      c.K.box(hd, 0.115, 0.065, 0.01, '#16181c', 0, 0, 0.056, { cast: false });
      c.K.box(hd, 0.025, 0.012, 0.012, glow, -0.025, 0.005, 0.062, { cast: false });
      c.K.box(hd, 0.025, 0.012, 0.012, glow, 0.025, 0.005, 0.062, { cast: false });
      c.K.box(hd, 0.03, 0.008, 0.012, glow, 0, -0.018, 0.062, { cast: false });
      c.K.box(hd, 0.012, 0.05, 0.012, '#dcdce0', 0, 0.075, 0, { cast: false });
      c.K.box(hd, 0.028, 0.028, 0.028, '#f6f6f8', 0, 0.105, 0, { cast: false });
      c.rig.anim.robot = g;
      c.rig.anim.robotHead = hd;
      c.hand(g, 'right', it, { y: 0.0, ry: Math.PI });
    },
    sunLogo(c, it) {
      sunLogo(c.K, c.torso, -0.02, 0.76, 0.136, 1.15, it.color || '#f26a1b');
    },
    penPocket(c) {
      c.K.box(c.torso, 0.09, 0.07, 0.012, '#d9cab3', 0.12, 0.66, 0.137, { cast: false });
      c.K.box(c.torso, 0.018, 0.09, 0.018, '#141416', 0.135, 0.7, 0.143, { cast: false });
      c.K.box(c.torso, 0.02, 0.02, 0.02, '#d4a838', 0.135, 0.74, 0.143, { cast: false });
    },
    mug(c, it) {
      const g = c.K.group(c.holdR, 0, 0.04, 0.06);
      c.K.cyl(g, 0.058, 0.058, 0.12, it.color || '#c8612a', 0, 0, 0, { seg: 12 });
      c.K.box(g, 0.02, 0.07, 0.035, it.color || '#c8612a', -0.07, 0, 0);
      sunLogo(c.K, g, 0, 0, 0.06, 0.45, '#f6ede0');
      c.hand(g, 'right', it, { y: 0.06 });
    },
    laptopUnderArm(c, it) {
      const g = c.K.group(c.armL, 0.09, -0.2, 0.02);
      c.K.box(g, 0.025, 0.26, 0.34, c.K.mat('#8e8f95', { metal: 0.5, rough: 0.4 }), 0, 0, 0);
      sunLogo(c.K, g, 0.0135, 0, 0, 0.7, it.logo || '#f26a1b', 'x');
      c.hand(g, 'left', it, { y: 0.013, rz: Math.PI / 2 });
    },
    watch(c, it) {
      const arm = it.side === 'right' ? c.armR : c.armL;
      const s = it.side === 'right' ? -1 : 1;
      c.K.box(arm, 0.142, 0.035, 0.152, '#1b1b1e', 0, -0.315, 0, { cast: false });
      c.K.box(arm, 0.02, 0.04, 0.055, '#9a9ca2', s * 0.072, -0.315, 0.0, { cast: false });
    },
    shieldBadge(c, it) {
      const col = c.K.mat(it.color || '#d4a838', { metal: 0.8, rough: 0.3 });
      c.K.box(c.torso, 0.055, 0.04, 0.01, col, 0.12, 0.825, 0.14, { cast: false });
      c.K.box(c.torso, 0.04, 0.04, 0.01, col, 0.12, 0.8, 0.14, { rz: 0.785, cast: false });
    },
    calculator(c, it) {
      const g = c.K.group(c.holdR, 0, 0.1, 0.07);
      g.rotation.x = -0.2;
      c.K.box(g, 0.16, 0.22, 0.035, '#3a3a40', 0, 0, 0);
      c.K.box(g, 0.12, 0.05, 0.006, '#b9c9a8', 0, 0.065, 0.019, { cast: false });
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 3; k++)
          c.K.box(g, 0.026, 0.02, 0.006, '#8d8d95', -0.04 + k * 0.035, 0.01 - r * 0.032, 0.019, { cast: false });
      c.K.box(g, 0.03, 0.05, 0.006, '#d4a838', 0.06, -0.025, 0.019, { cast: false });
      // 紅筆
      c.K.box(g, 0.026, 0.22, 0.026, '#a8202a', -0.1, -0.02, 0.01, { rz: 0.3 });
      c.K.box(g, 0.03, 0.03, 0.03, '#d4a838', -0.068, -0.12, 0.01, { rz: 0.3, cast: false });
      c.hand(g, 'right', it, FLAT(0.02));
    },
    magnifier(c, it) {
      const hold = it.hand === 'left' ? c.holdL : c.holdR;
      const g = c.K.group(hold, 0, 0.03, 0.05);
      const ring = c.K.mat(it.ring || '#d4a838', { metal: it.ring === '#d4a838' ? 0.8 : 0.1, rough: 0.35 });
      c.K.box(g, 0.035, 0.12, 0.035, '#1b1b1e', 0, 0.03, 0);
      c.K.torus(g, 0.085, 0.017, ring, 0, 0.18, 0, {});
      c.K.cyl(g, 0.075, 0.075, 0.01, c.K.mat('#dff3ff', { opacity: 0.45, rough: 0.1 }), 0, 0.18, 0, { rx: Math.PI / 2, cast: false });
      if (it.symbol === 'dollar') {
        const gold = ring;
        const z = 0.008;
        [[0.05, 0.012, 0, 0.21], [0.05, 0.012, 0, 0.18], [0.05, 0.012, 0, 0.15],
         [0.012, 0.03, -0.02, 0.195], [0.012, 0.03, 0.02, 0.165], [0.01, 0.09, 0, 0.18]].forEach((b) =>
          c.K.box(g, b[0], b[1], 0.008, gold, b[2], b[3], z, { cast: false }));
      }
      // 放桌上時鏡片朝外側
      c.hand(g, it.hand === 'left' ? 'left' : 'right', it, { y: 0.02, rx: -Math.PI / 2, rz: it.hand === 'left' ? -Math.PI / 2 : Math.PI / 2 });
    },
    idBadge(c, it) {
      const strap = it.strap || '#1a1a1d';
      c.K.box(c.torso, 0.018, 0.2, 0.01, strap, 0.045, 0.81, 0.142, { rz: -0.2, cast: false });
      c.K.box(c.torso, 0.018, 0.2, 0.01, strap, -0.045, 0.81, 0.142, { rz: 0.2, cast: false });
      c.K.box(c.torso, 0.1, 0.12, 0.01, '#2e2e33', 0, 0.665, 0.145, { cast: false });
      c.K.box(c.torso, 0.085, 0.1, 0.006, '#ececec', 0, 0.665, 0.151, { cast: false });
      c.K.box(c.torso, 0.025, 0.025, 0.006, '#9a9a9a', 0, 0.68, 0.155, { cast: false });
      c.K.box(c.torso, 0.045, 0.02, 0.006, '#9a9a9a', 0, 0.648, 0.155, { cast: false });
    },
    lockBadge(c, it) {
      const col = c.K.mat(it.color || '#d4a838', { metal: 0.8, rough: 0.3 });
      c.K.box(c.torso, 0.05, 0.04, 0.012, col, 0.12, 0.825, 0.141, { cast: false });
      c.K.box(c.torso, 0.034, 0.008, 0.01, col, 0.12, 0.862, 0.141, { cast: false });
      c.K.box(c.torso, 0.008, 0.028, 0.01, col, 0.104, 0.85, 0.141, { cast: false });
      c.K.box(c.torso, 0.008, 0.028, 0.01, col, 0.136, 0.85, 0.141, { cast: false });
      c.K.box(c.torso, 0.01, 0.015, 0.006, '#3a2a10', 0.12, 0.822, 0.148, { cast: false });
    },
    keys(c, it) {
      const g = c.K.group(c.holdR, 0, 0.0, 0.07);
      c.K.torus(g, 0.035, 0.007, c.K.mat('#c8ccd2', { metal: 0.8, rough: 0.3 }), 0, 0.04, 0, { cast: false });
      [['#3a9a3a', -0.035, 0.25], ['#e3c22a', 0, 0], ['#c8352c', 0.035, -0.25]].forEach((k) => {
        const kg = c.K.group(g, k[1], 0.0, 0.01);
        kg.rotation.z = k[2];
        c.K.box(kg, 0.045, 0.04, 0.014, k[0], 0, -0.01, 0, { cast: false });
        c.K.box(kg, 0.016, 0.09, 0.012, k[0], 0, -0.07, 0, { cast: false });
        c.K.box(kg, 0.02, 0.012, 0.012, k[0], 0.012, -0.09, 0, { cast: false });
      });
      c.hand(g, 'right', it, FLAT(0.012));
    },
    hoopEarrings(c, it) {
      const col = c.K.mat(it.color || '#c8ccd2', { metal: 0.9, rough: 0.25 });
      c.K.torus(c.head, 0.028, 0.008, col, 0.3, HC - 0.13, 0.07, { ry: Math.PI / 2, cast: false });
      c.K.torus(c.head, 0.028, 0.008, col, -0.3, HC - 0.13, 0.07, { ry: Math.PI / 2, cast: false });
    },
    pencilClip(c) {
      const g = c.K.group(c.head, 0.36, HC + 0.2, 0.07);
      g.rotation.x = -0.9;
      c.K.box(g, 0.036, 0.22, 0.036, '#c0302a', 0, 0, 0);
      c.K.box(g, 0.026, 0.035, 0.026, '#f0d9b0', 0, 0.125, 0, { cast: false });
      c.K.box(g, 0.012, 0.02, 0.012, '#2a2a2a', 0, 0.15, 0, { cast: false });
    },
    squareEarrings(c, it) {
      c.H(0.045, 0.045, 0.045, it.color || '#c0302a', 0.3, -0.16, 0.16);
      c.H(0.045, 0.045, 0.045, it.color || '#c0302a', -0.3, -0.16, 0.16);
    },
    nineGridBackpack(c) {
      const green = '#2d4a36';
      c.K.box(c.torso, 0.44, 0.46, 0.18, green, 0, 0.72, -0.23);
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 3; k++) {
          const x = -0.135 + k * 0.135, y = 0.58 + r * 0.14;
          c.K.box(c.torso, 0.11, 0.11, 0.012, '#b8322c', x, y, -0.326, { cast: false });
          c.K.box(c.torso, 0.08, 0.025, 0.014, '#f1e6cf', x, y + 0.04, -0.33, { cast: false });
        }
      c.K.box(c.torso, 0.16, 0.04, 0.05, '#b8322c', 0, 0.97, -0.23);
      [0.14, -0.14].forEach((x) => {
        c.K.box(c.torso, 0.045, 0.36, 0.02, '#b8322c', x, 0.73, 0.142, { cast: false });
        c.K.box(c.torso, 0.045, 0.03, 0.3, '#b8322c', x, 0.925, -0.01, { cast: false });
        c.K.box(c.torso, 0.05, 0.03, 0.025, '#c8ccd2', x, 0.79, 0.15, { cast: false });
      });
    },
    clipboard(c, it) {
      const g = c.K.group(c.holdL, 0, 0.1, 0.07);
      g.rotation.x = -0.15;
      c.K.box(g, 0.22, 0.3, 0.02, '#2f4a3a', 0, 0, 0);
      c.K.box(g, 0.19, 0.25, 0.005, '#f3eee2', 0, -0.01, 0.012, { cast: false });
      // 三列：深色勾選框 + 紅色勾號（短筆往右下、長筆往右上，勾尾超出框外）+ 兩條灰線
      const frame = '#3a3a3e', tick = '#c0302a', o = { cast: false };
      for (let r = 0; r < 3; r++) {
        const x = -0.055, y = 0.065 - r * 0.065, z = 0.016;
        c.K.box(g, 0.04, 0.006, 0.005, frame, x, y + 0.017, z, o);
        c.K.box(g, 0.04, 0.006, 0.005, frame, x, y - 0.017, z, o);
        c.K.box(g, 0.006, 0.04, 0.005, frame, x - 0.017, y, z, o);
        c.K.box(g, 0.006, 0.04, 0.005, frame, x + 0.017, y, z, o);
        c.K.box(g, 0.019, 0.008, 0.005, tick, x - 0.009, y - 0.005, z + 0.003, { rz: -0.86, cast: false });
        c.K.box(g, 0.04, 0.008, 0.005, tick, x + 0.0095, y + 0.003, z + 0.003, { rz: 0.88, cast: false });
        c.K.box(g, 0.1, 0.01, 0.005, '#9a9a9a', 0.04, y + 0.008, z, o);
        c.K.box(g, 0.07, 0.01, 0.005, '#9a9a9a', 0.025, y - 0.012, z, o);
      }
      c.K.box(g, 0.08, 0.03, 0.025, c.K.mat('#b0b4ba', { metal: 0.7, rough: 0.3 }), 0, 0.15, 0.01, { cast: false });
      c.hand(g, 'left', it, FLAT(0.015));
    },
    scaleBadge(c, it) {
      scaleIcon(c.K, c.torso, 0.12, 0.81, 0.142, 1.0, c.K.mat(it.color || '#c8ccd2', { metal: 0.8, rough: 0.3 }));
    },
    markerPocket(c) {
      c.K.box(c.torso, 0.1, 0.02, 0.012, '#6a1824', -0.12, 0.65, 0.14, { cast: false });
      c.K.box(c.torso, 0.022, 0.1, 0.022, '#121214', -0.13, 0.69, 0.145, { cast: false });
      c.K.box(c.torso, 0.024, 0.02, 0.024, '#b9bcc2', -0.13, 0.735, 0.145, { cast: false });
    },
    lawBook(c, it) {
      const g = c.K.group(c.holdL, 0.02, 0.12, 0.08);
      g.rotation.y = -0.2;
      const cover = '#7a1f2a';
      c.K.box(g, 0.21, 0.29, 0.11, '#f3ead6', 0.005, 0, 0);
      c.K.box(g, 0.22, 0.3, 0.012, cover, 0, 0, 0.06);
      c.K.box(g, 0.22, 0.3, 0.012, cover, 0, 0, -0.06);
      c.K.box(g, 0.012, 0.3, 0.13, cover, -0.11, 0, 0);
      scaleIcon(c.K, g, 0, 0.0, 0.068, 1.6, c.K.mat('#c8ccd2', { metal: 0.8, rough: 0.3 }));
      const tabs = ['#ffd54a', '#6fd0f2', '#f27ac0', '#9be36a'];
      tabs.forEach((col, i) => {
        c.K.box(g, 0.035, 0.035, 0.01, col, -0.07 + i * 0.045, 0.16, 0.02 - i * 0.012, { cast: false });
        c.K.box(g, 0.03, 0.035, 0.01, col, 0.115, 0.09 - i * 0.055, 0.0, { cast: false });
      });
      c.hand(g, 'left', it, FLAT(0.065));
    },
    redPen(c, it) {
      const g = c.K.group(c.holdR, 0, 0.09, 0.05);
      g.rotation.z = 0.35;
      c.K.box(g, 0.026, 0.2, 0.026, '#b3202c', 0, 0, 0);
      c.K.box(g, 0.02, 0.04, 0.02, '#c8ccd2', 0, -0.11, 0, { cast: false });
      c.K.box(g, 0.03, 0.03, 0.03, '#c8ccd2', 0, 0.09, 0, { cast: false });
      c.hand(g, 'right', it, { y: 0.015, rz: Math.PI / 2 });
    },
  };

  /* ---------------- 組裝角色 ---------------- */
  O.buildCharacter = function (member) {
    const K = O.Kit;
    const ap = member.appearance;
    const root = new THREE.Group();
    root.userData.agentId = member.id;
    const figure = K.group(root, 0, 0, 0);
    figure.scale.setScalar(SCALE);
    const body = K.group(figure, 0, 0, 0);
    const torso = K.group(body, 0, 0, 0);
    const front = K.group(torso, 0, 0, 0);
    const legL = K.group(body, 0.105, 0.46, 0);
    const legR = K.group(body, -0.105, 0.46, 0);
    const armL = K.group(body, 0.29, 0.86, 0);
    const armR = K.group(body, -0.29, 0.86, 0);
    const head = K.group(body, 0, 0.94, 0);
    const holdL = K.group(armL, 0, -0.38, 0);
    const holdR = K.group(armR, 0, -0.38, 0);
    // 窄裙：一整片掛在骨盆上（不跟著單腳擺動），腿在裙子下面活動
    const skirt = ap.bottom.type === 'skirt' ? K.group(body, 0, 0.46, 0) : null;

    const rig = {
      id: member.id, root, figure, body, torso, head, legL, legR, armL, armR, holdL, holdR, skirt,
      handItems: [], anim: {}, hold: ap.hold || {}, itemsOnDesk: false, itemsParent: null, restMode: null,
      cur: { legL: 0, legR: 0, armL: 0, armR: 0, armLz: 0, armRz: 0, headX: 0, headY: 0, bodyY: 0, figY: 0, lean: 0 },
      walkPhase: 0,
    };
    const H = (w, h, d, c, x, y, z, o) => K.box(head, w, h, d, c, x, HC + y, z, o);
    const hand = (g, side, it, rest) => rig.handItems.push({ g, side: side || 'right', at: it && it.deskAt, rest: rest || {} });
    const ctx = { K, ap, rig, head, torso, armL, armR, holdL, holdR, front, H, hand };

    const o = ap.outfit;
    const b = ap.bottom;
    const skin = ap.skin;

    /* --- 頭與臉 --- */
    H(0.56, 0.52, 0.5, skin, 0, 0, 0);
    H(0.05, 0.11, 0.09, skin, 0.29, -0.03, 0);
    H(0.05, 0.11, 0.09, skin, -0.29, -0.03, 0);
    const f = ap.face || {};
    const eye = f.eyes || '#17120f';
    const brow = f.brows || '#1d1512';
    const browY = f.browY != null ? f.browY : 0.085;
    [1, -1].forEach((s) => {
      H(0.075, 0.12, 0.02, eye, s * 0.11, -0.03, 0.255, { cast: false });
      H(0.025, 0.03, 0.01, '#ffffff', s * 0.11 - 0.017, 0.0, 0.266, { cast: false });
      H(0.12, 0.026, 0.02, brow, s * 0.11, browY, 0.256, { rz: f.lashes ? -s * 0.08 : 0, cast: false });
      if (f.lashes) H(0.04, 0.018, 0.02, eye, s * 0.16, 0.02, 0.256, { rz: s * 0.5, cast: false });
      if (f.blush) H(0.07, 0.035, 0.012, '#f2a3a0', s * 0.17, -0.1, 0.252, { cast: false });
    });
    H(0.024, 0.02, 0.012, '#e6b48e', 0, -0.075, 0.256, { cast: false });
    if (f.mouth === 'open') {
      H(0.085, 0.05, 0.02, '#a8383a', 0, -0.145, 0.255, { cast: false });
      H(0.05, 0.018, 0.01, '#e88080', 0, -0.162, 0.262, { cast: false });
    } else {
      H(0.06, 0.016, 0.02, '#b5524a', 0, -0.145, 0.255, { cast: false });
      H(0.018, 0.016, 0.02, '#b5524a', 0.035, -0.135, 0.255, { cast: false });
      H(0.018, 0.016, 0.02, '#b5524a', -0.035, -0.135, 0.255, { cast: false });
    }
    if (ap.glasses) {
      const g = ap.glasses, t = g.thin ? 0.014 : 0.026, c = g.color || '#111';
      [1, -1].forEach((s) => {
        const x = s * 0.11;
        H(0.175, t, t, c, x, 0.035, 0.272, { cast: false });
        H(0.175, t, t, c, x, -0.095, 0.272, { cast: false });
        H(t, 0.13, t, c, x - 0.0875, -0.03, 0.272, { cast: false });
        H(t, 0.13, t, c, x + 0.0875, -0.03, 0.272, { cast: false });
        H(t, t, 0.26, c, s * 0.285, 0.02, 0.14, { cast: false });
      });
      H(0.05, t, t, c, 0, 0.0, 0.272, { cast: false });
    }
    /* --- 頭髮 --- */
    const hair = ap.hair;
    (HAIR[hair.style] || HAIR.short).forEach((p) => {
      H(p[0], p[1], p[2], p[9] ? hair.shade || hair.color : hair.color, p[3], p[4], p[5], { rx: p[6], ry: p[7], rz: p[8] });
    });
    if (hair.clip) {
      // 方塊金色髮夾（左側）
      const gold = K.mat(hair.clip, { metal: 0.8, rough: 0.3 });
      H(0.02, 0.02, 0.1, gold, 0.348, 0.205, 0.1, { cast: false });
      H(0.02, 0.02, 0.1, gold, 0.348, 0.125, 0.1, { cast: false });
      H(0.02, 0.1, 0.02, gold, 0.348, 0.165, 0.06, { cast: false });
      H(0.02, 0.1, 0.02, gold, 0.348, 0.165, 0.14, { cast: false });
      // 馬尾髮圈
      H(0.15, 0.04, 0.15, gold, 0.24, -0.23, -0.2, { cast: false });
    }

    /* --- 上半身 --- */
    K.box(torso, 0.16, 0.05, 0.14, skin, 0, 0.935, 0);
    if (o.type === 'shirtVest') {
      K.box(torso, 0.44, 0.4, 0.26, o.shirt, 0, 0.72, 0);
      [1, -1].forEach((s) => {
        K.box(torso, 0.17, 0.34, 0.02, o.vest, s * 0.135, 0.7, 0.135);
        K.box(torso, 0.02, 0.38, 0.265, o.vest, s * 0.222, 0.71, 0);
        K.box(torso, 0.07, 0.04, 0.03, o.shirt, s * 0.045, 0.905, 0.125, { rz: -s * 0.4, cast: false });
      });
      K.box(torso, 0.445, 0.38, 0.02, o.vest, 0, 0.71, -0.135);
      K.box(torso, 0.06, 0.26, 0.02, o.tie, 0, 0.76, 0.142, { cast: false });
      K.box(torso, 0.07, 0.05, 0.026, o.tie, 0, 0.885, 0.14, { cast: false });
      [0.66, 0.6].forEach((y) => K.box(torso, 0.02, 0.02, 0.01, '#55555c', 0.06, y, 0.148, { cast: false }));
    } else if (o.type === 'blazer') {
      K.box(torso, 0.44, 0.4, 0.26, o.jacket, 0, 0.72, 0);
      K.box(torso, 0.13, 0.2, 0.02, o.shirt, 0, 0.82, 0.133);
      [1, -1].forEach((s) => {
        K.box(torso, 0.05, 0.22, 0.025, o.lapel, s * 0.085, 0.81, 0.138, { rz: s * 0.35 });
        K.box(torso, 0.06, 0.04, 0.02, o.shirt, s * 0.05, 0.905, 0.14, { rz: -s * 0.5, cast: false });
        K.box(torso, 0.11, 0.025, 0.012, o.lapel, s * 0.12, 0.585, 0.142, { cast: false });
      });
      K.box(torso, 0.46, 0.13, 0.28, o.jacket, 0, 0.5, 0);
      K.box(torso, 0.03, 0.03, 0.01, o.button || '#888', 0, 0.665, 0.142, { cast: false });
    } else if (o.type === 'hoodie') {
      K.box(torso, 0.44, 0.4, 0.26, o.hoodie, 0, 0.72, 0);
      K.box(torso, 0.38, 0.16, 0.12, o.hoodie, 0, 0.93, -0.1);
      K.box(torso, 0.3, 0.05, 0.03, o.shade, 0, 0.915, 0.11);
      K.box(torso, 0.12, 0.04, 0.02, o.tee, 0, 0.9, 0.125, { cast: false });
      K.box(torso, 0.015, 0.13, 0.015, o.string, 0.05, 0.83, 0.14, { cast: false });
      K.box(torso, 0.015, 0.13, 0.015, o.string, -0.05, 0.83, 0.14, { cast: false });
      K.box(torso, 0.26, 0.11, 0.015, o.shade, 0, 0.6, 0.135, { cast: false });
      K.box(torso, 0.45, 0.05, 0.27, o.shade, 0, 0.535, 0);
    } else if (o.type === 'vest') {
      K.box(torso, 0.44, 0.4, 0.26, o.shirt, 0, 0.72, 0);
      [1, -1].forEach((s) => {
        K.box(torso, 0.2, 0.32, 0.02, o.vest, s * 0.115, 0.68, 0.135);
        K.box(torso, 0.08, 0.06, 0.02, o.vest, s * 0.06, 0.82, 0.136, { rz: s * 0.5 });
        K.box(torso, 0.02, 0.38, 0.265, o.vest, s * 0.222, 0.71, 0);
        K.box(torso, 0.07, 0.04, 0.03, o.shirt, s * 0.045, 0.905, 0.125, { rz: -s * 0.4, cast: false });
        K.box(torso, 0.1, 0.02, 0.012, o.vest, s * 0.12, 0.6, 0.147, { cast: false });
      });
      K.box(torso, 0.445, 0.38, 0.02, o.vest, 0, 0.71, -0.135);
      K.box(torso, 0.02, 0.02, 0.01, '#c8ccd2', 0, 0.62, 0.148, { cast: false });
      K.box(torso, 0.02, 0.02, 0.01, '#c8ccd2', 0, 0.57, 0.148, { cast: false });
    }
    // 腰 / 骨盆
    K.box(torso, 0.42, 0.1, 0.25, b.color, 0, 0.5, 0);

    /* --- 手臂 --- */
    const sleeve = o.type === 'blazer' ? o.jacket : o.type === 'hoodie' ? o.hoodie : o.shirt;
    [armL, armR].forEach((arm) => {
      if (o.rolled) {
        K.box(arm, 0.13, 0.22, 0.14, sleeve, 0, -0.1, 0);
        K.box(arm, 0.145, 0.05, 0.155, sleeve, 0, -0.215, 0);
        K.box(arm, 0.115, 0.1, 0.125, skin, 0, -0.29, 0);
      } else {
        K.box(arm, 0.13, 0.34, 0.14, sleeve, 0, -0.15, 0);
        if (o.type === 'blazer') K.box(arm, 0.135, 0.035, 0.145, o.shirt, 0, -0.31, 0, { cast: false });
        if (o.type === 'hoodie') K.box(arm, 0.135, 0.04, 0.145, o.shade, 0, -0.305, 0, { cast: false });
      }
      K.box(arm, 0.12, 0.11, 0.12, skin, 0, -0.375, 0);
    });

    /* --- 腿與鞋 --- */
    const sh = ap.shoes;
    if (skirt) {
      const L = b.length || 0.22;
      // 上緣稍微蓋進骨盆，避免接縫；寬度包住兩條腿
      K.box(skirt, 0.43, L + 0.03, 0.29, b.color, 0, -L / 2 + 0.015, 0);
      K.box(skirt, 0.435, 0.02, 0.295, b.hem || b.color, 0, -L + 0.01, 0, { cast: false });
    }
    [[legL, 1], [legR, -1]].forEach(([leg, s]) => {
      if (skirt) {
        // 裙子底下只露出小腿；上端藏進裙子裡一點
        const L = b.length || 0.22;
        const top = L - 0.03, rest = 0.4 - top;
        K.box(leg, 0.14, rest, 0.15, skin, 0, -top - rest / 2, 0);
      } else {
        K.box(leg, 0.19, 0.39, 0.22, b.color, 0, -0.195, 0);
        if (b.type === 'cargo') {
          K.box(leg, 0.035, 0.11, 0.11, b.pocket || b.color, s * 0.11, -0.16, 0.0, { cast: false });
          K.box(leg, 0.2, 0.04, 0.23, b.pocket || b.color, 0, -0.355, 0, { cast: false });
        }
      }
      if (sh.type === 'sneaker') {
        K.box(leg, 0.2, 0.05, 0.28, sh.sole, 0, -0.435, 0.03);
        K.box(leg, 0.19, 0.06, 0.25, sh.color, 0, -0.385, 0.025);
        K.box(leg, 0.1, 0.015, 0.1, sh.sole, 0, -0.35, 0.07, { cast: false });
      } else if (sh.type === 'heel') {
        K.box(leg, 0.16, 0.07, 0.24, sh.color, 0, -0.425, 0.03);
        K.box(leg, 0.06, 0.05, 0.06, sh.color, 0, -0.44, -0.07, { cast: false });
      } else {
        K.box(leg, 0.18, 0.08, 0.27, sh.color, 0, -0.42, 0.03);
      }
    });

    /* --- 小物 --- */
    (ap.items || []).forEach((it) => {
      const fn = ITEMS[it.type];
      if (fn) fn(ctx, it);
      else console.warn('[office3d] 不認得的小物：', it.type);
    });

    /* --- 換地方工作 / 打電動時才出現的東西 --- */
    // 放在腿上的筆電（坐沙發、懶骨頭時）
    rig.lapLaptop = K.group(body, 0, HIP + 0.1, 0.24);
    laptopMesh(K, rig.lapLaptop, 1);
    // 放在桌面上的筆電（會議桌、吧台；用公尺計，跟桌子對齊）
    rig.tableLaptop = K.group(root, 0, 0.76, 0.48);
    laptopMesh(K, rig.tableLaptop, 1.2);
    // 電玩手把（雙手拿在胸前）
    rig.controller = K.group(front, 0, 0.62, 0.3);
    rig.controller.scale.setScalar(1.5);
    if (O.makeController) O.makeController(rig.controller, '#f2f2f4');
    // 白板筆
    rig.marker = K.group(holdR, 0, 0.02, 0.06);
    K.box(rig.marker, 0.03, 0.03, 0.14, '#2a5ac0', 0, 0, 0.03, { cast: false });
    K.box(rig.marker, 0.032, 0.032, 0.03, '#f2f2f4', 0, 0, -0.04, { cast: false });
    [rig.lapLaptop, rig.tableLaptop, rig.controller, rig.marker].forEach((g) => (g.visible = false));

    // 合併每個部位裡的方塊，降低 draw call
    [head, torso, legL, legR, armL, armR].concat(skirt ? [skirt] : []).forEach((g) => K.mergeChildren(g));
    rig.handItems.forEach((h) => K.mergeChildren(h.g));

    // 手持物的兩個位置：手上（原本的位置）與桌上（相對角色本身，坐在座位時剛好在桌面）
    const desk = member.desk || {};
    const deskY = desk.type === 'marble' ? 0.78 : 0.76;
    const deskZ = (desk.dist != null ? desk.dist : 0.75) - 0.3;
    const count = { left: 0, right: 0, front: 0 };
    const sideCount = { 1: 0, '-1': 0 };
    rig.handItems.forEach((h) => {
      h.home = { parent: h.g.parent, pos: h.g.position.clone(), quat: h.g.quaternion.clone() };
      const n = count[h.side]++;
      const s = h.side === 'left' ? 1 : h.side === 'right' ? -1 : 0;
      // 不在自己桌上時（沙發、懶骨頭、吧台）：放在身體兩側
      h.sideSign = s || 1;
      h.sideN = sideCount[h.sideSign]++;
      h.sidePos = new THREE.Vector3();
      const at = h.at || (s ? [s * (0.42 + n * 0.22), deskZ] : [0.12, deskZ]);
      const r = h.rest;
      h.desk = {
        pos: new THREE.Vector3(at[0], deskY + (r.y || 0), at[1]),
        quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(r.rx || 0, r.ry || 0, r.rz || 0)),
      };
    });

    // 標記每個網格屬於誰（點擊時用）
    root.traverse((m) => {
      if (m.isMesh) {
        m.userData.agentId = member.id;
      }
    });

    rig.update = function (dt, t, st) {
      updateRig(rig, dt, t, st);
    };
    return rig;
  };

  /* 筆電（底座 + 打開的螢幕，螢幕朝向使用者）。s：大小倍率 */
  function laptopMesh(K, g, s) {
    const al = K.mat('#a3a4aa', { metal: 0.5, rough: 0.4 });
    const scr = K.mat('#1b2a44', { emissive: '#5a8ad0', emissiveIntensity: 0.8 });
    K.box(g, 0.34 * s, 0.018 * s, 0.24 * s, al, 0, 0.009 * s, 0, { cast: false });
    K.box(g, 0.3 * s, 0.004, 0.11 * s, '#2a2a2e', 0, 0.02 * s, -0.03 * s, { cast: false });
    const lid = K.group(g, 0, 0.018 * s, 0.12 * s);
    lid.rotation.x = 0.3;
    K.box(lid, 0.34 * s, 0.23 * s, 0.012 * s, al, 0, 0.115 * s, 0, { cast: false });
    K.box(lid, 0.31 * s, 0.2 * s, 0.003, scr, 0, 0.115 * s, -0.008 * s, { cast: false });
    K.mergeChildren(lid);
    K.mergeChildren(g);
  }

  /* ---------------- 動作 ---------------- */
  const SIT = { sit: 1, type: 1, talkSit: 1, sitRelax: 1, robot: 1, stretch: 1, drinkSit: 1, lapWork: 1, tableWork: 1, game: 1 };
  O.isSitPose = (p) => !!SIT[p];
  // 這些動作會先把手上的東西放下（打字時才不會穿模），結束後再拿起來。
  // desk：在自己座位時放桌上，不在自己座位時放身體兩側；side：一律放身體兩側（沙發座墊、地上、吧台）
  const REST = { type: 'desk', stretch: 'desk', lapWork: 'side', tableWork: 'side', standWork: 'side', game: 'side' };
  const CHAIR = { h: 0.44, lean: 0, legs: -1.5 };
  const SIDE = [0.45, 0, 0.6];

  /* st：{ pose, lookYaw, seat（坐在什麼上：{ h 座面高, lean 往後靠, legs 腿的角度 }）, desk（是否在自己的桌子）,
   *       side（手上東西放旁邊時的 [高度, 前後, 左右間距]）, surface / surfaceZ（筆電放的桌面高度、前後距離） } */
  function updateRig(rig, dt, t, st) {
    const pose = st.pose;
    const hold = rig.hold;
    const hasL = hold.left != null, hasR = hold.right != null;
    const sitting = !!SIT[pose];
    const seat = st.seat || CHAIR;
    const tg = {
      legL: 0, legR: 0,
      armL: hasL ? hold.left : 0.05, armR: hasR ? hold.right : 0.05,
      armLz: hold.leftZ || 0.04, armRz: hold.rightZ ? -hold.rightZ : -0.04,
      headX: 0, headY: st.lookYaw || 0, bodyY: 0,
      // 坐下時整個人降到座面上（座面越低降越多）；懶骨頭、沙發會往後靠
      figY: sitting ? seat.h + 0.06 - HIP * SCALE : 0,
      lean: sitting ? seat.lean || 0 : 0,
    };
    if (sitting) tg.legL = tg.legR = seat.legs;

    switch (pose) {
      case 'walk': {
        const ph = rig.walkPhase;
        const s = Math.sin(ph);
        const stride = rig.skirt ? 0.3 : 0.6; // 窄裙步伐小一點
        tg.legL = s * stride;
        tg.legR = -s * stride;
        tg.armL = hasL ? hold.left + s * 0.06 : -s * 0.5;
        tg.armR = hasR ? hold.right - s * 0.06 : s * 0.5;
        tg.bodyY = Math.abs(Math.cos(ph)) * 0.035;
        break;
      }
      case 'type':
      case 'tableWork':
        tg.armL = -1.25 + Math.sin(t * 17) * 0.07;
        tg.armR = -1.25 + Math.sin(t * 17 + 1.7) * 0.07;
        tg.armLz = -0.12; tg.armRz = 0.12;
        tg.headX = 0.1 + Math.sin(t * 0.7) * 0.03;
        break;
      case 'talk':
      case 'talkSit':
        if (!hasR) tg.armR = -0.55 + Math.sin(t * 3.1) * 0.25;
        else tg.armR = hold.right + Math.sin(t * 3.1) * 0.12;
        tg.headX = Math.sin(t * 2.3) * 0.06;
        break;
      case 'look':
        tg.headX = -0.12;
        if (!hasL) tg.armL = 0.25;
        if (!hasR) tg.armR = 0.25;
        break;
      case 'drink':
      case 'drinkSit':
        tg.armR = -2.25;
        tg.armRz = 0.25;
        tg.headX = -0.12;
        break;
      case 'robot':
        tg.armR = -1.45 + Math.sin(t * 2) * 0.06;
        tg.armRz = 0.2;
        tg.headY = -0.35;
        tg.headX = 0.15;
        break;
      case 'stretch':
        tg.armL = -2.9 + Math.sin(t * 2) * 0.1;
        tg.armR = -2.9 - Math.sin(t * 2) * 0.1;
        tg.headX = -0.15;
        break;
      case 'brew':
        tg.armL = -0.7; tg.armR = -0.7;
        tg.headX = 0.15;
        break;
      case 'lapWork':
        // 筆電放腿上打字
        tg.armL = -0.72 + Math.sin(t * 16) * 0.06;
        tg.armR = -0.72 + Math.sin(t * 16 + 1.7) * 0.06;
        tg.armLz = -0.14; tg.armRz = 0.14;
        tg.headX = 0.32 + Math.sin(t * 0.6) * 0.03;
        break;
      case 'standWork':
        // 站在吧台前用筆電
        tg.armL = -1.45 + Math.sin(t * 15) * 0.06;
        tg.armR = -1.45 + Math.sin(t * 15 + 1.7) * 0.06;
        tg.armLz = -0.14; tg.armRz = 0.14;
        tg.headX = 0.22;
        break;
      case 'whiteboard':
        // 右手在白板上寫字
        tg.armR = -2.35 + Math.sin(t * 2.6) * 0.18;
        tg.armRz = 0.12 + Math.sin(t * 1.7) * 0.12;
        tg.headX = -0.12;
        tg.headY += Math.sin(t * 0.9) * 0.12;
        break;
      case 'game':
        // 雙手拿手把，盯著電視
        tg.armL = -0.95 + Math.sin(t * 11) * 0.04;
        tg.armR = -0.95 + Math.sin(t * 13 + 1) * 0.04;
        tg.armLz = -0.22; tg.armRz = 0.22;
        tg.headX = -0.04;
        tg.headY = Math.sin(t * 1.3) * 0.06;
        tg.bodyY = Math.abs(Math.sin(t * 3)) * 0.01;
        break;
      case 'sitRelax':
        if (!hasL) tg.armL = -0.35;
        if (!hasR) tg.armR = -0.35;
        tg.headY += Math.sin(t * 0.4) * 0.2;
        break;
      default:
        tg.headY += Math.sin(t * 0.5 + rig.root.id) * 0.08;
    }
    // 呼吸
    tg.bodyY += Math.sin(t * 2.2) * 0.004;

    const k = 1 - Math.exp(-dt * 10);
    const c = rig.cur;
    for (const key in tg) c[key] += (tg[key] - c[key]) * k;

    rig.legL.rotation.x = c.legL;
    rig.legR.rotation.x = c.legR;
    rig.armL.rotation.x = c.armL;
    rig.armR.rotation.x = c.armR;
    rig.armL.rotation.z = c.armLz;
    rig.armR.rotation.z = c.armRz;
    rig.head.rotation.x = c.headX;
    rig.head.rotation.y = c.headY;
    // 往後靠：繞髖關節轉，所以要把身體往前、往上補回來
    rig.figure.position.y = c.figY;
    rig.body.rotation.x = -c.lean;
    rig.body.position.z = HIP * Math.sin(c.lean);
    rig.body.position.y = c.bodyY + HIP * (1 - Math.cos(c.lean));
    // 手上的東西保持直立
    rig.holdL.rotation.x = -c.armL;
    rig.holdR.rotation.x = -c.armR;

    // 窄裙整片跟著兩腿的平均角度：走路時幾乎不動，坐下時整片蓋在大腿上
    if (rig.skirt) rig.skirt.rotation.x = (c.legL + c.legR) / 2;

    // 筆電、手把、白板筆：依動作出現
    rig.lapLaptop.visible = pose === 'lapWork';
    rig.lapLaptop.rotation.x = c.legL + 1.5; // 跟著大腿的斜度
    const onTable = pose === 'tableWork' || pose === 'standWork';
    rig.tableLaptop.visible = onTable;
    if (onTable) rig.tableLaptop.position.set(0, st.surface || 0.76, st.surfaceZ || 0.48);
    rig.controller.visible = pose === 'game';
    rig.marker.visible = pose === 'whiteboard';

    // 手持物：放下 / 拿回手上（attach 保留目前的世界位置，再慢慢滑到目標）
    let mode = REST[pose] || null;
    if (mode === 'desk' && !st.desk) mode = 'side';
    // 坐著聊天：原本放下的東西繼續放著，而且留在原地不跟著轉椅子（不會重新拿起來掃過桌面、椅背）
    if (pose === 'talkSit' && rig.itemsOnDesk) mode = 'stay';
    const onDesk = !!mode;
    const parent = mode === 'stay' ? rig.root.parent || rig.root : onDesk ? rig.root : null;
    if (parent !== rig.itemsParent) {
      rig.itemsOnDesk = onDesk;
      rig.itemsParent = parent;
      rig.root.updateMatrixWorld(true);
      rig.handItems.forEach((h) => (parent || h.home.parent).attach(h.g));
    }
    rig.restMode = mode;
    const side = st.side || SIDE;
    const km = 1 - Math.exp(-dt * 9);
    if (mode !== 'stay') rig.handItems.forEach((h) => {
      let goal = h.home;
      if (mode === 'desk') goal = h.desk;
      else if (mode === 'side') {
        h.sidePos.set(h.sideSign * (side[2] + h.sideN * 0.2), side[0] + (h.rest.y || 0), side[1]);
        goal = { pos: h.sidePos, quat: h.desk.quat };
      }
      h.g.position.lerp(goal.pos, km);
      h.g.quaternion.slerp(goal.quat, km);
    });

    if (rig.anim.robot) {
      const active = pose === 'robot';
      if (active) rig.anim.robot.position.y = 0.05 + Math.abs(Math.sin(t * 4)) * 0.04;
      rig.anim.robotHead.rotation.y = active ? Math.sin(t * 3) * 0.5 : Math.sin(t * 0.8) * 0.15;
    }
  }
})();
