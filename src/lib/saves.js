const STORAGE_KEY = 'pathcraft:saves';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(saves) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
  } catch {
    // Storage full or unavailable — saving is best-effort, not fatal to play.
  }
}

export function createSaveId() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : `save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function listSaves() {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadSave(id) {
  return readAll().find((save) => save.id === id) ?? null;
}

export function saveGame(id, blocks) {
  const saves = readAll();
  const index = saves.findIndex((save) => save.id === id);
  const record = { id, updatedAt: Date.now(), blocks };
  if (index === -1) {
    saves.push(record);
  } else {
    saves[index] = record;
  }
  writeAll(saves);
}
