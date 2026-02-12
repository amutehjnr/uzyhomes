// Account Management
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
        window.location.href = '/login';
        return;
    }
    
    const user = JSON.parse(userData);
    
    // Load user data
    loadUserData(user);
    
    // Profile form submission
    document.getElementById('profileForm').addEventListener('submit', updateProfile);
    
    // Change password form submission
    document.getElementById('changePasswordForm').addEventListener('submit', changePassword);
    
    // Logout
    document.querySelectorAll('#logout-tab, #mobileLogoutBtn, #logoutBtn').forEach(btn => {
        btn.addEventListener('click', logout);
    });
});

function loadUserData(user) {
    // Update user info
    document.getElementById('userName').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('dashboardName').textContent = user.firstName;
    
    // Fill profile form
    document.getElementById('profileFirstName').value = user.firstName;
    document.getElementById('profileLastName').value = user.lastName;
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profilePhone').value = user.phone || '';
}

async function updateProfile(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('profileFirstName').value;
    const lastName = document.getElementById('profileLastName').value;
    const phone = document.getElementById('profilePhone').value;
    
    const updateBtn = document.getElementById('updateProfileBtn');
    const updateText = document.getElementById('updateProfileText');
    const updateSpinner = document.getElementById('updateProfileSpinner');
    
    // Show loading state
    updateBtn.disabled = true;
    updateText.style.display = 'none';
    updateSpinner.style.display = 'inline-block';
    
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ firstName, lastName, phone })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update local user data
            const user = JSON.parse(localStorage.getItem('user'));
            user.firstName = firstName;
            user.lastName = lastName;
            user.phone = phone;
            localStorage.setItem('user', JSON.stringify(user));
            
            // Reload user data
            loadUserData(user);
            
            showAlert('profileAlert', 'success', 'Profile updated successfully!');
        } else {
            showAlert('profileAlert', 'danger', data.message || 'Update failed');
        }
    } catch (error) {
        showAlert('profileAlert', 'danger', 'Network error. Please try again.');
    } finally {
        // Reset button state
        updateBtn.disabled = false;
        updateText.style.display = 'inline';
        updateSpinner.style.display = 'none';
    }
}

async function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    // Validate
    if (newPassword !== confirmPassword) {
        showAlert('passwordAlert', 'danger', 'New passwords do not match');
        return;
    }
    
    if (newPassword.length < 8) {
        showAlert('passwordAlert', 'danger', 'Password must be at least 8 characters');
        return;
    }
    
    const changeBtn = document.getElementById('changePasswordBtn');
    const changeText = document.getElementById('changePasswordText');
    const changeSpinner = document.getElementById('changePasswordSpinner');
    
    // Show loading state
    changeBtn.disabled = true;
    changeText.style.display = 'none';
    changeSpinner.style.display = 'inline-block';
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('passwordAlert', 'success', 'Password changed successfully!');
            document.getElementById('changePasswordForm').reset();
        } else {
            showAlert('passwordAlert', 'danger', data.message || 'Password change failed');
        }
    } catch (error) {
        showAlert('passwordAlert', 'danger', 'Network error. Please try again.');
    } finally {
        // Reset button state
        changeBtn.disabled = false;
        changeText.style.display = 'inline';
        changeSpinner.style.display = 'none';
    }
}

async function logout(e) {
    e.preventDefault();
    
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Redirect to home
        window.location.href = '/';
    }
}

function showAlert(containerId, type, message) {
    const container = document.getElementById(containerId);
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    container.innerHTML = '';
    container.appendChild(alert);
    container.style.display = 'block';
    
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            container.style.display = 'none';
            container.innerHTML = '';
        }, 150);
    }, 5000);
}