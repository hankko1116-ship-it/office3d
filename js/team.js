/* =====================================================================
 * 成員設定檔（之後換位子、換顏色、加人，只改這個檔案）
 *
 * 人物只有這八位。座標：x 往右、z 往畫面前方；單位約等於公尺。
 *   辦公室地板範圍 x -12 ~ 12、z -9 ~ 9。
 *   後排三間：董事長室 x -12 ~ -4、會議室 x -4 ~ 2.5、稽查室 x 2.5 ~ 12（都是 z -9 ~ -2）。
 *   茶水間在左側牆、沙發休憩區在右前方、白板和書櫃在前方中間。走道在 z = 0.6、3.9 附近。
 * seat.face：角度（度）。0 = 面向畫面前方（+z），90 = 面向右（+x），180 = 面向後方。
 * 左右：「left / 左」指角色自己的左手邊。
 * ===================================================================== */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});

  O.TEAM = [
    /* ---------------- 1. 董事長 ---------------- */
    {
      id: 'boss',
      name: '柯竣瀚',
      role: '董事長',
      seat: { x: -8, z: -6.6, face: 0 },
      chair: 'exec',
      desk: { type: 'marble', dist: 1.0, width: 2.6 },   // 大理石桌（dist：桌子中心離椅子多遠）
      deskProps: [
        { type: 'laptop', x: 0, z: -0.15 },
        { type: 'crown', x: 0.95, z: 0.25, scale: 0.9 },
        { type: 'trophy', x: -0.6, z: 0.3 },
        { type: 'globe', x: -1.0, z: 0.05 },
        { type: 'paperStack', x: 0.55, z: -0.15 },
        { type: 'lamp', x: 1.1, z: -0.3, color: '#c9a24a' },
      ],
      appearance: {
        skin: '#f4cfa9',
        hair: { style: 'short', color: '#1b1a1d', shade: '#2b282c' },
        face: { mouth: 'smile', blush: false },
        outfit: { type: 'shirtVest', shirt: '#f7f7f5', vest: '#1c1c20', tie: '#121214' },
        bottom: { type: 'pants', color: '#1e1e22' },
        shoes: { type: 'dress', color: '#141416' },
        items: [],
        hold: {},
      },
      behavior: {
        mode: 'seated',
        host: true,                       // 開會時是主持人：留在自己座位
        breakEvery: [25, 55],             // 打字多久（秒）後起身做別的事
        habitChance: 0.7,                 // 打完一段字後起身做別的事的機率（預設 0.65）；其餘時候換個工作點繼續做
        habits: { chat: 6, window: 2, stretch: 1, game: 1 }, // chat：走出董事長室找同事當面聊天；game：去沙發打一局電動
        // 自由座位：大多在自己座位（董事長室只有董事長使用），有時也到開放區的沙發、懶骨頭、吧台、白板前、會議室討論區做事
        workAt: { seat: 3, sofa: 1, beanbag: 1, pantry: 1, whiteboard: 1, meeting: 1 },
        speed: 1.1,
      },
    },

    /* ---------------- 2. 幕僚長兼稽核 ---------------- */
    {
      id: 'linyixuan',
      name: '林怡瑄',
      role: '幕僚長兼稽核',
      seat: { x: -6.6, z: 1.7, face: 0 },  // 董事長室門口外最近的座位
      desk: { type: 'standard', dist: 0.75, width: 1.8 },
      deskProps: [
        { type: 'monitor', x: -0.35, z: 0.15 },
        { type: 'keyboard', x: -0.3, z: -0.15 },
        { type: 'reportStack', x: 0.45, z: 0.05 },
        { type: 'lamp', x: 0.75, z: 0.2 },
      ],
      appearance: {
        skin: '#f6d2b0',
        hair: { style: 'long', color: '#17161a', shade: '#26242a' },
        face: { mouth: 'smile', blush: true, lashes: true },
        outfit: { type: 'blazer', jacket: '#1d1d21', lapel: '#2a2a30', shirt: '#f4f4f2', button: '#8a8a90' },
        bottom: { type: 'pants', color: '#1d1d21' },
        shoes: { type: 'heel', color: '#141416' },
        items: [
          { type: 'badgeX', color: '#c8ccd2' },      // 胸前銀色 X 徽章
          { type: 'headset', color: '#c8ccd2' },     // 銀色耳麥
          { type: 'belt', color: '#c8ccd2' },
          { type: 'tablet' },                        // 雙手拿平板
        ],
        hold: { left: -0.75, right: -0.75 },
      },
      behavior: {
        mode: 'patrol',                   // 最常走動：找大家問進度、到董事長室門口報告、去稽查室收報告
        breakEvery: [12, 20],             // 巡完 4 站後做自己的事多久（秒）
        habits: {},
        workAt: { seat: 3, sofa: 1, pantry: 1, whiteboard: 1, meeting: 1 }, // 巡完回來做事的地方（自由座位）
        speed: 1.35,
      },
    },

    /* ---------------- 3. GPT ---------------- */
    {
      id: 'gpt',
      name: 'GPT',
      role: '團隊成員',   // SPEC 沒指定職務，可自行改
      seat: { x: -2.2, z: 1.7, face: 0 },
      desk: { type: 'standard', dist: 0.75, width: 2.0 },
      deskProps: [
        { type: 'dualMonitor', x: 0, z: 0.18 },
        { type: 'keyboard', x: 0, z: -0.15 },
        { type: 'robotPad', x: 0.7, z: -0.1 },
        { type: 'lamp', x: -0.8, z: 0.2 },
      ],
      appearance: {
        skin: '#f3cda8',
        hair: { style: 'wavy', color: '#cfccd3', shade: '#aeabb4' },
        face: { mouth: 'smile', blush: false },
        outfit: { type: 'hoodie', hoodie: '#1b1b1f', shade: '#2a2a30', tee: '#d9d9de', string: '#e8e8ec' },
        bottom: { type: 'cargo', color: '#38373d', pocket: '#2e2d33' },
        shoes: { type: 'sneaker', color: '#18181b', sole: '#f2f2f2' },
        items: [
          { type: 'headphones', color: '#141417', glow: '#5fe3ff', logo: '#f4f4f4' },
          { type: 'knotLogo', color: '#f4f4f4' },     // 帽 T 胸前白色標誌
          { type: 'sleeveStripes', color: '#e6e6ea' },
          { type: 'waistBag', glow: '#5fe3ff' },      // 腰上發光小腰包
          { type: 'robot', glow: '#5fe3ff', deskAt: [0.7, 0.65] }, // 手捧白色小機器人（打字時放回桌上的充電座）
        ],
        hold: { right: -1.0 },
      },
      behavior: {
        mode: 'seated',
        breakEvery: [20, 45],
        habits: { robot: 3, visit: 3, game: 2, coffee: 1, stretch: 1 },
        workAt: { seat: 3, sofa: 2, beanbag: 2, pantry: 1, whiteboard: 1, meeting: 1 },
      },
    },

    /* ---------------- 4. Claude ---------------- */
    {
      id: 'claude',
      name: 'Claude',
      role: '團隊成員',   // SPEC 沒指定職務，可自行改
      seat: { x: 2.2, z: 1.7, face: 0 },
      desk: { type: 'standard', dist: 0.75, width: 2.0 },
      deskProps: [
        { type: 'monitor', x: -0.25, z: 0.18 },
        { type: 'laptop', x: 0.45, z: -0.05, logo: 'sun', rot: -15 },
        { type: 'keyboard', x: -0.25, z: -0.15 },
        { type: 'books', x: -0.8, z: 0.15 },
        { type: 'plantSmall', x: 0.85, z: 0.25 },
        { type: 'lamp', x: -0.85, z: -0.15 },
      ],
      appearance: {
        skin: '#f6d1ad',
        hair: { style: 'curly', color: '#a9743f', shade: '#8a5c30' },
        face: { mouth: 'smile', blush: false },
        glasses: { color: '#111113', thin: false },   // 黑框眼鏡
        outfit: { type: 'hoodie', hoodie: '#e9dcc8', shade: '#d9cab3', tee: '#f4efe6', string: '#f4efe6' },
        bottom: { type: 'cargo', color: '#5a3a28', pocket: '#4a2e1f' },
        shoes: { type: 'sneaker', color: '#5a3a28', sole: '#f1ebe0' },
        items: [
          { type: 'sunLogo', color: '#f26a1b' },      // 胸前橘色小太陽
          { type: 'penPocket' },
          { type: 'mug', color: '#c8612a' },          // 手拿橘色咖啡杯
          { type: 'laptopUnderArm', logo: '#f26a1b' },// 夾著筆電
          { type: 'watch', side: 'left' },
        ],
        hold: { right: -1.05 },
      },
      behavior: {
        mode: 'seated',
        breakEvery: [20, 45],
        habits: { sip: 2, coffee: 2, visit: 3, game: 1, window: 1 },
        workAt: { seat: 3, sofa: 1, beanbag: 2, pantry: 2, whiteboard: 1, meeting: 1 },
      },
    },

    /* ---------------- 5. 財務稽核主管 ---------------- */
    {
      id: 'chensiyu',
      name: '陳思妤',
      role: '財務稽核主管',
      seat: { x: 5.3, z: -6.5, face: 0 },
      desk: { type: 'none', dist: 0.75 },          // 坐在稽查室長桌（不另外放桌子）
      visitOffset: [0.9, 0],   // 來聊天的人站在座位旁邊（不是背後），坐著轉椅子就能面對面
      deskProps: [
        { type: 'laptop', x: 0, z: -0.05 },
        { type: 'approvalBinder', x: 0.52, z: 0.05 },   // 貼紅色「待核准」便利貼的單據夾
        { type: 'piggyBank', x: -0.55, z: 0.15 },       // 金色方塊存錢筒
        { type: 'lamp', x: -0.6, z: 0.5 },
      ],
      appearance: {
        skin: '#f5d0ac',
        hair: { style: 'ponytail', color: '#4a2c20', shade: '#3a2219', clip: '#d4a838' },
        face: { mouth: 'smile', blush: true, lashes: true },
        glasses: { color: '#18181a', thin: true },     // 細框眼鏡
        outfit: { type: 'blazer', jacket: '#262c4a', lapel: '#2f3658', shirt: '#f6f6f4', button: '#d4a838' },
        bottom: { type: 'pants', color: '#262c4a' },
        shoes: { type: 'heel', color: '#151517' },
        items: [
          { type: 'shieldBadge', color: '#d4a838' },
          { type: 'belt', color: '#d4a838' },
          { type: 'calculator' },                      // 方塊計算機 + 紅筆
          { type: 'magnifier', hand: 'left', ring: '#d4a838', symbol: 'dollar' },
        ],
        hold: { right: -0.75, left: -1.05 },
      },
      behavior: {
        mode: 'seated',
        breakEvery: [25, 55],
        habits: { visit: 3, coffee: 1, stretch: 1, game: 1 },
        workAt: { seat: 3, sofa: 1, beanbag: 1, pantry: 1, whiteboard: 1, meeting: 1 },
      },
    },

    /* ---------------- 6. AI 權限稽核主管 ---------------- */
    {
      id: 'wangyue',
      name: '王悅',
      role: 'AI 權限稽核主管',
      seat: { x: 7.15, z: -6.5, face: 0 },
      desk: { type: 'none', dist: 0.75 },
      visitOffset: [0.9, 0],   // 來聊天的人站在座位旁邊（不是背後），坐著轉椅子就能面對面
      deskProps: [
        { type: 'dualMonitor', x: 0, z: 0.3, small: true },  // 雙螢幕
        { type: 'keyboard', x: 0, z: -0.08 },
        { type: 'calendar', x: 0.62, z: 0.05, text: '12/4', sub: '倒數' }, // 12/4 倒數月曆
        { type: 'stamp', x: -0.6, z: 0.0 },                   // 紅色印章
        { type: 'lamp', x: -0.65, z: 0.45 },
      ],
      appearance: {
        skin: '#f4cfab',
        hair: { style: 'sidePart', color: '#141317', shade: '#25232a' },
        face: { mouth: 'smile', blush: false, lashes: true },
        outfit: { type: 'vest', vest: '#3a393f', shirt: '#f4f4f2', rolled: true },
        bottom: { type: 'pants', color: '#38373d' },
        shoes: { type: 'heel', color: '#141416' },
        items: [
          { type: 'hoopEarrings', color: '#c8ccd2' },
          { type: 'idBadge', strap: '#1a1a1d' },
          { type: 'lockBadge', color: '#d4a838' },
          { type: 'belt', color: '#c8ccd2' },
          { type: 'keys' },                            // 綠黃紅三把鑰匙
          { type: 'watch', side: 'left' },
        ],
        hold: { right: -0.85, left: -0.15, leftZ: 0.45 },
      },
      behavior: {
        mode: 'seated',
        breakEvery: [25, 55],
        habits: { visit: 3, window: 1, coffee: 1, game: 1 },
        workAt: { seat: 3, sofa: 1, beanbag: 1, whiteboard: 1, meeting: 1 },
      },
    },

    /* ---------------- 7. 專案文件稽核主管 ---------------- */
    {
      id: 'lipeizhen',
      name: '李沛蓁',
      role: '專案文件稽核主管',
      seat: { x: 5.95, z: 3.35, face: 110 },      // 沙發區旁的懶骨頭（她的固定位子）
      desk: { type: 'beanbag', color: '#3f7a52', side: [0.85, 0.1] }, // 懶骨頭 + 左手邊的小邊桌（side：邊桌相對座位的位置）
      visitOffset: [-0.9, 0.3],
      deskProps: [
        { type: 'indexLedger', x: -0.1, z: 0.02 },           // 索引籤清冊（放在邊桌上）
        { type: 'calendar', x: 0.12, z: 0.12, today: true },  // 小日曆
        { type: 'nineGrid', x: 0.55, z: 0.0, y: -0.45 },      // 九格檔案櫃（放在邊桌旁的地上）
      ],
      appearance: {
        skin: '#f6d3b1',
        hair: { style: 'bob', color: '#3e2a22', shade: '#2f1f19' },
        face: { mouth: 'smile', blush: true, lashes: true, browY: 0.035 },
        outfit: { type: 'vest', vest: '#2c4a36', shirt: '#f1ebdd', rolled: true },
        bottom: { type: 'skirt', color: '#1f1f22', length: 0.22 },
        shoes: { type: 'heel', color: '#141416' },
        items: [
          { type: 'pencilClip' },                     // 紅鉛筆髮飾
          { type: 'squareEarrings', color: '#c0302a' },// 紅色方塊耳釘
          { type: 'idBadge', strap: '#b8322c' },
          { type: 'nineGridBackpack' },               // 背九格資料夾
          { type: 'clipboard' },                      // 勾選夾板
          { type: 'magnifier', hand: 'right', ring: '#c0302a' }, // 紅框放大鏡
          { type: 'watch', side: 'left' },
        ],
        hold: { right: -1.1, left: -0.7 },
      },
      behavior: {
        mode: 'seated',
        breakEvery: [25, 55],
        habits: { visit: 3, coffee: 1, stretch: 1, game: 1 },
        workAt: { seat: 6, sofa: 1, pantry: 1, whiteboard: 1 },  // 大多抱著筆電坐在懶骨頭上
      },
    },

    /* ---------------- 8. 法務合規稽核主管 ---------------- */
    {
      id: 'huangyutong',
      name: '黃語彤',
      role: '法務合規稽核主管',
      seat: { x: 9.0, z: -6.5, face: 0 },
      desk: { type: 'none', dist: 0.75 },
      visitOffset: [0.9, 0],   // 來聊天的人站在座位旁邊（不是背後），坐著轉椅子就能面對面
      deskProps: [
        { type: 'laptop', x: 0, z: -0.05 },
        { type: 'scales', x: 0.55, z: 0.25 },                     // 小天平
        { type: 'calendar', x: -0.55, z: 0.4, text: '救濟期限', sub: '倒數' }, // 救濟期限桌曆
        { type: 'docTray', x: -0.5, z: -0.05 },                    // 文件匣
        { type: 'lamp', x: 0.1, z: 0.5 },
      ],
      appearance: {
        skin: '#f6d2b0',
        hair: { style: 'bun', color: '#6e2a22', shade: '#57201a' },
        face: { mouth: 'open', blush: true, lashes: true, eyes: '#4a2418' },
        outfit: { type: 'blazer', jacket: '#7a1f2c', lapel: '#8a2534', shirt: '#f6f2f2', button: '#b9bcc2' },
        bottom: { type: 'skirt', color: '#7a1f2c', length: 0.26 },
        shoes: { type: 'heel', color: '#5a1620' },
        items: [
          { type: 'scaleBadge', color: '#c8ccd2' },   // 銀色天平徽章
          { type: 'markerPocket' },                  // 口袋黑色馬克筆
          { type: 'lawBook' },                       // 貼滿彩色便利貼的厚法典
          { type: 'redPen' },                        // 紅筆
        ],
        hold: { right: -1.0, left: -0.7 },
      },
      behavior: {
        mode: 'seated',
        breakEvery: [25, 55],
        habits: { visit: 3, coffee: 1, window: 1, game: 1 },
        workAt: { seat: 3, sofa: 1, pantry: 1, whiteboard: 1, meeting: 1 },
      },
    },
  ];
})();
