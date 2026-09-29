const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'orders.json');

function readAll() {
  if (!fs.existsSync(DB_FILE)) return [];
  const raw = fs.readFileSync(DB_FILE, 'utf-8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function writeAll(orders) {
  fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2));
}

function getAll() {
  return readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getById(id) {
  return readAll().find(o => o.id === id);
}

function add(order) {
  const orders = readAll();
  orders.push(order);
  writeAll(orders);
  return order;
}

function update(id, patch) {
  const orders = readAll();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch };
  writeAll(orders);
  return orders[idx];
}

function getRecentByCustomer(email, withinMinutes) {
  const cutoff = Date.now() - withinMinutes * 60 * 1000;
  return readAll().filter(
    o => o.customerEmail.toLowerCase() === email.toLowerCase() && new Date(o.createdAt).getTime() >= cutoff
  );
}

module.exports = { getAll, getById, add, update, getRecentByCustomer };
