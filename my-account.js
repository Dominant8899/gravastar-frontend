// my-account.js
//
// Renders the My Account page: profile info (read + edit), password
// change, and purchase history — all fetched fresh from the Django
// backend via the apiFetch()/whoami() helpers already defined in
// auth.js (loaded before this file, see my-account.html).

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("accountRoot");
  const session = await whoami();

  if (!session.isLoggedIn) {
    const template = document.getElementById("accountGuestTemplate");
    root.innerHTML = "";
    root.appendChild(template.content.cloneNode(true));
    return;
  }

  renderAccountPage(root, session);
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function renderAccountPage(root, session) {
  const initial = (session.name || "?").trim().charAt(0).toUpperCase();

  root.innerHTML = `
    <section class="account-hero">
      <div class="account-hero-inner">
        <div class="account-avatar-lg">${initial}</div>
        <div>
          <h1>${escapeHtml(session.name)}</h1>
          <p>${escapeHtml(session.email)}</p>
        </div>
      </div>
    </section>

    <div class="account-content">
      <div class="account-card">
        <div class="account-card-header">
          <div>
            <h2>Profile Information</h2>
          </div>
          <button class="btn-edit-profile" id="editProfileBtn">Edit Profile</button>
        </div>

        <div class="account-info-grid" id="profileInfoGrid">
          <div class="account-info-field">
            <label>Full Name</label>
            <span id="infoName">${escapeHtml(session.name)}</span>
          </div>
          <div class="account-info-field">
            <label>Email Address</label>
            <span id="infoEmail">${escapeHtml(session.email)}</span>
          </div>
          <div class="account-info-field">
            <label>Phone Number</label>
            <span id="infoPhone">${escapeHtml(session.phone) || "—"}</span>
          </div>
          <div class="account-info-field">
            <label>City</label>
            <span id="infoCity">${escapeHtml(session.city) || "—"}</span>
          </div>
        </div>

        <form class="account-edit-form" id="editProfileForm">
          <div>
            <label for="editName">Full Name</label>
            <input type="text" id="editName" value="${escapeHtml(session.name)}" required />
          </div>
          <div>
            <label for="editPhone">Phone Number</label>
            <input type="text" id="editPhone" value="${escapeHtml(session.phone)}" placeholder="e.g. 012 345 678" />
          </div>
          <div>
            <label for="editCity">City</label>
            <input type="text" id="editCity" value="${escapeHtml(session.city)}" placeholder="e.g. Phnom Penh" />
          </div>

          <button type="button" class="account-password-toggle" id="showPasswordFormBtn">
            Want to change your password? Click here
          </button>

          <div id="passwordFields" style="display: none;">
            <div>
              <label for="currentPassword">Current Password</label>
              <input type="password" id="currentPassword" autocomplete="current-password" />
            </div>
            <div>
              <label for="newPassword">New Password (min 8 characters)</label>
              <input type="password" id="newPassword" autocomplete="new-password" />
            </div>
          </div>

          <div class="account-edit-actions">
            <button type="submit" class="btn-save-profile">Save Changes</button>
            <button type="button" class="btn-cancel-edit" id="cancelEditBtn">Cancel</button>
          </div>
        </form>
      </div>

      <div class="account-card">
        <div class="account-card-header">
          <div>
            <h2>Purchase History</h2>
          </div>
        </div>
        <div id="orderHistoryCount" class="order-history-count"></div>
        <div id="orderHistoryList"></div>
      </div>
    </div>
  `;

  wireProfileEditing(session);
  loadOrderHistory();
}

function wireProfileEditing(session) {
  const infoGrid = document.getElementById("profileInfoGrid");
  const editBtn = document.getElementById("editProfileBtn");
  const form = document.getElementById("editProfileForm");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const showPasswordBtn = document.getElementById("showPasswordFormBtn");
  const passwordFields = document.getElementById("passwordFields");

  function openEdit() {
    infoGrid.classList.add("hidden-while-editing");
    form.classList.add("open");
    editBtn.style.display = "none";
  }

  function closeEdit() {
    infoGrid.classList.remove("hidden-while-editing");
    form.classList.remove("open");
    editBtn.style.display = "";
    passwordFields.style.display = "none";
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
  }

  editBtn.addEventListener("click", openEdit);
  cancelBtn.addEventListener("click", closeEdit);

  showPasswordBtn.addEventListener("click", () => {
    passwordFields.style.display =
      passwordFields.style.display === "none" ? "block" : "none";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = form.querySelector(".btn-save-profile");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      // 1. Save name/phone/city — always attempted.
      const updated = await apiFetch("/auth/profile/", {
        method: "PATCH",
        body: JSON.stringify({
          name: document.getElementById("editName").value.trim(),
          phone: document.getElementById("editPhone").value.trim(),
          city: document.getElementById("editCity").value.trim(),
        }),
      });

      // 2. Only attempt a password change if they actually typed
      // something in — this form doubles as "just edit my name" too.
      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      if (currentPassword || newPassword) {
        await apiFetch("/auth/change-password/", {
          method: "POST",
          body: JSON.stringify({ currentPassword, newPassword }),
        });
      }

      // Full reload (rather than re-rendering in place) makes it obvious
      // the save actually happened — you land back on a fresh copy of
      // the page with your new info already showing, instead of the
      // form just quietly closing.
      alert("Profile updated!");
      window.location.reload();
    } catch (err) {
      alert(err.message || "Couldn't save your changes. Please try again.");
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
    }
  });
}

async function loadOrderHistory() {
  const countEl = document.getElementById("orderHistoryCount");
  const listEl = document.getElementById("orderHistoryList");

  let orders = [];
  try {
    const result = await apiFetch("/orders/");
    orders = result.orders || [];
  } catch (_) {
    listEl.innerHTML = `<div class="account-empty-state">Couldn't load your order history right now.</div>`;
    return;
  }

  if (orders.length === 0) {
    countEl.textContent = "";
    listEl.innerHTML = `<div class="account-empty-state">No orders yet — once you check out, they'll show up here.</div>`;
    return;
  }

  countEl.textContent = `${orders.length} order${orders.length === 1 ? "" : "s"} placed`;

  listEl.innerHTML = orders
    .map((o, index) => {
      const rowId = `orderItems${index}`;
      const itemsHtml = (o.items || [])
        .map(
          (item) => `
        <div class="order-item-row">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="order-item-thumb" onerror="this.style.visibility='hidden'" />
          <div class="order-item-info">
            <span class="order-item-title">${escapeHtml(item.title)}</span>
            <span class="order-item-qty">Qty: ${item.qty} &times; $${Number(item.price).toFixed(2)}</span>
          </div>
          <span class="order-item-line-total">$${(item.qty * Number(item.price)).toFixed(2)}</span>
        </div>
      `,
        )
        .join("");

      return `
    <div class="order-row-wrapper">
      <button type="button" class="order-row" onclick="toggleOrderDetails('${rowId}', this)">
        <div class="order-row-main">
          <strong>Order #${escapeHtml(o.orderNum)}</strong>
          <span>Date: ${escapeHtml(o.date)}</span>
        </div>
        <div class="order-row-right">
          <span class="order-total">$${Number(o.total).toFixed(2)}</span>
          <span class="order-status ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span>
        </div>
        <span class="order-row-chevron">&#9660;</span>
      </button>

      <div class="order-details" id="${rowId}">
        <div class="order-items-list">${itemsHtml}</div>
        <div class="order-summary-lines">
          <div><span>Subtotal</span><span>$${Number(o.subtotal).toFixed(2)}</span></div>
          <div><span>Discount</span><span>${Number(o.discount) > 0 ? "-$" + Number(o.discount).toFixed(2) : "$0.00"}</span></div>
          <div><span>Shipping</span><span>${Number(o.shipping) > 0 ? "$" + Number(o.shipping).toFixed(2) : "FREE"}</span></div>
          <div class="order-summary-total"><span>Total</span><span>$${Number(o.total).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  `;
    })
    .join("");
}

function toggleOrderDetails(rowId, triggerBtn) {
  const panel = document.getElementById(rowId);
  const isOpen = panel.classList.toggle("open");
  triggerBtn.classList.toggle("open", isOpen);
}
