// js/auth.js
//
// This file talks to the Django backend for everything about "who is
// logged in". It no longer stores a fake session in localStorage — it
// asks the server, because only the server actually knows (it holds
// the session cookie's matching record in the database).

const API_BASE = "https://dominant.pythonanywhere.com/api";

// ---------------------------------------------------------------------
// apiFetch: a tiny wrapper around fetch() so we don't repeat ourselves.
//
// credentials: "include" is the single most important line in this
// file. By default, fetch() does NOT send cookies to a different
// origin (different port counts as "different origin" too — 5500 vs
// 8000). Without this, Django would never see your session cookie and
// would treat every request as a brand-new anonymous visitor, even
// right after you logged in.
// ---------------------------------------------------------------------
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  // Django returns JSON even for errors (e.g. {"error": "..."}), so we
  // parse it either way and let the caller decide what to do with it.
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    // no body / not JSON — leave data as {}
  }

  if (!res.ok) {
    // Throwing here means callers can just use try/catch instead of
    // checking res.ok everywhere.
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ---------------------------------------------------------------------
// Public API used by login.html, cart.js, etc.
// ---------------------------------------------------------------------

// Ask the server "who am I?". Returns {isLoggedIn:false} or
// {isLoggedIn:true, name, email, role}.
async function whoami() {
  try {
    return await apiFetch("/auth/whoami/");
  } catch (_) {
    return { isLoggedIn: false };
  }
}

async function apiSignup({ name, email, password }) {
  return apiFetch("/auth/signup/", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

async function apiLogin({ email, password }) {
  return apiFetch("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

async function apiLogout() {
  return apiFetch("/auth/logout/", { method: "POST" });
}

// ---------------------------------------------------------------------
// Floating "logged in" bar — now built from what the SERVER says,
// fetched fresh on every page load, instead of trusting localStorage.
// ---------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  // DON'T render floating bar if we are already on the admin dashboard
  if (window.location.pathname.includes("admin-dashboard")) {
    return;
  }

  const session = await whoami();
  if (!session.isLoggedIn) return;

  const userBar = document.createElement("div");

  if (session.role === "admin") {
    userBar.innerHTML = `
      <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #000; color: #fff; padding: 12px 18px; border-radius: 30px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <span style="font-size: 12px; font-weight: 700; background: #ff3b30; padding: 2px 8px; border-radius: 10px;">ADMIN</span>
        <a href="admin-dashboard.html" style="color: #fff; font-size: 13px; font-weight: 600; text-decoration: underline;">Open Dashboard</a>
        <button onclick="handleLogout()" style="background: transparent; border: none; color: #aaa; cursor: pointer; font-size: 12px;">Logout</button>
      </div>
    `;
  } else {
    userBar.innerHTML = `
      <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; background: #1c1c1e; color: #fff; padding: 12px 18px; border-radius: 30px; display: flex; align-items: center; gap: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
        <span style="font-size: 12px; font-weight: 600; color: #8e8e93;">Logged in as ${session.name}</span>
        <button onclick="handleLogout()" style="background: #ff3b30; border: none; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px;">Logout</button>
      </div>
    `;
  }

  document.body.appendChild(userBar);
});

// Single Unified Logout Function
async function handleLogout() {
  try {
    await apiLogout(); // tells Django to destroy the session server-side
  } catch (_) {
    // even if the request fails, still send them to login
  }
  alert("Logged out successfully.");
  window.location.href = "login.html";
}
