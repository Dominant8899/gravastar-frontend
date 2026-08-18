// ===== ADMIN DASHBOARD JAVASCRIPT — connected to Django API =====

// Security check on Load — asks the SERVER who's logged in
window.addEventListener("DOMContentLoaded", async () => {
  const session = await whoami();
  if (!session.isLoggedIn || session.role !== "admin") {
    alert("Access denied. Admins only.");
    window.location.href = "login.html";
    return;
  }
  fetchAndRenderProducts();
});

// Navigation Tab Switcher — accepts explicit event object
function showTab(evt, tabName) {
  document
    .querySelectorAll(".admin-section")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".admin-nav-item")
    .forEach((el) => el.classList.remove("active"));

  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add("active");
  }

  if (tabName === "products") {
    document.getElementById("productsTab").classList.add("active");
  } else if (tabName === "orders") {
    document.getElementById("ordersTab").classList.add("active");
    renderOrders();
  } else if (tabName === "coupons") {
    document.getElementById("couponsTab").classList.add("active");
    fetchAndRenderCoupons();
  } else {
    document.getElementById("customersTab").classList.add("active");
    renderCustomers();
  }
}

// ---------- PRODUCTS: backed by Django ----------

let products = []; // in-memory cache of what the API last returned

async function fetchAndRenderProducts() {
  try {
    const res = await fetch(`${API_BASE}/products/`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    products = data.products;
    renderTable();
  } catch (err) {
    console.error("Failed to load products from Django:", err);
    const tbody = document.getElementById("productTableBody");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px 0; color:#e00;">
      Couldn't reach the backend at ${API_BASE}. Is "python manage.py runserver" running?
    </td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById("productTableBody");
  tbody.innerHTML = "";

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px 0; color:#888;">No products yet. Add one above.</td></tr>`;
    return;
  }

  products.forEach((prod) => {
    const row = document.createElement("tr");
    const imgSrc = prod.image || "";
    row.innerHTML = `
      <td>
        ${
          imgSrc
            ? `<img src="${imgSrc}" class="admin-thumb" alt="${prod.name}" onerror="this.src='';this.classList.add('admin-thumb--broken')" />`
            : `<div class="admin-thumb admin-thumb--placeholder">No image</div>`
        }
      </td>
      <td><strong>${prod.name}</strong></td>
      <td>${prod.category}</td>
      <td>${prod.regular_price ? "$" + parseFloat(prod.regular_price).toFixed(2) : "—"}</td>
      <td>$${parseFloat(prod.price).toFixed(2)}</td>
      <td>${prod.stock} units</td>
      <td>
        <button class="btn-crud btn-edit" data-action="edit" data-id="${prod.id}">Edit</button>
        <button class="btn-crud btn-delete" data-action="delete" data-id="${prod.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

document.getElementById("productTableBody").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "edit") editProduct(id);
  else if (btn.dataset.action === "delete") deleteProduct(id);
});

// Helper function to read uploaded image files as Base64 URLs
function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// CREATE or UPDATE product
async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("productId").value;
  const name = document.getElementById("productName").value;
  const category = document.getElementById("productCategory").value;
  const price = document.getElementById("productPrice").value;
  const regularPrice = document.getElementById("productRegularPrice").value;
  const stock = document.getElementById("productStock").value;
  let image = document.getElementById("productImage").value.trim();
  const productType = document.getElementById("productType").value;
  const fileInput = document.getElementById("productImageFile");

  if (fileInput && fileInput.files[0]) {
    try {
      image = await getBase64(fileInput.files[0]);
    } catch (err) {
      console.error("Error reading uploaded image file:", err);
    }
  }

  const payload = {
    name,
    category,
    product_type: productType,
    price,
    regular_price: regularPrice || null,
    stock,
    image,
  };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_BASE}/products/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API_BASE}/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded ${res.status}`);
    }

    resetProductForm();
    await fetchAndRenderProducts();
  } catch (err) {
    alert("Couldn't save product: " + err.message);
    console.error(err);
  }
}

// EDIT: Populate form with existing product values
function editProduct(id) {
  const prod = products.find((p) => String(p.id) === String(id));
  if (prod) {
    document.getElementById("productId").value = prod.id;
    document.getElementById("productName").value = prod.name;
    document.getElementById("productCategory").value = prod.category;
    document.getElementById("productPrice").value = prod.price;
    document.getElementById("productRegularPrice").value =
      prod.regular_price || "";
    document.getElementById("productStock").value = prod.stock;
    document.getElementById("productImage").value = prod.image || "";
    document.getElementById("productType").value = prod.product_type || "";
    document.getElementById("formTitle").textContent =
      `Edit Product (#${prod.id})`;
    document.getElementById("submitProductBtn").textContent = "Update Product";
    document.getElementById("cancelBtn").style.display = "inline-block";
  }
}

// DELETE Product
async function deleteProduct(id) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const res = await fetch(`${API_BASE}/products/${id}/`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    await fetchAndRenderProducts();
  } catch (err) {
    alert("Couldn't delete product: " + err.message);
    console.error(err);
  }
}

// Reset form to Add state
function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("formTitle").textContent = "Add New Product";
  document.getElementById("submitProductBtn").textContent = "Save Product";
  document.getElementById("cancelBtn").style.display = "none";

  const fileInput = document.getElementById("productImageFile");
  if (fileInput) fileInput.value = "";
}

// Import real products from live storefront pages
async function importProductsFromStore() {
  const pages = [
    { file: "keyboard.html", category: "Keyboard" },
    { file: "mouse.html", category: "Mice" },
    { file: "speaker.html", category: "Speaker" },
    { file: "bundle.html", category: "Bundle" },
  ];

  let importedCount = 0;
  let errorCount = 0;

  for (const pageInfo of pages) {
    try {
      const response = await fetch(pageInfo.file);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const cards = doc.querySelectorAll(".product-card");

      for (const card of cards) {
        const title = card.querySelector(".product-title")?.textContent.trim();
        if (!title) continue;

        const priceText = card.querySelector(".sale-price")?.textContent || "0";
        const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
        const image =
          card.querySelector(".product-image img")?.getAttribute("src") ||
          card.querySelector("img")?.getAttribute("src") ||
          "";

        try {
          const res = await fetch(`${API_BASE}/products/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: title,
              category: pageInfo.category,
              price,
              stock: 0,
              image,
            }),
          });
          if (res.ok) importedCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }
    } catch (err) {
      console.error(`Could not import from ${pageInfo.file}:`, err);
    }
  }

  await fetchAndRenderProducts();
  alert(
    `Import complete!\n\nSaved: ${importedCount} products\nErrors: ${errorCount}\n\nNote: Stock defaults to 0 — edit each product to set real stock levels. Products already in the database were updated in place (create-or-update, no duplicates).`,
  );
}

function adminLogout() {
  apiLogout().finally(() => {
    window.location.href = "login.html";
  });
}

// ---------- Customers & Orders ----------

let cachedOrders = null;

async function fetchOrders() {
  if (cachedOrders) return cachedOrders;
  try {
    const res = await fetch(`${API_BASE}/orders/`, { credentials: "include" });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    cachedOrders = data.orders;
  } catch (err) {
    console.error("Failed to load orders from Django:", err);
    cachedOrders = [];
  }
  return cachedOrders;
}

async function renderCustomers() {
  const orders = await fetchOrders();
  const tbody = document.getElementById("customerTableBody");

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px 0; color:#888;">No customers yet.</td></tr>`;
    return;
  }

  const customerMap = {};
  orders.forEach((order) => {
    const key = order.customerEmail || order.customerName;
    if (!customerMap[key]) {
      customerMap[key] = {
        name: order.customerName,
        email: order.customerEmail,
        orderCount: 0,
      };
    }
    customerMap[key].orderCount += 1;
  });

  const customers = Object.values(customerMap);
  tbody.innerHTML = customers
    .map(
      (c, i) => `
    <tr>
      <td>#C-${100 + i + 1}</td>
      <td>${c.name}</td>
      <td>${c.email || "—"}</td>
      <td>${c.orderCount} Order${c.orderCount === 1 ? "" : "s"}</td>
      <td><span style="color: green; font-weight: bold">Active</span></td>
    </tr>
  `,
    )
    .join("");
}

async function renderOrders() {
  const orders = await fetchOrders();
  const tbody = document.getElementById("orderTableBody");

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px 0; color:#888;">No orders placed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders
    .map((order) => {
      const itemSummary = order.items
        .map((it) => `${it.title} x${it.qty}`)
        .join(", ");
      return `
    <tr>
      <td>#${order.orderNum}</td>
      <td>${order.date}</td>
      <td>${order.customerName}</td>
      <td>${itemSummary}</td>
      <td>$${order.total.toFixed(2)}</td>
    </tr>
  `;
    })
    .join("");
}

/* for top control panel toggle */
document.addEventListener("DOMContentLoaded", () => {
  const panelWrapper = document.getElementById("controlPanelWrapper");
  const panelBar = document.getElementById("controlPanelBar");

  if (panelBar && panelWrapper) {
    panelBar.addEventListener("click", () => {
      panelWrapper.classList.toggle("open");
    });
  }
});

// ---------- COUPONS: backed by Django ----------

let coupons = []; // in-memory cache of what the API last returned

async function fetchAndRenderCoupons() {
  try {
    const res = await fetch(`${API_BASE}/coupons/`, { credentials: "include" });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    coupons = data.coupons || [];
    renderCouponTable();
  } catch (err) {
    console.error("Couldn't load coupons:", err);
  }
}

function renderCouponTable() {
  const tbody = document.getElementById("couponTableBody");
  tbody.innerHTML = "";

  if (coupons.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px 0; color:#888;">No coupons yet. Add one above.</td></tr>`;
    return;
  }

  coupons.forEach((c) => {
    const row = document.createElement("tr");
    const valueDisplay =
      c.discountType === "percentage"
        ? `${parseFloat(c.discountValue)}%`
        : `$${parseFloat(c.discountValue).toFixed(2)}`;
    row.innerHTML = `
      <td><strong>${c.code}</strong></td>
      <td>${c.discountType === "percentage" ? "Percentage" : "Fixed Amount"}</td>
      <td>${valueDisplay}</td>
      <td>${c.minOrderAmount > 0 ? "$" + parseFloat(c.minOrderAmount).toFixed(2) : "—"}</td>
      <td>${c.expiresAt || "Never"}</td>
      <td>${c.isActive ? "Active" : "Inactive"}</td>
      <td>
        <button class="btn-crud btn-edit" data-action="edit" data-id="${c.id}">Edit</button>
        <button class="btn-crud btn-delete" data-action="delete" data-id="${c.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

document.getElementById("couponTableBody").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "edit") editCoupon(id);
  else if (btn.dataset.action === "delete") deleteCoupon(id);
});

// CREATE or UPDATE coupon
async function handleCouponSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("couponId").value;
  const code = document.getElementById("couponCode").value.trim().toUpperCase();
  const discountType = document.getElementById("couponDiscountType").value;
  const discountValue = document.getElementById("couponDiscountValue").value;
  const minOrderAmount = document.getElementById("couponMinOrder").value;
  const expiresAt = document.getElementById("couponExpiresAt").value;
  const isActive = document.getElementById("couponIsActive").value === "true";

  const payload = {
    code,
    discountType,
    discountValue,
    minOrderAmount: minOrderAmount || 0,
    expiresAt: expiresAt || null,
    isActive,
  };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_BASE}/coupons/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API_BASE}/coupons/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded ${res.status}`);
    }

    resetCouponForm();
    await fetchAndRenderCoupons();
  } catch (err) {
    alert("Couldn't save coupon: " + err.message);
    console.error(err);
  }
}

// EDIT: Populate form with existing coupon values
function editCoupon(id) {
  const c = coupons.find((item) => String(item.id) === String(id));
  if (c) {
    document.getElementById("couponId").value = c.id;
    document.getElementById("couponCode").value = c.code;
    document.getElementById("couponDiscountType").value = c.discountType;
    document.getElementById("couponDiscountValue").value = c.discountValue;
    document.getElementById("couponMinOrder").value =
      c.minOrderAmount > 0 ? c.minOrderAmount : "";
    document.getElementById("couponExpiresAt").value = c.expiresAt || "";
    document.getElementById("couponIsActive").value = c.isActive
      ? "true"
      : "false";
    document.getElementById("couponFormTitle").textContent =
      `Edit Coupon (#${c.id})`;
    document.getElementById("submitCouponBtn").textContent = "Update Coupon";
    document.getElementById("cancelCouponBtn").style.display = "inline-block";
  }
}

// DELETE Coupon
async function deleteCoupon(id) {
  if (!confirm("Are you sure you want to delete this coupon?")) return;

  try {
    const res = await fetch(`${API_BASE}/coupons/${id}/`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    await fetchAndRenderCoupons();
  } catch (err) {
    alert("Couldn't delete coupon: " + err.message);
    console.error(err);
  }
}

// Reset form to Add state
function resetCouponForm() {
  document.getElementById("couponForm").reset();
  document.getElementById("couponId").value = "";
  document.getElementById("couponFormTitle").textContent = "Add New Coupon";
  document.getElementById("submitCouponBtn").textContent = "Save Coupon";
  document.getElementById("cancelCouponBtn").style.display = "none";
}
