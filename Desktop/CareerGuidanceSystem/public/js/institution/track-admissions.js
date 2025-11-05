// Institution Track Admissions JavaScript
import { auth } from '../firebase-app.js';
import config from '../config.js';

let admissionsChart = null;
let distributionChart = null;
let admissionsData = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadAdmissionStats(),
        loadAdmissionTrends(),
        loadCourseDistribution(),
        loadRecentAdmissions(),
        loadCourseFilter()
    ]);
    setupEventListeners();
    initializeCharts();
});

// Load admission statistics
async function loadAdmissionStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/admissions/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            document.getElementById('totalAdmissions').textContent = data.stats.total;
            document.getElementById('acceptanceRate').textContent = `${data.stats.acceptanceRate}%`;
            document.getElementById('enrollmentRate').textContent = `${data.stats.enrollmentRate}%`;
        }
    } catch (error) {
        console.error('Error loading admission stats:', error);
        showErrorMessage('Failed to load admission statistics');
    }
}

// Initialize charts
function initializeCharts() {
    // Admission trends chart
    const trendsCtx = document.getElementById('admissionTrends').getContext('2d');
    admissionsChart = new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Admissions',
                data: [],
                borderColor: '#4CAF50',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Course distribution chart
    const distributionCtx = document.getElementById('courseDistribution').getContext('2d');
    distributionChart = new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#4CAF50',
                    '#2196F3',
                    '#FFC107',
                    '#9C27B0',
                    '#FF5722'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Load admission trends
async function loadAdmissionTrends(period = 'monthly') {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/admissions/trends?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            updateTrendsChart(data.trends);
        }
    } catch (error) {
        console.error('Error loading admission trends:', error);
        showErrorMessage('Failed to load admission trends');
    }
}

// Load course distribution
async function loadCourseDistribution() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/admissions/distribution`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            updateDistributionChart(data.distribution);
        }
    } catch (error) {
        console.error('Error loading course distribution:', error);
        showErrorMessage('Failed to load course distribution');
    }
}

// Load recent admissions
async function loadRecentAdmissions(filters = {}) {
    try {
        showLoadingSpinner();
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${config.apiUrl}/api/institution/admissions/recent?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            admissionsData = data.admissions;
            renderAdmissionsTable(admissionsData);
        }
    } catch (error) {
        console.error('Error loading recent admissions:', error);
        showErrorMessage('Failed to load recent admissions');
    } finally {
        hideLoadingSpinner();
    }
}

// Render admissions table
function renderAdmissionsTable(admissions) {
    const tbody = document.getElementById('admissionsTable');
    if (!admissions.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No admissions found</td></tr>';
        return;
    }

    tbody.innerHTML = admissions.map(admission => `
        <tr>
            <td>
                <div class="student-info">
                    <img src="${admission.student.photo || '../img/default-avatar.png'}" alt="Student photo" class="student-photo">
                    <div>
                        <div class="student-name">${admission.student.name}</div>
                        <div class="student-email">${admission.student.email}</div>
                    </div>
                </div>
            </td>
            <td>${admission.course.name}</td>
            <td>${formatDate(admission.admissionDate)}</td>
            <td>
                <span class="status-badge status-${admission.status.toLowerCase()}">
                    ${admission.status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="updateEnrollment('${admission.id}')">
                        <i class="fas fa-user-check"></i> Update
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="viewDetails('${admission.id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update enrollment status
window.updateEnrollment = async function(admissionId) {
    try {
        const admission = admissionsData.find(a => a.id === admissionId);
        if (!admission) throw new Error('Admission not found');

        document.getElementById('studentName').textContent = admission.student.name;
        document.getElementById('courseName').textContent = admission.course.name;
        document.getElementById('enrollmentDate').value = admission.enrollmentDate || '';
        document.getElementById('enrollmentNotes').value = admission.notes || '';
        document.getElementById('enrollmentStatus').value = admission.status.toLowerCase();

        document.getElementById('enrollmentModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading enrollment details:', error);
        showErrorMessage('Failed to load enrollment details');
    }
};

// Save enrollment changes
window.saveEnrollment = async function() {
    try {
        const form = document.getElementById('enrollmentForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const enrollmentData = {
            enrollmentDate: document.getElementById('enrollmentDate').value,
            notes: document.getElementById('enrollmentNotes').value,
            status: document.getElementById('enrollmentStatus').value
        };

        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/admissions/${currentAdmissionId}/enrollment`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enrollmentData)
        });

        const data = await response.json();
        if (data.success) {
            showSuccessMessage('Enrollment updated successfully');
            closeModal('enrollmentModal');
            await loadRecentAdmissions(getFilters());
            await loadAdmissionStats();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error saving enrollment:', error);
        showErrorMessage(error.message);
    }
};

// Generate reports
window.generateReports = function() {
    document.getElementById('reportsModal').style.display = 'flex';
};

// Download report
window.downloadReport = async function() {
    try {
        const reportData = {
            type: document.getElementById('reportType').value,
            startDate: document.getElementById('reportStartDate').value,
            endDate: document.getElementById('reportEndDate').value,
            format: document.getElementById('reportFormat').value
        };

        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/admissions/report`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admission_report_${formatDate(new Date())}.${reportData.format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            closeModal('reportsModal');
        } else {
            throw new Error('Failed to generate report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showErrorMessage('Failed to generate report');
    }
};

// Export admission data
window.exportAdmissionData = async function() {
    try {
        const token = localStorage.getItem('token');
        const filters = getFilters();
        const queryParams = new URLSearchParams(filters).toString();
        
        const response = await fetch(`${config.apiUrl}/api/institution/admissions/export?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `admissions_${formatDate(new Date())}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            throw new Error('Export failed');
        }
    } catch (error) {
        console.error('Error exporting admissions:', error);
        showErrorMessage('Failed to export admissions');
    }
};

// Update charts
function updateTrendsChart(trends) {
    if (admissionsChart) {
        admissionsChart.data.labels = trends.map(t => t.label);
        admissionsChart.data.datasets[0].data = trends.map(t => t.count);
        admissionsChart.update();
    }
}

function updateDistributionChart(distribution) {
    if (distributionChart) {
        distributionChart.data.labels = distribution.map(d => d.course);
        distributionChart.data.datasets[0].data = distribution.map(d => d.count);
        distributionChart.update();
    }
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchAdmission');
    searchInput.addEventListener('input', debounce(() => {
        const filters = getFilters();
        loadRecentAdmissions(filters);
    }, 300));

    // Filter change handlers
    ['courseFilter', 'statusFilter'].forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', () => {
            const filters = getFilters();
            loadRecentAdmissions(filters);
        });
    });

    // Trend period change
    document.getElementById('trendPeriod').addEventListener('change', (e) => {
        loadAdmissionTrends(e.target.value);
    });
}

// Get current filter values
function getFilters() {
    return {
        search: document.getElementById('searchAdmission').value,
        course: document.getElementById('courseFilter').value,
        status: document.getElementById('statusFilter').value
    };
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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