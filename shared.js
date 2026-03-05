// ============================================================
// CONFIGURATION — Your Google Sheet Published CSV URLs
// ============================================================
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjlowL7bPj9fTBIEFlA26bd1TVEIbfXrU5Wf77sp6KainrijSlzTkYCZvxyCm2sTRnzyTtQe_TOYez/pub?gid=0&single=true&output=csv";

const ORDERS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjlowL7bPj9fTBIEFlA26bd1TVEIbfXrU5Wf77sp6KainrijSlzTkYCZvxyCm2sTRnzyTtQe_TOYez/pub?gid=521859531&single=true&output=csv";

// ← PASTE YOUR APPS SCRIPT URL HERE — this makes orders sync across ALL devices
// Get it from admin.html → ⚙ Apps Script Setup → deploy as web app
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyR02SzkiNPhiVjaKvAubwSfrWwH9fQdHWCVNDm9iwFXVSrNlh3gNnftea6W24hsTHN/exec";

// CORS proxy — makes Google Sheets work on Live Server AND GitHub Pages
const SHEET_URL = `https://corsproxy.io/?${encodeURIComponent(SHEET_CSV_URL)}&_=${Date.now()}`;

// ============================================================
// Cart helpers (localStorage)
// ============================================================
function getCart() {
  return JSON.parse(localStorage.getItem("as_cart") || "[]");
}
function saveCart(cart) {
  localStorage.setItem("as_cart", JSON.stringify(cart));
  updateCartBadge();
}
function addToCart(product, qty = 1) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.id === product.id);
  if (idx > -1) cart[idx].qty += qty;
  else cart.push({ ...product, qty });
  saveCart(cart);
}
function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const total = getCart().reduce((s, i) => s + i.qty, 0);
  badge.textContent = total;
  badge.style.display = total ? "flex" : "none";
}

// ============================================================
// Fetch products — Google Sheet + Admin local products
// ============================================================
async function fetchProducts() {
  let sheetProducts = [];

  // Add timestamp to prevent browser caching old data
  const freshURL = `https://corsproxy.io/?${encodeURIComponent(SHEET_CSV_URL)}&_=${Date.now()}`;
  const freshDirect = `${SHEET_CSV_URL}&_=${Date.now()}`;

  try {
    const res = await fetch(freshURL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const csv = await res.text();
    if (csv.trim().startsWith("<")) throw new Error("Got HTML not CSV");
    sheetProducts = parseCSV(csv).filter(p => p.id && p.name);
    console.log("✅ Loaded", sheetProducts.length, "products from Google Sheets");
  } catch (e) {
    console.warn("⚠️ Sheet fetch failed:", e.message, "— trying direct URL");
    // Fallback: try without proxy (works on GitHub Pages)
    try {
      const res2 = await fetch(freshDirect);
      const csv2 = await res2.text();
      if (!csv2.trim().startsWith("<")) {
        sheetProducts = parseCSV(csv2).filter(p => p.id && p.name);
        console.log("✅ Loaded", sheetProducts.length, "products (direct)");
      }
    } catch (e2) {
      console.warn("⚠️ Direct fetch also failed:", e2.message);
    }
  }

  // Always merge Admin panel products (localStorage)
  const adminProducts = JSON.parse(localStorage.getItem("as_admin_products") || "[]");
  const sheetIds = new Set(sheetProducts.map(p => String(p.id)));
  const adminOnly = adminProducts.filter(p => !sheetIds.has(String(p.id)));
  const merged = [...sheetProducts, ...adminOnly];

  if (merged.length) {
    console.log("📦 Total products showing:", merged.length);
    return merged;
  }

  console.warn("📦 No products found — showing demo products");
  return DEMO_PRODUCTS;
}

// ============================================================
// Parse CSV into product objects
// ============================================================
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());

  return lines.slice(1).map(line => {
    const vals = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        vals.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    vals.push(current.trim());

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || "").replace(/^"|"$/g, "").trim();
    });
    return obj;
  }).filter(p => p.id || p.name);
}

// ============================================================
// Demo products (fallback only)
// ============================================================
const DEMO_PRODUCTS = [
  { id:"1", name:"Kente Slide", price:"24.99", category:"Men – Slides", size:"36,37,38,39,40,41,42,43,44,45", color:"Gold/Black", image:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400", description:"Handwoven Kente-inspired slide sandal with cushioned sole.", stock:"50" },
  { id:"2", name:"Ankara Flip", price:"18.50", category:"Women – Flip Flops", size:"36,37,38,39,40,41,42", color:"Blue/Orange", image:"https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400", description:"Vibrant Ankara print flip flops, lightweight and durable.", stock:"80" },
  { id:"3", name:"Mudcloth Mule", price:"32.00", category:"Women – Mules", size:"37,38,39,40,41,42,43", color:"Brown/White", image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", description:"Bogolan mudcloth pattern mule with leather strap.", stock:"30" },
  { id:"4", name:"Dashiki Sandal", price:"27.99", category:"Men – Sandals", size:"36,37,38,39,40,41,42,43,44", color:"Red/Yellow/Green", image:"https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400", description:"Colorful dashiki-inspired open-toe sandal.", stock:"60" },
  { id:"5", name:"Adinkra Loafer", price:"39.99", category:"Men – Loafers", size:"38,39,40,41,42,43,44,45", color:"Black/Gold", image:"https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=400", description:"Premium leather loafer with Adinkra symbol embossing.", stock:"25" },
  { id:"6", name:"Girls Batik Espadrille", price:"22.00", category:"Girls – Espadrilles", size:"28,29,30,31,32,33,34,35", color:"Indigo/White", image:"https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400", description:"Hand-dyed batik espadrille with jute sole.", stock:"45" },
  { id:"7", name:"Boys Ankara Slide", price:"19.99", category:"Boys – Slides", size:"28,29,30,31,32,33,34,35", color:"Orange/Green", image:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400", description:"Bold Ankara print slide for boys, easy to wear.", stock:"40" },
  { id:"8", name:"Girls Kente Sandal", price:"21.50", category:"Girls – Sandals", size:"28,29,30,31,32,33,34,35", color:"Gold/Pink", image:"https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400", description:"Colourful Kente sandal perfect for girls.", stock:"35" },
];

// ============================================================
// Render navigation bar
// ============================================================
function renderNav(activePage = "") {
  updateCartBadge();
  return `
    <a href="index.html" class="nav-logo">🌍 AfriSteps</a>
    <nav class="nav-links" id="main-nav">
      <a href="index.html" ${activePage==="home"?"class='active'":""}>Home</a>
      <a href="shop.html" ${activePage==="shop"?"class='active'":""}>Shop</a>
      <a href="about.html" ${activePage==="about"?"class='active'":""}>About</a>
      <a href="cart.html" class="cart-icon">
        🛒 <span id="cart-badge" style="display:none"></span>
      </a>
    </nav>
    <button class="hamburger" id="hamburger" onclick="toggleNav()" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  `;
}

function toggleNav() {
  const nav = document.getElementById("main-nav");
  const btn = document.getElementById("hamburger");
  if (nav) nav.classList.toggle("open");
  if (btn) btn.classList.toggle("open");
}

// Close nav when a link is clicked
document.addEventListener("click", function(e) {
  if (e.target.closest("#main-nav a")) {
    const nav = document.getElementById("main-nav");
    const btn = document.getElementById("hamburger");
    if (nav) nav.classList.remove("open");
    if (btn) btn.classList.remove("open");
  }
});

function adminLogout() {
  sessionStorage.removeItem("as_admin_auth");
  location.reload();
}

function injectAdminBar() {
  // Only show on customer-facing pages, not on admin.html itself
  if (window.location.pathname.includes("admin.html")) return;
  if (sessionStorage.getItem("as_admin_auth") !== "1") return;

  const bar = document.createElement("div");
  bar.id = "admin-bar";
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.6rem;color:#c9a84c;font-weight:700;font-size:0.75rem;letter-spacing:0.08em;">
      🔐 <span>ADMIN MODE</span>
    </div>
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <a href="admin.html" style="color:#c9a84c;text-decoration:none;font-weight:700;font-size:0.75rem;padding:0.25rem 0.75rem;border:1px solid #c9a84c;border-radius:6px;">
        ⚙ Admin Panel
      </a>
      <button onclick="adminLogout()" style="background:none;border:1px solid #555;color:#888;padding:0.25rem 0.65rem;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:0.72rem;">
        ⏻ Logout
      </button>
    </div>
  `;
  bar.style.cssText = `
    background: #1a1008;
    border-bottom: 2px solid #c9a84c;
    padding: 0.4rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 9999;
    font-family: 'DM Sans', sans-serif;
  `;
  document.body.insertBefore(bar, document.body.firstChild);
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  injectAdminBar();
});

// ============================================================
// Save order to Google Sheet via Apps Script
// ============================================================
async function saveOrderToSheet(order) {
  // Use hardcoded URL first, fall back to localStorage (set via admin panel)
  const scriptUrl = (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE")
    ? APPS_SCRIPT_URL
    : localStorage.getItem("as_apps_script_url");

  if (!scriptUrl) {
    console.warn("⚠️ Apps Script not connected — order saved locally only");
    return;
  }

  var itemsText = order.items.map(function(i) {
    var parts = i.name;
    if (i.id)   parts += " | ID:" + i.id;
    if (i.size) parts += " | Size:" + i.size;
    parts += " | Qty:" + i.qty;
    parts += " | $" + parseFloat(i.price).toFixed(2) + "each";
    return parts;
  }).join("  //  ");

  try {
    await fetch(scriptUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "save_order",
        id: order.id,
        date: new Date(order.date).toLocaleString("en-GB"),
        status: order.status,
        customer_name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address + ", " + order.customer.city + ", " + order.customer.country,
        payment: order.payment,
        items: itemsText,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total
      }),
      headers: { "Content-Type": "text/plain" }
    });
    console.log("✅ Order saved to Google Sheet:", order.id);
  } catch (e) {
    console.warn("⚠️ Could not save order to Sheet:", e.message);
  }
}
