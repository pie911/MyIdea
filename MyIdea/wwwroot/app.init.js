// Page Initialization
function initializePage() {
    document.addEventListener('DOMContentLoaded', function() {
        // Check authentication
        if (!isAuthenticated() && (window.location.pathname.includes('feed.html') || window.location.pathname.includes('profile.html'))) {
            window.location.href = 'login.html';
            return;
        }

        // Initialize theme
        applyTheme();

        // Initialize page-specific functionality
        const path = window.location.pathname;
        if (path.endsWith('feed.html')) {
            initFeedPage();
        } else if (path.endsWith('profile.html')) {
            initProfilePage();
        } else if (path.endsWith('login.html')) {
            initLoginPage();
        }
    });
}

function initFeedPage() {
    try {
        // Load and validate user data
        currentUser = getCurrentUser();
        if (!currentUser) {
            console.error('No current user found');
            window.location.href = 'login.html';
            return;
        }

        // Load and validate posts
        try {
            posts = JSON.parse(localStorage.getItem('myidea_posts') || '[]');
            if (!Array.isArray(posts)) throw new Error('Invalid posts data');
        } catch (err) {
            console.error('Invalid posts data, resetting:', err);
            posts = [];
            localStorage.setItem('myidea_posts', '[]');
        }

        // Initialize UI components
        initializeUI();
        
        // Load saved state
        loadUserData();
        normalizeCommentsData();
        
        // Wire up event listeners
        wireUpEventListeners();
        
        // Initial render
        renderPosts();
        observePosts();
        renderNotifications();
        
        // Start real-time updates
        initRealTimeUpdates();
        
        // Show welcome message
        showNotification(`Welcome back, ${currentUser.name}!`, 'info');
        
    } catch (err) {
        console.error('Feed initialization failed:', err);
        showNotification('Something went wrong. Please refresh the page.', 'error');
    }
}

function initializeUI() {
    // Update user section
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userBio = document.getElementById('userBio');
    
    if (userAvatar) userAvatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}`;
    if (userName) userName.textContent = currentUser.name;
    if (userBio) userBio.textContent = currentUser.bio || 'No bio yet';

    // Update composer avatar
    const currentUserAvatar = document.getElementById('currentUserAvatar');
    if (currentUserAvatar) currentUserAvatar.src = currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}`;

    // Initialize stats
    updateProfileStats();

    // Initialize theme
    applyTheme(currentUser.settings?.theme || 'light');

    // Load draft if exists
    loadDraft();
}

function wireUpEventListeners() {
    // Post creation
    const postBtn = document.getElementById('postBtn');
    const postText = document.getElementById('postText');
    const uploadBtn = document.getElementById('uploadBtn');
    const imageInput = document.getElementById('imageInput');
    const saveDraftBtn = document.getElementById('saveDraftBtn');

    if (postText) {
        postText.addEventListener('input', updatePostButton);
        // Auto-save draft on input
        let typingTimer;
        postText.addEventListener('input', () => {
            clearTimeout(typingTimer);
            typingTimer = setTimeout(saveDraft, 1000);
        });
    }

    if (postBtn) {
        postBtn.addEventListener('click', async () => {
            try {
                const text = postText.value.trim();
                if (!text && selectedImages.length === 0) return;
                
                const post = await createPost(text);
                if (post) {
                    postText.value = '';
                    selectedImages = [];
                    document.getElementById('imagePreview').innerHTML = '';
                    updatePostButton();
                    // Clear draft after successful post
                    if (DRAFT_KEY) localStorage.removeItem(DRAFT_KEY);
                }
            } catch (err) {
                console.error('Post creation failed:', err);
                showNotification('Failed to create post. Please try again.', 'error');
            }
        });
    }

    if (uploadBtn && imageInput) {
        uploadBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);
    }

    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', saveDraft);
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('myidea_currentUser');
            localStorage.removeItem('myidea_session');
            showNotification('Logged out successfully', 'success');
            setTimeout(() => window.location.href = 'login.html', 1000);
        });
    }

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                const query = this.value.trim().toLowerCase();
                if (query.length > 1) {
                    searchPosts(query);
                } else {
                    renderPosts();
                }
            }, 300);
        });
    }
}

// Initialize on page load
initializePage();