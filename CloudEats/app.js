const rolePermissions = {
  customer: ["browse.html", "orders.html"],
  restaurant: ["restaurant.html"],
  courier: ["courier.html"],
  admin: ["index.html", "browse.html", "orders.html", "restaurant.html", "courier.html", "analytics.html"],
};

const publicPages = ["login.html", "register.html"];

function getCurrentPage() {
  const file = window.location.pathname.split("/").pop();
  return file || "index.html";
}

let users = JSON.parse(localStorage.getItem("ce_users") || "[]");
let currentUser = JSON.parse(localStorage.getItem("ce_currentUser") || "null");

function saveUsers() {
  localStorage.setItem("ce_users", JSON.stringify(users));
}

function setCurrentUser(user) {
  currentUser = { username: user.username, role: user.role };
  localStorage.setItem("ce_currentUser", JSON.stringify(currentUser));
  updateUserBadge();
}

function logout() {
  localStorage.removeItem("ce_currentUser");
  currentUser = null;
  updateUserBadge();
  window.location.href = "login.html";
}

function updateUserBadge() {
  const header = document.querySelector("header");
  if (!header) return;
  const cartContainer = header.querySelector(".cart-pill");
  if (!cartContainer) return;
  let badge = document.getElementById("ce-user-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.id = "ce-user-badge";
    badge.style.marginLeft = "0.75rem";
    badge.style.fontSize = "0.8rem";
    badge.style.cursor = "pointer";
    cartContainer.appendChild(badge);
  }
  if (!currentUser) {
    badge.textContent = "Not logged in";
    badge.onclick = () => (window.location.href = "login.html");
  } else {
    badge.textContent = `${currentUser.username} (${currentUser.role}) • Logout`;
    badge.onclick = logout;
  }
}

(function gateAccess() {
  const page = getCurrentPage();
  if (publicPages.includes(page)) return;
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }
  const allowed = rolePermissions[currentUser.role] || [];
  if (allowed.length && !allowed.includes(page)) {
    window.location.href = allowed[0];
    return;
  }
  const navLinks = document.querySelectorAll("header nav a");
  navLinks.forEach((link) => {
    const file = (link.getAttribute("href") || "").split("/").pop();
    if (!publicPages.includes(file) && allowed.length && !allowed.includes(file)) {
      link.style.display = "none";
    }
  });
})();

let menu = JSON.parse(localStorage.getItem("ce_menu") || "null");

function saveMenu() {
  localStorage.setItem("ce_menu", JSON.stringify(menu));
}

if (!menu) {
  menu = [
    { id: "m1", name: "Surplus Lunch Bowl", restaurant: "CloudEats Kitchen", price: 7.5, tags: ["lowWaste"], description: "Chef's surplus bowl.", image: null },
    { id: "m2", name: "Family Rescue Feast", restaurant: "CloudEats Kitchen", price: 18, tags: ["lowWaste"], description: "Family platter made from surplus.", image: null },
    { id: "m3", name: "Classic Burger Combo", restaurant: "CloudEats Kitchen", price: 11, tags: ["standard"], description: "Standard classic combo.", image: null },
    { id: "m4", name: "Vegan Power Box", restaurant: "CloudEats Kitchen", price: 9.5, tags: ["vegan"], description: "High-protein vegan box.", image: null },
  ];
  saveMenu();
}

let cart = JSON.parse(localStorage.getItem("ce_cart") || "[]");
let orders = JSON.parse(localStorage.getItem("ce_orders") || "[]");

function saveCart() {
  localStorage.setItem("ce_cart", JSON.stringify(cart));
}

function saveOrders() {
  localStorage.setItem("ce_orders", JSON.stringify(orders));
}

const cartCountEl = document.getElementById("cart-count");

function updateCartCount() {
  if (cartCountEl) cartCountEl.textContent = cart.length;
}

const mealGrid = document.getElementById("meal-grid");
const searchInput = document.getElementById("meal-search");
const filterSelect = document.getElementById("meal-filter");
const clearFiltersBtn = document.getElementById("clear-filters");
const placeOrderBtn = document.getElementById("place-order");

function renderMeals() {
  if (!mealGrid) return;
  const term = (searchInput?.value || "").toLowerCase();
  const filter = filterSelect ? filterSelect.value : "all";
  mealGrid.innerHTML = "";
  menu
    .filter((m) => {
      const matchesTerm = m.name.toLowerCase().includes(term) || (m.restaurant || "").toLowerCase().includes(term);
      const matchesFilter = filter === "all" ? true : (m.tags || []).includes(filter);
      return matchesTerm && matchesFilter;
    })
    .forEach((item) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        ${item.image ? `<img src="${item.image}" style="width:100%;border-radius:0.75rem;object-fit:cover;max-height:140px;margin-bottom:0.5rem;" />` : ""}
        <div class="card-header">
          <div>
            <div class="card-title">${item.name}</div>
            <div class="card-sub">${item.restaurant}</div>
          </div>
          <span class="tag">${(item.tags || []).includes("lowWaste") ? "Low waste" : "Standard"}</span>
        </div>
        <p class="muted">${item.description || ""}</p>
        <div class="card-footer">
          <span class="price">€${item.price.toFixed(2)}</span>
          <button class="primary">Add to cart</button>
        </div>
      `;
      card.querySelector("button").addEventListener("click", () => {
        cart.push(item);
        saveCart();
        updateCartCount();
        if (placeOrderBtn) placeOrderBtn.disabled = cart.length === 0;
      });
      mealGrid.appendChild(card);
    });
  if (!mealGrid.children.length) {
    mealGrid.innerHTML = '<p class="muted">No meals match your search yet.</p>';
  }
  if (placeOrderBtn) placeOrderBtn.disabled = cart.length === 0;
}

if (searchInput) searchInput.addEventListener("input", renderMeals);
if (filterSelect) filterSelect.addEventListener("change", renderMeals);
if (clearFiltersBtn)
  clearFiltersBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (filterSelect) filterSelect.value = "all";
    renderMeals();
  });

if (placeOrderBtn)
  placeOrderBtn.addEventListener("click", () => {
    if (!cart.length) return;
    const orderId = "ORD-" + String(orders.length + 1).padStart(3, "0");
    const order = {
      id: orderId,
      restaurant: cart[0].restaurant || "CloudEats Kitchen",
      items: [...cart],
      status: "Pending restaurant",
    };
    orders.push(order);
    saveOrders();
    cart = [];
    saveCart();
    updateCartCount();
    renderCustomerOrders();
    renderRestaurantOrders();
    renderCourierOrders();
    updateAnalytics();
    alert(`Order ${orderId} placed!`);
    if (placeOrderBtn) placeOrderBtn.disabled = true;
  });

const ordersBody = document.getElementById("orders-body");

function statusClass(status) {
  const s = status.toLowerCase();
  if (s.includes("accepted")) return "status-pill status-accepted";
  if (s.includes("rejected")) return "status-pill status-rejected";
  if (s.includes("on route")) return "status-pill status-onroute";
  if (s.includes("delivered")) return "status-pill status-delivered";
  return "status-pill status-pending";
}

function renderCustomerOrders() {
  if (!ordersBody) return;
  ordersBody.innerHTML = "";
  if (!orders.length) {
    ordersBody.innerHTML = '<tr><td colspan="4" class="muted">No orders yet.</td></tr>';
    return;
  }
  orders.forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.id}</td>
      <td>${order.restaurant}</td>
      <td>${order.items.length} item(s)</td>
      <td><span class="${statusClass(order.status)}">${order.status}</span></td>
    `;
    ordersBody.appendChild(tr);
  });
}

const restaurantBody = document.getElementById("restaurant-orders-body");

function renderRestaurantOrders() {
  if (!restaurantBody) return;
  restaurantBody.innerHTML = "";
  const visible = orders.filter((o) => !o.status.toLowerCase().includes("delivered"));
  if (!visible.length) {
    restaurantBody.innerHTML = '<tr><td colspan="4" class="muted">No active orders.</td></tr>';
    return;
  }
  visible.forEach((order) => {
    const idx = orders.findIndex((o) => o.id === order.id);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.id}</td>
      <td>${order.items.length}x</td>
      <td><span class="${statusClass(order.status)}">${order.status}</span></td>
      <td>
        <div class="pill-row">
          <button class="secondary" data-action="accept">Accept</button>
          <button class="outline" data-action="reject">Reject</button>
        </div>
      </td>
    `;
    tr.querySelector('[data-action="accept"]').addEventListener("click", () => {
      orders[idx].status = "Accepted – preparing";
      saveOrders();
      renderCustomerOrders();
      renderRestaurantOrders();
      renderCourierOrders();
      updateAnalytics();
    });
    tr.querySelector('[data-action="reject"]').addEventListener("click", () => {
      orders[idx].status = "Rejected by restaurant";
      saveOrders();
      renderCustomerOrders();
      renderRestaurantOrders();
      renderCourierOrders();
      updateAnalytics();
    });
    restaurantBody.appendChild(tr);
  });
}

const menuGrid = document.getElementById("menu-grid");
const menuForm = document.getElementById("menu-form");
const menuNameInput = document.getElementById("menu-name");
const menuPriceInput = document.getElementById("menu-price");
const menuDescInput = document.getElementById("menu-description");
const menuImageInput = document.getElementById("menu-image");
const menuTypeInput = document.getElementById("menu-type");
const menuSubmitBtn = document.getElementById("menu-submit");
const menuCancelBtn = document.getElementById("menu-cancel");

let editingMealId = null;
let pendingImageDataUrl = null;

function renderMenu() {
  if (!menuGrid) return;
  menuGrid.innerHTML = "";
  if (!menu.length) {
    menuGrid.innerHTML = '<p class="muted">No menu items yet.</p>';
    return;
  }
  menu.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-title">${item.name}</div>
      <p class="muted">${item.description || ""}</p>
      ${item.image ? `<img src="${item.image}" style="width:100%;border-radius:0.75rem;object-fit:cover;max-height:140px;margin-top:0.4rem;" />` : ""}
      <div class="card-footer">
        <span class="price">€${item.price.toFixed(2)}</span>
        <span class="tag">${(item.tags || []).includes("lowWaste") ? "Low waste" : "Standard"}</span>
        <div class="pill-row">
          <button class="outline" data-action="edit">Edit</button>
          <button class="secondary" data-action="delete">Remove</button>
        </div>
      </div>
    `;
    card.querySelector('[data-action="edit"]').addEventListener("click", () => {
      editingMealId = item.id;
      pendingImageDataUrl = item.image || null;
      menuNameInput.value = item.name;
      menuPriceInput.value = item.price;
      menuDescInput.value = item.description || "";
      menuTypeInput.value = item.tags.includes("lowWaste") ? "lowWaste" : "standard";
      menuSubmitBtn.textContent = "Save changes";
      menuCancelBtn.style.display = "inline-flex";
      menuForm.scrollIntoView({ behavior: "smooth" });
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (!confirm(`Remove "${item.name}"?`)) return;
      menu = menu.filter((m) => m.id !== item.id);
      saveMenu();
      renderMenu();
      renderMeals();
    });
    menuGrid.appendChild(card);
  });
}

if (menuImageInput) {
  menuImageInput.addEventListener("change", () => {
    const file = menuImageInput.files[0];
    if (!file) {
      pendingImageDataUrl = editingMealId ? menu.find((m) => m.id === editingMealId)?.image || null : null;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => (pendingImageDataUrl = e.target.result);
    reader.readAsDataURL(file);
  });
}

if (menuForm) {
  menuForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = menuNameInput.value.trim();
    const price = parseFloat(menuPriceInput.value);
    const description = menuDescInput.value.trim();
    const mealType = menuTypeInput.value;
    if (!name || isNaN(price) || !mealType) {
      alert("Missing fields.");
      return;
    }
    if (editingMealId) {
      const idx = menu.findIndex((m) => m.id === editingMealId);
      if (idx !== -1) {
        menu[idx].name = name;
        menu[idx].price = price;
        menu[idx].description = description;
        menu[idx].tags = mealType === "lowWaste" ? ["lowWaste"] : ["standard"];
        if (pendingImageDataUrl !== null) menu[idx].image = pendingImageDataUrl;
      }
    } else {
      menu.push({
        id: "menu-" + Date.now(),
        name,
        price,
        description,
        image: pendingImageDataUrl || null,
        restaurant: "CloudEats Kitchen",
        tags: mealType === "lowWaste" ? ["lowWaste"] : ["standard"],
      });
    }
    saveMenu();
    renderMenu();
    renderMeals();
    menuForm.reset();
    pendingImageDataUrl = null;
    editingMealId = null;
    menuSubmitBtn.textContent = "Add meal";
    menuCancelBtn.style.display = "none";
  });
}

if (menuCancelBtn) {
  menuCancelBtn.addEventListener("click", () => {
    editingMealId = null;
    pendingImageDataUrl = null;
    menuForm.reset();
    menuSubmitBtn.textContent = "Add meal";
    menuCancelBtn.style.display = "none";
  });
}

const courierBody = document.getElementById("courier-body");

function renderCourierOrders() {
  if (!courierBody) return;
  courierBody.innerHTML = "";
  const eligible = orders.filter((o) => {
    const s = o.status.toLowerCase();
    return !s.includes("rejected") && !s.includes("delivered");
  });
  if (!eligible.length) {
    courierBody.innerHTML = '<tr><td colspan="5" class="muted">No orders available.</td></tr>';
    return;
  }
  eligible.forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.id}</td>
      <td>${order.restaurant}</td>
      <td>Customer address (mock)</td>
      <td><span class="${statusClass(order.status)}">${order.status}</span></td>
      <td>
        <div class="pill-row">
          <button class="secondary" data-step="onroute">On route</button>
          <button class="primary" data-step="delivered">Delivered</button>
        </div>
      </td>
    `;
    tr.querySelector('[data-step="onroute"]').addEventListener("click", () => {
      order.status = "On route to customer";
      saveOrders();
      renderCustomerOrders();
      renderRestaurantOrders();
      renderCourierOrders();
      updateAnalytics();
    });
    tr.querySelector('[data-step="delivered"]').addEventListener("click", () => {
      order.status = "Delivered";
      saveOrders();
      renderCustomerOrders();
      renderRestaurantOrders();
      renderCourierOrders();
      updateAnalytics();
    });
    courierBody.appendChild(tr);
  });
}

const metricOrders = document.getElementById("metric-orders");
const metricPortions = document.getElementById("metric-portions");
const metricOntime = document.getElementById("metric-ontime");
const metricAvgItems = document.getElementById("metric-avg-items");

function updateAnalytics() {
  const totalOrders = orders.length;
  const lowWasteItems = orders.reduce((sum, o) => sum + o.items.filter((m) => (m.tags || []).includes("lowWaste")).length, 0);
  const delivered = orders.filter((o) => o.status.toLowerCase().includes("delivered")).length;
  const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0);
  const avgItems = totalOrders === 0 ? 0 : (totalItems / totalOrders).toFixed(1);
  if (metricOrders) metricOrders.textContent = totalOrders;
  if (metricPortions) metricPortions.textContent = lowWasteItems;
  if (metricOntime) metricOntime.textContent = delivered;
  if (metricAvgItems) metricAvgItems.textContent = avgItems;
}

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
      if (loginError) loginError.textContent = "Invalid username or password.";
      return;
    }
    setCurrentUser(user);
    const allowed = rolePermissions[user.role] || ["index.html"];
    window.location.href = allowed[0];
  });
}

const registerForm = document.getElementById("register-form");
const registerError = document.getElementById("register-error");

if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm = document.getElementById("reg-confirm").value;
    const role = document.getElementById("reg-role").value;
    if (!username || !password || !confirm || !role) {
      if (registerError) registerError.textContent = "Fill all fields.";
      return;
    }
    if (password !== confirm) {
      if (registerError) registerError.textContent = "Passwords do not match.";
      return;
    }
    if (users.some((u) => u.username === username)) {
      if (registerError) registerError.textContent = "Username taken.";
      return;
    }
    const newUser = { username, password, role };
    users.push(newUser);
    saveUsers();
    setCurrentUser(newUser);
    const allowed = rolePermissions[role] || ["index.html"];
    window.location.href = allowed[0];
  });
}

updateUserBadge();
updateCartCount();
renderMeals();
renderCustomerOrders();
renderRestaurantOrders();
renderCourierOrders();
renderMenu();
updateAnalytics();
