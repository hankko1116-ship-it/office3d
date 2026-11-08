/* 時間與光線：跟著台北時間（Asia/Taipei）變化。
 * 白天日光 → 傍晚夕陽 → 晚上窗外城市燈光、室內燈打開。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const PI = Math.PI;

  // 每個關鍵時刻的光線設定（中間時間自動漸變）
  // sky/horizon：天空上方/地平線顏色；sun：太陽(或月光)顏色與強度；hemi/amb：環境光；
  // interior：室內燈亮度 0~1；city：窗外大樓燈光 0~1
  const KEYS = [
    { h: 0, sky: '#05081a', hor: '#1c2142', sun: '#8a9cff', sunI: 0.12, hemi: 0.16, amb: 0.1, interior: 1, city: 1 },
    { h: 5, sky: '#070b22', hor: '#232a52', sun: '#8a9cff', sunI: 0.12, hemi: 0.16, amb: 0.1, interior: 1, city: 1 },
    { h: 6, sky: '#3a4a7a', hor: '#f0a070', sun: '#ffb070', sunI: 0.45, hemi: 0.3, amb: 0.1, interior: 0.6, city: 0.6 },
    { h: 7.5, sky: '#5aa0e6', hor: '#cfe8ff', sun: '#fff3e0', sunI: 0.85, hemi: 0.5, amb: 0.1, interior: 0.1, city: 0.08 },
    { h: 12, sky: '#4a90e2', hor: '#d6ecff', sun: '#ffffff', sunI: 0.95, hemi: 0.55, amb: 0.1, interior: 0.05, city: 0 },
    { h: 16, sky: '#5a96d8', hor: '#f6e0c0', sun: '#fff0d0', sunI: 0.85, hemi: 0.5, amb: 0.1, interior: 0.1, city: 0.05 },
    { h: 17.2, sky: '#6a5aa8', hor: '#ff9a55', sun: '#ff8a40', sunI: 0.7, hemi: 0.38, amb: 0.1, interior: 0.45, city: 0.35 },
    { h: 18.2, sky: '#2a2a5a', hor: '#c8607a', sun: '#ff6a48', sunI: 0.3, hemi: 0.26, amb: 0.1, interior: 0.85, city: 0.8 },
    { h: 19.3, sky: '#0a0f2a', hor: '#2a2850', sun: '#8a9cff', sunI: 0.12, hemi: 0.17, amb: 0.1, interior: 1, city: 1 },
    { h: 24, sky: '#05081a', hor: '#1c2142', sun: '#8a9cff', sunI: 0.12, hemi: 0.16, amb: 0.1, interior: 1, city: 1 },
  ];

  O.taipeiTime = function () {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (t) => Number((parts.find((p) => p.type === t) || {}).value || 0);
    const h = get('hour') % 24, m = get('minute'), s = get('second');
    return { h, m, s, hour: h + m / 60 + s / 3600 };
  };
  O.phaseName = function (hour) {
    if (hour >= 6 && hour < 16.5) return '白天';
    if (hour >= 16.5 && hour < 19) return '傍晚';
    return '夜晚';
  };

  O.createLighting = function (scene, world) {
    const hemi = new THREE.HemisphereLight(0xe4f0ff, 0x8a7a6a, 1);
    const amb = new THREE.AmbientLight(0xffe8cc, 0.3);
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    scene.add(hemi, amb, sun, sun.target);

    // 室內燈（晚上打開）
    // 董事長室、稽查室、會議室、茶水間與左半開放區、右半開放區、沙發區
    const lamps = [[-8, -5.5], [7.2, -5.5], [-0.9, -5.5], [-7.5, 3.5], [1.0, 3.5], [9.0, 5.5]].map(([x, z]) => {
      const p = new THREE.PointLight(0xffd6a0, 0, 15, 1.5);
      p.position.set(x, 2.9, z);
      scene.add(p);
      return p;
    });

    // 天空（漸層圓頂）
    const skyU = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(450, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: skyU,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.12,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.7)),1.0);\n#include <colorspace_fragment>\n}',
      })
    );
    dome.renderOrder = -10;
    scene.add(dome);

    // 星星
    const starGeo = new THREE.BufferGeometry();
    const pos = [];
    const r = O.Kit.rng(77);
    for (let i = 0; i < 400; i++) {
      const a = r() * PI * 2, e = 0.12 + r() * 1.2;
      pos.push(Math.cos(a) * Math.cos(e) * 400, Math.sin(e) * 400, Math.sin(a) * Math.cos(e) * 400);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    scene.add(new THREE.Points(starGeo, starMat));

    scene.fog = new THREE.Fog(0x9fc8f0, 90, 300);

    const tmpA = new THREE.Color(), tmpB = new THREE.Color();
    function lerpKey(hour) {
      let i = 0;
      while (i < KEYS.length - 2 && hour >= KEYS[i + 1].h) i++;
      const a = KEYS[i], b = KEYS[i + 1];
      const t = Math.min(1, Math.max(0, (hour - a.h) / (b.h - a.h)));
      const n = (k) => a[k] + (b[k] - a[k]) * t;
      const c = (k) => new THREE.Color(a[k]).lerp(tmpB.set(b[k]), t);
      return { sky: c('sky'), hor: c('hor'), sun: c('sun'), sunI: n('sunI'), hemi: n('hemi'), amb: n('amb'), interior: n('interior'), city: n('city') };
    }

    const state = { interior: 0, city: 0, phase: '' };
    function update(hour) {
      const k = lerpKey(hour);
      // 太陽位置：6 點從右邊升起，18 點從左邊（窗戶那側）落下；夜裡是月光
      const day = hour >= 5.5 && hour <= 18.7;
      if (day) {
        const t = Math.min(1, Math.max(0, (hour - 6) / 12));
        const ang = t * PI;
        sun.position.set(Math.cos(ang) * 30, Math.max(5, Math.sin(ang) * 34), -16 + Math.sin(ang) * 6);
      } else {
        sun.position.set(-14, 30, 10);
      }
      sun.color.copy(k.sun);
      sun.intensity = k.sunI * PI;
      hemi.intensity = k.hemi * PI;
      hemi.color.copy(tmpA.copy(k.sky).lerp(tmpB.set(0xffffff), 0.6));
      amb.intensity = (k.amb + 0.22 * k.interior) * PI;
      lamps.forEach((p) => (p.intensity = k.interior * 10));
      skyU.top.value.copy(k.sky);
      skyU.bottom.value.copy(k.hor);
      scene.fog.color.copy(k.hor).lerp(tmpB.copy(k.sky), 0.3);
      starMat.opacity = Math.max(0, k.city - 0.3) * 1.2;
      if (world.city) world.city.mat.emissiveIntensity = k.city * 1.25;
      O.Kit.glowMats.forEach((g) => (g.mat.emissiveIntensity = g.day + (g.night - g.day) * k.interior));
      state.interior = k.interior;
      state.city = k.city;
      state.phase = O.phaseName(hour);
      return state;
    }
    // 畫質：2 = 陰影 2048、1 = 1024、0 = 512（一般筆電跑不動時自動往下降）
    function setQuality(q) {
      const size = q >= 2 ? 2048 : q === 1 ? 1024 : 512;
      if (sun.shadow.mapSize.x === size) return;
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    }
    return { update, state, setQuality };
  };
})();
