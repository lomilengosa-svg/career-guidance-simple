// Institution Dashboard JavaScript

// Chart data for visualizations
let applicationChart = null;
let courseChart = null;

// Dashboard state management
const dashboardState = {
    currentView: 'overview',
    filters: {
        dateRange: '7days',
        status: 'all'
    },
    notifications: []
};

// Initialize Charts
function initializeCharts() {
    // Applications chart
    const applicationCtx = document.getElementById('applicationsChart').getContext('2d');
    applicationChart = new Chart(applicationCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Applications',
                data: [],
                borderColor: '#4CAF50',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Course popularity chart
    const courseCtx = document.getElementById('coursePopularityChart').getContext('2d');
    courseChart = new Chart(courseCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Applications per Course',
                data: [],
                backgroundColor: '#2196F3'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Real-time notifications
function initializeNotifications() {
    const eventSource = new EventSource(`${config.apiUrl}/api/institution/notifications/stream`);
    
    eventSource.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        displayNotification(notification);
        updateDashboardCounts();
    };

    eventSource.onerror = (error) => {
        console.error('Notification stream error:', error);
        eventSource.close();
        // Retry connection after 5 seconds
        setTimeout(initializeNotifications, 5000);
    };
}

// Display notification
function displayNotification(notification) {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification notification-${notification.type}`;
    notificationElement.innerHTML = `
        <div class="notification-content">
            <span class="notification-title">${notification.title}</span>
            <p>${notification.message}</p>
        </div>
        <button class="notification-close" onclick="dismissNotification(this)">&times;</button>
    `;
    
    const container = document.getElementById('notificationsContainer');
    container.insertBefore(notificationElement, container.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (notificationElement.parentElement) {
            notificationElement.remove();
        }
    }, 5000);
}

// Responsive data loading
async function loadDashboardData(filters = {}) {
    showLoadingSpinner();
    try {
        await Promise.all([
            loadApplicationStats(filters),
            loadCourseStats(filters),
            loadRecentApplications(filters),
            loadPopularCourses(filters)
        ]);
        updateCharts();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('Failed to load dashboard data');
    } finally {
        hideLoadingSpinner();
    }
}

// Dynamic table updates
function updateApplicationTable(applications) {
    const tbody = document.getElementById('recentApplications');
    if (!applications.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No applications found</td></tr>';
        return;
    }

    tbody.innerHTML = applications.map(app => `
        <tr class="application-row" data-id="${app.id}">
            <td>
                <div class="student-info">
                    <img src="${app.studentPhoto || 'img/default-avatar.png'}" alt="Student photo" class="student-photo">
                    <div>
                        <div class="student-name">${app.studentName}</div>
                        <div class="student-email">${app.studentEmail}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="course-info">
                    <div class="course-name">${app.courseName}</div>
                    <div class="course-faculty">${app.faculty}</div>
                </div>
            </td>
            <td>
                <div class="date-info">
                    <div class="application-date">${formatDate(app.appliedDate)}</div>
                    <div class="time-ago">${timeAgo(app.appliedDate)}</div>
                </div>
            </td>
            <td>
                <div class="gpa-display" title="GPA: ${app.studentGPA}">
                    ${createGPAIndicator(app.studentGPA)}
                </div>
            </td>
            <td>
                <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="reviewApplication('${app.id}')">
                        <i class="fas fa-eye"></i> Review
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="viewStudentProfile('${app.studentId}')">
                        <i class="fas fa-user"></i> Profile
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Course management functions
async function saveCourse(courseData) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/courses`, {
            method: courseData.id ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();
        if (data.success) {
            showSuccessMessage(`Course ${courseData.id ? 'updated' : 'created'} successfully`);
            closeModal('courseModal');
            loadDashboardData();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error saving course:', error);
        showErrorMessage(error.message);
    }
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    if (interval === 1) return 'a year ago';

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    if (interval === 1) return 'a month ago';

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    if (interval === 1) return 'yesterday';

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    if (interval === 1) return 'an hour ago';

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    if (interval === 1) return 'a minute ago';

    return 'just now';
}

function createGPAIndicator(gpa) {
    const percentage = (gpa / 4) * 100;
    return `
        <div class="gpa-indicator">
            <div class="gpa-bar" style="width: ${percentage}%; background-color: ${getGPAColor(gpa)}">
                ${gpa.toFixed(2)}
            </div>
        </div>
    `;
}

function getGPAColor(gpa) {
    if (gpa >= 3.5) return '#4CAF50';
    if (gpa >= 3.0) return '#8BC34A';
    if (gpa >= 2.5) return '#FFC107';
    if (gpa >= 2.0) return '#FF9800';
    return '#F44336';
}

// Loading states
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(spinner);
}

function hideLoadingSpinner() {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    initializeNotifications();
    loadDashboardData();

    // Set up responsive event listeners
    window.addEventListener('resize', () => {
        if (applicationChart) applicationChart.resize();
        if (courseChart) courseChart.resize();
    });

    // Set up infinite scroll for applications table
    const applicationsList = document.getElementById('recentApplications');
    let loading = false;
    let page = 1;

    function loadMoreApplications() {
        if (loading) return;
        
        const scrollPosition = window.innerHeight + window.scrollY;
        const scrollThreshold = document.documentElement.scrollHeight - 100;
        
        if (scrollPosition >= scrollThreshold) {
            loading = true;
            loadRecentApplications({ page: ++page })
                .finally(() => loading = false);
        }
    }

    window.addEventListener('scroll', loadMoreApplications);
});

// Export functions for use in HTML
window.saveCourse = saveCourse;
window.reviewApplication = reviewApplication;
window.viewStudentProfile = viewStudentProfile;
window.dismissNotification = (element) => element.parentElement.remove();