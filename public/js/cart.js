// public/js/cart.js

/**
 * Cart Management JavaScript
 * Handles all cart operations: quantity updates, remove items, apply coupons, etc.
 */

// Initialize cart functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cart.js initialized');
    initializeQuantityControls();
    initializeCartButtons();
    initializeAddToCartButtons();
    loadRecommendedProducts();
    updateCartCount();
    initializeLogoutButtons();
    
    // Add coupon message container if it doesn't exist
    addCouponMessageContainer();
});

/**
 * Initialize all cart buttons with event listeners (no inline handlers)
 */
function initializeCartButtons() {
    // Remove item buttons
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const itemId = this.dataset.itemId;
            if (itemId) {
                removeFromCart(itemId);
            }
        });
    });

    // Clear cart button
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearCart();
        });
    }

    // Apply coupon button
    const applyCouponBtn = document.getElementById('applyCouponBtn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', function(e) {
            e.preventDefault();
            applyCoupon();
        });
    }

    // Remove coupon buttons
    document.querySelectorAll('.remove-coupon-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            removeCoupon();
        });
    });

    // Search icon (if you want to add search functionality later)
    document.querySelectorAll('.search-icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            e.preventDefault();
            // Add search functionality here if needed
            console.log('Search clicked');
        });
    });
}

/**
 * Initialize logout buttons
 */
function initializeLogoutButtons() {
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await logout();
        });
    }
    
    if (mobileLogoutBtn) {
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
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
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
 * Initialize quantity controls for cart items
 */
function initializeQuantityControls() {
    const quantityControls = document.querySelectorAll('.quantity-control');
    console.log('Found quantity controls:', quantityControls.length);
    
    if (quantityControls.length === 0) {
        console.log('No quantity controls found - cart might be empty');
        return;
    }
    
    quantityControls.forEach(control => {
        const input = control.querySelector('.quantity-input');
        const decreaseBtn = control.querySelector('[data-action="decrease"]');
        const increaseBtn = control.querySelector('[data-action="increase"]');
        const cartItem = control.closest('.cart-item');
        
        if (!cartItem || !input) {
            console.warn('Cart item or input not found for control');
            return;
        }
        
        // Get itemId from data-item-id attribute
        const itemId = cartItem.dataset.itemId;
        const maxStock = parseInt(input?.dataset?.productStock || 999);

        console.log('Cart item initialized:', { itemId, maxStock, currentValue: input?.value });

        if (!itemId) {
            console.error('No item ID found for cart item');
            return;
        }

        // Remove existing listeners by cloning and replacing buttons
        if (decreaseBtn) {
            const newDecreaseBtn = decreaseBtn.cloneNode(true);
            decreaseBtn.parentNode.replaceChild(newDecreaseBtn, decreaseBtn);
            
            newDecreaseBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                let value = parseInt(input.value);
                if (value > 1) {
                    input.value = value - 1;
                    await updateQuantity(itemId, input.value, cartItem);
                }
            });
        }

        if (increaseBtn) {
            const newIncreaseBtn = increaseBtn.cloneNode(true);
            increaseBtn.parentNode.replaceChild(newIncreaseBtn, increaseBtn);
            
            newIncreaseBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                let value = parseInt(input.value);
                if (!maxStock || value < maxStock) {
                    input.value = value + 1;
                    await updateQuantity(itemId, input.value, cartItem);
                } else {
                    showNotification(`Only ${maxStock} items available`, 'warning');
                }
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
        showNotification('Error: Missing item ID', 'error');
        return;
    }

    // Show loading state
    cartItem.style.opacity = '0.5';
    
    try {
        console.log(`Updating item ${itemId} to quantity ${quantity}`);
        
        const response = await fetch(`/cart/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Cart updated', 'success');
            
            // Update cart count if returned
            if (data.cartItemCount !== undefined) {
                updateCartCount(data.cartItemCount);
            }
            
            // Reload the page to show updated totals
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            cartItem.style.opacity = '1';
            showNotification(data.message || 'Failed to update cart', 'error');
            
            // Reset input to original value by reloading
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        cartItem.style.opacity = '1';
        showNotification('Error updating cart. Please try again.', 'error');
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
    }

    try {
        console.log(`Removing item ${itemId}`);
        
        const response = await fetch(`/cart/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Item removed from cart', 'success');
            
            // Update cart count if returned
            if (data.cartItemCount !== undefined) {
                updateCartCount(data.cartItemCount);
            }
            
            // Reload the page
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            if (cartItem) cartItem.style.opacity = '1';
            showNotification(data.message || 'Failed to remove item', 'error');
        }
    } catch (error) {
        console.error('Error removing item:', error);
        if (cartItem) cartItem.style.opacity = '1';
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
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Cart cleared successfully', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 800);
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
    
    // Get or create message div
    let messageDiv = document.getElementById('coupon-message');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'coupon-message';
        messageDiv.className = 'mt-3';
        const promoRow = document.querySelector('.promo-code .row .col-md-8');
        if (promoRow) {
            promoRow.appendChild(messageDiv);
        }
    }
    
    // Clear previous messages
    messageDiv.innerHTML = '';
    messageDiv.style.display = 'none';
    
    if (!code) {
        showCouponMessage('Please enter a coupon code', 'warning');
        return;
    }

    // Disable apply button temporarily
    const applyBtn = document.getElementById('applyCouponBtn');
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Applying...';
    }

    try {
        console.log(`Applying coupon: ${code}`);
        
        const response = await fetch('/cart/coupon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showCouponMessage(data.message || 'Coupon applied successfully!', 'success');
            
            // Reload after 1.5 seconds to show updated totals
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showCouponMessage(data.message || 'Invalid coupon code', 'error');
        }
    } catch (error) {
        console.error('Error applying coupon:', error);
        showCouponMessage('Error applying coupon. Please try again.', 'error');
    } finally {
        // Re-enable apply button
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
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Coupon removed successfully', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 800);
        } else {
            showNotification(data.message || 'Failed to remove coupon', 'error');
        }
    } catch (error) {
        console.error('Error removing coupon:', error);
        showNotification('Error removing coupon. Please try again.', 'error');
    }
}

/**
 * Add to cart from anywhere (product cards, recommended products)
 */
async function addToCart(productId, quantity = 1) {
    if (!productId) {
        console.error('addToCart called without productId');
        return;
    }

    // Find and disable the clicked button
    const button = event?.target?.closest('button');
    if (button) {
        button.disabled = true;
        const originalHtml = button.innerHTML;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
    }

    try {
        console.log(`Adding product ${productId} to cart`);
        
        const response = await fetch('/cart/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productId, quantity })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Update cart count in header
            if (data.cartItemCount !== undefined) {
                updateCartCount(data.cartItemCount);
            } else {
                updateCartCount();
            }
            
            // Show success message
            showNotification('✓ Added to cart successfully!', 'success');
            
            // Animate cart icon
            animateCartIcon();
        } else {
            showNotification(data.message || 'Failed to add to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart. Please try again.', 'error');
    } finally {
        // Re-enable button
        if (button) {
            button.disabled = false;
            // Restore original button text
            if (button.classList.contains('btn-add-to-cart') || button.classList.contains('btn-add-cart')) {
                button.innerHTML = '<i class="fas fa-plus me-2"></i>Add';
            } else {
                button.innerHTML = '<i class="fas fa-plus me-2"></i>Add to Cart';
            }
        }
    }
}

/**
 * Load recommended products
 */
async function loadRecommendedProducts() {
    const container = document.getElementById('recommended-products');
    if (!container) {
        console.log('Recommended products container not found');
        return;
    }

    try {
        console.log('Loading recommended products');
        
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
                
                const productHtml = `
                    <div class="col-md-3 col-6 mb-4">
                        <div class="recommended-product card h-100 border-0">
                            <div class="recommended-image">
                                <img src="${image}" alt="${product.name}" class="card-img-top img-fluid" loading="lazy">
                            </div>
                            <div class="recommended-info card-body text-center p-3">
                                <h5 class="card-title small fw-normal">${product.name}</h5>
                                <p class="recommended-price fw-bold mb-3">₦${Number(price).toLocaleString()}</p>
                                <button class="btn btn-outline-dark btn-sm w-100 add-to-cart-rec" data-id="${product._id}">
                                    <i class="fas fa-plus me-2"></i>Add
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                container.innerHTML += productHtml;
            });
            
            // Add event listeners to the new buttons
            document.querySelectorAll('.add-to-cart-rec').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const productId = this.dataset.id;
                    addToCart(productId, 1);
                });
            });
        } else {
            container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">No recommendations available</p></div>';
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
        container.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Failed to load recommendations</p></div>';
    }
}

/**
 * Update cart count in header
 */
async function updateCartCount(count) {
    // Update all cart count elements (desktop and mobile)
    const cartCountElements = document.querySelectorAll('#cartCount, #mobileCartCount, .cart-count');
    
    if (count !== undefined) {
        // Use provided count
        cartCountElements.forEach(el => {
            if (el) {
                el.textContent = count;
                el.style.display = count > 0 ? 'inline-block' : 'none';
            }
        });
    } else {
        // Fetch current count
        try {
            const response = await fetch('/cart/count');
            const data = await response.json();
            
            if (data.success) {
                const newCount = data.count || 0;
                cartCountElements.forEach(el => {
                    if (el) {
                        el.textContent = newCount;
                        el.style.display = newCount > 0 ? 'inline-block' : 'none';
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching cart count:', error);
        }
    }
}

/**
 * Animate cart icon when item added
 */
function animateCartIcon() {
    const cartIcons = document.querySelectorAll('.fa-shopping-bag, .fa-shopping-cart, .cart-icon');
    cartIcons.forEach(icon => {
        icon.classList.add('cart-bounce');
        setTimeout(() => {
            icon.classList.remove('cart-bounce');
        }, 500);
    });
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Check if notification container exists, if not create it
    let notificationContainer = document.getElementById('notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.role = 'alert';

    // Add icon based on type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle me-2"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle me-2"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle me-2"></i>';
    }

    notification.innerHTML = `
        ${icon}${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    notificationContainer.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Show coupon message
 */
function showCouponMessage(message, type) {
    const messageDiv = document.getElementById('coupon-message');
    if (!messageDiv) return;

    messageDiv.style.display = 'block';
    messageDiv.className = `mt-3 alert alert-${type === 'error' ? 'danger' : type}`;
    
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle me-2"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-times-circle me-2"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-circle me-2"></i>';
            break;
    }
    
    messageDiv.innerHTML = icon + message;
}

/**
 * Initialize add to cart buttons on product pages
 */
function initializeAddToCartButtons() {
    document.querySelectorAll('.btn-add-cart, .btn-add-to-cart, [data-add-to-cart]').forEach(button => {
        // Skip if already initialized
        if (button.dataset.initialized) return;
        
        button.dataset.initialized = 'true';
        
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const productId = this.dataset.id || this.dataset.productId || this.dataset.addToCart;
            if (!productId) {
                console.error('No product ID found on button');
                return;
            }
            
            await addToCart(productId, 1);
        });
    });
}

// Add CSS animations if not already present
if (!document.getElementById('cart-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'cart-animation-styles';
    style.textContent = `
        #notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        }
        
        #notification-container .alert {
            min-width: 300px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        
        .cart-bounce {
            animation: bounce 0.5s ease;
        }
        
        .cart-item {
            transition: opacity 0.3s ease;
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

// Export functions for use in HTML
window.showNotification = showNotification;
window.updateCartCount = updateCartCount;
window.addToCart = addToCart;