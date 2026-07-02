const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SETTINGS = Object.freeze({ scale: 'medium', muted: false, autoStart: false, position: null });
const SCALES = Object.freeze({ small: 0.75, medium: 1, large: 1.25 });

function normalizeSettings(value = {}) {
  return {
    scale: Object.hasOwn(SCALES, value.scale) ? value.scale : DEFAULT_SETTINGS.scale,
    muted: Boolean(value.muted),
    autoStart: Boolean(value.autoStart),
    position: value.position && Number.isFinite(value.position.x) && Number.isFinite(value.position.y)
      ? { x: Math.round(value.position.x), y: Math.round(value.position.y) }
      : null
  };
}

function loadSettings(file) {
  try { return normalizeSettings(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(file, settings) {
  const safe = normalizeSettings(settings);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(safe, null, 2), 'utf8');
  fs.renameSync(temp, file);
  return safe;
}

function loadCharacterConfig(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!value.window || !value.animations?.idle) throw new Error('missing required character fields');
    return value;
  } catch (error) {
    throw new Error(`角色配置不可用：${error.message}`);
  }
}

module.exports = { DEFAULT_SETTINGS, SCALES, normalizeSettings, loadSettings, saveSettings, loadCharacterConfig };
