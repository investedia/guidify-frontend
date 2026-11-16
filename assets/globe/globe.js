// Monochrome dotted globe with markers where widely used companies were founded.
// The explorer UI (companies-ui.js) owns search, filters and details; this file draws the globe and
// reacts to its events. Picking a marker emits `guidify:pick`; the UI turns that into a selection.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stage = document.getElementById('globe');
const tip = document.getElementById('tip');
const zoomUI = document.getElementById('globe-zoom');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
const FOCUS_OFFSET = { x: -0.85, y: -0.42 }; // radians: right of centre, then above it (desktop only)

function toXYZ(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}
function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
// Round dot texture for the land points.
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(c);
}

if (stage && hasWebGL()) start().catch((err) => console.warn('Globe unavailable; the still image stays.', err));

async function start() {
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowEnd ? 1.5 : 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.copy(toXYZ(30, -40, 3.7));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableDamping = true;
  controls.minDistance = 1.9; controls.maxDistance = 4.8;
  // Phones pinch with OrbitControls; desktop zoom is our own smooth glide (below).
  controls.enableZoom = touch; controls.zoomSpeed = 0.8;
  controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.6;
  if (touch) {
    // One finger scrolls the page; two fingers turn and zoom the globe.
    controls.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE };
    renderer.domElement.style.touchAction = 'pan-y';
  }
  // Smooth zoom: inputs set a target distance and the camera glides there each frame.
  let zoomTarget = null;
  function zoomBy(f) {
    const from = zoomTarget ?? camera.position.length();
    zoomTarget = THREE.MathUtils.clamp(from * f, controls.minDistance, controls.maxDistance);
    if (reduce) { camera.position.setLength(zoomTarget); zoomTarget = null; controls.update(); }
  }
  // Scrolling over the globe zooms it. At the zoom limits the wheel goes back to scrolling the page,
  // so nobody gets stuck inside the hero.
  stage.addEventListener('wheel', (e) => {
    e.stopPropagation();
    if (touch && !e.ctrlKey) return;
    const d = zoomTarget ?? camera.position.length();
    const out = e.deltaY > 0;
    if (!e.ctrlKey && ((out && d >= controls.maxDistance - 0.01) || (!out && d <= controls.minDistance + 0.01))) return;
    e.preventDefault();
    zoomBy(Math.exp(THREE.MathUtils.clamp(e.deltaY, -80, 80) * (e.ctrlKey ? 0.01 : 0.0035)));
    pauseSpin();
  }, { capture: true, passive: false });
  // Double-click (desktop) or double-tap (phone) zooms in one step.
  renderer.domElement.addEventListener('dblclick', (e) => { e.preventDefault(); zoomBy(0.72); pauseSpin(); });
  if (touch) {
    let lastTap = 0;
    renderer.domElement.addEventListener('touchend', (e) => {
      if (e.changedTouches.length !== 1 || e.touches.length) return;
      const now = performance.now();
      if (now - lastTap < 300) { zoomBy(0.72); pauseSpin(); lastTap = 0; } else lastTap = now;
    }, { passive: false });
  }
  // Spin resumes a few seconds after the visitor stops touching the globe.
  let spinTimer = 0;
  function pauseSpin() {
    controls.autoRotate = false; clearTimeout(spinTimer);
    if (!reduce) spinTimer = setTimeout(() => { if (!selected) controls.autoRotate = true; }, 5000);
  }
  if (zoomUI) {
    zoomUI.hidden = false;
    zoomUI.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-zoom]');
      if (b) { zoomBy(b.dataset.zoom === 'in' ? 0.72 : 1 / 0.72); pauseSpin(); }
    });
  }

  // Globe body and a faint rim so the edge reads against black.
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x0b0b0b })));
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false })));

  const [dots, companies] = await Promise.all([
    fetch('assets/globe/land-dots.json').then((r) => r.json()),
    fetch('assets/globe/companies.json').then((r) => r.json()),
  ]);

  const pos = new Float32Array(dots.length * 3);
  dots.forEach(([lat, lon], i) => toXYZ(lat, lon, 1).toArray(pos, i * 3));
  const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
    size: 0.016, map: dotTexture(), color: 0xbcbcbc, transparent: true, alphaTest: 0.4, sizeAttenuation: true,
  })));

  // Badge: dark circle, hairline ring, white logo (or initials when no logo exists).
  async function badge(c) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = '#161616'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6a6a6a'; g.lineWidth = 5; g.stroke();
    let drawn = false;
    if (c.logo) {
      try {
        let svg = await (await fetch(c.logo)).text();
        svg = svg.replace('<svg ', '<svg fill="#ffffff" width="128" height="128" ');
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        await img.decode();
        g.drawImage(img, 64, 64, 128, 128);
        drawn = true;
      } catch (e) { /* fall back to initials */ }
    }
    if (!drawn) {
      g.fillStyle = '#fff'; g.font = '600 88px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(c.name.replace(/\(.*?\)/g, '').replace(/[^A-Za-z]/g, '').slice(0, 2), 128, 134);
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  // Companies in the same city are spread in a small ring so their badges don't overlap.
  const groups = {};
  companies.forEach((c) => (groups[c.lat + ',' + c.lon] ||= []).push(c));
  Object.values(groups).forEach((list) => list.forEach((c, k) => {
    if (list.length < 2) return;
    const a = (2 * Math.PI * k) / list.length, rr = 1.6 + 0.35 * list.length;
    c.plat = c.lat + rr * Math.sin(a); c.plon = c.lon + rr * Math.cos(a) / Math.cos(c.lat * Math.PI / 180);
  }));

  const pinMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pinGeo = new THREE.SphereGeometry(0.006, 8, 8);
  const markers = []; // sprites that are ready
  const byId = new Map();
  for (const c of companies) {
    const p = toXYZ(c.plat ?? c.lat, c.plon ?? c.lon, 1.075);
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.copy(toXYZ(c.lat, c.lon, 1.002)); scene.add(pin);
    const entry = { c, pin, pos: p, sprite: null, filtered: false };
    byId.set(c.id, entry);
    badge(c).then((map) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
      sprite.position.copy(p); sprite.scale.setScalar(0.09); sprite.userData = entry;
      entry.sprite = sprite; scene.add(sprite); markers.push(sprite);
    });
  }

  // ---------- Selection, focus and filtering ----------
  let selected = null, hovered = null, anim = null;
  const qTmp = new THREE.Quaternion(), qId = new THREE.Quaternion();
  function focus(id) {
    const m = byId.get(id);
    if (!m) return;
    selected = id;
    controls.autoRotate = false;
    zoomTarget = null;
    const dist = camera.position.length();
    const end = 2.6;
    const from = camera.position.clone().normalize();
    const to = m.pos.clone().normalize();
    // Desktop: stop with the company to the right of centre, next to its card, not behind the headline.
    if (!matchMedia('(max-width: 900px)').matches) {
      const k = (end - 1) / 2.7; // same spot on screen at a closer zoom needs a smaller angle
      to.applyAxisAngle(new THREE.Vector3(0, 1, 0), FOCUS_OFFSET.x * k * 0.72);
      const side = new THREE.Vector3().crossVectors(to, new THREE.Vector3(0, 1, 0)).normalize();
      if (side.lengthSq() > 0) to.applyAxisAngle(side, FOCUS_OFFSET.y * k * 0.8);
    }
    if (reduce) { camera.position.copy(to.multiplyScalar(end)); controls.update(); return; }
    const arc = from.angleTo(to);
    anim = { from, q: new THREE.Quaternion().setFromUnitVectors(from, to), dist, end, lift: Math.min(1.2, arc * 0.6),
      t0: performance.now(), dur: 1100 + arc * 400 };
  }
  controls.addEventListener('start', () => { anim = null; pauseSpin(); });
  document.addEventListener('guidify:select', (e) => focus(e.detail.id));
  document.addEventListener('guidify:close', () => { selected = null; controls.autoRotate = !reduce; zoomBy(3.4 / camera.position.length()); });
  document.addEventListener('guidify:filter', (e) => {
    const s = e.detail.sector;
    for (const m of byId.values()) {
      m.filtered = s !== 'All' && m.c.sector !== s;
      m.pin.visible = !m.filtered;
    }
  });

  // ---------- Pointer: hover tooltip and tap / click to pick ----------
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tmpP = new THREE.Vector3();
  function pick(x, y) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const vis = markers.filter((m) => m.visible);
    const hit = ray.intersectObjects(vis)[0];
    if (hit || !touch) return hit ? hit.object.userData : null;
    // Fingers are bigger than logos: on touch, take the nearest logo within 24px.
    let best = null, bestD = 24 * 24;
    for (const m of vis) {
      tmpP.copy(m.position).project(camera);
      const dx = (tmpP.x + 1) / 2 * r.width + r.left - x, dy = (1 - tmpP.y) / 2 * r.height + r.top - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = m; }
    }
    return best ? best.userData : null;
  }
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const m = pick(e.clientX, e.clientY);
    hovered = m ? m.c.id : null;
    renderer.domElement.style.cursor = m ? 'pointer' : '';
    if (m) {
      tip.innerHTML = `<strong>${m.c.name}</strong><span>${m.c.city} · ${m.c.founded}</span>`;
      tip.style.left = Math.min(e.clientX + 14, innerWidth - 240) + 'px';
      tip.style.top = e.clientY + 14 + 'px';
      tip.hidden = false;
    } else tip.hidden = true;
  });
  renderer.domElement.addEventListener('pointerleave', () => { tip.hidden = true; hovered = null; });
  // Ignore the click that ends a drag, rotation or pinch.
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('click', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
    const m = pick(e.clientX, e.clientY);
    if (m) { tip.hidden = true; document.dispatchEvent(new CustomEvent('guidify:pick', { detail: { id: m.c.id } })); }
  });

  // ---------- Size, visibility and the render loop ----------
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  const camDir = new THREE.Vector3(), tmp = new THREE.Vector3();
  let onScreen = true, firstFrame = true;
  function frame(now) {
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      qTmp.slerpQuaternions(qId, anim.q, e);
      // pull back while travelling, then dive in on the country
      const d = anim.dist + (anim.end - anim.dist) * e + Math.sin(Math.PI * t) * anim.lift;
      camera.position.copy(anim.from).applyQuaternion(qTmp).multiplyScalar(d);
      if (t >= 1) anim = null;
    }
    if (zoomTarget !== null) {
      const d = camera.position.length();
      const nd = d + (zoomTarget - d) * 0.16;
      if (Math.abs(zoomTarget - nd) < 0.002) { camera.position.setLength(zoomTarget); zoomTarget = null; }
      else camera.position.setLength(nd);
    }
    controls.update();
    camDir.copy(camera.position).normalize();
    const zs = Math.min(1, 0.45 + (camera.position.length() - 1) * 0.2);
    for (const m of markers) {
      const entry = m.userData;
      const d = tmp.copy(m.position).normalize().dot(camDir);
      m.visible = !entry.filtered && d > 0.12;
      const base = entry.c.id === selected ? 0.13 : entry.c.id === hovered ? 0.11 : 0.09;
      m.scale.setScalar(Math.max(0, base * zs * Math.min(1, (d - 0.12) * 4 + 0.4)));
    }
    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; stage.classList.add('is-ready'); }
  }
  const run = () => renderer.setAnimationLoop(onScreen && !document.hidden ? frame : null);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; run(); }).observe(stage);
  document.addEventListener('visibilitychange', run);
  run();
}
