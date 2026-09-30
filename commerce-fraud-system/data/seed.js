// Run with: npm run seed
// Populates storage with a handful of realistic sample orders spanning
// low, medium, high and critical risk so the dashboard has something to
// show immediately. Works against whichever backend orderStore picks
// (local JSON file by default, or Upstash Redis if its env vars are set —
// e.g. run `vercel env pull .env.local` first, then `node -r dotenv/config
// data/seed.js` to seed your live Vercel deployment's Redis store).
const { v4: uuidv4 } = require('uuid');
const orderStore = require('../models/orderStore');
const fraudEngine = require('../services/fraudEngine');

const raw = [
  { customerEmail: 'anita.rao@gmail.com', amount: 45.99, quantity: 1, billingCountry: 'IN', shippingCountry: 'IN', ipCountry: 'IN', accountAgeDays: 400, productName: 'Wireless Mouse' },
  { customerEmail: 'karan.mehta@yahoo.com', amount: 129.5, quantity: 2, billingCountry: 'IN', shippingCountry: 'IN', ipCountry: 'IN', accountAgeDays: 120, productName: 'Bluetooth Headphones' },
  { customerEmail: 'new.user01@tempmail.com', amount: 899, quantity: 1, billingCountry: 'US', shippingCountry: 'NG', ipCountry: 'RU', accountAgeDays: 0, cardBin: '400000', productName: '65-inch Smart TV' },
  { customerEmail: 'priya.singh@outlook.com', amount: 1250, quantity: 1, billingCountry: 'IN', shippingCountry: 'US', ipCountry: 'IN', accountAgeDays: 1, productName: 'Gaming Laptop' },
  { customerEmail: 'fraud@example.com', amount: 2200, quantity: 1, billingCountry: 'US', shippingCountry: 'US', ipCountry: 'US', accountAgeDays: 3, cardBin: '411111', productName: 'iPhone 16 Pro' },
  { customerEmail: 'ravi.kumar@gmail.com', amount: 22.0, quantity: 1, billingCountry: 'IN', shippingCountry: 'IN', ipCountry: 'IN', accountAgeDays: 800, productName: 'Phone Case' },
];

async function main() {
  const orders = [];
  for (const o of raw) {
    const order = {
      id: uuidv4(),
      ...o,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)).toISOString(),
    };
    const result = await fraudEngine.scoreOrder(order);
    order.riskScore = result.score;
    order.riskLevel = result.riskLevel;
    order.recommendedAction = result.recommendedAction;
    order.triggeredRules = result.triggeredRules;
    order.status = result.riskLevel === 'CRITICAL' ? 'BLOCKED' : result.riskLevel === 'HIGH' ? 'UNDER_REVIEW' : 'APPROVED';
    orders.push(order);
  }

  for (const order of orders) {
    await orderStore.add(order);
  }

  console.log(`Seeded ${orders.length} sample orders (backend: ${orderStore.USE_REDIS ? 'Upstash Redis' : 'local JSON file'})`);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
