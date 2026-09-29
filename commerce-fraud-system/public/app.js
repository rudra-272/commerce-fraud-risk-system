const ordersBody = document.getElementById('ordersBody');
const riskFilter = document.getElementById('riskFilter');
const orderForm = document.getElementById('orderForm');
const formMsg = document.getElementById('formMsg');
const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

async function loadStats() {
  const res = await fetch('/api/stats');
  const s = await res.json();
  document.getElementById('statTotal').textContent = s.totalOrders;
  document.getElementById('statValue').textContent = '$' + s.totalValue.toFixed(2);
  document.getElementById('statLow').textContent = s.byRiskLevel.LOW;
  document.getElementById('statMedium').textContent = s.byRiskLevel.MEDIUM;
  document.getElementById('statHigh').textContent = s.byRiskLevel.HIGH;
  document.getElementById('statCritical').textContent = s.byRiskLevel.CRITICAL;
}

async function loadOrders() {
  const level = riskFilter.value;
  const url = level ? `/api/orders?riskLevel=${level}` : '/api/orders';
  const res = await fetch(url);
  const orders = await res.json();
  renderOrders(orders);
}

function renderOrders(orders) {
  ordersBody.innerHTML = '';
  if (orders.length === 0) {
    ordersBody.innerHTML = '<tr><td colspan="7" style="color:#8b95ab;text-align:center;">No orders yet</td></tr>';
    return;
  }
  for (const o of orders) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(o.customerEmail)}</td>
      <td>${escapeHtml(o.productName || '')}</td>
      <td>$${o.amount.toFixed(2)}</td>
      <td><span class="badge badge-${o.riskLevel}">${o.riskLevel}</span></td>
      <td>${o.riskScore}</td>
      <td>${o.status}</td>
      <td><button class="status-btn" data-id="${o.id}">View</button></td>
    `;
    tr.querySelector('.status-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(o);
    });
    tr.addEventListener('click', () => openModal(o));
    ordersBody.appendChild(tr);
  }
}

function openModal(o) {
  const rulesHtml = (o.triggeredRules || []).length
    ? o.triggeredRules.map(r => `<div class="rule-item"><strong>${r.id}</strong> (+${r.weight}) — ${r.reason}</div>`).join('')
    : '<div class="rule-item">No fraud rules triggered.</div>';

  modalBody.innerHTML = `
    <p><strong>Customer:</strong> ${escapeHtml(o.customerEmail)}</p>
    <p><strong>Product:</strong> ${escapeHtml(o.productName || '')} (qty ${o.quantity})</p>
    <p><strong>Amount:</strong> $${o.amount.toFixed(2)}</p>
    <p><strong>Billing / Shipping:</strong> ${o.billingCountry} / ${o.shippingCountry}</p>
    <p><strong>Risk:</strong> <span class="badge badge-${o.riskLevel}">${o.riskLevel}</span> (score ${o.riskScore})</p>
    <p><strong>Recommended Action:</strong> ${o.recommendedAction}</p>
    <p><strong>Status:</strong> ${o.status}</p>
    <hr style="border-color:#263049;" />
    <p><strong>Triggered Rules</strong></p>
    ${rulesHtml}
    <hr style="border-color:#263049;" />
    <label style="font-size:12px;color:#8b95ab;">Override status:
      <select id="statusSelect" style="width:100%;margin-top:6px;padding:6px;background:#0f1420;color:#e7ebf5;border:1px solid #263049;border-radius:6px;">
        <option value="PENDING" ${o.status === 'PENDING' ? 'selected' : ''}>PENDING</option>
        <option value="APPROVED" ${o.status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
        <option value="UNDER_REVIEW" ${o.status === 'UNDER_REVIEW' ? 'selected' : ''}>UNDER_REVIEW</option>
        <option value="BLOCKED" ${o.status === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
      </select>
    </label>
    <button id="saveStatusBtn" style="width:100%;margin-top:10px;padding:8px;background:#5b8cff;color:#fff;border:none;border-radius:6px;cursor:pointer;">Save Status</button>
  `;
  document.getElementById('saveStatusBtn').addEventListener('click', async () => {
    const status = document.getElementById('statusSelect').value;
    await fetch(`/api/orders/${o.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    closeModal();
    loadOrders();
    loadStats();
  });
  modalOverlay.classList.remove('hidden');
}

function closeModal() {
  modalOverlay.classList.add('hidden');
}
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(orderForm);
  const payload = Object.fromEntries(fd.entries());
  if (!payload.ipCountry) delete payload.ipCountry;
  if (!payload.accountAgeDays) delete payload.accountAgeDays;
  if (!payload.cardBin) delete payload.cardBin;

  formMsg.textContent = 'Scoring order...';
  formMsg.style.color = '#8b95ab';

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    formMsg.textContent = data.error || 'Failed to submit order';
    formMsg.style.color = '#ff4d4f';
    return;
  }

  formMsg.textContent = `Order scored: ${data.riskLevel} (${data.riskScore}) — ${data.recommendedAction}`;
  formMsg.style.color = '#34c77b';
  orderForm.reset();
  orderForm.quantity.value = 1;
  loadOrders();
  loadStats();
});

riskFilter.addEventListener('change', loadOrders);

loadOrders();
loadStats();
