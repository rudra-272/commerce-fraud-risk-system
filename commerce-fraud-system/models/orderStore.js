const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'orders.json');
const REDIS_KEY = 'orders';

// If Upstash Redis env vars are present (set automatically by the Vercel
// Marketplace integration once it's actually connected), use Redis for
// storage so reads/writes work on Vercel's read-only serverless filesystem.
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Vercel sets this env var automatically on every deployment. We use it to
// detect the read-only serverless filesystem so we NEVER attempt
// fs.writeFileSync there - that throws EROFS and crashes the request with a
// 500, which is exactly what happens if this app is deployed to Vercel
// without the Redis integration actually configured.
const ON_VERCEL = !!process.env.VERCEL;

let redis = null;
if (USE_REDIS) {
  const { Redis } = require('@upstash/redis');
  redis = Redis.fromEnv();
}

// In-memory fallback: used only when we're on Vercel (read-only filesystem)
// AND Redis hasn't been configured yet. Data survives for the lifetime of
// the current function instance only - it resets on the next cold start.
// This means the app never hard-crashes even if Redis setup is skipped or
// misconfigured, but Redis (or a real DB) is still what you want for data
// that actually needs to persist. Seeded once per instance from the
// bundled data/orders.json so it isn't empty on first load.
let memoryStore = [];
let memorySeeded = false;

function seedMemoryFromBundledFileOnce() {
  if (memorySeeded) return;
  memorySeeded = true;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8').trim();
      memoryStore = raw ? JSON.parse(raw) : [];
    }
  } catch {
    memoryStore = [];
  }
}

// ---------- local JSON-file backend (unchanged, used for local dev) ----------
function readAllFile() {
  if (!fs.existsSync(DB_FILE)) return [];
  const raw = fs.readFileSync(DB_FILE, 'utf-8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function writeAllFile(orders) {
  fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2));
}

// ---------- shared API (auto-picks Redis, file, or in-memory backend) ----------
async function readAll() {
  if (USE_REDIS) {
    const data = await redis.get(REDIS_KEY);
    return data || [];
  }
  if (ON_VERCEL) {
    seedMemoryFromBundledFileOnce();
    return memoryStore;
  }
  return readAllFile();
}

async function writeAll(orders) {
  if (USE_REDIS) {
    await redis.set(REDIS_KEY, orders);
    return;
  }
  if (ON_VERCEL) {
    memoryStore = orders;
    return;
  }
  writeAllFile(orders);
}

async function getAll() {
  const orders = await readAll();
  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function getById(id) {
  const orders = await readAll();
  return orders.find(o => o.id === id);
}

async function add(order) {
  const orders = await readAll();
  orders.push(order);
  await writeAll(orders);
  return order;
}

async function update(id, patch) {
  const orders = await readAll();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch };
  await writeAll(orders);
  return orders[idx];
}

async function getRecentByCustomer(email, withinMinutes) {
  const cutoff = Date.now() - withinMinutes * 60 * 1000;
  const orders = await readAll();
  return orders.filter(
    o => o.customerEmail.toLowerCase() === email.toLowerCase() && new Date(o.createdAt).getTime() >= cutoff
  );
}

module.exports = { getAll, getById, add, update, getRecentByCustomer, USE_REDIS, ON_VERCEL };
