// =========================================================
// CONFIG — Change ONLY this when deploying
// =========================================================
const backendBase = "https://mines-backend-hnvj.onrender.com";

// =========================================================
// GAME CONSTANTS
// =========================================================
const TOTAL = 25;
const MINES = 22;
const GEMS = 3;

// UI ELEMENTS - Auth
const authForms = document.getElementById("auth-forms");
const regUser = document.getElementById("reg-user");
const regPass = document.getElementById("reg-pass");
const btnRegister = document.getElementById("btn-register");
const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const btnLogin = document.getElementById("btn-login");

// UI ELEMENTS - Player Area
const playerArea = document.getElementById("player-area");
const playerNameEl = document.getElementById("player-name");
const playerCreditsEl = document.getElementById("player-credits");
const btnLogout = document.getElementById("btn-logout");
const btnDeposit = document.getElementById("btn-deposit");
const btnWithdraw = document.getElementById("btn-withdraw");

// UI ELEMENTS - Game
const gridEl = document.getElementById("grid");
const foundEl = document.getElementById("found");
let messageEl = document.getElementById("message");
// Fallback: if message element was removed from HTML, recreate it so
// start round logic does not crash with "Cannot set properties of null".
if (!messageEl) {
  messageEl = document.createElement('div');
  messageEl.id = 'message';
  // Prefer existing .status container
  const statusContainer = document.querySelector('.status');
  if (statusContainer) {
    statusContainer.appendChild(messageEl);
  } else {
    // Create a status wrapper if missing
    const gameArea = document.querySelector('.game-area');
    if (gameArea) {
      const statusDiv = document.createElement('div');
      statusDiv.className = 'status';
      statusDiv.appendChild(messageEl);
      gameArea.insertBefore(statusDiv, gameArea.firstChild);
    }
  }
}

// Central helper: always obtain a valid message element
function ensureMessageEl() {
  if (messageEl && messageEl instanceof HTMLElement) return messageEl;
  messageEl = document.getElementById('message');
  if (!messageEl) {
    const statusContainer = document.querySelector('.status');
    if (statusContainer) {
      messageEl = document.createElement('div');
      messageEl.id = 'message';
      statusContainer.appendChild(messageEl);
    } else {
      const gameArea = document.querySelector('.game-area');
      if (gameArea) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'status';
        messageEl = document.createElement('div');
        messageEl.id = 'message';
        statusDiv.appendChild(messageEl);
        gameArea.insertBefore(statusDiv, gameArea.firstChild);
      }
    }
  }
  return messageEl;
}
const startBtn = document.getElementById("start");
const restartBtn = document.getElementById("restart");

// UI ELEMENTS - Deposit Modal
const depositModal = document.getElementById("deposit-modal");
const depositTxid = document.getElementById("deposit-txid");
const depositSubmit = document.getElementById("deposit-submit");
const copyUpiBtn = document.getElementById("copy-upi");
const upiIdEl = document.getElementById("upi-id");

// UI ELEMENTS - Withdraw Modal
const withdrawModal = document.getElementById("withdraw-modal");
const withdrawUpi = document.getElementById("withdraw-upi");
const withdrawAmount = document.getElementById("withdraw-amount");
const withdrawSubmit = document.getElementById("withdraw-submit");
const withdrawMsg = document.getElementById("withdraw-msg");

// UI ELEMENTS - History
const historyTabs = document.querySelectorAll(".history-tab");
const historyList = document.getElementById("history-list");

// =========================================================
// APP STATE
// =========================================================
let layout = [];
let found = 0;
let finished = false;
let roundActive = false;
let currentHistoryFilter = 'all';

// =========================================================
// AUTH HELPERS
// =========================================================
function getToken() {
  return localStorage.getItem("mines_token");
}
function setToken(t) {
  if (t) localStorage.setItem("mines_token", t);
  else localStorage.removeItem("mines_token");
}

function currentUser() {
  return localStorage.getItem("mines_current");
}
function setCurrentUser(u) {
  if (u) localStorage.setItem("mines_current", u);
  else {
    localStorage.removeItem("mines_current");
    setToken(null);
  }
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: "Bearer " + t } : {};
}

// =========================================================
// AUTH: REGISTER
// =========================================================
btnRegister.addEventListener("click", () => {
  const u = regUser.value.trim();
  const p = regPass.value.trim();

  fetch(`${backendBase}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: u, password: p })
  })
    .then((res) => res.json())
    .then((j) => {
      if (!j.ok) return alert("Register failed: " + j.error);
      setToken(j.token);
      setCurrentUser(u);
      showPlayerArea();
    })
    .catch(() => alert("Cannot reach server"));
});

// =========================================================
// AUTH: LOGIN
// =========================================================
btnLogin.addEventListener("click", () => {
  const u = loginUser.value.trim();
  const p = loginPass.value.trim();

  fetch(`${backendBase}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: u, password: p })
  })
    .then((res) => res.json())
    .then((j) => {
      if (!j.ok) return alert("Login failed: " + j.error);
      setToken(j.token);
      setCurrentUser(u);
      showPlayerArea();
    })
    .catch(() => alert("Cannot reach server"));
});

// =========================================================
// LOGOUT
// =========================================================
btnLogout.addEventListener("click", () => {
  setCurrentUser(null);
  hidePlayerArea();
});

// =========================================================
// UI HANDLERS
// =========================================================
function showPlayerArea() {
  authForms.style.display = "none";
  playerArea.style.display = "block";
  playerNameEl.textContent = currentUser();
  syncCreditsFromServer();
  loadTransactionHistory();
}

function hidePlayerArea() {
  authForms.style.display = "flex";
  playerArea.style.display = "none";
}

// =========================================================
// CREDIT DISPLAY SYNC
// =========================================================
async function syncCreditsFromServer() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`${backendBase}/api/me`, {
      headers: authHeaders(),
    });

    const j = await res.json();
    if (j.ok && j.user) {
      playerCreditsEl.textContent = j.user.credits;
    }
  } catch (e) {
    console.warn("Sync failed");
  }
}

// =========================================================
// MODAL HANDLERS
// =========================================================
function openModal(modal) {
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.setAttribute("aria-hidden", "true");
  if (modal === depositModal) {
    depositTxid.value = '';
  } else if (modal === withdrawModal) {
    withdrawUpi.value = '';
    withdrawAmount.value = '';
    withdrawMsg.textContent = '';
  }
}

// Deposit button
btnDeposit.addEventListener("click", () => {
  openModal(depositModal);
});

// Withdraw button
btnWithdraw.addEventListener("click", () => {
  openModal(withdrawModal);
});

// Close buttons
document.querySelectorAll(".modal-close").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const modalName = e.target.dataset.modal;
    if (modalName === "deposit") closeModal(depositModal);
    else if (modalName === "withdraw") closeModal(withdrawModal);
  });
});

// Cancel buttons
document.querySelectorAll(".modal-cancel").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const modalName = e.target.dataset.modal;
    if (modalName === "deposit") closeModal(depositModal);
    else if (modalName === "withdraw") closeModal(withdrawModal);
  });
});

// Close on backdrop click
[depositModal, withdrawModal].forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

// Close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (depositModal && depositModal.getAttribute("aria-hidden") === "false") closeModal(depositModal);
    if (withdrawModal && withdrawModal.getAttribute("aria-hidden") === "false") closeModal(withdrawModal);
  }
});

// =========================================================
// DEPOSIT: SUBMIT TXID
// =========================================================
depositSubmit.addEventListener("click", async () => {
  const u = currentUser();
  const tx = depositTxid.value.trim();
  if (!tx) return alert("Please enter TXID");

  try {
    const res = await fetch(`${backendBase}/api/txid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: u, txid: tx })
    });

    const j = await res.json();
    if (!j.ok) return alert(j.error);
    
    alert("TXID submitted. Waiting for admin approval.");
    closeModal(depositModal);
  } catch (e) {
    alert("Server offline");
  }
});

// =========================================================
// WITHDRAW: SUBMIT REQUEST
// =========================================================
withdrawSubmit.addEventListener("click", async () => {
  const u = currentUser();
  const upi = withdrawUpi.value.trim();
  const amount = Number(withdrawAmount.value);

  if (!upi) {
    withdrawMsg.textContent = "Please enter UPI ID";
    return;
  }

  if (amount < 25) {
    withdrawMsg.textContent = "Minimum withdrawal is 25 credits";
    return;
  }

  try {
    const res = await fetch(`${backendBase}/api/user/${encodeURIComponent(u)}/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ amount, email: upi }),
    });

    const j = await res.json();
    if (!j.ok) {
      withdrawMsg.textContent = j.error;
      return;
    }

    withdrawMsg.textContent = "Withdrawal request submitted!";
    setTimeout(() => {
      closeModal(withdrawModal);
      syncCreditsFromServer();
      loadTransactionHistory();
    }, 1500);
  } catch (e) {
    withdrawMsg.textContent = "Server error";
  }
});

// =========================================================
// COPY UPI
// =========================================================
copyUpiBtn.addEventListener("click", async () => {
  const text = upiIdEl ? upiIdEl.textContent.trim() : '';
  if (!text) return alert('No UPI ID available to copy');
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try { 
      await navigator.clipboard.writeText(text); 
      alert('UPI copied to clipboard'); 
    } catch (e) { 
      fallbackCopy(text); 
    }
  } else {
    fallbackCopy(text);
  }
});

function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text; 
  ta.style.position = 'fixed'; 
  ta.style.left = '-9999px';
  document.body.appendChild(ta); 
  ta.select();
  try { 
    document.execCommand('copy'); 
    alert('UPI copied to clipboard'); 
  } catch (e) { 
    alert('Copy failed — please long-press the UPI and copy manually'); 
  }
  ta.remove();
}

// =========================================================
// TRANSACTION HISTORY
// =========================================================
async function loadTransactionHistory(filter = 'all') {
  const u = currentUser();
  if (!u) return;

  try {
    const typeParam = filter === 'all' ? '' : `?type=${filter}`;
    const res = await fetch(`${backendBase}/api/user/${encodeURIComponent(u)}/transactions${typeParam}`, {
      headers: authHeaders(),
    });

    const j = await res.json();
    if (!j.ok || !j.transactions) {
      historyList.innerHTML = '<li style="text-align:center;color:#9fb3c7;">No transactions yet</li>';
      return;
    }

    renderTransactionHistory(j.transactions, filter);
  } catch (e) {
    console.warn("Failed to load transaction history", e);
    historyList.innerHTML = '<li style="text-align:center;color:#9fb3c7;">Failed to load history</li>';
  }
}

function renderTransactionHistory(transactions, filter) {
  historyList.innerHTML = '';

  if (transactions.length === 0) {
    historyList.innerHTML = '<li style="text-align:center;color:#9fb3c7;">No transactions yet</li>';
    return;
  }

  let filtered = transactions;
  if (filter === 'deposits') {
    filtered = transactions.filter(t => t.type === 'deposit');
  } else if (filter === 'withdrawals') {
    filtered = transactions.filter(t => t.type === 'withdrawal');
  } else if (filter === 'bets') {
    filtered = transactions.filter(t => t.type === 'bet' || t.type === 'win');
  }

  if (filtered.length === 0) {
    historyList.innerHTML = '<li style="text-align:center;color:#9fb3c7;">No transactions in this category</li>';
    return;
  }

  filtered.forEach(tx => {
    const li = document.createElement('li');
    li.className = tx.amount >= 0 ? 'positive' : 'negative';

    const amountSpan = document.createElement('span');
    amountSpan.className = `amount ${tx.amount >= 0 ? 'positive' : 'negative'}`;
    amountSpan.textContent = tx.amount >= 0 ? `+${tx.amount}` : `${tx.amount}`;

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'details';
    detailsDiv.innerHTML = `
      <div style="font-weight:600;">${getTypeLabel(tx.type)}</div>
      <div style="font-size:13px;color:#9fb3c7;">${tx.details?.description || ''}</div>
    `;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'date';
    dateSpan.textContent = new Date(tx.date).toLocaleString();

    li.appendChild(amountSpan);
    li.appendChild(detailsDiv);
    li.appendChild(dateSpan);
    historyList.appendChild(li);
  });
}

function getTypeLabel(type) {
  switch(type) {
    case 'deposit': return '💰 Deposit';
    case 'withdrawal': return '💸 Withdrawal';
    case 'bet': return '🎮 Game Bet';
    case 'win': return '🎉 Game Win';
    default: return type;
  }
}

// History tab switching
historyTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    historyTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    const filter = tab.dataset.tab;
    currentHistoryFilter = filter;
    
    let apiFilter = 'all';
    if (filter === 'deposits') apiFilter = 'deposit';
    else if (filter === 'withdrawals') apiFilter = 'withdrawal';
    else if (filter === 'bets') apiFilter = 'all';
    
    loadTransactionHistory(filter === 'all' ? 'all' : apiFilter);
  });
});

// =========================================================
// GAME LOGIC
// =========================================================
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

startBtn.addEventListener("click", async () => {
  const u = currentUser();
  if (!u) {
    alert("Session expired. Please log in again.");
    return;
  }

  // Provide immediate UI feedback
  startBtn.disabled = true;
  const originalText = startBtn.textContent;
  startBtn.textContent = "Starting...";
  ensureMessageEl().textContent = "";

  try {
    const res = await fetch(`${backendBase}/api/user/${encodeURIComponent(u)}/debit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ amount: 5 }),
    });

    let j = {};
    try { j = await res.json(); } catch { j = { ok: false, error: "Invalid server response" }; }

    if (!j.ok) {
      const errMsg = j.error || "Unable to start round";
      ensureMessageEl().textContent = errMsg;
      alert(errMsg);
      startBtn.disabled = false;
      startBtn.textContent = originalText;
      return;
    }

    await syncCreditsFromServer();
    loadTransactionHistory(currentHistoryFilter);
    beginRound();
  } catch (e) {
    const errMsg = "Network error starting round. Please wait and retry.";
    console.warn("Start round network error", e);
    ensureMessageEl().textContent = errMsg;
    alert("Failed to start round: " + (e.message || "network error"));
    startBtn.disabled = false;
    startBtn.textContent = originalText;
  }
});

restartBtn.addEventListener("click", resetRoundUI);

function beginRound() {
  found = 0;
  roundActive = true;
  ensureMessageEl().textContent = "";
  messageEl.className = "";
  layout = shuffle(Array(MINES).fill("mine").concat(Array(GEMS).fill("gem")));

  renderGrid();
  startBtn.disabled = true;
  restartBtn.style.display = "inline-block";
}

function resetRoundUI() {
  gridEl.innerHTML = "";
  startBtn.disabled = false;
  restartBtn.style.display = "none";
  foundEl.textContent = "0";
  ensureMessageEl().textContent = "";
  messageEl.className = "";
}

function renderGrid() {
  gridEl.innerHTML = "";
  foundEl.textContent = "0";
  
  for (let i = 0; i < TOTAL; i++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.dataset.i = i;
    cell.addEventListener("click", onCellClick);
    gridEl.appendChild(cell);
  }
}

function onCellClick(e) {
  if (!roundActive) return;

  const btn = e.target;
  const idx = Number(btn.dataset.i);
  const type = layout[idx];

  btn.disabled = true;
  btn.classList.add("revealed");

  if (type === "mine") {
    btn.textContent = "💣";
    btn.classList.add("mine");
    loseRound();
  } else {
    btn.textContent = "💎";
    btn.classList.add("gem");
    found++;
    foundEl.textContent = found;
    
    // Win immediately upon finding any gem
    winRound();
  }
}

function loseRound() {
  roundActive = false;
  ensureMessageEl().textContent = "Game Over!";
  messageEl.className = "lose";
  revealAll();
  startBtn.disabled = false;
}

async function winRound() {
  roundActive = false;
  ensureMessageEl().textContent = "YOU WIN +25 CREDITS!";
  messageEl.className = "win";

  const u = currentUser();
  
  try {
    await fetch(`${backendBase}/api/user/${encodeURIComponent(u)}/credit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ amount: 25 }),
    });
    
    syncCreditsFromServer();
    loadTransactionHistory(currentHistoryFilter);
  } catch (e) {
    console.warn("Failed to credit win");
  }

  revealAll();
  startBtn.disabled = false;
}

function revealAll() {
  gridEl.querySelectorAll(".cell").forEach((c, i) => {
    const t = layout[i];
    c.classList.add('revealed');
    // ensure semantic class for styling (.mine / .gem)
    if (t === 'mine') {
      c.classList.add('mine');
      c.textContent = '💣';
    } else if (t === 'gem') {
      c.classList.add('gem');
      c.textContent = '💎';
    }
    c.disabled = true;
  });
}

// =========================================================
// AUTO-SYNC WHEN TAB COMES BACK
// =========================================================
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    syncCreditsFromServer();
    loadTransactionHistory(currentHistoryFilter);
  }
});

// =========================================================
// AUTO SHOW AREA IF LOGGED IN
// =========================================================
if (currentUser()) showPlayerArea();

