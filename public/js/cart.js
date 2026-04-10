// public/js/cart.js

/**
 * Cart Management JavaScript
 * Handles all cart operations: quantity updates, remove items, apply coupons, etc.
 */

// Prevent double initialization flag
let cartInitialized = false;

// Initialize cart functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (cartInitialized) return;
    cartInitialized = true;
    
    console.log('Cart.js initialized');
    initializeQuantityControls();
    initializeCartButtons();
    initializeAddToCartButtons();
    loadRecommendedProducts();
    updateCartCount();
    initializeLogoutButtons();
    addCouponMessageContainer();
});

/**
 * Initialize quantity controls for cart items
 */
function initializeQuantityControls() {
    const quantityControls = document.querySelectorAll('.quantity-control');
    
    if (quantityControls.length === 0) return;

    quantityControls.forEach(control => {
        // Prevent double initialization
        if (control.dataset.initialized) return;
        control.dataset.initialized = 'true';

        const input = control.querySelector('.quantity-input');
        const decreaseBtn = control.querySelector('[data-action="decrease"]');
        const increaseBtn = control.querySelector('[data-action="increase"]');
        const cartItem = control.closest('.cart-item');

        if (!cartItem || !input) return;

        const itemId = cartItem.dataset.itemId;
        const maxStock = parseInt(input.dataset.productStock) || 999;

        if (!itemId) {
            console.error('No item ID found for cart item');
            return;
        }

        // Clone decrease button to strip any existing listeners
        if (decreaseBtn) {
            const newDecreaseBtn = decreaseBtn.cloneNode(true);
            decreaseBtn.parentNode.replaceChild(newDecreaseBtn, decreaseBtn);

            newDecreaseBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();

                if (this.disabled) return;

                const current = parseInt(input.value);
                if (current <= 1) return;

                const newQty = current - 1;
                input.value = newQty;

                // Update button states immediately
                this.disabled = newQty <= 1;
                const inc = control.querySelector('[data-action="increase"]');
                if (inc) inc.disabled = false;

                updateQuantity(itemId, newQty, cartItem);
            });
        }

        // Clone increase button to strip any existing listeners
        if (increaseBtn) {
            const newIncreaseBtn = increaseBtn.cloneNode(true);
            increaseBtn.parentNode.replaceChild(newIncreaseBtn, increaseBtn);

            newIncreaseBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopImmediatePropagation();

                if (this.disabled) return;

                const current = parseInt(input.value);
                if (current >= maxStock) {
                    showNotification(`Only ${maxStock} items available`, 'warning');
                    return;
                }

                const newQty = current + 1;
                input.value = newQty;

                // Update button states immediately
                this.disabled = newQty >= maxStock;
                const dec = control.querySelector('[data-action="decrease"]');
                if (dec) dec.disabled = false;

                updateQuantity(itemId, newQty, cartItem);
            });
        }
    });
}

/**
 * Update item quantity via API
 */
async function updateQuantity(itemId, quantity, cartItem) {
    if (!itemId) {
        console.error('updateQuantity called without itemId');
        return;
    }

    cartItem.style.opacity = '0.7';

    try {
        const response = await fetch(`/cart/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: parseInt(quantity) })
        });

        const data = await response.json();

        cartItem.style.opacity = '1';

        if (response.ok && data.success) {
            showNotification('Cart updated', 'success');

            // Update header cart count
            if (data.cartItemCount !== undefined) {
                updateCartCount(data.cartItemCount);
            } else {
                updateCartCount();
            }

            // Update totals in place if cart data returned
            if (data.cart) {
                updateCartTotals(data.cart);
            } else {
                setTimeout(() => window.location.reload(), 500);
            }
        } else {
            showNotification(data.message || 'Failed to update cart', 'error');
            setTimeout(() => window.location.reload(), 800);
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        cartItem.style.opacity = '1';
        showNotification('Error updating cart. Please try again.', 'error');
    }
}

/**
 * Update cart totals in the DOM without reloading
 */
function updateCartTotals(cart) {
    if (!cart) return;

    const subtotal = cart.subtotal || 0;
    const tax = cart.tax || 0;
    const shipping = cart.shippingCost || 0;
    const discount = cart.couponDiscount || 0;
    const total = cart.total || 0;
    const itemCount = (cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

    const el = id => document.getElementById(id);

    if (el('summary-subtotal')) el('summary-subtotal').textContent = `₦${Number(subtotal).toLocaleString()}`;
    if (el('summary-tax')) el('summary-tax').textContent = `₦${Number(tax).toLocaleString()}`;
    if (el('summary-shipping')) {
        el('summary-shipping').innerHTML = shipping === 0
            ? '<span class="text-success">Free</span>'
            : `₦${Number(shipping).toLocaleString()}`;
    }
    if (el('summary-total')) el('summary-total').textContent = `₦${Number(total).toLocaleString()}`;
    if (el('summary-item-count')) el('summary-item-count').textContent = itemCount;
    if (el('cart-items-count')) el('cart-items-count').textContent = itemCount;

    const discountRow = el('discount-row');
    const summaryDiscount = el('summary-discount');
    if (discountRow && summaryDiscount) {
        discountRow.style.display = discount > 0 ? 'flex' : 'none';
        summaryDiscount.textContent = `-₦${Number(discount).toLocaleString()}`;
    }
}

/**
 * Initialize all cart buttons with event listeners
 */
function initializeCartButtons() {
    // Remove item buttons — clone to strip existing listeners
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        if (btn.dataset.initialized) return;
        btn.dataset.initialized = 'true';

        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const itemId = this.dataset.itemId;
            if (itemId) removeFromCart(itemId);
        });
    });

    // Clear cart button
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn && !clearCartBtn.dataset.initialized) {
        clearCartBtn.dataset.initialized = 'true';

        const newBtn = clearCartBtn.cloneNode(true);
        clearCartBtn.parentNode.replaceChild(newBtn, clearCartBtn);

        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            clearCart();
        });
    }

    // Apply coupon button
    const applyCouponBtn = document.getElementById('applyCouponBtn');
    if (applyCouponBtn && !applyCouponBtn.dataset.initialized) {
        applyCouponBtn.dataset.initialized = 'true';

        const newBtn = applyCouponBtn.cloneNode(true);
        applyCouponBtn.parentNode.replaceChild(newBtn, applyCouponBtn);

        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            applyCoupon();
        });
    }

    // Remove coupon buttons
    document.querySelectorAll('.remove-coupon-btn').forEach(btn => {
        if (btn.dataset.initialized) return;
        btn.dataset.initialized = 'true';

        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            removeCoupon();
        });
    });

    // Enter key on coupon input
    const couponInput = document.getElementById('couponCode');
    if (couponInput && !couponInput.dataset.initialized) {
        couponInput.dataset.initialized = 'true';
        couponInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyCoupon();
            }
        });
    }
}

/**
 * Initialize logout buttons
 */
function initializeLogoutButtons() {
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    if (logoutBtn && !logoutBtn.dataset.initialized) {
        logoutBtn.dataset.initialized = 'true';
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await logout();
        });
    }

    if (mobileLogoutBtn && !mobileLogoutBtn.dataset.initialized) {
        mobileLogoutBtn.dataset.initialized = 'true';
        mobileLogoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await logout();
        });
    }
}

/**
 * Logout function
 */
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Logged out successfully', 'success');
            setTimeout(() => window.location.href = '/', 1000);
        } else {
            showNotification('Error logging out', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

/**
 * Add coupon message container if not present
 */
function addCouponMessageContainer() {
    const promoSection = document.querySelector('.promo-code');
    if (promoSection && !document.getElementById('coupon-message')) {
        const messageDiv = document.createElement('div');
        messageDiv.id = 'coupon-message';
        messageDiv.className = 'mt-3';
        promoSection.appendChild(messageDiv);
    }
}

/**
 * Remove item from cart
 */
async function removeFromCart(itemId) {
    if (!itemId) {
        console.error('removeFromCart called without itemId');
        return;
    }

    if (!confirm('Remove this item from your cart?')) return;

    const cartItem = document.querySelector(`[data-item-id="${itemId}"]`);
    if (cartItem) {
        cartItem.style.opacity = '0.5';
        cartItem.style.pointerEvents = 'none';
    }

    try {
        const response = await fetch(`/cart/items/${itemId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Item removed from cart', 'success');

            if (data.cartItemCount !== undefined) {
                updateCartCount(data.cartItemCount);
            } else {
                updateCartCount();
            }

            // Animate removal
            if (cartItem) {
                cartItem.style.transition = 'all 0.3s ease';
                cartItem.style.height = cartItem.offsetHeight + 'px';
                cartItem.style.overflow = 'hidden';

                setTimeout(() => {
                    cartItem.style.height = '0';
                    cartItem.style.padding = '0';
                    cartItem.style.margin = '0';
                    cartItem.style.opacity = '0';
                }, 10);

                setTimeout(() => {
                    cartItem.remove();
                    const remaining = document.querySelectorAll('.cart-item');
                    if (remaining.length === 0) {
                        window.location.reload();
                    }
                }, 320);
            }
        } else {
            if (cartItem) {
                cartItem.style.opacity = '1';
                cartItem.style.pointerEvents = 'auto';
            }
            showNotification(data.message || 'Failed to remove item', 'error');
        }
    } catch (error) {
        console.error('Error removing item:', error);
        if (cartItem) {
            cartItem.style.opacity = '1';
            cartItem.style.pointerEvents = 'auto';
        }
        showNotification('Error removing item. Please try again.', 'error');
    }
}

/**
 * Clear entire cart
 */
async function clearCart() {
    if (!confirm('Clear all items from your cart? This action cannot be undone.')) return;

    const clearBtn = document.getElementById('clearCartBtn');
    if (clearBtn) {
        clearBtn.disabled = true;
        clearBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Clearing...';
    }

    try {
        const response = await fetch('/cart/clear', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Cart cleared successfully', 'success');
            setTimeout(() => window.location.reload(), 800);
        } else {
            showNotification(data.message || 'Failed to clear cart', 'error');
            if (clearBtn) {
                clearBtn.disabled = false;
                clearBtn.innerHTML = '<i class="fas fa-trash-alt me-2"></i>Clear Cart';
            }
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
        showNotification('Error clearing cart. Please try again.', 'error');
        if (clearBtn) {
            clearBtn.disabled = false;
            clearBtn.innerHTML = '<i class="fas fa-trash-alt me-2"></i>Clear Cart';
        }
    }
}

/**
 * Apply coupon to cart
 */
async function applyCoupon() {
    const codeInput = document.getElementById('couponCode');
    const code = codeInput?.value.trim().toUpperCase();

    let messageDiv = document.getElementById('coupon-message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'coupon-message';
        messageDiv.className = 'mt-3';
        const promoRow = document.querySelector('.promo-code .row .col-md-8');
        if (promoRow) promoRow.appendChild(messageDiv);
    }

    messageDiv.innerHTML = '';
    messageDiv.style.display = 'none';

    if (!code) {
        showCouponMessage('Please enter a coupon code', 'warning');
        return;
    }

    const applyBtn = document.getElementById('applyCouponBtn');
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Applying...';
    }

    try {
        const response = await fetch('/cart/coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showCouponMessage(data.message || 'Coupon applied successfully!', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showCouponMessage(data.message || 'Invalid coupon code', 'error');
        }
    } catch (error) {
        console.error('Error applying coupon:', error);
        showCouponMessage('Error applying coupon. Please try again.', 'error');
    } finally {
        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.innerHTML = 'Apply';
        }
    }
}

/**
 * Remove coupon from cart
 */
async function removeCoupon() {
    try {
        const response = await fetch('/cart/coupon', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Coupon removed successfully', 'success');
            setTimeout(() => window.location.reload(), 800);
        } else {
            showNotification(data.message || 'Failed to remove coupon', 'error');
        }
    } catch (error) {
        console.error('Error removing coupon:', error);
        showNotification('Error removing coupon. Please try again.', 'error');
    }
}

/**
 * Add to cart from product cards / recommended products
 */
async function addToCart(productId, quantity = 1) {
    if (!productId) {
        console.error('addToCart called without productId');
        return;
    }

    const button = event?.target?.closest('button');
    let originalHtml = '';

    if (button) {
        originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
    }

    try {
        const response = await fetch('/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            if (data.cartItemCount !== undefined) {
                updateCartCount(data.cartItemCount);
            } else {
                updateCartCount();
            }

            showNotification('✓ Item added to cart successfully!', 'success');
            animateCartIcon();

            if (button) {
                button.innerHTML = '✓ Added';
                setTimeout(() => {
                    button.innerHTML = originalHtml;
                    button.disabled = false;
                }, 2000);
            }
        } else {
            showNotification(data.message || 'Failed to add to cart', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = originalHtml;
            }
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart. Please try again.', 'error');
        if (button) {
            button.disabled = false;
            button.innerHTML = originalHtml;
        }
    }
}

/**
 * Load recommended products
 */
async function loadRecommendedProducts() {
    const container = document.getElementById('recommended-products');
    if (!container) return;

    try {
        const response = await fetch('/api/products?limit=4&sort=-rating');
        const data = await response.json();

        let products = [];
        if (data.products && data.products.length > 0) {
            products = data.products;
        } else if (Array.isArray(data)) {
            products = data;
        }

        if (products.length > 0) {
            container.innerHTML = '';

            products.forEach(product => {
                const price = product.discountPrice || product.price;
                const image = product.images && product.images.length > 0
                    ? product.images[0].url
                    : '/images/placeholder.jpg';

                container.innerHTML += `
                    <div class="col-md-3 col-6 mb-4">
                        <div class="recommended-product card h-100 border-0">
                            <div class="recommended-image">
                                <img src="${image}" alt="${product.name}" 
                                     class="card-img-top img-fluid" loading="lazy">
                            </div>
                            <div class="recommended-info card-body text-center p-3">
                                <h5 class="card-title small fw-normal">${product.name}</h5>
                                <p class="recommended-price fw-bold mb-3">
                                    ₦${Number(price).toLocaleString()}
                                </p>
                                <button class="btn btn-outline-dark btn-sm w-100 add-to-cart-rec" 
                                        data-id="${product._id}">
                                    <i class="fas fa-plus me-2"></i>Add
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            // Wire up the new buttons
            document.querySelectorAll('.add-to-cart-rec').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const productId = this.dataset.id;
                    addToCart(productId, 1);
                });
            });
        } else {
            container.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">No recommendations available</p>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
        container.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Failed to load recommendations</p>
            </div>`;
    }
}

/**
 * Update cart count in header
 */
async function updateCartCount(count) {
    const cartCountElements = document.querySelectorAll(
        '#cartCount, #mobileCartCount, .cart-count'
    );

    if (count !== undefined) {
        cartCountElements.forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'inline-block' : 'none';
        });
    } else {
        try {
            const response = await fetch('/cart/count');
            const data = await response.json();

            if (data.success) {
                const newCount = data.count || 0;
                cartCountElements.forEach(el => {
                    el.textContent = newCount;
                    el.style.display = newCount > 0 ? 'inline-block' : 'none';
                });
            }
        } catch (error) {
            console.error('Error fetching cart count:', error);
        }
    }
}

/**
 * Animate cart icon when item is added
 */
function animateCartIcon() {
    const cartIcons = document.querySelectorAll(
        '.fa-shopping-bag, .fa-shopping-cart, .cart-icon'
    );
    cartIcons.forEach(icon => {
        icon.classList.add('cart-bounce');
        setTimeout(() => icon.classList.remove('cart-bounce'), 500);
    });
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    let notificationContainer = document.getElementById('notification-container');

    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.role = 'alert';

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Show coupon-specific message
 */
function showCouponMessage(message, type) {
    const messageDiv = document.getElementById('coupon-message');
    if (!messageDiv) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle'
    };

    messageDiv.style.display = 'block';
    messageDiv.className = `mt-3 alert alert-${type === 'error' ? 'danger' : type}`;
    messageDiv.innerHTML = `<i class="fas ${icons[type] || ''} me-2"></i>${message}`;
}

/**
 * Initialize add to cart buttons on product listing pages
 */
function initializeAddToCartButtons() {
    document.querySelectorAll(
        '.btn-add-cart, .btn-add-to-cart, [data-add-to-cart]'
    ).forEach(button => {
        if (button.dataset.initialized) return;
        button.dataset.initialized = 'true';

        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const productId = this.dataset.id
                || this.dataset.productId
                || this.dataset.addToCart;

            if (!productId) {
                console.error('No product ID found on button');
                return;
            }

            await addToCart(productId, 1);
        });
    });
}

// Add CSS styles
if (!document.getElementById('cart-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'cart-animation-styles';
    style.textContent = `
        #notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
        }

        #notification-container .alert {
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            animation: slideInRight 0.3s ease;
        }

        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
        }

        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50%       { transform: scale(1.2); }
        }

        .cart-bounce {
            animation: bounce 0.5s ease;
        }

        .cart-item {
            transition: opacity 0.3s ease, height 0.3s ease;
        }

        .recommended-product {
            transition: transform 0.3s ease;
        }

        .recommended-product:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .cart-count {
            background: #1a1a1a;
            color: white;
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 20px;
            position: absolute;
            top: -8px;
            right: -8px;
            min-width: 20px;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}

// Export for use in other scripts
window.showNotification = showNotification;
window.updateCartCount = updateCartCount;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;