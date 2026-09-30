const express = require('express');
const cors = require('cors');
const path = require('path');
const ordersRouter = require('./routes/orders');
const orderStore = require('./models/orderStore');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/orders', ordersRouter);

// Dashboard summary stats
app.get('/api/stats', (req, res) => {
  const orders = orderStore.getAll();

  const summary = {
    totalOrders: orders.length,
    totalValue: orders.reduce((s, o) => s + o.amount, 0),
    byRiskLevel: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    },
    byStatus: {
      PENDING: 0,
      APPROVED: 0,
      UNDER_REVIEW: 0,
      BLOCKED: 0
    }
  };

  for (const o of orders) {
    summary.byRiskLevel[o.riskLevel] =
      (summary.byRiskLevel[o.riskLevel] || 0) + 1;

    summary.byStatus[o.status] =
      (summary.byStatus[o.status] || 0) + 1;
  }

  res.json(summary);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Malformed JSON in request body'
    });
  }

  res.status(500).json({
    error: 'Internal server error'
  });
});

module.exports = app;