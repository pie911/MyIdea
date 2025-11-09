// Clean, self-contained feed controller
class FeedController {
    constructor() {
        this.postService = window.postService;
        this.authService = window.authService;
        this.uiService = window.uiService;
        this.selectedImages = [];
    }

    init() {
        if (!this.authService || !this.authService.getCurrentUser()) {
            window.location.href = 'login.html';
            return;
        }

        this.bindEvents();
        this.loadUserInfo();
        this.loadPosts();

        // Render notifications UI if available
        try {
            if (this.uiService && typeof this.uiService.renderNotifications === 'function') {
                this.uiService.renderNotifications();
            }
        } catch (err) {
            console.warn('renderNotifications failed', err);
        }
    }

    bindEvents() {
        // Post creation controls
        const postBtn = document.getElementById('postBtn');
        const postText = document.getElementById('postText');
        const uploadBtn = document.getElementById('uploadBtn');
        const imageInput = document.getElementById('imageInput');

        if (postText) postText.addEventListener('input', () => this.updatePostButton());
        if (postBtn) postBtn.addEventListener('click', () => this.handlePostCreation());
        if (uploadBtn && imageInput) {
            uploadBtn.addEventListener('click', () => imageInput.click());
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => { this.authService.logout(); window.location.href = 'login.html'; });

        // Notifications wiring
        const notifBtn = document.getElementById('notifBtn');
        const notifDropdown = document.getElementById('notifDropdown');
        const markAllBtn = document.getElementById('markAllRead');
        const closeNotifBtn = document.getElementById('closeNotif');

        if (notifBtn) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!notifDropdown) return;
                const isOpen = notifDropdown.style.display === 'block';
                if (isOpen) notifDropdown.style.display = 'none';
                else {
                    if (this.uiService && typeof this.uiService.renderNotifications === 'function') this.uiService.renderNotifications();
                    notifDropdown.style.display = 'block';
                }
            });

            document.addEventListener('click', (ev) => {
                if (notifDropdown && !notifDropdown.contains(ev.target) && ev.target !== notifBtn) {
                    notifDropdown.style.display = 'none';
                }
            });
        }

        if (markAllBtn) markAllBtn.addEventListener('click', () => { if (this.uiService && typeof this.uiService.markAllNotificationsRead === 'function') this.uiService.markAllNotificationsRead(); });
        if (closeNotifBtn) closeNotifBtn.addEventListener('click', () => { if (notifDropdown) notifDropdown.style.display = 'none'; });

        // Theme toggle fallback
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark-theme');
            const newTheme = isDark ? 'light' : 'dark';
            if (this.uiService && typeof this.uiService.setTheme === 'function') this.uiService.setTheme(newTheme);
        });

        // Initial UI state
        this.updatePostButton();
    }

    loadUserInfo() {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        const userAvatars = document.querySelectorAll('#userAvatar, #currentUserAvatar');
        userAvatars.forEach(a => { if (a) a.src = user.avatar; });

        const userName = document.getElementById('userName');
        const userBio = document.getElementById('userBio');
        if (userName) userName.textContent = user.name;
        if (userBio) userBio.textContent = user.bio || 'No bio yet';

        const posts = this.postService.getUserPosts ? this.postService.getUserPosts(user.id) : (user.posts || []);
        const postsCount = document.getElementById('postsCount'); if (postsCount) postsCount.textContent = String(posts.length || 0);
        const followersCount = document.getElementById('followersCount'); if (followersCount) followersCount.textContent = String((user.followers && user.followers.length) || 0);
        const followingCount = document.getElementById('followingCount'); if (followingCount) followingCount.textContent = String((user.following && user.following.length) || 0);
    }

    updatePostButton() {
        const postBtn = document.getElementById('postBtn');
        const postText = document.getElementById('postText');
        if (postBtn && postText) postBtn.disabled = !postText.value.trim() && this.selectedImages.length === 0;
    }

    async handlePostCreation() {
        const postBtn = document.getElementById('postBtn');
        const textEl = document.getElementById('postText');
        const text = textEl ? textEl.value.trim() : '';
        const imageData = this.selectedImages[0] || null;

        try {
            if (this.uiService && typeof this.uiService.toggleLoadingState === 'function') this.uiService.toggleLoadingState(postBtn, true);
            await this.postService.createPost(text, imageData);
            if (textEl) textEl.value = '';
            this.selectedImages = [];
            const preview = document.getElementById('imagePreview'); if (preview) preview.innerHTML = '';
            this.updatePostButton();
            this.loadPosts();
            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Post created successfully!', 'success');
        } catch (err) {
            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Failed to create post', 'error');
        } finally {
            if (this.uiService && typeof this.uiService.toggleLoadingState === 'function') this.uiService.toggleLoadingState(postBtn, false);
        }
    }

    async handleImageUpload(event) {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const preview = document.getElementById('imagePreview'); if (preview) preview.innerHTML = '';
        this.selectedImages = [];

        for (const file of files.slice(0, 5)) {
            if (!file || !file.type || !file.type.startsWith('image/')) continue;
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                this.selectedImages.push(imageData);
                if (preview) {
                    const img = document.createElement('div');
                    img.className = 'preview-item';
                    img.innerHTML = `
                        <img src="${imageData}" alt="Preview" class="preview-image">
                        <div class="preview-overlay">
                            <button class="remove-preview" data-idx="${this.selectedImages.length - 1}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                    preview.appendChild(img);
                    // delegate remove click
                    img.querySelector('.remove-preview').addEventListener('click', () => { this.removeImage(Number(img.querySelector('.remove-preview').getAttribute('data-idx'))); });
                }
                this.updatePostButton();
            };
            reader.readAsDataURL(file);
        }
    }

    removeImage(index) {
        if (typeof index !== 'number') return;
        this.selectedImages.splice(index, 1);
        const preview = document.getElementById('imagePreview'); if (!preview) return;
        preview.innerHTML = '';
        this.selectedImages.forEach((imageData, idx) => {
            const img = document.createElement('div');
            img.className = 'preview-item';
            img.innerHTML = `
                <img src="${imageData}" alt="Preview" class="preview-image">
                <div class="preview-overlay">
                    <button class="remove-preview" data-idx="${idx}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            preview.appendChild(img);
            img.querySelector('.remove-preview').addEventListener('click', () => { this.removeImage(idx); });
        });
        this.updatePostButton();
    }

    loadPosts() {
        const container = document.getElementById('postsContainer');
        const loading = document.getElementById('feedLoading');
        if (!container) return;
        if (loading) loading.style.display = 'flex';

        try {
            const posts = this.postService.getPosts();
            container.innerHTML = posts.map(post => this.createPostElement(post)).join('');

            posts.forEach(post => {
                const likeBtn = document.getElementById(`likeBtn_${post.id}`);
                if (likeBtn) likeBtn.addEventListener('click', () => this.handleLike(post.id));

                const shareBtn = document.getElementById(`shareBtn_${post.id}`);
                if (shareBtn) shareBtn.addEventListener('click', async () => {
                    try {
                        const base = window.location.origin + window.location.pathname;
                        const shareUrl = `${base}?postId=${encodeURIComponent(post.id)}`;
                        if (navigator.share) {
                            await navigator.share({ title: `Post by ${post.userName}`, text: post.text || '', url: shareUrl });
                            await this.postService.sharePost(post.id);
                            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Post shared', 'success');
                        } else if (navigator.clipboard) {
                            await navigator.clipboard.writeText(`${post.text || ''} - ${shareUrl}`);
                            await this.postService.sharePost(post.id);
                            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Link copied to clipboard', 'success');
                        } else {
                            prompt('Copy share link', shareUrl);
                            await this.postService.sharePost(post.id);
                            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Share link provided', 'info');
                        }
                        this.loadPosts();
                    } catch (err) {
                        console.warn('Share failed', err);
                        if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Failed to share post', 'error');
                    }
                });
            });
        } catch (err) {
            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Failed to load posts', 'error');
        } finally {
            if (loading) loading.style.display = 'none';
        }
    }

    createPostElement(post) {
        const user = this.authService.getCurrentUser();
        const isLiked = Array.isArray(post.likes) && user && post.likes.includes(user.id);
        const safeText = this.formatText(post.text || '');

        return `
            <div class="post-card" id="post_${post.id}">
                <div class="post-header">
                    <img src="${post.userAvatar}" alt="${post.userName}" class="post-avatar">
                    <div class="post-meta">
                        <h3>${post.userName}</h3>
                        <span class="post-time">${this.formatTime(post.timestamp)}</span>
                    </div>
                </div>
                <div class="post-content">
                    <p>${safeText}</p>
                    ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
                </div>
                <div class="post-actions">
                    <button class="action-btn ${isLiked ? 'active' : ''}" id="likeBtn_${post.id}">
                        <i class="fas fa-heart"></i>
                        <span>${(post.likes && post.likes.length) || 0}</span>
                    </button>
                    <button class="action-btn" onclick="feed.showComments('${post.id}')">
                        <i class="fas fa-comment"></i>
                        <span>${(post.comments && post.comments.length) || 0}</span>
                    </button>
                    <button class="action-btn" id="shareBtn_${post.id}">
                        <i class="fas fa-share"></i>
                        <span>${post.shares || 0}</span>
                    </button>
                </div>
                ${this.renderComments(post)}
            </div>
        `;
    }

    formatText(text) {
        if (!text) return '';
        text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        text = text.replace(/#(\w+)/g, '<a href="#" class="hashtag">#$1</a>');
        text = text.replace(/@(\w+)/g, '<a href="#" class="mention">@$1</a>');
        return text;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    renderComments(post) {
        const comments = Array.isArray(post.comments) ? post.comments : [];
        const commentsHtml = comments.length ? comments.map(c => this.renderComment(c, post.id)).join('') : '<div class="no-comments" style="color:var(--text-muted); padding:8px 0">No comments yet</div>';
        return `
            <div class="comments-section" id="comments_${post.id}" style="display:none">
                ${commentsHtml}
                ${this.renderCommentForm(post.id)}
            </div>
        `;
    }

    renderComment(comment, postId) {
        const repliesHtml = (comment.replies || []).map(r => `
            <div class="reply">
                <img src="${r.userAvatar}" alt="${r.userName}" class="reply-avatar">
                <div class="reply-content">
                    <div class="reply-header"><strong>${r.userName}</strong><span class="reply-time">${this.formatTime(r.timestamp)}</span></div>
                    <p>${this.formatText(r.text)}</p>
                </div>
            </div>
        `).join('');

        return `
            <div class="comment" id="comment_${comment.id}">
                <img src="${comment.userAvatar}" alt="${comment.userName}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header"><strong>${comment.userName}</strong><span class="comment-time">${this.formatTime(comment.timestamp)}</span></div>
                    <p>${this.formatText(comment.text)}</p>
                    ${repliesHtml}
                </div>
            </div>
        `;
    }

    renderCommentForm(postId) {
        return `
            <div class="comment-form">
                <textarea placeholder="Write a comment..." id="commentText_${postId}"></textarea>
                <button onclick="feed.addComment('${postId}')"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;
    }

    renderReplyForm(postId, commentId) {
        return `
            <div class="reply-form">
                <textarea placeholder="Write a reply..." id="replyText_${postId}_${commentId}"></textarea>
                <button onclick="feed.addReply('${postId}', '${commentId}')"><i class="fas fa-reply"></i></button>
            </div>
        `;
    }

    async handleLike(postId) {
        try {
            const isLiked = await this.postService.likePost(postId);
            const likeBtn = document.getElementById(`likeBtn_${postId}`);
            if (likeBtn) likeBtn.classList.toggle('active', isLiked);
            this.loadPosts();
        } catch (err) {
            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Failed to like post', 'error');
        }
    }

    async addComment(postId) {
        const textarea = document.getElementById(`commentText_${postId}`);
        if (!textarea) return;
        const text = textarea.value.trim(); if (!text) return;
        try {
            await this.postService.addComment(postId, text);
            textarea.value = '';
            this.loadPosts();
            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Comment added', 'success');
        } catch (err) {
            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Failed to add comment', 'error');
        }
    }

    async addReply(postId, commentId) {
        const textarea = document.getElementById(`replyText_${postId}_${commentId}`);
        if (!textarea) return;
        const text = textarea.value.trim(); if (!text) return;
        try {
            await this.postService.addReply(postId, commentId, text);
            textarea.value = '';
            this.loadPosts();
            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Reply added', 'success');
        } catch (err) {
            if (this.uiService && typeof this.uiService.showNotification === 'function') this.uiService.showNotification('Failed to add reply', 'error');
        }
    }

    showComments(postId) {
        const commentsEl = document.getElementById(`comments_${postId}`);
        if (!commentsEl) return;
        const isHidden = commentsEl.style.display === 'none' || commentsEl.style.display === '';
        commentsEl.style.display = isHidden ? 'block' : 'none';
        if (isHidden) { const ta = commentsEl.querySelector('textarea'); if (ta) ta.focus(); }
    }
}

// Expose
window.feed = new FeedController();
document.addEventListener('DOMContentLoaded', () => { window.feed.init(); });