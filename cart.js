document.addEventListener("DOMContentLoaded", () => {
  // --- 1. Initialize Cart State ---
  let cart = [];
  let currentDiscount = 0.0;
  let shippingCost = 0.0;

  // Load saved state from Local Storage immediately
  loadCartFromStorage();

  // DOM Elements - Full Cart Page
  const cartTableBody = document.getElementById("cartTableBody");
  const cartPageSubtotal = document.getElementById("cartPageSubtotal");
  const cartPageDiscount = document.getElementById("cartPageDiscount");
  const cartPageShipping = document.getElementById("cartPageShipping");
  const cartPageGrandTotal = document.getElementById("cartPageGrandTotal");

  // DOM Elements - Drawer
  const cartBtn = document.querySelector(".cart-btn");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartDrawerClose = document.getElementById("cartDrawerClose");
  const cartDrawerBody = document.getElementById("cartDrawerBody");
  const cartCountBadges = document.querySelectorAll(
    ".cart-count, #cartDrawerCount",
  );
  const cartSubtotalAmount = document.getElementById("cartSubtotalAmount");
  const clearCartBtn = document.getElementById("clearCartBtn");

  function openCart() {
    if (cartDrawer && cartOverlay) {
      cartDrawer.classList.add("open");
      cartOverlay.classList.add("open");
    }
  }

  function closeCart() {
    if (cartDrawer && cartOverlay) {
      cartDrawer.classList.remove("open");
      cartOverlay.classList.remove("open");
    }
  }

  // --- Clear Cart Button ---
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", () => {
      if (cart.length === 0) return;
      if (confirm("Remove all items from your cart?")) {
        cart = [];
        updateCartUI();
      }
    });
  }

  if (cartBtn)
    cartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openCart();
    });
  if (cartDrawerClose) cartDrawerClose.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  // --- Add Product Function ---
  function addToCart(product) {
    const existingIndex = cart.findIndex(
      (item) => item.title === product.title,
    );
    if (existingIndex > -1) {
      cart[existingIndex].qty += 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    openCart();
  }

  // --- Update UI ---
  function updateCartUI() {
    saveCartToStorage();

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCountBadges.forEach((el) => (el.textContent = totalQty));

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const grandTotal = Math.max(0, subtotal - currentDiscount + shippingCost);

    if (cartSubtotalAmount)
      cartSubtotalAmount.textContent = `$${subtotal.toFixed(2)} USD`;
    if (cartPageSubtotal)
      cartPageSubtotal.textContent = `$${subtotal.toFixed(2)} USD`;
    if (cartPageDiscount)
      cartPageDiscount.textContent = `-$${currentDiscount.toFixed(2)} USD`;
    if (cartPageShipping)
      cartPageShipping.textContent =
        shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)} USD`;
    if (cartPageGrandTotal)
      cartPageGrandTotal.textContent = `$${grandTotal.toFixed(2)} USD`;

    // Render Drawer
    if (cartDrawerBody) {
      if (cart.length === 0) {
        cartDrawerBody.innerHTML = `<p class="empty-cart-msg">Your cart is currently empty.</p>`;
      } else {
        cartDrawerBody.innerHTML = cart
          .map(
            (item, index) => `
          <div class="cart-item">
            <img src="${item.imgSrc}" alt="${item.title}" class="cart-item-img" />
            <div class="cart-item-info">
              <h4 class="cart-item-title">${item.title}</h4>
              <span class="cart-item-price">$${item.price.toFixed(2)}</span>
            </div>
            <div class="cart-item-controls">
              <div class="qty-picker">
                <button class="qty-btn" data-action="decrease" data-index="${index}">-</button>
                <input type="number" class="qty-input" value="${item.qty}" min="1" data-index="${index}" />
                <button class="qty-btn" data-action="increase" data-index="${index}">+</button>
              </div>
              <button class="remove-btn" data-index="${index}">Remove</button>
            </div>
          </div>
        `,
          )
          .join("");
      }
    }

    // Render Full Cart Page Table
    if (cartTableBody) {
      if (cart.length === 0) {
        cartTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 40px 0;">Your cart is empty.</td></tr>`;
      } else {
        cartTableBody.innerHTML = cart
          .map(
            (item, index) => `
          <tr class="cart-page-row">
            <td class="cart-page-product">
              <img src="${item.imgSrc}" alt="${item.title}" style="width: 70px; border-radius: 8px;" />
              <div>
                <h4>${item.title}</h4>
                <p>$${item.price.toFixed(2)}</p>
              </div>
            </td>
            <td class="cart-page-qty">
              <div class="qty-picker">
                <button class="qty-btn" data-action="decrease" data-index="${index}">-</button>
                <input type="number" class="qty-input" value="${item.qty}" min="1" data-index="${index}" />
                <button class="qty-btn" data-action="increase" data-index="${index}">+</button>
              </div>
              <button class="remove-btn" data-index="${index}">Remove</button>
            </td>
            <td class="cart-page-total">$${(item.price * item.qty).toFixed(2)}</td>
          </tr>
        `,
          )
          .join("");
      }
    }
  }

  // --- Click Delegation (Quick Add & Quantities) ---
  document.addEventListener("click", (e) => {
    const quickAddBtn = e.target.closest(".quick-add");
    if (quickAddBtn) {
      e.preventDefault();
      const card = quickAddBtn.closest(".product-card");
      if (!card) return;

      const titleEl =
        card.querySelector(".product-title") ||
        card.querySelector("h3") ||
        card.querySelector("h4");
      const title = titleEl ? titleEl.textContent.trim() : "Product";

      const priceEl =
        card.querySelector(".sale-price") ||
        card.querySelector(".price") ||
        card.querySelector(".product-price");
      const rawPrice = priceEl
        ? priceEl.textContent.replace(/[^0-9.]/g, "")
        : "0";
      const price = parseFloat(rawPrice) || 0;

      const imgEl =
        card.querySelector(".product-image img") || card.querySelector("img");
      const imgSrc = imgEl ? imgEl.src : "";

      // catalog.js already stamped every .product-card with
      // data-product-id on page load. We carry it through the cart so
      // that at checkout time the backend can match this line item back
      // to a real Product row (for stock decrement) instead of guessing
      // by title text.
      const id = card.dataset.productId || null;

      addToCart({ id, title, price, imgSrc });
      return;
    }

    if (e.target.classList.contains("qty-btn")) {
      const index = parseInt(e.target.dataset.index, 10);
      const action = e.target.dataset.action;
      if (action === "increase") cart[index].qty += 1;
      if (action === "decrease") {
        cart[index].qty -= 1;
        if (cart[index].qty <= 0) cart.splice(index, 1);
      }
      updateCartUI();
    }

    if (e.target.classList.contains("remove-btn")) {
      const index = parseInt(e.target.dataset.index, 10);
      cart.splice(index, 1);
      updateCartUI();
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("qty-input")) {
      const index = parseInt(e.target.dataset.index, 10);
      const newQty = parseInt(e.target.value, 10);
      if (isNaN(newQty) || newQty <= 0) {
        cart.splice(index, 1);
      } else {
        cart[index].qty = newQty;
      }
      updateCartUI();
    }
  });

  // Promo Code Handler
  const applyPromoBtn = document.getElementById("applyPromoBtn");
  if (applyPromoBtn) {
    // Map code names to exact dollar amounts to subtract
    // promotioncode
    const validPromoCodes = {
      GRAVA10: 10.0, // Subtracts $10.00
      SAVE20: 20.0, // Subtracts $20.00
      MYDISCOUNT5: 5.0, // Subtracts $5.00
      SPECIAL50: 50.0, // Subtracts $50.00
      SUMMER15: 15.5, // Subtracts $15.50
      SPECIAL100: 100.0,
    };

    applyPromoBtn.addEventListener("click", () => {
      const promoInput = document.getElementById("promoInput");
      const code = promoInput ? promoInput.value.trim().toUpperCase() : "";

      if (validPromoCodes.hasOwnProperty(code)) {
        currentDiscount = validPromoCodes[code];
        alert(
          `Coupon ${code} applied! $${currentDiscount.toFixed(2)} discount.`,
        );
      } else if (code === "") {
        currentDiscount = 0.0;
        alert("Promo code removed.");
      } else {
        alert("Invalid coupon code.");
        currentDiscount = 0.0;
      }

      updateCartUI();
    });
  }
  // --- Confirm Payment & Print Receipt Handler ---
  const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
  if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener("click", async () => {
      // 1. Check if user is logged in — this now ASKS THE SERVER (via
      // whoami() from auth.js) instead of trusting localStorage, which
      // anyone could hand-edit in devtools to fake being signed in.
      const session = await whoami();

      if (!session.isLoggedIn) {
        alert(
          "Please sign in or create an account before completing your order.",
        );
        window.location.href = "login.html";
        return;
      }

      // 2. Check if cart is empty
      if (cart.length === 0) {
        alert("Your cart is empty! Please add items before checking out.");
        return;
      }

      const selectedDelivery = document.querySelector(
        'input[name="deliveryMethod"]:checked',
      );
      const deliveryName = selectedDelivery ? selectedDelivery.value : "Grab";

      // Province/City are only required for actual delivery — store
      // pickup doesn't need a shipping address at all, so this check is
      // skipped whenever the pickup fields are the ones showing.
      const isPickup =
        document.getElementById("pickupFields")?.style.display !== "none" &&
        document.getElementById("deliveryFields")?.style.display === "none";

      const deliveryLocation = document
        .getElementById("deliveryLocationInput")
        ?.value.trim();

      if (!isPickup && !deliveryLocation) {
        alert("Please enter your City/Province for delivery.");
        return;
      }

      const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.qty,
        0,
      );
      const grandTotal = Math.max(0, subtotal - currentDiscount + shippingCost);
      const currentDate = new Date().toLocaleString();

      // 3. Send the order to Django. This is the step that actually
      // persists the order in the database AND decrements stock on
      // each Product row (see orders_list_create() in views.py) — that's
      // real inventory tracking, which localStorage could never do
      // because it only exists in *your* browser.
      confirmPaymentBtn.disabled = true;
      confirmPaymentBtn.textContent = "Processing...";

      let orderNum;
      try {
        const result = await apiFetch("/orders/", {
          method: "POST",
          body: JSON.stringify({
            customerName: session.name,
            customerEmail: session.email,
            deliveryName,
            deliveryProvince: deliveryLocation || "",
            deliveryCity: deliveryLocation || "",
            items: cart.map((item) => ({
              id: item.id,
              title: item.title,
              price: item.price,
              qty: item.qty,
              image: item.imgSrc,
            })),
            subtotal,
            discount: currentDiscount,
            shipping: shippingCost,
            total: grandTotal,
          }),
        });
        orderNum = result.orderNum;
      } catch (err) {
        alert(
          err.message ||
            "Something went wrong placing your order. Please try again.",
        );
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.textContent = "Confirm Payment";
        return;
      }

      alert(
        `🎉 Payment Successful!\n\n` +
          `Thank you for your order! Your purchase will be delivered via ${deliveryName} Express.\n\n` +
          `We'll now generate your official receipt. Wish you come back again soon! ✨`,
      );

      printProfessionalReceipt({
        orderNum,
        date: currentDate,
        deliveryName,
        subtotal,
        discount: currentDiscount,
        shipping: shippingCost,
        total: grandTotal,
        items: [...cart],
      });

      cart = [];
      currentDiscount = 0.0;
      localStorage.removeItem("cart");
      localStorage.removeItem("currentDiscount");

      const promoInput = document.getElementById("promoInput");
      if (promoInput) promoInput.value = "";

      confirmPaymentBtn.disabled = false;
      confirmPaymentBtn.textContent = "Confirm Payment";

      updateCartUI();
      closeCart();
    });
  }

  // --- Cancel Payment Handler ---
  const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
  if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener("click", () => {
      // Clear all typed payment details (card number, expiry, CVV, etc.)
      document.querySelectorAll(".checkout-input").forEach((input) => {
        input.value = "";
      });

      // Reset payment method tabs back to unselected
      document
        .querySelectorAll(".payment-tab")
        .forEach((el) => el.classList.remove("active"));
      document.querySelectorAll(".payment-content").forEach((el) => {
        el.style.display = "none";
      });

      alert(
        "Payment cancelled. Your cart items are still saved — pick a payment method whenever you're ready.",
      );
    });
  }

  // --- Storage Helpers ---
  function saveCartToStorage() {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("currentDiscount", JSON.stringify(currentDiscount));
  }

  function loadCartFromStorage() {
    const storedItems = localStorage.getItem("cart");
    const storedDiscount = localStorage.getItem("currentDiscount");

    if (storedItems) {
      cart = JSON.parse(storedItems);
    }
    if (storedDiscount) {
      currentDiscount = JSON.parse(storedDiscount);
    }
  }

  updateCartUI();
});

// --- Tab Switchers (Exposed globally for HTML onclick attributes) ---
window.selectFulfillment = function (method) {
  document
    .querySelectorAll(".fulfillment-option")
    .forEach((el) => el.classList.remove("active"));
  const targetOption = document.getElementById(`method-${method}`);
  if (targetOption) targetOption.classList.add("active");

  const deliveryFields = document.getElementById("deliveryFields");
  const pickupFields = document.getElementById("pickupFields");

  if (method === "delivery") {
    if (deliveryFields) deliveryFields.style.display = "block";
    if (pickupFields) pickupFields.style.display = "none";
  } else {
    if (deliveryFields) deliveryFields.style.display = "none";
    if (pickupFields) pickupFields.style.display = "block";
  }
};

window.selectPayment = function (type) {
  document
    .querySelectorAll(".payment-tab")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelectorAll(".payment-content")
    .forEach((el) => (el.style.display = "none"));

  const targetTab = document.getElementById(`tab-${type}`);
  const targetPay = document.getElementById(`pay-${type}`);
  if (targetTab) targetTab.classList.add("active");
  if (targetPay) targetPay.style.display = "block";
};

// --- Printable Receipt Function ---
function printProfessionalReceipt(orderData) {
  const printWindow = window.open("", "_blank", "width=400,height=600");

  const itemsHtml = orderData.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 6px 0; font-weight: 500;">${item.title} x${item.qty}</td>
      <td style="padding: 6px 0; text-align: right;">$${(item.price * item.qty).toFixed(2)}</td>
    </tr>
  `,
    )
    .join("");

  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt #${orderData.orderNum}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 13px;
          color: #333;
          margin: 0;
          padding: 20px;
          background: #fff;
        }
        .receipt-card {
          max-width: 340px;
          margin: 0 auto;
          padding: 15px;
          border: 1px dashed #ccc;
          border-radius: 8px;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #eee;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .header h2 {
          margin: 0 0 4px 0;
          font-size: 20px;
          letter-spacing: 0.5px;
        }
        .header p {
          margin: 2px 0;
          color: #666;
          font-size: 11px;
        }
        .meta-info {
          font-size: 11px;
          color: #555;
          margin-bottom: 12px;
        }
        .meta-info div {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }
        .totals {
          border-top: 1px dashed #eee;
          padding-top: 8px;
        }
        .totals div {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .grand-total {
          font-weight: 700;
          font-size: 15px;
          border-top: 2px solid #333;
          padding-top: 6px;
          margin-top: 6px;
        }
        .footer {
          text-align: center;
          margin-top: 18px;
          padding-top: 10px;
          border-top: 1px dashed #eee;
          font-size: 11px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <h2>OFFICIAL RECEIPT</h2>
          <p>Thank you for shopping with us!</p>
        </div>

        <div class="meta-info">
          <div><span>Order ID:</span> <strong>#${orderData.orderNum}</strong></div>
          <div><span>Date:</span> <span>${orderData.date}</span></div>
          <div><span>Courier:</span> <strong>${orderData.deliveryName} Express</strong></div>
        </div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #ddd; font-size: 11px; color: #888; text-align: left;">
              <th style="padding-bottom: 4px;">ITEM</th>
              <th style="padding-bottom: 4px; text-align: right;">PRICE</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div><span>Subtotal</span><span>$${orderData.subtotal.toFixed(2)}</span></div>
          ${
            orderData.discount > 0
              ? `<div><span>Discount</span><span>-$${orderData.discount.toFixed(2)}</span></div>`
              : ""
          }
          <div><span>Shipping</span><span>${
            orderData.shipping === 0
              ? "FREE"
              : "$" + orderData.shipping.toFixed(2)
          }</span></div>
          <div class="grand-total"><span>Total Paid</span><span>$${orderData.total.toFixed(2)} USD</span></div>
        </div>

        <div class="footer">
          <p>We appreciate your business!</p>
          <p>✨ Please visit us again soon! ✨</p>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(() => window.close(), 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(receiptContent);
  printWindow.document.close();
}
