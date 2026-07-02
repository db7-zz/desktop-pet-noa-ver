const canvas = document.querySelector('#pet');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let config;
let settings = { scale: 'medium' };
let state = 'idle';
let sleeping = false;
let frames = [];
let frameIndex = 0;
let timer;
let loadToken = 0;
let pointerDown = null;
let dragging = false;
let clickTimer;
const DRAG_DISTANCE = 5;
const SCALE_FACTORS = { small: 0.75, medium: 1, large: 1.25 };

function animationFor(name) {
  return config.animations[name] || config.animations.idle;
}

function resolvePaths(animation) {
  const paths = Array.isArray(animation.frames) ? animation.frames : [];
  return paths.length ? paths : animationFor('idle').frames;
}

async function loadImage(src) {
  const image = new Image();
  image.src = `../../assets/nuoge/${src}`;
  try { await image.decode(); return image; } catch { return null; }
}

async function play(name) {
  // All state transitions are data-driven; missing state frames fall back to idle without crashing.
  clearTimeout(timer);
  const token = ++loadToken;
  state = name;
  const animation = animationFor(name);
  const loaded = (await Promise.all(resolvePaths(animation).map(loadImage))).filter(Boolean);
  if (token !== loadToken) return;
  frames = loaded.length ? loaded : (name === 'idle' ? [] : (await Promise.all(resolvePaths(animationFor('idle')).map(loadImage))).filter(Boolean));
  frameIndex = 0;
  tick(animation);
}

function tick(animation) {
  if (!frames.length) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
  const image = frames[frameIndex];
  drawFrame(image);
  // A held pointer means the user intends to drag. Freeze the pose so changing
  // silhouettes cannot look like the character is stretching under the cursor.
  if (pointerDown) {
    timer = setTimeout(() => tick(animation), 50);
    return;
  }
  frameIndex += 1;
  if (frameIndex >= frames.length) {
    if (animation.loop && (state === 'idle' || state === 'idle_b')) {
      play(state === 'idle' ? 'idle_b' : 'idle');
      return;
    } else if (animation.loop) frameIndex = 0;
    else { play(animation.next || (sleeping ? 'sleep' : 'idle')); return; }
  }
  timer = setTimeout(() => tick(animation), Math.max(40, 1000 / Math.max(1, animation.fps || 6)));
}

function drawFrame(image) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!image) return;
  const factor = SCALE_FACTORS[settings.scale] || 1;
  const width = Math.round(config.window.width * factor * devicePixelRatio);
  const height = Math.round(config.window.height * factor * devicePixelRatio);
  const x = Math.round((canvas.width - width) / 2);
  const y = canvas.height - height;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, x, y, width, height);
}

function resize() {
  canvas.width = Math.max(1, Math.round(innerWidth * devicePixelRatio));
  canvas.height = Math.max(1, Math.round(innerHeight * devicePixelRatio));
  if (frames[frameIndex] || frames[0]) {
    drawFrame(frames[frameIndex] || frames[0]);
  }
}

function opaqueAt(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) * devicePixelRatio);
  const y = Math.floor((event.clientY - rect.top) * devicePixelRatio);
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return false;
  try { return ctx.getImageData(x, y, 1, 1).data[3] >= (config.hitTestAlpha || 24); } catch { return true; }
}

canvas.addEventListener('mousemove', event => {
  // Dragging uses screen coordinates so native-window movement remains smooth outside the canvas bounds.
  window.petApi.passthrough(!pointerDown && !opaqueAt(event));
  if (!pointerDown) return;
  const moved = Math.hypot(event.screenX - pointerDown.x, event.screenY - pointerDown.y);
  if (moved >= DRAG_DISTANCE) { dragging = true; canvas.classList.add('dragging'); }
  if (dragging) window.petApi.drag('move', { x: event.screenX, y: event.screenY });
});
canvas.addEventListener('mouseleave', () => { if (!pointerDown) window.petApi.passthrough(true); });
canvas.addEventListener('mousedown', event => {
  if (event.button !== 0 || !opaqueAt(event)) return;
  pointerDown = { x: event.screenX, y: event.screenY };
  window.petApi.drag('start', pointerDown);
  dragging = false;
  window.petApi.passthrough(false);
});
window.addEventListener('mouseup', event => {
  if (!pointerDown) return;
  if (!dragging) {
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { if (!sleeping) play('happy'); }, 230);
  }
  pointerDown = null;
  window.petApi.drag('end', { x: event.screenX, y: event.screenY });
  dragging = false;
  canvas.classList.remove('dragging');
});
canvas.addEventListener('dblclick', event => {
  if (!opaqueAt(event)) return;
  clearTimeout(clickTimer);
  sleeping = !sleeping;
  play(sleeping ? 'sleep' : 'wake');
});
canvas.addEventListener('contextmenu', event => {
  event.preventDefault();
  if (opaqueAt(event)) window.petApi.contextMenu();
});

window.addEventListener('resize', resize);
window.petApi.onSettings(value => {
  settings = value;
  drawFrame(frames[frameIndex] || frames[0]);
});
window.petApi.bootstrap().then(value => {
  config = value.character;
  settings = value.settings;
  resize();
  play('idle');
});
