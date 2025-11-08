let currentUser = null;
let users = JSON.parse(localStorage.getItem('myidea_users')) || [];
let posts = JSON.parse(localStorage.getItem('myidea_posts')) || [];
let currentTheme = localStorage.getItem('myidea_theme') || 'light';
let selectedImages = [];
let isAnalyzing = false;

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
    const saved = localStorage.getItem('myidea_currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        return currentUser;
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
document.addEventListener('DOMContentLoaded', function() {
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

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
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
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function hideErrors() {
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(error => error.style.display = 'none');
}

function login(email, password) {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        currentUser = user;
        const remember = document.getElementById('rememberSession')?.checked || false;
        setSecureSession(user, remember);
        localStorage.setItem('myidea_currentUser', JSON.stringify(user));
        window.location.href = 'feed.html';
        return true;
    }
    return false;
}

function register(name, email, password) {
    if (users.some(u => u.email === email)) {
        return false; // Email already exists
    }

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
        following: []
    };

    users.push(newUser);
    localStorage.setItem('myidea_users', JSON.stringify(users));
    return true;
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
}

function createPost(text, imageData = null, aiAnalysis = null) {
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
        tags: extractTags(text)
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
}

function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-card';
    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.userAvatar}" alt="${post.userName}" class="post-user-avatar">
            <div class="post-user-info">
                <h4>${post.userName}</h4>
                <p>${formatTimestamp(post.timestamp)}</p>
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
            <button class="action-btn" onclick="openPostModal('${post.id}')">
                <i class="fas fa-comment"></i> ${post.comments.length}
            </button>
            <button class="action-btn" onclick="sharePost('${post.id}')">
                <i class="fas fa-share"></i>
            </button>
        </div>
    `;
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
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const likeIndex = post.likes.indexOf(currentUser.id);
    if (likeIndex > -1) {
        post.likes.splice(likeIndex, 1);
    } else {
        post.likes.push(currentUser.id);
    }

    localStorage.setItem('myidea_posts', JSON.stringify(posts));
    renderPosts();
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
                ${post.tags.length > 0 ? `<div class="post-tags">${post.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>` : ''}
            </div>
            <div class="post-actions">
                <button class="action-btn" onclick="toggleLike('${post.id}')">
                    <i class="fas fa-heart"></i> ${post.likes.length}
                </button>
                <button class="action-btn">
                    <i class="fas fa-comment"></i> ${post.comments.length}
                </button>
                <button class="action-btn" onclick="sharePost('${post.id}')">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        </div>
        <div class="comments-section">
            <h4>Comments</h4>
            <div id="commentsList">
                ${post.comments.map(comment => `
                    <div class="comment">
                        <strong>${comment.userName}:</strong> ${comment.text}
                    </div>
                `).join('')}
            </div>
            <div class="add-comment">
                <input type="text" id="commentInput" placeholder="Add a comment..." maxlength="200">
                <button onclick="addComment('${post.id}')">Post</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('postModal').style.display = 'none';
}

function addComment(postId) {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const comment = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        text: text,
        timestamp: new Date().toISOString()
    };

    post.comments.push(comment);
    localStorage.setItem('myidea_posts', JSON.stringify(posts));
    input.value = '';
    openPostModal(postId); // Refresh modal
}

function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (navigator.share) {
        navigator.share({
            title: `Post by ${post.userName}`,
            text: post.text,
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(`${post.text} - ${window.location.href}`);
        alert('Link copied to clipboard!');
    }
}

// Multi-Image Upload with AI Analysis
async function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    selectedImages = [];
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';

    for (let i = 0; i < Math.min(files.length, 5); i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            selectedImages.push(imageData);

            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="${imageData}" alt="Preview ${i + 1}">
                <button class="remove-image" onclick="removeImage(${i})">&times;</button>
            `;
            preview.appendChild(imageItem);
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
}

function initProfilePage() {
    if (window.location.pathname.includes('profile.html')) {
        loadProfile();

        // Event listeners
        document.getElementById('editProfileBtn').addEventListener('click', openEditProfileModal);
        document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
        document.getElementById('editProfileForm').addEventListener('submit', handleEditProfile);
        document.getElementById('saveSettings').addEventListener('click', saveSettings);

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
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Load user profile data
    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileBio = document.getElementById('profileBio');

    profileAvatar.src = currentUser.avatar || 'https://via.placeholder.com/120x120?text=User';
    profileName.textContent = currentUser.name;
    profileBio.textContent = currentUser.bio || 'No bio yet';

    // Load user posts
    loadUserPosts();
    updateProfileStats();
}

function loadUserPosts() {
    const currentUser = getCurrentUser();
    const posts = getPosts();
    const userPosts = posts.filter(post => post.userId === currentUser.id);

    const userPostsContainer = document.getElementById('userPosts');
    userPostsContainer.innerHTML = '';

    if (userPosts.length === 0) {
        userPostsContainer.innerHTML = '<p style="text-align center; color: var(--text-muted); padding: 40px;">No posts yet</p>';
        return;
    }

    userPosts.forEach(post => {
        const postElement = createPostCard(post);
        userPostsContainer.appendChild(postElement);
    });
}

function updateProfileStats() {
    const currentUser = getCurrentUser();
    const posts = getPosts();
    const userPosts = posts.filter(post => post.userId === currentUser.id);

    document.getElementById('profilePosts').textContent = userPosts.length;
    document.getElementById('profileFollowers').textContent = currentUser.followers || 0;
    document.getElementById('profileFollowing').textContent = currentUser.following || 0;
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

    if (avatarFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUser.avatar = e.target.result;
            saveUser(currentUser);
            loadProfile();
            closeModal();
        };
        reader.readAsDataURL(avatarFile);
    } else {
        saveUser(currentUser);
        loadProfile();
        closeModal();
    }
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
    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.userAvatar}" alt="${post.userName}" class="post-user-avatar">
            <div class="post-user-info">
                <h4>${post.userName}</h4>
                <p>${formatTimestamp(post.timestamp)}</p>
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
            <button class="action-btn" onclick="openPostModal('${post.id}')">
                <i class="fas fa-comment"></i> ${post.comments.length}
            </button>
            <button class="action-btn" onclick="sharePost('${post.id}')">
                <i class="fas fa-share"></i>
            </button>
        </div>
    `;
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
