const express = require('express');
const { v4: uuidv4 } = require('uuid');
const orderStore = require('../models/orderStore');
const fraudEngine = require('../services/fraudEngine');

const router = express.Router();

// GET /api/orders - list all orders (with optional ?riskLevel= filter)
router.get('/', (req, res) => {
  let orders = orderStore.getAll();
  if (req.query.riskLevel) {
    orders = orders.filter(o => o.riskLevel === req.query.riskLevel.toUpperCase());
  }
  res.json(orders);
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = orderStore.getById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// POST /api/orders - create a new order and score it
router.post('/', (req, res) => {
  const body = req.body || {};
  const required = ['customerEmail', 'amount', 'billingCountry', 'shippingCountry'];
  for (const field of required) {
    if (body[field] === undefined || body[field] === '') {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  if (typeof body.customerEmail !== 'string' || !/^\S+@\S+\.\S+$/.test(body.customerEmail)) {
    return res.status(400).json({ error: 'customerEmail must be a valid email address' });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const quantity = body.quantity !== undefined ? Number(body.quantity) : 1;
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
    return res.status(400).json({ error: 'quantity must be a positive whole number' });
  }

  let accountAgeDays;
  if (body.accountAgeDays !== undefined && body.accountAgeDays !== '') {
    accountAgeDays = Number(body.accountAgeDays);
    if (!Number.isFinite(accountAgeDays) || accountAgeDays < 0) {
      return res.status(400).json({ error: 'accountAgeDays must be a non-negative number' });
    }
  }

  // Country codes are compared for equality by the fraud rules, so
  // normalizing case here avoids false positives like "us" vs "US".
  const billingCountry = String(body.billingCountry).trim().toUpperCase();
  const shippingCountry = String(body.shippingCountry).trim().toUpperCase();
  const ipCountry = body.ipCountry ? String(body.ipCountry).trim().toUpperCase() : billingCountry;

  const order = {
    id: uuidv4(),
    customerEmail: body.customerEmail,
    amount,
    quantity,
    billingCountry,
    shippingCountry,
    ipCountry,
    accountAgeDays,
    cardBin: body.cardBin || null,
    productName: body.productName || 'Unnamed item',
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  };

  const result = fraudEngine.scoreOrder(order);
  order.riskScore = result.score;
  order.riskLevel = result.riskLevel;
  order.recommendedAction = result.recommendedAction;
  order.triggeredRules = result.triggeredRules;
  order.status = result.riskLevel === 'CRITICAL' ? 'BLOCKED' : result.riskLevel === 'HIGH' ? 'UNDER_REVIEW' : 'APPROVED';

  orderStore.add(order);
  res.status(201).json(order);
});

// PATCH /api/orders/:id/status - manually override status (approve/block after review)
router.patch('/:id/status', (req, res) => {
  const { status } = req.body || {};
  const allowed = ['APPROVED', 'BLOCKED', 'UNDER_REVIEW', 'PENDING'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
  }
  const updated = orderStore.update(req.params.id, { status, reviewedAt: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: 'Order not found' });
  res.json(updated);
});

module.exports = router;
