/* ========================================================
   UZYHOMES ACCOUNT PAGE - account.js
   Complete Account Dashboard Functionality
   ======================================================== */

// API Helper for account page
const AccountAPI = {
  token: localStorage.getItem('token'),
  
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
      credentials: 'include'
    };
    
    if (data) options.body = JSON.stringify(data);
    
    try {
      const res = await fetch(url, options);
      
      if (res.status === 401) {
        console.log('Session expired, redirecting to login');
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        return null;
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response');
        return null;
      }
      
      return await res.json();
      
    } catch (err) {
      console.error('API request error:', err);
      return null;
    }
  },
  
  get: (url) => AccountAPI.request('GET', url),
  post: (url, data) => AccountAPI.request('POST', url, data),
  put: (url, data) => AccountAPI.request('PUT', url, data),
  delete: (url) => AccountAPI.request('DELETE', url),
};

// ======================================================
// USER DATA LOADING
// ======================================================

async function loadUserData() {
  try {
    const data = await AccountAPI.get('/api/auth/me');
    if (!data || !data.success) {
      console.error('Failed to load user data');
      return;
    }
    
    const user = data.user;
    
    // Update sidebar
    document.getElementById('sidebarUserName').textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
    document.getElementById('sidebarUserEmail').textContent = user.email || '';
    document.getElementById('dashboardName').textContent = user.firstName || 'User';
    
    // Profile form
    document.getElementById('profileFirstName').value = user.firstName || '';
    document.getElementById('profileLastName').value = user.lastName || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profilePhone').value = user.phone || '';
    
    // Member since
    if (user.createdAt) {
      const date = new Date(user.createdAt);
      document.getElementById('userMemberSince').textContent = `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    
    return user;
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// ======================================================
// ORDERS MANAGEMENT
// ======================================================

let currentOrdersPage = 1;
let ordersTotalPages = 1;
let currentOrderFilter = { status: '', date: '' };

async function loadOrders(page = 1, filters = {}) {
  try {
    currentOrdersPage = page;
    currentOrderFilter = { ...currentOrderFilter, ...filters };
    
    let url = `/api/orders?page=${page}&limit=10`;
    if (filters.status) url += `&status=${filters.status}`;
    if (filters.date) url += `&date=${filters.date}`;
    
    const data = await AccountAPI.get(url);
    if (!data || !data.success) {
      showError('ordersTable', 'Failed to load orders');
      return;
    }
    
    const orders = data.orders || [];
    const pagination = data.pagination || { total: 0, page: 1, pages: 1 };
    
    // Update order count badge
    document.getElementById('orderCount').textContent = pagination.total || 0;
    
    // Update dashboard stats
    updateOrderStats(orders);
    
    // Update recent orders on dashboard
    updateRecentOrders(orders.slice(0, 5));
    
    // Update orders table
    updateOrdersTable(orders, pagination);
    
  } catch (error) {
    console.error('Error loading orders:', error);
    showError('ordersTable', 'Failed to load orders');
  }
}

function updateOrderStats(orders) {
  const total = orders.length;
  const pending = orders.filter(o => ['pending', 'processing'].includes(o.orderStatus)).length;
  const completed = orders.filter(o => o.orderStatus === 'delivered').length;
  
  document.getElementById('totalOrders').textContent = total;
  document.getElementById('pendingOrders').textContent = pending;
  document.getElementById('completedOrders').textContent = completed;
}

function updateRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersTable');
  if (!tbody) return;
  
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
  
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>#${order.orderNumber || order._id.slice(-8).toUpperCase()}</td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td class="fw-500">₦${Number(order.total).toLocaleString()}</td>
      <td><span class="badge-status badge-${order.orderStatus || 'pending'}">${order.orderStatus || 'pending'}</span></td>
      <td><span class="badge-status badge-${order.paymentStatus === 'completed' ? 'success' : order.paymentStatus}">${order.paymentStatus || 'pending'}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="viewOrderDetails('${order._id}')">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function updateOrdersTable(orders, pagination) {
  const tbody = document.getElementById('ordersTable');
  if (!tbody) return;
  
  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="empty-state">
            <div class="empty-icon">📦</div>
            <div class="empty-title">No orders found</div>
          </div>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = orders.map(order => `
      <tr>
        <td>#${order.orderNumber || order._id.slice(-8).toUpperCase()}</td>
        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
        <td>${order.items?.length || 0} items</td>
        <td class="fw-500">₦${Number(order.total).toLocaleString()}</td>
        <td><span class="badge-status badge-${order.orderStatus || 'pending'}">${order.orderStatus || 'pending'}</span></td>
        <td><span class="badge-status badge-${order.paymentStatus === 'completed' ? 'success' : order.paymentStatus}">${order.paymentStatus || 'pending'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="viewOrderDetails('${order._id}')">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }
  
  updateOrdersPagination(pagination);
}

function updateOrdersPagination(pagination) {
  const wrap = document.getElementById('ordersPagination');
  if (!wrap) return;
  
  if (pagination.pages <= 1) {
    wrap.innerHTML = '';
    return;
  }
  
  let html = `
    <div class="pagination-info">
      Page ${pagination.page} of ${pagination.pages} (${pagination.total} orders)
    </div>
    <div class="pagination">
  `;
  
  for (let i = 1; i <= pagination.pages; i++) {
    html += `
      <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
              onclick="loadOrders(${i}, currentOrderFilter)">${i}</button>
    `;
  }
  
  html += '</div>';
  wrap.innerHTML = html;
}

// ======================================================
// TRANSACTIONS MANAGEMENT
// ======================================================

let currentTransactionsPage = 1;
let transactionsTotalPages = 1;
let currentTransactionFilter = { status: '', method: '', date: '' };

async function loadTransactions(page = 1, filters = {}) {
  console.log('🔍 Loading transactions...', { page, filters });
  
  // Show loading state
  const tbody = document.getElementById('transactionsTable');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2">Loading transactions...</p>
        </td>
      </tr>
    `;
  }
  
  try {
    currentTransactionsPage = page;
    currentTransactionFilter = { ...currentTransactionFilter, ...filters };
    
    let url = `/api/payments?page=${page}&limit=10`;
    if (filters.status) url += `&status=${filters.status}`;
    if (filters.method) url += `&method=${filters.method}`;
    if (filters.date) url += `&date=${filters.date}`;
    
    console.log('📡 Fetching from:', url);
    
    const data = await AccountAPI.get(url);
    console.log('📥 Response data:', data);
    
    if (!data) {
      console.log('❌ No response data');
      showError('transactionsTable', 'Failed to load transactions - no response');
      return;
    }
    
    if (!data.success) {
      console.log('❌ API returned success: false', data.message);
      showError('transactionsTable', data.message || 'Failed to load transactions');
      return;
    }
    
    // Handle the response structure from your controller
    const transactions = data.transactions || [];
    const pagination = data.pagination || { total: 0, page: 1, pages: 1 };
    
    console.log(`📊 Found ${transactions.length} transactions out of ${pagination.total}`);
    
    // Update transaction count badge
    const countElement = document.getElementById('transactionCount');
    if (countElement) countElement.textContent = pagination.total || 0;
    
    // Update transaction stats
    updateTransactionStats(transactions);
    
    // Update recent transactions on dashboard
    updateRecentTransactions(transactions.slice(0, 5));
    
    // Update transactions table
    updateTransactionsTable(transactions, pagination);
    
  } catch (error) {
    console.error('❌ Error loading transactions:', error);
    showError('transactionsTable', 'Failed to load transactions: ' + error.message);
  }
}

function updateTransactionStats(transactions) {
  if (!transactions) return;
  
  const totalSpent = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const successful = transactions.filter(t => t.status === 'completed').length;
  const pending = transactions.filter(t => t.status === 'pending').length;
  const failed = transactions.filter(t => t.status === 'failed').length;
  const refunded = transactions.filter(t => t.status === 'refunded').length;
  
  document.getElementById('totalSpent').textContent = `₦${totalSpent.toLocaleString()}`;
  document.getElementById('successfulTransactions').textContent = successful;
  document.getElementById('pendingTransactions').textContent = pending;
  document.getElementById('refundedTransactions').textContent = refunded;
}

function updateRecentTransactions(transactions) {
  const tbody = document.getElementById('recentTransactionsTable');
  if (!tbody) return;
  
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4">
          <div class="empty-state small">
            <div class="empty-icon">💳</div>
            <div class="empty-title">No transactions yet</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = transactions.map(t => `
    <tr>
      <td>${t.reference || t._id?.slice(-10).toUpperCase() || 'N/A'}</td>
      <td>${new Date(t.createdAt).toLocaleDateString()}</td>
      <td class="fw-500">₦${Number(t.amount).toLocaleString()}</td>
      <td>${t.paymentMethod || t.provider || 'Card'}</td>
      <td><span class="badge-status badge-${t.status === 'completed' ? 'success' : t.status}">${t.status || 'pending'}</span></td>
    </tr>
  `).join('');
}

function updateTransactionsTable(transactions, pagination) {
  const tbody = document.getElementById('transactionsTable');
  if (!tbody) return;
  
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="empty-state">
            <div class="empty-icon">💳</div>
            <div class="empty-title">No transactions found</div>
            <p class="empty-text">Your payment history will appear here</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = transactions.map(t => `
      <tr>
        <td>${t.reference || t._id?.slice(-10).toUpperCase() || 'N/A'}</td>
        <td>${new Date(t.createdAt).toLocaleDateString()}</td>
        <td>#${t.order?.orderNumber || t.order?.toString().slice(-8).toUpperCase() || 'N/A'}</td>
        <td class="fw-500">₦${Number(t.amount).toLocaleString()}</td>
        <td>${t.paymentMethod || t.provider || 'Card'}</td>
        <td><span class="badge-status badge-${t.status === 'completed' ? 'success' : t.status}">${t.status || 'pending'}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="viewTransactionDetails('${t._id}')">
            <i class="fas fa-receipt"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }
  
  updateTransactionsPagination(pagination);
}

function updateTransactionsPagination(pagination) {
  const wrap = document.getElementById('transactionsPagination');
  if (!wrap) return;
  
  if (pagination.pages <= 1) {
    wrap.innerHTML = '';
    return;
  }
  
  let html = `
    <div class="pagination-info">
      Page ${pagination.page} of ${pagination.pages} (${pagination.total} transactions)
    </div>
    <div class="pagination">
  `;
  
  for (let i = 1; i <= pagination.pages; i++) {
    html += `
      <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
              onclick="loadTransactions(${i}, currentTransactionFilter)">${i}</button>
    `;
  }
  
  html += '</div>';
  wrap.innerHTML = html;
}

// ======================================================
// ADDRESSES MANAGEMENT
// ======================================================

async function loadAddresses() {
  try {
    const data = await AccountAPI.get('/api/addresses');
    if (!data || !data.success) {
      showError('addressesList', 'Failed to load addresses');
      return;
    }
    
    const addresses = data.addresses || [];
    
    if (!addresses || addresses.length === 0) {
      document.getElementById('addressesList').innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-icon">📍</div>
          <div class="empty-title">No addresses saved</div>
          <p class="empty-text">Add an address to make checkout faster</p>
          <button class="btn btn-primary" onclick="showAddAddressModal()">
            <i class="fas fa-plus me-2"></i>Add Address
          </button>
        </div>
      `;
      return;
    }
    
    const addr = addresses[0];
    
    document.getElementById('addressesList').innerHTML = `
      <div class="address-card default">
        <div class="default-badge">Default</div>
        <div class="address-name">${addr.firstName || ''} ${addr.lastName || ''}</div>
        <div class="address-detail">${addr.street || ''}</div>
        <div class="address-detail">${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}</div>
        <div class="address-detail">${addr.country || 'Nigeria'}</div>
        <div class="address-detail">📞 ${addr.phone || ''}</div>
        <div class="address-actions">
          <button class="btn btn-outline btn-sm" onclick="editAddress()">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-outline btn-sm" onclick="deleteAddress()">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading addresses:', error);
    showError('addressesList', 'Failed to load addresses');
  }
}

function showAddAddressModal() {
  // Pre-fill with user data
  const firstName = document.getElementById('profileFirstName')?.value || '';
  const lastName = document.getElementById('profileLastName')?.value || '';
  const phone = document.getElementById('profilePhone')?.value || '';
  
  document.getElementById('addressFirstName').value = firstName;
  document.getElementById('addressLastName').value = lastName;
  document.getElementById('addressPhone').value = phone;
  document.getElementById('addressStreet').value = '';
  document.getElementById('addressCity').value = '';
  document.getElementById('addressState').value = '';
  document.getElementById('addressZip').value = '';
  document.getElementById('addressCountry').value = 'Nigeria';
  
  const modal = new bootstrap.Modal(document.getElementById('addAddressModal'));
  modal.show();
}

async function saveNewAddress() {
  const addressData = {
    firstName: document.getElementById('addressFirstName').value,
    lastName: document.getElementById('addressLastName').value,
    street: document.getElementById('addressStreet').value,
    city: document.getElementById('addressCity').value,
    state: document.getElementById('addressState').value,
    zipCode: document.getElementById('addressZip').value,
    country: document.getElementById('addressCountry').value,
    phone: document.getElementById('addressPhone').value
  };
  
  if (!addressData.firstName || !addressData.lastName || !addressData.street || !addressData.city || !addressData.state || !addressData.phone) {
    showAlert('Please fill in all required fields', 'warning');
    return;
  }
  
  try {
    const data = await AccountAPI.put('/api/addresses', addressData);
    if (data && data.success) {
      bootstrap.Modal.getInstance(document.getElementById('addAddressModal')).hide();
      showAlert('Address saved successfully', 'success');
      loadAddresses();
      loadUserData(); // Refresh user data
    } else {
      showAlert(data?.message || 'Failed to save address', 'danger');
    }
  } catch (error) {
    console.error('Error saving address:', error);
    showAlert('Failed to save address', 'danger');
  }
}

function editAddress() {
  showAddAddressModal();
}

async function deleteAddress() {
  if (!confirm('Are you sure you want to delete your address?')) return;
  
  try {
    const data = await AccountAPI.delete('/api/addresses');
    if (data && data.success) {
      showAlert('Address deleted successfully', 'success');
      loadAddresses();
    } else {
      showAlert(data?.message || 'Failed to delete address', 'danger');
    }
  } catch (error) {
    console.error('Error deleting address:', error);
    showAlert('Failed to delete address', 'danger');
  }
}

// ======================================================
// WISHLIST MANAGEMENT
// ======================================================

async function loadWishlist() {
  try {
    const data = await AccountAPI.get('/api/wishlist');
    if (!data || !data.success) {
      showError('wishlistItems', 'Failed to load wishlist');
      return;
    }
    
    const items = data.items || [];
    
    document.getElementById('wishlistCount').textContent = items.length;
    
    if (!items || items.length === 0) {
      document.getElementById('wishlistItems').innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-icon">❤️</div>
          <div class="empty-title">Your wishlist is empty</div>
          <p class="empty-text">Save items you love to your wishlist</p>
          <a href="/bedding" class="btn btn-primary">Shop Now</a>
        </div>
      `;
      return;
    }
    
    document.getElementById('wishlistItems').innerHTML = items.map(item => `
      <div class="wishlist-item">
        <img src="${item.product?.images?.[0]?.url || '/images/placeholder.jpg'}" 
             alt="${item.product?.name}" class="wishlist-image">
        <div class="wishlist-title">${item.product?.name || 'Product'}</div>
        <div class="wishlist-price">₦${Number(item.product?.price || 0).toLocaleString()}</div>
        <div class="d-flex justify-content-center gap-2">
          <button class="btn btn-primary btn-sm" onclick="addToCart('${item.product?._id}')">
            <i class="fas fa-shopping-bag"></i>
          </button>
          <button class="btn btn-outline btn-sm" onclick="removeFromWishlist('${item._id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading wishlist:', error);
    showError('wishlistItems', 'Failed to load wishlist');
  }
}

async function removeFromWishlist(itemId) {
  if (!confirm('Remove from wishlist?')) return;
  
  try {
    const data = await AccountAPI.delete(`/api/wishlist/${itemId}`);
    if (data && data.success) {
      showAlert('Item removed from wishlist', 'success');
      loadWishlist();
    } else {
      showAlert(data?.message || 'Failed to remove item', 'danger');
    }
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    showAlert('Failed to remove item', 'danger');
  }
}

// ======================================================
// PROFILE MANAGEMENT
// ======================================================

document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const updateBtn = document.getElementById('updateProfileBtn');
  const updateText = document.getElementById('updateProfileText');
  const updateSpinner = document.getElementById('updateProfileSpinner');
  
  updateBtn.disabled = true;
  updateText.style.display = 'none';
  updateSpinner.style.display = 'inline-block';
  
  const profileData = {
    firstName: document.getElementById('profileFirstName').value,
    lastName: document.getElementById('profileLastName').value,
    phone: document.getElementById('profilePhone').value
  };
  
  try {
    const data = await AccountAPI.put('/api/auth/profile', profileData);
    if (data && data.success) {
      showAlert('Profile updated successfully', 'success');
      loadUserData();
    } else {
      showAlert(data?.message || 'Failed to update profile', 'danger');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    showAlert('Failed to update profile', 'danger');
  } finally {
    updateBtn.disabled = false;
    updateText.style.display = 'inline-block';
    updateSpinner.style.display = 'none';
  }
});

// ======================================================
// PASSWORD MANAGEMENT
// ======================================================

document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const currentPw = document.getElementById('currentPassword').value;
  const newPw = document.getElementById('newPassword').value;
  const confirmPw = document.getElementById('confirmNewPassword').value;
  
  if (!currentPw || !newPw || !confirmPw) {
    showAlert('All fields are required', 'warning');
    return;
  }
  
  if (newPw !== confirmPw) {
    showAlert('New passwords do not match', 'warning');
    return;
  }
  
  if (newPw.length < 6) {
    showAlert('Password must be at least 6 characters', 'warning');
    return;
  }
  
  const changeBtn = document.getElementById('changePasswordBtn');
  const changeText = document.getElementById('changePasswordText');
  const changeSpinner = document.getElementById('changePasswordSpinner');
  
  changeBtn.disabled = true;
  changeText.style.display = 'none';
  changeSpinner.style.display = 'inline-block';
  
  try {
    const data = await AccountAPI.post('/api/auth/change-password', {
      currentPassword: currentPw,
      newPassword: newPw
    });
    
    if (data && data.success) {
      showAlert('Password changed successfully', 'success');
      document.getElementById('changePasswordForm').reset();
    } else {
      showAlert(data?.message || 'Failed to change password', 'danger');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    showAlert('Failed to change password', 'danger');
  } finally {
    changeBtn.disabled = false;
    changeText.style.display = 'inline-block';
    changeSpinner.style.display = 'none';
  }
});

// ======================================================
// UTILITY FUNCTIONS
// ======================================================

function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const container = document.querySelector('.account-content');
  if (container) {
    container.prepend(alertDiv);
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alertDiv);
      bsAlert.close();
    }, 5000);
  }
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-danger">
          <i class="fas fa-exclamation-circle me-2"></i>${message}
        </td>
      </tr>
    `;
  }
}

function viewOrderDetails(orderId) {
  window.location.href = `/orders/${orderId}`;
}

function viewTransactionDetails(transactionId) {
  window.location.href = `/transactions/${transactionId}`;
}

function addToCart(productId) {
  // Implement add to cart functionality
  console.log('Add to cart:', productId);
}

// ======================================================
// FILTER EVENT LISTENERS
// ======================================================

document.getElementById('orderStatusFilter')?.addEventListener('change', (e) => {
  loadOrders(1, { status: e.target.value, date: document.getElementById('orderDateFilter').value });
});

document.getElementById('orderDateFilter')?.addEventListener('change', (e) => {
  loadOrders(1, { status: document.getElementById('orderStatusFilter').value, date: e.target.value });
});

document.getElementById('transactionStatusFilter')?.addEventListener('change', (e) => {
  loadTransactions(1, { 
    status: e.target.value, 
    method: document.getElementById('transactionMethodFilter').value,
    date: document.getElementById('transactionDateFilter').value 
  });
});

document.getElementById('transactionMethodFilter')?.addEventListener('change', (e) => {
  loadTransactions(1, { 
    status: document.getElementById('transactionStatusFilter').value, 
    method: e.target.value,
    date: document.getElementById('transactionDateFilter').value 
  });
});

document.getElementById('transactionDateFilter')?.addEventListener('change', (e) => {
  loadTransactions(1, { 
    status: document.getElementById('transactionStatusFilter').value, 
    method: document.getElementById('transactionMethodFilter').value,
    date: e.target.value 
  });
});

// ======================================================
// INITIALIZATION
// ======================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Account page initialized');
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login?redirect=/account';
    return;
  }
  
  // Load user data first
  await loadUserData();
  
  // Load initial data for dashboard
  await loadOrders(1);
  await loadTransactions(1);
  
  // Check URL for payment status
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    showAlert('Payment successful! Your order has been placed.', 'success');
  } else if (urlParams.get('payment') === 'failed') {
    showAlert('Payment failed. Please try again.', 'danger');
  }
});

// Export functions for global use
window.loadOrders = loadOrders;
window.loadTransactions = loadTransactions;
window.loadAddresses = loadAddresses;
window.loadWishlist = loadWishlist;
window.showAddAddressModal = showAddAddressModal;
window.saveNewAddress = saveNewAddress;
window.editAddress = editAddress;
window.deleteAddress = deleteAddress;
window.removeFromWishlist = removeFromWishlist;
window.viewOrderDetails = viewOrderDetails;
window.viewTransactionDetails = viewTransactionDetails;