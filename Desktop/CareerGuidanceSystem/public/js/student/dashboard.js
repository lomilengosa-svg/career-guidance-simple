// Student Dashboard JavaScript
import { auth } from '../firebase-app.js';
import config from '../config.js';

let applicationsChart = null;
let userProfile = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadUserProfile(),
        loadApplicationStats(),
        loadRecommendedCourses(),
        loadJobMatches(),
        loadRecentActivity(),
        loadUpcomingEvents()
    ]);
    initializeCharts();
    setupEventListeners();
    initializeNotifications();
});

// Load user profile
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/student/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            userProfile = data.profile;
            updateProfileDisplay(userProfile);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showErrorMessage('Failed to load profile');
    }
}

// Update profile display
function updateProfileDisplay(profile) {
    document.getElementById('studentName').textContent = profile.name;
    document.getElementById('studentPhoto').src = profile.photo || '../img/default-avatar.png';
    document.getElementById('studentStatus').textContent = `Status: ${profile.status}`;
}

// Load application statistics
async function loadApplicationStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/student/applications/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('pendingApplications').textContent = data.stats.pending;
            document.getElementById('acceptedApplications').textContent = data.stats.accepted;
            document.getElementById('totalApplications').textContent = data.stats.total;
            
            if (applicationsChart) {
                updateApplicationsChart(data.stats);
            }
        }
    } catch (error) {
        console.error('Error loading application stats:', error);
        showErrorMessage('Failed to load application statistics');
    }
}

// Initialize charts
function initializeCharts() {
    const ctx = document.getElementById('applicationsChart').getContext('2d');
    applicationsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Accepted', 'Rejected'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#FFC107', '#4CAF50', '#F44336']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Update applications chart
function updateApplicationsChart(stats) {
    applicationsChart.data.datasets[0].data = [
        stats.pending,
        stats.accepted,
        stats.rejected
    ];
    applicationsChart.update();
}

// Load recommended courses
async function loadRecommendedCourses() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/student/recommendations/courses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const container = document.getElementById('recommendedCourses');
            container.innerHTML = data.courses.map(course => `
                <div class="recommendation-item">
                    <div class="recommendation-content">
                        <h4>${course.name}</h4>
                        <p>${course.institution}</p>
                        <div class="match-score">
                            <span class="score">${course.matchScore}% Match</span>
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${course.matchScore}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="recommendation-actions">
                        <button class="btn btn-primary btn-sm" onclick="viewCourse('${course.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recommended courses:', error);
        showErrorMessage('Failed to load course recommendations');
    }
}

// Load job matches
async function loadJobMatches() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/student/recommendations/jobs`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const container = document.getElementById('jobMatches');
            container.innerHTML = data.jobs.map(job => `
                <div class="recommendation-item">
                    <div class="recommendation-content">
                        <h4>${job.title}</h4>
                        <p>${job.company}</p>
                        <div class="match-score">
                            <span class="score">${job.matchScore}% Match</span>
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${job.matchScore}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="recommendation-actions">
                        <button class="btn btn-primary btn-sm" onclick="viewJob('${job.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading job matches:', error);
        showErrorMessage('Failed to load job recommendations');
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/student/activity`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const timeline = document.getElementById('activityTimeline');
            timeline.innerHTML = data.activities.map(activity => `
                <div class="timeline-item">
                    <div class="timeline-icon ${activity.type}">
                        <i class="fas ${getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <h4>${activity.title}</h4>
                            <span class="timeline-date">${formatDate(activity.date)}</span>
                        </div>
                        <p>${activity.description}</p>
                        ${activity.actionUrl ? `
                            <a href="${activity.actionUrl}" class="btn btn-secondary btn-sm">
                                ${activity.actionText}
                            </a>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading activity:', error);
        showErrorMessage('Failed to load recent activity');
    }
}

// Load upcoming events
async function loadUpcomingEvents() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/student/events`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const container = document.getElementById('upcomingEvents');
            container.innerHTML = data.events.map(event => `
                <div class="event-card">
                    <div class="event-date">
                        <span class="date">${formatEventDate(event.date)}</span>
                        <span class="time">${formatEventTime(event.date)}</span>
                    </div>
                    <div class="event-details">
                        <h4>${event.title}</h4>
                        <p>${event.description}</p>
                    </div>
                    <div class="event-actions">
                        <button class="btn btn-primary btn-sm" onclick="viewEvent('${event.id}')">
                            View Details
                        </button>
                        ${event.canRSVP ? `
                            <button class="btn btn-secondary btn-sm" onclick="rsvpEvent('${event.id}')">
                                RSVP
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showErrorMessage('Failed to load upcoming events');
    }
}

// Initialize notifications
function initializeNotifications() {
    const eventSource = new EventSource(`${config.apiUrl}/api/student/notifications/stream`);
    
    eventSource.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        showNotification(notification);
    };

    eventSource.onerror = (error) => {
        console.error('Notification stream error:', error);
        eventSource.close();
        setTimeout(initializeNotifications, 5000);
    };
}

// Update profile
window.updateProfile = async function() {
    try {
        const form = document.getElementById('profileForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('bio', document.getElementById('bio').value);
        formData.append('skills', document.getElementById('skills').value);
        formData.append('interests', document.getElementById('interests').value);

        const photoInput = document.getElementById('profilePhoto');
        if (photoInput.files.length > 0) {
            formData.append('photo', photoInput.files[0]);
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/student/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.success) {
            showSuccessMessage('Profile updated successfully');
            closeModal('profileModal');
            await loadUserProfile();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showErrorMessage(error.message);
    }
};

// View course details
window.viewCourse = function(courseId) {
    window.location.href = `course-details.html?id=${courseId}`;
};

// View job details
window.viewJob = function(jobId) {
    window.location.href = `job-details.html?id=${jobId}`;
};

// View event details
window.viewEvent = function(eventId) {
    window.location.href = `event-details.html?id=${eventId}`;
};

// RSVP for event
window.rsvpEvent = async function(eventId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/student/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            showSuccessMessage('Successfully RSVP\'d for event');
            await loadUpcomingEvents();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error RSVP\'ing for event:', error);
        showErrorMessage(error.message);
    }
};

// Utility functions
function getActivityIcon(type) {
    switch(type) {
        case 'application': return 'fa-file-alt';
        case 'admission': return 'fa-check-circle';
        case 'job': return 'fa-briefcase';
        case 'event': return 'fa-calendar';
        default: return 'fa-info-circle';
    }
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatEventDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function formatEventTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showNotification(notification) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${notification.type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas ${getActivityIcon(notification.type)}"></i>
            <span>${notification.title}</span>
        </div>
        <div class="toast-body">${notification.message}</div>
    `;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
};