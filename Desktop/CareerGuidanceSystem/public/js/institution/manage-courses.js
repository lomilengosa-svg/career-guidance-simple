// Institution Course Management JavaScript
import { auth } from '../firebase-app.js';
import config from '../config.js';

let courses = [];
let currentCourseId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    await loadFaculties();
    await loadCourses();
    setupEventListeners();
});

// Load faculties for dropdown
async function loadFaculties() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/faculties`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const facultySelect = document.getElementById('faculty');
            const facultyFilter = document.getElementById('facultyFilter');
            
            const options = data.faculties.map(faculty => 
                `<option value="${faculty.id}">${faculty.name}</option>`
            ).join('');
            
            facultySelect.innerHTML = '<option value="">Select Faculty</option>' + options;
            facultyFilter.innerHTML = '<option value="">All Faculties</option>' + options;
        }
    } catch (error) {
        console.error('Error loading faculties:', error);
        showErrorMessage('Failed to load faculties');
    }
}

// Load all courses
async function loadCourses(filters = {}) {
    try {
        showLoadingSpinner();
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${config.apiUrl}/api/institution/courses?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            courses = data.courses;
            renderCourses(courses);
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        showErrorMessage('Failed to load courses');
    } finally {
        hideLoadingSpinner();
    }
}

// Render courses in grid
function renderCourses(courses) {
    const grid = document.getElementById('coursesGrid');
    if (!courses.length) {
        grid.innerHTML = '<div class="no-data">No courses found</div>';
        return;
    }

    grid.innerHTML = courses.map(course => `
        <div class="course-card ${course.status.toLowerCase()}" data-id="${course.id}">
            <div class="course-header">
                <h3>${course.name}</h3>
                <span class="status-badge status-${course.status.toLowerCase()}">${course.status}</span>
            </div>
            <div class="course-body">
                <p><i class="fas fa-graduation-cap"></i> ${course.faculty}</p>
                <p><i class="fas fa-clock"></i> ${course.duration} years</p>
                <p><i class="fas fa-users"></i> ${course.totalSeats} seats</p>
                <p><i class="fas fa-money-bill"></i> $${course.fees}/year</p>
            </div>
            <div class="course-stats">
                <div class="stat-item">
                    <span class="stat-label">Applications</span>
                    <span class="stat-value">${course.applicationCount || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Available</span>
                    <span class="stat-value">${course.availableSeats}</span>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn btn-secondary btn-sm" onclick="editCourse('${course.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="toggleCourseStatus('${course.id}')">
                    ${course.status === 'ACTIVE' ? '<i class="fas fa-pause"></i> Deactivate' : '<i class="fas fa-play"></i> Activate'}
                </button>
            </div>
        </div>
    `).join('');
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchCourse');
    searchInput.addEventListener('input', debounce(() => {
        const filters = getFilters();
        loadCourses(filters);
    }, 300));

    // Filter change handlers
    ['facultyFilter', 'statusFilter'].forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', () => {
            const filters = getFilters();
            loadCourses(filters);
        });
    });
}

// Get current filter values
function getFilters() {
    return {
        search: document.getElementById('searchCourse').value,
        faculty: document.getElementById('facultyFilter').value,
        status: document.getElementById('statusFilter').value
    };
}

// Show add course modal
window.showAddCourseModal = function() {
    currentCourseId = null;
    document.getElementById('courseForm').reset();
    document.querySelector('.modal-title').textContent = 'Add New Course';
    document.getElementById('courseModal').style.display = 'flex';
};

// Edit course
window.editCourse = async function(courseId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            currentCourseId = courseId;
            const course = data.course;
            
            // Fill form with course data
            document.getElementById('courseName').value = course.name;
            document.getElementById('faculty').value = course.facultyId;
            document.getElementById('courseCode').value = course.code;
            document.getElementById('duration').value = course.duration;
            document.getElementById('totalSeats').value = course.totalSeats;
            document.getElementById('description').value = course.description;
            document.getElementById('fees').value = course.fees;
            
            // Update requirements list
            const requirementsList = document.getElementById('requirementsList');
            requirementsList.innerHTML = course.requirements.map(req => `
                <div class="requirement-item">
                    <input type="text" class="form-control mb-2" value="${req}" placeholder="Requirement">
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeRequirement(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');
            
            document.querySelector('.modal-title').textContent = 'Edit Course';
            document.getElementById('courseModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading course details:', error);
        showErrorMessage('Failed to load course details');
    }
};

// Save course
window.saveCourse = async function() {
    try {
        const form = document.getElementById('courseForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const requirements = Array.from(document.querySelectorAll('#requirementsList input'))
            .map(input => input.value.trim())
            .filter(value => value);

        const courseData = {
            name: document.getElementById('courseName').value,
            facultyId: document.getElementById('faculty').value,
            code: document.getElementById('courseCode').value,
            duration: parseInt(document.getElementById('duration').value),
            totalSeats: parseInt(document.getElementById('totalSeats').value),
            description: document.getElementById('description').value,
            fees: parseFloat(document.getElementById('fees').value),
            requirements
        };

        const token = localStorage.getItem('token');
        const method = currentCourseId ? 'PUT' : 'POST';
        const url = currentCourseId 
            ? `${config.apiUrl}/api/institution/courses/${currentCourseId}`
            : `${config.apiUrl}/api/institution/courses`;

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(courseData)
        });

        const data = await response.json();
        if (data.success) {
            showSuccessMessage(`Course ${currentCourseId ? 'updated' : 'created'} successfully`);
            closeModal('courseModal');
            loadCourses(getFilters());
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error saving course:', error);
        showErrorMessage(error.message);
    }
};

// Toggle course status
window.toggleCourseStatus = async function(courseId) {
    try {
        const course = courses.find(c => c.id === courseId);
        const newStatus = course.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/courses/${courseId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();
        if (data.success) {
            showSuccessMessage(`Course ${newStatus.toLowerCase()}`);
            loadCourses(getFilters());
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error toggling course status:', error);
        showErrorMessage(error.message);
    }
};

// Add requirement field
window.addRequirement = function() {
    const requirementsList = document.getElementById('requirementsList');
    const newRequirement = document.createElement('div');
    newRequirement.className = 'requirement-item';
    newRequirement.innerHTML = `
        <input type="text" class="form-control mb-2" placeholder="Requirement">
        <button type="button" class="btn btn-danger btn-sm" onclick="removeRequirement(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;
    requirementsList.appendChild(newRequirement);
};

// Remove requirement field
window.removeRequirement = function(button) {
    button.parentElement.remove();
};

// Utility functions
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