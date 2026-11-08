/* =====================================================================
 * 場景配置：房間範圍、家具位置、走路用的路線點、各種「站位 / 坐位」。
 * 一般換座位只要改 js/team.js；這個檔案是改辦公室格局時才需要動。
 *
 * 家具（furniture）：x, z 是中心；rot 是轉向（度，0 = 正面朝 +z）；w 是寬（左右）、d 是深（前後）。
 *   js/world.js 依這裡的位置畫家具；tools/smoke-test.js 也用同一份資料檢查走道有沒有被擋住。
 * 位置（places）：
 *   face：角度（度），0 = 面向 +z（畫面前方）；lookAt：自動面向某個點。
 *   pose：'sit' 坐 / 'stand' 站；seat：坐在什麼上面（chair 椅子、sofa 沙發、beanbag 懶骨頭、stool 吧台椅）。
 *   group：自由座位的種類（sofa、beanbag、pantry、whiteboard、meeting），working 時會從這些地方挑。
 *   work：在這裡工作的動作（lapWork 筆電放腿上、tableWork 筆電放桌上、standWork 站著用筆電、whiteboard 在白板前）。
 *   surface：筆電放的桌面高度（公尺）。idle：休息時可以來。game：打電動的位子。meet：開會的位子。
 *   node：從哪個路線點走過來（沒寫就自動找最近的）。from：坐下時從椅子後面（back）或前面（front）入座。
 *   approach：入座前先走到的點（要特別指定時才寫）。talk：別人來找他聊天時站的位置。
 * ===================================================================== */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const DEG = Math.PI / 180;

  /* 家具本身座標系的一點 (lx, lz) → 地板座標 [x, z] */
  function at(f, lx, lz) {
    const r = (f.rot || 0) * DEG;
    return [f.x + lx * Math.cos(r) + lz * Math.sin(r), f.z - lx * Math.sin(r) + lz * Math.cos(r)];
  }

  /* ---------------- 家具 ---------------- */
  const F = {
    // 茶水間（左側牆）
    counter: { x: -11.65, z: 3.1, rot: 90, w: 3.0, d: 0.6, h: 0.95 },      // 後方吧台（咖啡機、水槽）
    fridge: { x: -11.6, z: 5.05, rot: 90, w: 0.8, d: 0.7 },
    water: { x: -11.65, z: 5.95, rot: 90, w: 0.42, d: 0.42 },              // 飲水機
    bar: { x: -9.65, z: 3.5, rot: 90, w: 2.4, d: 0.6, h: 1.0 },             // 高腳吧台
    stools: [{ x: -8.85, z: 2.7, w: 0.42, d: 0.42 }, { x: -8.85, z: 4.3, w: 0.42, d: 0.42 }],

    // 開放區
    whiteboard: { x: -5.7, z: 6.6, rot: 90, w: 2.2, d: 0.5 },
    copier: { x: 3.8, z: 8.45, rot: 180, w: 0.9, d: 0.65 },
    bookcases: [
      { x: -10.6, z: -1.75, rot: 0, w: 1.8, d: 0.4, h: 1.1 },              // 董事長室外的矮書櫃
      { x: -0.6, z: -1.75, rot: 0, w: 2.0, d: 0.4, h: 1.1 },               // 會議室外的矮書櫃
      { x: -1.6, z: 8.6, rot: 180, w: 2.0, d: 0.4, h: 1.8, open: true },   // 前方的開放式書櫃（兩面都看得到書）
    ],

    // 會議室
    meetingTable: { x: -0.9, z: -5.45, w: 1.3, d: 3.1 },
    meetingScreen: { x: -0.9, z: -8.6, w: 3.0, d: 0.42 },                // 大螢幕 + 下方矮櫃

    // 稽查室
    auditTable: { x: 7.15, z: -5.35, w: 5.5, d: 1.6 },
    auditCabinet: { x: 11.72, z: -6.6, rot: -90, w: 2.8, d: 0.35 },

    // 沙發休憩區（斜放，正面朝角落的電視）
    sofa: { x: 8.7, z: 5.6, rot: 135, w: 2.4, d: 0.95 },
    beanbags: [
      { x: 6.0, z: 5.2, color: '#e0503c' },
      { x: 6.1, z: 7.2, color: '#f2b632' },
      { x: 7.2, z: 8.45, color: '#3fa7b5' },
      { x: 11.35, z: 8.35, color: '#9a7ad6' },
      { x: 11.4, z: 5.5, color: '#f08a3c' },
    ],

    // 盆栽（s 是大小）與立燈
    plants: [
      { x: -11.3, z: -8.4, s: 1.1 }, { x: -4.6, z: -8.4, s: 1.1 }, { x: -11.3, z: -2.6, s: 1.0 },  // 董事長室
      { x: -3.55, z: -8.55, s: 0.8 }, { x: 2.05, z: -8.55, s: 0.8 },                                // 會議室
      { x: 11.5, z: -8.5, s: 1.0 }, { x: 11.5, z: -2.5, s: 0.9 }, { x: 3.0, z: -2.5, s: 0.8 },     // 稽查室
      { x: -6.0, z: -1.55, s: 0.9 }, { x: -4.3, z: -1.5, s: 0.8 }, { x: 3.1, z: -1.55, s: 0.85 }, { x: 11.5, z: -1.5, s: 0.9 },
      { x: -11.6, z: 1.05, s: 0.9 },                                                                  // 茶水間門口
      { x: -7.4, z: 8.5, s: 1.0 }, { x: 0.4, z: 8.5, s: 0.95 }, { x: 2.4, z: 8.5, s: 0.85 }, { x: 5.2, z: 8.5, s: 1.0 },
      { x: 11.6, z: 1.9, s: 0.9 }, { x: 11.65, z: 4.4, s: 0.8 },                                    // 沙發區
    ],
    floorLamps: [{ x: -4.6, z: -2.6 }, { x: 11.65, z: 2.6 }],
  };
  // 茶几、電視櫃跟著沙發的方向擺
  const f = (F.sofa.rot * DEG);
  const fwd = [Math.sin(f), Math.cos(f)];
  F.coffeeTable = { x: F.sofa.x + fwd[0] * 1.75, z: F.sofa.z + fwd[1] * 1.75, rot: 135, w: 1.0, d: 0.6 };
  F.tv = { x: F.sofa.x + fwd[0] * 3.2, z: F.sofa.z + fwd[1] * 3.2, rot: -45, w: 1.8, d: 0.45 };

  /* ---------------- 坐下時的高度與姿勢 ---------------- */
  // h：座面高度；lean：往後靠的角度（弧度）；legs：腿往前抬的角度（-1.5 是水平）
  const SEATS = {
    chair: { h: 0.44, lean: 0, legs: -1.5 },
    exec: { h: 0.46, lean: 0.04, legs: -1.5 },
    sofa: { h: 0.45, lean: 0.14, legs: -1.42, rest: [0.45, -0.05, 0.62] },
    beanbag: { h: 0.3, lean: 0.32, legs: -1.22, rest: [0.03, 0.2, 0.72] },
    stool: { h: 0.72, lean: 0, legs: -1.1 },
  };

  /* ---------------- 自由座位與休息區的位置 ---------------- */
  const P = [];
  // 沙發三個座位（前兩個也是打電動的位子）
  [-0.75, 0, 0.75].forEach((o, i) => {
    const [x, z] = at(F.sofa, -o, 0.1);
    const [ax, az] = at(F.sofa, -o, 0.85);
    P.push({ id: 'sofa' + i, x, z, face: F.sofa.rot, pose: 'sit', seat: 'sofa', group: 'sofa', work: 'lapWork', idle: true, game: i < 2, approach: [ax, az] });
  });
  // 懶骨頭（面向沙發區中間；模型也照這個方向轉）
  const loungeMid = [9.4, 5.2];
  F.beanbags.forEach((b, i) => {
    b.rot = Math.atan2(loungeMid[0] - b.x, loungeMid[1] - b.z) / DEG;
    P.push({ id: 'beanbag' + i, x: b.x, z: b.z, lookAt: loungeMid, pose: 'sit', seat: 'beanbag', group: 'beanbag', work: 'lapWork', idle: true, from: 'front' });
  });
  // 茶水間：站在吧台用筆電、坐吧台椅
  // 吧台站位的聊天位置在旁邊（不擋茶水間中間的走道）
  P.push({ id: 'counterStand', x: -10.95, z: 3.9, face: -90, group: 'pantry', work: 'standWork', surface: F.counter.h, idle: true, talk: [-10.95, 4.75] });
  P.push({ id: 'barStand', x: -9.05, z: 3.5, face: -90, group: 'pantry', work: 'standWork', surface: F.bar.h, idle: true, talk: [-8.3, 3.5] });
  // 吧台椅的聊天位置在椅子側邊（坐著的人轉身就看得到，不用整個轉到背後）
  F.stools.forEach((s, i) => {
    P.push({ id: 'stool' + i, x: s.x, z: s.z, face: -90, pose: 'sit', seat: 'stool', group: 'pantry', work: 'tableWork', surface: F.bar.h, idle: true, from: 'back',
      talk: [s.x, s.z + (i ? 0.85 : -0.85)] });
  });
  // 白板前
  P.push({ id: 'board0', x: -4.85, z: 6.1, face: -90, group: 'whiteboard', work: 'whiteboard', talk: [-3.95, 6.1] });
  P.push({ id: 'board1', x: -4.85, z: 7.1, face: -90, group: 'whiteboard', work: 'whiteboard', talk: [-3.95, 7.1] });
  // 沙發區站位（休息時，座位都滿了或想站著聊）
  [[7.7, 3.2, 8.05, 2.45], [9.6, 7.75, 10.3, 7.95], [11.2, 6.7, 10.85, 7.45], [8.85, 7.15, 8.45, 7.8]].forEach(([x, z, tx, tz], i) =>
    P.push({ id: 'loungeStand' + i, x, z, lookAt: loungeMid, idle: true, talk: [tx, tz] }));

  // 會議室：長桌兩側各三張椅子（側邊椅子沒開會時當討論區）、主持人座位、簡報站位
  const MT = F.meetingTable;
  const meet = [];
  [-1, 0, 1].forEach((k, i) => {
    const z = MT.z + k * 1.0;
    meet.push({ id: 'meetW' + i, x: MT.x - MT.w / 2 - 0.45, z, face: 90, pose: 'sit', seat: 'chair', from: 'back', meet: true });
    meet.push({ id: 'meetE' + i, x: MT.x + MT.w / 2 + 0.45, z, face: -90, pose: 'sit', seat: 'chair', from: 'back', meet: true });
  });
  // 靠門口那一排的兩張當討論區（筆電放桌上）；有人來聊天時站在椅子靠門那一側，坐著的人側身就能面對面
  [meet[4], meet[5]].forEach((m) => {
    m.group = 'meeting';
    m.work = 'tableWork';
    m.surface = 0.76;
    m.talk = [m.x, m.z + 0.85];
  });
  meet.push({ id: 'meetPresent', x: 0.4, z: -7.6, lookAt: [MT.x, MT.z], meet: true });
  meet.forEach((m) => P.push(m));

  O.LAYOUT = {
    floor: { minX: -12, maxX: 12, minZ: -9, maxZ: 9 },
    rooms: {
      boss: { minX: -12, maxX: -4, minZ: -9, maxZ: -2, doorX: -8, doorW: 1.4 },
      meeting: { minX: -4, maxX: 2.5, minZ: -9, maxZ: -2, doorX: 1.4, doorW: 1.4 },
      audit: { minX: 2.5, maxX: 12, minZ: -9, maxZ: -2, doorX: 4.5, doorW: 1.4 },
    },
    furniture: F,
    seats: SEATS,
    at,

    // 路線點（x, z）
    nodes: {
      // 中間走道
      c0: [-10.5, 0.6], c1: [-8, 0.6], c2: [-5, 0.6], c3: [-2.2, 0.6], c4: [0, 0.6], c45: [1.4, 0.6],
      c5: [2.2, 0.6], c6: [4.5, 0.6], c7: [7.5, 0.6], c8: [10.5, 0.6],
      // 座位後面的走道
      w0: [-8, 3.9], w1: [-5, 3.9], w2: [0, 3.9], w3: [4.5, 3.9],
      // 茶水間（吧台和高腳吧台中間）、電梯口
      p1: [-10.35, 1.2], pm: [-10.35, 3.9], p2: [-10.35, 6.5], fE: [-10.3, 7.8], fW: [-8.2, 6.2],
      // 前方（白板、書櫃、影印機）
      fA: [-4.0, 6.6], fB: [-1.0, 6.9], fC: [2.2, 6.9], fD: [4.2, 6.6],
      // 沙發區
      lA: [7.1, 2.4], lS1: at(F.sofa, 1.5, 0.85), lS2: at(F.sofa, -1.5, 0.85), lB: [6.95, 5.95], lC: [8.3, 8.1], lD: [10.9, 7.4],
      // 董事長室
      bi: [-8, -2.9], b1: [-5.2, -3.6], b2: [-5.2, -7.3], b3: [-10.6, -3.6], b4: [-10.6, -7.3],
      // 會議室
      mi: [1.3, -2.55], mE: [1.25, -5.45], mS: [1.25, -7.85], mW: [-3.0, -7.85], mN: [-3.0, -2.55],
      // 稽查室
      ai: [4.5, -2.9], a1: [3.3, -3.6], a2: [3.3, -7.9], a3: [5.3, -7.9], a4: [7.15, -7.9], a5: [9.0, -7.9], a6: [10.8, -7.9],
    },
    edges: [
      ['c0', 'c1'], ['c1', 'c2'], ['c2', 'c3'], ['c3', 'c4'], ['c4', 'c45'], ['c45', 'c5'], ['c5', 'c6'], ['c6', 'c7'], ['c7', 'c8'],
      ['w0', 'w1'], ['w1', 'w2'], ['w2', 'w3'],
      ['c1', 'w0'], ['c2', 'w1'], ['c4', 'w2'], ['c6', 'w3'],
      ['c0', 'p1'], ['p1', 'pm'], ['pm', 'p2'], ['p2', 'fE'], ['p2', 'fW'], ['fE', 'fW'], ['fW', 'w0'],
      ['w1', 'fA'], ['fA', 'fB'], ['fB', 'fC'], ['fC', 'fD'], ['w2', 'fB'], ['w3', 'fD'],
      ['c7', 'lA'], ['lA', 'lS1'], ['lS1', 'lS2'], ['lA', 'lB'], ['lB', 'lC'], ['lC', 'lD'], ['lD', 'lS2'], ['fD', 'lB'],
      ['c1', 'bi'], ['bi', 'b1'], ['bi', 'b3'], ['b1', 'b2'], ['b3', 'b4'],
      ['c45', 'mi'], ['mi', 'mE'], ['mE', 'mS'], ['mS', 'mW'], ['mW', 'mN'], ['mN', 'mi'],
      ['c6', 'ai'], ['ai', 'a1'], ['a1', 'a2'], ['a2', 'a3'], ['a3', 'a4'], ['a4', 'a5'], ['a5', 'a6'],
    ],

    places: P,

    spots: {
      // 電梯口：上下班從這裡進出
      entry: { x: -11.2, z: 8.0, face: 90, node: 'fE' },
      // 董事長室門口外：林怡瑄來報告時站這裡（董事長室只有董事長進去）
      bossDoor: { x: -8.0, z: -1.15, face: 180, node: 'c1' },
      // 會議室主持人座位（董事長開會時坐這裡）
      meetHost: { x: MT.x, z: MT.z + MT.d / 2 + 0.6, face: 180, pose: 'sit', seat: 'chair', approach: [MT.x, -2.55], node: 'mN' },
      // 會議室候位點：開會的人比位子多時站這裡
      meetWait: [
        { x: -3.3, z: -4.0, lookAt: [MT.x, MT.z] },
        { x: 1.8, z: -4.2, lookAt: [MT.x, MT.z] },
        { x: 1.8, z: -6.6, lookAt: [MT.x, MT.z] },
        { x: -3.3, z: -6.6, lookAt: [MT.x, MT.z] },
      ],
      // 稽查室：幕僚長收報告的位置（長桌端）
      auditReport: { x: 3.85, z: -5.35, face: 90, node: 'a1' },
      // 茶水間：泡咖啡、裝水
      coffee: { x: -10.95, z: 2.2, face: -90, node: 'p1' },
      water: { x: -10.95, z: 5.95, face: -90, node: 'p2' },
      // 休息區候位點：休息的位子都滿了，就在這裡站著等
      loungeWait: [
        { x: 7.0, z: 4.5, lookAt: loungeMid },
        { x: 10.2, z: 8.4, lookAt: loungeMid },
        { x: 7.9, z: 6.9, lookAt: loungeMid },
        { x: 10.6, z: 4.9, lookAt: loungeMid },
      ],
      // 窗邊（看窗外）。第一個在董事長室裡，只有董事長會去
      windows: [
        { x: -5.8, z: -8.3, face: 180, node: 'b2' },
        { x: -11.4, z: -0.8, face: -90, node: 'c0' },
        { x: 11.4, z: 0.0, face: 90, node: 'c8' },
      ],
      // 隨意走動會去的地方（窗邊、飲水機和上面是同一個位置，js/behavior.js 會直接一起用，不重複列）
      wander: [
        { x: 3.8, z: 7.65, face: 0, node: 'fD' },       // 影印機
        { x: -1.6, z: 7.8, face: 0, node: 'fB' },       // 前方書櫃
        { x: -10.6, z: -0.95, face: 180, node: 'c0' },  // 董事長室外的矮書櫃
        { x: -0.6, z: -0.95, face: 180, node: 'c4' },   // 會議室外的矮書櫃
      ],
    },

    // 休息區範圍（idle 的人一定在這兩區裡）：沙發區、茶水間
    restAreas: [
      { name: '沙發區', minX: 5.2, maxX: 12, minZ: 1.6, maxZ: 9 },
      { name: '茶水間', minX: -12, maxX: -8.2, minZ: 1.0, maxZ: 7.0 },
    ],

    // 共用桌（稽查室長桌）。team.js 裡 desk.type 為 'none' 的人，桌面要落在這些範圍內
    sharedTables: [
      { name: '稽查室長桌', minX: F.auditTable.x - F.auditTable.w / 2, maxX: F.auditTable.x + F.auditTable.w / 2,
        minZ: F.auditTable.z - F.auditTable.d / 2, maxZ: F.auditTable.z + F.auditTable.d / 2 },
    ],
  };

  /* 房間的牆（線段）：前面那道牆中間留門口；房間之間的隔牆。給繞路、走道檢查用 */
  O.LAYOUT.walls = (function () {
    const R = O.LAYOUT.rooms, FL = O.LAYOUT.floor, list = [];
    const seg = (name, x1, z1, x2, z2) => list.push({ name, a: { x: x1, z: z1 }, b: { x: x2, z: z2 } });
    Object.keys(R).forEach((k) => {
      const r = R[k];
      seg(k + '前牆左', r.minX, r.maxZ, r.doorX - r.doorW / 2, r.maxZ);
      seg(k + '前牆右', r.doorX + r.doorW / 2, r.maxZ, r.maxX, r.maxZ);
      if (r.minX > FL.minX) seg(k + '左牆', r.minX, r.minZ, r.minX, r.maxZ);
      if (r.maxX < FL.maxX) seg(k + '右牆', r.maxX, r.minZ, r.maxX, r.maxZ);
    });
    return list;
  })();

  /* 椅子的地板範圍（含五爪椅腳）：一般辦公椅 0.6 × 0.6；董事長的主管椅較大，椅背往後多 0.1 */
  const CHAIR = { office: { w: 0.6, d: 0.6, back: 0 }, exec: { w: 0.72, d: 0.72, back: 0.06 } };

  /* 擋路的家具（地板上的長方形，給走道檢查與避讓用；尺寸照 js/world.js 的模型外框）。
   * seat：可以坐上去的家具（沙發、懶骨頭、吧台椅、椅子）；spots：坐在這件家具上的位置 id，
   *   只有要坐這個位置（或剛從這個位置起來）的人，才可以走進這件家具的範圍。 */
  O.LAYOUT.obstacles = function (team) {
    const list = [];
    const add = (name, o, extra) => list.push(Object.assign({ name, x: o.x, z: o.z, rot: o.rot || 0, w: o.w, d: o.d }, extra || {}));
    ['counter', 'fridge', 'water', 'bar', 'whiteboard', 'copier', 'meetingTable', 'meetingScreen', 'auditTable', 'auditCabinet', 'coffeeTable', 'tv']
      .forEach((k) => add(k, F[k]));
    add('sofa', F.sofa, { seat: true, spots: ['sofa0', 'sofa1', 'sofa2'] });
    F.stools.forEach((s, i) => add('stool' + i, s, { seat: true, spots: ['stool' + i] }));
    F.bookcases.forEach((b, i) => add('bookcase' + i, b));
    F.beanbags.forEach((b, i) => add('beanbag' + i, { x: b.x, z: b.z, rot: b.rot, w: 0.9, d: 0.9 }, { seat: true, spots: ['beanbag' + i] }));
    F.plants.forEach((p, i) => add('plant' + i, { x: p.x, z: p.z, w: 0.42 * p.s, d: 0.42 * p.s }));
    F.floorLamps.forEach((p, i) => add('floorLamp' + i, { x: p.x, z: p.z, w: 0.36, d: 0.36 }));
    // 董事長室：窗前矮櫃、左牆獎盃櫃
    add('bossCabinet', { x: -8, z: -8.5, w: 2.45, d: 0.52 });
    add('trophyCase', { x: -11.62, z: -5, w: 0.47, d: 3.6 });
    // 會議室的椅子（六張側邊椅 + 主持人座位）
    const chairAt = (name, p, face, kind, spot) => {
      const c = CHAIR[kind];
      const [x, z] = at({ x: p.x, z: p.z, rot: face }, 0, -c.back);
      add(name, { x, z, rot: face, w: c.w, d: c.d }, { seat: true, spots: [spot] });
    };
    P.filter((p) => p.meet && p.seat === 'chair').forEach((p) => chairAt('chair:' + p.id, p, p.face, 'office', p.id));
    chairAt('chair:meetHost', O.LAYOUT.spots.meetHost, O.LAYOUT.spots.meetHost.face, 'office', 'meetHost');
    (team || []).forEach((m) => {
      const d = m.desk || { type: 'standard' };
      const s = m.seat, face = s.face || 0;
      const dist = d.dist != null ? d.dist : 0.75;
      const loc = (lx, lz) => at({ x: s.x, z: s.z, rot: face }, lx, lz);
      if (d.type === 'standard' || d.type === 'marble') {
        const [x, z] = loc(0, dist);
        add('desk:' + m.id, { x, z, rot: face, w: (d.width || (d.type === 'marble' ? 2.6 : 1.8)) + 0.1, d: d.type === 'marble' ? 1.25 : (d.depth || 0.8) });
      }
      if (d.type === 'beanbag') {
        add('beanbag:' + m.id, { x: s.x, z: s.z, rot: face, w: 0.9, d: 0.9 }, { seat: true, owner: m.id, spots: ['seat:' + m.id] });
        const side = d.side || [0.85, 0.1];
        const [x, z] = loc(side[0] + 0.25, side[1]);
        add('sideTable:' + m.id, { x, z, rot: face, w: 1.1, d: 0.5 });
      } else chairAt('chair:' + m.id, s, face, m.chair === 'exec' ? 'exec' : 'office', 'seat:' + m.id);
    });
    return list;
  };
})();
