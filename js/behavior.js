/* 行為：讓每個人像真人上班一樣動起來，氣氛是「把事情做完就好」。
 * - 走路：沿著 layout.js 的路線點找最短路徑（不會穿牆；董事長室只有董事長會進去）。
 *   人和人不會互相穿過：前面有人就等；迎面相遇時一個人往旁邊讓；有人站著擋路就從旁邊繞過或改走別條路；
 *   真的等太久（目的地一直被人站著）就放棄這一趟，重新決定要做什麼，不會永遠卡住。
 * - 聊天：被找的人會停下手邊的事，轉身（坐著時轉椅子＋轉頭）面對對方；聊完轉回去繼續做事。
 * - 狀態（status.json）決定大方向：
 *   working  自由座位：從自己座位、沙發、懶骨頭、茶水間吧台、白板前、會議室討論區挑一個地方做事，
 *            待一陣子換地方，中間會去泡咖啡、找同事聊天、偶爾去沙發打一局電動
 *            （林怡瑄是巡視；董事長會走出董事長室找同事聊天）
 *   walking  到處走走；meeting 去會議室開會；idle 去沙發區或茶水間休息（有時打電動）；
 *   off      走去電梯後消失、座位燈暗。
 * - 午休（台北時間 12:00–13:30，main.js 依時鐘切換）：working 的人當成 idle 去休息。
 * - 示範模式（網址加 ?demo）：聊天、打電動更常發生。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const DEG = Math.PI / 180;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  function weighted(obj) {
    const keys = Object.keys(obj || {}).filter((k) => obj[k] > 0);
    if (!keys.length) return null;
    let total = 0;
    keys.forEach((k) => (total += obj[k]));
    let r = Math.random() * total;
    for (const k of keys) {
      r -= obj[k];
      if (r <= 0) return k;
    }
    return keys[keys.length - 1];
  }
  function angleTo(from, to) {
    return Math.atan2(to.x - from.x, to.z - from.z);
  }
  function wrap(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  /* 點在不在家具（可旋轉的長方形）往外多留 margin 的範圍內 */
  function inBox(p, o, margin) {
    const r = (o.rot || 0) * DEG;
    const dx = p.x - o.x, dz = p.z - o.z;
    const lx = dx * Math.cos(r) - dz * Math.sin(r);
    const lz = dx * Math.sin(r) + dz * Math.cos(r);
    return Math.abs(lx) < o.w / 2 + margin && Math.abs(lz) < o.d / 2 + margin;
  }
  /* 點到線段的距離 */
  function segDist(p, a, b) {
    const vx = b.x - a.x, vz = b.z - a.z;
    const L2 = vx * vx + vz * vz;
    const t = L2 ? clamp(((p.x - a.x) * vx + (p.z - a.z) * vz) / L2, 0, 1) : 0;
    return Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t));
  }

  /* 人物尺寸（人物放大 1.3 倍後）：頭寬約 0.73 公尺、軀幹寬約 0.6 公尺。
   * GAP：走路時跟別人至少留的距離（中心到中心）。兩個本來就相鄰的位置（沙發隔壁座位、聊天站位）可以比這近。
   * SQUEEZE：擠的時候（等了 6 秒還過不去）可以靠到多近，像真人側身擦肩而過；仍然不會疊在一起。
   * NEAR：兩個位置距離小於這個，就不會同時分給兩個人。
   * BODY_R：繞路時身體中心離家具、牆至少這麼遠。 */
  const GAP = 0.7, SQUEEZE = 0.62, NEAR = 0.7, BODY_R = 0.3;
  // 坐著聊天時身體最多轉多少（弧度）：旋轉椅、吧台椅可以轉比較多；沙發、懶骨頭只能側一點身。頭再轉 HEAD_TURN
  const SEAT_TURN = { chair: 0.9, exec: 0.9, stool: 0.9, sofa: 0.5, beanbag: 0.5 };
  const HEAD_TURN = 0.9;
  O.PEOPLE = { GAP, SQUEEZE, NEAR, BODY_R, SEAT_TURN, HEAD_TURN };

  // 對話泡泡的台詞（不寫任何公司名稱）
  const LINES = {
    bossOpen: ['最近還順利嗎？', '這個做得不錯！', '卡住了就說一聲', '今天進度如何？', '記得起來動一動', '午餐吃了嗎？', '最近忙得過來嗎？'],
    reply: ['很順，快好了！', '今天會完成', '謝謝董事長！', '有一點想請教', '沒問題！', '剛好想找您', '還行，在收尾了'],
    bossClose: ['好，加油！', '做完就好，不用趕', '辛苦了！', '有需要隨時找我', '別忘了休息一下'],
    bossThanks: ['好的，謝謝！', '收到！', '我會的！', '謝謝董事長～'],
    patrolOpen: ['進度更新一下？', '這份我先收走喔', '下午要交的好了嗎？', '有什麼要我轉達的？', '清單再對一次？'],
    patrolReply: ['好的！', '馬上給妳', '再十分鐘', '剛好做完', '晚點傳給妳'],
    patrolClose: ['謝啦！', '收到～', '好，我記下了'],
    visitOpen: ['午餐吃什麼？', '這個幫我看一下', '你那份好了嗎？', '有空嗎？問一下', '我卡住了…', '下午要開會嗎？'],
    visitReply: ['好啊，我看看', '快好了！', '等我一下', '要不要一起去？', '這個我知道！', '我也正想問'],
    visitClose: ['謝啦！', '那就這樣', '好，晚點再聊', '幫大忙了！', '就決定是你了'],
    game: ['再一局！', '好球！', '差一點！', '這關好難', '換我了', '看我的！', '休息一下就回去'],
  };
  // 對話泡泡：每句至少 SAY_SEC 秒；一段對話每 LINE_SEC 秒換一句
  const SAY_SEC = 3.5, LINE_SEC = 3.6;
  // 示範模式（?demo）：每段工作時間縮短成 span 倍、做完一段幾乎都會起身、聊天和打電動的比重加 boost 倍；
  // first：第一次起身固定做的事（打開一分鐘內就看得到董事長聊天、有人打電動）
  const DEMO = { span: 0.3, habitChance: 0.9, boost: { chat: 3, visit: 3, game: 3 }, first: { boss: 'chat', gpt: 'game' } };
  const DEFAULT_WORK_AT = { seat: 3, sofa: 1, beanbag: 1, pantry: 1, whiteboard: 1, meeting: 1 };
  // 每個工作點的「做事動作」
  const SEAT_WORK = { beanbag: 'lapWork' };
  const WORK_POSES = { type: 1, lapWork: 1, tableWork: 1, standWork: 1, whiteboard: 1 };
  O.WORK_POSES = WORK_POSES;

  class Nav {
    constructor(L) {
      this.L = L;
      this.nodes = {};
      Object.keys(L.nodes).forEach((id) => {
        const [x, z] = L.nodes[id];
        this.nodes[id] = { id, x, z, zone: this.zoneOf(x, z), adj: [] };
      });
      L.edges.forEach(([a, b]) => {
        const A = this.nodes[a], B = this.nodes[b];
        if (!A || !B) return console.warn('[office3d] 路線點不存在：', a, b);
        const w = dist(A, B);
        A.adj.push([B, w]);
        B.adj.push([A, w]);
      });
    }
    zoneOf(x, z) {
      const R = this.L.rooms;
      for (const name in R) {
        const r = R[name];
        if (x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ) return name;
      }
      return 'open';
    }
    nearest(p, zone) {
      let best = null, bd = Infinity;
      for (const id in this.nodes) {
        const n = this.nodes[id];
        if (zone && n.zone !== zone) continue;
        const d = dist(n, p);
        if (d < bd) { bd = d; best = n; }
      }
      return best || (zone ? this.nearest(p, null) : null);
    }
    /* 每個路線點走到 b 的路線距離（給「從哪個路線點出發最順」用） */
    distTo(b, blocked) {
      const D = new Map([[b, 0]]), done = new Set(), open = [b];
      while (open.length) {
        open.sort((x, y) => D.get(x) - D.get(y));
        const u = open.shift();
        if (done.has(u)) continue;
        done.add(u);
        if (u !== b && blocked && blocked(u)) continue;
        u.adj.forEach(([v, w]) => {
          const nd = D.get(u) + w;
          if (nd < (D.has(v) ? D.get(v) : Infinity)) {
            D.set(v, nd);
            open.push(v);
          }
        });
      }
      return D;
    }
    /* 最短路徑。blocked(node)：這個點不能經過（起點、終點除外）；blockedEdge(u, v)：這段路不能走。
     * 走不到就回傳 null（不會硬畫一條直線穿過牆或家具） */
    route(a, b, blocked, blockedEdge) {
      if (a === b) return [a];
      const D = new Map([[a, 0]]), prev = new Map(), done = new Set();
      const open = [a];
      while (open.length) {
        open.sort((x, y) => D.get(x) - D.get(y));
        const u = open.shift();
        if (u === b) break;
        if (done.has(u)) continue;
        done.add(u);
        u.adj.forEach(([v, w]) => {
          if (blocked && v !== b && blocked(v)) return;
          if (blockedEdge && blockedEdge(u, v)) return;
          const nd = D.get(u) + w;
          if (nd < (D.has(v) ? D.get(v) : Infinity)) {
            D.set(v, nd);
            prev.set(v, u);
            open.push(v);
          }
        });
      }
      if (!prev.has(b)) return null;
      const path = [];
      let cur = b;
      while (cur) {
        path.unshift(cur);
        if (cur === a) break;
        cur = prev.get(cur);
      }
      return path[0] === a ? path : null;
    }
  }

  class Sim {
    /* opt.demo：示範模式（網址加 ?demo），聊天、打電動更常發生，打開一分鐘內就看得到 */
    constructor(layout, team, opt) {
      this.L = layout;
      this.demo = !!(opt && opt.demo);
      this.lunch = false;   // 台北時間午休時段：working 的人當成休息（main.js 依時鐘切換）
      this.nav = new Nav(layout);
      this.spots = {};
      this.agents = [];
      this.byId = {};
      this.time = 0;
      this.convos = [];
      // 避讓統計（tools/smoke-test.js 會印出來）：等待次數、讓路／繞路、改走別條路、放棄、最久等了幾秒
      this.stats = { waits: 0, detours: 0, reroutes: 0, abandons: 0, maxWait: 0 };
      const S = layout.spots;
      this.entry = this.mkSpot('entry', S.entry);
      this.bossDoor = this.mkSpot('bossDoor', S.bossDoor);
      this.meetHost = this.mkSpot('meetHost', S.meetHost);
      this.meetHost.hostOnly = true;
      this.meetWait = (S.meetWait || []).map((s, i) => this.mkSpot('meetWait' + i, s));
      this.loungeWait = (S.loungeWait || []).map((s, i) => this.mkSpot('loungeWait' + i, s));
      this.coffee = this.mkSpot('coffee', S.coffee);
      this.water = this.mkSpot('water', S.water);
      this.auditReport = this.mkSpot('auditReport', S.auditReport);
      this.windows = S.windows.map((s, i) => this.mkSpot('window' + i, s));
      // 隨意走走：layout 的 wander 加上窗邊、飲水機（同一個地方只有一個位置，不會兩個人疊在一起）
      this.wanderSpots = S.wander.map((s, i) => this.mkSpot('wander' + i, s)).concat(this.windows, [this.water]);
      // 家具範圍（繞路時用）、房間的牆
      this.obstacles = layout.obstacles ? layout.obstacles(team) : [];
      this.walls = layout.walls || [];
      // 房間門口一次只走一個方向（同方向可以排隊跟著走；對面的人在門外 / 門內等）
      this.doors = {};
      Object.keys(layout.rooms).forEach((k) => (this.doors[k] = { room: k, users: new Set(), dir: null, pendingBy: null }));
      // 自由座位、休息、開會的位置
      this.places = layout.places.map((p) => this.mkSpot(p.id, p));
      this.workSpots = this.places.filter((s) => s.work);
      this.idleSpots = this.places.filter((s) => s.idle);
      this.gameSpots = this.places.filter((s) => s.game);
      this.meet = this.places.filter((s) => s.meet);
      this.restAreas = layout.restAreas || [];

      team.forEach((m) => {
        const kind = (m.desk && m.desk.type) || 'standard';
        const seatKind = kind === 'beanbag' ? 'beanbag' : m.chair === 'exec' ? 'exec' : 'chair';
        const seat = this.mkSpot('seat:' + m.id, {
          x: m.seat.x, z: m.seat.z, face: m.seat.face || 0, pose: 'sit', seat: seatKind,
          from: kind === 'beanbag' ? 'front' : 'back', work: SEAT_WORK[seatKind] || 'type',
        });
        seat.owner = m.id;
        seat.permanent = true;
        seat.deskRest = kind !== 'beanbag';  // 手上的東西放自己桌上
        const f = (m.seat.face || 0) * DEG;
        const off = m.visitOffset || [0.85, 0];  // 預設站在座位旁邊（不是背後），坐著轉椅子就能面對面
        const loc = (lx, lz) => [m.seat.x + lx * Math.cos(f) + lz * Math.sin(f), m.seat.z - lx * Math.sin(f) + lz * Math.cos(f)];
        const [vx, vz] = loc(off[0], off[1]);
        // 有桌子的座位：從座位後方的走道直直走到旁邊，不擦過椅子
        const approach = kind === 'beanbag' ? null : loc(off[0], off[1] - 0.6);
        seat.talkSpot = this.mkSpot('visit:' + m.id, { x: vx, z: vz, lookAt: [m.seat.x, m.seat.z], approach });
        const a = {
          id: m.id, m, x: seat.x, z: seat.z, heading: seat.face,
          pose: 'sit', status: null, visible: true,
          task: null, queue: [], path: null, atSpot: seat,
          speed: (m.behavior && m.behavior.speed) || 1.2,
          worked: false, patrolCount: 0, lastStop: null,
          lookAt: null, lookUntil: 0, lookYaw: 0, teleport: true, walkDist: 0,
          say: '', sayUntil: 0, invite: null,
          chat: null, waitT: 0, blockedBy: null, nextTry: 0, detours: 0, reroutes: 0, squeezeUntil: 0,
          door: null, doorWant: null, doorDir: null, waitingDoor: false, doorWaitT: 0,
        };
        this.agents.push(a);
        this.byId[m.id] = a;
      });
      // 每個工作點都有一個「別人來聊天時站的位置」
      this.places.forEach((s) => this.ensureTalk(s));
      this.boss = this.agents.find((a) => a.m.behavior && a.m.behavior.host) || null;
      // 太靠近的兩個位置不同時給兩個人（同一組「位置＋它的聊天站位」除外，那本來就是兩人面對面用的）
      const all = Object.values(this.spots);
      all.forEach((s) => {
        s.near = all.filter((n) => n !== s && n.talkSpot !== s && s.talkSpot !== n && dist(n, s) < NEAR);
      });
    }

    mkSpot(id, d) {
      const s = {
        id, x: d.x, z: d.z, pose: d.pose || 'stand', owner: null,
        face: d.lookAt ? Math.atan2(d.lookAt[0] - d.x, d.lookAt[1] - d.z) : (d.face || 0) * DEG,
        seat: d.seat || null, group: d.group || null, work: d.work || null, idle: !!d.idle, game: !!d.game, meet: !!d.meet,
        surface: d.surface || null, talk: d.talk || null,
      };
      const SEATS = this.L.seats || {};
      if (s.seat && SEATS[s.seat]) s.seatInfo = SEATS[s.seat];
      // 手上的東西放哪裡：有桌面就放桌面上，否則依座位種類
      if (s.surface) s.rest = [s.surface, 0.42, 0.42];
      else if (s.seatInfo && s.seatInfo.rest) s.rest = s.seatInfo.rest;
      s.zone = this.nav.zoneOf(s.x, s.z);
      if (d.approach) s.approach = { x: d.approach[0], z: d.approach[1] };
      else if (d.from === 'back') s.approach = { x: s.x - Math.sin(s.face) * 1.0, z: s.z - Math.cos(s.face) * 1.0 };
      else if (d.from === 'front') s.approach = { x: s.x + Math.sin(s.face) * 0.85, z: s.z + Math.cos(s.face) * 0.85 };
      s.node = d.node ? this.nav.nodes[d.node] : this.nav.nearest(s.approach || s, s.zone);
      this.spots[id] = s;
      return s;
    }
    /* 聊天站位：layout 有寫 talk 就用；有入座點就站入座點；否則站在他左手邊 */
    ensureTalk(s) {
      if (s.talkSpot) return s.talkSpot;
      let p;
      if (s.talk) p = { x: s.talk[0], z: s.talk[1] };
      else if (s.approach) p = { x: s.approach.x, z: s.approach.z };
      else p = { x: s.x + Math.cos(s.face) * 0.85, z: s.z - Math.sin(s.face) * 0.85 };
      s.talkSpot = this.mkSpot('talk:' + s.id, { x: p.x, z: p.z, lookAt: [s.x, s.z] });
      return s.talkSpot;
    }

    /* 這個位置可以給 a 用：沒人佔，而且旁邊太近的位置也沒有別人在用 */
    free(spot, a) {
      if (spot.owner && spot.owner !== a.id) return false;
      return !(spot.near || []).some((n) => this.claimed(n, a));
    }
    /* 別人正在用（或正要去用）這個位置。固定座位要看主人是不是真的在那裡 */
    claimed(n, a) {
      if (!n.owner || n.owner === a.id) return false;
      if (!n.permanent) return true;
      const o = this.byId[n.owner];
      return !!o && this.present(o) && (o.atSpot === n || this.goingTo(o).indexOf(n) >= 0);
    }
    /* 這個人接下來要去的位置（目前這一趟 + 排隊中的） */
    goingTo(o) {
      const list = [];
      if (o.task && o.task.t === 'go' && !o.task.done) list.push(o.task.spot);
      o.queue.forEach((t) => t.t === 'go' && list.push(t.spot));
      return list;
    }
    reserve(spot, a) {
      // 已經有人的位子不搶（候位點人太多時會共用）
      if (!spot.permanent && !spot.owner) spot.owner = a.id;
    }
    release(a) {
      const s = a.atSpot;
      if (s && !s.permanent && s.owner === a.id) s.owner = null;
    }
    seatOf(a) {
      return this.spots['seat:' + a.id];
    }
    present(a) {
      return a.visible && a.status !== 'off';
    }
    isBoss(a) {
      return a === this.boss;
    }
    inRestArea(p) {
      return this.restAreas.some((r) => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ);
    }
    /* 正在某個位子上做事（坐著或站著，不是在走路），別人可以過來找他 */
    settled(o) {
      return this.present(o) && o.atSpot && o.task && o.task.t === 'pose' && !o.task.done && dist(o, o.atSpot) < 0.05;
    }

    /* ---------- 狀態 ---------- */
    setStatus(id, status) {
      const a = this.byId[id];
      if (!a || a.status === status) return;
      const first = a.status === null;
      a.status = status;
      if (a.invite) {
        if (a.invite.owner === a.id) a.invite.owner = null;
        a.invite = null;
      }
      this.endChat(a);
      this.releaseDoor(a);
      if (!first) this.replan(a);
    }
    /* 實際照哪個狀態行動：午休時段 working 的人當成 idle（status.json 不用改） */
    mode(a) {
      const st = a.status || 'working';
      return this.lunch && st === 'working' ? 'idle' : st;
    }
    /* 午休開始／結束：working 的人放下手邊的事，改去休息或回去工作 */
    setLunch(on) {
      on = !!on;
      if (this.lunch === on) return;
      this.lunch = on;
      this.agents.forEach((a) => {
        if (a.status !== 'working') return;
        if (a.invite) {
          if (a.invite.owner === a.id) a.invite.owner = null;
          a.invite = null;
        }
        this.endChat(a);
        this.releaseDoor(a);
        this.replan(a);
      });
    }
    /* 中途換狀態：放下手邊的事重新安排 */
    replan(a) {
      if (a.task && a.task.t === 'go' && a.task.spot) {
        const sp = a.task.spot;
        if (sp.owner === a.id && !sp.permanent) sp.owner = null;
        // 正在入座（或正要離開座位）的那一小段：沿原路退回入座點再走，不要直接穿過椅子、沙發
        const onLeg = (s) => s && s.pose === 'sit' && s.approach && dist(a, s) <= dist(s.approach, s) + 0.05;
        const seat = [sp, a.leaving].find(onLeg);
        if (seat) {
          a.exitVia = seat.approach;
          a.leaving = seat;
        }
        a.atSpot = null;
      }
      a.queue.forEach((t) => {
        if (t.spot && t.spot.owner === a.id && !t.spot.permanent && t.spot !== a.atSpot) t.spot.owner = null;
      });
      a.task = null;
      a.queue = [];
      a.path = null;
      a.worked = false;
      a.waitT = 0;
      a.blockedBy = null;
    }

    /* ---------- 任務 ---------- */
    go(a, spot) {
      this.reserve(spot, a);
      a.queue.push({ t: 'go', spot });
    }
    act(a, pose, dur, extra) {
      a.queue.push(Object.assign({ t: 'pose', pose, dur }, extra || {}));
    }
    fn(a, f) {
      a.queue.push({ t: 'fn', f });
    }
    say(a, text, dur) {
      a.say = text;
      a.sayUntil = this.time + Math.max(SAY_SEC, dur || 0);
    }
    /* 一段對話：lines = [[誰, 台詞], ...]，每 LINE_SEC 秒換一句；pair：聊天的兩個人，聊天中斷時後面的台詞就不說了 */
    talk(lines, pair) {
      this.convos.push({ lines, t0: this.time, idx: -1, pair });
    }
    /* 一段對話要聊多久：每句 LINE_SEC 秒，最後一句說完再多留一點 */
    talkTime(n) {
      return n * LINE_SEC + rand(0.8, 2);
    }

    planPath(a, spot) {
      const pts = [];
      let start = { x: a.x, z: a.z };
      a.pathFrom = a.atSpot ? a.atSpot.id : '走到一半（' + a.x.toFixed(2) + ',' + a.z.toFixed(2) + '）';
      // 從座位起身：先退到入座點（a.leaving 記錄正在離開哪個座位）
      if (a.exitVia) {
        pts.push(a.exitVia);
        start = a.exitVia;
        a.exitVia = null;
      } else if (a.atSpot && a.atSpot.approach && dist(a, a.atSpot) < 0.3) {
        pts.push(a.atSpot.approach);
        start = a.atSpot.approach;
        a.leaving = a.atSpot;
      } else a.leaving = null;
      const target = spot.approach || spot;
      const toNode = spot.node || this.nav.nearest(target, spot.zone);
      // 董事長室只有董事長會經過
      const blocked = this.isBoss(a) ? null : (n) => n.zone === 'boss';
      // 從哪個路線點出發：直直走過去不會碰到家具和牆，而且「走過去 + 之後的路」最短（不會先往回走）
      const zone0 = this.nav.zoneOf(start.x, start.z);
      let fromNode = this.nav.nearest(start, zone0);
      if (fromNode && toNode) {
        const D = this.nav.distTo(toNode, blocked);
        const fromSpot = a.leaving || (a.atSpot && dist(a, a.atSpot) < 0.05);
        const near0 = dist(fromNode, start);
        const best = Object.values(this.nav.nodes)
          // 門口另一邊的路線點也可以（pathOk 會確認是從門口走過去）；站在門口的人不必先退回人群裡
          .filter((n) => D.has(n) && dist(n, start) <= near0 + 1.5)
          .sort((p, q) => dist(p, start) + D.get(p) - (dist(q, start) + D.get(q)))
          .find((n) => this.pathOk(a, [start, n], null) || (fromSpot && n === fromNode));
        if (best) fromNode = best;
      }
      a.pathWhy = 'plan';
      const route = fromNode && toNode && this.nav.route(fromNode, toNode, blocked);
      if (!route) return null;
      route.forEach((n) => pts.push({ x: n.x, z: n.z }));
      if (spot.approach) pts.push(spot.approach);
      pts.push({ x: spot.x, z: spot.z });
      // 去掉重疊的點
      const out = [];
      let last = { x: a.x, z: a.z };
      pts.forEach((p) => {
        if (dist(p, last) > 0.15) {
          out.push(p);
          last = p;
        }
      });
      // 從走到一半的地方出發：第一個路線點就在旁邊、可以直接走到下一個點時就不繞回去（不會倒退擠進人群）
      if (!a.leaving && !a.exitVia) {
        while (out.length > 1 && dist(start, out[0]) < 1.0 && this.pathOk(a, [start, out[1]], null)) out.shift();
      }
      // 最後一定停在位置正中間（終點離路線點很近時，上面會把它當成重疊點去掉）
      if (!out.length || dist(out[out.length - 1], spot) > 0.001) {
        if (out.length && dist(out[out.length - 1], spot) <= 0.15) out.pop();
        out.push({ x: spot.x, z: spot.z });
      }
      return out;
    }

    begin(a, t) {
      if (t.t === 'go') {
        if (a.atSpot !== t.spot) this.release(a);
        if (a.teleport || !a.visible) {
          a.x = t.spot.x;
          a.z = t.spot.z;
          a.heading = t.spot.face;
          a.atSpot = t.spot;
          a.pose = t.spot.pose;
          t.done = true;
          return;
        }
        if (a.atSpot === t.spot && dist(a, t.spot) < 0.05) {
          t.done = true;
          return;
        }
        const path = this.planPath(a, t.spot);
        if (!path) {
          // 找不到路（例如之後改格局把路線切斷了）：留在原地、提醒一次，等一下再重新安排；不會直線穿過牆或家具
          const key = a.pathFrom + '→' + t.spot.id;
          this.noRoute = this.noRoute || {};
          if (!this.noRoute[key]) {
            this.noRoute[key] = true;
            console.warn('[office3d] 找不到路：' + a.m.name + ' 從 ' + key + '，先留在原地（請檢查 js/layout.js 的 edges）');
          }
          this.abandon(a, 2);
          return;
        }
        a.path = path;
        a.atSpot = null;
        a.pose = 'walk';
        a.waitT = 0;
        a.detours = 0;
        a.reroutes = 0;
        a.backedOff = false;
        a.holdUntil = 0;
      } else if (t.t === 'pose') {
        t.end = this.time + t.dur;
        a.pose = t.pose;
        if (t.onStart) t.onStart(t);
      } else if (t.t === 'fn') {
        t.f();
        t.done = true;
      }
    }

    step(a, dt) {
      this.checkDoor(a);
      if (!a.task) {
        if (!a.queue.length) this.decide(a);
        a.task = a.queue.shift() || null;
        if (!a.task) return;
        this.begin(a, a.task);
        a.teleport = false;
        if (!a.task) return;
      }
      const t = a.task;
      if (t.t === 'go' && !t.done) {
        if (this.time < a.holdUntil) {
          // 退回座位讓路中：坐著等
          if (a.leaving) {
            a.atSpot = a.leaving;
            a.pose = a.leaving.pose;
            a.targetHeading = a.leaving.face;
          }
          return;
        }
        if (a.holdUntil) {
          a.holdUntil = 0;
          a.atSpot = null;
          a.pose = 'walk';
        }
        const p = a.path[0];
        const dx = p.x - a.x, dz = p.z - a.z;
        const d = Math.hypot(dx, dz);
        const stepLen = a.speed * dt;
        const arrive = d <= stepLen;
        const next = arrive ? { x: p.x, z: p.z } : { x: a.x + (dx / d) * stepLen, z: a.z + (dz / d) * stepLen };
        // 快到房間門口：門口有人往反方向走，就先在這裡等（往旁邊讓開、離開門口的那幾步可以走）
        const need = this.needDoor(a);
        if (need && dist(next, need.T) < dist(a, need.T) && !this.takeDoor(a, need)) {
          if (d > 1e-6) a.targetHeading = Math.atan2(dx, dz);
          a.waitingDoor = true;
          a.doorWaitT += dt;
          this.stats.maxDoorWait = Math.max(this.stats.maxDoorWait || 0, a.doorWaitT);
          if (a.doorWaitT > 15) {
            this.stats.abandons++;
            this.abandon(a, 1.5);
          }
          return;
        }
        a.waitingDoor = false;
        a.doorWaitT = 0;
        const o = this.blocker(a, next);
        if (o) {
          if (d > 1e-6) a.targetHeading = Math.atan2(dx, dz);
          this.wait(a, o, dt);
          return;
        }
        a.blockedBy = null;
        a.waitT = Math.max(0, a.waitT - dt);
        a.walkDist += dist(a, next);
        a.x = next.x;
        a.z = next.z;
        // 走過入座點就不再算「剛起身」
        const lv = a.leaving;
        if (lv && lv.approach && dist(a, lv) > dist(lv.approach, lv) + 0.15) a.leaving = null;
        if (arrive) {
          if (p.hold) a.holdUntil = this.time + p.hold;
          a.path.shift();
          if (!a.path.length) {
            a.atSpot = t.spot;
            a.pose = t.spot.pose;
            t.done = true;
          }
        } else a.targetHeading = Math.atan2(dx, dz);
      } else if (t.t === 'pose') {
        let face = t.face;
        // 聊天中：停下手邊的事，轉身面對對方（坐著時只轉到椅子能轉的角度，剩下的轉頭）
        if (a.chat && (this.time >= a.chat.until || !this.present(a.chat.who))) this.endChat(a);
        if (a.chat) {
          const sp = a.atSpot;
          const sit = !!(sp && sp.pose === 'sit');
          a.pose = sit ? 'talkSit' : 'talk';
          const base = face != null ? face : a.heading;
          const lim = sit ? SEAT_TURN[sp.seat] || 0.5 : Math.PI;
          face = base + clamp(wrap(angleTo(a, a.chat.who) - base), -lim, lim);
        }
        if (face != null) a.targetHeading = face;
        if (t.every && this.time >= (t.nextEvery || 0)) {
          t.nextEvery = this.time + t.every[0];
          t.every[1]();
        }
        if (this.time >= t.end) t.done = true;
      }
      if (t.done) {
        if (t.t === 'go') a.targetHeading = t.spot.face;
        a.task = null;
      }
    }

    /* ---------- 房間門口一次一個方向 ---------- */
    /* 接下來這段路會穿過哪個房間的門、往哪個方向（離門口 1.6 公尺內才算） */
    needDoor(a) {
      if (!a.path || !a.path.length) return null;
      const z0 = this.nav.zoneOf(a.x, a.z);
      let z1 = this.nav.zoneOf(a.path[0].x, a.path[0].z);
      if (z1 === z0) {
        if (a.path.length < 2) return null;
        z1 = this.nav.zoneOf(a.path[1].x, a.path[1].z);
        if (z1 === z0) return null;
      }
      const room = z0 === 'open' ? z1 : z0;
      const R = this.L.rooms[room];
      if (!R || (z0 !== 'open' && z1 !== 'open')) return null;
      const T = { x: R.doorX, z: R.maxZ };
      if (dist(a, T) > 1.6) return null;
      return { room, dir: z0 === 'open' ? 'in' : 'out', T };
    }
    takeDoor(a, need) {
      const D = this.doors[need.room];
      if (!D) return true;
      if (a.door === D) return true;
      // 等在對面的人還有效嗎（可能已經改做別的事）
      const p = D.pendingBy;
      if (p && !(p.visible && p.waitingDoor && p.doorWant === D)) D.pendingBy = null;
      const otherWaiting = D.pendingBy && D.pendingBy !== a && D.pendingBy.doorDir !== need.dir;
      const free = !otherWaiting && (D.users.size === 0 || D.dir === need.dir);
      if (!free) {
        a.doorWant = D;
        a.doorDir = need.dir;
        if (!D.pendingBy) D.pendingBy = a; // 換我們這個方向：之後同方向的人先別再進門
        return false;
      }
      D.users.add(a);
      D.dir = need.dir;
      a.door = D;
      a.doorWant = null;
      a.doorDir = need.dir;
      a.doorRoom = need.room;
      if (D.pendingBy === a) D.pendingBy = null;
      return true;
    }
    /* 走過門口（進到房間 / 回到開放區 1 公尺以上）、改做別的事、消失：把門口讓出來 */
    checkDoor(a) {
      const D = a.door;
      if (!D) return;
      const R = this.L.rooms[D.room];
      const z = this.nav.zoneOf(a.x, a.z);
      const passed = (a.doorDir === 'in' ? z === D.room : z === 'open') && dist(a, { x: R.doorX, z: R.maxZ }) > 1.0;
      if (passed || !a.visible || !this.walkingNow(a)) this.releaseDoor(a);
    }
    releaseDoor(a) {
      if (a.door) a.door.users.delete(a);
      a.door = null;
      a.doorWant = null;
      a.waitingDoor = false;
      a.doorWaitT = 0;
    }

    /* ---------- 人和人不互相穿過 ---------- */
    /* a 往 next 走一步會不會太靠近別人；會的話回傳擋住他的人。
     * 只擋「越走越近」的那一步：本來就很近（剛從隔壁座位起身）往外走不會被擋 */
    blocker(a, next) {
      for (const o of this.agents) {
        if (o === a || !o.visible) continue;
        const dn = dist(next, o);
        if (dn >= GAP || dn >= dist(a, o) - 1e-6) continue;
        const lim = this.allowed(a, o);
        // 擠過去只用在站著（或正在入座、起身）的人旁邊；迎面走來的人還是照讓路的規則
        const still = !this.movingNow(o);
        if (dn < (still && this.time < a.squeezeUntil ? Math.min(lim, SQUEEZE) : lim)) return o;
      }
      return null;
    }
    /* a 可以靠 o 多近：一般是 GAP；兩人要去（或已在）的位置本來就相鄰時，可以靠到那兩個位置的距離 */
    allowed(a, o) {
      // 我要去的位置、我正要離開的座位 vs. 對方在（或要去）的位置、對方正要離開的座位
      const mine = [a.task && a.task.t === 'go' ? a.task.spot : null, this.onSeatLeg(a) ? a.leaving : null];
      const theirs = [this.anchor(o), this.onSeatLeg(o) ? o.leaving : null];
      let lim = GAP;
      mine.forEach((m) => theirs.forEach((t) => {
        if (m && t && m !== t) lim = Math.min(lim, Math.max(0, dist(m, t) - 0.05));
      }));
      return lim;
    }
    /* o 現在在哪個位置（或正要去哪個位置） */
    anchor(o) {
      if (o.task && o.task.t === 'go' && !o.task.done) return o.task.spot;
      return o.atSpot && dist(o, o.atSpot) < 0.3 ? o.atSpot : null;
    }
    walkingNow(o) {
      return o.visible && o.task && o.task.t === 'go' && !o.task.done;
    }
    /* 真的在走（不是在門口等、也不是正在入座／起身）：這種人迎面來時用讓路規則；其他的當成站著的人繞過去 */
    movingNow(o) {
      return this.walkingNow(o) && !o.waitingDoor && !this.onSeatLeg(o);
    }
    /* 被擋住：先等；等一下還過不去就讓路、繞過去或改走別條路；等太久就放棄這一趟 */
    wait(a, o, dt) {
      if (!a.blockedBy) this.stats.waits++;
      a.waitT += dt;
      a.blockedBy = o;
      this.stats.maxWait = Math.max(this.stats.maxWait, a.waitT);
      // 等了 6 秒還過不去：接下來 3 秒可以側身擠過去（靠到 SQUEEZE）
      if (a.waitT > 6) a.squeezeUntil = this.time + 3;
      // 剛起身就被擋住（例如背後走道有人要過）：先退回座位讓一下，等 2.5 秒再起來
      const sl = a.leaving;
      if (a.waitT > 1.5 && !a.backedOff && sl && sl.pose === 'sit' && sl.approach && segDist(a, sl, sl.approach) < 0.1 && dist(a, sl) > 0.05) {
        a.backedOff = true;
        a.path.unshift({ x: sl.x, z: sl.z, hold: 2.5 });
        a.pathWhy = '退回座位讓路';
        this.stats.detours++;
        return;
      }
      if (a.waitT < 0.5 || this.time < a.nextTry) return;
      a.nextTry = this.time + 0.5;
      // 等超過 20 秒（不管中間繞了幾次）：放棄這一趟，重新決定要做什麼（不會永遠卡住）
      if (a.waitT > 20) {
        this.stats.abandons++;
        return this.abandon(a, 1.5);
      }
      // 對方正在入座／起身：他只能等，所以把他當成站著的人，由我繞過去
      // 擋住我的人在等這個門、而我正在過門：請他往旁邊讓一下（不然兩邊都過不去）
      if (o.waitingDoor && a.door && o.doorWant === a.door && o.detours < 6 && this.detour(o, a, true)) {
        o.detours++;
        o.pathWhy = '讓出門口';
        this.stats.detours++;
        return;
      }
      const moving = this.movingNow(o);
      // 互相擋住：他也在等我；或三個人以上互等成一圈（他也被別人擋著、我已經等了 3 秒）
      const mutual = moving && (o.blockedBy === a || (!!o.blockedBy && a.waitT > 3));
      // 對方在走、沒有被我擋住：等他走過去
      if (moving && !mutual && a.waitT < 2.5) return;
      // 迎面互相擋住：排在後面的人（名單順序）讓路或改道，前面的人等；
      // 兩個人同時改道會在另一條路上再遇到一次，所以前面的人要等到對方真的動不了（8 秒）才自己想辦法
      const first = this.agents.indexOf(a) < this.agents.indexOf(o);
      if (mutual && first && a.waitT < 8) return;
      if (a.detours < 6 && this.detour(a, o, moving)) {
        a.detours++;
        this.stats.detours++;
        return;
      }
      if (a.waitT > 3 && a.reroutes < 3 && this.reroute(a, o)) {
        a.reroutes++;
        this.stats.reroutes++;
        return;
      }
      // 目的地旁邊有人一直站著：放棄這一趟
      const goal = a.task.spot;
      if (!moving && a.waitT > 6 && dist(o, goal) < GAP) {
        this.stats.abandons++;
        this.abandon(a, 1.5);
      }
    }
    /* 往旁邊讓開或從旁邊繞過 o。moving：o 在走（只讓開，等他過去）；否則從他旁邊繞過去再回到原路 */
    detour(a, o, moving) {
      if (this.onSeatLeg(a)) return false;
      const L0 = dist(a, o) || 1;
      const u = { x: (o.x - a.x) / L0, z: (o.z - a.z) / L0 };
      const W = GAP + 0.1;
      for (const s of [1, -1]) {
        const side = { x: -u.z * s, z: u.x * s }; // s = 1 是自己的右手邊
        for (const back of moving ? [0, 0.8, 1.6] : [0, 0.8]) {
          const P0 = { x: a.x - u.x * back, z: a.z - u.z * back };
          const pts = back ? [P0] : [];
          pts.push({ x: P0.x + side.x * W, z: P0.z + side.z * W });
          // 讓路：等對方過去後回到原本的位置再接著走（原本那條路一定走得通，例如門口）
          if (moving) pts.push({ x: a.x, z: a.z });
          const rest = a.path.slice();
          if (!moving) {
            pts.push({ x: o.x + side.x * W, z: o.z + side.z * W }, { x: o.x + side.x * W + u.x * W, z: o.z + side.z * W + u.z * W });
            // 原路上離他太近的點跳過（終點、門口前後的點不跳）
            const zone = this.nav.zoneOf(a.x, a.z);
            while (rest.length > 1 && dist(rest[0], o) < W && this.nav.zoneOf(rest[0].x, rest[0].z) === zone && this.nav.zoneOf(rest[1].x, rest[1].z) === zone) rest.shift();
          }
          // 繞路的每一段都要能走（包括接回原路的那一段）；繞過站著的人時，整段都要離他夠遠
          const around = [{ x: a.x, z: a.z }].concat(pts);
          const ok = this.pathOk(a, around.concat(rest.slice(0, 1)), null) && (moving || this.pathOk(a, around, o));
          if (ok && pts.every((p) => this.roomFor(a, p))) {
            a.path = pts.concat(rest);
            a.pathWhy = moving ? '讓路' : '繞過 ' + o.id;
            return true;
          }
        }
      }
      return false;
    }
    /* 正在入座或剛起身（入座點和座位之間那一小段）：這時不往旁邊讓、不改道，只能等（不然會從沙發、椅子上橫著穿過去） */
    onSeatLeg(a) {
      const leg = (s) => s && s.pose === 'sit' && s.approach && dist(a, s) <= dist(s.approach, s) + 0.1;
      return leg(a.leaving) || leg(a.task && a.task.spot);
    }
    /* 這個點旁邊沒有別人（讓路、繞路時停腳的地方） */
    roomFor(a, p) {
      return this.agents.every((o) => o === a || !o.visible || dist(p, o) >= GAP);
    }
    /* 一段折線能不能走：在地板上、只從門口進出房間、不進董事長室（董事長除外）、不碰到家具和牆；
     * avoid：要繞過的人，整段都要離他 GAP 以上 */
    pathOk(a, pts, avoid) {
      const goal = a.task && a.task.spot;
      // 自己要坐（或剛離開）的座位：只有入座那一小段（入座點 ↔ 座位）可以進到家具範圍
      const leg = (s, p) => s && s.approach && dist(p, s) <= dist(s.approach, s);
      const M = BODY_R + 0.02; // 多留 2 公分，取樣點之間也不會擦到角
      const own = (q, p) => q.spots && ((goal && q.spots.indexOf(goal.id) >= 0 && leg(goal, p)) || (a.leaving && q.spots.indexOf(a.leaving.id) >= 0 && leg(a.leaving, p)));
      const F = this.L.floor;
      // 起點本來就靠著的家具（例如剛站起來）：第一段只要不是越走越靠近它就可以
      const gap = (p, q) => {
        const r = (q.rot || 0) * DEG, dx = p.x - q.x, dz = p.z - q.z;
        return Math.max(Math.abs(dx * Math.cos(r) - dz * Math.sin(r)) - q.w / 2, Math.abs(dx * Math.sin(r) + dz * Math.cos(r)) - q.d / 2);
      };
      // （而且第一段的終點要離開它）
      const startHits = this.obstacles.filter((q) => inBox(pts[0], q, M) && pts.length > 1 && !inBox(pts[1], q, M));
      const away = (p, q) => startHits.indexOf(q) >= 0 && gap(p, q) >= gap(pts[0], q) - 1e-6;
      for (let i = 0; i + 1 < pts.length; i++) {
        const A = pts[i], B = pts[i + 1];
        const n = Math.max(1, Math.ceil(dist(A, B) / 0.05));
        let zone = this.nav.zoneOf(A.x, A.z);
        for (let k = 1; k <= n; k++) {
          const p = { x: A.x + ((B.x - A.x) * k) / n, z: A.z + ((B.z - A.z) * k) / n };
          if (p.x < F.minX + BODY_R || p.x > F.maxX - BODY_R || p.z < F.minZ + BODY_R || p.z > F.maxZ - BODY_R) return false;
          const z = this.nav.zoneOf(p.x, p.z);
          if (z !== zone) {
            if (!this.atDoor(p, zone, z)) return false;
            zone = z;
          }
          if (z === 'boss' && !this.isBoss(a)) return false;
          if (this.walls.some((w) => segDist(p, w.a, w.b) < M)) return false;
          if (this.obstacles.some((q) => !own(q, p) && !(i === 0 && away(p, q)) && inBox(p, q, M))) return false;
          if (avoid && dist(p, avoid) < GAP - 0.02) return false;
        }
      }
      return true;
    }
    /* 從 z0 走到 z1 的那一點是不是在門口（身體不會撞到門框） */
    atDoor(p, z0, z1) {
      if (z0 !== 'open' && z1 !== 'open') return false;
      const room = this.L.rooms[z0 === 'open' ? z1 : z0];
      return !!room && Math.abs(p.x - room.doorX) < room.doorW / 2 - BODY_R;
    }
    /* 改走別條路：避開 o 旁邊的路線點和走道 */
    reroute(a, o) {
      if (this.onSeatLeg(a) || (a.reroutedFor === o && this.time - a.reroutedAt < 4)) return false;
      a.reroutedFor = o;
      a.reroutedAt = this.time;
      const spot = a.task.spot;
      const near = (n) => dist(n, o) < GAP + 0.1;
      const nearEdge = (u, v) => segDist(o, u, v) < GAP;
      const zone = this.nav.zoneOf(a.x, a.z);
      const bossBlock = (n) => !this.isBoss(a) && n.zone === 'boss';
      const from = Object.values(this.nav.nodes)
        .filter((n) => n.zone === zone && !near(n) && this.pathOk(a, [{ x: a.x, z: a.z }, n], o))
        .sort((p, q) => dist(p, a) - dist(q, a))[0];
      const target = spot.approach || spot;
      const to = spot.node || this.nav.nearest(target, spot.zone);
      if (!from || !to) return false;
      const route = this.nav.route(from, to, (n) => bossBlock(n) || near(n), nearEdge);
      if (!route) return false;
      const pts = route.map((n) => ({ x: n.x, z: n.z }));
      if (spot.approach) pts.push(spot.approach);
      pts.push({ x: spot.x, z: spot.z });
      a.path = pts.filter((p, i) => i === pts.length - 1 || dist(p, pts[i + 1]) > 0.05);
      a.pathWhy = '改道避開 ' + o.id;
      return true;
    }
    /* 放棄目前這一趟（找不到路、等太久）：放掉預約的位置，原地站一下再重新決定 */
    abandon(a, dur) {
      [a.task].concat(a.queue).forEach((t) => {
        if (t && t.spot && t.spot.owner === a.id && !t.spot.permanent && t.spot !== a.atSpot) t.spot.owner = null;
      });
      const walking = a.pose === 'walk';
      if (walking) {
        // 停在入座那一小段上：下一趟先沿原路退回入座點，不直接穿過椅子、沙發
        const leg = (s) => s && s.pose === 'sit' && s.approach && dist(a, s) <= dist(s.approach, s) + 0.1;
        const seat = [a.leaving, a.task && a.task.spot].find(leg);
        if (seat) {
          a.exitVia = seat.approach;
          a.leaving = seat;
        }
        a.atSpot = null;
      }
      a.queue = [];
      a.path = null;
      a.waitT = 0;
      a.blockedBy = null;
      this.releaseDoor(a);
      a.task = { t: 'pose', pose: walking ? 'stand' : a.pose, dur, end: this.time + dur, face: walking ? null : a.atSpot ? a.atSpot.face : null };
      a.pose = a.task.pose;
    }

    /* ---------- 面對面聊天 ---------- */
    startChat(a, o, dur) {
      const until = this.time + dur;
      a.chat = { who: o, until, t0: this.time };
      o.chat = { who: a, until, t0: this.time };
      this.lookAt(a, o, dur);
      this.lookAt(o, a, dur);
    }
    /* 聊完：回到原本在做的事和方向（方向在下一幀由任務的 face 轉回去） */
    endChat(a) {
      const c = a.chat;
      if (!c) return;
      a.chat = null;
      if (a.task && a.task.t === 'pose') a.pose = a.task.pose;
      if (c.who.chat && c.who.chat.who === a) {
        c.who.chat = null;
        if (c.who.task && c.who.task.t === 'pose') c.who.pose = c.who.task.pose;
      }
      if (a.lookAt === c.who) a.lookUntil = 0;
      if (c.who.lookAt === a) c.who.lookUntil = 0;
      // 聊天中斷：這段對話不再說下去，頭上還掛著的那句也一起收掉（不會轉回去工作了還在講）
      this.convos = this.convos.filter((cv) => {
        if (!cv.pair || cv.pair.indexOf(a) < 0 || cv.pair.indexOf(c.who) < 0) return true;
        cv.pair.forEach((p) => {
          if (p.say && cv.lines.some(([w, text]) => w === p && text === p.say)) p.say = '';
        });
        return false;
      });
    }

    /* ---------- 決定下一件事 ---------- */
    decide(a) {
      const st = this.mode(a);
      if (st === 'off') return this.offWork(a);
      if (!a.visible) {
        // 上班：從電梯口出現；電梯口有人就等一下再出來（大家同時上班也不會疊在電梯口）
        if (this.agents.some((o) => o !== a && o.visible && dist(o, this.entry) < GAP + 0.2)) return this.act(a, 'stand', rand(0.5, 1.5));
        a.visible = true;
        a.x = this.entry.x;
        a.z = this.entry.z;
        a.heading = this.entry.face;
        a.atSpot = this.entry;
        a.teleport = false;
      }
      if (st === 'working') return a.m.behavior && a.m.behavior.mode === 'patrol' ? this.patrol(a) : this.work(a);
      if (st === 'walking') return this.wander(a);
      if (st === 'meeting') return this.meeting(a);
      if (st === 'idle') return this.idle(a);
      return this.work(a);
    }

    offWork(a) {
      if (!a.visible) return this.act(a, 'stand', 2);
      if (a.teleport) {
        // 一打開網頁就是下班狀態：直接不出現
        a.visible = false;
        a.x = this.seatOf(a).x;
        a.z = this.seatOf(a).z;
        return this.act(a, 'stand', 2);
      }
      this.go(a, this.entry);
      this.act(a, 'stand', 1.2, { face: this.entry.face + Math.PI });
      this.fn(a, () => {
        this.release(a);
        a.visible = false;
        a.atSpot = null;
      });
    }

    /* working：在一個工作點做一段時間 → 有時做點別的事（倒咖啡、找人聊）→ 換一個工作點 */
    work(a) {
      const b = a.m.behavior || {};
      let span = b.breakEvery || [25, 60];
      if (this.demo) span = [span[0] * DEMO.span, span[1] * DEMO.span];
      if (a.worked) {
        a.worked = false;
        // 示範模式：董事長第一次起身就去找人聊、GPT 第一次起身就去打電動。
        // 真的聊到（玩到）才算數；沒成功（對方走了、路被擋、位子被搶）下次起身再試一次
        const first = this.demo && !a.demoDone && DEMO.first[a.id];
        const ready = first === 'game' ? this.gameSpots.some((s) => this.free(s, a)) : !!first && this.talkTargets(a).length > 0;
        if (ready) return this.habit(a, first);
        const chance = this.demo ? DEMO.habitChance : b.habitChance != null ? b.habitChance : 0.65;
        if (Math.random() < chance) return this.habit(a, weighted(this.habitWeights(b.habits)) || 'stretch');
      }
      const here = a.atSpot;
      const stay = here && here.work && this.free(here, a) && Math.random() < 0.25;
      // 剛打開網頁時大家都在自己的位子（沛蓁在懶骨頭），之後才自由換位子
      const spot = a.teleport ? this.seatOf(a) : stay ? here : this.pickWorkSpot(a);
      if (a.atSpot !== spot) this.go(a, spot);
      this.act(a, spot.work, rand(span[0], span[1]), { face: spot.face });
      a.worked = true;
    }
    pickWorkSpot(a) {
      const seat = this.seatOf(a);
      const prefs = Object.assign({}, (a.m.behavior && a.m.behavior.workAt) || DEFAULT_WORK_AT);
      // 沒有空位的種類不選
      Object.keys(prefs).forEach((g) => {
        if (g !== 'seat' && !this.workSpots.some((s) => s.group === g && this.free(s, a))) delete prefs[g];
      });
      const g = weighted(prefs) || 'seat';
      if (g === 'seat') return seat;
      return pick(this.workSpots.filter((s) => s.group === g && this.free(s, a)));
    }
    /* 坐著的時候才做的小動作（喝一口、玩機器人、伸懶腰）；不是坐著就改成看看四周 */
    sittingHabit(a, pose, dur) {
      const s = a.atSpot;
      if (s && s.pose === 'sit' && dist(a, s) < 0.05) return this.act(a, pose, dur, { face: s.face });
      return this.act(a, 'look', 3, { face: s ? s.face : a.heading });
    }

    /* 起身做別的事的比重；示範模式時聊天、打電動加重 */
    habitWeights(h) {
      if (!this.demo || !h) return h;
      const out = Object.assign({}, h);
      Object.keys(DEMO.boost).forEach((k) => out[k] && (out[k] *= DEMO.boost[k]));
      return out;
    }

    habit(a, habit) {
      switch (habit) {
        case 'game': {
          // 工作中也可以去沙發打一局電動（只有兩支手把，位子滿了就伸個懶腰）
          const list = this.gameSpots.filter((s) => this.free(s, a));
          if (!list.length) return this.sittingHabit(a, 'stretch', 3);
          return this.game(a, pick(list));
        }
        case 'coffee': {
          if (!this.free(this.coffee, a)) return this.sittingHabit(a, 'stretch', 3);
          this.go(a, this.coffee);
          this.act(a, 'brew', rand(4, 6), { face: this.coffee.face });
          if (a.m.appearance.items.some((i) => i.type === 'mug')) this.act(a, 'drink', 2.5, { face: this.coffee.face });
          return;
        }
        case 'sip':
          return this.sittingHabit(a, 'drinkSit', rand(2.5, 4));
        case 'robot':
          return this.sittingHabit(a, 'robot', rand(5, 8));
        case 'stretch':
          return this.sittingHabit(a, 'stretch', rand(2.5, 3.5));
        case 'window': {
          const list = this.windows.filter((w) => (this.isBoss(a) || w.zone !== 'boss') && this.free(w, a));
          if (!list.length) return this.sittingHabit(a, 'stretch', 3);
          // 董事長看自己房間的窗
          const w = this.isBoss(a) && list.some((s) => s.zone === 'boss') ? list.find((s) => s.zone === 'boss') : pick(list);
          this.go(a, w);
          this.act(a, 'look', rand(6, 10), { face: w.face });
          return;
        }
        case 'chat':
          return this.chat(a);
        case 'visit':
          return this.visit(a);
        default:
          return this.sittingHabit(a, 'stretch', 3);
      }
    }

    /* 走到正在做事的同事旁邊聊天：對方會停下手邊的事、轉身面對你，而且會等聊完才換地方
     * （開會、打電動、已經在跟別人聊的人不打擾） */
    talkTargets(a, filter) {
      return this.agents.filter((o) => {
        if (o === a || !this.settled(o) || o.atSpot.zone === 'boss' || o.chat) return false;
        if (this.mode(o) !== 'working' || !WORK_POSES[o.task.pose]) return false;
        const ts = o.atSpot.talkSpot;
        return ts && this.free(ts, a) && (!filter || filter(o));
      });
    }
    goTalk(a, o, dur, lines) {
      const ts = o.atSpot.talkSpot;
      const target = o.atSpot;
      // 對方先別走：等我走過去（大約走路時間 + 聊天時間）
      const walk = (Math.abs(a.x - ts.x) + Math.abs(a.z - ts.z)) / a.speed + 2;
      if (o.task.end < this.time + walk + dur) o.task.end = this.time + walk + dur;
      this.go(a, ts);
      this.act(a, 'talk', dur, {
        face: ts.face,
        onStart: (t) => {
          // 走到時對方已經離開（或正在跟別人聊）：只停一下就走
          if (!(o.atSpot === target && this.settled(o)) || o.chat) {
            t.end = this.time + 1.0;
            return;
          }
          if (o.task.end < this.time + dur + 0.5) o.task.end = this.time + dur + 0.5;
          this.startChat(a, o, dur);
          if (DEMO.first[a.id] === 'chat') a.demoDone = true;
          if (lines) this.talk(lines.map(([who, text]) => [who === 'me' ? a : o, text]), [a, o]);
        },
      });
    }
    /* 同事串門子：有台詞（問一句、回一句，有時再補一句） */
    visit(a) {
      const list = this.talkTargets(a);
      if (!list.length) return this.sittingHabit(a, 'stretch', 3);
      const lines = [['me', pick(LINES.visitOpen)], ['o', pick(LINES.visitReply)]];
      if (Math.random() < 0.7) lines.push(['me', pick(LINES.visitClose)]);
      this.goTalk(a, pick(list), this.talkTime(lines.length), lines);
    }
    /* 董事長：走出董事長室，到開放區、會議室討論區或稽查室找正在做事的同事當面聊，聊完回座位 */
    chat(a) {
      const list = this.talkTargets(a);
      if (!list.length) return this.sittingHabit(a, 'stretch', 3);
      // 示範模式第一次：找走過去最近、而且走得到的人，一分鐘內一定看得到
      const firstDemo = this.demo && !a.demoDone;
      const o = firstDemo ? this.closestByRoute(a, list) || pick(list) : pick(list);
      const lines = [['me', pick(LINES.bossOpen)], ['o', pick(LINES.reply)], ['me', pick(LINES.bossClose)], ['o', pick(LINES.bossThanks)]];
      this.goTalk(a, o, this.talkTime(lines.length), lines);
      const seat = this.seatOf(a);
      this.go(a, seat);
      // 示範模式：回座位做事的時間一樣縮短（第一次沒聊成時，很快會再出來試）
      const k = this.demo ? DEMO.span : 1;
      this.act(a, seat.work, rand(15 * k, 25 * k), { face: seat.face });
      a.worked = true;
    }
    /* 名單裡沿路線走過去最近的人（走不到的不算） */
    closestByRoute(a, list) {
      const from = this.nav.nearest(a.atSpot && a.atSpot.approach ? a.atSpot.approach : a, this.nav.zoneOf(a.x, a.z));
      if (!from) return null;
      const D = this.nav.distTo(from, this.isBoss(a) ? null : (n) => n.zone === 'boss');
      let best = null, bd = Infinity;
      list.forEach((o) => {
        const n = o.atSpot.talkSpot.node;
        const d = n && D.has(n) ? D.get(n) : Infinity;
        if (d < bd) { bd = d; best = o; }
      });
      return best;
    }

    lookAt(target, who, dur) {
      if (target.chat && target.chat.who !== who) return; // 正在跟別人聊，不會被叫過去轉頭
      target.lookAt = who;
      target.lookUntil = this.time + dur;
    }

    /* 林怡瑄：找正在做事的同事問進度、到董事長室門口報告、去稽查室收報告；
     * 巡 4 站後找個工作點做一下自己的事（大多回自己座位，也會去沙發、吧台、白板前、會議室討論區） */
    patrol(a) {
      const b = a.m.behavior || {};
      const span = b.breakEvery || [12, 20];
      const sitDown = () => {
        const spot = a.teleport ? this.seatOf(a) : this.pickWorkSpot(a);
        if (a.atSpot !== spot) this.go(a, spot);
        this.act(a, spot.work, rand(span[0], span[1]), { face: spot.face });
      };
      if (a.teleport) return sitDown(); // 剛打開網頁：先在自己座位
      if (a.patrolCount > 0 && a.patrolCount % 4 === 0 && !a.satThisRound) {
        a.satThisRound = true;
        return sitDown();
      }
      a.satThisRound = false;
      const stops = this.talkTargets(a).map((o) => ({ spot: o.atSpot.talkSpot, who: o }));
      const boss = this.boss;
      if (boss && boss !== a && this.settled(boss) && boss.atSpot === this.seatOf(boss) && this.free(this.bossDoor, a)) {
        stops.push({ spot: this.bossDoor, who: boss, report: true }, { spot: this.bossDoor, who: boss, report: true }); // 比較常去報告
      }
      if (this.free(this.auditReport, a)) stops.push({ spot: this.auditReport, who: null });
      const options = stops.filter((s) => s.spot !== a.lastStop);
      if (!options.length) {
        sitDown();
        return;
      }
      const s = pick(options);
      a.lastStop = s.spot;
      a.patrolCount++;
      const dur = rand(5, 8);
      if (s.who && !s.report) {
        const lines = [['me', pick(LINES.patrolOpen)], ['o', pick(LINES.patrolReply)], ['me', pick(LINES.patrolClose)]];
        return this.goTalk(a, s.who, this.talkTime(lines.length), lines);
      }
      this.go(a, s.spot);
      // 到董事長室門口時董事長要還在自己座位，才會轉頭聽報告
      this.act(a, 'talk', dur, { face: s.spot.face, onStart: () => s.who && (!s.report || s.who.atSpot === this.seatOf(s.who)) && this.lookAt(s.who, a, dur) });
    }

    wander(a) {
      const list = this.wanderSpots.filter((s) => s !== a.atSpot && this.free(s, a) && (this.isBoss(a) || s.zone !== 'boss'));
      if (!list.length) return this.act(a, 'stand', 3);
      const s = pick(list);
      this.go(a, s);
      this.act(a, 'look', rand(3, 6), { face: s.face });
    }

    /* meeting：去會議室。董事長坐主持人座位，其他人坐長桌兩側或站在螢幕旁簡報；位子滿了在室內候位 */
    meeting(a) {
      const host = a.m.behavior && a.m.behavior.host;
      let spot;
      if (host) spot = this.meetHost;
      else {
        const inMeet = this.meet.indexOf(a.atSpot) >= 0;
        spot = inMeet ? a.atSpot : this.meet.find((s) => this.free(s, a));
        if (!spot) spot = this.meetWait.indexOf(a.atSpot) >= 0 ? a.atSpot : this.overflow(a, this.meetWait);
      }
      if (a.atSpot !== spot) this.go(a, spot);
      const sit = spot.pose === 'sit';
      const pose = Math.random() < 0.55 ? (sit ? 'talkSit' : 'talk') : sit ? 'sit' : 'stand';
      this.act(a, pose, rand(5, 9), { face: spot.face });
    }

    /* 候位點：先找沒人的，都有人就照順序共用（人很多時才會發生） */
    overflow(a, list) {
      return list.find((s) => this.free(s, a)) || list[this.agents.indexOf(a) % list.length];
    }

    /* idle：去沙發區或茶水間休息；有時打電動（董事長和 GPT 常常一起打） */
    idle(a) {
      if (a.invite) {
        const s = a.invite;
        a.invite = null;
        return this.game(a, s);
      }
      const here = a.atSpot;
      // 自己的懶骨頭在休息區裡（沛蓁）也算休息的位子
      const resting = here && (here.idle || (here === this.seatOf(a) && here.seat === 'beanbag' && this.inRestArea(here)));
      // 兩人一起打電動
      const partnerId = a.id === 'boss' ? 'gpt' : a.id === 'gpt' ? 'boss' : null;
      const partner = partnerId && this.byId[partnerId];
      if (partner && this.present(partner) && this.mode(partner) === 'idle' && partner.visible && Math.random() < 0.6) {
        const mine = here && here.game ? here : this.gameSpots.find((s) => this.free(s, a));
        const theirs = partner.atSpot && partner.atSpot.game && partner.atSpot !== mine ? partner.atSpot
          : this.gameSpots.find((s) => s !== mine && this.free(s, partner));
        if (mine && theirs) {
          if (partner.atSpot !== theirs || partner.pose !== 'game') {
            this.reserve(theirs, partner);
            partner.invite = theirs;
            // 對方手上的事做到一半就收起來過來玩
            if (partner.task && partner.task.t === 'pose') partner.task.end = this.time;
          }
          return this.game(a, mine);
        }
      }
      if (here && here.game && this.present(a) && Math.random() < 0.5) return this.game(a, here);
      if (resting && Math.random() < 0.6) {
        this.act(a, here.pose === 'sit' ? 'sitRelax' : 'stand', rand(12, 25), { face: here.face });
        return;
      }
      const r = Math.random();
      // 董事長和 GPT 都在休息時，電視留給他們兩個；其他時候誰都可以玩
      const duoResting = !partner && ['boss', 'gpt'].every((id) => this.byId[id] && this.mode(this.byId[id]) === 'idle' && this.byId[id].visible);
      if (r < 0.2 && !duoResting) {
        const gs = this.gameSpots.find((s) => this.free(s, a));
        if (gs) return this.game(a, gs);
      }
      if (r > 0.75 && this.free(this.coffee, a)) {
        this.go(a, this.coffee);
        this.act(a, 'brew', rand(4, 6), { face: this.coffee.face });
      }
      const list = this.idleSpots.filter((s) => this.free(s, a) && s !== here && !s.game);
      if (!list.length) {
        // 休息的位子都滿了：留在原位（已經在休息區時）或去候位點站著等
        if (resting || this.loungeWait.indexOf(here) >= 0) {
          return this.act(a, here.pose === 'sit' ? 'sitRelax' : 'stand', rand(8, 15), { face: here.face });
        }
        const w = this.overflow(a, this.loungeWait);
        this.go(a, w);
        this.act(a, 'stand', rand(8, 15), { face: w.face });
        return;
      }
      const s = pick(list);
      this.go(a, s);
      const pose = s.pose === 'sit' ? (Math.random() < 0.3 && a.m.appearance.items.some((i) => i.type === 'mug') ? 'drinkSit' : 'sitRelax') : 'stand';
      this.act(a, pose, rand(15, 30), { face: s.face });
    }
    game(a, spot) {
      if (a.atSpot !== spot) this.go(a, spot);
      this.act(a, 'game', rand(20, 40), {
        face: spot.face,
        onStart: () => DEMO.first[a.id] === 'game' && (a.demoDone = true),
        every: [5, () => Math.random() < 0.3 && this.say(a, pick(LINES.game), 2.2)],
      });
    }

    /* ---------- 每一幀 ---------- */
    update(dt) {
      this.time += dt;
      this.agents.forEach((a) => {
        this.step(a, dt);
        // 轉身
        if (a.targetHeading != null) {
          const diff = wrap(a.targetHeading - a.heading);
          a.heading += diff * Math.min(1, dt * 8);
        }
        // 轉頭看來找自己的人（身體轉不夠的部分用頭補）
        let yaw = 0;
        if (a.lookAt && this.time < a.lookUntil) {
          yaw = clamp(wrap(angleTo(a, a.lookAt) - a.heading), -HEAD_TURN, HEAD_TURN);
        }
        a.lookYaw += (yaw - a.lookYaw) * Math.min(1, dt * 4);
        if (a.say && this.time >= a.sayUntil) a.say = '';
      });
      // 對話：一句一句輪流出現在頭上（聊天被打斷，例如狀態改了，就不再說下去）
      this.convos = this.convos.filter((c) => {
        const idx = Math.floor((this.time - c.t0) / LINE_SEC);
        if (idx >= c.lines.length) return false;
        if (c.pair && !(c.pair[0].chat && c.pair[0].chat.who === c.pair[1])) return false;
        if (idx !== c.idx) {
          c.idx = idx;
          const [who, text] = c.lines[idx];
          if (this.present(who)) this.say(who, text, SAY_SEC);
        }
        return true;
      });
    }
  }

  O.Sim = Sim;
})();
