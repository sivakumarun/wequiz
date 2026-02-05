const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let currentAdminToken = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
});

// Check if user is already logged in
function checkUserSession() {
    const user = localStorage.getItem('user');
    if (user) {
        currentUser = JSON.parse(user);
        showUserDashboard();
    } else {
        showLoginPage();
    }
}

// Show login page
function showLoginPage() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <h1>TrainerPoll - User Login</h1>
            <form id="loginForm">
                <div class="form-group">
                    <label for="employeeId">Employee ID (9 digits)</label>
                    <input type="text" id="employeeId" placeholder="123456789" required maxlength="9" pattern="[0-9]{9}">
                </div>
                <div class="form-group">
                    <label for="name">Name</label>
                    <input type="text" id="name" placeholder="Your Full Name" required>
                </div>
                <div class="form-group">
                    <label for="reportingManager">Reporting Manager</label>
                    <select id="reportingManager" required>
                        <option value="">Select Reporting Manager</option>
                    </select>
                </div>
                <button type="submit">Enter Quiz</button>
                <div id="loginError"></div>
            </form>
            <div style="text-align: center; margin-top: 20px;">
                <a href="#" onclick="showAdminLogin()" style="color: #667eea; text-decoration: none; font-weight: 600;">Admin Login →</a>
            </div>
        </div>
    `;
    
    loadReportingManagers();
    document.getElementById('loginForm').addEventListener('submit', handleUserLogin);
}

// Load reporting managers dropdown
async function loadReportingManagers() {
    try {
        console.log('Fetching reporting managers from:', `${API_BASE_URL}/reporting-managers`);
        const response = await fetch(`${API_BASE_URL}/reporting-managers`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const managers = await response.json();
        console.log('Managers received:', managers);
        
        const select = document.getElementById('reportingManager');
        if (!select) {
            console.error('reportingManager select element not found!');
            return;
        }
        
        managers.forEach(manager => {
            const option = document.createElement('option');
            option.value = manager.name;
            option.textContent = manager.name;
            select.appendChild(option);
        });
        console.log('Managers loaded successfully');
    } catch (error) {
        console.error('Error loading managers:', error);
        alert('Error loading reporting managers. Check console.');
    }
}

// Handle user login
async function handleUserLogin(e) {
    e.preventDefault();
    const employeeId = document.getElementById('employeeId').value;
    const name = document.getElementById('name').value;
    const reportingManager = document.getElementById('reportingManager').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, name, reportingManager })
        });
        
        const user = await response.json();
        currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        showUserDashboard();
    } catch (error) {
        document.getElementById('loginError').innerHTML = `<div class="error">Login failed. Please try again.</div>`;
    }
}

// Show user dashboard (waiting for questions)
function showUserDashboard() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
                    <div>
                        <strong style="color: #666;">Employee ID</strong>
                        <p style="font-size: 16px; color: #333;">${currentUser.employeeId}</p>
                    </div>
                    <div>
                        <strong style="color: #666;">Name</strong>
                        <p style="font-size: 16px; color: #333;">${currentUser.name}</p>
                    </div>
                    <div>
                        <strong style="color: #666;">Manager</strong>
                        <p style="font-size: 16px; color: #333;">${currentUser.reportingManager}</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <strong style="color: #667eea; font-size: 18px;">Points: ${currentUser.points || 0}</strong>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <h2 style="font-size: 32px; margin-bottom: 10px;">Waiting for Next Question...</h2>
                <p style="font-size: 18px; opacity: 0.9;">Stay tuned! A new question will appear here soon.</p>
            </div>
            
            <button onclick="logout()" style="background: #e74c3c;">Logout</button>
        </div>
    `;
    
    pollForQuestions();
}

// Poll for active questions
let pollInterval = null;
async function pollForQuestions() {
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/session`);
            const session = await response.json();
            if (session.activeQuestionId) {
                const qResponse = await fetch(`${API_BASE_URL}/questions/${session.activeQuestionId}`);
                const question = await qResponse.json();
                if (question) {
                    showQuestion(question);
                }
            }
        } catch (error) {
            console.error('Error polling questions:', error);
        }
    }, 2000);
}

// Show question to user
function showQuestion(question) {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div>
                        <strong style="color: #666;">Employee ID</strong>
                        <p style="font-size: 14px; color: #333;">${currentUser.employeeId}</p>
                    </div>
                    <div>
                        <strong style="color: #666;">Name</strong>
                        <p style="font-size: 14px; color: #333;">${currentUser.name}</p>
                    </div>
                    <div>
                        <strong style="color: #666;">Manager</strong>
                        <p style="font-size: 14px; color: #333;">${currentUser.reportingManager}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: white; border: 3px solid #667eea; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-bottom: 20px;">${question.text}</h2>
                <div id="optionsContainer" style="display: grid; grid-template-columns: 1fr; gap: 10px;"></div>
            </div>
            
            <button onclick="logout()" style="background: #e74c3c;">Logout</button>
        </div>
    `;
    
    renderOptions(question);
}

// Render question options
function renderOptions(question) {
    const container = document.getElementById('optionsContainer');
    if (question.options && question.options.length > 0) {
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.textContent = option;
            button.style.background = '#667eea';
            button.style.marginBottom = '10px';
            button.onclick = () => submitAnswer(question._id, option);
            container.appendChild(button);
        });
    }
}

// Submit answer
async function submitAnswer(questionId, answer) {
    try {
        console.log('Submitting answer:', { questionId, answer });
        const response = await fetch(`${API_BASE_URL}/responses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser._id,
                questionId: questionId,
                answer: answer,
                responseTime: Date.now()
            })
        });
        const result = await response.json();
        console.log('Answer submitted successfully:', result);
        
        const container = document.getElementById('optionsContainer');
        if (container) {
            container.innerHTML = '<p style="color: #27ae60; font-weight: bold; text-align: center; font-size: 18px;">✓ Answer submitted! Waiting for next question...</p>';
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('Error submitting answer. Please try again.');
    }
}

// Show admin login
function showAdminLogin() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <h1>Admin Login</h1>
            <form id="adminLoginForm">
                <div class="form-group">
                    <label for="adminPassword">Admin Password</label>
                    <input type="password" id="adminPassword" placeholder="Enter admin password" required>
                </div>
                <button type="submit">Login as Admin</button>
                <div id="adminError"></div>
            </form>
            <div style="text-align: center; margin-top: 20px;">
                <a href="#" onclick="showLoginPage()" style="color: #667eea; text-decoration: none; font-weight: 600;">← User Login</a>
            </div>
        </div>
    `;
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        if (data.token) {
            currentAdminToken = data.token;
            localStorage.setItem('adminToken', data.token);
            showAdminDashboard();
        }
    } catch (error) {
        document.getElementById('adminError').innerHTML = `<div class="error">Login failed. Please try again.</div>`;
    }
}

// Show admin dashboard
function showAdminDashboard() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <h1>Admin Dashboard</h1>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                <button onclick="showQuestionForm()" style="background: #27ae60; padding: 20px; font-size: 16px;">Add Question</button>
                <button onclick="showSessionControl()" style="background: #2980b9; padding: 20px; font-size: 16px;">Session Control</button>
                <button onclick="showLeaderboard()" style="background: #f39c12; padding: 20px; font-size: 16px;">View Leaderboard</button>
                <button onclick="logout()" style="background: #e74c3c; padding: 20px; font-size: 16px;">Logout</button>
            </div>
        </div>
    `;
}

// Show question form
function showQuestionForm() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <h1>Create Question</h1>
            <form id="questionForm">
                <div class="form-group">
                    <label for="questionText">Question</label>
                    <textarea id="questionText" placeholder="Enter question" required style="height: 80px;"></textarea>
                </div>
                <div class="form-group">
                    <label for="questionType">Question Type</label>
                    <select id="questionType" required>
                        <option value="MCQ">Multiple Choice</option>
                        <option value="True/False">True/False</option>
                        <option value="Poll">Poll</option>
                    </select>
                </div>
                <div id="optionsDiv"></div>
                <button type="submit">Create Question</button>
            </form>
            <button onclick="showAdminDashboard()" style="background: #95a5a6; margin-top: 10px;">Back</button>
        </div>
    `;
    
    document.getElementById('questionType').addEventListener('change', updateQuestionForm);
    document.getElementById('questionForm').addEventListener('submit', handleCreateQuestion);
    updateQuestionForm();
}

// Update question form based on type
function updateQuestionForm() {
    const type = document.getElementById('questionType').value;
    const optionsDiv = document.getElementById('optionsDiv');
    
    let html = '';
    if (type === 'MCQ' || type === 'Poll') {
        html = `
            <div class="form-group">
                <label>Options (one per line)</label>
                <textarea id="options" placeholder="Option 1&#10;Option 2&#10;Option 3" required style="height: 100px;"></textarea>
            </div>
        `;
        if (type === 'MCQ') {
            html += `
                <div class="form-group">
                    <label for="correctAnswer">Correct Answer</label>
                    <input type="text" id="correctAnswer" placeholder="Enter correct answer" required>
                </div>
            `;
        }
    } else if (type === 'True/False') {
        html = `
            <div class="form-group">
                <label for="correctAnswer">Correct Answer</label>
                <select id="correctAnswer" required>
                    <option value="">Select</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                </select>
            </div>
        `;
    }
    optionsDiv.innerHTML = html;
}

// Handle create question
async function handleCreateQuestion(e) {
    e.preventDefault();
    const text = document.getElementById('questionText').value;
    const type = document.getElementById('questionType').value;
    const correctAnswer = document.getElementById('correctAnswer')?.value || '';
    const optionsText = document.getElementById('options')?.value || '';
    const options = optionsText ? optionsText.split('\n').map(o => o.trim()).filter(o => o) : [];
    
    try {
        await fetch(`${API_BASE_URL}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ text, type, options, correctAnswer, points: 10 })
        });
        alert('Question created successfully!');
        showAdminDashboard();
    } catch (error) {
        alert('Error creating question');
    }
}

// Show session control
function showSessionControl() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <h1>Session Control</h1>
            <div id="questionsList"></div>
            <button onclick="showAdminDashboard()" style="background: #95a5a6; margin-top: 20px;">Back</button>
        </div>
    `;
    loadQuestionsForSession();
}

// Load questions for session control
async function loadQuestionsForSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/questions`);
        const questions = await response.json();
        const container = document.getElementById('questionsList');
        
        container.innerHTML = questions.map(q => `
            <div style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 6px;">
                <h3 style="margin-bottom: 10px;">${q.text}</h3>
                <button onclick="launchQuestion('${q._id}')" style="background: #27ae60; margin-right: 10px;">Launch Question</button>
                <button onclick="endQuestion()" style="background: #e74c3c;">End Question</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

// Launch question to users
async function launchQuestion(questionId) {
    try {
        await fetch(`${API_BASE_URL}/session/start-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ questionId })
        });
        alert('Question launched!');
    } catch (error) {
        alert('Error launching question');
    }
}

// End current question
async function endQuestion() {
    try {
        await fetch(`${API_BASE_URL}/session/end-question`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });
        alert('Question ended!');
        loadQuestionsForSession();
    } catch (error) {
        alert('Error ending question');
    }
}

// Show leaderboard
function showLeaderboard() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <h1>Leaderboard</h1>
            <div id="leaderboardList"></div>
            <button onclick="showAdminDashboard()" style="background: #95a5a6; margin-top: 20px;">Back</button>
        </div>
    `;
    loadLeaderboard();
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        const users = await response.json();
        const container = document.getElementById('leaderboardList');
        
        container.innerHTML = users.map((u, index) => `
            <div style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 18px;">#${index + 1}</strong>
                    <p style="margin-top: 5px;">${u.name} (ID: ${u.employeeId})</p>
                    <small style="color: #666;">Manager: ${u.reportingManager}</small>
                </div>
                <div style="text-align: right;">
                    <strong style="font-size: 24px; color: #667eea;">${u.points || 0}</strong>
                    <p style="color: #666;">Points</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Logout
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    currentUser = null;
    currentAdminToken = null;
    showLoginPage();
}