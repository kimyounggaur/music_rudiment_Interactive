import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { P_MIN, P_MAX, STAFF_LO, STAFF_HI, clampP, posInfo, explanationFor, nameHint, SOLFA_COLORS } from './music.js';
import { playTone, setSoundEnabled } from './audio.js';
import { TREBLE_CLEF } from './clef.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const mount = $('canvas-mount');
const toastNode = $('toast');
const liveNode = $('live');
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TARGETS = [16, 3, 12];
const state = { p: 9, sound: true, practice: -1, solved: 0, completed: false, happy: false };
let toastTimer = 0;
let renderer = null;
let camera = null;
let controls = null;
let noteGroup = null;
let noteHead = null;
let noteStem = null;
let noteHalo = null;
let ledgerLines = [];
let sceneAPI = null;

function showToast(message, duration = 2400) {
  clearTimeout(toastTimer);
  toastNode.textContent = message;
  toastNode.classList.add('show');
  toastTimer = window.setTimeout(() => toastNode.classList.remove('show'), duration);
}

function syncSceneNote() {
  const info = posInfo(state.p);
  if (renderer) renderer.shadowMap.needsUpdate = true;
  if (noteHead) {
    const color = info.zone === 'staff' ? 0x6477ad : 0xd84c83;
    noteHead.material.color.setHex(color);
    noteHalo.material.color.setHex(color);
    noteStem.material.color.setHex(color);
    noteStem.position.x = info.stemUp ? 0.47 : -0.47;
    noteStem.position.y = info.stemUp ? 1.03 : -1.03;
  }
  ledgerLines.forEach((line) => {
    const active = info.ledgers.includes(line.userData.p);
    line.visible = active;
  });
  document.querySelectorAll('.pitch-label').forEach((node) => {
    node.classList.toggle('active', Number(node.dataset.p) === state.p);
  });
}

function updateUI(announce = false) {
  const info = posInfo(state.p);
  $('note-name').textContent = info.name;
  $('note-name').classList.toggle('out', info.zone !== 'staff');
  $('chips').innerHTML = `<span class="chip ${info.zone === 'staff' ? '' : 'out'}">${info.zone === 'staff' ? '오선 안' : info.zone === 'up' ? '오선 위쪽' : '오선 아래쪽'}</span><span class="chip ${info.zone === 'staff' ? '' : 'out'}">${info.kind}</span>`;
  $('solfa').textContent = info.solf;
  $('letter').textContent = info.letter;
  $('solfa-badge').style.setProperty('--badge', SOLFA_COLORS[info.solf]);
  $('explanation').textContent = explanationFor(state.p);
  $('note-up').disabled = state.p === P_MAX;
  $('note-down').disabled = state.p === P_MIN;
  stage.setAttribute('aria-valuenow', String(state.p));
  stage.setAttribute('aria-valuetext', `${info.name}, ${info.solf}, ${info.letter}`);
  if (announce) liveNode.textContent = `${info.name}, ${info.solf}, ${info.letter}`;
  syncSceneNote();
}

function setPosition(value, { sound = true, announce = true } = {}) {
  const next = clampP(value);
  const changed = next !== state.p;
  state.p = next;
  state.happy = false;
  updateUI(announce && changed);
  if (changed && sound) playTone(posInfo(next).midi);
  return changed;
}

function updatePractice() {
  const copy = $('practice-copy');
  const button = $('practice-button');
  $('practice-count').textContent = `${state.solved} / 3`;
  document.querySelectorAll('#practice-progress i').forEach((node, index) => node.classList.toggle('done', index < state.solved));
  if (state.practice >= 0) {
    const target = posInfo(TARGETS[state.practice]);
    copy.innerHTML = `음표를 <span class="practice-target">${target.name}</span>으로 옮긴 뒤 정답을 확인해 보세요.`;
    button.textContent = '정답 확인';
  } else if (state.completed) {
    copy.textContent = '세 자리를 모두 찾았어요. 이제 다른 음표도 자유롭게 연주해 보세요.';
    button.textContent = '다시 연습';
  } else {
    copy.textContent = '오선과 덧줄, 덧간을 얼마나 잘 알고 있을까요? 연습을 시작해 보세요.';
    button.textContent = '연습 시작';
  }
}

$('note-up').addEventListener('click', () => setPosition(state.p + 1));
$('note-down').addEventListener('click', () => setPosition(state.p - 1));
$('listen').addEventListener('click', () => {
  playTone(posInfo(state.p).midi, true);
  showToast(`${posInfo(state.p).solf} · ${posInfo(state.p).letter}`);
});
$('sound-toggle').addEventListener('click', () => {
  state.sound = setSoundEnabled(!state.sound);
  $('sound-toggle').setAttribute('aria-pressed', String(state.sound));
  $('sound-toggle').setAttribute('aria-label', state.sound ? '소리 끄기' : '소리 켜기');
  $('sound-icon').setAttribute('href', state.sound ? '#i-volume' : '#i-muted');
  showToast(state.sound ? '소리를 켰어요' : '소리를 껐어요');
});
$('camera-reset').addEventListener('click', () => {
  if (sceneAPI) sceneAPI.resetCamera();
  showToast('시점을 처음으로 돌렸어요');
});
$('practice-button').addEventListener('click', () => {
  if (state.practice < 0) {
    state.practice = 0;
    state.solved = 0;
    state.completed = false;
    updatePractice();
    showToast('첫 번째 자리를 찾아 보세요');
    return;
  }
  const target = TARGETS[state.practice];
  if (state.p !== target) {
    showToast(nameHint(state.p, target), 3600);
    return;
  }
  state.solved += 1;
  state.happy = true;
  playTone(posInfo(target).midi, true);
  if (state.solved === TARGETS.length) {
    state.practice = -1;
    state.completed = true;
    showToast('정답! 세 자리를 모두 찾았어요', 3600);
  } else {
    state.practice += 1;
    showToast(`정답이에요! 다음은 ${state.solved + 1}번째 자리`);
  }
  updatePractice();
});
stage.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
    event.preventDefault(); setPosition(state.p + 1);
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
    event.preventDefault(); setPosition(state.p - 1);
  } else if (event.key === 'Home') {
    event.preventDefault(); setPosition(P_MIN);
  } else if (event.key === 'End') {
    event.preventDefault(); setPosition(P_MAX);
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault(); playTone(posInfo(state.p).midi, true);
  }
});

updateUI();
updatePractice();

function init3D() {
  const SEED = 41721;
  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(SEED);
  const SKY = new THREE.Color(0xefedf7);
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 28, 88);
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.rotateSpeed = 0.58;
  controls.zoomSpeed = 0.7;
  controls.minPolarAngle = 1.06;
  controls.maxPolarAngle = 1.48;
  controls.minAzimuthAngle = -0.22;
  controls.maxAzimuthAngle = 0.92;
  const target = new THREE.Vector3(0, 4.1, 0);
  controls.target.copy(target);

  scene.add(new THREE.HemisphereLight(0xfff9f0, 0xb9acc7, 2.15));
  const sun = new THREE.DirectionalLight(0xfff5e8, 3.1);
  sun.position.set(-9, 18, 13);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 55;
  sun.shadow.bias = -0.00025;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd9dcff, 1.15);
  fill.position.set(10, 7, -8);
  scene.add(fill);

  const material = (color) => new THREE.MeshLambertMaterial({ color });
  const lavender = material(0xc9c6e7);
  const paleLavender = material(0xe0ddef);
  const blush = material(0xf2c4d3);
  const dark = material(0x35415f);
  const baseMat = material(0xd9d5ec);
  const noteMat = new THREE.MeshStandardMaterial({ color: 0x6477ad, roughness: 0.42 });
  const white = material(0xfffdf8);
  const pupil = material(0x29334d);
  const cheekMat = material(0xf58fac);

  function addMesh(geometry, mat, parent = scene) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function rounded(width, height, depth, radius, mat, parent = scene) {
    return addMesh(new RoundedBoxGeometry(width, height, depth, 4, radius), mat, parent);
  }
  function xBar(length, radius, mat, parent = scene) {
    return addMesh(new THREE.CylinderGeometry(radius, radius, length, 16).rotateZ(Math.PI / 2), mat, parent);
  }

  const STEP = 0.39;
  const STAFF_GAP = STEP * 2;
  const CENTER_Y = 4.25;
  const NOTE_X = 2.05;
  const yOf = (p) => CENTER_Y + (p - 10) * STEP;

  const ground = addMesh(new THREE.CircleGeometry(400, 64).rotateX(-Math.PI / 2), material(0xefedf7));
  ground.position.y = -0.34;
  ground.castShadow = false;

  const base = rounded(14, 0.48, 3.9, 0.2, baseMat);
  base.position.set(0, -0.04, 0);
  const inset = rounded(13.15, 0.18, 3.05, 0.09, paleLavender);
  inset.position.set(0, 0.27, -0.05);
  const frontRibbon = rounded(11.8, 0.12, 0.25, 0.06, blush);
  frontRibbon.position.set(0, 0.04, 1.91);

  const postGeometry = new THREE.CapsuleGeometry(0.16, 7.55, 8, 16);
  [-6.08, 6.08].forEach((x) => {
    const post = addMesh(postGeometry, lavender);
    post.position.set(x, 4.15, -0.04);
    const foot = addMesh(new THREE.CylinderGeometry(0.38, 0.46, 0.25, 24), blush);
    foot.position.set(x, 0.44, -0.04);
  });

  const staff = new THREE.Group();
  scene.add(staff);
  for (let p = STAFF_LO; p <= STAFF_HI; p += 2) {
    const line = xBar(11.75, 0.038, dark, staff);
    line.position.set(0, yOf(p), 0);
    [-6.08, 6.08].forEach((x) => {
      const bead = addMesh(new THREE.SphereGeometry(0.23, 20, 14), p === 10 ? blush : lavender, staff);
      bead.position.set(x, yOf(p), -0.04);
    });
  }
  const endBar = addMesh(new THREE.CylinderGeometry(0.045, 0.045, STAFF_GAP * 4, 12), dark, staff);
  endBar.position.set(-5.68, yOf(10), 0);

  const guide = addMesh(new THREE.CylinderGeometry(0.012, 0.012, 7.8, 8), new THREE.MeshBasicMaterial({ color: 0xb6aecb, transparent: true, opacity: 0.22 }));
  guide.position.set(NOTE_X, CENTER_Y, -0.28);
  guide.castShadow = false;

  function makeClef() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const scale = Math.min(472 / 2.684, 984 / 7.024);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#35415f';
    ctx.translate(20, 20 + 4.392 * scale);
    ctx.scale(scale, scale);
    ctx.fill(new Path2D(TREBLE_CLEF));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const clef = new THREE.Mesh(new THREE.PlaneGeometry(2.684 * STAFF_GAP, 7.024 * STAFF_GAP), new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    const originX = -4.9;
    clef.position.set(originX + 1.342 * STAFF_GAP, yOf(8) + 0.88 * STAFF_GAP, 0.09);
    scene.add(clef);
  }
  makeClef();

  const ledgerGhostMat = new THREE.MeshBasicMaterial({ color: 0xce8da8, transparent: true, opacity: 0.2 });
  const ledgerActiveMat = material(0xd84c83);
  [16, 18, 20, 4, 2, 0].forEach((p) => {
    const ghost = xBar(1.75, 0.022, ledgerGhostMat);
    ghost.position.set(NOTE_X, yOf(p), -0.02);
    ghost.castShadow = false;
    const active = xBar(1.75, 0.046, ledgerActiveMat);
    active.position.set(NOTE_X, yOf(p), 0.055);
    active.userData.p = p;
    active.visible = false;
    ledgerLines.push(active);
  });

  const padColors = ['#f39aac', '#efb28b', '#eadf78', '#93cfae', '#88bedf', '#a3a8e4', '#c3a3dd'];
  padColors.forEach((color, index) => {
    const pad = rounded(0.82, 0.16, 0.82, 0.08, material(color));
    pad.position.set(-4.35 + index * 1.45, 0.45, 0.9);
  });

  noteGroup = new THREE.Group();
  noteGroup.position.set(NOTE_X, yOf(state.p), 0.34);
  scene.add(noteGroup);
  const tilt = new THREE.Group();
  tilt.rotation.z = -0.22;
  noteGroup.add(tilt);
  noteHead = addMesh(new THREE.SphereGeometry(1, 32, 24), noteMat, tilt);
  noteHead.scale.set(0.58, 0.39, 0.26);
  noteHalo = addMesh(new THREE.TorusGeometry(0.72, 0.018, 8, 48), new THREE.MeshBasicMaterial({ color: 0x6477ad, transparent: true, opacity: 0.34 }), noteGroup);
  noteHalo.position.z = -0.18;
  noteHalo.castShadow = false;
  noteStem = addMesh(new THREE.CylinderGeometry(0.047, 0.047, 2.25, 16), noteMat, noteGroup);
  noteStem.position.z = -0.01;
  [-0.19, 0.19].forEach((x) => {
    const eye = addMesh(new THREE.SphereGeometry(0.105, 18, 12), white, tilt);
    eye.position.set(x, 0.045, 0.255);
    eye.scale.set(1, 1.1, 0.5);
    const dot = addMesh(new THREE.SphereGeometry(0.045, 14, 10), pupil, tilt);
    dot.position.set(x + 0.012, 0.04, 0.325);
    const shine = addMesh(new THREE.SphereGeometry(0.013, 8, 6), white, tilt);
    shine.position.set(x - 0.003, 0.057, 0.365);
  });
  [-0.36, 0.36].forEach((x) => {
    const cheek = addMesh(new THREE.SphereGeometry(0.075, 14, 10), cheekMat, tilt);
    cheek.position.set(x, -0.09, 0.19);
    cheek.scale.set(1, 0.55, 0.35);
  });
  const mouthCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.1, -0.1, 0.275),
    new THREE.Vector3(0, -0.21, 0.31),
    new THREE.Vector3(0.1, -0.1, 0.275),
  );
  addMesh(new THREE.TubeGeometry(mouthCurve, 16, 0.018, 8, false), white, tilt);

  const distantMat = material(0xe3dfed);
  for (let i = 0; i < 9; i += 1) {
    const width = 3 + rand() * 5;
    const height = 4 + rand() * 6;
    const block = rounded(width, height, 3 + rand() * 4, 0.5, distantMat);
    block.position.set((rand() - 0.5) * 70, height / 2 - 0.34, -42 - rand() * 30);
    block.rotation.y = rand() * Math.PI;
    block.castShadow = false;
  }

  const floaters = [];
  const floaterColors = [0xe7b5c8, 0xc4c1e2, 0xe9d985, 0xb9d7cb];
  for (let i = 0; i < 14; i += 1) {
    const size = 0.08 + rand() * 0.14;
    const geometry = i % 3 === 0 ? new THREE.TorusGeometry(size, size * 0.22, 6, 18) : new THREE.OctahedronGeometry(size, 0);
    const piece = addMesh(geometry, material(floaterColors[i % floaterColors.length]));
    const basePosition = new THREE.Vector3((rand() - 0.5) * 19, 0.8 + rand() * 8.8, -2.5 - rand() * 6);
    piece.position.copy(basePosition);
    piece.castShadow = false;
    floaters.push({ piece, basePosition, offset: rand() * Math.PI * 2 });
  }

  const labelLayer = $('label-layer');
  const labels = [];
  for (let p = STAFF_LO; p <= STAFF_HI; p += 1) {
    const info = posInfo(p);
    const node = document.createElement('span');
    node.className = `pitch-label ${info.isLine ? 'line' : 'space'}`;
    node.dataset.p = String(p);
    node.textContent = info.short;
    labelLayer.appendChild(node);
    labels.push({ p, node, world: new THREE.Vector3(info.isLine ? -5.68 : 5.68, yOf(p), 0.08), isLine: info.isLine });
  }

  const defaultDirection = new THREE.Vector3(0.58, 0.28, 1).normalize();
  function fitCamera(useDefault = false) {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const distance = Math.max(9.2 / (2 * Math.tan(verticalFov / 2)), 15.6 / (2 * Math.tan(horizontalFov / 2))) * 1.09;
    const direction = useDefault ? defaultDirection : camera.position.clone().sub(target).normalize();
    if (direction.lengthSq() < 0.1) direction.copy(defaultDirection);
    camera.position.copy(target).addScaledVector(direction, distance);
    controls.target.copy(target);
    controls.minDistance = distance * 0.72;
    controls.maxDistance = distance * 1.65;
    controls.update();
  }

  function updateLabels() {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    labels.forEach(({ node, world, isLine }) => {
      const projected = world.clone().project(camera);
      const x = (projected.x * 0.5 + 0.5) * width + (isLine ? -12 : 12);
      const y = (-projected.y * 0.5 + 0.5) * height;
      const visible = projected.z < 1 && x > -80 && x < width + 80 && y > 30 && y < height - 25;
      node.style.display = visible ? '' : 'none';
      node.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(${isLine ? '-100%' : '0'},-50%)`;
    });
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let drag = null;
  function hitNote(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(noteGroup, true).length > 0;
  }
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !hitNote(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderer.domElement.setPointerCapture(event.pointerId);
    controls.enabled = false;
    drag = { id: event.pointerId, startY: event.clientY, startP: state.p, moved: false };
    renderer.domElement.style.cursor = 'grabbing';
    noteGroup.scale.setScalar(1.07);
  }, { capture: true });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (drag && drag.id === event.pointerId) {
      const pixelsPerStep = Math.max(15, Math.min(31, mount.clientHeight / 22));
      const delta = Math.round((drag.startY - event.clientY) / pixelsPerStep);
      if (Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
      setPosition(drag.startP + delta, { announce: false });
    } else if (event.pointerType !== 'touch') {
      renderer.domElement.style.cursor = 'grab';
    }
  });
  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved) playTone(posInfo(state.p).midi, true);
    else liveNode.textContent = `${posInfo(state.p).name}, ${posInfo(state.p).solf}, ${posInfo(state.p).letter}`;
    drag = null;
    controls.enabled = true;
    noteGroup.scale.setScalar(1);
    renderer.domElement.style.cursor = 'grab';
    try { renderer.domElement.releasePointerCapture(event.pointerId); } catch (_) {}
  }
  renderer.domElement.addEventListener('pointerup', endDrag);
  renderer.domElement.addEventListener('pointercancel', endDrag);

  const DURATION = 8;
  let visualP = state.p;
  let simT = 0;
  let paused = false;
  let accumulator = 0;
  const STEP_TIME = 1 / 60;
  const clock = new THREE.Clock();

  function sample(t) {
    const phase = (t / DURATION) * Math.PI * 2;
    const bob = reducedMotion() ? 0 : (1 - Math.cos(phase)) * 0.026;
    noteGroup.position.y = yOf(visualP) + bob;
    noteGroup.rotation.y = reducedMotion() ? 0 : Math.sin(phase) * 0.025;
    const haloScale = reducedMotion() ? 1 : 1 + (1 - Math.cos(phase)) * 0.028;
    noteHalo.scale.setScalar(haloScale);
    noteHead.scale.set(0.58, state.happy ? 0.42 : 0.39, 0.26);
    floaters.forEach(({ piece, basePosition, offset }) => {
      piece.position.copy(basePosition);
      piece.rotation.set(offset * 0.35, offset, 0);
    });
  }
  function draw() {
    controls.update();
    renderer.render(scene, camera);
    updateLabels();
  }
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!paused) {
      accumulator += dt;
      while (accumulator >= STEP_TIME) {
        visualP += (state.p - visualP) * Math.min(1, STEP_TIME * 13);
        if (Math.abs(visualP - state.p) < 0.001) visualP = state.p;
        accumulator -= STEP_TIME;
        simT += STEP_TIME;
      }
      sample(simT);
      if (Math.abs(visualP - state.p) > 0.001) renderer.shadowMap.needsUpdate = true;
    }
    draw();
  });

  function resize() {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false);
    fitCamera(false);
    draw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(mount);
  renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight), false);
  fitCamera(true);
  syncSceneNote();
  sample(0);
  draw();

  sceneAPI = { resetCamera() { fitCamera(true); draw(); } };
  window.__musicApp = {
    getState: () => ({ ...state, info: posInfo(state.p) }),
    setPosition: (p) => setPosition(p, { sound: false }),
    getMetrics: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries }),
  };
  window.__seek = (value) => {
    const parsed = Number(value);
    paused = true;
    accumulator = 0;
    simT = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    visualP = state.p;
    sample(simT);
    draw();
  };
  window.__play = () => { paused = false; clock.getDelta(); };
  const timeParameter = new URLSearchParams(window.location.search).get('t');
  if (timeParameter !== null) window.__seek(timeParameter);
  $('poster').classList.add('is-hidden');
  window.__SCENE_READY__ = true;
}

try {
  init3D();
} catch (error) {
  $('fallback').hidden = false;
  console.error('3D scene initialization failed', error);
}
