// Institution Applications Review JavaScript
import { auth } from '../firebase-app.js';
import config from '../config.js';

let applications = [];
let currentApplicationId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadCourses();
    await loadApplications();
    setupEventListeners();
});

// Load courses for filter
async function loadCourses() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/courses`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const courseFilter = document.getElementById('courseFilter');
            courseFilter.innerHTML = '<option value="">All Courses</option>' +
                data.courses.map(course => 
                    `<option value="${course.id}">${course.name}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        showErrorMessage('Failed to load courses');
    }
}

// Load applications
async function loadApplications(filters = {}) {
    try {
        showLoadingSpinner();
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${config.apiUrl}/api/institution/applications?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            applications = data.applications;
            renderApplications(applications);
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        showErrorMessage('Failed to load applications');
    } finally {
        hideLoadingSpinner();
    }
}

// Render applications
function renderApplications(applications) {
    const list = document.getElementById('applicationsList');
    if (!applications.length) {
        list.innerHTML = '<div class="no-data">No applications found</div>';
        return;
    }

    list.innerHTML = applications.map(app => `
        <div class="application-card ${app.status.toLowerCase()}" data-id="${app.id}">
            <div class="application-header">
                <div class="student-info">
                    <img src="${app.student.photo || '../img/default-avatar.png'}" alt="Student photo" class="student-photo">
                    <div>
                        <h4>${app.student.name}</h4>
                        <p>${app.student.email}</p>
                    </div>
                </div>
                <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span>
            </div>
            <div class="application-body">
                <div class="course-info">
                    <strong>Course:</strong> ${app.course.name}
                    <br>
                    <strong>Faculty:</strong> ${app.course.faculty}
                </div>
                <div class="application-details">
                    <div class="detail-item">
                        <span class="detail-label">Applied:</span>
                        <span class="detail-value">${formatDate(app.appliedDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">GPA:</span>
                        <span class="detail-value">${formatGPA(app.student.gpa)}</span>
                    </div>
                </div>
            </div>
            <div class="application-actions">
                <button class="btn btn-primary btn-sm" onclick="reviewApplication('${app.id}')">
                    <i class="fas fa-eye"></i> Review
                </button>
                <button class="btn btn-secondary btn-sm" onclick="viewDocuments('${app.id}')">
                    <i class="fas fa-file-alt"></i> Documents
                </button>
            </div>
        </div>
    `).join('');
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchStudent');
    searchInput.addEventListener('input', debounce(() => {
        const filters = getFilters();
        loadApplications(filters);
    }, 300));

    // Filter change handlers
    ['courseFilter', 'statusFilter'].forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', () => {
            const filters = getFilters();
            loadApplications(filters);
        });
    });

    // Date filter handlers
    ['dateFrom', 'dateTo'].forEach(dateId => {
        document.getElementById(dateId).addEventListener('change', () => {
            const filters = getFilters();
            loadApplications(filters);
        });
    });
}

// Get current filter values
function getFilters() {
    return {
        search: document.getElementById('searchStudent').value,
        course: document.getElementById('courseFilter').value,
        status: document.getElementById('statusFilter').value,
        dateFrom: document.getElementById('dateFrom').value,
        dateTo: document.getElementById('dateTo').value
    };
}

// Show/hide filters section
window.showFilters = function() {
    const filtersSection = document.getElementById('filtersSection');
    filtersSection.style.display = filtersSection.style.display === 'none' ? 'flex' : 'none';
};

// Review application
window.reviewApplication = async function(applicationId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/applications/${applicationId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            currentApplicationId = applicationId;
            const app = data.application;
            
            // Fill modal with application data
            document.getElementById('studentPhoto').src = app.student.photo || '../img/default-avatar.png';
            document.getElementById('studentName').textContent = app.student.name;
            document.getElementById('studentEmail').textContent = app.student.email;
            document.getElementById('appliedCourse').textContent = app.course.name;
            document.getElementById('studentGPA').textContent = app.student.gpa;
            document.getElementById('applicationDate').textContent = formatDate(app.appliedDate);
            document.getElementById('reviewNotes').value = app.reviewNotes || '';
            document.getElementById('applicationStatus').value = app.status;
            
            // Load documents
            renderDocuments(app.documents);
            
            document.getElementById('reviewModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading application details:', error);
        showErrorMessage('Failed to load application details');
    }
};

// Save review
window.saveReview = async function() {
    try {
        const reviewData = {
            status: document.getElementById('applicationStatus').value,
            notes: document.getElementById('reviewNotes').value
        };

        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/applications/${currentApplicationId}/review`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewData)
        });

        const data = await response.json();
        if (data.success) {
            showSuccessMessage('Review saved successfully');
            closeModal('reviewModal');
            loadApplications(getFilters());
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error saving review:', error);
        showErrorMessage(error.message);
    }
};

// View documents
window.viewDocuments = async function(applicationId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/applications/${applicationId}/documents`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            renderDocuments(data.documents);
            document.getElementById('documentsModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        showErrorMessage('Failed to load documents');
    }
};

// Export applications
window.exportApplications = async function() {
    try {
        const token = localStorage.getItem('token');
        const filters = getFilters();
        const queryParams = new URLSearchParams(filters).toString();
        
        const response = await fetch(`${config.apiUrl}/api/institution/applications/export?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `applications_${formatDate(new Date())}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Error exporting applications:', error);
        showErrorMessage('Failed to export applications');
    }
};

// Utility functions
function renderDocuments(documents) {
    const documentsList = document.getElementById('documentsList');
    documentsList.innerHTML = documents.map(doc => `
        <div class="document-item">
            <i class="fas fa-file-${getDocumentIcon(doc.type)}"></i>
            <span class="document-name">${doc.name}</span>
            <div class="document-actions">
                <button class="btn btn-secondary btn-sm" onclick="viewDocument('${doc.url}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-primary btn-sm" onclick="downloadDocument('${doc.url}', '${doc.name}')">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatGPA(gpa) {
    return `<div class="gpa-indicator">
        <div class="gpa-bar" style="width: ${(gpa/4)*100}%; background-color: ${getGPAColor(gpa)}">
            ${gpa.toFixed(2)}
        </div>
    </div>`;
}

function getGPAColor(gpa) {
    if (gpa >= 3.5) return '#4CAF50';
    if (gpa >= 3.0) return '#8BC34A';
    if (gpa >= 2.5) return '#FFC107';
    if (gpa >= 2.0) return '#FF9800';
    return '#F44336';
}

function getDocumentIcon(type) {
    switch(type) {
        case 'pdf': return 'pdf';
        case 'doc':
        case 'docx': return 'word';
        case 'xls':
        case 'xlsx': return 'excel';
        case 'jpg':
        case 'jpeg':
        case 'png': return 'image';
        default: return 'alt';
    }
}

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

function showSuccessMessage(message) {
    // Implement toast notification
}

function showErrorMessage(message) {
    // Implement toast notification
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
};