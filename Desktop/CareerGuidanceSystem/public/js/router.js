// Router function to handle role-based redirection
function redirectToDashboard(role) {
    switch(role) {
        case 'student':
            window.location.href = 'student-dashboard.html';
            break;
        case 'institution':
            window.location.href = 'institution-dashboard.html';
            break;
        case 'company':
            window.location.href = 'company-dashboard.html';
            break;
        default:
            console.error('Invalid role:', role);
            alert('Invalid user role');
    }
}

// Check if user is already logged in
function checkAuthState() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (token && role) {
        redirectToDashboard(role);
    }
}

// Export the functions
export { redirectToDashboard, checkAuthState };