// ---------- Assign a stable ID to every product card FIRST, before anything else runs ----------
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".product-card").forEach((card) => {
    const title = card.querySelector(".product-title")?.textContent.trim();
    if (!title) return;
    const id = title.toLowerCase().replace(/\s+/g, "-");
    card.id = "product-" + id;
    card.dataset.productId = id;
  });
});

// ---------- Scroll to and highlight the matched product — works on ANY
// page (home.html included), independent of whether pagination exists ----------
document.addEventListener("DOMContentLoaded", async function () {
  const hashId = window.location.hash ? window.location.hash.slice(1) : null;
  if (!hashId) return;

  // Same fix as the grid-render and search-index code: a product that
  // only exists in the database (added via admin) doesn't have a card
  // in the DOM yet until the backend sync finishes creating one. Without
  // this await, getElementById below runs too early and always returns
  // null for those products — which is exactly why the highlight only
  // ever worked for the old, hand-written cards and never for new ones.
  await catalogSyncPromise;

  const target = document.getElementById(hashId);
  if (!target) return;

  setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("search-highlight");
    setTimeout(() => target.classList.remove("search-highlight"), 2000);
  }, 150);
});

document.addEventListener("DOMContentLoaded", async function () {
  const itemsPerPage = 15; // change this to control how many show per page
  const grid = document.getElementById("productGrid");
  const paginationEl = document.getElementById("pagination");
  if (!grid) return;

  // MUST happen before allItems is captured below — otherwise any card
  // created here (products that only exist in the database) would be
  // invisible to filtering, sorting, and pagination, even though it's
  // sitting right there in the DOM. This reuses the SAME sync run that
  // the search index (further down this file) also waits on.
  await catalogSyncPromise;

  const priceCheckboxes = document.querySelectorAll(
    '.filter-price-panel input[type="checkbox"]',
  );
  const stockToggle = document.getElementById("stockToggle");
  const sortSelect = document.getElementById("sortSelect");
  const priceToggle = document.getElementById("priceToggle");
  const pricePanel = document.getElementById("pricePanel");

  const allItems = Array.from(grid.children);
  let currentPage = 1;

  const hashId = window.location.hash ? window.location.hash.slice(1) : null;

  // ---------- Price panel expand/collapse ----------
  if (priceToggle && pricePanel) {
    priceToggle.addEventListener("click", function () {
      const isOpen = priceToggle.classList.toggle("open");
      pricePanel.hidden = !isOpen;
    });
  }

  // ---------- Helpers ----------
  function scrollToGrid() {
    const headerOffset = 100; // Offset spacing for fixed/sticky header
    const elementPosition = grid.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[$%–—]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getPriceNumber(item) {
    const priceText = item.querySelector(".sale-price")?.textContent || "0";
    return parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
  }

  function getCheckedPriceTags() {
    return Array.from(priceCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => slugify(cb.closest("label").textContent));
  }

  // ---------- Filtering ----------
  function getFilteredItems() {
    let result = allItems;

    if (stockToggle && stockToggle.checked) {
      result = result.filter((item) => item.dataset.inStock !== "false");
    }

    const checkedTags = getCheckedPriceTags();
    if (checkedTags.length > 0) {
      result = result.filter((item) => {
        const itemTags = (item.dataset.tags || "").split(/\s+/);
        return checkedTags.some((tag) => itemTags.includes(tag));
      });
    }

    return result;
  }

  function getProductTitle(item) {
    return (item.querySelector(".product-title")?.textContent || "")
      .trim()
      .toLowerCase();
  }

  // ---------- Sorting ----------
  function getSortedItems(items) {
    const sorted = items.slice();
    const sortValue = sortSelect ? sortSelect.value : "Featured";

    if (sortValue === "Price, low to high") {
      sorted.sort((a, b) => getPriceNumber(a) - getPriceNumber(b));
    } else if (sortValue === "Price, high to low") {
      sorted.sort((a, b) => getPriceNumber(b) - getPriceNumber(a));
    } else if (sortValue === "Alphabetically, A-Z") {
      sorted.sort((a, b) =>
        getProductTitle(a).localeCompare(getProductTitle(b)),
      );
    } else if (sortValue === "Alphabetically, Z-A") {
      sorted.sort((a, b) =>
        getProductTitle(b).localeCompare(getProductTitle(a)),
      );
    } else if (sortValue === "Best selling") {
      sorted.sort((a, b) => {
        const aRank = parseInt(a.dataset.bestSelling || "999", 10);
        const bRank = parseInt(b.dataset.bestSelling || "999", 10);
        return aRank - bRank;
      });
    }

    // If we arrived via a search result, float that exact product to the
    // very front of the list so it's always the first thing shown on page 1,
    // just like search results behave on major shopping sites.
    if (hashId) {
      const idx = sorted.findIndex((item) => item.id === hashId);
      if (idx > 0) {
        const [matched] = sorted.splice(idx, 1);
        sorted.unshift(matched);
      }
    }

    return sorted;
  }

  // ---------- Render ----------
  function showPage(page) {
    currentPage = page;
    const filtered = getSortedItems(getFilteredItems());
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const visibleSlice = filtered.slice(start, end);

    allItems.forEach((item) => {
      item.style.display = "none";
    });
    visibleSlice.forEach((item) => {
      item.style.display = "";
      grid.appendChild(item);
    });

    renderPagination(filtered.length);
  }

  function renderPagination(totalItems) {
    paginationEl.innerHTML = "";
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const prev = document.createElement("a");
    prev.href = "#";
    prev.className = "page-arrow";
    prev.innerHTML = "&#8249;";
    prev.addEventListener("click", function (e) {
      e.preventDefault();
      if (currentPage > 1) {
        showPage(currentPage - 1);
        scrollToGrid();
      }
    });
    paginationEl.appendChild(prev);

    const counter = document.createElement("span");
    counter.className = "page-counter";
    counter.textContent = currentPage + " / " + totalPages;
    paginationEl.appendChild(counter);

    const next = document.createElement("a");
    next.href = "#";
    next.className = "page-arrow";
    next.innerHTML = "&#8250;";
    next.addEventListener("click", function (e) {
      e.preventDefault();
      if (currentPage < totalPages) {
        showPage(currentPage + 1);
        scrollToGrid();
      }
    });
    paginationEl.appendChild(next);
  }

  // ---------- Event listeners ----------
  // Each of these re-renders the grid starting at page 1 — same as the
  // pagination arrows do. The arrows also call scrollToGrid() so the new
  // page is actually in view; these three didn't, so filtering/sorting
  // while scrolled down re-rendered the grid off-screen above you and
  // looked like nothing had happened (or like the toggle "sometimes"
  // didn't work) until you scrolled back up manually.
  priceCheckboxes.forEach((cb) => {
    cb.addEventListener("change", function () {
      showPage(1);
      scrollToGrid();
    });
  });

  if (stockToggle) {
    stockToggle.addEventListener("change", function () {
      showPage(1);
      scrollToGrid();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      showPage(1);
      scrollToGrid();
    });
  }

  showPage(1); // always page 1 — the matched search item is now floated to the front, so it's always here
});

// ---------- Mobile nav overlay ----------
document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const mobileNav = document.getElementById("mobileNav");
  const mobileNavOverlay = document.getElementById("mobileNavOverlay");
  const mobileNavClose = document.getElementById("mobileNavClose");

  function openMobileNav() {
    if (mobileNav) mobileNav.classList.add("open");
    if (mobileNavOverlay) mobileNavOverlay.classList.add("open");
  }

  function closeMobileNav() {
    if (mobileNav) mobileNav.classList.remove("open");
    if (mobileNavOverlay) mobileNavOverlay.classList.remove("open");
  }

  if (menuToggle) menuToggle.addEventListener("click", openMobileNav);
  if (mobileNavClose) mobileNavClose.addEventListener("click", closeMobileNav);
  if (mobileNavOverlay)
    mobileNavOverlay.addEventListener("click", closeMobileNav);
});

// ---------- Search overlay ----------
async function openSearchOverlay() {
  document.getElementById("searchOverlay").style.display = "block";
  const input = document.getElementById("searchInput");
  input.focus();
  await handleSearch();
}

function closeSearchOverlay() {
  document.getElementById("searchOverlay").style.display = "none";
  document.getElementById("searchInput").value = "";
}

// Escapes text before it's inserted into innerHTML as an attribute or
// text node. Without this, a product name/id containing "&" (very common
// in your Bundle names, e.g. "Black Mars Pro & Alpha65 Bundle") gets
// misread by the browser as the start of an HTML character reference —
// silently corrupting the href before the click ever happens. This is
// exactly why search-and-highlight worked fine for Keyboard/Speaker/
// Mouse (none of those names contain "&") but broke specifically for
// Bundle results.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function handleSearch() {
  // Wait for the live backend fetch to finish (and finish rewriting the
  // cached index below) before reading it. Without this, typing/opening
  // search right after adding a product in admin-dashboard.html races the
  // network request — you'd search whatever was cached from your LAST
  // visit, not what's actually in the database right now.
  await productsFetchPromise;

  const query = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();
  const listContainer = document.getElementById("searchResultsList");

  const products = JSON.parse(localStorage.getItem("gravaStarProducts")) || [];

  const filtered = products.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const category = (p.category || "").toLowerCase();
    return name.includes(query) || category.includes(query);
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `<div class="no-results">No products matching "${query}"</div>`;
    return;
  }

  listContainer.innerHTML = filtered
    .map(
      (p) => `
    <a href="${escapeHtml(p.page)}#product-${escapeHtml(p.id)}" class="search-suggestion-item">
      ${escapeHtml(p.name)}
    </a>
  `,
    )
    .join("");

  // Close overlay and handle same-page vs cross-page navigation safely
  listContainer.querySelectorAll(".search-suggestion-item").forEach((link) => {
    link.addEventListener("click", function () {
      closeSearchOverlay();

      const targetHref = link.getAttribute("href");
      const [targetPage, targetHash] = targetHref.split("#");

      // Get current HTML file name (defaults to home.html if root path)
      const currentPage =
        window.location.pathname.split("/").pop() || "home.html";

      // Only refresh state if staying on the exact same page
      if (targetPage === currentPage && targetHash) {
        window.location.hash = targetHash;
        window.location.reload();
      }
    });
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSearchOverlay();
  }
});
document
  .getElementById("searchOverlay")
  ?.addEventListener("click", function (e) {
    if (e.target.id === "searchOverlay") {
      closeSearchOverlay();
    }
  });

// for eyes on password
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", function () {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      const eyeOpen = btn.querySelector(".eye-open");
      const eyeClosed = btn.querySelector(".eye-closed");

      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";

      eyeOpen.style.display = isHidden ? "none" : "block";
      eyeClosed.style.display = isHidden ? "block" : "none";
      btn.setAttribute(
        "aria-label",
        isHidden ? "Hide password" : "Show password",
      );
    });
  });
});
/* for alert message in contact.html */
document.addEventListener("DOMContentLoaded", function () {
  const contactForm = document.getElementById("contactForm");
  const loveAlert = document.getElementById("loveAlert");
  const closeAlertBtn = document.getElementById("closeAlertBtn");

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault(); // Prevents instant page refresh

      // 1. Show the feedback notification
      if (loveAlert) {
        loveAlert.classList.add("show");

        // Automatically hide alert after 5 seconds
        setTimeout(() => {
          loveAlert.classList.remove("show");
        }, 5000);
      }

      // 2. Clear all input fields in the form
      contactForm.reset();
    });
  }

  // Close alert on click 'x'
  if (closeAlertBtn) {
    closeAlertBtn.addEventListener("click", function () {
      loveAlert.classList.remove("show");
    });
  }
});
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Live sync with the Django backend.
//
// This does TWO things:
//   1. Patches price/stock onto cards that already exist in this HTML
//      file (the ones you hand-wrote or that seed_products.py created).
//   2. BUILDS a new card for any product that exists in the database
//      but has NO matching card here — e.g. anything you added through
//      admin-dashboard.html or Django admin. Those only ever write to
//      the database; nothing automatically edits your HTML files, so
//      without this step a database-only product would be invisible on
//      the storefront no matter how many times you refreshed.
//
// Matching a product to "this page" is done by category, using the same
// mapping seed_products.py uses on the backend side.
const PAGE_CATEGORY = {
  "keyboard.html": "Keyboard",
  "mouse.html": "Mice",
  "speaker.html": "Speaker",
  "bundle.html": "Bundle",
};

// Builds the badge-stack content for a product: an optional type badge
// (New Arrival / Best Seller, set from the admin dropdown) plus an
// auto-computed "Save $X" badge whenever regular_price is higher than
// the current price. Shared by both new-card creation and patching an
// existing hand-written card, so a badge you set in admin shows up
// identically either way.
function buildBadgeStackHtml(product) {
  const badges = [];
  if (product.product_type) {
    badges.push(
      `<span class="badge badge--type">${product.product_type}</span>`,
    );
  }
  if (product.regular_price && product.regular_price > product.price) {
    const savings = (product.regular_price - product.price).toFixed(2);
    badges.push(`<span class="badge badge--save">Save $${savings}</span>`);
  }
  return badges.join("\n");
}

function buildProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.id = "product-" + product.id;
  card.dataset.productId = product.id;
  card.dataset.inStock = product.in_stock ? "true" : "false";

  const regularPriceHtml = product.regular_price
    ? `<span class="regular-price">$${product.regular_price.toFixed(2)}</span>`
    : "";

  card.innerHTML = `
    <div class="product-image">
      <div class="badge-stack">${buildBadgeStackHtml(product)}</div>
      <img src="${product.image || ""}" alt="${product.name}" />
      <button class="quick-add" ${product.in_stock ? "" : "disabled"}>${
        product.in_stock ? "+ Quick add" : "Sold Out"
      }</button>
    </div>
    <h3 class="product-title">${product.name}</h3>
    <div class="product-price">
      <span class="sale-price">$${product.price.toFixed(2)}</span>
      ${regularPriceHtml}
    </div>
  `;
  return card;
}

// Reverse of PAGE_CATEGORY: category -> the storefront page that shows it.
// This lets us know exactly which page.html#product-id a database product
// belongs to WITHOUT needing to visit that page first and scan its DOM.
const CATEGORY_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_CATEGORY).map(([page, category]) => [category, page]),
);

// The backend's /products/ response (used by syncProductsWithBackend to
// render cards) is already the complete, authoritative product list — not
// just "this page's" products. So it's also the correct source of truth
// for the search index, and we write it out in full every time instead of
// merging it into whatever was cached in localStorage before.
//
// This fixes two bugs the old per-page/merge approach had:
//   1. A brand-new admin-added product only became searchable after ITS
//      OWN page had been visited (so its card could be scanned into the
//      index) — e.g. adding a product then searching from home.html found
//      nothing until you'd separately opened keyboard.html/mouse.html/etc.
//   2. A deleted product's entry was never removed from localStorage —
//      nothing ever re-checked old cached ids against what the backend
//      still has, so a deleted-and-recreated item could show up twice:
//      once as the old, stale, dangling entry, and once as the fresh one.
// Rebuilding the whole cache from one authoritative fetch avoids both.
function rebuildSearchIndex(products) {
  const index = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    page: CATEGORY_TO_PAGE[p.category] || p.page || "home.html",
  }));
  localStorage.setItem("gravaStarProducts", JSON.stringify(index));
}

// Kick off ONE fetch of the full product list as soon as this script runs
// (script tags sit near the end of <body>, so no need to wait for
// DOMContentLoaded). Every page — even ones with no #productGrid at all,
// like home.html or contact.html — awaits this same promise before
// touching the search index, so opening search anywhere always reflects
// what's actually in the database right now instead of a per-page cache.
const productsFetchPromise = (async function () {
  try {
    const res = await fetch(`${API_BASE}/products/`);
    if (!res.ok) return null; // backend not running — keep static HTML/cache
    const { products } = await res.json();
    rebuildSearchIndex(products);
    return products;
  } catch (_) {
    return null; // network error — leave the page exactly as it was
  }
})();

// Returns true if it did any work (so the caller knows whether the grid
// changed and filtering/pagination needs to re-read it).
async function syncProductsWithBackend(grid) {
  const products = await productsFetchPromise;
  if (!products) return false;

  const byId = new Map(products.map((p) => [p.id, p]));
  const matchedIds = new Set();

  // 1. Patch existing hard-coded cards
  grid.querySelectorAll(".product-card[data-product-id]").forEach((card) => {
    const product = byId.get(card.dataset.productId);
    if (!product) return;
    matchedIds.add(product.id);

    const priceEl = card.querySelector(".sale-price");
    if (priceEl) priceEl.textContent = `$${product.price.toFixed(2)}`;

    card.dataset.inStock = product.in_stock ? "true" : "false";
    const addBtn = card.querySelector(".quick-add");
    if (addBtn) {
      addBtn.disabled = !product.in_stock;
      addBtn.textContent = product.in_stock ? "Quick Add" : "Sold Out";
    }

    const badgeStack = card.querySelector(".badge-stack");
    if (badgeStack) badgeStack.innerHTML = buildBadgeStackHtml(product);
  });

  // 2. Create cards for database-only products belonging to this page
  const currentPage = window.location.pathname.split("/").pop() || "home.html";
  const expectedCategory = PAGE_CATEGORY[currentPage];

  products.forEach((product) => {
    if (matchedIds.has(product.id)) return;
    if (expectedCategory && product.category !== expectedCategory) return;
    grid.appendChild(buildProductCard(product));
  });

  return true;
}

// Both the filter/pagination code above and the search overlay share this
// exact same promise, so they wait for the identical sync to finish
// instead of racing their own copies of "is the sync done yet?".
const catalogSyncPromise = (function () {
  const grid = document.getElementById("productGrid");
  if (!grid) return productsFetchPromise.then(() => false);
  return syncProductsWithBackend(grid);
})();
