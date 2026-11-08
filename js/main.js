/* 主程式：載入 Three.js、建立場景、讀狀態、畫面上的名牌卡與對話泡泡。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const LABEL = { working: '工作中', walking: '走動中', meeting: '開會中', idle: '休息中', off: '下班' };
  const COLOR = { working: '#4cc47a', walking: '#3fa9e0', meeting: '#e8a93a', idle: '#b48ae6', off: '#8a8a8a' };
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');

  O.start = function (THREE_, addons) {
    window.THREE = THREE_;
    O.Kit.init(addons.mergeGeometries);

    const params = new URLSearchParams(location.search);
    const hourParam = params.has('hour') ? parseFloat(params.get('hour')) : NaN;
    const hourOverride = isFinite(hourParam) ? ((hourParam % 24) + 24) % 24 : null;
    const showFps = params.has('fps');
    const lowStart = params.has('low'); // ?low：一開始就用低畫質（陰影解析度降低）
    // ?fixed：固定畫質（不自動降解析度、不降陰影），比較兩個版本的效能時用，才不會拿降畫質後的 fps 來比
    const fixedQuality = params.has('fixed');
    // ?demo：示範模式，聊天、打電動更常發生（驗收用，打開一分鐘內就看得到）
    const demo = params.has('demo');
    const t0 = performance.now();

    /* ---------- 畫面 ---------- */
    const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 1200);
    const controls = new addons.OrbitControls(camera, renderer.domElement);
    controls.target.set(0.5, 0.8, 0.8);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 48;
    controls.maxPolarAngle = 1.38;
    /* 預設鏡頭比第一版拉近，看得清楚臉和配件。
     * 手機直向（畫面比寬還高）時左右看得到的範圍很窄：視角加大一點（最多 52 度）、鏡頭再往後拉，
     * 讓左邊的董事長室和右前方的沙發區都在畫面裡 */
    const CAM = { fov: 38, maxFov: 52, target: [0.5, 0.8, 0.8], offset: [9, 10.2, 13.2], wantHalf: Math.tan((19 * Math.PI) / 180) * 1.4 };
    function fitCamera() {
      const aspect = window.innerWidth / window.innerHeight;
      let fov = CAM.fov, k = 1;
      if (aspect < 1) {
        // wantHalf：左右視角一半的 tan 值，跟一般橫向螢幕差不多寬
        fov = Math.min(CAM.maxFov, (2 * Math.atan(CAM.wantHalf / aspect) * 180) / Math.PI);
        // 最多拉到 2.5 倍（不超過 controls.maxDistance）
        k = Math.min(2.5, Math.max(1, CAM.wantHalf / (Math.tan((fov * Math.PI) / 360) * aspect)));
      }
      camera.fov = fov;
      const [tx, ty, tz] = CAM.target, [ox, oy, oz] = CAM.offset;
      camera.position.set(tx + ox * k, ty + oy * k, tz + oz * k);
      controls.target.set(tx, ty, tz);
      camera.updateProjectionMatrix();
      controls.update();
      return { fov, k, portrait: aspect < 1 };
    }
    let camFit = fitCamera();

    const world = O.buildWorld(scene);
    const lighting = O.createLighting(scene, world);
    const sim = new O.Sim(O.LAYOUT, O.TEAM, { demo });
    const rigs = {};
    O.TEAM.forEach((m) => {
      const rig = O.buildCharacter(m);
      scene.add(rig.root);
      rigs[m.id] = rig;
    });

    // 選取時腳下的光圈
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    ring.visible = false;
    scene.add(ring);

    /* ---------- 介面 ---------- */
    const status = {};
    const ui = { roster: {}, bubble: {} };
    let selected = null;

    O.TEAM.forEach((m) => {
      const btn = document.createElement('button');
      btn.className = 'member';
      btn.innerHTML = '<span class="dot"></span><span class="nm"></span><span class="st"></span>';
      btn.querySelector('.nm').textContent = m.name;
      btn.addEventListener('click', () => select(m.id));
      $('roster-list').appendChild(btn);
      ui.roster[m.id] = btn;

      const b = document.createElement('div');
      b.className = 'bubble';
      b.style.display = 'none';
      $('bubbles').appendChild(b);
      ui.bubble[m.id] = { el: b, shown: false, text: '', say: false };
    });

    // 午休時段 working 的人顯示「午休中」（顏色跟休息中一樣）
    const lunchNow = (s) => sim.lunch && s.status === 'working';
    const labelOf = (s) => (lunchNow(s) ? '午休中' : LABEL[s.status]);
    const colorOf = (s) => (lunchNow(s) ? COLOR.idle : COLOR[s.status]);
    function refreshMemberUI(id) {
      const s = status[id];
      const btn = ui.roster[id];
      btn.querySelector('.dot').style.background = colorOf(s);
      btn.querySelector('.st').textContent = labelOf(s);
      btn.classList.toggle('active', selected === id);
      if (!ui.bubble[id].say) {
        ui.bubble[id].el.textContent = s.doing || '';
        ui.bubble[id].text = s.doing || '';
      }
      if (selected === id) fillCard(id);
    }
    function fillCard(id) {
      const m = O.TEAM.find((t) => t.id === id);
      const s = status[id];
      $('card-name').textContent = m.name;
      $('card-role').textContent = m.role || '';
      const st = $('card-status');
      st.textContent = labelOf(s);
      st.style.background = colorOf(s);
      $('card-doing').textContent = s.doing || '—';
      $('card-next').textContent = s.next || '—';
    }
    function select(id) {
      selected = id;
      if (id) {
        fillCard(id);
        $('card').classList.add('show');
      } else {
        $('card').classList.remove('show');
      }
      O.TEAM.forEach((m) => ui.roster[m.id].classList.toggle('active', selected === m.id));
    }
    $('card-close').addEventListener('click', () => select(null));

    /* ---------- 狀態 ---------- */
    const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
    const asText = (x) => (x == null ? '' : typeof x === 'string' ? x : typeof x === 'number' ? String(x) : null);
    // 只收合格的欄位；格式錯的欄位略過並提醒，沿用原本的值
    function cleanEntry(m, raw) {
      if (raw == null) return {};
      if (!isObj(raw)) {
        console.warn('[office3d] ' + m.name + ' 的狀態格式不對（要是 { status, doing, next }），略過');
        return {};
      }
      const out = {};
      if (raw.status != null) {
        if (LABEL[raw.status]) out.status = raw.status;
        else console.warn('[office3d] ' + m.name + ' 的 status 不認得：' + raw.status + '，沿用原本的狀態');
      }
      ['doing', 'next'].forEach((k) => {
        if (!(k in raw)) return;
        const v = asText(raw[k]);
        if (v == null) console.warn('[office3d] ' + m.name + ' 的 ' + k + ' 要是文字，略過');
        else out[k] = v.slice(0, 80);
      });
      return out;
    }
    function applyStatus(json, sourceText) {
      if (json != null && !isObj(json)) {
        console.warn('[office3d] 狀態資料格式不對（最外層要是 { "members": { ... } }），沿用目前狀態');
        return false;
      }
      let members = (json && json.members) || {};
      if (!isObj(members)) {
        console.warn('[office3d] members 要是 { id: {...} } 的格式，沿用目前狀態');
        members = {};
      }
      const defaults = (O.DEFAULT_STATUS && O.DEFAULT_STATUS.members) || {};
      O.TEAM.forEach((m) => {
        const s = Object.assign({ status: 'working', doing: '', next: '' }, cleanEntry(m, defaults[m.id]), status[m.id], cleanEntry(m, members[m.id]));
        status[m.id] = s;
        sim.setStatus(m.id, s.status);
        refreshMemberUI(m.id);
      });
      const upd = json && asText(json.updated);
      $('source').textContent = sourceText + (upd ? '（' + upd + '）' : '');
      return true;
    }
    applyStatus(O.DEFAULT_STATUS, '狀態：內建預設');

    const isHttp = /^https?:$/.test(location.protocol);
    async function loadStatus() {
      try {
        const r = await fetch('status.json?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        const t = new Date();
        const ok = applyStatus(j, '狀態：status.json ' + pad(t.getHours()) + ':' + pad(t.getMinutes()) + ' 讀取');
        if (!ok) throw new Error('格式不對');
      } catch (e) {
        console.warn('[office3d] 讀不到 status.json，沿用目前狀態：', e.message);
      }
    }
    let simReady = !isHttp;
    if (isHttp) {
      const timeout = new Promise((res) => setTimeout(res, 2500));
      Promise.race([loadStatus(), timeout]).then(() => (simReady = true));
      setInterval(loadStatus, 60000);
    }

    /* ---------- 點人物 ---------- */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = null;
    renderer.domElement.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      // 人物和家具一起測：被桌櫃、牆擋住的人點不到；玻璃（半透明）不算遮擋
      const roots = sim.agents.filter((a) => a.visible).map((a) => rigs[a.id].root);
      const hits = raycaster.intersectObjects(roots.concat(world.group ? [world.group] : []), true);
      const hit = hits.find((h) => !(h.object.material && h.object.material.transparent && h.object.material.opacity < 0.6));
      select(hit ? hit.object.userData.agentId || null : null);
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      // 手機轉向（直向 ↔ 橫向）才重新擺鏡頭；只是視窗大小變了就不動使用者自己轉過的鏡頭
      if (camera.aspect < 1 !== camFit.portrait) camFit = fitCamera();
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    /* ---------- 時間與座位燈 ---------- */
    const lampOn = new THREE.Color('#fff4d6'), lampOff = new THREE.Color('#5a574e');
    const scrOn = new THREE.Color('#ffffff'), scrOff = new THREE.Color('#15171c');
    // 午休時段（台北時間，小時）：這段時間 working 的人會去沙發區、茶水間休息，有時打電動
    const LUNCH = [12, 13.5];
    function tickClock() {
      const tp = O.taipeiTime();
      const hour = hourOverride != null ? hourOverride : tp.hour;
      const st = lighting.update(hour);
      const hh = hourOverride != null ? Math.floor(hour) : tp.h;
      const mm = hourOverride != null ? Math.round((hour % 1) * 60) % 60 : tp.m;
      $('clock').textContent = '台北 ' + pad(hh) + ':' + pad(mm);
      tickWallClocks(hh, mm, hourOverride != null ? 0 : tp.s);
      // 示範模式不看真實時鐘的午休（不然 12:00–13:30 打開時大家都去休息，看不到聊天）；有加 ?hour= 才照那個時間
      const lunch = (!demo || hourOverride != null) && hour >= LUNCH[0] && hour < LUNCH[1];
      if (lunch !== sim.lunch) {
        sim.setLunch(lunch);
        O.TEAM.forEach((m) => refreshMemberUI(m.id));
      }
      $('phase').textContent = st.phase + (lunch ? '・午休' : '') + (demo ? '・示範模式' : '') + (hourOverride != null ? '（測試時間）' : '');
      O.TEAM.forEach((m) => {
        const d = world.desks[m.id];
        const on = status[m.id] && status[m.id].status !== 'off';
        d.lampMat.emissiveIntensity = on ? 0.35 + 1.3 * st.interior : 0;
        d.lampMat.color.copy(on ? lampOn : lampOff);
        d.screenMat.emissiveIntensity = on ? 0.9 : 0;
        d.screenMat.color.copy(on ? scrOn : scrOff);
      });
    }
    tickClock();
    setInterval(tickClock, 1000);

    /* ---------- 牆上時鐘 ---------- */
    function tickWallClocks(hh, mm, ss) {
      const ma = ((mm + ss / 60) / 60) * Math.PI * 2;
      const ha = (((hh % 12) + mm / 60) / 12) * Math.PI * 2;
      world.clocks.forEach((c) => {
        c.hour.rotation.z = -ha;
        c.minute.rotation.z = -ma;
      });
    }

    /* ---------- 每一幀 ---------- */
    const v = new THREE.Vector3();
    let tvOn = null;
    let last = performance.now(), t = 0, frames = 0, fpsT = 0, slowRounds = 0;
    let worst = 0, quality = 2;
    function frame(now) {
      requestAnimationFrame(frame);
      // raw：真實經過的時間（量 fps 用）；dt：給動畫用，最多 0.1 秒，避免切回分頁時人物瞬移
      const raw = Math.max(0, (now - last) / 1000);
      const dt = Math.min(0.1, raw);
      last = now;
      t += dt;
      if (simReady) sim.update(dt);

      let gamers = 0;
      sim.agents.forEach((a) => {
        const rig = rigs[a.id];
        rig.root.visible = a.visible;
        if (!a.visible) return;
        rig.root.position.set(a.x, 0, a.z);
        rig.root.rotation.y = a.heading;
        rig.walkPhase = a.walkDist * 4.2;
        // 坐在什麼上面、手上的東西要放哪裡，都看目前所在的位置
        const sp = a.atSpot;
        rig.update(dt, t, {
          pose: a.pose, lookYaw: a.lookYaw,
          seat: sp && sp.seatInfo, desk: !!(sp && sp.deskRest), side: sp && sp.rest, surface: sp && sp.surface,
        });
        if (a.pose === 'game') gamers++;
      });
      // 有人在打電動：電視亮起遊戲畫面，茶几上的手把被拿走
      const on = gamers > 0;
      if (world.tv) {
        if (on !== tvOn) {
          tvOn = on;
          const tex = on ? world.tv.gameTex : world.tv.offTex;
          world.tv.mat.map = tex;
          world.tv.mat.emissiveMap = tex;
          world.tv.mat.emissiveIntensity = on ? 1.0 : 0.15;
        }
        if (on) world.tv.gameTex.offset.x = (t * 0.06) % 1;
      }
      world.controllers.forEach((c, i) => (c.visible = i >= gamers));

      // 選取光圈
      const sa = selected && sim.byId[selected];
      ring.visible = !!(sa && sa.visible);
      if (ring.visible) {
        ring.position.x = sa.x;
        ring.position.z = sa.z;
        ring.material.opacity = 0.65 + Math.sin(t * 4) * 0.25;
      }

      controls.update();
      renderer.render(scene, camera);

      // 頭上的泡泡：對話泡泡（聊天、打電動）優先；沒在講話時，working 的人顯示在做什麼
      // （正在聊天、打電動、午休時不顯示工作內容，才看得出來是在聊天或休息）
      const W = window.innerWidth, H = window.innerHeight;
      sim.agents.forEach((a) => {
        const b = ui.bubble[a.id];
        const s = status[a.id];
        const talking = a.visible && !!a.say;
        const busyElse = !!a.chat || a.pose === 'game' || sim.mode(a) !== 'working';
        let show = talking || (a.visible && s.status === 'working' && !!s.doing && !busyElse);
        if (show) {
          const text = talking ? a.say : s.doing;
          if (text !== b.text) {
            b.text = text;
            b.el.textContent = text;
          }
          if (talking !== b.say) {
            b.say = talking;
            b.el.classList.toggle('say', talking);
          }
          v.set(a.x, 2.3 + rigs[a.id].cur.figY, a.z).project(camera);
          show = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
          if (show) b.el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-100%)' + (b.lift ? ' translateY(-' + b.lift + 'px)' : '');
        }
        if (show !== b.shown) {
          b.el.style.display = show ? 'block' : 'none';
          b.shown = show;
        }
      });

      // 量 fps（用真實時間）；太慢就自動降畫質：先降解析度，再降陰影
      // 單幀超過 1 秒（分頁在背景、電腦睡眠）不算進來
      if (raw < 1) {
        frames++;
        fpsT += raw;
        worst = Math.max(worst, raw);
      }
      if (fpsT >= 2) {
        const fps = frames / fpsT;
        const info = renderer.info.render;
        if (showFps) {
          const mem = performance.memory ? ' · JS 記憶體 ' + Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : '';
          $('fps').textContent = Math.round(fps) + ' fps · 平均 ' + ((fpsT / frames) * 1000).toFixed(1) + ' ms · 最慢 ' + (worst * 1000).toFixed(0) +
            ' ms\n' + info.calls + ' draw calls · ' + Math.round(info.triangles / 1000) + 'k 三角形\n' +
            '解析度 ×' + renderer.getPixelRatio().toFixed(2) + ' · ' + window.innerWidth + '×' + window.innerHeight + ' · 畫質 ' + quality + (fixedQuality ? '（固定）' : '') +
            '\n場景建立 ' + Math.round(loadMs) + ' ms' + mem;
        }
        slowRounds = !fixedQuality && t > 4 && fps < 45 ? slowRounds + 1 : 0;
        if (slowRounds >= 2) {
          slowRounds = 0;
          if (renderer.getPixelRatio() > 1) renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.5));
          else if (quality > 0) {
            quality--;
            lighting.setQuality(quality);
          }
        }
        frames = 0;
        fpsT = 0;
        worst = 0;
      }
    }
    if (lowStart) {
      quality = 0;
      lighting.setQuality(0);
      renderer.setPixelRatio(1);
    }
    const loadMs = performance.now() - t0;
    requestAnimationFrame(frame);
    if (showFps) $('fps').style.display = 'block';
    $('loading').style.display = 'none';
    O.app = { scene, camera, renderer, sim, rigs, status, applyStatus, world, bubbles: ui.bubble, camFit: () => camFit };
  };

  /* ---------- 載入 Three.js（從 CDN，靠 index.html 的 importmap） ---------- */
  function fail(msg, e) {
    console.warn('[office3d] ' + msg, e);
    const el = $('loading');
    el.classList.add('error');
    el.textContent = msg;
  }
  async function boot() {
    let mods;
    try {
      const THREE_ = await import('three');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
      mods = { THREE_, OrbitControls, mergeGeometries };
    } catch (e) {
      return fail('3D 引擎載入失敗：請確認電腦有連上網路（需要從網路下載 Three.js），再重新整理一次。', e);
    }
    try {
      O.start(mods.THREE_, { OrbitControls: mods.OrbitControls, mergeGeometries: mods.mergeGeometries });
    } catch (e) {
      fail('場景建立失敗：' + (e && e.message ? e.message : e), e);
    }
  }
  if (!O.__noBoot) boot();
})();
