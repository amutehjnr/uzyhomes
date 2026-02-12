// Login page JavaScript - Separated for better organization
document.addEventListener('DOMContentLoaded', function() {
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const refreshToken = urlParams.get('refreshToken');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');
    
    if (token && refreshToken && userParam) {
        try {
            const user = JSON.parse(decodeURIComponent(userParam));
            
            // Store auth data
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(user));
            
            // Show success and redirect
            showAlert('success', 'Login successful! Redirecting...');
            
            // Clean URL
            window.history.replaceState({}, document.title, '/login');
            
            setTimeout(() => {
                window.location.href = '/account';
            }, 1500);
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    if (error) {
        showAlert('danger', 'Social login failed. Please try again or use email login.');
        window.history.replaceState({}, document.title, '/login');
    }
    
    // Rest of your login form code...
    // (Copy the login form handling code from the main script above)
});