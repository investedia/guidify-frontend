import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('hub');
const tags = [...stage.querySelectorAll('.tags span')];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { /* CSS fallback stays */ }
if (renderer) init();

function loadTex(src, size = 512) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      c.getContext('2d').drawImage(img, 0, 0, size, size);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t);
    };
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 2.2, 11);

  // lights: soft key from above-front, cool rim from behind
  scene.add(new THREE.HemisphereLight(0xffffff, 0x080808, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2, 7, 6); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 8;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(0, 3, -6); scene.add(rim);

  // floor that only catches shadow + a faint sheen
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.35; floor.receiveShadow = true; scene.add(floor);

  const [gT, iT, dT] = await Promise.all([
    loadTex('assets/guidify-g.png'), loadTex('assets/investedia-mark.svg'), loadTex('assets/droplates-mark.svg')]);

  const body = (tone) => new THREE.MeshPhysicalMaterial({
    color: tone, metalness: 0.2, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.18 });

  function tile({ size, depth, x, tex, logoScale, url, tone, fullBleed }) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new RoundedBoxGeometry(size, size, depth, 6, size * 0.2), body(tone));
    box.castShadow = true; g.add(box);
    if (tex) {
      const s = size * logoScale;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({
        map: tex, transparent: true, roughness: 0.45, metalness: 0,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: fullBleed ? 0.04 : 0.12 }));
      face.position.z = depth / 2 + 0.002; g.add(face);
      if (fullBleed) { // round the corners of the Investedia art with an alpha mask
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const x2 = c.getContext('2d'); x2.fillStyle = '#fff';
        x2.beginPath(); x2.roundRect(0, 0, 256, 256, 52); x2.fill();
        face.material.alphaMap = new THREE.CanvasTexture(c);
      }
    }
    g.position.x = x; g.userData = { url, baseY: 0, hover: 0, half: size / 2 };
    scene.add(g); return g;
  }

  const tiles = [
    tile({ size: 1.55, depth: 0.42, x: -3.3, tex: iT, logoScale: 0.9, url: 'https://investedia.com', tone: 0x050505, fullBleed: true }),
    tile({ size: 2.2, depth: 0.55, x: 0, tex: gT, logoScale: 0.6, url: null, tone: 0x1a1a1a }),
    tile({ size: 1.55, depth: 0.42, x: 3.3, tex: dT, logoScale: 0.82, url: 'https://droplates.com', tone: 0x141414 }),
  ];
  tiles[1].userData.baseY = 0.25;

  // light conduits between tiles with travelling pulses
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
  const pulses = [];
  for (const side of [-1, 1]) {
    const pts = [new THREE.Vector3(side * 1.15, 0.05, 0), new THREE.Vector3(side * 2.5, 0.05, 0)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    p.userData = { a: pts[0], b: pts[1], off: side > 0 ? 0 : 0.5 }; scene.add(p); pulses.push(p);
  }

  // sizing: pull camera back on narrow screens so all three tiles fit
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const need = 10.2; // world width to fit
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const dist = Math.max(11, need / 2 / (Math.tan(vFov / 2) * camera.aspect));
    camBase.set(0, dist * 0.2, dist); camera.position.copy(camBase); window.__hub={dist,w,h};
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  // interaction
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  let mx = 0, my = 0, hovered = null;
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    mx = ndc.x; my = ndc.y;
  });
  stage.addEventListener('pointerleave', () => { ndc.set(-9, -9); mx = my = 0; });
  stage.addEventListener('click', () => { if (hovered?.userData.url) open(hovered.userData.url, '_blank', 'noopener'); });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const clock = new THREE.Clock(); const v = new THREE.Vector3(); const look = new THREE.Vector3(0, 0, 0);
  let first = true;
  renderer.setAnimationLoop(() => {
    if (!visible || document.hidden) return;
    const t = reduce ? 0 : clock.getElapsedTime();

    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(tiles, true)[0];
    let h = hit?.object; while (h && !tiles.includes(h)) h = h.parent;
    hovered = h || null;
    stage.classList.toggle('hov', !!hovered?.userData.url);

    tiles.forEach((g, i) => {
      const u = g.userData;
      u.hover += ((g === hovered && u.url ? 1 : 0) - u.hover) * 0.12;
      g.position.y = u.baseY + Math.sin(t * 0.9 + i * 1.7) * 0.06 + u.hover * 0.22;
      g.rotation.y = (i - 1) * -0.22 + Math.sin(t * 0.5 + i) * 0.04 + mx * 0.18;
      g.rotation.x = -0.08 - my * 0.08;
    });
    pulses.forEach(p => {
      const k = ((t * 0.45 + p.userData.off) % 1);
      p.position.lerpVectors(p.userData.a, p.userData.b, p.position.x < 0 ? k : k);
      p.material.opacity = 1; p.scale.setScalar(Math.sin(k * Math.PI));
    });

    camera.position.lerp(v.set(camBase.x + mx * 0.6, camBase.y + my * 0.3, camBase.z), 0.06);
    camera.lookAt(look);
    renderer.render(scene, camera);

    // HTML labels under each tile
    const r = stage.getBoundingClientRect();
    tiles.forEach((g, i) => {
      const s = g.userData.half;
      v.set(g.position.x, g.position.y - s - 0.22, 0).project(camera);
      tags[i].style.transform = `translate(calc(${(v.x + 1) / 2 * r.width}px - 50%), ${(1 - v.y) / 2 * r.height}px)`;
    });
    if (first) { first = false; stage.classList.add('is-3d'); }
  });
}
