
        // Add to cart functionality
        document.querySelectorAll('.btn-add-cart, .btn-add-to-cart').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.preventDefault();
                
                const productId = this.dataset.id;
                
                try {
                    const response = await fetch('/cart/items', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ productId, quantity: 1 })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Update cart count in header
                        const cartCountElement = document.getElementById('cart-count');
                        if (cartCountElement) {
                            cartCountElement.textContent = data.cartItemCount;
                            cartCountElement.style.display = 'inline-block';
                        }
                        
                        // Show success message
                        alert('✓ Added to cart');
                    } else {
                        alert(data.message || 'Failed to add to cart');
                    }
                } catch (error) {
                    console.error('Error adding to cart:', error);
                    alert('Error adding to cart. Please try again.');
                }
            });
        });

        // Load more products with AJAX
        document.getElementById('loadMore')?.addEventListener('click', async function() {
            const currentPage = <%= pagination.currentPage %>;
            const nextPage = currentPage + 1;
            
            if (nextPage > <%= pagination.totalPages %>) {
                this.disabled = true;
                this.textContent = 'No more products';
                return;
            }
            
            this.textContent = 'Loading...';
            this.disabled = true;
            
            try {
                const url = new URL(window.location);
                url.searchParams.set('page', nextPage);
                url.searchParams.set('ajax', 'true');
                
                const response = await fetch(url);
                const html = await response.text();
                
                document.getElementById('product-grid').insertAdjacentHTML('beforeend', html);
                
                // Reattach event listeners to new buttons
                document.querySelectorAll('.btn-add-cart:not([data-listener])').forEach(button => {
                    button.setAttribute('data-listener', 'true');
                    button.addEventListener('click', async function(e) {
                        e.preventDefault();
                        // Add to cart logic
                    });
                });
                
                this.textContent = 'Load More Products';
                this.disabled = false;
                
                // Update current page
                window.history.pushState({}, '', `?page=${nextPage}`);
                
            } catch (error) {
                console.error('Error loading more products:', error);
                this.textContent = 'Error loading. Try again.';
                this.disabled = false;
            }
        });
