// Мікродрон (вуп) на головній: висить у небі, а під час прокручування розбирається на деталі.
// Модель зібрана з простих фігур прямо тут, без зовнішніх файлів.
import * as THREE from './three.module.min.js';

const C = { sun: 0xffd21f, navy: 0x0a1b44, white: 0xf7fbff, pcb: 0x1c56d6, gold: 0xe9b949, steel: 0xb8c4dc, dark: 0x0b1024, rose: 0xff4f8b, ghost: 0xcfe4ff };

function mat(color, o) {
  return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: .5, metalness: .05 }, o || {}));
}

function buildDrone() {
  const root = new THREE.Group();
  const parts = {};
  const mk = (name) => { const g = new THREE.Group(); g.userData.mats = []; parts[name] = g; root.add(g); return g; };
  const add = (g, geo, m, x, y, z) => {
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x || 0, y || 0, z || 0); g.add(mesh);
    if (g.userData.mats && g.userData.mats.indexOf(m) < 0) g.userData.mats.push(m);
    return mesh;
  };
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  const R = .84;

  // рама із захистом пропелерів
  const frame = mk('frame');
  const mFrame = mat(C.sun, { roughness: .42, side: THREE.DoubleSide });
  const duct = new THREE.CylinderGeometry(R, R, .34, 56, 1, true);
  const rim = new THREE.TorusGeometry(R, .034, 10, 56);
  const spoke = new THREE.BoxGeometry(R, .045, .07);
  corners.forEach(([sx, sz]) => {
    add(frame, duct, mFrame, sx, 0, sz);
    add(frame, rim, mFrame, sx, .17, sz).rotation.x = Math.PI / 2;
    add(frame, rim, mFrame, sx, -.17, sz).rotation.x = Math.PI / 2;
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3 + (sx * sz > 0 ? .5 : 1.2);
      const s = add(frame, spoke, mFrame, sx + Math.cos(a) * R / 2, -.13, sz + Math.sin(a) * R / 2);
      s.rotation.y = -a;
    }
    add(frame, new THREE.CylinderGeometry(.23, .23, .05, 24), mFrame, sx, -.13, sz);
    const arm = add(frame, new THREE.BoxGeometry(1.5, .06, .2), mFrame, sx / 2, -.13, sz / 2);
    arm.rotation.y = -Math.atan2(sz, sx);
  });
  add(frame, new THREE.BoxGeometry(.9, .06, .9), mFrame, 0, -.13, 0).rotation.y = Math.PI / 4;

  // мотори
  const motors = mk('motors');
  const mMotor = mat(C.navy, { roughness: .35, metalness: .4 });
  const mBell = mat(C.steel, { roughness: .25, metalness: .8 });
  corners.forEach(([sx, sz]) => {
    add(motors, new THREE.CylinderGeometry(.19, .19, .2, 24), mMotor, sx, 0, sz);
    add(motors, new THREE.CylinderGeometry(.16, .19, .07, 24), mBell, sx, .13, sz);
    add(motors, new THREE.CylinderGeometry(.03, .03, .16, 10), mBell, sx, .2, sz);
  });

  // пропелери
  const props = mk('props');
  const mProp = mat(C.navy, { roughness: .3 });
  const spin = [];
  const blade = new THREE.BoxGeometry(.6, .016, .17);
  corners.forEach(([sx, sz], i) => {
    const p = new THREE.Group(); p.position.set(sx, .27, sz);
    for (let k = 0; k < 3; k++) {
      const holder = new THREE.Group(); holder.rotation.y = k * Math.PI * 2 / 3;
      const b = new THREE.Mesh(blade, mProp); b.position.x = .37; b.rotation.x = .28 * (i % 2 ? 1 : -1);
      holder.add(b); p.add(holder);
    }
    p.add(new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .07, 14), mProp));
    p.userData.dir = i % 2 ? 1 : -1;
    props.userData.mats = [mProp];
    props.add(p); spin.push(p);
  });

  // політний контролер
  const board = mk('board');
  const mPcb = mat(C.pcb, { roughness: .6 });
  const mChip = mat(C.dark, { roughness: .4 });
  const mGold = mat(C.gold, { roughness: .3, metalness: .7 });
  add(board, new THREE.BoxGeometry(.9, .05, .9), mPcb, 0, 0, 0);
  add(board, new THREE.BoxGeometry(.3, .06, .3), mChip, -.05, .05, .05);
  add(board, new THREE.BoxGeometry(.16, .05, .2), mChip, .26, .05, -.2);
  add(board, new THREE.BoxGeometry(.2, .08, .14), mBell, 0, .06, -.38);
  [[.36, .36], [-.36, .36], [-.36, -.36], [.36, -.36]].forEach(([x, z]) => add(board, new THREE.CylinderGeometry(.055, .055, .06, 12), mGold, x, 0, z));
  [-.3, -.18, -.06].forEach((x) => add(board, new THREE.BoxGeometry(.07, .06, .1), mGold, x, .02, .38));

  // кабіна з FPV-камерою та антеною
  const canopy = mk('canopy');
  const mShell = mat(C.white, { roughness: .3 });
  const mLens = mat(C.dark, { roughness: .08, metalness: .6 });
  const shell = add(canopy, new THREE.SphereGeometry(.5, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), mShell, 0, 0, 0);
  shell.scale.set(1, .82, 1.18);
  const stripe = add(canopy, new THREE.TorusGeometry(.5, .028, 8, 40), mat(C.rose, { roughness: .4 }), 0, .02, 0);
  stripe.rotation.x = Math.PI / 2; stripe.scale.set(1, 1.18, 1);
  const cam = new THREE.Group(); cam.position.set(0, .2, .5); cam.rotation.x = -.42;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .22, 24), mLens); body.rotation.x = Math.PI / 2; cam.add(body);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.12, 20, 14), mat(0x234a9c, { roughness: .05, metalness: .9 })); glass.position.z = .11; glass.scale.z = .5; cam.add(glass);
  canopy.add(cam); canopy.userData.mats.push(mLens);
  const ant = add(canopy, new THREE.CylinderGeometry(.013, .013, .8, 6), mLens, 0, .52, -.5); ant.rotation.x = -.5;
  add(canopy, new THREE.SphereGeometry(.04, 10, 8), mLens, 0, .87, -.69);

  // акумулятор
  const battery = mk('battery');
  const mCell = mat(0x15307a, { roughness: .45 });
  const mWrap = mat(C.sun, { roughness: .5 });
  add(battery, new THREE.BoxGeometry(.46, .3, 1.3), mCell, 0, 0, 0);
  add(battery, new THREE.BoxGeometry(.47, .31, .46), mWrap, 0, 0, .12);
  add(battery, new THREE.BoxGeometry(.2, .12, .12), mChip, 0, .02, -.7);

  // базові положення та розліт деталей
  const lay = {
    frame:   { y: 0,    ex: 0 },
    motors:  { y: -.02, ex: .7 },
    props:   { y: 0,    ex: 1.5 },
    board:   { y: .1,   ex: 2.25 },
    canopy:  { y: .14,  ex: 3.05 },
    battery: { y: -.36, ex: -1.25 }
  };
  Object.keys(parts).forEach((k) => {
    const g = parts[k];
    g.userData.base = g.userData.mats.map((m) => m.color.clone());
    g.userData.ghost = 0;
  });
  return { root, parts, lay, spin };
}

const clamp = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a || 1)); return t * t * (3 - 2 * t); };

export function mount(stage, story, calm) {
  const canvas = stage.querySelector('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { stage.hidden = true; return null; }
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  camera.position.set(0, 0, 15);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fb8f2, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4d6, 2.4); sun.position.set(4, 8, 6); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfd9ff, .8); fill.position.set(-6, -2, 4); scene.add(fill);

  const drone = buildDrone();
  const pivot = new THREE.Group(); pivot.add(drone.root); scene.add(pivot);
  const ghost = new THREE.Color(C.ghost);

  const steps = [].slice.call(story.querySelectorAll('.step'));
  const partSteps = steps.filter((s) => s.dataset.part);
  const groupsFor = { props: ['props', 'motors'], canopy: ['canopy'], board: ['board'], frame: ['frame'], battery: ['battery'] };
  let W = 1, H = 1, visW = 1, visH = 1, wide = false, marks = null;

  function measure() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    visH = 2 * Math.tan(camera.fov * Math.PI / 360) * camera.position.z; visW = visH * camera.aspect;
    wide = W >= 900;
    const top = (el) => el.getBoundingClientRect().top + window.scrollY;
    const mid = (el) => top(el) + el.offsetHeight / 2;
    marks = {
      a0: mid(steps[0]) - H * .15, a1: mid(partSteps[0]) - H * .2,
      b0: mid(partSteps[partSteps.length - 1]) + H * .3, b1: mid(steps[steps.length - 1]) - H * .1,
      end: top(story) + story.offsetHeight,
      mids: partSteps.map(mid)
    };
  }

  let e = 0, yaw = .6, seen = true, raf = 0, last = 0, clock = 0, slow = 0, frames = 0, tier = 0, idle = 0;
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now; clock += dt;
    // слабкий телефон: якщо кадри йдуть повільно, спершу зменшуємо чіткість, потім зупиняємо постійний рух
    if (dt && !document.hidden) {
      slow = slow * .92 + (dt > .03 ? .08 : 0); frames++;
      if (frames > 50 && slow > .5 && tier < 2) {
        tier++; frames = 0; slow = 0;
        if (tier === 1) { renderer.setPixelRatio(1); renderer.setSize(W, H, false); }
      }
    }
    const y = window.scrollY + H / 2;
    const target = smooth(marks.a0, marks.a1, y) * (1 - smooth(marks.b0, marks.b1, y));
    e += (target - e) * (calm ? 1 : Math.min(1, dt * 7));

    // яка деталь зараз «у фокусі»
    let active = null;
    if (target > .6) {
      let best = 1e9;
      marks.mids.forEach((m, i) => { const d = Math.abs(m - y); if (d < best) { best = d; active = partSteps[i].dataset.part; } });
      if (best > H * .55) active = null;
    }
    const lit = active ? groupsFor[active] : null;

    Object.keys(drone.parts).forEach((k) => {
      const g = drone.parts[k], L = drone.lay[k];
      g.position.y = L.y + L.ex * e;
      const want = lit && lit.indexOf(k) < 0 ? 1 : 0;
      const prev = g.userData.ghost;
      g.userData.ghost += (want - prev) * (calm ? 1 : Math.min(1, dt * 6));
      if (Math.abs(g.userData.ghost - prev) > .0005) {
        g.userData.mats.forEach((m, i) => m.color.copy(g.userData.base[i]).lerp(ghost, g.userData.ghost * .78));
      }
      const s = lit && lit.indexOf(k) >= 0 ? 1.06 : 1;
      g.scale.x += (s - g.scale.x) * Math.min(1, dt * 6); g.scale.z = g.scale.x;
    });

    const speed = calm ? 0 : 26 * (1 - e) + 1.6;
    drone.spin.forEach((p) => { p.rotation.y += p.userData.dir * speed * dt; });

    // положення в кадрі: на широкому екрані праворуч, на телефоні вгорі
    const base = wide ? Math.min(1.12, visW * .23) : Math.min(.74, visW * .2);
    const leave = smooth(marks.end - H * .5, marks.end + H * .3, y);
    const bob = calm ? 0 : Math.sin(clock * 1.7) * .07 * (1 - e);
    const scale = base * (1 - e * .26) * (1 - leave * .3);
    pivot.scale.setScalar(scale);
    pivot.position.x = (wide ? visW * .24 : 0) + leave * visW * .35;
    pivot.position.y = (wide ? .1 : visH * .2) - e * 1.25 * scale - (wide ? e * .25 : 0) + bob + leave * visH * .5;
    yaw = .62 + window.scrollY * .0011 + (calm ? 0 : Math.sin(clock * .5) * .08);
    pivot.rotation.set(.62 - e * .34, yaw, calm ? 0 : Math.sin(clock * 1.1) * .035 * (1 - e));

    renderer.render(scene, camera);
    // на найнижчому рівні малюємо лише під час прокручування (ще ~пів секунди після нього)
    idle = Math.abs(target - e) > .002 ? 0 : idle + dt;
    if (seen && !calm && !document.hidden && (tier < 2 || idle < .5)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { idle = 0; if (!raf && seen) { last = 0; raf = requestAnimationFrame(frame); } };

  measure();
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { measure(); kick(); }, 120); });
  window.addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', kick);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { seen = en[0].isIntersecting; kick(); }).observe(stage);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); kick(); });
  kick();
  stage.classList.add('ready');
  return { measure: () => { measure(); kick(); } };
}
