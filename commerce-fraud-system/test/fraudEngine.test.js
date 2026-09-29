// Run with: npm test  (uses Node's built-in test runner, no extra deps)
const { test } = require('node:test');
const assert = require('node:assert');
const fraudEngine = require('../services/fraudEngine');

test('a clean, low-value, same-country order scores 0 and is LOW risk', () => {
  const order = {
    id: 't1', customerEmail: 'clean@example.com', amount: 25, quantity: 1,
    billingCountry: 'IN', shippingCountry: 'IN', ipCountry: 'IN', accountAgeDays: 365,
  };
  const result = fraudEngine.scoreOrder(order);
  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.riskLevel, 'LOW');
  assert.strictEqual(result.recommendedAction, 'Approve');
  assert.deepStrictEqual(result.triggeredRules, []);
});

test('an order >= $1000 triggers HIGH_ORDER_VALUE', () => {
  const order = {
    id: 't2', customerEmail: 'a@b.com', amount: 1500, quantity: 1,
    billingCountry: 'IN', shippingCountry: 'IN',
  };
  const result = fraudEngine.scoreOrder(order);
  assert.ok(result.triggeredRules.some(r => r.id === 'HIGH_ORDER_VALUE'));
});

test('billing/shipping country mismatch is flagged', () => {
  const order = {
    id: 't3', customerEmail: 'a@b.com', amount: 20, quantity: 1,
    billingCountry: 'US', shippingCountry: 'NG',
  };
  const result = fraudEngine.scoreOrder(order);
  assert.ok(result.triggeredRules.some(r => r.id === 'ADDRESS_MISMATCH'));
});

test('a denylisted email is always CRITICAL and recommends blocking, even alone', () => {
  const order = {
    id: 't4', customerEmail: 'fraud@example.com', amount: 20, quantity: 1,
    billingCountry: 'US', shippingCountry: 'US',
  };
  const result = fraudEngine.scoreOrder(order);
  assert.strictEqual(result.riskLevel, 'CRITICAL');
  assert.strictEqual(result.recommendedAction, 'Block & Investigate');
  assert.ok(result.score >= 80, 'a hard-block rule should floor the score into the CRITICAL band');
});

test('a new account (<=2 days) placing a high-value order is flagged', () => {
  const order = {
    id: 't5', customerEmail: 'a@b.com', amount: 500, quantity: 1,
    billingCountry: 'IN', shippingCountry: 'IN', accountAgeDays: 1,
  };
  const result = fraudEngine.scoreOrder(order);
  assert.ok(result.triggeredRules.some(r => r.id === 'NEW_ACCOUNT_HIGH_VALUE'));
});

test('a disposable email domain is flagged', () => {
  const order = {
    id: 't6', customerEmail: 'someone@mailinator.com', amount: 20, quantity: 1,
    billingCountry: 'IN', shippingCountry: 'IN',
  };
  const result = fraudEngine.scoreOrder(order);
  assert.ok(result.triggeredRules.some(r => r.id === 'DISPOSABLE_EMAIL'));
});

test('score is capped at 100 even when every rule fires', () => {
  const order = {
    id: 't7', customerEmail: 'fraud@example.com', amount: 5000, quantity: 20,
    billingCountry: 'US', shippingCountry: 'NG', ipCountry: 'RU',
    accountAgeDays: 0, cardBin: '400000',
  };
  const result = fraudEngine.scoreOrder(order);
  assert.ok(result.score <= 100);
  assert.strictEqual(result.riskLevel, 'CRITICAL');
});

test('a rule throwing on a malformed field does not break the rest of scoring', () => {
  // customerEmail missing entirely - BLACKLISTED_EMAIL and DISPOSABLE_EMAIL
  // call .toLowerCase() on it and would throw; scoring should still complete.
  const order = {
    id: 't8', amount: 1500, quantity: 1, billingCountry: 'IN', shippingCountry: 'IN',
  };
  assert.doesNotThrow(() => fraudEngine.scoreOrder(order));
  const result = fraudEngine.scoreOrder(order);
  assert.ok(result.triggeredRules.some(r => r.id === 'HIGH_ORDER_VALUE'));
});
