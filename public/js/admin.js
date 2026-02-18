/* ========================================================
   UZYHOMES ADMIN PANEL - admin.js
   Complete Admin Dashboard Functionality
   ======================================================== */

/* ─── API Helper with Token Management ─────────────────── */
const API = {
  token: localStorage.getItem('adminToken'),
  
  headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
    };
  },
  
  async request(method, url, data = null) {
    const options = { 
      method, 
      headers: this.headers(),
      credentials: 'include' // Important for cookies
    };
    
    console.log(`🌐 API Request: ${method} ${url}`, { token: this.token ? 'present' : 'missing' });
    
    if (data) options.body = JSON.stringify(data);
    
    try {
      const res = await fetch(url, options);
      
      console.log(`📡 API Response: ${res.status} ${res.statusText} for ${url}`);
      
      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('❌ Non-JSON response:', text.substring(0, 300));
        
        if (res.status === 401) {
          this.handleUnauthorized();
          return { ok: false, data: { message: 'Session expired' } };
        }
        
        if (res.status === 403) {
          Toast.error('Access denied. Insufficient permissions.');
          return { ok: false, data: { message: 'Access denied' } };
        }
        
        return { ok: false, data: { message: 'Server returned invalid response' } };
      }
      
      const json = await res.json();
      console.log('✅ JSON response received', json);
      
      if (res.status === 401) {
        this.handleUnauthorized();
        return { ok: false, status: res.status, data: json };
      }
      
      return { ok: res.ok, status: res.status, data: json };
      
    } catch (err) {
      console.error('❌ API request error:', err);
      return { ok: false, data: { message: 'Network error. Please check your connection.' } };
    }
  },
  
  handleUnauthorized() {
    // Clear tokens
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    this.token = null;
    
    // Show message
    Toast.error('Session expired. Please login again.');
    
    // Redirect to login page
    setTimeout(() => {
      window.location.href = '/admin/login';
    }, 1500);
  },
  
  get:    (url)       => API.request('GET',    url),
  post:   (url, data) => API.request('POST',   url, data),
  put:    (url, data) => API.request('PUT',    url, data),
  delete: (url)       => API.request('DELETE', url),
};

/* ─── Token Refresh Manager ───────────────────────────── */
const TokenManager = {
  refreshPromise: null,
  
  async refreshToken() {
    const refreshToken = localStorage.getItem('adminRefreshToken');
    
    if (!refreshToken) {
      return false;
    }
    
    try {
      const response = await fetch('/admin/auth/refresh', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Refresh failed');
      }
      
      const data = await response.json();
      
      if (data.success && data.token) {
        localStorage.setItem('adminToken', data.token);
        if (data.refreshToken) {
          localStorage.setItem('adminRefreshToken', data.refreshToken);
        }
        API.token = data.token;
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  },
  
  async handleTokenRefresh() {
    // If already refreshing, return existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = this.refreshToken();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }
};

/* ─── Toast Notification System ───────────────────────── */
const Toast = {
  container: null,
  
  init() {
    this.container = document.getElementById('toastContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'info', duration = 4000) {
    const icons = { 
      success: 'fa-check-circle', 
      error: 'fa-times-circle', 
      warning: 'fa-exclamation-triangle', 
      info: 'fa-info-circle' 
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas ${icons[type]} toast-icon"></i>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    this.container.appendChild(toast);
    
    setTimeout(() => { 
      toast.style.transition = 'opacity 0.4s'; 
      toast.style.opacity = '0'; 
    }, duration - 400);
    
    setTimeout(() => toast.remove(), duration);
  },
  
  success: (m) => Toast.show(m, 'success'),
  error:   (m) => Toast.show(m, 'error'),
  warning: (m) => Toast.show(m, 'warning'),
  info:    (m) => Toast.show(m, 'info'),
};

/* ─── Modal Manager ──────────────────────────────────── */
const Modal = {
  open(id) { 
    const el = document.getElementById(id); 
    if (el) { 
      el.classList.add('open'); 
      document.body.style.overflow = 'hidden'; 
    }
  },
  
  close(id) { 
    const el = document.getElementById(id); 
    if (el) { 
      el.classList.remove('open'); 
      document.body.style.overflow = ''; 
    }
  },
  
  closeAll() { 
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); 
    document.body.style.overflow = ''; 
  }
};

/* ─── Sidebar Navigation ─────────────────────────────── */
function initSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', () => { 
      sidebar.classList.remove('open'); 
      overlay.classList.remove('open'); 
    });
  }
  
  // Modal overlay clicks
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { 
      if (e.target === o) Modal.close(o.id); 
    });
  });
  
  // Dropdown menus
  document.querySelectorAll('[data-dropdown]').forEach(btn => {
    btn.addEventListener('click', e => { 
      e.stopPropagation(); 
      const m = document.getElementById(btn.dataset.dropdown); 
      m && m.classList.toggle('open'); 
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', () => 
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'))
  );
  
  // Highlight active menu item
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-menu a').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });
}

/* ─── Logout Function ───────────────────────────────── */
async function logout() {
  try {
    await API.post('/admin/auth/logout');
    Toast.success('Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    API.token = null;
    
    setTimeout(() => {
      window.location.href = '/admin/login';
    }, 1000);
  }
}

// Make logout globally available
window.logout = logout;

/* ─── Dashboard Functions ────────────────────────────── */
const Dashboard = {
  async init() {
    await this.loadStats();
    await this.loadRecentOrders();
    await this.loadCharts();
    await this.loadLowStockAlerts();
  },
  
  async loadStats() {
    const res = await API.get('/admin/api/dashboard/stats');
    if (!res.ok) return;
    
    this.updateStats(res.data);
  },
  
  updateStats(data) {
    const elements = {
      totalOrders: document.getElementById('totalOrders'),
      totalRevenue: document.getElementById('totalRevenue'),
      totalUsers: document.getElementById('totalUsers'),
      totalProducts: document.getElementById('totalProducts')
    };
    
    if (elements.totalOrders) {
      elements.totalOrders.textContent = data.totalOrders?.toLocaleString() || '0';
    }
    
    if (elements.totalRevenue) {
      elements.totalRevenue.textContent = '₦' + (data.totalRevenue?.toLocaleString() || '0');
    }
    
    if (elements.totalUsers) {
      elements.totalUsers.textContent = data.totalUsers?.toLocaleString() || '0';
    }
    
    if (elements.totalProducts) {
      elements.totalProducts.textContent = data.totalProducts?.toLocaleString() || '0';
    }
  },
  
  async loadRecentOrders() {
    const tbody = document.getElementById('recentOrdersTable');
    if (!tbody) return;
    
    const res = await API.get('/admin/api/orders?limit=5');
    if (!res.ok) return;
    
    const { orders } = res.data;
    
    if (!orders || orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4">
            <div class="empty-state small">
              <div class="empty-icon">📦</div>
              <div class="empty-title">No orders yet</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    const statusBadges = {
      pending: 'badge-warning',
      processing: 'badge-info',
      shipped: 'badge-primary',
      delivered: 'badge-success',
      cancelled: 'badge-danger'
    };
    
    tbody.innerHTML = orders.map(order => `
      <tr>
        <td class="fw-500">#${order.orderNumber || order._id.toString().slice(-8).toUpperCase()}</td>
        <td>${order.customer?.firstName || ''} ${order.customer?.lastName || 'Unknown'}</td>
        <td class="fw-500">₦${Number(order.total).toLocaleString()}</td>
        <td>
          <span class="badge ${statusBadges[order.orderStatus] || 'badge-secondary'}">
            ${order.orderStatus || 'pending'}
          </span>
        </td>
        <td class="text-muted">${new Date(order.createdAt).toLocaleDateString()}</td>
        <td>
          <a href="/admin/orders/${order._id}" class="btn btn-sm btn-ghost">
            <i class="fas fa-eye"></i> View
          </a>
        </td>
      </tr>
    `).join('');
  },
  
  async loadCharts() {
    if (!document.getElementById('revenueChart')) return;
    
    const res = await API.get('/admin/api/dashboard/charts');
    if (!res.ok) return;
    
    this.initCharts(res.data);
  },
  
  initCharts(data) {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
    if (revenueCtx && data.monthlyRevenue) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const labels = data.monthlyRevenue.map(item => 
        months[item._id.month - 1] + ' ' + item._id.year
      );
      
      new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Revenue (₦)',
            data: data.monthlyRevenue.map(item => item.revenue),
            borderColor: '#4361ee',
            backgroundColor: 'rgba(67, 97, 238, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: value => '₦' + value.toLocaleString()
              }
            }
          }
        }
      });
    }
    
    // Orders Status Chart
    const ordersCtx = document.getElementById('ordersChart')?.getContext('2d');
    if (ordersCtx && data.ordersByStatus) {
      new Chart(ordersCtx, {
        type: 'doughnut',
        data: {
          labels: data.ordersByStatus.map(item => item._id),
          datasets: [{
            data: data.ordersByStatus.map(item => item.count),
            backgroundColor: [
              '#4cc9f0',
              '#f72585',
              '#7209b7',
              '#f8961e',
              '#43aa8b'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  },
  
  async loadLowStockAlerts() {
    const container = document.getElementById('lowStockAlerts');
    if (!container) return;
    
    const res = await API.get('/admin/api/products/low-stock');
    if (!res.ok) return;
    
    const { products } = res.data;
    
    if (!products || products.length === 0) {
      container.innerHTML = `
        <div class="alert alert-success mb-0">
          <i class="fas fa-check-circle me-2"></i>
          All products have sufficient stock
        </div>
      `;
      return;
    }
    
    container.innerHTML = products.map(product => `
      <div class="alert alert-warning mb-2">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${product.name}</strong>
            <small class="d-block text-muted">SKU: ${product.sku || 'N/A'}</small>
          </div>
          <div>
            <span class="badge badge-danger">Stock: ${product.stock}</span>
            <a href="/admin/products/edit/${product._id}" class="btn btn-sm btn-ghost ms-2">
              <i class="fas fa-edit"></i>
            </a>
          </div>
        </div>
      </div>
    `).join('');
  }
};

/* ─── Products Management ────────────────────────────── */
const Products = {
  currentId: null,
  
  async loadTable(params = '') {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
    
    const res = await API.get('/admin/api/products?' + params);
    if (!res.ok) { 
      Toast.error('Failed to load products'); 
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-danger">Failed to load products</td></tr>`;
      return; 
    }
    
    const { products, pagination } = res.data;
    
    if (!products || !products.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">📦</div>
              <div class="empty-title">No products found</div>
              <p class="empty-text">Get started by adding your first product.</p>
              <button class="btn btn-primary mt-3" onclick="Products.openCreate()">
                <i class="fas fa-plus me-2"></i>Add Product
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <div class="product-info">
            <img src="${p.images?.[0]?.url || '/images/placeholder.jpg'}" 
                 class="product-thumb" alt="${p.name}">
            <div>
              <div class="product-name">${p.name}</div>
              <div class="product-sku">SKU: ${p.sku || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td>${p.category || '—'}</td>
        <td class="fw-500">₦${Number(p.price).toLocaleString()}</td>
        <td>${p.stock ?? 0}</td>
        <td>
          <span class="badge ${p.stock > 10 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-danger'}">
            ${p.stock > 10 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out of Stock'}
          </span>
        </td>
        <td>
          <span class="badge ${p.isActive ? 'badge-success' : 'badge-secondary'}">
            ${p.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-icon" onclick="Products.edit('${p._id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-icon text-danger" 
                    onclick="Products.confirmDelete('${p._id}', '${p.name.replace(/'/g, "\\'")}')" 
                    title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    
    this.updatePagination(pagination);
  },
  
  openCreate() {
    this.currentId = null;
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    Modal.open('productModal');
  },
  
  async edit(id) {
    this.currentId = id;
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    
    const res = await API.get(`/admin/products/${id}`);
    if (!res.ok) { 
      Toast.error('Failed to load product'); 
      return; 
    }
    
    const p = res.data.product;
    const form = document.getElementById('productForm');
    
    form.productName.value = p.name || '';
    form.category.value = p.category || '';
    form.price.value = p.price || '';
    form.stock.value = p.stock || '';
    form.description.value = p.description || '';
    form.isActive.checked = p.isActive !== false;
    
    Modal.open('productModal');
  },
  
  async save() {
    const form = document.getElementById('productForm');
    
    const data = {
      name: form.productName.value.trim(),
      category: form.category.value,
      price: parseFloat(form.price.value),
      stock: parseInt(form.stock.value) || 0,
      description: form.description.value.trim(),
      isActive: form.isActive.checked
    };
    
    if (!data.name || !data.price) { 
      Toast.warning('Name and price are required'); 
      return; 
    }
    
    const url = this.currentId ? `/admin/products/${this.currentId}` : '/admin/products';
    const method = this.currentId ? 'put' : 'post';
    
    const res = await API[method](url, data);
    
    if (res.ok) { 
      Toast.success(this.currentId ? 'Product updated successfully' : 'Product created successfully'); 
      Modal.close('productModal'); 
      this.loadTable(); 
    } else {
      Toast.error(res.data.message || 'Failed to save product');
    }
  },
  
  confirmDelete(id, name) {
    this.currentId = id;
    document.getElementById('deleteTargetName').textContent = name;
    document.getElementById('deleteModalTitle').textContent = 'Delete Product';
    Modal.open('deleteModal');
  },
  
  async deleteConfirmed() {
    const res = await API.delete(`/admin/products/${this.currentId}`);
    
    if (res.ok) { 
      Toast.success('Product deleted successfully'); 
      Modal.close('deleteModal'); 
      this.loadTable(); 
    } else {
      Toast.error(res.data.message || 'Delete failed');
    }
  },
  
  updatePagination(pagination) {
    if (!pagination) return;
    
    const paginationWrap = document.getElementById('paginationWrap');
    if (!paginationWrap) return;
    
    let html = '';
    
    if (pagination.pages > 1) {
      html += `
        <div class="pagination-info">
          Showing ${(pagination.page - 1) * pagination.limit + 1}–${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}
        </div>
        <div class="pagination">
      `;
      
      for (let i = 1; i <= pagination.pages; i++) {
        html += `
          <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
                  onclick="Products.loadTable('page=${i}')">${i}</button>
        `;
      }
      
      html += '</div>';
    }
    
    paginationWrap.innerHTML = html;
  },
  
  filter() {
    const search = document.getElementById('productSearch')?.value || '';
    const category = document.getElementById('productCategory')?.value || '';
    const status = document.getElementById('productStatus')?.value || '';
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    
    this.loadTable(params.toString());
  }
};

/* ─── Orders Management ──────────────────────────────── */
const Orders = {
  currentId: null,
  statusBadges: {
    pending: 'badge-warning',
    processing: 'badge-info',
    shipped: 'badge-primary',
    delivered: 'badge-success',
    cancelled: 'badge-danger'
  },
  
  async loadTable(params = '') {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
    
    const res = await API.get('/admin/api/orders?' + params);
    if (!res.ok) { 
      Toast.error('Failed to load orders'); 
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-danger">Failed to load orders</td></tr>`;
      return; 
    }
    
    const { orders, pagination } = res.data;
    
    if (!orders || !orders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">🛒</div>
              <div class="empty-title">No orders found</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td class="fw-500">#${o.orderNumber || o._id.toString().slice(-8).toUpperCase()}</td>
        <td>
          <div class="user-info">
            <div class="avatar">${(o.customer?.firstName?.[0] || 'U')}</div>
            <div>
              <div class="fw-500">${o.customer?.firstName || ''} ${o.customer?.lastName || 'Unknown'}</div>
              <div class="text-muted small">${o.customer?.email || ''}</div>
            </div>
          </div>
        </td>
        <td>${o.items?.length || 0} item(s)</td>
        <td class="fw-500">₦${Number(o.total).toLocaleString()}</td>
        <td>
          <span class="badge ${this.statusBadges[o.orderStatus] || 'badge-secondary'}">
            ${o.orderStatus}
          </span>
        </td>
        <td class="text-muted">${new Date(o.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="action-buttons">
            <a href="/admin/orders/${o._id}" class="btn btn-sm btn-ghost">
              <i class="fas fa-eye"></i>
            </a>
            <button class="btn btn-sm btn-ghost" onclick="Orders.openStatusModal('${o._id}', '${o.orderStatus}')">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    
    this.updatePagination(pagination);
  },
  
  openStatusModal(id, currentStatus) {
    this.currentId = id;
    document.getElementById('orderStatusSelect').value = currentStatus;
    document.getElementById('trackingNumber').value = '';
    document.getElementById('statusNote').value = '';
    Modal.open('statusModal');
  },
  
  async updateStatus() {
    const status = document.getElementById('orderStatusSelect')?.value;
    const tracking = document.getElementById('trackingNumber')?.value;
    const note = document.getElementById('statusNote')?.value;
    
    if (!status) { 
      Toast.warning('Please select a status'); 
      return; 
    }
    
    const res = await API.put(`/admin/orders/${this.currentId}/status`, { 
      status, 
      trackingNumber: tracking, 
      note 
    });
    
    if (res.ok) { 
      Toast.success('Order status updated successfully'); 
      Modal.close('statusModal'); 
      this.loadTable(); 
    } else {
      Toast.error(res.data.message || 'Failed to update status');
    }
  },
  
  updatePagination(pagination) {
    const paginationWrap = document.getElementById('paginationWrap');
    if (!paginationWrap || !pagination) return;
    
    let html = '';
    
    if (pagination.pages > 1) {
      html += `
        <div class="pagination-info">
          Page ${pagination.page} of ${pagination.pages} (${pagination.total} orders)
        </div>
        <div class="pagination">
      `;
      
      for (let i = 1; i <= pagination.pages; i++) {
        html += `
          <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
                  onclick="Orders.loadTable('page=${i}')">${i}</button>
        `;
      }
      
      html += '</div>';
    }
    
    paginationWrap.innerHTML = html;
  },
  
  filter() {
    const search = document.getElementById('orderSearch')?.value || '';
    const status = document.getElementById('orderStatus')?.value || '';
    const date = document.getElementById('orderDate')?.value || '';
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (date) params.append('date', date);
    
    this.loadTable(params.toString());
  }
};

/* ─── Users Management ───────────────────────────────── */
const Users = {
  currentId: null,
  
  async loadTable(params = '') {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
    
    const res = await API.get('/admin/api/users?' + params);
    if (!res.ok) { 
      Toast.error('Failed to load users'); 
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-danger">Failed to load users</td></tr>`;
      return; 
    }
    
    const { users, pagination } = res.data;
    
    if (!users || !users.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-icon">👥</div>
              <div class="empty-title">No users found</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div class="user-info">
            <div class="avatar">${(u.firstName?.[0] || u.email?.[0] || 'U').toUpperCase()}</div>
            <div>
              <div class="fw-500">${u.firstName || ''} ${u.lastName || ''}</div>
              <div class="text-muted small">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${u.phone || '—'}</td>
        <td>${u.ordersCount || 0}</td>
        <td class="fw-500">₦${Number(u.totalSpent || 0).toLocaleString()}</td>
        <td>
          <span class="badge ${u.isActive ? 'badge-success' : 'badge-danger'}">
            ${u.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-ghost" onclick="Users.toggleStatus('${u._id}', ${u.isActive})">
              <i class="fas fa-${u.isActive ? 'ban' : 'check'}"></i>
              ${u.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button class="btn btn-sm btn-ghost text-danger" 
                    onclick="Users.confirmDelete('${u._id}', '${(u.email || '').replace(/'/g, "\\'")}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    
    this.updatePagination(pagination);
  },
  
  async toggleStatus(id, isActive) {
    const res = await API.put(`/admin/users/${id}/status`, { isActive: !isActive });
    
    if (res.ok) { 
      Toast.success(`User ${isActive ? 'deactivated' : 'activated'} successfully`); 
      this.loadTable(); 
    } else {
      Toast.error(res.data.message || 'Failed to update user');
    }
  },
  
  confirmDelete(id, email) {
    this.currentId = id;
    document.getElementById('deleteTargetName').textContent = email;
    document.getElementById('deleteModalTitle').textContent = 'Delete User';
    Modal.open('deleteModal');
  },
  
  async deleteConfirmed() {
    const res = await API.delete(`/admin/users/${this.currentId}`);
    
    if (res.ok) { 
      Toast.success('User deleted successfully'); 
      Modal.close('deleteModal'); 
      this.loadTable(); 
    } else {
      Toast.error(res.data.message || 'Delete failed');
    }
  },
  
  updatePagination(pagination) {
    const paginationWrap = document.getElementById('paginationWrap');
    if (!paginationWrap || !pagination) return;
    
    let html = '';
    
    if (pagination.pages > 1) {
      html += `<div class="pagination">`;
      
      for (let i = 1; i <= pagination.pages; i++) {
        html += `
          <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
                  onclick="Users.loadTable('page=${i}')">${i}</button>
        `;
      }
      
      html += '</div>';
    }
    
    paginationWrap.innerHTML = html;
  },
  
  filter() {
    const search = document.getElementById('userSearch')?.value || '';
    const status = document.getElementById('userStatus')?.value || '';
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    
    this.loadTable(params.toString());
  }
};

/* ─── Coupons Management ─────────────────────────────── */
const Coupons = {
  currentId: null,
  
  async loadTable(params = '') {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
    
    const res = await API.get('/admin/api/coupons?' + params);
    if (!res.ok) { 
      Toast.error('Failed to load coupons'); 
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-danger">Failed to load coupons</td></tr>`;
      return; 
    }
    
    const { coupons, pagination } = res.data;
    
    if (!coupons || !coupons.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">🎟️</div>
              <div class="empty-title">No coupons found</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = coupons.map(c => {
      const expired = new Date(c.validUntil) < new Date();
      return `
        <tr>
          <td><span class="coupon-code">${c.code}</span></td>
          <td>${c.discountType === 'percentage' ? c.discountValue + '%' : '₦' + Number(c.discountValue).toLocaleString()}</td>
          <td class="text-muted">${new Date(c.validUntil).toLocaleDateString()}</td>
          <td>${c.usageCount || 0} / ${c.usageLimit || '∞'}</td>
          <td>
            <span class="badge ${expired ? 'badge-danger' : c.isActive ? 'badge-success' : 'badge-secondary'}">
              ${expired ? 'Expired' : c.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>₦${Number(c.minPurchaseAmount || 0).toLocaleString()}</td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-ghost" onclick="Coupons.edit('${c._id}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-ghost text-danger" 
                      onclick="Coupons.confirmDelete('${c._id}', '${c.code}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    this.updatePagination(pagination);
  },
  
  openCreate() {
    this.currentId = null;
    document.getElementById('couponModalTitle').textContent = 'Create New Coupon';
    document.getElementById('couponForm').reset();
    Modal.open('couponModal');
  },
  
  async edit(id) {
    this.currentId = id;
    document.getElementById('couponModalTitle').textContent = 'Edit Coupon';
    
    const res = await API.get(`/admin/coupons/${id}`);
    if (!res.ok) { 
      Toast.error('Failed to load coupon'); 
      return; 
    }
    
    const c = res.data.coupon;
    const form = document.getElementById('couponForm');
    
    form.code.value = c.code || '';
    form.discountType.value = c.discountType || 'percentage';
    form.discountValue.value = c.discountValue || '';
    form.minPurchaseAmount.value = c.minPurchaseAmount || '';
    form.usageLimit.value = c.usageLimit || '';
    form.validUntil.value = c.validUntil ? c.validUntil.split('T')[0] : '';
    form.isActive.checked = c.isActive !== false;
    
    Modal.open('couponModal');
  },
  
  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'UZY';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    document.getElementById('couponCode').value = code;
  },
  
  async save() {
    const form = document.getElementById('couponForm');
    
    const data = {
      code: form.code.value.trim().toUpperCase(),
      discountType: form.discountType.value,
      discountValue: parseFloat(form.discountValue.value),
      minPurchaseAmount: parseFloat(form.minPurchaseAmount.value) || 0,
      usageLimit: parseInt(form.usageLimit.value) || null,
      validUntil: form.validUntil.value,
      isActive: form.isActive.checked
    };
    
    if (!data.code || !data.discountValue || !data.validUntil) { 
      Toast.warning('Please fill all required fields'); 
      return; 
    }
    
    const url = this.currentId ? `/admin/coupons/${this.currentId}` : '/admin/coupons';
    const method = this.currentId ? 'put' : 'post';
    
    const res = await API[method](url, data);
    
    if (res.ok) { 
      Toast.success(this.currentId ? 'Coupon updated successfully' : 'Coupon created successfully'); 
      Modal.close('couponModal'); 
      this.loadTable(); 
    } else {
      Toast.error(res.data.message || 'Failed to save coupon');
    }
  },
  
  confirmDelete(id, code) {
    this.currentId = id;
    document.getElementById('deleteTargetName').textContent = code;
    document.getElementById('deleteModalTitle').textContent = 'Delete Coupon';
    Modal.open('deleteModal');
  },
  
  async deleteConfirmed() {
    const res = await API.delete(`/admin/coupons/${this.currentId}`);
    
    if (res.ok) { 
      Toast.success('Coupon deleted successfully'); 
      Modal.close('deleteModal'); 
      this.loadTable(); 
    } else {
      Toast.error(res.data.message || 'Delete failed');
    }
  },
  
  updatePagination(pagination) {
    if (!pagination) return;
    
    const paginationWrap = document.getElementById('paginationWrap');
    if (!paginationWrap) return;
    
    let html = '';
    
    if (pagination.pages > 1) {
      html += `
        <div class="pagination-info">
          Page ${pagination.page} of ${pagination.pages} (${pagination.total} coupons)
        </div>
        <div class="pagination">
      `;
      
      for (let i = 1; i <= pagination.pages; i++) {
        html += `
          <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
                  onclick="Coupons.loadTable('page=${i}')">${i}</button>
        `;
      }
      
      html += '</div>';
    }
    
    paginationWrap.innerHTML = html;
  },
  
  filter() {
    const search = document.getElementById('couponSearch')?.value || '';
    const status = document.getElementById('couponStatus')?.value || '';
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    
    this.loadTable(params.toString());
  }
};

/* ─── Transactions Management ────────────────────────── */
const Transactions = {
  statusBadges: {
    completed: 'badge-success',
    failed: 'badge-danger',
    pending: 'badge-warning',
    refunded: 'badge-info'
  },
  
  async loadTable(params = '') {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
    
    const res = await API.get('/admin/api/transactions?' + params);
    if (!res.ok) { 
      Toast.error('Failed to load transactions'); 
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-danger">Failed to load transactions</td></tr>`;
      return; 
    }
    
    const { transactions, pagination } = res.data;
    
    if (!transactions || !transactions.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-icon">💳</div>
              <div class="empty-title">No transactions found</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = transactions.map(t => `
      <tr>
        <td class="fw-500">${t.reference || t._id.toString().slice(-10).toUpperCase()}</td>
        <td>
          <div class="user-info">
            <div class="avatar">${(t.customer?.firstName?.[0] || 'U')}</div>
            <div>
              <div class="fw-500">${t.customer?.firstName || ''} ${t.customer?.lastName || 'Unknown'}</div>
              <div class="text-muted small">${t.customer?.email || ''}</div>
            </div>
          </div>
        </td>
        <td class="fw-500">₦${Number(t.amount).toLocaleString()}</td>
        <td>${t.paymentMethod || t.provider || 'Paystack'}</td>
        <td>
          <span class="badge ${this.statusBadges[t.status] || 'badge-secondary'}">
            ${t.status}
          </span>
        </td>
        <td class="text-muted">${new Date(t.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('');
    
    this.updatePagination(pagination);
  },
  
  updatePagination(pagination) {
    if (!pagination) return;
    
    const paginationWrap = document.getElementById('paginationWrap');
    if (!paginationWrap) return;
    
    let html = '';
    
    if (pagination.pages > 1) {
      html += `
        <div class="pagination-info">
          Page ${pagination.page} of ${pagination.pages} (${pagination.total} transactions)
        </div>
        <div class="pagination">
      `;
      
      for (let i = 1; i <= pagination.pages; i++) {
        html += `
          <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
                  onclick="Transactions.loadTable('page=${i}')">${i}</button>
        `;
      }
      
      html += '</div>';
    }
    
    paginationWrap.innerHTML = html;
  },
  
  filter() {
    const search = document.getElementById('txSearch')?.value || '';
    const status = document.getElementById('txStatus')?.value || '';
    const date = document.getElementById('txDate')?.value || '';
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (date) params.append('date', date);
    
    this.loadTable(params.toString());
  }
};

/* ─── Settings Management ────────────────────────────── */
const Settings = {
  async saveGeneral(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });
    
    const res = await API.put('/admin/settings/general', data);
    
    if (res.ok) {
      Toast.success('Settings saved successfully');
    } else {
      Toast.error(res.data.message || 'Failed to save settings');
    }
  },
  
  async saveShipping(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });
    
    const res = await API.put('/admin/settings/shipping', data);
    
    if (res.ok) {
      Toast.success('Shipping settings saved');
    } else {
      Toast.error(res.data.message || 'Failed to save shipping settings');
    }
  },
  
  async savePayment(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });
    
    const res = await API.put('/admin/settings/payment', data);
    
    if (res.ok) {
      Toast.success('Payment settings saved');
    } else {
      Toast.error(res.data.message || 'Failed to save payment settings');
    }
  },
  
  async changePassword() {
    const current = document.getElementById('currentPassword')?.value;
    const newPw = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    
    if (!current || !newPw || !confirm) { 
      Toast.warning('All fields are required'); 
      return; 
    }
    
    if (newPw !== confirm) { 
      Toast.warning('New passwords do not match'); 
      return; 
    }
    
    if (newPw.length < 8) { 
      Toast.warning('Password must be at least 8 characters'); 
      return; 
    }
    
    const res = await API.post('/admin/auth/change-password', { 
      currentPassword: current, 
      newPassword: newPw 
    });
    
    if (res.ok) { 
      Toast.success('Password changed successfully'); 
      document.getElementById('passwordForm')?.reset(); 
    } else {
      Toast.error(res.data.message || 'Failed to change password');
    }
  },
  
  async updateProfile() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });
    
    const res = await API.put('/admin/auth/profile', data);
    
    if (res.ok) {
      Toast.success('Profile updated successfully');
    } else {
      Toast.error(res.data.message || 'Failed to update profile');
    }
  }
};

/* ─── Delete Confirmation Dispatcher ─────────────────── */
function confirmDeleteAction() {
  const page = document.body.dataset.page;
  
  if (page === 'products') {
    Products.deleteConfirmed();
  } else if (page === 'users') {
    Users.deleteConfirmed();
  } else if (page === 'coupons') {
    Coupons.deleteConfirmed();
  }
}

/* ─── Utility Functions ──────────────────────────────── */
function debounce(fn, delay = 400) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatCurrency(amount) {
  return '₦' + Number(amount).toLocaleString();
}

/* ─── Initialize Everything ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize toast system
  Toast.init();
  
  // Initialize sidebar
  initSidebar();
  
  // Get current page from body data attribute
  const page = document.body.dataset.page;
  
  // Load page-specific data
  if (page === 'dashboard') {
    Dashboard.init();
  } else if (page === 'products') {
    Products.loadTable();
  } else if (page === 'orders') {
    Orders.loadTable();
  } else if (page === 'users') {
    Users.loadTable();
  } else if (page === 'transactions') {
    Transactions.loadTable();
  } else if (page === 'coupons') {
    Coupons.loadTable();
  }
  
  // Initialize search inputs with debounce
  document.querySelectorAll('[data-search]').forEach(input => {
    const target = input.dataset.search;
    input.addEventListener('input', debounce(() => {
      if (target === 'products') Products.filter();
      if (target === 'orders') Orders.filter();
      if (target === 'users') Users.filter();
      if (target === 'transactions') Transactions.filter();
      if (target === 'coupons') Coupons.filter();
    }));
  });
  
  // Initialize filter selects
  document.querySelectorAll('[data-filter]').forEach(select => {
    select.addEventListener('change', () => {
      const target = select.dataset.filter;
      if (target === 'products') Products.filter();
      if (target === 'orders') Orders.filter();
      if (target === 'users') Users.filter();
      if (target === 'transactions') Transactions.filter();
      if (target === 'coupons') Coupons.filter();
    });
  });
  
  // Initialize date inputs
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.addEventListener('change', () => {
      const target = input.dataset.filter;
      if (target === 'orders') Orders.filter();
      if (target === 'transactions') Transactions.filter();
    });
  });
  
  // Handle enter key in search inputs
  document.querySelectorAll('input[data-search]').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = input.dataset.search;
        if (target === 'products') Products.filter();
        if (target === 'orders') Orders.filter();
        if (target === 'users') Users.filter();
        if (target === 'transactions') Transactions.filter();
        if (target === 'coupons') Coupons.filter();
      }
    });
  });
});

/* ─── Export for global use ──────────────────────────── */
window.Products = Products;
window.Orders = Orders;
window.Users = Users;
window.Coupons = Coupons;
window.Transactions = Transactions;
window.Settings = Settings;
window.Modal = Modal;
window.confirmDeleteAction = confirmDeleteAction;