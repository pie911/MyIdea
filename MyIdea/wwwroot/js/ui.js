class UIService {
    constructor() {
        this.init();
    }

    init() {
        this.setupTheme();
        this.setupNotifications();
        this.bindGlobalEvents();
        // Attach search when UI ready
        try { this.setupSearch(); } catch (e) { /* ignore */ }
    }

    setupTheme() {
        const theme = localStorage.getItem('myidea_theme') || 'light';
        this.setTheme(theme);

        // Theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
                this.setTheme(currentTheme);
            });
        }
    }

    setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            // Also set data-theme attribute so CSS custom properties switch correctly
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('myidea_theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('myidea_theme', 'light');
        }

        // Update theme icon
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.className = `fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} theme-icon`;
        }
    }

    setupNotifications() {
        const container = document.getElementById('notificationContainer');
        if (!container) {
            const div = document.createElement('div');
            div.id = 'notificationContainer';
            div.className = 'notification-container';
            document.body.appendChild(div);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getNotificationIcon(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('notification-show');
        });

        // Setup close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.closeNotification(notification));

        // Auto close after 5 seconds
        setTimeout(() => this.closeNotification(notification), 5000);
    }

    closeNotification(notification) {
        notification.classList.remove('notification-show');
        notification.classList.add('notification-exit');
        setTimeout(() => notification.remove(), 300);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-info-circle';
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.parentElement.querySelector('input')?.classList.add('input-error');
            setTimeout(() => {
                element.parentElement.querySelector('input')?.classList.remove('input-error');
            }, 500);
        }
    }

    bindGlobalEvents() {
        // Handle page transitions
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.startsWith(window.location.origin)) {
                e.preventDefault();
                this.transitionToPage(link.href);
            }
        });
    }

    // Live search UI: attach to #searchInput and render results into #searchResults
    setupSearch() {
        const input = document.getElementById('searchInput');
        const resultsEl = document.getElementById('searchResults');
        if (!input || !resultsEl) return;

        let lastQuery = '';
        let debounceTimer = null;

        const clearResults = () => {
            resultsEl.innerHTML = '';
            resultsEl.style.display = 'none';
        };

        const renderResults = (items) => {
            resultsEl.innerHTML = '';
            if (!items || !items.length) {
                resultsEl.innerHTML = '<div style="padding:10px;color:var(--text-muted)">No results</div>';
                resultsEl.style.display = 'block';
                return;
            }
            items.forEach(it => {
                const row = document.createElement('div');
                row.className = 'search-row';
                row.style.padding = '8px 10px';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.cursor = 'pointer';
                row.innerHTML = `<img src="${it.avatar || 'https://via.placeholder.com/40'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;margin-right:8px"> <div><div style="font-weight:600">${it.name}</div><div style="font-size:12px;color:var(--text-muted)">${it.id}</div></div>`;
                row.addEventListener('click', () => {
                    // go to profile
                    window.location.href = `profile.html?userId=${encodeURIComponent(it.id)}`;
                });
                resultsEl.appendChild(row);
            });
            resultsEl.style.display = 'block';
        };

        input.addEventListener('input', (e) => {
            const q = (e.target.value || '').trim();
            if (q === lastQuery) return;
            lastQuery = q;
            if (debounceTimer) clearTimeout(debounceTimer);
            if (!q) {
                debounceTimer = setTimeout(clearResults, 150);
                return;
            }
            debounceTimer = setTimeout(() => {
                try {
                    const auth = window.authService;
                    if (!auth || typeof auth.searchUsers !== 'function') {
                        renderResults([]);
                        return;
                    }
                    const results = auth.searchUsers(q).slice(0,10);
                    renderResults(results);
                } catch (err) {
                    console.warn('Search failed', err);
                    renderResults([]);
                }
            }, 180);
        });

        // Hide on outside click
        document.addEventListener('click', (ev) => {
            if (!resultsEl.contains(ev.target) && ev.target !== input) {
                resultsEl.style.display = 'none';
            }
        });
    }

    /* Notification helpers (simple localStorage-backed) */
    getNotificationsForUser(userId) {
        if (!userId) return [];
        try {
            return JSON.parse(localStorage.getItem(`myidea_notifications_${userId}`)) || [];
        } catch (err) {
            console.error('Failed to read notifications', err);
            return [];
        }
    }

    saveNotificationsForUser(userId, notifications) {
        if (!userId) return;
        try {
            localStorage.setItem(`myidea_notifications_${userId}`, JSON.stringify(notifications || []));
        } catch (err) {
            console.error('Failed to save notifications', err);
        }
    }

    addNotificationForUser(userId, notification) {
        if (!userId || !notification) return;
        const notifs = this.getNotificationsForUser(userId);
        notifs.unshift(notification);
        if (notifs.length > 200) notifs.length = 200;
        this.saveNotificationsForUser(userId, notifs);
        // If the current user is the recipient, refresh any visible UI
        const cur = window.authService?.getCurrentUser();
        if (cur && cur.id === userId) this.renderNotifications();
    }

    renderNotifications() {
        const cur = window.authService?.getCurrentUser();
        const notifCountEl = document.getElementById('notifCount');
        const notifListEl = document.getElementById('notifList');
        const notifDropdown = document.getElementById('notifDropdown');

        if (!cur) {
            if (notifCountEl) notifCountEl.style.display = 'none';
            if (notifListEl) notifListEl.innerHTML = '<li style="padding:10px; color:var(--text-muted)">Sign in to see notifications</li>';
            if (notifDropdown) notifDropdown.style.display = 'none';
            return;
        }

        const notifs = this.getNotificationsForUser(cur.id);
        const unread = notifs.filter(n => !n.read).length;
        if (notifCountEl) {
            if (unread > 0) { notifCountEl.style.display = 'inline-block'; notifCountEl.textContent = unread; }
            else notifCountEl.style.display = 'none';
        }

        if (!notifListEl) return;
        if (!notifs.length) { notifListEl.innerHTML = '<li style="padding:10px; color:var(--text-muted)">No notifications</li>'; return; }

        notifListEl.innerHTML = '';
        notifs.forEach(n => {
            const li = document.createElement('li');
            li.className = `notif-item ${n.read ? '' : 'unread'}`;
            const time = new Date(n.timestamp).toLocaleString();
            li.innerHTML = `<div class="notif-text">${n.text}</div><div class="notif-time">${time}</div>`;
            li.addEventListener('click', () => {
                // mark read
                const all = this.getNotificationsForUser(cur.id);
                const idx = all.findIndex(x => x.id === n.id);
                if (idx > -1) { all[idx].read = true; this.saveNotificationsForUser(cur.id, all); }
                this.renderNotifications();
                if (n.postId) openPostModal(n.postId);
                if (notifDropdown) notifDropdown.style.display = 'none';
            });
            notifListEl.appendChild(li);
        });
    }

    markAllNotificationsRead() {
        const cur = window.authService?.getCurrentUser();
        if (!cur) return;
        const all = this.getNotificationsForUser(cur.id).map(n => ({ ...n, read: true }));
        this.saveNotificationsForUser(cur.id, all);
        this.renderNotifications();
    }

    /* Profile edit / settings helpers */
    openEditProfileModal() {
        const cur = window.authService?.getCurrentUser();
        if (!cur) return;
        document.getElementById('editName').value = cur.name || '';
        document.getElementById('editBio').value = cur.bio || '';
        const modal = document.getElementById('editProfileModal');
        if (modal) modal.style.display = 'block';
    }

    openSettingsModal() {
        const cur = window.authService?.getCurrentUser();
        if (!cur) return;
        // populate settings
        document.getElementById('themeSelect').value = localStorage.getItem('myidea_theme') || 'light';
        const modal = document.getElementById('settingsModal');
        if (modal) modal.style.display = 'block';
    }

    saveSettings() {
        const theme = document.getElementById('themeSelect')?.value || 'light';
        this.setTheme(theme === 'auto' ? 'light' : theme);
        // persist in user profile if needed
        const cur = window.authService?.getCurrentUser();
        if (cur) {
            cur.settings = cur.settings || {};
            cur.settings.theme = theme;
            window.authService.updateProfile({ settings: cur.settings });
            this.showNotification('Settings saved', 'success');
        }
        // close modal
        const modal = document.getElementById('settingsModal');
        if (modal) modal.style.display = 'none';
    }

    async transitionToPage(href) {
        const transition = document.querySelector('.page-transition');
        if (!transition) return;

        transition.style.display = 'block';
        await new Promise(resolve => setTimeout(resolve, 300));
        window.location.href = href;
    }

    toggleLoadingState(button, isLoading) {
        if (!button) return;
        
        const originalContent = button.innerHTML;
        
        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            button.setAttribute('data-original-content', originalContent);
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            const original = button.getAttribute('data-original-content');
            if (original) button.innerHTML = original;
        }
    }
}

window.uiService = new UIService();