// Registration Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrengthLevel = document.getElementById('passwordStrengthLevel');
    const passwordHint = document.getElementById('passwordHint');
    const submitButton = document.getElementById('submitButton');
    const submitText = document.getElementById('submitText');
    const submitSpinner = document.getElementById('submitSpinner');

    // Password strength checker
    function checkPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength += 1;
        if (password.match(/[a-z]+/)) strength += 1;
        if (password.match(/[A-Z]+/)) strength += 1;
        if (password.match(/[0-9]+/)) strength += 1;
        if (password.match(/[$@#&!]+/)) strength += 1;
        
        return strength;
    }

    // Update password strength indicator
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);
            
            let strengthText = '';
            let strengthClass = '';
            let width = '0%';
            
            if (password.length === 0) {
                width = '0%';
                strengthClass = '';
                strengthText = 'Enter a password';
            } else if (strength < 3) {
                width = '25%';
                strengthClass = 'weak';
                strengthText = 'Weak password';
            } else if (strength < 4) {
                width = '50%';
                strengthClass = 'fair';
                strengthText = 'Fair password';
            } else if (strength < 5) {
                width = '75%';
                strengthClass = 'good';
                strengthText = 'Good password';
            } else {
                width = '100%';
                strengthClass = 'strong';
                strengthText = 'Strong password';
            }
            
            passwordStrengthLevel.style.width = width;
            passwordStrengthLevel.className = 'strength-level ' + strengthClass;
            
            if (password.length > 0) {
                passwordHint.textContent = strengthText;
                passwordHint.className = 'password-hint ' + strengthClass;
            } else {
                passwordHint.textContent = 'Use 8+ characters with letters and numbers';
                passwordHint.className = 'password-hint';
            }
            
            // Check password match
            if (confirmPasswordInput.value) {
                validatePasswordMatch();
            }
        });
    }

    // Validate password match
    function validatePasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword.length > 0) {
            if (password !== confirmPassword) {
                confirmPasswordInput.classList.add('is-invalid');
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                return false;
            } else {
                confirmPasswordInput.classList.remove('is-invalid');
                confirmPasswordInput.classList.add('is-valid');
                document.getElementById('confirmPasswordError').textContent = '';
                return true;
            }
        }
        return false;
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }

    // Password visibility toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors();
            
            // Validate form
            if (!validateForm()) {
                return;
            }
            
            // Show loading state
            setLoading(true);
            
            // Collect form data
            const formData = {
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                email: document.getElementById('registerEmail').value.trim(),
                password: document.getElementById('registerPassword').value,
                phone: document.getElementById('phone').value.trim(),
                newsletterOptIn: document.getElementById('newsletterOptIn').checked,
                terms: document.getElementById('terms').checked
            };
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store tokens and user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('refreshToken', data.refreshToken);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    // Show success message
                    showAlert('success', 'Account created successfully! Redirecting...');
                    
                    // Redirect to account page after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/account';
                    }, 2000);
                } else {
                    // Handle specific error cases
                    handleError(data);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Registration error:', error);
                showAlert('danger', 'Network error. Please check your connection and try again.');
                setLoading(false);
            }
        });
    }

    // Form validation
    function validateForm() {
        let isValid = true;
        
        // Validate first name
        const firstName = document.getElementById('firstName');
        if (!firstName.value.trim()) {
            showFieldError('firstName', 'First name is required');
            isValid = false;
        }
        
        // Validate last name
        const lastName = document.getElementById('lastName');
        if (!lastName.value.trim()) {
            showFieldError('lastName', 'Last name is required');
            isValid = false;
        }
        
        // Validate email
        const email = document.getElementById('registerEmail');
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.value.trim()) {
            showFieldError('email', 'Email address is required');
            isValid = false;
        } else if (!emailPattern.test(email.value)) {
            showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Validate password
        const password = document.getElementById('registerPassword');
        if (!password.value) {
            showFieldError('password', 'Password is required');
            isValid = false;
        } else if (password.value.length < 8) {
            showFieldError('password', 'Password must be at least 8 characters');
            isValid = false;
        }
        
        // Validate password match
        const confirmPassword = document.getElementById('confirmPassword');
        if (!confirmPassword.value) {
            confirmPassword.classList.add('is-invalid');
            document.getElementById('confirmPasswordError').textContent = 'Please confirm your password';
            isValid = false;
        } else if (password.value !== confirmPassword.value) {
            confirmPassword.classList.add('is-invalid');
            document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
            isValid = false;
        }
        
        // Validate terms
        const terms = document.getElementById('terms');
        if (!terms.checked) {
            terms.classList.add('is-invalid');
            document.getElementById('termsError').textContent = 'You must agree to the Terms of Service and Privacy Policy';
            isValid = false;
        }
        
        return isValid;
    }

    // Show field error
    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + 'Error');
        
        if (field) {
            field.classList.add('is-invalid');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    // Clear all errors
    function clearErrors() {
        const errorFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'phone', 'terms'];
        
        errorFields.forEach(field => {
            const input = document.getElementById(field);
            const errorDiv = document.getElementById(field + 'Error');
            
            if (input) {
                input.classList.remove('is-invalid', 'is-valid');
            }
            
            if (errorDiv) {
                errorDiv.textContent = '';
            }
        });
    }

    // Set loading state
    function setLoading(isLoading) {
        if (isLoading) {
            submitButton.disabled = true;
            submitText.style.display = 'none';
            submitSpinner.style.display = 'inline-block';
        } else {
            submitButton.disabled = false;
            submitText.style.display = 'inline';
            submitSpinner.style.display = 'none';
        }
    }

    // Handle API errors
    function handleError(data) {
        if (data.message) {
            if (data.message.includes('already exists')) {
                showFieldError('email', 'This email is already registered');
            } else {
                showAlert('danger', data.message);
            }
        }
    }

    // Show alert message
    function showAlert(type, message) {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
        alertContainer.style.display = 'block';
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => {
                alertContainer.style.display = 'none';
                alertContainer.innerHTML = '';
            }, 150);
        }, 5000);
    }

    // Social login handlers
    document.getElementById('googleLogin')?.addEventListener('click', function() {
        window.location.href = '/api/auth/google';
    });

    document.getElementById('facebookLogin')?.addEventListener('click', function() {
        window.location.href = '/api/auth/facebook';
    });

    // Newsletter subscription
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('newsletterEmail').value;
            const newsletterSubmit = document.getElementById('newsletterSubmit');
            const newsletterText = document.getElementById('newsletterText');
            const newsletterSpinner = document.getElementById('newsletterSpinner');
            
            // Show loading state
            newsletterSubmit.disabled = true;
            newsletterText.style.display = 'none';
            newsletterSpinner.style.display = 'inline-block';
            
            try {
                const response = await fetch('/api/newsletter/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert('success', 'Thank you for subscribing!');
                    newsletterForm.reset();
                } else {
                    showAlert('danger', data.message || 'Subscription failed. Please try again.');
                }
            } catch (error) {
                showAlert('danger', 'Network error. Please try again.');
            } finally {
                // Reset button state
                newsletterSubmit.disabled = false;
                newsletterText.style.display = 'inline';
                newsletterSpinner.style.display = 'none';
            }
        });
    }
});