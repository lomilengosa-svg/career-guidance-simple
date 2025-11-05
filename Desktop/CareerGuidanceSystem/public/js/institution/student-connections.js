// Institution Student Connections JavaScript
import { auth } from '../firebase-app.js';
import config from '../config.js';

let students = [];
let currentStudentId = null;
let chatSocket = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadStudents(),
        loadCourseFilter()
    ]);
    setupEventListeners();
    initializeWebSocket();
});

// Initialize WebSocket connection for real-time chat
function initializeWebSocket() {
    const token = localStorage.getItem('token');
    chatSocket = new WebSocket(`${config.wsUrl}?token=${token}`);
    
    chatSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'chat') {
            appendMessage(message);
        } else if (message.type === 'notification') {
            showNotification(message);
        }
    };

    chatSocket.onclose = () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(initializeWebSocket, 5000);
    };
}

// Load students
async function loadStudents(filters = {}) {
    try {
        showLoadingSpinner();
        const token = localStorage.getItem('token');
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${config.apiUrl}/api/institution/students?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            students = data.students;
            renderStudentsGrid(students);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showErrorMessage('Failed to load students');
    } finally {
        hideLoadingSpinner();
    }
}

// Render students grid
function renderStudentsGrid(students) {
    const grid = document.getElementById('studentsGrid');
    if (!students.length) {
        grid.innerHTML = '<div class="no-data">No students found</div>';
        return;
    }

    grid.innerHTML = students.map(student => `
        <div class="student-card ${student.status.toLowerCase()}" data-id="${student.id}">
            <div class="student-header">
                <img src="${student.photo || '../img/default-avatar.png'}" alt="${student.name}" class="student-photo">
                <span class="status-indicator ${student.isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="student-info">
                <h4>${student.name}</h4>
                <p>${student.course}</p>
                <p>Year ${student.year}</p>
                <span class="status-badge status-${student.status.toLowerCase()}">${student.status}</span>
            </div>
            <div class="student-actions">
                <button class="btn btn-primary btn-sm" onclick="startChat('${student.id}')">
                    <i class="fas fa-comment"></i> Message
                </button>
                <button class="btn btn-secondary btn-sm" onclick="viewStudentDetails('${student.id}')">
                    <i class="fas fa-user"></i> Profile
                </button>
            </div>
        </div>
    `).join('');
}

// Start broadcast
window.startBroadcast = function() {
    document.getElementById('broadcastModal').style.display = 'flex';
};

// Update recipient filters based on selection
window.updateRecipientFilters = function() {
    const recipientType = document.getElementById('recipientType').value;
    const filtersDiv = document.getElementById('recipientFilters');
    
    switch(recipientType) {
        case 'course':
            filtersDiv.innerHTML = `
                <div class="form-group">
                    <label>Select Course:</label>
                    <select id="broadcastCourse" class="form-control" multiple>
                        ${courses.map(course => 
                            `<option value="${course.id}">${course.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
            break;
        case 'year':
            filtersDiv.innerHTML = `
                <div class="form-group">
                    <label>Select Year:</label>
                    <select id="broadcastYear" class="form-control" multiple>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                    </select>
                </div>
            `;
            break;
        case 'custom':
            filtersDiv.innerHTML = `
                <div class="form-group">
                    <label>Select Students:</label>
                    <div class="student-selection">
                        ${students.map(student => `
                            <label class="checkbox-label">
                                <input type="checkbox" value="${student.id}">
                                ${student.name} (${student.course} - Year ${student.year})
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            break;
        default:
            filtersDiv.innerHTML = '';
    }
    
    filtersDiv.style.display = recipientType === 'all' ? 'none' : 'block';
};

// Send broadcast message
window.sendBroadcast = async function() {
    try {
        const form = document.getElementById('broadcastForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const recipientType = document.getElementById('recipientType').value;
        let recipients = [];

        switch(recipientType) {
            case 'course':
                recipients = Array.from(document.getElementById('broadcastCourse').selectedOptions)
                    .map(option => option.value);
                break;
            case 'year':
                recipients = Array.from(document.getElementById('broadcastYear').selectedOptions)
                    .map(option => option.value);
                break;
            case 'custom':
                recipients = Array.from(document.querySelectorAll('.student-selection input:checked'))
                    .map(checkbox => checkbox.value);
                break;
        }

        const messageData = {
            type: document.getElementById('messageType').value,
            subject: document.getElementById('messageSubject').value,
            content: document.getElementById('messageContent').value,
            recipientType,
            recipients,
            scheduledTime: document.querySelector('input[name="schedule"]:checked').value === 'later' ?
                document.getElementById('scheduledTime').value : null
        };

        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/broadcast`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });

        const data = await response.json();
        if (data.success) {
            showSuccessMessage('Broadcast message sent successfully');
            closeModal('broadcastModal');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error sending broadcast:', error);
        showErrorMessage(error.message);
    }
};

// Start chat with student
window.startChat = function(studentId) {
    currentStudentId = studentId;
    const student = students.find(s => s.id === studentId);
    
    const chatSection = document.getElementById('chatSection');
    chatSection.style.display = 'flex';
    
    loadChatHistory(studentId);
};

// Load chat history
async function loadChatHistory(studentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/chat/${studentId}/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = data.messages.map(message => createMessageElement(message)).join('');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        showErrorMessage('Failed to load chat history');
    }
}

// Send message
window.sendMessage = function() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            type: 'chat',
            recipientId: currentStudentId,
            content: message
        }));
        messageInput.value = '';
    } else {
        showErrorMessage('Chat connection lost. Trying to reconnect...');
        initializeWebSocket();
    }
};

// View student details
window.viewStudentDetails = async function(studentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${config.apiUrl}/api/institution/students/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        if (data.success) {
            const student = data.student;
            
            // Update modal content
            document.getElementById('studentPhoto').src = student.photo || '../img/default-avatar.png';
            document.getElementById('studentName').textContent = student.name;
            document.getElementById('studentEmail').textContent = student.email;
            document.getElementById('studentStatus').textContent = student.status;
            document.getElementById('studentStatus').className = `status-badge status-${student.status.toLowerCase()}`;
            
            // Load academic records
            const academicRecords = document.getElementById('academicRecords');
            academicRecords.innerHTML = student.academics.map(record => `
                <div class="academic-record">
                    <div class="semester-info">
                        <strong>Semester ${record.semester}</strong>
                        <span class="gpa">GPA: ${record.gpa}</span>
                    </div>
                    <div class="courses-list">
                        ${record.courses.map(course => `
                            <div class="course-item">
                                <span class="course-name">${course.name}</span>
                                <span class="course-grade">${course.grade}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
            
            // Load communication history
            const communicationHistory = document.getElementById('communicationHistory');
            communicationHistory.innerHTML = student.communications.map(comm => `
                <div class="communication-item ${comm.type}">
                    <div class="communication-header">
                        <span class="communication-type">${comm.type}</span>
                        <span class="communication-date">${formatDate(comm.date)}</span>
                    </div>
                    <div class="communication-content">${comm.content}</div>
                </div>
            `).join('');
            
            document.getElementById('studentDetailsModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('Error loading student details:', error);
        showErrorMessage('Failed to load student details');
    }
};

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchStudent');
    searchInput.addEventListener('input', debounce(() => {
        const filters = getFilters();
        loadStudents(filters);
    }, 300));

    // Filter change handlers
    ['courseFilter', 'yearFilter', 'statusFilter'].forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', () => {
            const filters = getFilters();
            loadStudents(filters);
        });
    });

    // Schedule radio button handler
    document.querySelectorAll('input[name="schedule"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('scheduleDateTime').style.display = 
                e.target.value === 'later' ? 'block' : 'none';
        });
    });
}

// Get current filter values
function getFilters() {
    return {
        search: document.getElementById('searchStudent').value,
        course: document.getElementById('courseFilter').value,
        year: document.getElementById('yearFilter').value,
        status: document.getElementById('statusFilter').value
    };
}

// Create message element
function createMessageElement(message) {
    return `
        <div class="message ${message.sender === 'institution' ? 'sent' : 'received'}">
            <div class="message-content">
                <p>${message.content}</p>
                <span class="message-time">${formatTime(message.timestamp)}</span>
            </div>
        </div>
    `;
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
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