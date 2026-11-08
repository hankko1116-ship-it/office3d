/* 共用小工具：方塊 / 圓柱、材質快取、文字貼圖、合併靜態網格（減少 draw call）。 */
(function () {
  'use strict';
  const O = (window.Office = window.Office || {});
  const Kit = (O.Kit = {});

  let unitBox = null;
  let mergeGeometries = null;
  const geoCache = new Map();
  const matCache = new Map();
  Kit.glowMats = []; // 會隨日夜變亮暗的發光材質：{ mat, day, night }
  Kit.DEG = Math.PI / 180;

  Kit.init = function (mergeFn) {
    unitBox = new THREE.BoxGeometry(1, 1, 1);
    mergeGeometries = mergeFn;
  };

  /* 材質。o: emissive, emissiveIntensity, rough, metal, opacity, map, unique, glow:{day,night} */
  Kit.mat = function (color, o) {
    o = o || {};
    const key = [color, o.emissive || '', o.emissiveIntensity || 0, o.rough, o.metal, o.opacity, o.side || ''].join('|');
    if (!o.unique && !o.map && !o.glow && matCache.has(key)) return matCache.get(key);
    // 金屬、亮面才用較貴的 Standard 材質，其餘用 Lambert（比較省效能）
    const shiny = (o.metal != null && o.metal > 0) || (o.rough != null && o.rough < 0.5);
    const m = shiny
      ? new THREE.MeshStandardMaterial({ color: color, roughness: o.rough != null ? o.rough : 0.78, metalness: o.metal || 0 })
      : new THREE.MeshLambertMaterial({ color: color });
    if (o.map) m.map = o.map;
    if (o.emissive) {
      m.emissive = new THREE.Color(o.emissive);
      m.emissiveIntensity = o.emissiveIntensity != null ? o.emissiveIntensity : 1;
      if (o.emissiveMap) m.emissiveMap = o.emissiveMap;
    }
    if (o.opacity != null && o.opacity < 1) {
      m.transparent = true;
      m.opacity = o.opacity;
      m.depthWrite = false;
    }
    if (o.side === 'double') m.side = THREE.DoubleSide;
    if (o.glow) Kit.glowMats.push({ mat: m, day: o.glow.day, night: o.glow.night });
    if (!o.unique && !o.map && !o.glow) matCache.set(key, m);
    return m;
  };

  function finish(mesh, parent, x, y, z, o) {
    mesh.position.set(x || 0, y || 0, z || 0);
    if (o.rx) mesh.rotation.x = o.rx;
    if (o.ry) mesh.rotation.y = o.ry;
    if (o.rz) mesh.rotation.z = o.rz;
    mesh.castShadow = o.cast != null ? o.cast : true;
    mesh.receiveShadow = o.receive != null ? o.receive : true;
    if (o.noMerge) mesh.userData.noMerge = true;
    if (parent) parent.add(mesh);
    return mesh;
  }
  function matOf(color, o) {
    return color && color.isMaterial ? color : Kit.mat(color, o);
  }

  /* 方塊：寬、高、深、顏色（或材質）、位置 */
  Kit.box = function (parent, w, h, d, color, x, y, z, o) {
    o = o || {};
    const mesh = new THREE.Mesh(unitBox, matOf(color, o));
    mesh.scale.set(w, h, d);
    return finish(mesh, parent, x, y, z, o);
  };

  function cachedGeo(key, make) {
    if (!geoCache.has(key)) geoCache.set(key, make());
    return geoCache.get(key);
  }

  Kit.cyl = function (parent, rTop, rBot, h, color, x, y, z, o) {
    o = o || {};
    const seg = o.seg || 18;
    const geo = cachedGeo('c' + rTop + '_' + rBot + '_' + h + '_' + seg, () => new THREE.CylinderGeometry(rTop, rBot, h, seg));
    return finish(new THREE.Mesh(geo, matOf(color, o)), parent, x, y, z, o);
  };
  Kit.sphere = function (parent, r, color, x, y, z, o) {
    o = o || {};
    const geo = cachedGeo('s' + r, () => new THREE.SphereGeometry(r, 20, 14));
    return finish(new THREE.Mesh(geo, matOf(color, o)), parent, x, y, z, o);
  };
  Kit.torus = function (parent, r, tube, color, x, y, z, o) {
    o = o || {};
    const arc = o.arc || Math.PI * 2;
    const geo = cachedGeo('t' + r + '_' + tube + '_' + arc, () => new THREE.TorusGeometry(r, tube, 8, 24, arc));
    return finish(new THREE.Mesh(geo, matOf(color, o)), parent, x, y, z, o);
  };

  Kit.group = function (parent, x, y, z, ry) {
    const g = new THREE.Group();
    g.position.set(x || 0, y || 0, z || 0);
    if (ry) g.rotation.y = ry;
    if (parent) parent.add(g);
    return g;
  };

  /* 畫布貼圖 */
  Kit.canvasTexture = function (w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  Kit.FONT = '"PingFang TC","Microsoft JhengHei","Noto Sans TC","Heiti TC",sans-serif';
  /* 文字貼圖（用在桌上小物，不用在人身上） */
  Kit.textTexture = function (lines, opt) {
    opt = opt || {};
    const w = opt.w || 256, h = opt.h || 256;
    return Kit.canvasTexture(w, h, (g) => {
      g.fillStyle = opt.bg || '#ffffff';
      g.fillRect(0, 0, w, h);
      if (opt.header) {
        g.fillStyle = opt.header;
        g.fillRect(0, 0, w, h * 0.26);
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const list = Array.isArray(lines) ? lines : [lines];
      list.forEach((ln) => {
        g.fillStyle = ln.color || opt.fg || '#222';
        g.font = 'bold ' + (ln.size || 64) + 'px ' + Kit.FONT;
        g.fillText(ln.text, w / 2, ln.y * h);
      });
    });
  };

  /* ---- 合併：同材質的靜態方塊合成一個網格，大幅減少 draw call ---- */
  function bucketize(meshes, inv) {
    const buckets = new Map();
    const tmp = new THREE.Matrix4();
    meshes.forEach((mesh) => {
      const key = mesh.material.uuid + '|' + mesh.castShadow + '|' + mesh.receiveShadow;
      let b = buckets.get(key);
      if (!b) {
        b = { mat: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow, geos: [] };
        buckets.set(key, b);
      }
      const g = mesh.geometry.clone();
      tmp.multiplyMatrices(inv, mesh.matrixWorld);
      g.applyMatrix4(tmp);
      Object.keys(g.attributes).forEach((n) => {
        if (n !== 'position' && n !== 'normal' && n !== 'uv') g.deleteAttribute(n);
      });
      g.clearGroups();
      b.geos.push(g);
    });
    const out = [];
    buckets.forEach((b) => {
      const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
      if (!merged) return;
      const m = new THREE.Mesh(merged, b.mat);
      m.castShadow = b.cast;
      m.receiveShadow = b.receive;
      out.push(m);
    });
    return out;
  }

  /* 只合併 group 的直接子網格（角色身體部位用） */
  Kit.mergeChildren = function (group) {
    if (!mergeGeometries) return;
    group.updateMatrixWorld(true);
    const meshes = group.children.filter((c) => c.isMesh && !c.userData.noMerge);
    if (meshes.length < 2) return;
    const inv = group.matrixWorld.clone().invert();
    const merged = bucketize(meshes, inv);
    meshes.forEach((m) => group.remove(m));
    merged.forEach((m) => group.add(m));
  };

  /* 合併整棵樹裡所有靜態網格（場景家具用） */
  Kit.mergeDeep = function (root) {
    if (!mergeGeometries) return;
    root.updateMatrixWorld(true);
    const meshes = [];
    root.traverse((o) => {
      // 半透明（玻璃）不合併：每片各自一個網格，瀏覽器才能逐片排序、遠處的也能被剔除
      if (o.isMesh && !o.isInstancedMesh && !o.userData.noMerge && !o.material.transparent) meshes.push(o);
    });
    const inv = root.matrixWorld.clone().invert();
    const merged = bucketize(meshes, inv);
    meshes.forEach((m) => m.parent && m.parent.remove(m));
    // 清掉空的 group
    const empties = [];
    root.traverse((o) => {
      if (o !== root && o.isGroup && o.children.length === 0) empties.push(o);
    });
    empties.forEach((g) => g.parent && g.parent.remove(g));
    merged.forEach((m) => root.add(m));
  };

  /* 簡單、可重現的亂數 */
  Kit.rng = function (seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
})();
