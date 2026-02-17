document.addEventListener('DOMContentLoaded', function() {
    console.log('Contact page loaded');
    
    // Contact form
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    const formError = document.getElementById('formError');
    const submitBtn = contactForm?.querySelector('button[type="submit"]');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Hide previous messages
            if (formSuccess) formSuccess.classList.add('d-none');
            if (formError) formError.classList.add('d-none');
            
            // Show loading state
            if (submitBtn) {
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
            }

            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                service: document.getElementById('service').value,
                message: document.getElementById('message').value,
                subscribeToNewsletter: document.getElementById('newsletter')?.checked || false
            };

            try {
                const response = await fetch('/api/contact/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Show success message
                    if (formSuccess) {
                        formSuccess.textContent = data.message;
                        formSuccess.classList.remove('d-none');
                    }
                    
                    // Reset form
                    contactForm.reset();
                } else {
                    // Show error message
                    if (formError) {
                        formError.textContent = data.message || 'Error sending message. Please try again.';
                        formError.classList.remove('d-none');
                    }
                }
            } catch (error) {
                console.error('Contact form error:', error);
                if (formError) {
                    formError.textContent = 'Network error. Please check your connection and try again.';
                    formError.classList.remove('d-none');
                }
            } finally {
                // Reset button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send Message';
                }
            }
        });
    }

    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    const newsletterSuccess = document.getElementById('newsletterSuccess');

    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const emailInput = this.querySelector('input[type="email"]');
            const submitBtn = this.querySelector('button[type="submit"]');
            
            if (!emailInput || !submitBtn) return;
            
            // Hide previous message
            if (newsletterSuccess) {
                newsletterSuccess.classList.add('d-none');
            }

            // Show loading
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Subscribing...';

            try {
                const response = await fetch('/api/contact/newsletter/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: emailInput.value })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Show success
                    if (newsletterSuccess) {
                        newsletterSuccess.textContent = data.message;
                        newsletterSuccess.classList.remove('d-none');
                    }
                    emailInput.value = '';
                } else {
                    alert(data.message || 'Error subscribing. Please try again.');
                }
            } catch (error) {
                console.error('Newsletter error:', error);
                alert('Network error. Please check your connection.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // Consultation booking buttons
    document.querySelectorAll('.consultation-card .btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const card = this.closest('.consultation-card');
            const service = card.querySelector('h4').textContent;
            
            // Pre-fill contact form with consultation type
            const serviceSelect = document.getElementById('service');
            if (serviceSelect) {
                if (service.includes('Virtual')) {
                    serviceSelect.value = 'interior-design';
                } else if (service.includes('In-Person')) {
                    serviceSelect.value = 'styling';
                } else if (service.includes('Full Project')) {
                    serviceSelect.value = 'interior-design';
                }
                
                // Scroll to form
                document.querySelector('.contact-form-wrapper')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});