// Global state management
const AppState = {
    currentUser: null,
    users: [],
    posts: [],
    currentTheme: 'light',
    selectedImages: [],
    isAnalyzing: false,
    DRAFT_KEY: null,
    pendingAvatarDataURL: null,

    init() {
        try {
            this.users = JSON.parse(localStorage.getItem('myidea_users')) || [];
            this.posts = JSON.parse(localStorage.getItem('myidea_posts')) || [];
            this.currentTheme = localStorage.getItem('myidea_theme') || 'light';
            const session = this.getSession();
            if (session && session.user) {
                this.currentUser = session.user;
            }
        } catch (error) {
            console.error('Failed to initialize app state:', error);
            // Reset to defaults
            this.users = [];
            this.posts = [];
            this.currentTheme = 'light';
        }
    },

    getSession() {
        const session = localStorage.getItem('myidea_session');
        if (!session) return null;
        try {
            const parsed = JSON.parse(session);
            if (Date.now() > parsed.expires) {
                localStorage.removeItem('myidea_session');
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    },

    saveState() {
        try {
            localStorage.setItem('myidea_users', JSON.stringify(this.users));
            localStorage.setItem('myidea_posts', JSON.stringify(this.posts));
            localStorage.setItem('myidea_theme', this.currentTheme);
        } catch (error) {
            console.error('Failed to save app state:', error);
            showNotification('Failed to save changes. Please try again.', 'error');
        }
    }
};

// Initialize app state
AppState.init();

// Authentication Helper Functions
function isAuthenticated() {
    const savedUser = getSecureSession();
    if (savedUser) {
        currentUser = savedUser;
        return true;
    }
    return false;
}

function getCurrentUser() {
    if (currentUser) return currentUser;
    
    // Try to get from secure session first
    const session = getSecureSession();
    if (session) {
        currentUser = session;
        return currentUser;
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('myidea_currentUser');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            // Validate user data
            if (!currentUser.id || !currentUser.name || !currentUser.email) {
                throw new Error('Invalid user data');
            }
            // Ensure avatar exists
            if (!currentUser.avatar) {
                currentUser.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`;
            }
            return currentUser;
        } catch (err) {
            console.error('Invalid user data, clearing...', err);
            localStorage.removeItem('myidea_currentUser');
            return null;
        }
    }
    return null;
}

function getPosts() {
    return JSON.parse(localStorage.getItem('myidea_posts')) || [];
}

function saveUser(user) {
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) {
        users[index] = user;
        localStorage.setItem('myidea_users', JSON.stringify(users));
    }
}

function applyTheme(theme = currentTheme) {
    setTheme(theme);
}

// Initialize app when DOM is loaded
async function initializeApp() {
    try {
        // Normalize legacy comments data shape
        await normalizeCommentsData();

        // Check authentication and redirect if needed
        if (!isAuthenticated()) {
            if (window.location.pathname.includes('feed.html') || window.location.pathname.includes('profile.html')) {
                window.location.href = 'login.html';
                return;
            }
        }

    // Initialize theme
    applyTheme();

    // Initialize page-specific functionality
    if (document.getElementById('loginForm')) {
        initLoginPage();
    } else if (document.querySelector('.feed-main')) {
        initFeedPage();
    } else if (document.querySelector('.profile-content')) {
        initProfilePage();
    }
});

// Theme Management
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('myidea_theme', theme);
    currentTheme = theme;
    updateThemeIcon();
}

// Ensure all posts/comments have the expected nested replies array shape.
function normalizeCommentsData() {
    try {
        let changed = false;
        posts = getPosts(); // refresh from storage
        if (!Array.isArray(posts)) return;

        posts.forEach(post => {
            if (!post.comments) { post.comments = []; changed = true; }
            // Walk existing comments recursively and ensure replies arrays
            function walk(cList) {
                cList.forEach(c => {
                    if (!('replies' in c) || !Array.isArray(c.replies)) { c.replies = []; changed = true; }
                    if (c.replies && c.replies.length) walk(c.replies);
                });
            }
            if (post.comments && post.comments.length) walk(post.comments);
        });

        if (changed) {
            localStorage.setItem('myidea_posts', JSON.stringify(posts));
        }
    } catch (err) {
        console.error('Failed to normalize comments data', err);
    }
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // Update body class
    document.body.classList.toggle('dark-theme', newTheme === 'dark');
    
    // Update localStorage
    localStorage.setItem('myidea_theme', newTheme);
    
    // Update icon
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.className = `fas ${newTheme === 'dark' ? 'fa-sun' : 'fa-moon'} theme-icon`;
    }
    
    // Update UI colors
    document.documentElement.setAttribute('data-theme', newTheme);
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.className = currentTheme === 'light' ? 'fas fa-moon theme-icon' : 'fas fa-sun theme-icon';
    }
}

// Initialize theme on page load
setTheme(currentTheme);

// Enhanced security: Store session with expiration
function setSecureSession(user, remember) {
    const sessionData = {
        user: user,
        timestamp: Date.now(),
        expires: remember ? Date.now() + (30 * 24 * 60 * 60 * 1000) : Date.now() + (24 * 60 * 60 * 1000) // 30 days or 1 day
    };
    localStorage.setItem('myidea_session', JSON.stringify(sessionData));
}

function getSecureSession() {
    const session = localStorage.getItem('myidea_session');
    if (!session) return null;

    const sessionData = JSON.parse(session);
    if (Date.now() > sessionData.expires) {
        localStorage.removeItem('myidea_session');
        return null;
    }
    return sessionData.user;
}

// Authentication Functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    const inputElement = document.getElementById(elementId.replace('Error', ''));
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        if (inputElement) {
            inputElement.classList.add('input-error');
            inputElement.setAttribute('aria-invalid', 'true');
            
            // Add shake animation
            inputElement.classList.add('shake');
            setTimeout(() => {
                inputElement.classList.remove('shake');
            }, 500);
        }

        // Scroll error into view if not visible
        const rect = errorElement.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        if (!isVisible) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function hideErrors() {
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(error => {
        error.style.display = 'none';
        const inputId = error.id.replace('Error', '');
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.remove('input-error');
            input.removeAttribute('aria-invalid');
        }
    });
}

function showNotification(message, type = 'info') {
    const container = document.createElement('div');
    container.className = `notification notification-${type}`;
    container.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(container);
    
    // Trigger entrance animation
    requestAnimationFrame(() => {
        container.classList.add('notification-show');
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
        container.classList.remove('notification-show');
        setTimeout(() => container.remove(), 300);
    }, 5000);

    // Close button handler
    container.querySelector('.notification-close').addEventListener('click', () => {
        container.classList.remove('notification-show');
        setTimeout(() => container.remove(), 300);
    });
}

function login(email, password) {
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    if (loginBtn) {
        loginBtn.disabled = true;
        SecurityUtils.setButtonLoading(loginBtn, true);
    }
    
    try {
        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('myidea_users') || '[]');
        
        // Rate limiting check
        if (!SecurityUtils.rateLimit('login', 5, 300000)) { // 5 attempts per 5 minutes
            showNotification('Too many login attempts. Please try again later.', 'error');
            return false;
        }

        // Validate input
        if (!SecurityUtils.validateInput(email, { required: true, email: true }) ||
            !SecurityUtils.validateInput(password, { required: true, minLength: 8 })) {
            showNotification('Invalid email or password format', 'error');
            return false;
        }

        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            showNotification('Invalid email or password', 'error');
            return false;
        }

        // Initialize missing fields if needed
        if (!user.id) user.id = Date.now().toString();
        if (!user.avatar) {
            user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
        }
        if (!user.joinedDate) user.joinedDate = new Date().toISOString();
        if (!Array.isArray(user.posts)) user.posts = [];
        if (!Array.isArray(user.followers)) user.followers = [];
        if (!Array.isArray(user.following)) user.following = [];

        // Set current user
        currentUser = user;
        
        // Save with remember me option
        const remember = document.getElementById('rememberSession')?.checked || false;
        setSecureSession(user, remember);
        localStorage.setItem('myidea_currentUser', JSON.stringify(user));
        
        // Save updated user data
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
            users[userIndex] = user;
            localStorage.setItem('myidea_users', JSON.stringify(users));
        }

        // Show success message and redirect
        showNotification('Login successful!', 'success');
        setTimeout(() => window.location.href = 'feed.html', 1000);
        return true;
    } catch (err) {
        console.error('Login failed:', err);
        return false;
    }
}

function register(name, email, password) {
    try {
        // Validate input
        if (!name || !email || !password) {
            showNotification('All fields are required', 'error');
            return false;
        }

        // Check if email exists
        if (users.some(u => u.email === email)) {
            showNotification('Email already registered', 'error');
            return false;
        }

        // Create new user with all required fields
        const newUser = {
            id: Date.now().toString(),
            name: name,
            email: email,
            password: password,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            bio: '',
            joinedDate: new Date().toISOString(),
            posts: [],
            followers: [],
            following: [],
            notifications: [],
            settings: {
                theme: 'light',
                emailNotifications: true,
                pushNotifications: true,
                showOnline: true,
                private: false
            },
            savedPosts: [],
            pinnedPosts: []
        };

        // Save to users array and localStorage
        users.push(newUser);
        localStorage.setItem('myidea_users', JSON.stringify(users));

        // Show success message
        showNotification('Registration successful! Please log in.', 'success');
        return true;
    } catch (err) {
        console.error('Registration failed:', err);
        showNotification('Registration failed. Please try again.', 'error');
        return false;
    }
}

// AI Image Analysis Function with OCR and Deep Analysis
async function analyzeImageWithAI(imageData) {
    if (isAnalyzing) return null;
    isAnalyzing = true;

    try {
        showProgressModal();

        // Step 1: OCR Analysis
        updateProgress(10, 'Performing OCR analysis...');
        const ocrResult = await performOCR(imageData);

        // Step 2: Color and Shape Analysis
        updateProgress(30, 'Analyzing colors and shapes...');
        const colorAnalysis = await analyzeColorsAndShapes(imageData);

        // Step 3: Mock Google Lens API
        updateProgress(50, 'Searching visual database...');
        const lensResult = await mockGoogleLensAPI(imageData);

        // Step 4: Generate AI Story
        updateProgress(70, 'Generating AI story...');
        const storyPrompt = `Analyze this image deeply: ${lensResult.description}. OCR text: ${ocrResult.text}. Color analysis: ${colorAnalysis.summary}. Create a compelling story about its past, present, and future with emotional depth and symbolism.`;
        const aiResponse = await mockAIStoryGeneration(storyPrompt);

        // Step 5: Web Scraping Simulation (in production, use actual scraping)
        updateProgress(90, 'Enhancing with web data...');
        const enhancedDescription = await simulateWebScraping(lensResult.description, aiResponse.tags);

        updateProgress(100, 'Analysis complete!');

        const analysis = {
            title: generateTitle(colorAnalysis, lensResult),
            description: enhancedDescription,
            story: aiResponse.story,
            tags: [...lensResult.tags, ...aiResponse.tags],
            ocr: ocrResult,
            colors: colorAnalysis,
            analysis: aiResponse.analysis,
            timestamp: new Date().toISOString()
        };

        setTimeout(() => hideProgressModal(), 1000);
        return analysis;

    } catch (error) {
        console.error('AI Analysis failed:', error);
        hideProgressModal();
        return {
            title: "Captured Moment",
            description: "A beautiful image that captures a moment in time.",
            story: "This image tells a story of creativity and human expression.",
            tags: ['art', 'creativity'],
            analysis: "The image evokes feelings of inspiration and wonder."
        };
    } finally {
        isAnalyzing = false;
    }
}

// OCR using Tesseract.js
async function performOCR(imageData) {
    try {
        const result = await Tesseract.recognize(imageData, 'eng', {
            logger: m => console.log(m)
        });

        return {
            text: result.data.text.trim(),
            confidence: result.data.confidence,
            words: result.data.words.map(w => w.text)
        };
    } catch (error) {
        console.error('OCR failed:', error);
        return { text: '', confidence: 0, words: [] };
    }
}

// Color and Shape Analysis
async function analyzeColorsAndShapes(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Extract dominant colors
            const colorCounts = {};
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const rgb = `${r},${g},${b}`;

                colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
            }

            const dominantColors = Object.entries(colorCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([rgb, count]) => ({
                    rgb: rgb,
                    hex: rgbToHex(...rgb.split(',').map(Number)),
                    percentage: ((count / (data.length / 4)) * 100).toFixed(1)
                }));

            // Analyze composition (simplified)
            const aspectRatio = canvas.width / canvas.height;
            const isLandscape = aspectRatio > 1.2;
            const isPortrait = aspectRatio < 0.8;

            resolve({
                dominantColors,
                aspectRatio: aspectRatio.toFixed(2),
                orientation: isLandscape ? 'landscape' : isPortrait ? 'portrait' : 'square',
                summary: `${dominantColors.length} dominant colors, ${dominantColors[0]?.hex} primary, ${isLandscape ? 'wide' : isPortrait ? 'tall' : 'balanced'} composition`
            });
        };
        img.src = imageData;
    });
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Mock Google Lens API (replace with actual API call)
async function mockGoogleLensAPI(base64Image) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const descriptions = [
        "A vibrant landscape with rich colors and dynamic composition",
        "An artistic portrait capturing human emotion and expression",
        "A modern architectural scene with clean lines and geometric shapes",
        "A natural scene with organic forms and natural lighting",
        "An abstract composition with interesting textures and patterns"
    ];

    const tags = [
        ['landscape', 'nature', 'colors'],
        ['portrait', 'emotion', 'art'],
        ['architecture', 'modern', 'design'],
        ['nature', 'organic', 'lighting'],
        ['abstract', 'texture', 'patterns']
    ];

    const randomIndex = Math.floor(Math.random() * descriptions.length);

    return {
        description: descriptions[randomIndex],
        tags: tags[randomIndex]
    };
}

// Mock AI Story Generation (replace with actual AI API)
async function mockAIStoryGeneration(prompt) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const stories = [
        {
            story: "This image whispers tales of forgotten dreams and rediscovered passions. In its past, it was a simple moment captured in time, but now it speaks of transformation and growth. Looking to the future, it promises new beginnings and creative journeys yet to unfold. The colors dance like memories, each hue telling a chapter of an unfinished story.",
            analysis: "The composition suggests a journey of self-discovery, with colors representing emotional states and shapes symbolizing life's transitions. Subconsciously, it evokes feelings of nostalgia mixed with hope, reminding us that every ending is just another beginning.",
            tags: ['transformation', 'hope', 'memory']
        },
        {
            story: "Born from a moment of inspiration, this image has evolved from a mere snapshot to a symbol of artistic expression. Its present form captures the essence of creativity, while its future holds endless possibilities for interpretation and inspiration. The interplay of light and shadow creates a narrative of illumination and discovery.",
            analysis: "The lighting and shadows create a narrative of light overcoming darkness, symbolizing personal growth and enlightenment. The subconscious mind sees patterns that tell stories of human resilience and artistic passion, where every shadow holds the promise of light.",
            tags: ['inspiration', 'creativity', 'growth']
        }
    ];

    return stories[Math.floor(Math.random() * stories.length)];
}

// Simulate Web Scraping (in production, use actual scraping service)
async function simulateWebScraping(description, tags) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock enhanced descriptions based on tags
    const enhancements = {
        landscape: "This breathtaking landscape showcases nature's majesty, with rolling hills and vibrant skies that inspire wanderlust and contemplation.",
        portrait: "This compelling portrait captures the essence of human emotion, with expressive eyes and subtle lighting that reveal the subject's inner world.",
        architecture: "This striking architectural composition features clean lines and innovative design, representing human ingenuity and modern aesthetics.",
        nature: "This organic natural scene demonstrates the beauty of untouched wilderness, with intricate details and harmonious color palettes.",
        abstract: "This abstract composition explores the boundaries of visual language, using texture and form to create emotional resonance."
    };

    const primaryTag = tags[0];
    const enhancement = enhancements[primaryTag] || "This image captures a unique moment with artistic vision and creative expression.";

    return `${description}. ${enhancement}`;
}

// Generate dynamic title
function generateTitle(colorAnalysis, lensResult) {
    const colorWords = ['Vibrant', 'Serene', 'Dramatic', 'Harmonious', 'Bold'];
    const subjectWords = ['Composition', 'Moment', 'Vision', 'Scene', 'Study'];

    const colorWord = colorWords[Math.floor(Math.random() * colorWords.length)];
    const subjectWord = subjectWords[Math.floor(Math.random() * subjectWords.length)];

    return `${colorWord} ${subjectWord}`;
}

// Progress Modal Functions
function showProgressModal() {
    const modal = document.getElementById('progressModal');
    if (modal) {
        modal.style.display = 'block';
        updateProgress(0, 'Initializing analysis...');
    }
}

function hideProgressModal() {
    const modal = document.getElementById('progressModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function updateProgress(percentage, text) {
    const fill = document.getElementById('progressFill');
    const textEl = document.getElementById('progressText');

    if (fill) fill.style.width = `${percentage}%`;
    if (textEl) textEl.textContent = text;
}

// Feed Functions
function loadUserData() {
    if (!currentUser) return;

    // Update sidebar
    document.getElementById('userAvatar').src = currentUser.avatar;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userBio').textContent = currentUser.bio || 'No bio yet';
    document.getElementById('postsCount').textContent = currentUser.posts.length;
    document.getElementById('followersCount').textContent = currentUser.followers.length;
    document.getElementById('followingCount').textContent = currentUser.following.length;

    // Update post avatar
    document.getElementById('currentUserAvatar').src = currentUser.avatar;

    // Render notifications UI for current user
    renderNotifications();
}

async async function createPost(text, imageData = null, aiAnalysis = null) {
    const postBtn = document.getElementById('postBtn');
    if (postBtn) {
        postBtn.disabled = true;
        postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    }

    try {
        const auth = window.authService;
        const currentUser = auth.getCurrentUser();
        
        if (!currentUser) {
            showNotification('Please log in to create a post', 'error');
            return null;
        }

        // Validate input
        if (!text && !imageData) {
            showNotification('Post cannot be empty', 'error');
            return null;
        }

        const post = {
            id: Date.now().toString(),
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            text: text,
            image: imageData,
            aiAnalysis: aiAnalysis,
            timestamp: new Date().toISOString(),
            likes: [],
            comments: [],
            tags: extractTags(text),
            shares: 0,
            pinned: false,
            pinnedBy: null,
            pinnedAt: null,
            saved: []
        };

    posts.unshift(post);
    currentUser.posts.unshift(post.id);
    localStorage.setItem('myidea_posts', JSON.stringify(posts));
    localStorage.setItem('myidea_users', JSON.stringify(users));

    return post;
}

function extractTags(text) {
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
        tags.push(match[1]);
    }
    return tags;
}

function renderPosts() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    posts.forEach(post => {
        const postElement = createPostElement(post);
        container.appendChild(postElement);
    });
    // Observe posts for optimized scroll effects
    observePosts();
}

function createPostElement(post) {
    // Validate input
    if (!post || !post.id || !post.userId || !post.userName) {
        console.error('Invalid post data:', post);
        return document.createElement('div'); // Return empty div
    }

    const postDiv = document.createElement('div');
    postDiv.className = 'post-card';
    postDiv.setAttribute('data-post-id', SecurityUtils.sanitizeInput(post.id));

    // Validate user session before rendering interactive elements
    const isAuthenticated = SecurityUtils.validateSession();
    const currentUser = SecurityUtils.getSecureSession()?.user;
    const isOwner = currentUser && post.userId === currentUser.id;

    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.userAvatar}" alt="${post.userName}" class="post-user-avatar" onclick="viewProfile('${post.userId}')">
            <div class="post-user-info">
                <h4 onclick="viewProfile('${post.userId}')" style="cursor:pointer">${post.userName}</h4>
                <p>${formatTimestamp(post.timestamp)}</p>
                ${post.pinned ? `<span class="pin-badge">Pinned</span>` : ''}
            </div>
        </div>
        <div class="post-content">
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image" onclick="openPostModal('${post.id}')">` : ''}
            <p class="post-text">${post.text}</p>
            ${post.aiAnalysis ? `
                <div class="ai-analysis">
                    <div class="ai-title">${post.aiAnalysis.title}</div>
                    <div class="ai-description">${post.aiAnalysis.description}</div>
                    <div class="ai-story">${post.aiAnalysis.story}</div>
                    <div class="ai-tags">${post.aiAnalysis.tags.map(tag => `<span class="ai-tag">#${tag}</span>`).join('')}</div>
                </div>
            ` : ''}
            ${post.tags.length > 0 ? `<div class="post-tags">${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>` : ''}
        </div>
        <div class="post-actions">
            <button class="action-btn" onclick="toggleLike('${post.id}')">
                <i class="fas fa-heart"></i> ${post.likes.length}
            </button>
            <button class="action-btn" onclick="toggleCommentBox('${post.id}')">
                <i class="fas fa-comment"></i> ${post.comments.length}
            </button>
            <button class="action-btn" onclick="sharePost('${post.id}')">
                <i class="fas fa-share"></i> ${post.shares || 0}
            </button>
            <button class="action-btn" onclick="togglePin('${post.id}')" title="Pin/Unpin post">
                <i class="fas fa-thumbtack"></i>
            </button>
        </div>
    `;
    // Click on card (except action buttons) opens modal
    postDiv.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn') || e.target.closest('.remove-image')) return;
        openPostModal(post.id);
    });
    return postDiv;
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function toggleLike(postId) {
    const auth = window.authService;
    const currentUser = auth.getCurrentUser();
    
    if (!currentUser) {
        showNotification('Please log in to like posts', 'error');
        return;
    }

    // Get posts from storage
    const posts = JSON.parse(localStorage.getItem('myidea_posts') || '[]');
    const post = posts.find(p => p.id === postId);
    
    if (!post) {
        showNotification('Post not found', 'error');
        return;
    }

    // Initialize likes array if not exists
    if (!Array.isArray(post.likes)) {
        post.likes = [];
    }

    // Check if user already liked the post
    const userIndex = post.likes.indexOf(currentUser.id);
    if (userIndex === -1) {
        post.likes.push(currentUser.id);
    } else {
        post.likes.splice(userIndex, 1);
    }

    // Save changes
    localStorage.setItem('myidea_posts', JSON.stringify(posts));
    
    // Update UI
        const auth = window.authService;
        const currentUser = auth.getCurrentUser();
    
        if (!currentUser) {
    if (likeBtn) {
        const likeCount = likeBtn.querySelector('span');
        if (likeCount) likeCount.textContent = post.likes.length;
        likeBtn.classList.toggle('active', post.likes.includes(currentUser.id));
    }

    // Ensure comments array and shape
    post.comments = post.comments || [];


        // Get posts from storage
        const posts = JSON.parse(localStorage.getItem('myidea_posts') || '[]');
    const comment = createComment(text);
        // Find post to comment on
        const post = posts.find(p => p.id === postId);
    input.value = '';

    // Refresh modal to show threaded comments
    openPostModal(postId);

    // Notify post owner if someone else commented on their post
    if (post.userId !== currentUser.id) {
        addNotificationForUser(post.userId, {
            id: Date.now().toString(),
            type: 'comment',
            text: `${currentUser.name} commented: ${comment.text.substring(0, 80)}`,
            postId: post.id,
            fromUserId: currentUser.id,
            timestamp: new Date().toISOString(),
            read: false
        });
    }
    const post = posts.find(p => p.id === postId);

        // Initialize comments array if it doesn't exist
        if (!post.comments) {
            post.comments = [];
        }

        // Create new comment
        const comment = {
            id: Date.now().toString(),
            postId: postId,
            userId: currentUser.id,
            username: currentUser.username,
            text: commentText,
            timestamp: new Date().toISOString(),
        };

        // Add comment to post
        post.comments.push(comment);

        // Update storage
        localStorage.setItem('myidea_posts', JSON.stringify(posts));

        // Clear input
        commentInput.value = '';

        // Update UI
        renderComments(postId);
        showNotification('Comment added successfully', 'success');
// Comment model helper to ensure consistent shape and replies array
function createComment(text) {
    return {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        text: text,
        timestamp: new Date().toISOString(),
        replies: [] // nested replies (tree structure)
    };
}

// Add a reply under a specific comment (nested threaded reply)
function addReply(postId, commentId, text) {
    if (!text) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Normalize comments/replies
    post.comments = post.comments || [];

    // Find target comment (depth-first search)
    const target = findCommentById(post.comments, commentId);
    if (!target) return;

    const reply = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        text: text,
        timestamp: new Date().toISOString(),
        replies: []
    };

    target.replies = target.replies || [];
    target.replies.push(reply);

    localStorage.setItem('myidea_posts', JSON.stringify(posts));

    // Refresh modal to show updated tree
    openPostModal(postId);

    // Notify original commenter and post owner (if different)
    if (target.userId !== currentUser.id) {
        addNotificationForUser(target.userId, {
            id: Date.now().toString(),
            type: 'reply',
            text: `${currentUser.name} replied: ${reply.text.substring(0,80)}`,
            postId: post.id,
            fromUserId: currentUser.id,
            timestamp: new Date().toISOString(),
            read: false
        });
    }
    if (post.userId !== currentUser.id && post.userId !== target.userId) {
        addNotificationForUser(post.userId, {
            id: Date.now().toString(),
            type: 'reply',
            text: `${currentUser.name} replied in a thread on your post`,
            postId: post.id,
            fromUserId: currentUser.id,
            timestamp: new Date().toISOString(),
            read: false
        });
    }
}

// Depth-first search to find a comment by id in a tree of comments
function findCommentById(commentsArray, id) {
    for (let i = 0; i < commentsArray.length; i++) {
        const c = commentsArray[i];
        if (c.id === id) return c;
        if (c.replies && c.replies.length) {
            const found = findCommentById(c.replies, id);
            if (found) return found;
        }
    }
    return null;
}

// Toggle a reply box directly under a comment in the modal
function toggleReplyBox(postId, commentId) {
    const container = document.getElementById('commentsList');
    if (!container) return;

    // If a reply box already exists for this comment, remove it
    const existing = container.querySelector(`.reply-box[data-for='${commentId}']`);
    if (existing) { existing.remove(); return; }

    // Find the comment element
    const commentEl = container.querySelector(`.comment[data-comment-id='${commentId}']`);
    if (!commentEl) return;

    const box = document.createElement('div');
    box.className = 'reply-box';
    box.dataset.for = commentId;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Write a reply... (Enter to post)';
    input.maxLength = 300;
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            if (val) addReply(postId, commentId, val);
        }
    });

    const send = document.createElement('button');
    send.textContent = 'Reply';
    send.addEventListener('click', function() {
        const val = input.value.trim();
        if (val) addReply(postId, commentId, val);
    });

    box.appendChild(input);
    box.appendChild(send);

    commentEl.appendChild(box);
    input.focus();
}

// Render threaded comments as an indented tree with simple time-graph markers
function renderThreadedComments(post, containerEl) {
    containerEl.innerHTML = '';
    if (!post.comments || post.comments.length === 0) {
        containerEl.innerHTML = '<p style="color:var(--text-muted);">No comments yet</p>';
        return;
    }

    // Sort top-level comments chronologically (oldest first for thread view)
    const sorted = post.comments.slice().sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

    const timeline = document.createElement('div');
    timeline.className = 'comments-timeline';
    containerEl.appendChild(timeline);

    sorted.forEach(comment => {
        const node = renderCommentNode(comment, post.id, 0);
        timeline.appendChild(node);
    });
}

function renderCommentNode(comment, postId, depth) {
    // Container for a single comment (and its replies)
    const wrapper = document.createElement('div');
    wrapper.className = 'comment';
    wrapper.dataset.commentId = comment.id;
    wrapper.style.marginLeft = `${depth * 18}px`;
    wrapper.dataset.depth = depth;
    // mark whether this node is a top-level comment or a reply (for marker color)
    wrapper.dataset.event = depth && depth > 0 ? 'reply' : 'comment';
    // ensure space for timeline marker
    wrapper.style.position = 'relative';
    wrapper.style.paddingLeft = '18px';

    // Add a timeline marker (dot + vertical line) to visualize time-graph
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.innerHTML = `<span class="timeline-dot"></span><span class="timeline-line"></span>`;
    wrapper.appendChild(marker);

    const head = document.createElement('div');
    head.className = 'comment-head';
    head.innerHTML = `<strong>${escapeHtml(comment.userName)}</strong> <span class="comment-time">${formatTimestamp(comment.timestamp)}</span>`;

    const body = document.createElement('div');
    body.className = 'comment-body';
    body.textContent = comment.text;

    const actions = document.createElement('div');
    actions.className = 'comment-actions';
    const replyBtn = document.createElement('button');
    replyBtn.className = 'link-btn';
    replyBtn.textContent = 'Reply';
    replyBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleReplyBox(postId, comment.id);
    });
    actions.appendChild(replyBtn);

    wrapper.appendChild(head);
    wrapper.appendChild(body);
    wrapper.appendChild(actions);

    // If replies exist, render them recursively (sorted by time)
    if (comment.replies && comment.replies.length) {
        const repliesContainer = document.createElement('div');
        repliesContainer.className = 'replies-container';
        const sortedReplies = comment.replies.slice().sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        sortedReplies.forEach(r => {
            repliesContainer.appendChild(renderCommentNode(r, postId, depth + 1));
        });
        wrapper.appendChild(repliesContainer);
    }

    return wrapper;
}

// Simple HTML escaper to avoid injection when rendering usernames
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>\"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; });
}
function openPostModal(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const modal = document.getElementById('postModal');
    const content = document.getElementById('modalPostContent');

    content.innerHTML = `
        <div class="post-card">
            <div class="post-header">
                <img src="${post.userAvatar}" alt="${post.userName}" class="post-user-avatar">
                <div class="post-user-info">
                    <h4>${post.userName}</h4>
                    <p>${formatTimestamp(post.timestamp)}</p>
                    ${post.pinned ? `<span class="pin-badge">Pinned</span>` : ''}
                </div>
            </div>
            <div class="post-content">
                ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
                <p class="post-text">${post.text}</p>
                ${post.aiAnalysis ? `
                    <div class="ai-analysis">
                        <div class="ai-title">${post.aiAnalysis.title}</div>
                        <div class="ai-description">${post.aiAnalysis.description}</div>
                        <div class="ai-story">${post.aiAnalysis.story}</div>
                        <div class="ai-tags">${post.aiAnalysis.tags.map(tag => `<span class="ai-tag">#${tag}</span>`).join('')}</div>
                    </div>
                ` : ''}
                ${post.tags && post.tags.length > 0 ? `<div class="post-tags">${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>` : ''}
            </div>
            <div class="post-actions">
                ${isAuthenticated ? `
                    <button class="action-btn" onclick="if(SecurityUtils.validateSession() && SecurityUtils.rateLimit('like_${post.id}', 5, 5000)) toggleLike('${SecurityUtils.sanitizeInput(post.id)}')" data-likes="${post.likes.length}">
                        <i class="fas fa-heart ${post.likes.includes(currentUser?.id) ? 'active' : ''}"></i> 
                        <span>${post.likes.length}</span>
                    </button>
                    <button class="action-btn" onclick="if(SecurityUtils.validateSession()) toggleCommentBox('${SecurityUtils.sanitizeInput(post.id)}')">
                        <i class="fas fa-comment"></i> 
                        <span>${post.comments ? post.comments.length : 0}</span>
                    </button>
                    <button class="action-btn" onclick="if(SecurityUtils.validateSession() && SecurityUtils.rateLimit('share_${post.id}', 3, 10000)) sharePost('${SecurityUtils.sanitizeInput(post.id)}')">
                        <i class="fas fa-share"></i> 
                        <span>${post.shares || 0}</span>
                    </button>
                    ${isOwner ? `
                        <button class="action-btn" onclick="if(SecurityUtils.validateSession()) togglePin('${SecurityUtils.sanitizeInput(post.id)}')" title="Pin/Unpin post">
                            <i class="fas fa-thumbtack ${post.pinned ? 'active' : ''}"></i>
                        </button>
                    ` : ''}
                ` : `
                    <button class="action-btn" onclick="window.location.href='login.html'">
                        <i class="fas fa-heart"></i> ${post.likes.length}
                    </button>
                    <button class="action-btn" onclick="window.location.href='login.html'">
                        <i class="fas fa-comment"></i> ${post.comments ? post.comments.length : 0}
                    </button>
                `}
            </div>
        </div>
        <div class="comments-section">
            <h4>Comments</h4>
            <div id="commentsList"></div>
            <div class="add-comment">
                <input type="text" id="commentInput" placeholder="Add a comment..." maxlength="200">
                <button id="postCommentBtn">Post</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';

    // Wire the comment post button and render threaded comments
    const commentsListEl = document.getElementById('commentsList');
    renderThreadedComments(post, commentsListEl);

    const postBtn = document.getElementById('postCommentBtn');
    if (postBtn) {
        postBtn.addEventListener('click', function() {
            const input = document.getElementById('commentInput');
            const text = input.value.trim();
            if (text) addComment(post.id);
        });
    }
}

function closeModal() {
    document.getElementById('postModal').style.display = 'none';
}

function addComment(postId) {
    const auth = window.authService;
    const currentUser = auth.getCurrentUser();
    
    if (!currentUser) {
        showNotification('Please log in to comment', 'error');
        return;
    }

    // Rate limiting
    if (!SecurityUtils.rateLimit(`comment_${postId}`, 3, 60000)) {
        showNotification('Please wait before adding more comments', 'error');
        return;
    }

    // Get posts from storage
    const posts = JSON.parse(localStorage.getItem('myidea_posts') || '[]');

    const input = document.getElementById('commentInput');
    const text = input.value.trim();

    // Validate input
    if (!SecurityUtils.validateInput(text, {
        required: true,
        minLength: 1,
        maxLength: 1000,
        noScript: true,
        sanitize: true,
        noProfanity: true
    })) {
        showNotification('Invalid comment text', 'error');
        return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) {
        showNotification('Post not found', 'error');
        return;
    }

    // Normalize
    post.comments = post.comments || [];

    const comment = createComment(text);
    post.comments.push(comment);
    localStorage.setItem('myidea_posts', JSON.stringify(posts));
    input.value = '';

    // Refresh modal to show threaded comments
    openPostModal(postId);

    // Notify post owner if someone else commented on their post
    if (post.userId !== currentUser.id) {
        addNotificationForUser(post.userId, {
            id: Date.now().toString(),
            type: 'comment',
            text: `${currentUser.name} commented: ${comment.text.substring(0, 80)}`,
            postId: post.id,
            fromUserId: currentUser.id,
            timestamp: new Date().toISOString(),
            read: false
        });
    }
}

function togglePin(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Only the author can pin/unpin their post
    if (!currentUser || post.userId !== currentUser.id) {
        alert('Only the post author can pin or unpin this post.');
        return;
    }

    post.pinned = !post.pinned;
    post.pinnedBy = post.pinned ? currentUser.id : null;
    post.pinnedAt = post.pinned ? new Date().toISOString() : null;

    localStorage.setItem('myidea_posts', JSON.stringify(posts));
    renderPosts();
    // If on profile page, refresh profile posts to reflect pinned ordering
    if (window.location.pathname.includes('profile.html')) loadUserPosts();
}

function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const doAfterShare = () => {
        post.shares = (post.shares || 0) + 1;
        localStorage.setItem('myidea_posts', JSON.stringify(posts));
        renderPosts();
        trackEngagement('share', postId, {});
    };

    if (navigator.share) {
        navigator.share({
            title: `Post by ${post.userName}`,
            text: post.text,
            url: window.location.href
        }).then(() => doAfterShare()).catch(() => {/* ignore */});
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${post.text} - ${window.location.href}`).then(() => {
            alert('Link copied to clipboard!');
            doAfterShare();
        }).catch(() => {
            alert('Could not copy link');
        });
    }
}

// Multi-Image Upload with AI Analysis
async function handleImageUpload(event) {
    // Validate session and rate limiting
    if (!SecurityUtils.validateSession()) {
        showNotification('Please log in to upload images', 'error');
        return;
    }
    if (!SecurityUtils.rateLimit('image_upload', 5, 60000)) {
        showNotification('Too many upload attempts. Please try again later.', 'error');
        return;
    }

    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validate each file
    const validFiles = files.filter(file => {
        // Check file type
        if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
            showNotification(`Invalid file type: ${file.name}. Only JPEG, PNG, GIF and WEBP allowed.`, 'error');
            return false;
        }
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showNotification(`File too large: ${file.name}. Maximum size is 5MB.`, 'error');
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) {
        showNotification('No valid files to upload', 'error');
        return;
    }

    selectedImages = [];
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    // Read UI options
    const formatSelect = document.getElementById('imageFormat');
    const maxDimSelect = document.getElementById('imageMaxDim');
    const autoResize = document.getElementById('autoResize')?.checked;
    const mimeType = formatSelect ? formatSelect.value : 'image/jpeg';
    const maxDim = maxDimSelect ? parseInt(maxDimSelect.value, 10) || 0 : 0;

    for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        reader.onload = async function(e) {
            let imageData = e.target.result;

            // Validate and optionally resize/convert
            try {
                if (autoResize && maxDim > 0) {
                    imageData = await resizeImage(imageData, maxDim, mimeType, 0.85);
                } else if (mimeType && mimeType !== file.type) {
                    imageData = await convertImageFormat(imageData, mimeType, 0.9);
                }
            } catch (err) {
                console.warn('Image resize/convert failed, using original', err);
            }

            selectedImages.push(imageData);

            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="${imageData}" alt="Preview ${i + 1}">
                <button class="remove-image" onclick="removeImage(${i})">&times;</button>
            `;
            preview.appendChild(imageItem);
            updatePostButton();
        };
        reader.readAsDataURL(file);
    }

    // Auto-analyze first image for AI content
    if (selectedImages.length > 0) {
        const aiAnalysis = await analyzeImageWithAI(selectedImages[0]);

        // Update preview with AI results
        const aiResults = document.createElement('div');
        aiResults.className = 'ai-results';
        aiResults.innerHTML = `
            <div class="ai-title">${aiAnalysis.title}</div>
            <div class="ai-description">${aiAnalysis.description}</div>
            <div class="ai-story">${aiAnalysis.story}</div>
            <div class="ai-tags">${aiAnalysis.tags.map(tag => `<span class="ai-tag">#${tag}</span>`).join('')}</div>
        `;
        preview.appendChild(aiResults);

        // Auto-fill post text if empty
        const textarea = document.getElementById('postText');
        if (!textarea.value.trim()) {
            textarea.value = `${aiAnalysis.title}\n\n${aiAnalysis.description}\n\n${aiAnalysis.story}`;
            updatePostButton();
        }

        // Store AI analysis for post creation
        preview.dataset.aiAnalysis = JSON.stringify(aiAnalysis);
    }
}

function removeImage(index) {
    selectedImages.splice(index, 1);
    const preview = document.getElementById('imagePreview');
    const imageItems = preview.querySelectorAll('.image-item');
    imageItems[index].remove();

    // Re-index remaining images
    const remainingItems = preview.querySelectorAll('.image-item');
    remainingItems.forEach((item, i) => {
        item.querySelector('.remove-image').onclick = () => removeImage(i);
    });

    updatePostButton();
}

// Image helpers: resize and convert formats
function resizeImage(dataUrl, maxDim, mimeType = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            let { width, height } = img;
            if (!maxDim || (width <= maxDim && height <= maxDim)) {
                // No need to resize, but maybe convert
                if (mimeType === 'image/png' || mimeType === 'image/jpeg' || mimeType === 'image/webp') {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    try {
                        resolve(canvas.toDataURL(mimeType, quality));
                    } catch (err) {
                        resolve(dataUrl);
                    }
                } else {
                    resolve(dataUrl);
                }
                return;
            }

            // Determine new size preserving aspect ratio
            if (width > height) {
                const ratio = maxDim / width;
                width = maxDim;
                height = Math.round(height * ratio);
            } else {
                const ratio = maxDim / height;
                height = maxDim;
                width = Math.round(width * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            try {
                resolve(canvas.toDataURL(mimeType, quality));
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function convertImageFormat(dataUrl, mimeType = 'image/jpeg', quality = 0.9) {
    // Simple wrapper that draws to canvas and exports in desired format
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                resolve(canvas.toDataURL(mimeType, quality));
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// Draft management
function saveDraft() {
    try {
        const text = document.getElementById('postText').value;
        const image = selectedImages.length > 0 ? selectedImages[0] : null;
        const draft = { text, image, savedAt: new Date().toISOString() };
        if (!DRAFT_KEY) DRAFT_KEY = 'myidea_draft_guest';
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        showNotification('Draft saved', 'success');
    } catch (err) {
        console.error('Save draft failed', err);
        showNotification('Failed to save draft', 'error');
    }
}

function loadDraft() {
    try {
        if (!DRAFT_KEY) DRAFT_KEY = currentUser ? `myidea_draft_${currentUser.id}` : 'myidea_draft_guest';
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (draft.text) document.getElementById('postText').value = draft.text;
        if (draft.image) {
            selectedImages = [draft.image];
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<div class="image-item"><img src="${draft.image}" alt="Draft"><button class="remove-image" onclick="removeImage(0)">&times;</button></div>`;
            updatePostButton();
        }
        if (draft.text || draft.image) showNotification('Loaded saved draft', 'info');
    } catch (err) {
        console.error('Load draft failed', err);
    }
}

// Auth Form Handlers
function initLoginPage() {
    // Check authentication with secure session
    const savedUser = getSecureSession();
    if (savedUser) {
        currentUser = savedUser;
        localStorage.setItem('myidea_currentUser', JSON.stringify(savedUser));
    }

    // Tab switching
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginTab && registerTab) {
        loginTab.addEventListener('click', function() {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
            hideErrors();
        });

        registerTab.addEventListener('click', function() {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.classList.add('active');
            loginForm.classList.remove('active');
            hideErrors();
        });
    }

    // Handle cookie consent
    const acceptCookies = document.getElementById('acceptCookies');
    const rememberSession = document.getElementById('rememberSession');

    if (acceptCookies && rememberSession) {
        acceptCookies.addEventListener('change', () => {
            if (!acceptCookies.checked) {
                rememberSession.checked = false;
            }
        });

        rememberSession.addEventListener('change', () => {
            if (rememberSession.checked && !acceptCookies.checked) {
                acceptCookies.checked = true;
            }
        });
    }

    // Login form submission
    const loginFormElement = document.getElementById('loginForm');
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            hideErrors();

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            let isValid = true;

            if (!email) {
                showError('loginEmailError', 'Email is required');
                isValid = false;
            } else if (!validateEmail(email)) {
                showError('loginEmailError', 'Please enter a valid email');
                isValid = false;
            }

            if (!password) {
                showError('loginPasswordError', 'Password is required');
                isValid = false;
            }

            if (isValid) {
                if (!login(email, password)) {
                    showError('loginPasswordError', 'Invalid email or password');
                }
            }
        });
    }

    // Register form submission
    const registerFormElement = document.getElementById('registerForm');
    if (registerFormElement) {
        registerFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            hideErrors();

            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;

            let isValid = true;

            if (!name) {
                showError('registerNameError', 'Full name is required');
                isValid = false;
            }

            if (!email) {
                showError('registerEmailError', 'Email is required');
                isValid = false;
            } else if (!validateEmail(email)) {
                showError('registerEmailError', 'Please enter a valid email');
                isValid = false;
            }

            if (!password) {
                showError('registerPasswordError', 'Password is required');
                isValid = false;
            } else if (!validatePassword(password)) {
                showError('registerPasswordError', 'Password must be at least 8 characters');
                isValid = false;
            }

            if (password !== confirmPassword) {
                showError('registerConfirmPasswordError', 'Passwords do not match');
                isValid = false;
            }

            if (isValid) {
                if (register(name, email, password)) {
                    // Auto-login after registration
                    login(email, password);
                } else {
                    showError('registerEmailError', 'Email already exists');
                }
            }
        });
    }
}

function initFeedPage() {
    if (currentUser) {
        loadUserData();
        renderPosts();
        updateThemeIcon();
    }

    // Prepare draft storage key for current user and load any saved draft
    DRAFT_KEY = currentUser ? `myidea_draft_${currentUser.id}` : 'myidea_draft_guest';
    loadDraft();

    // Feed page event listeners
    const postText = document.getElementById('postText');
    const postBtn = document.getElementById('postBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const imageInput = document.getElementById('imageInput');
    const themeToggle = document.getElementById('themeToggle');
    const logoutBtn = document.getElementById('logoutBtn');
    const closeModalBtn = document.querySelector('.close-modal');

    if (postText) {
        postText.addEventListener('input', updatePostButton);
    }

    if (postBtn) {
        postBtn.addEventListener('click', function() {
            const text = postText.value.trim();
            const imageData = selectedImages.length > 0 ? selectedImages[0] : null; // Use first image for now
            const aiAnalysis = document.getElementById('imagePreview').dataset.aiAnalysis ?
                JSON.parse(document.getElementById('imagePreview').dataset.aiAnalysis) : null;

            if (text || imageData) {
                createPost(text, imageData, aiAnalysis);
                postText.value = '';
                selectedImages = [];
                document.getElementById('imagePreview').innerHTML = '';
                document.getElementById('imagePreview').style.display = 'none';
                delete document.getElementById('imagePreview').dataset.aiAnalysis;
                updatePostButton();
                renderPosts();
                // Remove saved draft after posting
                if (DRAFT_KEY) localStorage.removeItem(DRAFT_KEY);
            }
        });
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            imageInput.click();
        });
    }

    if (imageInput) {
        imageInput.addEventListener('change', handleImageUpload);
    }

    // Wire save draft button
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', saveDraft);

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('myidea_currentUser');
            localStorage.removeItem('myidea_session');
            window.location.href = 'login.html';
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('postModal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Notifications UI wiring
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const markAllBtn = document.getElementById('markAllRead');
    const closeNotifBtn = document.getElementById('closeNotif');

    if (notifBtn) {
        notifBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!notifDropdown) return;
            const isOpen = notifDropdown.style.display === 'block';
            if (isOpen) {
                notifDropdown.style.display = 'none';
            } else {
                renderNotifications();
                notifDropdown.style.display = 'block';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(ev) {
            if (notifDropdown && !notifDropdown.contains(ev.target) && ev.target !== notifBtn) {
                notifDropdown.style.display = 'none';
            }
        });
    }

    if (markAllBtn) {
        markAllBtn.addEventListener('click', function() {
            markAllNotificationsRead();
            renderNotifications();
        });
    }

    if (closeNotifBtn) {
        closeNotifBtn.addEventListener('click', function() {
            if (notifDropdown) notifDropdown.style.display = 'none';
        });
    }

    // Initial render
    renderNotifications();
}

function initProfilePage() {
    if (window.location.pathname.includes('profile.html')) {
        loadProfile();

        // Event listeners
        document.getElementById('editProfileBtn').addEventListener('click', openEditProfileModal);
        document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
        document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
        document.getElementById('saveSettings').addEventListener('click', saveSettings);

        // Avatar edit flow: trigger button and file input handling
        const triggerBtn = document.getElementById('triggerEditAvatar');
        const editAvatarInput = document.getElementById('editAvatar');
        const avatarPreview = document.getElementById('avatarPreview');

        if (triggerBtn && editAvatarInput) {
            triggerBtn.addEventListener('click', function() { editAvatarInput.click(); });

            editAvatarInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (!file) return;

                // Reset any previous pending avatar
                pendingAvatarDataURL = null;
                avatarPreview.style.display = 'none';
                avatarPreview.innerHTML = '';

                // Handle short videos (<= 3s)
                if (file.type.startsWith('video/')) {
                    const url = URL.createObjectURL(file);
                    const v = document.createElement('video');
                    v.preload = 'metadata';
                    v.src = url;
                    v.onloadedmetadata = function() {
                        URL.revokeObjectURL(url);
                        const duration = v.duration || 0;
                        if (duration > 3.1) {
                            alert('Please select a video shorter than or equal to 3 seconds.');
                            editAvatarInput.value = '';
                            return;
                        }

                        // Read file as data URL for persistence/preview
                        const reader = new FileReader();
                        reader.onload = function(ev) {
                            pendingAvatarDataURL = ev.target.result;
                            avatarPreview.style.display = 'block';
                            avatarPreview.innerHTML = `<video class="preview-avatar-video" src="${pendingAvatarDataURL}" autoplay loop muted playsinline></video>`;
                        };
                        reader.onerror = function() {
                            alert('Could not read video file.');
                            editAvatarInput.value = '';
                        };
                        reader.readAsDataURL(file);
                    };
                    v.onerror = function() {
                        URL.revokeObjectURL(url);
                        alert('Could not load video metadata.');
                        editAvatarInput.value = '';
                    };

                // Handle images/GIFs
                } else if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(ev) {
                        pendingAvatarDataURL = ev.target.result;
                        avatarPreview.style.display = 'block';
                        avatarPreview.innerHTML = `<img class="preview-avatar" src="${pendingAvatarDataURL}" alt="Avatar preview">`;
                    };
                    reader.onerror = function() {
                        alert('Could not read image file.');
                        editAvatarInput.value = '';
                    };
                    reader.readAsDataURL(file);
                } else {
                    alert('Unsupported file type. Please choose an image, GIF, or short video (<=3s).');
                    editAvatarInput.value = '';
                }
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                switchTab(this.dataset.tab);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target.classList.contains('modal')) {
                closeModal();
            }
        });
    }
}

function updatePostButton() {
    const postText = document.getElementById('postText');
    const postBtn = document.getElementById('postBtn');
    const imagePreview = document.getElementById('imagePreview');

    if (postBtn) {
        const hasText = postText && postText.value.trim().length > 0;
        const hasImage = imagePreview && imagePreview.querySelector('img');
        postBtn.disabled = !hasText && !hasImage;
    }
}

// Profile Management Functions
function loadProfile() {
    // Allow viewing another user's profile via ?userId={id}
    const params = new URLSearchParams(window.location.search);
    const viewUserId = params.get('userId');

    const sessionUser = getCurrentUser();
    let profileUser = null;

    if (viewUserId) {
        // try to find the requested user
        profileUser = users.find(u => u.id === viewUserId);
        if (!profileUser) {
            // if not found, show message and fallback to current user if available
            if (!sessionUser) {
                document.getElementById('profileAvatarContainer').innerHTML = '<p style="color:var(--text-muted)">User not found</p>';
                return;
            }
            profileUser = sessionUser;
        }
    } else {
        if (!sessionUser) {
            window.location.href = 'login.html';
            return;
        }
        profileUser = sessionUser;
    }

    const profileAvatarContainer = document.getElementById('profileAvatarContainer');
    const profileName = document.getElementById('profileName');
    const profileBio = document.getElementById('profileBio');

    // Render avatar: could be image/gif or video data URL
    if (profileUser.avatar && profileUser.avatar.startsWith('data:video')) {
        profileAvatarContainer.innerHTML = `<video id="profileAvatarVideo" class="profile-avatar" autoplay loop muted playsinline src="${profileUser.avatar}"></video>`;
    } else {
        const imgSrc = profileUser.avatar || 'https://via.placeholder.com/120x120?text=User';
        profileAvatarContainer.innerHTML = `<img id="profileAvatar" src="${imgSrc}" alt="Profile Avatar" class="profile-avatar" onclick="viewProfile('${profileUser.id}')">`;
    }

    profileName.textContent = profileUser.name;
    profileBio.textContent = profileUser.bio || 'No bio yet';

    // Load user posts (show posts for profileUser)
    loadUserPosts(profileUser.id);
    updateProfileStats(profileUser.id);

    // Show/hide edit buttons depending on whether the logged-in session user is viewing their own profile
    const isOwn = sessionUser && sessionUser.id === profileUser.id;
    const editBtn = document.getElementById('editProfileBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    if (editBtn) editBtn.style.display = isOwn ? 'inline-flex' : 'none';
    if (settingsBtn) settingsBtn.style.display = isOwn ? 'inline-flex' : 'none';
    // If viewing someone else, show follow/unfollow controls
    const followContainer = document.getElementById('profileFollowContainer');
    if (followContainer) {
        followContainer.innerHTML = '';
        if (!isOwn && sessionUser) {
            const isFollowing = sessionUser.following && sessionUser.following.includes(profileUser.id);
            const btn = document.createElement('button');
            btn.className = 'btn-primary';
            btn.textContent = isFollowing ? 'Unfollow' : 'Follow';
            btn.addEventListener('click', function() {
                if (isFollowing) { unfollowUser(profileUser.id); btn.textContent = 'Follow'; }
                else { followUser(profileUser.id); btn.textContent = 'Unfollow'; }
            });
            followContainer.appendChild(btn);
        }
    }
}

function loadUserPosts() {
    const currentUser = getCurrentUser();
    const posts = getPosts();
    // optional userId to view someone else's posts
    const userId = arguments.length > 0 && arguments[0] ? arguments[0] : (currentUser ? currentUser.id : null);
    if (!userId) return;
    const userPosts = posts.filter(post => post.userId === userId);

    const userPostsContainer = document.getElementById('userPosts');
    userPostsContainer.innerHTML = '';

    if (userPosts.length === 0) {
        userPostsContainer.innerHTML = '<p style="text-align center; color: var(--text-muted); padding: 40px;">No posts yet</p>';
        return;
    }

    // Show pinned posts first
    userPosts.sort((a,b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // fallback to newest first
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    userPosts.forEach(post => {
        const postElement = createPostCard(post);
        userPostsContainer.appendChild(postElement);
    });
    // Observe posts on profile page as well
    observePosts();
}

function updateProfileStats(userId) {
    const sessionUser = getCurrentUser();
    const targetId = userId || (sessionUser ? sessionUser.id : null);
    if (!targetId) return;
    const posts = getPosts();
    const userPosts = posts.filter(post => post.userId === targetId);

    const targetUser = users.find(u => u.id === targetId) || sessionUser || {};
    const postsEl = document.getElementById('profilePosts');
    const followersEl = document.getElementById('profileFollowers');
    const followingEl = document.getElementById('profileFollowing');
    if (postsEl) postsEl.textContent = userPosts.length;
    if (followersEl) followersEl.textContent = (targetUser.followers && targetUser.followers.length) || 0;
    if (followingEl) followingEl.textContent = (targetUser.following && targetUser.following.length) || 0;
}

function openEditProfileModal() {
    const currentUser = getCurrentUser();
    document.getElementById('editName').value = currentUser.name;
    document.getElementById('editBio').value = currentUser.bio || '';
    document.getElementById('editProfileModal').style.display = 'block';
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function handleEditProfile(event) {
    event.preventDefault();

    const currentUser = getCurrentUser();
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const avatarFile = document.getElementById('editAvatar').files[0];

    if (!name) {
        alert('Name is required');
        return;
    }

    // Update user data
    currentUser.name = name;
    currentUser.bio = bio;

    // If user selected a new avatar and we have a pending dataURL, use it
    if (pendingAvatarDataURL) {
        currentUser.avatar = pendingAvatarDataURL;
        pendingAvatarDataURL = null;
        // clear file input
        const editAvatarInput = document.getElementById('editAvatar');
        if (editAvatarInput) editAvatarInput.value = '';
    }

    saveUser(currentUser);
    loadProfile();
    closeModal();
}

function openSettingsModal() {
    const currentUser = getCurrentUser();
    document.getElementById('privateAccount').checked = currentUser.private || false;
    document.getElementById('showOnlineStatus').checked = currentUser.showOnline || true;
    document.getElementById('emailNotifications').checked = currentUser.emailNotifications !== false;
    document.getElementById('pushNotifications').checked = currentUser.pushNotifications !== false;
    document.getElementById('themeSelect').value = currentUser.theme || 'light';
    document.getElementById('settingsModal').style.display = 'block';
}

function saveSettings() {
    const currentUser = getCurrentUser();
    currentUser.private = document.getElementById('privateAccount').checked;
    currentUser.showOnline = document.getElementById('showOnlineStatus').checked;
    currentUser.emailNotifications = document.getElementById('emailNotifications').checked;
    currentUser.pushNotifications = document.getElementById('pushNotifications').checked;
    currentUser.theme = document.getElementById('themeSelect').value;

    saveUser(currentUser);
    applyTheme(currentUser.theme);
    closeModal();
    alert('Settings saved successfully!');
}

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');

    if (tabName === 'posts') {
        loadUserPosts();
    } else if (tabName === 'liked') {
        loadLikedPosts();
    } else if (tabName === 'saved') {
        loadSavedPosts();
    }
}

function loadLikedPosts() {
    const currentUser = getCurrentUser();
    const allPosts = getPosts();
    const likedPosts = allPosts.filter(post => post.likes.includes(currentUser.id));

    const container = document.getElementById('likedPosts');
    container.innerHTML = '';

    if (likedPosts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No liked posts yet</p>';
        return;
    }

    likedPosts.forEach(post => {
        const postElement = createPostCard(post);
        container.appendChild(postElement);
    });
}

function loadSavedPosts() {
    const currentUser = getCurrentUser();
    const allPosts = getPosts();
    const savedPosts = allPosts.filter(post => (post.saved || []).includes(currentUser.id));

    const container = document.getElementById('savedPosts');
    container.innerHTML = '';

    if (savedPosts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No saved posts yet</p>';
        return;
    }

    savedPosts.forEach(post => {
        const postElement = createPostCard(post);
        container.appendChild(postElement);
    });
}

function createPostCard(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-card';
    postDiv.setAttribute('data-post-id', post.id);
    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.userAvatar}" alt="${post.userName}" class="post-user-avatar" onclick="viewProfile('${post.userId}')">
            <div class="post-user-info">
                <h4 onclick="viewProfile('${post.userId}')" style="cursor:pointer">${post.userName}</h4>
                <p>${formatTimestamp(post.timestamp)}</p>
                ${post.pinned ? `<span class="pin-badge">Pinned</span>` : ''}
            </div>
            ${currentUser && currentUser.id !== post.userId ? `
                <div class="post-header-actions">
                    ${currentUser.following && currentUser.following.includes(post.userId) ?
                        `<button class="icon-btn small" onclick="toggleFollow('${post.userId}')">Unfollow</button>` :
                        `<button class="icon-btn small" onclick="toggleFollow('${post.userId}')">Follow</button>`
                    }
                </div>
            ` : ''}
        </div>
        <div class="post-content">
            ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image" onclick="openPostModal('${post.id}')">` : ''}
            <p class="post-text">${post.text}</p>
            ${post.aiAnalysis ? `
                <div class="ai-analysis">
                    <div class="ai-title">${post.aiAnalysis.title}</div>
                    <div class="ai-description">${post.aiAnalysis.description}</div>
                    <div class="ai-story">${post.aiAnalysis.story}</div>
                    <div class="ai-tags">${post.aiAnalysis.tags.map(tag => `<span class="ai-tag">#${tag}</span>`).join('')}</div>
                </div>
            ` : ''}
            ${post.tags.length > 0 ? `<div class="post-tags">${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>` : ''}
        </div>
        <div class="post-actions">
            <button class="action-btn" onclick="toggleLike('${post.id}')">
                <i class="fas fa-heart"></i> ${post.likes.length}
            </button>
            <button class="action-btn" onclick="toggleCommentBox('${post.id}')">
                <i class="fas fa-comment"></i> ${post.comments.length}
            </button>
            <button class="action-btn" onclick="sharePost('${post.id}')">
                <i class="fas fa-share"></i> ${post.shares || 0}
            </button>
            <button class="action-btn" onclick="togglePin('${post.id}')" title="Pin/Unpin post">
                <i class="fas fa-thumbtack"></i>
            </button>
        </div>
    `;
    // Make the card clickable to open modal, but avoid action button clicks
    postDiv.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn') || e.target.closest('.remove-image')) return;
        openPostModal(post.id);
    });
    return postDiv;
}

// Advanced Features: Real-time Updates and Notifications
function initRealTimeUpdates() {
    // Simulate real-time updates (in production, use WebSockets or Server-Sent Events)
    setInterval(() => {
        if (currentUser && window.location.pathname.includes('feed.html')) {
            const newPosts = getPosts();
            if (newPosts.length !== posts.length) {
                posts = newPosts;
                renderPosts();
                showNotification('New posts available!', 'info');
            }
        }
    }, 30000); // Check every 30 seconds
}

// IntersectionObserver to optimize scroll and add subtle in-view effect
let postObserver = null;
function observePosts() {
    if (postObserver) postObserver.disconnect();
    const options = { root: null, rootMargin: '0px', threshold: 0.12 };
    postObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const el = entry.target;
            if (entry.isIntersecting) {
                el.classList.add('in-view');
            } else {
                el.classList.remove('in-view');
            }
        });
    }, options);

    document.querySelectorAll('.post-card').forEach(card => postObserver.observe(card));
}

// Toggle an inline comment box under the post and focus it
function toggleCommentBox(postId) {
    const postDiv = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postDiv) {
        // fallback: open modal
        openPostModal(postId);
        return;
    }

    // If there's already a comment box, remove it
    const existing = postDiv.querySelector('.comment-box');
    if (existing) {
        existing.remove();
        return;
    }

    // Create comment box
    const box = document.createElement('div');
    box.className = 'comment-box';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'comment-input';

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Write a comment... (Enter to post, Shift+Enter for newline)';
    textarea.maxLength = 500;
    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addInlineComment(postId, textarea.value.trim());
        }
    });

    const sendBtn = document.createElement('button');
    sendBtn.className = 'comment-send';
    sendBtn.textContent = 'Send';
    sendBtn.addEventListener('click', function() { addInlineComment(postId, textarea.value.trim()); });

    inputWrap.appendChild(textarea);
    box.appendChild(inputWrap);
    box.appendChild(sendBtn);

    postDiv.appendChild(box);

    // Scroll into view smoothly and focus
    postDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => textarea.focus(), 400);
}

function addInlineComment(postId, text) {
    if (!text) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // Use createComment to ensure replies array and consistent shape
    const comment = createComment(text);
    post.comments = post.comments || [];
    post.comments.push(comment);
    localStorage.setItem('myidea_posts', JSON.stringify(posts));

    // Update the UI: append comment visually and update count
    const postDiv = document.querySelector(`[data-post-id="${postId}"]`);
    if (postDiv) {
        // remove comment box and re-render a small comment preview
        const box = postDiv.querySelector('.comment-box');
        if (box) box.remove();

        // Update the comments count in action button
        const actionBtns = postDiv.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            if (btn.innerHTML.includes('fa-comment')) {
                btn.innerHTML = `<i class="fas fa-comment"></i> ${post.comments.length}`;
            }
            if (btn.innerHTML.includes('fa-heart')) {
                btn.innerHTML = `<i class="fas fa-heart"></i> ${post.likes.length}`;
            }
        });

        // Optionally show a small inline comment preview
        const preview = document.createElement('div');
        preview.className = 'comment-preview';
        preview.innerHTML = `<strong>${comment.userName}:</strong> ${comment.text}`;
        postDiv.appendChild(preview);
    }

    // Track engagement
    trackEngagement('comment', postId, { text: text });

    // Notify post owner for inline comment
    if (post.userId !== currentUser.id) {
        addNotificationForUser(post.userId, {
            id: Date.now().toString(),
            type: 'comment',
            text: `${currentUser.name} commented: ${comment.text.substring(0, 80)}`,
            postId: post.id,
            fromUserId: currentUser.id,
            timestamp: new Date().toISOString(),
            read: false
        });
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Enhanced Search and Discovery
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (query.length > 2) {
                searchPosts(query);
            } else {
                renderPosts(); // Show all posts if search is cleared
            }
        });
    }
}

function searchPosts(query) {
    const allPosts = getPosts();
    const filteredPosts = allPosts.filter(post => {
        const textMatch = post.text.toLowerCase().includes(query);
        const tagMatch = post.tags.some(tag => tag.toLowerCase().includes(query));
        const userMatch = post.userName.toLowerCase().includes(query);
        const aiMatch = post.aiAnalysis && (
            post.aiAnalysis.title.toLowerCase().includes(query) ||
            post.aiAnalysis.description.toLowerCase().includes(query) ||
            post.aiAnalysis.tags.some(tag => tag.toLowerCase().includes(query))
        );

        return textMatch || tagMatch || userMatch || aiMatch;
    });

    renderFilteredPosts(filteredPosts);
}

function renderFilteredPosts(filteredPosts) {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '';

    if (filteredPosts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No posts found matching your search</p>';
        return;
    }

    filteredPosts.forEach(post => {
        const postElement = createPostElement(post);
        container.appendChild(postElement);
    });
}

// Advanced AI Features: Image Enhancement and Style Transfer
async function enhanceImage(imageData) {
    // Simulate image enhancement (in production, use AI APIs)
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;

            // Apply simple enhancement (brightness, contrast, saturation)
            ctx.filter = 'brightness(1.1) contrast(1.05) saturate(1.1)';
            ctx.drawImage(img, 0, 0);

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };

        img.src = imageData;
    });
}

async function applyStyleTransfer(imageData, style) {
    // Simulate style transfer (in production, use AI APIs like DeepArt or custom models)
    const styles = {
        'impressionist': 'filter: sepia(0.3) contrast(1.1) brightness(1.05)',
        'abstract': 'filter: contrast(1.2) saturate(1.5) hue-rotate(45deg)',
        'minimalist': 'filter: grayscale(0.5) contrast(1.3)',
        'vintage': 'filter: sepia(0.5) contrast(0.9) brightness(0.95)'
    };

    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.filter = styles[style] || 'none';
            ctx.drawImage(img, 0, 0);

            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };

        img.src = imageData;
    });
}

// Social Features: Following System
function followUser(userId) {
    if (!currentUser) return;

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const targetUser = users[userIndex];

    if (!currentUser.following.includes(userId)) {
        currentUser.following.push(userId);
        targetUser.followers.push(currentUser.id);

        localStorage.setItem('myidea_users', JSON.stringify(users));
        showNotification(`You are now following ${targetUser.name}!`, 'success');
    }
}

function unfollowUser(userId) {
    if (!currentUser) return;

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;

    const targetUser = users[userIndex];

    const followingIndex = currentUser.following.indexOf(userId);
    const followerIndex = targetUser.followers.indexOf(currentUser.id);

    if (followingIndex > -1) {
        currentUser.following.splice(followingIndex, 1);
    }
    if (followerIndex > -1) {
        targetUser.followers.splice(followerIndex, 1);
    }

    localStorage.setItem('myidea_users', JSON.stringify(users));
    showNotification(`You unfollowed ${targetUser.name}`, 'info');
}

// Advanced Analytics: User Engagement Tracking
function trackEngagement(action, postId, details = {}) {
    const engagement = {
        userId: currentUser.id,
        action: action,
        postId: postId,
        timestamp: new Date().toISOString(),
        ...details
    };

    const engagements = JSON.parse(localStorage.getItem('myidea_engagements')) || [];
    engagements.push(engagement);
    localStorage.setItem('myidea_engagements', JSON.stringify(engagements));
}

// Notifications helpers: persisted per-user in localStorage
function getNotificationsForUser(userId) {
    try {
        const raw = localStorage.getItem(`myidea_notifications_${userId}`);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (err) {
        console.error('Failed to read notifications', err);
        return [];
    }
}

function saveNotificationsForUser(userId, notifications) {
    try {
        localStorage.setItem(`myidea_notifications_${userId}`, JSON.stringify(notifications || []));
    } catch (err) {
        console.error('Failed to save notifications', err);
    }
}

function addNotificationForUser(userId, notification) {
    if (!userId || !notification) return;
    const notifs = getNotificationsForUser(userId);
    notifs.unshift(notification);
    // keep a reasonable cap
    if (notifs.length > 200) notifs.length = 200;
    saveNotificationsForUser(userId, notifs);
    // If the current logged-in user is the recipient, update UI
    if (currentUser && currentUser.id === userId) renderNotifications();
}

function markAllNotificationsRead() {
    if (!currentUser) return;
    const notifs = getNotificationsForUser(currentUser.id);
    const updated = notifs.map(n => ({ ...n, read: true }));
    saveNotificationsForUser(currentUser.id, updated);
}

function renderNotifications() {
    // Validate session
    if (!SecurityUtils.validateSession()) {
        const notifCountEl = document.getElementById('notifCount');
        const notifListEl = document.getElementById('notifList');
        const notifDropdown = document.getElementById('notifDropdown');
        
        if (notifCountEl) notifCountEl.style.display = 'none';
        if (notifListEl) notifListEl.innerHTML = '<li style="padding:10px; color:var(--text-muted)">Sign in to see notifications</li>';
        if (notifDropdown) notifDropdown.style.display = 'none';
        return;
    }

    // Rate limiting for notifications refresh
    if (!SecurityUtils.rateLimit('notifications_refresh', 10, 60000)) {
        return; // Silently fail to avoid spamming
    }

    const notifCountEl = document.getElementById('notifCount');
    const notifListEl = document.getElementById('notifList');
    if (!currentUser) {
        if (notifCountEl) notifCountEl.style.display = 'none';
        if (notifListEl) notifListEl.innerHTML = '<li style="padding:10px; color:var(--text-muted)">Sign in to see notifications</li>';
        return;
    }

    const notifs = getNotificationsForUser(currentUser.id);
    const unread = notifs.filter(n => !n.read).length;
    if (notifCountEl) {
        if (unread > 0) {
            notifCountEl.style.display = 'inline-block';
            notifCountEl.textContent = unread;
        } else {
            notifCountEl.style.display = 'none';
        }
    }

    if (!notifListEl) return;

    if (notifs.length === 0) {
        notifListEl.innerHTML = '<li style="padding:10px; color:var(--text-muted)">No notifications</li>';
        return;
    }

    notifListEl.innerHTML = '';
    notifs.forEach(n => {
        const li = document.createElement('li');
        li.className = `notif-item ${n.read ? '' : 'unread'}`;
        const time = formatTimestamp(n.timestamp);
        li.innerHTML = `
            <div class="notif-text">${n.text}</div>
            <div class="notif-time">${time}</div>
        `;
        li.addEventListener('click', function() {
            // Mark single notification read
            const all = getNotificationsForUser(currentUser.id);
            const idx = all.findIndex(x => x.id === n.id);
            if (idx > -1) {
                all[idx].read = true;
                saveNotificationsForUser(currentUser.id, all);
                renderNotifications();
            }
            // Navigate to the related post if available
            if (n.postId) {
                openPostModal(n.postId);
                const dropdown = document.getElementById('notifDropdown');
                if (dropdown) dropdown.style.display = 'none';
            }
        });

        notifListEl.appendChild(li);
    });
}

// Initialize advanced features
document.addEventListener('DOMContentLoaded', function() {
    // Initialize real-time updates
    initRealTimeUpdates();

    // Initialize search
    initSearch();

    // Track page views
    trackEngagement('page_view', null, { page: window.location.pathname });
});

// Export functions for global access (needed for HTML onclick handlers)
window.toggleLike = toggleLike;
window.openPostModal = openPostModal;
window.closeModal = closeModal;
window.addComment = addComment;
window.sharePost = sharePost;
window.removeImage = removeImage;
window.followUser = followUser;
window.unfollowUser = unfollowUser;
window.switchTab = switchTab;
window.toggleCommentBox = toggleCommentBox;
window.addInlineComment = addInlineComment;
window.addReply = addReply;
window.toggleReplyBox = toggleReplyBox;
window.renderThreadedComments = renderThreadedComments;
// View a user's profile by navigating to profile.html?userId={id}
function viewProfile(userId) {
    if (!userId) return;
    window.location.href = `profile.html?userId=${encodeURIComponent(userId)}`;
}
window.viewProfile = viewProfile;
