// API Base URL - automatically switches between local and production
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://wequiz.up.railway.app/api';
let currentUser = null;
let currentAdminToken = null;
let answeredQuestions = new Set(); // Track questions user has answered
let selectedAnswer = null; // Track currently selected answer before submission
let currentQuestionId = null; // Track currently displayed question ID

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
        showLoginForm(); // Changed from showLoginPage to showLoginForm
    }
}

// Show login form
async function showLoginForm() { // Renamed from showLoginPage and made async
    let managers = [];
    try {
        console.log('Fetching reporting managers from:', `${API_BASE_URL}/reporting-managers`);
        const response = await fetch(`${API_BASE_URL}/reporting-managers`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        managers = await response.json();
        console.log('Managers received:', managers);

        // Sort managers alphabetically by name
        managers.sort((a, b) => a.name.localeCompare(b.name));
        console.log('Managers sorted:', managers);

    } catch (error) {
        console.error('Error loading managers:', error);
        alert('Error loading reporting managers. Check console.');
        // Continue to render the form even if managers fail to load
    }

    const root = document.getElementById('root');
    root.innerHTML = `
        <!-- Jump In Logo - Now Outside Container -->
        <img src="./assets/logo-jumpin.png" alt="Jump In Logo" class="logo-top" />
        
        <div class="container">
            <h1>Let's Jump in..🏃‍➡️</h1>
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
                        ${managers.map(manager => `<option value="${manager.name}">${manager.name}</option>`).join('')}
                    </select>
                </div>
                <button type="submit">Enter Quiz</button>
                <div id="loginError"></div>
            </form>
            <div style="text-align: center; margin-top: 20px;">
                <a href="#" onclick="showAdminLogin()" style="color: #667eea; text-decoration: none; font-weight: 600;">Are You a HOST ?</a>
            </div>
        </div>

        <!-- Bootcamp Logo - Moved Outside Bottom -->
        <img src="./assets/logo-bootcamp.png" alt="Bootcamp Logo" class="logo-bottom" />
    `;

    document.getElementById('loginForm').addEventListener('submit', handleUserLogin);
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
    showWaitingState();
    pollForQuestions();
}

// Show waiting state
async function showWaitingState() {
    // Fetch latest user data and rank
    await refreshUserData();
    const userRank = await getUserRank();

    // Reset currentQuestionId so we can re-render if the same question is pushed again later
    currentQuestionId = null;

    const root = document.getElementById('root');
    root.innerHTML = `
        <!-- Jump In Logo - Top Outside -->
        <img src="./assets/logo-jumpin.png" alt="Jump In Logo" class="logo-top" />
        
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
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; padding-top: 15px; border-top: 2px solid #e0e0e0;">
                    <div style="text-align: center;">
                        <strong style="color: #667eea; font-size: 24px;" id="userPoints">${currentUser.points || 0}</strong>
                        <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">Points</p>
                    </div>
                    <div style="text-align: center;">
                        <strong style="color: ${(currentUser.accuracy || 0) >= 80 ? '#27ae60' : (currentUser.accuracy || 0) >= 60 ? '#f39c12' : '#e74c3c'}; font-size: 24px;" id="userAccuracy">${currentUser.accuracy || 0}%</strong>
                        <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">Accuracy</p>
                    </div>
                    <div style="text-align: center;">
                        <strong style="color: #f39c12; font-size: 24px;" id="userRank">${userRank}</strong>
                        <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">Rank</p>
                    </div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <h2 style="font-size: 32px; margin-bottom: 10px;">Waiting for Next Question...</h2>
                <p style="font-size: 18px; opacity: 0.9;">Stay tuned! A new question will appear here soon.</p>
            </div>
            
            <button onclick="logout()" style="background: #e74c3c;">Logout</button>
        </div>

        <!-- Bootcamp Logo - Bottom Outside -->
        <img src="./assets/logo-bootcamp.png" alt="Bootcamp Logo" class="logo-bottom" />
    `;
}

// Get user's current rank from leaderboard
async function getUserRank() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        const leaderboard = await response.json();

        // Find user's position in the sorted leaderboard
        const userIndex = leaderboard.findIndex(u => u._id === currentUser._id);
        if (userIndex === -1) return '-';

        // The rank is simply the position + 1, BUT we need to handle ties
        // Users with same points AND same avgResponseTime should have the same rank
        let rank = userIndex + 1; // Start with position-based rank

        // Check if there are users ahead with the SAME score and time (tied)
        const currentUserData = leaderboard[userIndex];
        for (let i = 0; i < userIndex; i++) {
            if (leaderboard[i].points === currentUserData.points &&
                leaderboard[i].avgResponseTime === currentUserData.avgResponseTime) {
                // Found a tied user ahead, use their rank
                rank = i + 1;
                break;
            }
        }

        return `#${rank}`;
    } catch (error) {
        console.error('Error fetching rank:', error);
        return '-';
    }
}

// Poll for active questions
let pollInterval = null;
async function pollForQuestions() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        if (!currentUser) {
            clearInterval(pollInterval);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/session`);
            const session = await response.json();
            console.log('Session polled:', session);

            // Check if admin has triggered a clear-all event
            if (session.clearAllTriggered) {
                console.log('Clear all triggered, logging out...');
                alert('Your session has been cleared by the administrator. Please log in again.');
                logout();
                return;
            }

            if (session.activeQuestionId) {
                console.log('Active question ID:', session.activeQuestionId);

                // Check if activeQuestionId is already a full object (if so, use it directly)
                if (typeof session.activeQuestionId === 'object' && session.activeQuestionId._id) {
                    const question = session.activeQuestionId;
                    console.log('Question already populated:', question);

                    if (question && question.text) {
                        showQuestion(question);
                    } else {
                        console.error('Invalid question data:', question);
                    }
                    return;
                }

                // Otherwise fetch the question by ID
                const questionId = session.activeQuestionId;

                const qResponse = await fetch(`${API_BASE_URL}/questions/${questionId}`);

                if (!qResponse.ok) {
                    console.error('Failed to fetch question:', qResponse.status);
                    return;
                }

                const question = await qResponse.json();
                console.log('Question fetched:', question);

                if (question && question.text) {
                    showQuestion(question);
                } else {
                    console.error('Invalid question data:', question);
                }
            } else {
                // No active question, show waiting state
                showWaitingState();
            }
        } catch (error) {
            console.error('Error polling questions:', error);
        }
    }, 2000);
}

// Show question to user
async function showQuestion(question) {
    console.log('showQuestion called with:', question);

    if (!question || !question.text) {
        console.error('Invalid question object:', question);
        return;
    }

    const questionId = question._id || question.id;

    // Guard: Prevent re-rendering if the question is already displayed
    // This prevents the user's selection from being reset every 2 seconds by polling
    if (currentQuestionId === questionId) {
        console.log('Question already displayed, skipping re-render');
        return;
    }

    // Check if user has already answered this question
    if (answeredQuestions.has(questionId)) {
        console.log('User has already answered this question, showing waiting state');
        showWaitingState();
        return;
    }

    // Check with server if user has already answered (handles page refresh)
    try {
        const checkResponse = await fetch(`${API_BASE_URL}/responses/check/${questionId}/${currentUser._id}`);
        const checkData = await checkResponse.json();

        if (checkData.hasAnswered) {
            console.log('Server confirms user has already answered this question');
            answeredQuestions.add(questionId);
            showWaitingState();
            return;
        }
    } catch (error) {
        console.error('Error checking answer status:', error);
    }

    currentQuestionId = questionId;
    selectedAnswer = null; // Reset selection for the new question

    const root = document.getElementById('root');
    root.innerHTML = `
        <!-- Jump In Logo - Top Outside -->
        <img src="./assets/logo-jumpin.png" alt="Jump In Logo" class="logo-top" />
        
        <div class="container">
            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div>
                        <strong style="color: rgba(255, 255, 255, 0.6); font-size: 12px;">Employee ID</strong>
                        <p style="font-size: 14px; color: #ffffff;">${currentUser.employeeId}</p>
                    </div>
                    <div>
                        <strong style="color: rgba(255, 255, 255, 0.6); font-size: 12px;">Name</strong>
                        <p style="font-size: 14px; color: #ffffff;">${currentUser.name}</p>
                    </div>
                    <div>
                        <strong style="color: rgba(255, 255, 255, 0.6); font-size: 12px;">Manager</strong>
                        <p style="font-size: 14px; color: #ffffff;">${currentUser.reportingManager}</p>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.03); border: 2px solid rgba(147, 51, 234, 0.3); border-radius: 16px; padding: 30px; margin-bottom: 20px; backdrop-filter: blur(10px);">
                <h2 style="color: #ffffff; margin-bottom: 25px; font-size: 22px; text-shadow: 0 0 15px rgba(147, 51, 234, 0.3);">${question.text || 'No question text'}</h2>
                <div id="optionsContainer" style="display: grid; grid-template-columns: 1fr; gap: 12px;"></div>
                
                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <button id="submitAnswerBtn" onclick="submitAnswer('${questionId}')" disabled style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); opacity: 0.5; cursor: not-allowed; box-shadow: 0 4px 15px rgba(39, 174, 96, 0.2);">
                        Submit Answer
                    </button>
                    <p id="selectionHint" style="color: rgba(255, 255, 255, 0.5); font-size: 12px; text-align: center; margin-top: 10px;">Select an option to enable submission</p>
                </div>
            </div>
            
            <button onclick="logout()" style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.3); color: #ff6b6b; font-size: 14px; padding: 10px;">Logout</button>
        </div>

        <!-- Bootcamp Logo - Bottom Outside -->
        <img src="./assets/logo-bootcamp.png" alt="Bootcamp Logo" class="logo-bottom" />
    `;

    renderOptions(question);
}

// Render question options
function renderOptions(question) {
    const container = document.getElementById('optionsContainer');
    if (!container) return;

    let options = question.options;
    if ((!options || options.length === 0) && question.type === 'True/False') {
        options = ['True', 'False'];
    }

    if (!options || options.length === 0) {
        container.innerHTML = '<p style="color: #ff6b9d;">No options available</p>';
        return;
    }

    container.innerHTML = '';
    options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = option;
        button.style.background = 'rgba(255, 255, 255, 0.08)';
        button.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        button.style.color = '#ffffff';
        button.style.marginBottom = '8px';
        button.style.textAlign = 'left';
        button.style.paddingLeft = '20px';

        button.onclick = () => {
            // Update state
            selectedAnswer = option;

            // Highlight selected
            document.querySelectorAll('.option-button').forEach(btn => {
                btn.classList.remove('selected-option');
                btn.style.background = 'rgba(255, 255, 255, 0.08)';
                btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                btn.style.boxShadow = 'none';
            });

            button.classList.add('selected-option');
            button.style.background = 'linear-gradient(135deg, rgba(147, 51, 234, 0.7) 0%, rgba(79, 70, 229, 0.7) 100%)';
            // Border and shadow are now handled by the .selected-option class in index.html

            // Enable submit button
            const submitBtn = document.getElementById('submitAnswerBtn');
            const hint = document.getElementById('selectionHint');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
                submitBtn.style.transform = 'scale(1.02)';
            }
            if (hint) {
                hint.textContent = 'Click Submit to confirm your answer';
                hint.style.color = '#4ade80';
            }
        };
        container.appendChild(button);
    });
}

// Submit answer
async function submitAnswer(questionId) {
    if (!selectedAnswer) return;

    const answer = selectedAnswer;
    try {
        console.log('Submitting answer:', { questionId, answer });

        // Show loading state on button
        const submitBtn = document.getElementById('submitAnswerBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            submitBtn.style.opacity = '0.7';
        }
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
        console.log('Submit result:', result);

        if (response.ok) {
            // Mark question as answered
            answeredQuestions.add(questionId);

            // Fetch updated user data to get latest points and accuracy
            await refreshUserData();

            // Show confirmation then waiting state
            const root = document.getElementById('root');
            root.innerHTML = `
                <!-- Jump In Logo - Top Outside -->
                <img src="./assets/logo-jumpin.png" alt="Jump In Logo" class="logo-top" />
                
                <div class="container" style="text-align: center; padding-top: 100px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                    <h1 style="color: #27ae60; margin-bottom: 10px;">Response Submitted!</h1>
                    <p style="color: #666; font-size: 18px; margin-bottom: 20px;">Your answer has been recorded successfully.</p>
                    <p style="color: #999; font-size: 14px;">Redirecting in 5 seconds...</p>
                </div>

                <!-- Bootcamp Logo - Bottom Outside -->
                <img src="./assets/logo-bootcamp.png" alt="Bootcamp Logo" class="logo-bottom" />
            `;
            setTimeout(() => showWaitingState(), 5000);
        } else if (result.alreadyAnswered) {
            answeredQuestions.add(questionId);
            showWaitingState();
        } else {
            throw new Error(result.error || 'Failed to submit answer');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('Error submitting answer. Please try again.');
    }
}

// Refresh user data from server
async function refreshUserData() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser._id}`);
        if (response.ok) {
            const updatedUser = await response.json();
            // Update the currentUser object with latest data
            currentUser.points = updatedUser.points;
            currentUser.accuracy = updatedUser.accuracy;
            currentUser.totalQuestions = updatedUser.totalQuestions;
            currentUser.correctAnswers = updatedUser.correctAnswers;
            currentUser.badges = updatedUser.badges;

            // Update localStorage as well
            localStorage.setItem('user', JSON.stringify(currentUser));

            console.log('User data refreshed:', currentUser);
        }
    } catch (error) {
        console.error('Error refreshing user data:', error);
    }
}

// Show admin login
function showAdminLogin() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <!-- Jump In Logo - Top Outside -->
        <img src="./assets/logo-jumpin.png" alt="Jump In Logo" class="logo-top" />
        
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
                <a href="#" onclick="showLoginForm()" style="color: #667eea; text-decoration: none; font-weight: 600;">← User Login</a>
            </div>
        </div>

        <!-- Bootcamp Logo - Bottom Outside -->
        <img src="./assets/logo-bootcamp.png" alt="Bootcamp Logo" class="logo-bottom" />
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
        <!-- Jump In Logo - Top Outside -->
        <img src="./assets/logo-jumpin.png" alt="Jump In Logo" class="logo-top" />
        
        <div class="container">
            <h1>Control Center</h1>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                <button onclick="showQuestionForm()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">✨ Create Question</button>
                <button onclick="showSessionControl()" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">🎮 Session Control</button>
                <button onclick="showEnhancedLeaderboard()" style="background: linear-gradient(135deg, #f1c40f 0%, #f39c12 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">🏆 View Leaderboard</button>
                <button onclick="showQuestionManagement()" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">📚 Question Management</button>
                <button onclick="showManagerManagement()" style="background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">👥 Manager Management</button>
                <button onclick="showCategoryManagement()" style="background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">⚙️ Manage Categories</button>
                <button onclick="downloadDetailedReport()" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">📊 Detailed Report</button>
                <button onclick="migratePointsTo1()" style="background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">🔄 Migrate Points</button>
                <button onclick="logout()" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 25px; border-radius: 16px; border: none; font-size: 16px; font-weight: 600;">🚪 Logout</button>
            </div>
        </div>

        <!-- Bootcamp Logo - Bottom Outside -->
        <img src="./assets/logo-bootcamp.png" alt="Bootcamp Logo" class="logo-bottom" />
    `;
}

// Cache for categories
let categoriesCache = null;

// Load categories from API
async function loadCategories() {
    if (categoriesCache) return categoriesCache;

    // Fallback to default categories
    const defaultCategories = [
        { name: 'General' }, { name: 'Sales' }, { name: 'Marketing' },
        { name: 'Leadership' }, { name: 'Technology' }, { name: 'Product Knowledge' },
        { name: 'Customer Service' }, { name: 'HR & Compliance' }
    ];

    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (response.ok) {
            const categories = await response.json();
            categoriesCache = categories;
            return categories;
        } else {
            console.warn('Failed to load categories from API, using defaults');
            categoriesCache = defaultCategories;
            return defaultCategories;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        categoriesCache = defaultCategories;
        return defaultCategories;
    }
}

// Show question form
async function showQuestionForm() {
    const root = document.getElementById('root');

    // Load categories
    const categories = await loadCategories();
    const categoryOptions = categories.map(cat =>
        `<option value="${cat.name}">${cat.name}</option>`
    ).join('');

    root.innerHTML = `
        <style>
            .create-question-container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .question-header {
                background: rgba(15, 23, 42, 0.85) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
                color: white;
                padding: 30px 40px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px 24px 0 0;
                margin: -40px -40px 30px -40px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                position: relative;
                z-index: 10;
            }
            
            .question-header h1 {
                margin: 0;
                font-size: 28px;
                color: white;
            }
            
            .question-header button {
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid white;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                backdrop-filter: blur(10px);
            }
            
            .question-header button:hover {
                background: white;
                color: #667eea;
                transform: translateY(-2px);
            }
            
            .tabs-container {
                display: flex;
                gap: 10px;
                margin: 25px 0 30px 0;
                border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            }
            
            .tab {
                padding: 15px 30px;
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-bottom: 3px solid transparent;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.5);
                transition: all 0.3s;
                border-radius: 8px 8px 0 0;
            }
            
            .tab.active {
                color: #9333ea;
                background: rgba(147, 51, 234, 0.1);
                border-bottom-color: #9333ea;
                border-color: rgba(147, 51, 234, 0.3);
            }
            
            .tab:hover {
                color: #667eea;
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            .two-column-layout {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-top: 20px;
            }
            
            @media (max-width: 1024px) {
                .two-column-layout {
                    grid-template-columns: 1fr;
                }
            }
            
            .form-card {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(20px);
                border-radius: 16px;
                padding: 30px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .form-card h3, .form-card h4, .form-card label {
                color: #ffffff !important;
            }

            .form-card .form-group label {
                color: rgba(255, 255, 255, 0.8) !important;
            }
            
            .preview-card {
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
                border-radius: 16px;
                padding: 30px;
                border: 2px solid rgba(102, 126, 234, 0.2);
                position: sticky;
                top: 20px;
                height: fit-content;
            }
            
            .preview-card h3 {
                color: #667eea;
                margin-top: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .preview-question {
                background: rgba(255, 255, 255, 0.03);
                padding: 25px;
                border-radius: 12px;
                margin-top: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                min-height: 200px;
            }
            
            .preview-question h4 {
                color: #ffffff;
                font-size: 18px;
                margin: 0 0 20px 0;
            }
            
            .preview-option {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                margin-bottom: 10px;
                font-size: 15px;
                transition: transform 0.2s;
            }
            
            .preview-option.correct {
                background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                box-shadow: 0 0 0 3px rgba(39, 174, 96, 0.2);
            }
            
            .option-builder {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .option-input-row {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .option-input-row input {
                flex: 1;
            }
            
            .option-input-row button {
                width: auto;
                padding: 10px 15px;
                background: #e74c3c;
                font-size: 18px;
            }
            
            .add-option-btn {
                background: #3498db !important;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s;
                width: auto !important;
            }
            
            .add-option-btn:hover {
                background: #2980b9 !important;
                transform: translateY(-2px);
            }
            
            .radio-group {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .radio-option {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
                color: white;
            }
            
            .radio-option:hover {
                background: rgba(255, 255, 255, 0.12);
                border-color: rgba(147, 51, 234, 0.4);
            }
            
            .radio-option input[type="radio"] {
                width: auto;
                cursor: pointer;
            }
            
            .bulk-upload-zone {
                background: rgba(255, 255, 255, 0.03);
                border: 3px dashed rgba(147, 51, 234, 0.5);
                border-radius: 16px;
                padding: 50px;
                text-align: center;
                transition: all 0.3s;
                cursor: pointer;
                color: white;
            }
            
            .bulk-upload-zone:hover {
                border-color: #764ba2;
                background: rgba(102, 126, 234, 0.05);
            }
            
            .bulk-upload-zone.dragover {
                background: rgba(102, 126, 234, 0.1);
                border-color: #764ba2;
                transform: scale(1.02);
            }
            
            .upload-icon {
                font-size: 64px;
                margin-bottom: 20px;
            }
            
            .category-badge {
                display: inline-block;
                padding: 6px 14px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            .type-badge {
                display: inline-block;
                padding: 6px 14px;
                background: #3498db;
                color: white;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin-left: 8px;
            }
        </style>
        
        <div class="container">
            <div class="question-header">
                <h1>✨ Create Question</h1>
                <button onclick="showAdminDashboard()">← Back to Dashboard</button>
            </div>
            
            <div class="tabs-container">
                <button class="tab active" onclick="switchTab('single')">📝 Single Question</button>
                <button class="tab" onclick="switchTab('bulk')">📤 Bulk Upload</button>
            </div>
            
            <!-- Single Question Tab -->
            <div id="singleTab" class="tab-content active">
                <div class="two-column-layout">
                    <!-- Form Column -->
                    <div class="form-card">
                        <h3 style="margin-top: 0; color: #333;">Question Details</h3>
                        <form id="questionForm">
                            <div class="form-group">
                                <label for="questionCategory">📁 Category</label>
                                <select id="questionCategory" onchange="updateQuestionPreview()">
                                    ${categoryOptions}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="questionType">📊 Question Type</label>
                                <select id="questionType" required onchange="updateQuestionForm()">
                                    <option value="MCQ">Multiple Choice Question</option>
                                    <option value="True/False">True / False</option>
                                    <option value="Poll">Poll (No Correct Answer)</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="questionText">❓ Question Text</label>
                                <textarea 
                                    id="questionText" 
                                    placeholder="Enter your question here..." 
                                    required 
                                    style="height: 120px; font-size: 15px; line-height: 1.6;"
                                    oninput="updateQuestionPreview()"
                                ></textarea>
                                <small style="color: #666; display: block; margin-top: 5px;">
                                    <span id="charCount">0</span> characters
                                </small>
                            </div>
                            
                            <div id="optionsDiv"></div>
                            
                            <button type="submit" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); font-size: 16px; padding: 14px;">
                                ✓ Create Question
                            </button>
                        </form>
                    </div>
                    
                    <!-- Preview Column -->
                    <div class="preview-card">
                        <h3>👁️ Live Preview</h3>
                        <p style="color: #666; font-size: 14px;">See how your question will appear to users</p>
                        
                        <div class="preview-question" id="previewArea">
                            <div style="text-align: center; color: #999; padding: 40px 20px;">
                                <div style="font-size: 48px; margin-bottom: 15px;">🎯</div>
                                <p>Start typing to preview your question</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bulk Upload Tab -->
            <div id="bulkTab" class="tab-content">
                <div class="form-card" style="max-width: 800px; margin: 0 auto;">
                    <h3 style="margin-top: 0; color: #333;">📤 Bulk Upload Questions</h3>
                    <p style="color: #666; margin-bottom: 30px;">Upload multiple questions at once using a CSV file. Download the template to see the required format.</p>
                    
                    <div class="bulk-upload-zone" id="dropZone" onclick="document.getElementById('csvFile').click()">
                        <div class="upload-icon">📁</div>
                        <h3 style="color: #667eea; margin: 0 0 10px 0;">Drag & Drop CSV File</h3>
                        <p style="color: #666; margin: 0 0 20px 0;">or click to browse</p>
                        <input type="file" id="csvFile" accept=".csv" style="display: none;">
                        <div id="fileName" style="color: #27ae60; font-weight: 600; margin-top: 15px;"></div>
                    </div>
                    
                    <div style="margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
                        <button type="button" onclick="uploadCSV()" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); width: auto; padding: 14px 30px; font-size: 16px;">
                            ⬆️ Upload CSV
                        </button>
                        <a href="${API_BASE_URL}/questions/csv-template" download>
                            <button type="button" style="background: #3498db; width: auto; padding: 14px 30px; font-size: 16px;">
                                📥 Download Template
                            </button>
                        </a>
                    </div>
                    
                    <div id="uploadStatus" style="margin-top: 25px; padding: 15px; border-radius: 8px;"></div>
                </div>
            </div>
        </div>
        
    `;

    // Initialize functionality
    initializeQuestionFormScripts();
    updateQuestionForm();
}

function initializeQuestionFormScripts() {
    // Tab switching functionality
    window.switchTab = function (tab) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        if (tab === 'single') {
            document.querySelector('.tab:nth-child(1)').classList.add('active');
            document.getElementById('singleTab').classList.add('active');
        } else {
            document.querySelector('.tab:nth-child(2)').classList.add('active');
            document.getElementById('bulkTab').classList.add('active');
        }
    };

    // Drag and drop functionality
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('csvFile');

    if (dropZone && fileInput) {
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
        });

        dropZone.addEventListener('drop', function (e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            fileInput.files = files;
            if (files[0]) {
                document.getElementById('fileName').textContent = '✓ ' + files[0].name;
            }
        });

        fileInput.addEventListener('change', function () {
            if (this.files[0]) {
                document.getElementById('fileName').textContent = '✓ ' + this.files[0].name;
            }
        });
    }

    // Character counter
    const questionTextArea = document.getElementById('questionText');
    if (questionTextArea) {
        questionTextArea.addEventListener('input', function () {
            document.getElementById('charCount').textContent = this.value.length;
        });
    }

    // Form submission
    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
        questionForm.addEventListener('submit', handleCreateQuestion);
    }
}


// Counter for option inputs
let optionCounter = 0;

// Update question form based on type
function updateQuestionForm() {
    const type = document.getElementById('questionType').value;
    const optionsDiv = document.getElementById('optionsDiv');

    optionCounter = 0; // Reset counter

    let html = '';
    if (type === 'MCQ') {
        html = `
    <div class="form-group">
                <label>📋 Options</label>
                <div class="option-builder" id="optionsList">
                    <div class="option-input-row" data-option-id="0">
                        <input type="text" placeholder="Option 1" class="option-input" oninput="updateQuestionPreview()" data-option-num="0">
                        <button type="button" onclick="removeOption(0)" disabled style="opacity: 0.5;">×</button>
                    </div>
                    <div class="option-input-row" data-option-id="1">
                        <input type="text" placeholder="Option 2" class="option-input" oninput="updateQuestionPreview()" data-option-num="1">
                        <button type="button" onclick="removeOption(1)" disabled style="opacity: 0.5;">×</button>
                    </div>
                </div>
                <button type="button" class="add-option-btn" onclick="addOption()">+ Add Option</button>
                <small style="color: #666; display: block; margin-top: 10px;">Minimum 2 options required</small>
            </div>
    <div class="form-group">
        <label>✓ Correct Answer</label>
        <div class="radio-group" id="correctAnswerRadio">
            <p style="color: #999; text-align: center; padding: 20px;">Add options above to select the correct answer</p>
        </div>
    </div>
`;
        optionCounter = 2;
    } else if (type === 'Poll') {
        html = `
    <div class="form-group">
                <label>📋 Poll Options</label>
                <div class="option-builder" id="optionsList">
                    <div class="option-input-row" data-option-id="0">
                        <input type="text" placeholder="Option 1" class="option-input" oninput="updateQuestionPreview()" data-option-num="0">
                        <button type="button" onclick="removeOption(0)" disabled style="opacity: 0.5;">×</button>
                    </div>
                    <div class="option-input-row" data-option-id="1">
                        <input type="text" placeholder="Option 2" class="option-input" oninput="updateQuestionPreview()" data-option-num="1">
                        <button type="button" onclick="removeOption(1)" disabled style="opacity: 0.5;">×</button>
                    </div>
                </div>
                <button type="button" class="add-option-btn" onclick="addOption()">+ Add Option</button>
                <small style="color: #666; display: block; margin-top: 10px;">Polls have no correct answer</small>
            </div>
    `;
        optionCounter = 2;
    } else if (type === 'True/False') {
        html = `
    <div class="form-group">
                <label>✓ Correct Answer</label>
                <div class="radio-group">
                    <label class="radio-option">
                        <input type="radio" name="correctAnswer" value="True" required onchange="updateQuestionPreview()">
                        <span>True</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="correctAnswer" value="False" required onchange="updateQuestionPreview()">
                        <span>False</span>
                    </label>
                </div>
            </div>
    `;
    }
    optionsDiv.innerHTML = html;
    updateQuestionPreview();
}

// Add new option input
window.addOption = function () {
    const optionsList = document.getElementById('optionsList');
    const newId = optionCounter++;

    const newOptionRow = document.createElement('div');
    newOptionRow.className = 'option-input-row';
    newOptionRow.setAttribute('data-option-id', newId);
    newOptionRow.innerHTML = `
        <input type="text" placeholder="Option ${newId + 1}" class="option-input" oninput="updateQuestionPreview()" data-option-num="${newId}">
        <button type="button" onclick="removeOption(${newId})">×</button>
`;

    optionsList.appendChild(newOptionRow);
    updateQuestionPreview();
};

// Remove option input
window.removeOption = function (id) {
    const optionsList = document.getElementById('optionsList');
    const rows = optionsList.querySelectorAll('.option-input-row');

    if (rows.length <= 2) {
        alert('Minimum 2 options required');
        return;
    }

    const rowToRemove = optionsList.querySelector(`[data - option - id= "${id}"]`);
    if (rowToRemove) {
        rowToRemove.remove();
        updateQuestionPreview();
    }

    // Enable/disable remove buttons based on count
    const remainingRows = optionsList.querySelectorAll('.option-input-row');
    remainingRows.forEach((row, index) => {
        const btn = row.querySelector('button');
        if (remainingRows.length <= 2) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    });
};

// Update live preview
window.updateQuestionPreview = function () {
    const questionText = document.getElementById('questionText')?.value || '';
    const category = document.getElementById('questionCategory')?.value || 'General';
    const type = document.getElementById('questionType')?.value || 'MCQ';
    const previewArea = document.getElementById('previewArea');

    if (!previewArea) return;

    if (!questionText.trim()) {
        previewArea.innerHTML = `
            <div style="text-align: center; color: #999; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 15px;">🎯</div>
                <p>Start typing to preview your question</p>
            </div>
    `;
        return;
    }

    // Get options based on type
    let options = [];
    let correctAnswer = '';

    if (type === 'MCQ' || type === 'Poll') {
        const optionInputs = document.querySelectorAll('.option-input');
        optionInputs.forEach((input, index) => {
            if (input.value.trim()) {
                options.push(input.value.trim());
            }
        });

        if (type === 'MCQ') {
            const selectedRadio = document.querySelector('input[name="mcqCorrectAnswer"]:checked');
            correctAnswer = selectedRadio ? selectedRadio.value : '';
        }
    } else if (type === 'True/False') {
        options = ['True', 'False'];
        const selectedRadio = document.querySelector('input[name="correctAnswer"]:checked');
        correctAnswer = selectedRadio ? selectedRadio.value : '';
    }

    // Build preview HTML
    let optionsHTML = options.map((opt, i) => {
        const isCorrect = opt === correctAnswer && type !== 'Poll';
        return `<div class="preview-option ${isCorrect ? 'correct' : ''}">${opt}${isCorrect ? ' ✓' : ''}</div>`;
    }).join('');

    if (options.length === 0 && (type === 'MCQ' || type === 'Poll')) {
        optionsHTML = '<p style="color: #999; text-align: center; padding: 20px;">Add options to see them here</p>';
    }

    previewArea.innerHTML = `
        <div>
            <div style="margin-bottom: 15px;">
                <span class="category-badge">${category}</span>
                <span class="type-badge">${type}</span>
            </div>
            <h4>${questionText}</h4>
            ${optionsHTML}
        </div>
    `;

    // Update correct answer radio buttons for MCQ
    if (type === 'MCQ') {
        updateCorrectAnswerRadios();
    }
};

// Update correct answer radio buttons for MCQ
function updateCorrectAnswerRadios() {
    const radioContainer = document.getElementById('correctAnswerRadio');
    if (!radioContainer) return;

    const optionInputs = document.querySelectorAll('.option-input');
    const options = Array.from(optionInputs)
        .map(input => input.value.trim())
        .filter(val => val);

    if (options.length === 0) {
        radioContainer.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Add options above to select the correct answer</p>';
        return;
    }

    const currentSelected = document.querySelector('input[name="mcqCorrectAnswer"]:checked')?.value;

    radioContainer.innerHTML = options.map((opt, i) => `
    < label class="radio-option" >
        <input type="radio" name="mcqCorrectAnswer" value="${opt}" ${opt === currentSelected ? 'checked' : ''} required onchange="updateQuestionPreview()">
            <span>${opt}</span>
        </label>
`).join('');
}

// Handle create question
async function handleCreateQuestion(e) {
    e.preventDefault();
    const text = document.getElementById('questionText').value;
    const type = document.getElementById('questionType').value;
    const category = document.getElementById('questionCategory').value;

    let options = [];
    let correctAnswer = '';

    // Collect options based on question type
    if (type === 'MCQ' || type === 'Poll') {
        const optionInputs = document.querySelectorAll('.option-input');
        options = Array.from(optionInputs)
            .map(input => input.value.trim())
            .filter(val => val);

        // Validate at least 2 options
        if (options.length < 2) {
            alert('Please provide at least 2 options');
            return;
        }

        if (type === 'MCQ') {
            const selectedRadio = document.querySelector('input[name="mcqCorrectAnswer"]:checked');
            if (!selectedRadio) {
                alert('Please select the correct answer');
                return;
            }
            correctAnswer = selectedRadio.value;
        }
    } else if (type === 'True/False') {
        options = ['True', 'False'];
        const selectedRadio = document.querySelector('input[name="correctAnswer"]:checked');
        if (!selectedRadio) {
            alert('Please select the correct answer');
            return;
        }
        correctAnswer = selectedRadio.value;
    }

    console.log('Creating question with:', { text, type, category, options, correctAnswer });

    try {
        const response = await fetch(`${API_BASE_URL}/questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ text, type, category, options, correctAnswer })
        });

        if (response.ok) {
            alert('Question created successfully!');
            showAdminDashboard();
        } else {
            const error = await response.json();
            alert('Error creating question: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error creating question: ' + error.message);
    }
}

// Show session control
let adminPollInterval = null;
let sessionTimerInterval = null;

async function showSessionControl() {
    const root = document.getElementById('root');

    // Load categories dynamically
    const categories = await loadCategories();
    const categoryOptions = categories.map(cat =>
        `<option value="${cat.name}">${cat.name}</option>`
    ).join('');

    root.innerHTML = `
        <div class="container">
            <div class="admin-header">
                <h1 style="font-size: 20px;">Session Control</h1> <!-- Reduced size to prevent overlap -->
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="background: rgba(147, 51, 234, 0.2); color: #c084fc; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; border: 1px solid rgba(147, 51, 234, 0.3);">
                        👥 Users: <span id="liveUserCount">0</span>
                    </div>
                     <div id="liveTimerBadge" style="background: rgba(231, 76, 60, 0.2); color: #ff6b6b; padding: 8px 12px; border-radius: 6px; font-weight: bold; display: none; border: 1px solid rgba(231, 76, 60, 0.3); font-size: 13px;">
                        ⏱️ <span id="liveTimer">00:00:00</span>
                    </div>
                    <button onclick="stopAdminPolling(); showAdminDashboard()">← Back</button>
                </div>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 15px 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                    <label style="font-weight: 600; margin-right: 15px; color: rgba(255, 255, 255, 0.8); font-size: 14px;">Filter by Category:</label>
                    <select id="categoryFilter" onchange="loadQuestionsForSession()" style="padding: 10px 15px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: white; border-radius: 8px; cursor: pointer; min-width: 220px;">
                        <option value="all">All Categories</option>
                        ${categoryOptions}
                    </select>
                </div>
                <div style="color: rgba(255, 255, 255, 0.4); font-size: 12px;">Showing all available questions</div>
            </div>
            
            <div id="questionsList"></div>
        </div>
    `;
    loadQuestionsForSession();

    // Start polling for stats every 3 seconds
    if (adminPollInterval) clearInterval(adminPollInterval);
    adminPollInterval = setInterval(loadQuestionsForSession, 3000);
}

function stopAdminPolling() {
    if (adminPollInterval) clearInterval(adminPollInterval);
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
}

// Load questions for session control
async function loadQuestionsForSession() {
    try {
        // Fetch current session state
        const sessionResponse = await fetch(`${API_BASE_URL}/session`);
        const session = await sessionResponse.json();
        const activeQuestionId = session.activeQuestionId?._id || session.activeQuestionId;

        // Update live user count
        const userCountEl = document.getElementById('liveUserCount');
        if (userCountEl) userCountEl.textContent = session.activeUserCount || 0;

        // Handle Timer
        const timerBadge = document.getElementById('liveTimerBadge');
        if (activeQuestionId && session.currentQuestionStartTime) {
            if (timerBadge) timerBadge.style.display = 'block';
            startSessionTimer(new Date(session.currentQuestionStartTime));
        } else {
            if (timerBadge) timerBadge.style.display = 'none';
            if (sessionTimerInterval) clearInterval(sessionTimerInterval);
        }

        // Fetch all questions
        const response = await fetch(`${API_BASE_URL}/questions`);
        let questions = await response.json();
        const container = document.getElementById('questionsList');

        if (!container) return; // Guard clause if user navigated away

        // Filter by category if selected
        const categoryFilter = document.getElementById('categoryFilter')?.value;
        if (categoryFilter && categoryFilter !== 'all') {
            questions = questions.filter(q => (q.category || 'General') === categoryFilter);
        }

        if (questions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No questions found for this category.</p>';
            return;
        }

        container.innerHTML = questions.map(q => {
            const isActive = activeQuestionId && (activeQuestionId === q._id);
            const hasActiveQuestion = !!activeQuestionId;
            const wasReleased = q.timesLaunched > 0;

            return `
            <div style="background: ${isActive ? 'rgba(39, 174, 96, 0.15)' : 'rgba(255, 255, 255, 0.03)'}; padding: 20px; margin-bottom: 12px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid ${isActive ? '#27ae60' : wasReleased ? 'rgba(243, 156, 18, 0.3)' : 'rgba(255, 255, 255, 0.1)'}; backdrop-filter: blur(10px);">
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px;">
                        ${q.text}
                        ${isActive ? ' 🟢 <span style="color: #2ecc71; font-size: 12px; vertical-align: middle; border: 1px solid #2ecc71; padding: 2px 6px; border-radius: 4px; margin-left: 10px;">ACTIVE</span>' : ''}
                    </h3>
                    <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
                        <small style="color: rgba(255, 255, 255, 0.5);">Category: <strong style="color: #ffffff;">${q.category || 'General'}</strong></small>
                        <small style="color: rgba(255, 255, 255, 0.5);">Type: <span style="color: #ffffff;">${q.type}</span></small>
                        <small style="color: rgba(255, 255, 255, 0.5);">Points: <span style="color: #ffffff;">${q.points}</span></small>
                        ${wasReleased ? `<small style="color: #f39c12; font-weight: 600;">📺 Released ${q.timesLaunched}x</small>` : '<small style="color: #27ae60; font-weight: 600;">✨ New</small>'}
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    ${isActive ? `<div style="background: linear-gradient(135deg, #9333ea 0%, #7e22ce 100%); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 10px 16px; border-radius: 8px; font-weight: 800; margin-right: 8px; font-size: 14px; box-shadow: 0 4px 15px rgba(147, 51, 234, 0.4); display: flex; align-items: center; gap: 8px;"><span>📊</span> Responses: ${session.responseCount || 0}</div>` : ''}
                    
                    <button 
                        onclick="launchQuestion('${q._id}')" 
                        class="admin-btn"
                        style="background: ${hasActiveQuestion && !isActive ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'}; border: none; color: ${hasActiveQuestion && !isActive ? 'rgba(255,255,255,0.3)' : 'white'}; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: ${hasActiveQuestion && !isActive ? 'not-allowed' : 'pointer'};"
                        ${hasActiveQuestion && !isActive ? 'disabled' : ''}
                    >Launch</button>
                    <button 
                        onclick="endQuestion()" 
                        class="admin-btn"
                        style="background: ${isActive ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : 'rgba(255,255,255,0.05)'}; border: none; color: ${!isActive ? 'rgba(255,255,255,0.3)' : 'white'}; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: ${!isActive ? 'not-allowed' : 'pointer'};"
                        ${!isActive ? 'disabled' : ''}
                    >End</button>
                    <button onclick="deleteQuestion('${q._id}', '${q.text.replace(/'/g, "\\'")}')" class="admin-btn" style="background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.3); color: #ff6b6b; padding: 10px 18px; border-radius: 8px; font-weight: 600;">Delete</button>
                </div>
            </div>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function startSessionTimer(startTime) {
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);

    function updateTimer() {
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);

        if (diff < 0) return; // Should not happen

        const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const seconds = (diff % 60).toString().padStart(2, '0');

        const timerEl = document.getElementById('liveTimer');
        if (timerEl) timerEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    updateTimer();
    sessionTimerInterval = setInterval(updateTimer, 1000);
}

// Launch question to users
async function launchQuestion(questionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/session/start-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ questionId })
        });
        if (response.ok) {
            alert('Question launched!');
            loadQuestionsForSession(); // Refresh to update button states
        } else {
            alert('Error launching question');
        }
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
            <div class="admin-header">
                <h1>🏆 Leaderboard</h1>
                <div style="display: flex; gap: 10px;">
                    <button onclick="clearLeaderboard()" style="background: #e74c3c;">⚠️ Clear All Leaderboard</button>
                    <button onclick="showAdminDashboard()" style="background: #95a5a6;">← Back to Dashboard</button>
                </div>
            </div>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; margin-bottom: 20px; color: white;">
                <p style="margin: 0; font-size: 14px;">🎯 <strong>Tie-breaker:</strong> When points are equal, fastest average response time ranks higher</p>
            </div>
            <div id="leaderboardList"></div>
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

        if (users.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No users in leaderboard yet</p>';
            return;
        }

        // Calculate ranks with tie-breaker logic
        let currentRank = 1;
        const usersWithRanks = users.map((user, index) => {
            if (index > 0) {
                const prevUser = users[index - 1];
                // If points AND avg response time are different, increment rank
                if (user.points !== prevUser.points || user.avgResponseTime !== prevUser.avgResponseTime) {
                    currentRank = index + 1;
                }
            }
            return { ...user, rank: currentRank };
        });

        // Format response time as MM:SS
        const formatTime = (ms) => {
            if (ms >= 999999) return '-';
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        container.innerHTML = usersWithRanks.map((u, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const bgColor = index === 0 ? '#fff9e6' : index === 1 ? '#f5f5f5' : index === 2 ? '#fff5e6' : '#f8f9fa';
            const borderColor = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#ddd';

            return `
            <div style="background: ${bgColor}; padding: 20px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid ${borderColor}; display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: center;">
                <div style="text-align: center;">
                    <div style="font-size: 32px;">${medal}</div>
                    <strong style="font-size: 20px; color: #667eea;">#${u.rank}</strong>
                </div>
                <div>
                    <h3 style="margin: 0 0 8px 0; font-size: 18px;">${u.name}</h3>
                    <div style="color: #666; font-size: 13px; margin-bottom: 8px;">
                        <strong>ID:</strong> ${u.employeeId} | <strong>Manager:</strong> ${u.reportingManager}
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                        <div style="text-align: center; background: white; padding: 8px; border-radius: 4px;">
                            <strong style="color: #667eea; font-size: 16px;">${u.points || 0}</strong>
                            <p style="margin: 0; color: #666; font-size: 11px;">Points</p>
                        </div>
                        <div style="text-align: center; background: white; padding: 8px; border-radius: 4px;">
                            <strong style="color: ${(u.accuracy || 0) >= 80 ? '#27ae60' : (u.accuracy || 0) >= 60 ? '#f39c12' : '#e74c3c'}; font-size: 16px;">${u.accuracy || 0}%</strong>
                            <p style="margin: 0; color: #666; font-size: 11px;">Accuracy</p>
                        </div>
                        <div style="text-align: center; background: white; padding: 8px; border-radius: 4px;">
                            <strong style="color: #3498db; font-size: 16px;">${u.totalQuestions || 0}</strong>
                            <p style="margin: 0; color: #666; font-size: 11px;">Questions</p>
                        </div>
                    </div>
                    ${u.avgResponseTime < 999999 ? `<div style="margin-top: 8px; color: #27ae60; font-weight: 600; font-size: 13px;">⏱️ Avg Response Time: ${formatTime(u.avgResponseTime)}</div>` : ''}
                </div>
            </div>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Clear all leaderboard data
window.clearLeaderboard = async function () {
    const input = prompt('⚠️ WARNING: FRESH START\n\nThis will permanently DELETE:\n1. ALL Users\n2. ALL Responses\n3. ALL Scores\n\nType "FRESH START" to confirm:');

    if (input !== 'FRESH START') {
        if (input !== null) {
            alert('Action cancelled. You must type "FRESH START" exactly to confirm.');
        }
        return;
    }

    const confirmAgain = confirm('Are you absolutely sure?\n\nThis will:\n✗ Delete all user responses\n✗ Delete all users\n✗ Reset everything to zero\n\nThis CANNOT be undone!\n\nClick OK to proceed.');

    if (!confirmAgain) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/responses/clear-all`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert(`✓ ${result.message}`);
            // Reload the leaderboard page to show empty state
            showEnhancedLeaderboard();
        } else {
            alert('Error: ' + (result.error || 'Failed to clear leaderboard'));
        }
    } catch (error) {
        alert('Error clearing leaderboard: ' + error.message);
    }
};

// Download Detailed Report
window.downloadDetailedReport = async function () {
    try {
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/reports/detailed`;
        link.setAttribute('target', '_blank');

        // Add authorization header by using fetch and creating blob
        const response = await fetch(`${API_BASE_URL}/reports/detailed`, {
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to download report');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = `quiz_detailed_report_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        alert('✅ Report downloaded successfully!');
    } catch (error) {
        console.error('Error downloading report:', error);
        alert('Error downloading report. Please try again.');
    }
};

// Migrate all questions to 1 point
window.migratePointsTo1 = async function () {
    const confirm = window.confirm('⚠️ This will update ALL existing questions to award 1 point instead of 10.\n\nDo you want to continue?');

    if (!confirm) return;

    try {
        const response = await fetch(`${API_BASE_URL}/questions/migrate-points`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert(`✅ ${result.message}\n\nAll questions now award 1 point!`);
        } else {
            throw new Error(result.error || 'Migration failed');
        }
    } catch (error) {
        console.error('Error migrating points:', error);
        alert('Error migrating points. Please try again.');
    }
};

// Logout
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    currentUser = null;
    currentAdminToken = null;
    showLoginForm();
}

// CSV Upload Function
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const statusDiv = document.getElementById('uploadStatus');

    if (!fileInput.files[0]) {
        statusDiv.innerHTML = '<p style="color: #e74c3c;">Please select a CSV file first.</p>';
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    statusDiv.innerHTML = '<p style="color: #3498db;">Uploading...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/questions/bulk-upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            statusDiv.innerHTML = `<p style="color: #27ae60;">✓ ${result.message}</p>`;
            fileInput.value = '';
            setTimeout(() => showAdminDashboard(), 2000);
        } else {
            let errorMsg = result.error;
            if (result.errors && result.errors.length > 0) {
                errorMsg += '<br><br>Errors:<br>' + result.errors.slice(0, 5).join('<br>');
                if (result.errors.length > 5) {
                    errorMsg += `<br>... and ${result.errors.length - 5} more errors`;
                }
            }
            statusDiv.innerHTML = `<p style="color: #e74c3c;">${errorMsg}</p>`;
        }
    } catch (error) {
        statusDiv.innerHTML = `<p style="color: #e74c3c;">Error: ${error.message}</p>`;
    }
}

// Delete Question Function
async function deleteQuestion(questionId, questionText) {
    if (!confirm(`Are you sure you want to delete this question?\n\n"${questionText}"`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert('Question deleted successfully!');
            loadQuestionsForSession(); // Reload the list
        } else {
            alert(result.error || 'Error deleting question');
        }
    } catch (error) {
        alert('Error deleting question: ' + error.message);
    }
}

// Enhanced Leaderboard with Badges
async function showEnhancedLeaderboard() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <div class="admin-header">
                <h1>🏆 Leaderboard</h1>
                <div style="display: flex; gap: 10px;">
                    <button onclick="clearLeaderboard()" style="background: #e74c3c;">⚠️ Clear All Leaderboard</button>
                    <button onclick="showAdminDashboard()" style="background: #95a5a6;">← Back to Dashboard</button>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; margin-bottom: 20px; color: white;">
                <p style="margin: 0; font-size: 14px;">🎯 <strong>Tie-breaker:</strong> When points are equal, fastest average response time ranks higher</p>
            </div>
            
            <div style="margin-bottom: 20px; display: flex; gap: 15px; align-items: center;">
                <div>
                    <label style="font-weight: 600; margin-right: 8px;">Filter by Manager:</label>
                    <select id="managerFilter" onchange="loadEnhancedLeaderboard()" style="padding: 8px;">
                        <option value="all">All Managers</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight: 600; margin-right: 8px;">Sort by:</label>
                    <select id="sortBy" onchange="loadEnhancedLeaderboard()" style="padding: 8px;">
                        <option value="points">Points</option>
                        <option value="accuracy">Accuracy</option>
                        <option value="questions">Questions Attempted</option>
                    </select>
                </div>
            </div>
            
            <div id="leaderboardList"></div>
        </div>
    `;

    // Load managers for filter
    loadManagersForFilter();
    // Load leaderboard data
    loadEnhancedLeaderboard();
}

async function loadManagersForFilter() {
    try {
        const response = await fetch(`${API_BASE_URL}/reporting-managers`);
        const managers = await response.json();
        const select = document.getElementById('managerFilter');

        managers.forEach(manager => {
            const option = document.createElement('option');
            option.value = manager.name;
            option.textContent = manager.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading managers:', error);
    }
}

async function loadEnhancedLeaderboard() {
    try {
        const manager = document.getElementById('managerFilter')?.value || 'all';
        const sortBy = document.getElementById('sortBy')?.value || 'points';

        const response = await fetch(`${API_BASE_URL}/leaderboard?manager=${manager}&sortBy=${sortBy}`);
        const leaderboard = await response.json();
        const container = document.getElementById('leaderboardList');

        // Format response time as MM:SS
        const formatTime = (ms) => {
            if (ms >= 999999) return '-';
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        if (leaderboard.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No trainers found.</p>';
            return;
        }

        container.innerHTML = leaderboard.map(user => `
            <div style="background: ${user.rank <= 3 ? '#fff3cd' : '#f8f9fa'}; padding: 20px; margin-bottom: 15px; border-radius: 8px; border-left: 5px solid ${user.rank === 1 ? '#FFD700' : user.rank === 2 ? '#C0C0C0' : user.rank === 3 ? '#CD7F32' : '#667eea'};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <strong style="font-size: 28px; color: #667eea;">#${user.rank}</strong>
                            <div>
                                <h3 style="margin: 0;">${user.name}</h3>
                                <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">ID: ${user.employeeId} | Manager: ${user.reportingManager}</p>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0;">
                            <div>
                                <small style="color: #666;">Points</small>
                                <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 600; color: #667eea;">${user.points}</p>
                            </div>
                            <div>
                                <small style="color: #666;">Accuracy</small>
                                <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 600; color: ${user.accuracy >= 80 ? '#27ae60' : user.accuracy >= 60 ? '#f39c12' : '#e74c3c'};">${user.accuracy}%</p>
                            </div>
                            <div>
                                <small style="color: #666;">Questions</small>
                                <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 600;">${user.totalQuestions}</p>
                            </div>
                        </div>
                        
                        ${user.avgResponseTime < 999999 ? `<div style="margin-top: 8px; color: #27ae60; font-weight: 600; font-size: 13px;">⏱️ Avg Response Time: ${formatTime(user.avgResponseTime)}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        const container = document.getElementById('leaderboardList');
        container.innerHTML = '<p style="color: #e74c3c;">Error loading leaderboard</p>';
    }
}


// ==================== MANAGEMENT FUNCTIONS ====================

// Question Management Screen
async function showQuestionManagement() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <div class="admin-header">
                <h1>Question Management</h1>
                <button onclick="showAdminDashboard()" style="background: #95a5a6;">← Back to Dashboard</button>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
                <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 15px; align-items: end;">
                    <div>
                        <label style="font-weight: 600; display: block; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Search Questions</label>
                        <input type="text" id="searchQuestion" placeholder="Type to search questions..." style="width: 100%; padding: 12px; font-size: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: white;">
                    </div>
                    <div>
                        <label style="font-weight: 600; display: block; margin-bottom: 8px; color: rgba(255, 255, 255, 0.8);">Category</label>
                        <select id="filterCategory" onchange="loadAllQuestions()" style="width: 100%; padding: 12px; font-size: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: white; cursor: pointer;">
                            <option value="all" style="background: #1a1a3e;">All Categories</option>
                            <option value="General" style="background: #1a1a3e;">General</option>
                            <option value="Sales" style="background: #1a1a3e;">Sales</option>
                            <option value="Marketing" style="background: #1a1a3e;">Marketing</option>
                            <option value="Leadership" style="background: #1a1a3e;">Leadership</option>
                            <option value="Technology" style="background: #1a1a3e;">Technology</option>
                            <option value="Product Knowledge" style="background: #1a1a3e;">Product Knowledge</option>
                            <option value="Customer Service" style="background: #1a1a3e;">Customer Service</option>
                            <option value="HR & Compliance" style="background: #1a1a3e;">HR & Compliance</option>
                        </select>
                    </div>
                    <button onclick="loadAllQuestions()" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 12px 25px; width: auto; font-weight: 600;">Search</button>
                </div>
            </div>
            
            <!-- Bulk Actions -->
            <div id="bulkActionsBar" style="display: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 8px; margin-bottom: 15px; color: white;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span id="selectedCount" style="font-weight: 600;">0 questions selected</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="deleteSelectedQuestions()" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">🗑️ Delete Selected</button>
                        <button onclick="clearAllQuestions()" style="background: #c0392b; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">⚠️ Clear All Questions</button>
                        <button onclick="deselectAll()" style="background: rgba(255,255,255,0.2); color: white; border: 2px solid white; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 600;">✕ Deselect All</button>
                    </div>
                </div>
            </div>
            
            <div id="questionManagementList"></div>
        </div>
    `;

    loadAllQuestions();

    // Add search on enter
    document.getElementById('searchQuestion').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loadAllQuestions();
    });
}

async function loadAllQuestions() {
    try {
        const response = await fetch(`${API_BASE_URL}/questions`);
        let questions = await response.json();
        const container = document.getElementById('questionManagementList');

        // Apply filters
        const searchTerm = document.getElementById('searchQuestion')?.value.toLowerCase();
        const categoryFilter = document.getElementById('filterCategory')?.value;

        if (searchTerm) {
            questions = questions.filter(q => q.text.toLowerCase().includes(searchTerm));
        }

        if (categoryFilter && categoryFilter !== 'all') {
            questions = questions.filter(q => (q.category || 'General') === categoryFilter);
        }

        if (questions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No questions found.</p>';
            return;
        }

        container.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; margin-bottom: 20px; border-radius: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <input type="checkbox" id="selectAll" onchange="toggleSelectAll()" style="width: 20px; height: 20px; cursor: pointer;">
                <label for="selectAll" style="font-weight: 700; cursor: pointer; user-select: none; color: #ffffff; font-size: 15px;">Select All (${questions.length} questions)</label>
            </div>
        ` + questions.map(q => `
            <div class="question-row" style="background: rgba(255, 255, 255, 0.03); padding: 20px; margin-bottom: 12px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); display: flex; gap: 20px; align-items: start;">
                <div style="padding-top: 5px;">
                    <input type="checkbox" class="question-checkbox" data-question-id="${q._id}" onchange="updateBulkActionsBar()" style="width: 18px; height: 18px; cursor: pointer;">
                </div>
                <div style="flex: 1;">
                        <h3 style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px;">${q.text}</h3>
                        <div style="display: flex; gap: 20px; margin-bottom: 12px; flex-wrap: wrap;">
                            <small style="color: rgba(255, 255, 255, 0.5);"><strong>Category:</strong> <span style="color: #ffffff;">${q.category || 'General'}</span></small>
                            <small style="color: rgba(255, 255, 255, 0.5);"><strong>Type:</strong> <span style="color: #ffffff;">${q.type}</span></small>
                            <small style="color: rgba(255, 255, 255, 0.5);"><strong>Points:</strong> <span style="color: #ffffff;">${q.points}</span></small>
                            <small style="color: rgba(255, 255, 255, 0.5);"><strong>Times Launched:</strong> <span style="color: #ffffff;">${q.timesLaunched || 0}</span></small>
                        </div>
                        ${q.options && q.options.length > 0 ? `
                            <div style="margin-top: 15px; background: rgba(255, 255, 255, 0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                                <small style="color: rgba(255, 255, 255, 0.4); text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Options</small>
                                <ul style="margin: 8px 0 0 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8);">
                                    ${q.options.map(opt => `<li style="margin-bottom: 5px;">${opt} ${q.correctAnswer === opt ? '<span style="color: #2ecc71; font-weight: 600;">✓ (Correct)</span>' : ''}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <button onclick="editQuestion('${q._id}')" style="background: rgba(52, 152, 219, 0.2); color: #3498db; border: 1px solid rgba(52, 152, 219, 0.3); padding: 10px 18px; border-radius: 8px; font-weight: 600;">Edit</button>
                        <button onclick="deleteQuestionFromManagement('${q._id}', '${q.text.replace(/'/g, "\\'")}')" style="background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.3); color: #ff6b6b; padding: 10px 18px; border-radius: 8px; font-weight: 600;">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

// Bulk action functions
window.toggleSelectAll = function () {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.question-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBulkActionsBar();
};

window.updateBulkActionsBar = function () {
    const checkboxes = document.querySelectorAll('.question-checkbox');
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
    const count = checkedBoxes.length;

    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');
    const selectAll = document.getElementById('selectAll');

    if (count > 0) {
        bulkActionsBar.style.display = 'block';
        selectedCount.textContent = `${count} question${count > 1 ? 's' : ''} selected`;
    } else {
        bulkActionsBar.style.display = 'none';
    }

    // Update select all checkbox state
    if (selectAll) {
        selectAll.checked = count > 0 && count === checkboxes.length;
        selectAll.indeterminate = count > 0 && count < checkboxes.length;
    }
};

window.deselectAll = function () {
    const checkboxes = document.querySelectorAll('.question-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('selectAll');
    if (selectAll) selectAll.checked = false;
    updateBulkActionsBar();
};

window.deleteSelectedQuestions = async function () {
    const checkboxes = document.querySelectorAll('.question-checkbox:checked');
    const questionIds = Array.from(checkboxes).map(cb => cb.dataset.questionId);

    if (questionIds.length === 0) {
        alert('No questions selected');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${questionIds.length} question${questionIds.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        let successCount = 0;
        let errorCount = 0;

        for (const id of questionIds) {
            try {
                const response = await fetch(`${API_BASE_URL}/questions/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${currentAdminToken}`
                    }
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }

        if (successCount > 0) {
            alert(`Successfully deleted ${successCount} question${successCount > 1 ? 's' : ''}${errorCount > 0 ? `\n${errorCount} failed to delete` : ''}`);
            loadAllQuestions();
        } else {
            alert('Failed to delete questions');
        }
    } catch (error) {
        alert('Error deleting questions: ' + error.message);
    }
};

window.clearAllQuestions = async function () {
    const input = prompt('⚠️ WARNING: This will permanently delete ALL questions!\n\nType "DELETE ALL" to confirm:');

    if (input !== 'DELETE ALL') {
        if (input !== null) {
            alert('Deletion cancelled. You must type "DELETE ALL" exactly to confirm.');
        }
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/questions`);
        const questions = await response.json();

        if (questions.length === 0) {
            alert('No questions to delete');
            return;
        }

        const confirmAgain = confirm(`You are about to delete ${questions.length} questions.\n\nThis action CANNOT be undone!\n\nClick OK to proceed.`);

        if (!confirmAgain) {
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const q of questions) {
            try {
                const deleteResponse = await fetch(`${API_BASE_URL}/questions/${q._id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${currentAdminToken}`
                    }
                });

                if (deleteResponse.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }

        alert(`Deleted ${successCount} questions${errorCount > 0 ? `\n${errorCount} failed to delete` : ''}`);
        loadAllQuestions();
    } catch (error) {
        alert('Error clearing questions: ' + error.message);
    }
};

async function editQuestion(questionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`);
        const question = await response.json();

        const root = document.getElementById('root');
        root.innerHTML = `
            <div class="container">
                <div class="admin-header">
                    <h1>Edit Question</h1>
                    <button onclick="showQuestionManagement()" style="background: #95a5a6;">← Back to Questions</button>
                </div>
                <form id="editQuestionForm">
                    <div class="form-group">
                        <label for="editCategory">Question Category</label>
                        <select id="editCategory">
                            <option value="General">General</option>
                            <option value="Sales">Sales</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Leadership">Leadership</option>
                            <option value="Technology">Technology</option>
                            <option value="Product Knowledge">Product Knowledge</option>
                            <option value="Customer Service">Customer Service</option>
                            <option value="HR & Compliance">HR & Compliance</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editType">Question Type</label>
                        <select id="editType" required>
                            <option value="MCQ">Multiple Choice</option>
                            <option value="True/False">True/False</option>
                            <option value="Poll">Poll</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editText">Question</label>
                        <textarea id="editText" required style="height: 80px;"></textarea>
                    </div>
                    <div id="editOptionsDiv"></div>
                    <button type="submit">Update Question</button>
                    <button type="button" onclick="showQuestionManagement()" style="background: #95a5a6; margin-left: 10px; width: auto;">Cancel</button>
                </form>
            </div>
        `;

        // Populate form
        document.getElementById('editCategory').value = question.category || 'General';
        document.getElementById('editType').value = question.type;
        document.getElementById('editText').value = question.text;

        // Setup type change listener
        document.getElementById('editType').addEventListener('change', updateEditQuestionForm);
        document.getElementById('editQuestionForm').addEventListener('submit', (e) => handleEditQuestion(e, questionId));

        // Initial form update
        updateEditQuestionForm(question);
    } catch (error) {
        alert('Error loading question: ' + error.message);
    }
}

function updateEditQuestionForm(existingQuestion = null) {
    const type = document.getElementById('editType').value;
    const optionsDiv = document.getElementById('editOptionsDiv');

    let html = '';
    if (type === 'MCQ') {
        const optionsValue = existingQuestion?.options ? existingQuestion.options.join('\n') : '';
        html = `
            <div class="form-group">
                <label for="editOptions">Options (one per line)</label>
                <textarea id="editOptions" required style="height: 100px;">${optionsValue}</textarea>
            </div>
            <div class="form-group">
                <label for="editCorrectAnswer">Correct Answer</label>
                <select id="editCorrectAnswer" required>
                    <option value="">Select correct answer</option>
                </select>
            </div>
        `;
    } else if (type === 'Poll') {
        const optionsValue = existingQuestion?.options ? existingQuestion.options.join('\n') : '';
        html = `
            <div class="form-group">
                <label for="editOptions">Options (one per line)</label>
                <textarea id="editOptions" required style="height: 100px;">${optionsValue}</textarea>
            </div>
        `;
    } else if (type === 'True/False') {
        html = `
            <div class="form-group">
                <label for="editCorrectAnswer">Correct Answer</label>
                <select id="editCorrectAnswer" required>
                    <option value="">Select correct answer</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                </select>
            </div>
        `;
    }

    optionsDiv.innerHTML = html;

    // If MCQ, setup options update listener
    if (type === 'MCQ') {
        const optionsTextarea = document.getElementById('editOptions');
        const correctAnswerSelect = document.getElementById('editCorrectAnswer');

        // Update dropdown with options
        const updateDropdown = () => {
            const currentValue = correctAnswerSelect.value;
            const options = optionsTextarea.value.split('\n').map(o => o.trim()).filter(o => o);

            correctAnswerSelect.innerHTML = '<option value="">Select correct answer</option>';
            options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                correctAnswerSelect.appendChild(opt);
            });

            if (existingQuestion?.correctAnswer) {
                correctAnswerSelect.value = existingQuestion.correctAnswer;
            } else {
                correctAnswerSelect.value = currentValue;
            }
        };

        updateDropdown();
        optionsTextarea.addEventListener('input', updateDropdown);
    } else if (type === 'True/False' && existingQuestion?.correctAnswer) {
        setTimeout(() => {
            document.getElementById('editCorrectAnswer').value = existingQuestion.correctAnswer;
        }, 0);
    }
}

async function handleEditQuestion(e, questionId) {
    e.preventDefault();

    const text = document.getElementById('editText').value;
    const type = document.getElementById('editType').value;
    const category = document.getElementById('editCategory').value;
    const correctAnswer = document.getElementById('editCorrectAnswer')?.value || '';
    const optionsText = document.getElementById('editOptions')?.value || '';
    const options = optionsText ? optionsText.split('\n').map(o => o.trim()).filter(o => o) : [];

    try {
        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ text, type, category, options, correctAnswer, points: 10 })
        });

        if (response.ok) {
            alert('Question updated successfully!');
            showQuestionManagement();
        } else {
            alert('Error updating question');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteQuestionFromManagement(questionId, questionText) {
    if (!confirm(`Are you sure you want to delete this question?\n\n"${questionText}"`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert('Question deleted successfully!');
            loadAllQuestions();
        } else {
            alert(result.error || 'Error deleting question');
        }
    } catch (error) {
        alert('Error deleting question: ' + error.message);
    }
}

// Reporting Manager Management Screen
async function showManagerManagement() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <div class="admin-header">
                <h1>Reporting Manager Management</h1>
                <button onclick="showAdminDashboard()" style="background: #95a5a6;">← Back to Dashboard</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div style="background: rgba(255, 255, 255, 0.05); padding: 25px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
                    <h3 style="margin-top: 0; color: #ffffff; display: flex; align-items: center; gap: 10px;">👤 Add Single Manager</h3>
                    <form id="addManagerForm" style="display: flex; gap: 10px; align-items: end;">
                        <div class="form-group" style="flex: 1; margin-bottom: 0;">
                            <label for="managerName" style="color: rgba(255, 255, 255, 0.7);">Manager Name</label>
                            <input type="text" id="managerName" placeholder="Enter manager name" required style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: white;">
                        </div>
                        <button type="submit" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); width: auto; font-weight: 600; padding: 12px 20px;">Add</button>
                    </form>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.05); padding: 25px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);">
                    <h3 style="margin-top: 0; color: #ffffff; display: flex; align-items: center; gap: 10px;">📤 Bulk Upload (CSV)</h3>
                    <form id="uploadManagersForm">
                        <input type="file" id="managersCsvFile" accept=".csv" style="margin-bottom: 15px; color: rgba(255, 255, 255, 0.6);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <button type="submit" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); width: auto; font-weight: 600; padding: 12px 20px;">Upload CSV</button>
                            <a href="#" onclick="downloadManagerTemplate(); return false;" style="font-size: 13px; color: #e74c3c; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 5px;"><span>📥</span> Template</a>
                        </div>
                    </form>
                </div>
            </div>
            
            <div id="managersList"></div>
        </div>
    `;

    document.getElementById('addManagerForm').addEventListener('submit', handleAddManager);
    document.getElementById('uploadManagersForm').addEventListener('submit', handleManagersCsvUpload);
    loadManagers();
}

// Download manager CSV template
function downloadManagerTemplate() {
    const csvContent = "name\nJohn Doe\nJane Smith\nRobert Johnson";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manager_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Handle CSV upload for managers
async function handleManagersCsvUpload(e) {
    e.preventDefault();

    const fileInput = document.getElementById('managersCsvFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a CSV file');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const csv = event.target.result;
            const lines = csv.split('\n').filter(line => line.trim());

            // Skip header row
            const managerNames = lines.slice(1).map(line => line.trim()).filter(name => name);

            if (managerNames.length === 0) {
                alert('No manager names found in CSV');
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const name of managerNames) {
                try {
                    const response = await fetch(`${API_BASE_URL}/reporting-managers`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentAdminToken}`
                        },
                        body: JSON.stringify({ name })
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                }
            }

            alert(`Upload complete!\nSuccess: ${successCount}\nFailed: ${errorCount}`);
            fileInput.value = '';
            loadManagers();
        } catch (error) {
            alert('Error parsing CSV: ' + error.message);
        }
    };

    reader.readAsText(file);
}

async function loadManagers() {
    try {
        const response = await fetch(`${API_BASE_URL}/reporting-managers`);
        const managers = await response.json();
        const container = document.getElementById('managersList');

        if (managers.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No managers found.</p>';
            return;
        }

        // Sort managers alphabetically by name
        managers.sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = managers.map(manager => `
            <div style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <h3 style="margin: 0;">${manager.name}</h3>
                    <small style="color: #666;">ID: ${manager._id}</small>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editManager('${manager._id}', '${manager.name.replace(/'/g, "\\'")}')" style="background: #3498db;">Edit</button>
                    <button onclick="deleteManager('${manager._id}', '${manager.name.replace(/'/g, "\\'")}')" style="background: #e74c3c;">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading managers:', error);
    }
}

async function handleAddManager(e) {
    e.preventDefault();
    const name = document.getElementById('managerName').value;

    try {
        const response = await fetch(`${API_BASE_URL}/reporting-managers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            alert('Manager added successfully!');
            document.getElementById('managerName').value = '';
            loadManagers();
        } else {
            alert('Error adding manager');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function editManager(managerId, currentName) {
    const newName = prompt('Enter new manager name:', currentName);
    if (!newName || newName === currentName) return;

    try {
        const response = await fetch(`${API_BASE_URL}/reporting-managers/${managerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ name: newName })
        });

        if (response.ok) {
            alert('Manager updated successfully!');
            loadManagers();
        } else {
            alert('Error updating manager');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteManager(managerId, managerName) {
    if (!confirm(`Are you sure you want to delete manager "${managerName}"?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reporting-managers/${managerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        if (response.ok) {
            alert('Manager deleted successfully!');
            loadManagers();
        } else {
            alert('Error deleting manager');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ==================== CATEGORY MANAGEMENT ====================

// Show Category Management Screen
async function showCategoryManagement() {
    const root = document.getElementById('root');
    root.innerHTML = `
        <div class="container">
            <div class="admin-header">
                <h1>⚙️ Category Management</h1>
                <button onclick="showAdminDashboard()" style="background: #95a5a6;">← Back to Dashboard</button>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 25px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 30px; backdrop-filter: blur(10px);">
                <h3 style="margin-top: 0; color: #ffffff; display: flex; align-items: center; gap: 10px;">🏷️ Add New Category</h3>
                <form id="addCategoryForm" style="display: flex; gap: 10px; align-items: end;">
                    <div class="form-group" style="flex: 1; margin-bottom: 0;">
                        <label for="categoryName" style="color: rgba(255, 255, 255, 0.7);">Category Name</label>
                        <input type="text" id="categoryName" placeholder="Enter category name" required style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: white;">
                    </div>
                    <button type="submit" style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); width: auto; font-weight: 600; padding: 12px 25px;">Add Category</button>
                </form>
            </div>
            
            <div id="categoriesListContainer" style="background: rgba(255, 255, 255, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1);">
                <div id="categoriesList"></div>
            </div>
        </div>
    `;

    document.getElementById('addCategoryForm').addEventListener('submit', handleAddCategory);
    renderCategoriesList();
}

async function renderCategoriesList() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const categories = await response.json();
        const container = document.getElementById('categoriesList');

        if (categories.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666;">No categories found.</p>';
            return;
        }

        container.innerHTML = categories.map(category => `
            <div style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <h3 style="margin: 0;">${category.name}</h3>
                    <small style="color: #666;">ID: ${category._id}</small>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="editCategory('${category._id}', '${category.name.replace(/'/g, "\\'")}')" style="background: #3498db;">Edit</button>
                    <button onclick="deleteCategory('${category._id}', '${category.name.replace(/'/g, "\\'")}')" style="background: #e74c3c;">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function handleAddCategory(e) {
    e.preventDefault();
    const name = document.getElementById('categoryName').value;

    try {
        const response = await fetch(`${API_BASE_URL}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            alert('Category added successfully!');
            document.getElementById('categoryName').value = '';
            renderCategoriesList();
        } else {
            const result = await response.json();
            alert(result.error || 'Error adding category');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function editCategory(categoryId, currentName) {
    const newName = prompt('Enter new category name:', currentName);
    if (!newName || newName === currentName) return;

    try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAdminToken}`
            },
            body: JSON.stringify({ name: newName })
        });

        if (response.ok) {
            alert('Category updated successfully!');
            renderCategoriesList();
        } else {
            alert('Error updating category');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteCategory(categoryId, categoryName) {
    if (!confirm(`Are you sure you want to delete category "${categoryName}"?\n\nWarning: Questions using this category will still keep the category name.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentAdminToken}`
            }
        });

        if (response.ok) {
            alert('Category deleted successfully!');
            renderCategoriesList();
        } else {
            alert('Error deleting category');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Logout function
function logout() {
    if (currentUser) {
        // Call backend to mark user as inactive
        fetch(`${API_BASE_URL}/user/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id })
        }).catch(err => console.error('Logout error:', err));
    }

    // Clear local storage
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');

    // Reset state
    currentUser = null;
    currentAdminToken = null;
    answeredQuestions.clear();

    // Stop polling
    if (pollInterval) clearInterval(pollInterval);
    if (adminPollInterval) clearInterval(adminPollInterval);
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);

    // Redirect to login
    showLoginForm();
}

