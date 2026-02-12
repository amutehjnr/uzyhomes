// Authentication helper functions

// Check if user is authenticated
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

// Get current user
function getCurrentUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

// Set auth header
function getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Refresh token
async function refreshToken() {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
            throw new Error('No refresh token');
        }
        
        const response = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('refreshToken', data.refreshToken);
            return data.token;
        } else {
            throw new Error('Token refresh failed');
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return null;
    }
}

// Make authenticated API call
async function fetchWithAuth(url, options = {}) {
    options.headers = {
        ...options.headers,
        ...getAuthHeader()
    };
    
    let response = await fetch(url, options);
    
    // If token expired, try to refresh
    if (response.status === 403) {
        const newToken = await refreshToken();
        if (newToken) {
            options.headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, options);
        }
    }
    
    return response;
}

// Update cart count
async function updateCartCount() {
    try {
        const response = await fetch('/api/cart/count', {
            headers: getAuthHeader()
        });
        
        if (response.ok) {
            const data = await response.json();
            const cartCount = data.count;
            
            document.querySelectorAll('.cart-count').forEach(el => {
                el.textContent = cartCount;
                el.style.display = cartCount > 0 ? 'inline-block' : 'none';
            });
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Update cart count
    if (isAuthenticated()) {
        updateCartCount();
    }
    
    // Check for stored user data
    const user = getCurrentUser();
    if (user) {
        // Update navigation for logged in user
        updateNavigationForLoggedInUser(user);
    }
});

// Update navigation for logged in user
function updateNavigationForLoggedInUser(user) {
    // Desktop navigation
    const desktopIcons = document.querySelector('.desktop-icons');
    if (desktopIcons) {
        const userIcon = desktopIcons.querySelector('a[href="/login"]');
        if (userIcon) {
            const userMenu = `
                <div class="dropdown">
                    <a href="#" class="nav-icon me-3" data-bs-toggle="dropdown" aria-label="Account">
                        <i class="fas fa-user"></i>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="/account">My Account</a></li>
                        <li><a class="dropdown-item" href="/orders">Orders</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" id="logoutBtn">Logout</a></li>
                    </ul>
                </div>
            `;
            userIcon.outerHTML = userMenu;
        }
    }
    
    // Mobile navigation
    const mobileNav = document.querySelector('.d-flex.flex-column.mt-3.pt-3.border-top');
    if (mobileNav) {
        const loginLink = mobileNav.querySelector('a[href="/login"]');
        if (loginLink) {
            const userMenu = `
                <a href="/account" class="nav-link mb-2">
                    <i class="fas fa-user me-2"></i>My Account
                </a>
                <a href="#" class="nav-link mb-2" id="mobileLogoutBtn">
                    <i class="fas fa-sign-out-alt me-2"></i>Logout
                </a>
            `;
            loginLink.outerHTML = userMenu;
        }
    }
}