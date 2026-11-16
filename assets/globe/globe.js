// Monochrome dotted globe with markers where widely used companies, apps and sites were founded.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
const stage = document.getElementById('globe');
const tip = document.getElementById('tip');
document.body.appendChild(tip); // keep the card outside the moving globe so it sits under the cursor

function toXYZ(lat, lon, r) {
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

// Round dot texture for the land points.
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(c);
}

// Badge: dark circle, hairline ring, white logo (or initials when no logo exists).
async function badge(company) {
  const size = 256, c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#121212'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#5a5a5a'; g.lineWidth = 5; g.stroke();
  if (company.logo) {
    try {
      let svg = await (await fetch(company.logo)).text();
      svg = svg.replace('<svg ', '<svg fill="#ffffff" width="128" height="128" ');
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode();
      g.drawImage(img, 64, 64, 128, 128);
    } catch (e) { company.logo = ''; }
  }
  if (!company.logo) {
    g.fillStyle = '#fff'; g.font = '600 88px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(company.name.replace(/[^A-Za-z]/g, '').slice(0, 2), 128, 134);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.copy(toXYZ(30, -40, 3.7));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true; controls.minDistance = 2.7; controls.maxDistance = 4.6; controls.zoomSpeed = 0.6; controls.enablePan = false; controls.enableDamping = true;
controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.35;
if (touch) {
  // One finger scrolls the page; two fingers turn and zoom the globe.
  controls.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_ROTATE };
  renderer.domElement.style.touchAction = 'pan-y';
}

// Zoom: trackpad pinch or Ctrl + scroll zooms; a plain mouse wheel keeps scrolling the page.
stage.addEventListener('wheel', (e) => { if (!e.ctrlKey) e.stopPropagation(); }, { capture: true });
// + / − buttons for visitors without a trackpad.
function zoomBy(f) {
  const d = THREE.MathUtils.clamp(camera.position.length() * f, controls.minDistance, controls.maxDistance);
  camera.position.setLength(d); controls.update();
}
const zoomUI = document.createElement('div');
zoomUI.className = 'globe-zoom';
zoomUI.innerHTML = '<button type="button" aria-label="Zoom in">+</button><button type="button" aria-label="Zoom out">−</button>';
zoomUI.children[0].addEventListener('click', () => zoomBy(0.9));
zoomUI.children[1].addEventListener('click', () => zoomBy(1 / 0.9));
stage.appendChild(zoomUI);

// Globe body and a faint rim so the edge reads against black.
scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x0b0b0b })));
scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 48),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.045, side: THREE.BackSide, depthWrite: false })));

const [dots, companies] = await Promise.all([
  fetch('assets/globe/land-dots.json').then(r => r.json()),
  fetch('assets/globe/companies.json').then(r => r.json()),
]);

const pos = new Float32Array(dots.length * 3);
dots.forEach(([lat, lon], i) => toXYZ(lat, lon, 1).toArray(pos, i * 3));
const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
scene.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({
  size: 0.016, map: dotTexture(), color: 0xa8a8a8, transparent: true, alphaTest: 0.4, sizeAttenuation: true,
})));

// Companies in the same city are spread in a small ring so their badges don't overlap.
const groups = {};
companies.forEach(c => (groups[c.lat + ',' + c.lon] ||= []).push(c));
Object.values(groups).forEach(list => list.forEach((c, k) => {
  if (list.length < 2) return;
  const a = (2 * Math.PI * k) / list.length, rr = 1.6 + 0.35 * list.length;
  c.plat = c.lat + rr * Math.sin(a); c.plon = c.lon + rr * Math.cos(a) / Math.cos(c.lat * Math.PI / 180);
}));

const markers = [];
const pinMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
// Pins appear at once; logos load in parallel and pop in as each arrives, so the globe never waits.
const pinGeo = new THREE.SphereGeometry(0.006, 8, 8);
for (const c of companies) {
  const lat = c.plat ?? c.lat, lon = c.plon ?? c.lon;
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.copy(toXYZ(c.lat, c.lon, 1.002)); scene.add(pin);
  badge(c).then((map) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    sprite.position.copy(toXYZ(lat, lon, 1.075)); sprite.scale.setScalar(0.09); sprite.userData = c;
    scene.add(sprite); markers.push(sprite);
  });
}

// Hover a badge to see the company, city and founding year.
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let hovered = null;
renderer.domElement.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(markers.filter(m => m.visible))[0];
  hovered = hit ? hit.object : null;
  if (hovered) {
    const c = hovered.userData;
    tip.innerHTML = `<strong>${c.name}</strong><span>${c.city} · Founded ${c.year}</span>${c.story ? `<p>${c.story}</p>` : ''}`;
    const x = Math.min(e.clientX + 16, innerWidth - 300); tip.style.left = x + 'px'; tip.style.top = e.clientY + 16 + 'px';
    tip.hidden = false; controls.autoRotate = false;
  } else { tip.hidden = true; controls.autoRotate = !reduce; }
});
function pick(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(markers.filter(m => m.visible))[0];
  return hit ? hit.object : null;
}
function showCard(c, x, y) {
  tip.innerHTML = `<strong>${c.name}</strong><span>${c.city} · Founded ${c.year}</span>${c.story ? `<p>${c.story}</p>` : ''}`;
  const w = Math.min(280, innerWidth - 32);
  tip.style.width = w + 'px';
  tip.style.left = Math.max(16, Math.min(x + 16, innerWidth - w - 16)) + 'px';
  tip.style.top = y + 16 + 'px';
  tip.hidden = false;
}
// Phones: tap a logo to open its card, tap anywhere else to close it.
if (touch) {
  renderer.domElement.addEventListener('click', e => {
    const m = pick(e.clientX, e.clientY);
    hovered = m;
    if (m) { showCard(m.userData, e.clientX, e.clientY); controls.autoRotate = false; }
    else { tip.hidden = true; controls.autoRotate = !reduce; }
  });
  addEventListener('scroll', () => { if (!tip.hidden) { tip.hidden = true; hovered = null; controls.autoRotate = !reduce; } }, { passive: true });
}
renderer.domElement.addEventListener('pointerleave', () => { tip.hidden = true; controls.autoRotate = !reduce; });

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();

const camDir = new THREE.Vector3(), tmp = new THREE.Vector3();
let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);
renderer.setAnimationLoop(() => {
  if (!visible) return;
  controls.update();
  const sp = Math.min(1, scrollY / innerHeight);
  scene.rotation.y = reduce ? 0 : sp * 1.8;
  stage.style.setProperty('--sp', sp.toFixed(3));
  camDir.copy(camera.position).normalize();
  for (const m of markers) {
    const d = m.getWorldPosition(tmp).normalize().dot(camDir);
    m.visible = d > 0.12;                       // only badges on the visible face
    const s = (m === hovered ? 0.12 : 0.09) * Math.min(1, (d - 0.12) * 4 + 0.4);
    m.scale.setScalar(Math.max(0, s));
  }
  renderer.render(scene, camera);
});
