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

// UI ELEMENTS
const gridEl = document.getElementById("grid");
const foundEl = document.getElementById("found");
const messageEl = document.getElementById("message");
const startBtn = document.getElementById("start");
const restartBtn = document.getElementById("restart");

const regUser = document.getElementById("reg-user");
const regPass = document.getElementById("reg-pass");
const btnRegister = document.getElementById("btn-register");
const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const btnLogin = document.getElementById("btn-login");
const playerArea = document.getElementById("player-area");
const authForms = document.getElementById("auth-forms");
const playerNameEl = document.getElementById("player-name");
const playerCreditsEl = document.getElementById("player-credits");
const btnLogout = document.getElementById("btn-logout");
const txidInput = document.getElementById("txid");
const btnAddCredits = document.getElementById("btn-add-credits");
const qrModal = document.getElementById("qr-modal");
const qrClose = document.getElementById("qr-close");
const modalTxid = document.getElementById("modal-txid");
const modalSubmit = document.getElementById("modal-submit");
const modalCancel = document.getElementById("modal-cancel");
const copyUpiBtn = document.getElementById("copy-upi");
const upiIdEl = document.getElementById("upi-id");
const redeemEmail = document.getElementById("redeem-email");
const redeemAmount = document.getElementById("redeem-amount");
const btnRedeem = document.getElementById("btn-redeem");
const redeemMsg = document.getElementById("redeem-msg");
const redeemList = document.getElementById("redeem-list");

// =========================================================
// APP STATE
// =========================================================
let layout = [];
let found = 0;
let finished = false;
let roundActive = false;

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
  playerArea.style.display = "";
  playerNameEl.textContent = currentUser();
  syncCreditsFromServer();
  loadRedemptions();
}

function hidePlayerArea() {
  authForms.style.display = "";
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
// ADD CREDITS (TXID)
// =========================================================
btnAddCredits.addEventListener("click", () => {
  qrModal.setAttribute("aria-hidden", "false");
});

modalSubmit.addEventListener("click", () => {
  const u = currentUser();
  const tx = modalTxid.value.trim();
  if (!tx) return alert("Please enter TXID");

  fetch(`${backendBase}/api/txid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: u, txid: tx })
  })
    .then((r) => r.json())
    .then((j) => {
      if (!j.ok) return alert(j.error);
      alert("TXID submitted. Waiting admin approval.");
      qrModal.setAttribute("aria-hidden", "true");
    })
    .catch(() => alert("Server offline"));
});

// =========================================================
// REDEEM
// =========================================================
btnRedeem.addEventListener("click", async () => {
  const u = currentUser();
  const email = redeemEmail.value.trim();
  const amount = Number(redeemAmount.value);

  if (amount < 25) {
    redeemMsg.textContent = "Minimum redeem amount is 25.";
    return;
  }

  const res = await fetch(`${backendBase}/api/user/${encodeURIComponent(u)}/redeem`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ amount, email }),
  });

  const j = await res.json();
  if (!j.ok) return (redeemMsg.textContent = j.error);

  redeemMsg.textContent = "Redeem request submitted";
  syncCreditsFromServer();
  loadRedemptions();
});

// =========================================================
// LOAD REDEMPTIONS
// =========================================================
function loadRedemptions() {
  const u = currentUser();
  fetch(`${backendBase}/api/user/${encodeURIComponent(u)}`, {
    headers: authHeaders(),
  })
    .then((r) => r.json())
    .then((j) => {
      redeemList.innerHTML = "";
      if (!j.ok || !j.user) return;

      j.user.redemptions.slice().reverse().forEach((r) => {
        const li = document.createElement("li");
        li.textContent = `${r.amount} → ${r.email} (${new Date(r.date).toLocaleString()})`;
        redeemList.appendChild(li);
      });
    });
}

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

startBtn.addEventListener("click", () => {
  const u = currentUser();
  fetch(`${backendBase}/api/user/${encodeURIComponent(u)}/debit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ amount: 5 }),
  })
    .then((r) => r.json())
    .then((j) => {
      if (!j.ok) return alert(j.error);
      syncCreditsFromServer();
      beginRound();
    });
});

restartBtn.addEventListener("click", resetRoundUI);

function beginRound() {
  found = 0;
  roundActive = true;
  messageEl.textContent = "";
  messageEl.className = "";
  layout = shuffle(Array(MINES).fill("mine").concat(Array(GEMS).fill("gem")));

  renderGrid();
  startBtn.disabled = true;
  restartBtn.style.display = "";
}

function resetRoundUI() {
  gridEl.innerHTML = "";
  startBtn.disabled = false;
  restartBtn.style.display = "none";
}

function renderGrid() {
  gridEl.innerHTML = "";
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
    loseRound();
  } else {
    btn.textContent = "💎";
    winRound();
  }
}

function loseRound() {
  roundActive = false;
  messageEl.textContent = "Game Over!";
  messageEl.className = "lose";
  revealAll();
  startBtn.disabled = false;
}

function winRound() {
  roundActive = false;
  messageEl.textContent = "YOU WIN +25 CREDITS!";
  messageEl.className = "win";

  const u = currentUser();
  fetch(`${backendBase}/api/user/${encodeURIComponent(u)}/credit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ amount: 25 }),
  }).then(() => syncCreditsFromServer());

  revealAll();
  startBtn.disabled = false;
}

function revealAll() {
  gridEl.querySelectorAll(".cell").forEach((c, i) => {
    if (layout[i] === "mine") {
      c.textContent = "💣";
    }
    c.disabled = true;
  });
}

// =========================================================
// AUTO-SYNC WHEN TAB COMES BACK
// =========================================================
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") syncCreditsFromServer();
});

// =========================================================
// AUTO SHOW AREA IF LOGGED IN
// =========================================================
if (currentUser()) showPlayerArea();