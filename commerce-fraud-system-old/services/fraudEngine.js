const orderStore = require('../models/orderStore');

// Simple denylists for demo purposes — in a real system these would be
// backed by a threat-intel feed / database table.
const BLACKLISTED_EMAILS = ['fraud@example.com', 'test@fraud.net'];
const BLACKLISTED_CARD_BINS = ['400000', '411111'];
const FREE_EMAIL_DOMAINS = ['tempmail.com', 'mailinator.com', 'guerrillamail.com', '10minutemail.com'];

const RULES = [
  {
    id: 'HIGH_ORDER_VALUE',
    weight: 20,
    test: (order) => order.amount >= 1000,
    reason: 'Order value is unusually high (>= $1000)',
  },
  {
    id: 'ADDRESS_MISMATCH',
    weight: 25,
    test: (order) => order.billingCountry && order.shippingCountry && order.billingCountry !== order.shippingCountry,
    reason: 'Billing and shipping countries do not match',
  },
  {
    id: 'IP_COUNTRY_MISMATCH',
    weight: 20,
    test: (order) => order.ipCountry && order.billingCountry && order.ipCountry !== order.billingCountry,
    reason: 'Customer IP country differs from billing country',
  },
  {
    id: 'NEW_ACCOUNT_HIGH_VALUE',
    weight: 20,
    test: (order) => order.accountAgeDays !== undefined && order.accountAgeDays <= 2 && order.amount >= 300,
    reason: 'New account (<= 2 days old) placing a high-value order',
  },
  {
    id: 'VELOCITY',
    weight: 30,
    test: (order) => {
      const recent = orderStore.getRecentByCustomer(order.customerEmail, 60).filter(o => o.id !== order.id);
      return recent.length >= 2;
    },
    reason: '3+ orders from this email within the last 60 minutes',
  },
  {
    id: 'BLACKLISTED_EMAIL',
    weight: 50,
    test: (order) => BLACKLISTED_EMAILS.includes(order.customerEmail.toLowerCase()),
    reason: 'Customer email appears on the fraud denylist',
  },
  {
    id: 'BLACKLISTED_CARD_BIN',
    weight: 50,
    test: (order) => order.cardBin && BLACKLISTED_CARD_BINS.includes(order.cardBin),
    reason: 'Card BIN appears on the fraud denylist',
  },
  {
    id: 'DISPOSABLE_EMAIL',
    weight: 15,
    test: (order) => FREE_EMAIL_DOMAINS.some(d => order.customerEmail.toLowerCase().endsWith('@' + d)),
    reason: 'Customer used a disposable/temporary email domain',
  },
  {
    id: 'HIGH_QUANTITY',
    weight: 10,
    test: (order) => order.quantity >= 10,
    reason: 'Unusually high quantity of a single item',
  },
];

function scoreOrder(order) {
  const triggered = [];
  let score = 0;

  for (const rule of RULES) {
    try {
      if (rule.test(order)) {
        score += rule.weight;
        triggered.push({ id: rule.id, weight: rule.weight, reason: rule.reason });
      }
    } catch (e) {
      // A malformed field on one rule should never break scoring of the rest
      continue;
    }
  }

  score = Math.min(score, 100);

  // Denylist hits are a confirmed-bad-actor signal, not just one more
  // weighted factor - they should always force a hard block on their own,
  // even if the additive score alone wouldn't reach the CRITICAL band.
  const HARD_BLOCK_RULES = ['BLACKLISTED_EMAIL', 'BLACKLISTED_CARD_BIN'];
  const hardBlocked = triggered.some(r => HARD_BLOCK_RULES.includes(r.id));

  let riskLevel = 'LOW';
  if (hardBlocked || score >= 80) riskLevel = 'CRITICAL';
  else if (score >= 60) riskLevel = 'HIGH';
  else if (score >= 30) riskLevel = 'MEDIUM';

  if (hardBlocked) score = Math.max(score, 80);

  let recommendedAction = 'Approve';
  if (riskLevel === 'CRITICAL') recommendedAction = 'Block & Investigate';
  else if (riskLevel === 'HIGH') recommendedAction = 'Manual Review';
  else if (riskLevel === 'MEDIUM') recommendedAction = 'Verify (2FA / call customer)';

  return { score, riskLevel, recommendedAction, triggeredRules: triggered };
}

module.exports = { scoreOrder, RULES };
