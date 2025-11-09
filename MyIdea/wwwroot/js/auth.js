class AuthService {
    constructor() {
        this.currentUser = null;
        this.users = JSON.parse(localStorage.getItem('myidea_users')) || [];
        this.init();
    }

    init() {
        // Check for existing session
        const session = this.getSession();
        if (session && session.user) {
            this.currentUser = session.user;
            // Update session expiration
            this.setSession(session.user, true);
            return true;
        }
        return false;
    }

    async login(email, password) {
        try {
            const user = this.users.find(u => u.email === email && u.password === password);
            if (!user) return false;

            // Initialize any missing fields
            if (!user.id) user.id = Date.now().toString();
            if (!user.avatar) user.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`;
            if (!user.bio) user.bio = '';
            if (!Array.isArray(user.posts)) user.posts = [];
            if (!Array.isArray(user.followers)) user.followers = [];
            if (!Array.isArray(user.following)) user.following = [];
            if (!user.created) user.created = new Date().toISOString();

            this.currentUser = user;
            
            // Remember me checked in login form
            const remember = document.getElementById('rememberSession')?.checked || false;
            this.setSession(user, remember);
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    }

    async register(name, email, password) {
        try {
            if (this.users.some(u => u.email === email)) {
                throw new Error('Email already exists');
            }

            const newUser = {
                id: Date.now().toString(),
                name,
                email,
                password,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
                bio: '',
                posts: [],
                followers: [],
                following: [],
                created: new Date().toISOString()
            };

            this.users.push(newUser);
            localStorage.setItem('myidea_users', JSON.stringify(this.users));

            return true;
        } catch (error) {
            console.error('Registration failed:', error);
            return false;
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('myidea_session');
        localStorage.removeItem('myidea_currentUser');
    }

    setSession(user, remember = false) {
        // Create a safe user object without sensitive data
        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            posts: user.posts || [],
            followers: user.followers || [],
            following: user.following || [],
            created: user.created
        };

        const session = {
            user: safeUser,
            timestamp: Date.now(),
            expires: remember ? Date.now() + (30 * 24 * 60 * 60 * 1000) : Date.now() + (24 * 60 * 60 * 1000),
            csrfToken: SecurityUtils.generateCSRFToken(),
            tokenCreated: Date.now()
        };
        
        localStorage.setItem('myidea_session', JSON.stringify(session));
        localStorage.setItem('myidea_currentUser', JSON.stringify(safeUser));
    }

    getSession() {
        const session = localStorage.getItem('myidea_session');
        if (!session) return null;

        const { user, expires } = JSON.parse(session);
        if (Date.now() > expires) {
            this.logout();
            return null;
        }
        return { user, expires };
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateProfile(updates) {
        if (!this.currentUser) return false;
        
        Object.assign(this.currentUser, updates);
        
        // Update in users array
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            localStorage.setItem('myidea_users', JSON.stringify(this.users));
        }

        // Update session
        this.setSession(this.currentUser);
        return true;
    }

    // Follow another user
    follow(userId) {
        if (!this.currentUser) return false;
        if (this.currentUser.id === userId) return false;

        const targetIndex = this.users.findIndex(u => u.id === userId);
        if (targetIndex === -1) return false;

        const target = this.users[targetIndex];

        this.currentUser.following = this.currentUser.following || [];
        target.followers = target.followers || [];

        if (!this.currentUser.following.includes(userId)) {
            this.currentUser.following.push(userId);
        }
        if (!target.followers.includes(this.currentUser.id)) {
            target.followers.push(this.currentUser.id);
        }

        // persist
        const idx = this.users.findIndex(u => u.id === this.currentUser.id);
        if (idx !== -1) this.users[idx] = this.currentUser;
        this.users[targetIndex] = target;
        localStorage.setItem('myidea_users', JSON.stringify(this.users));
        this.setSession(this.currentUser);
        return true;
    }

    // Unfollow a user
    unfollow(userId) {
        if (!this.currentUser) return false;
        if (this.currentUser.id === userId) return false;

        const targetIndex = this.users.findIndex(u => u.id === userId);
        if (targetIndex === -1) return false;

        const target = this.users[targetIndex];

        this.currentUser.following = this.currentUser.following || [];
        target.followers = target.followers || [];

        this.currentUser.following = this.currentUser.following.filter(id => id !== userId);
        target.followers = target.followers.filter(id => id !== this.currentUser.id);

        // persist
        const idx = this.users.findIndex(u => u.id === this.currentUser.id);
        if (idx !== -1) this.users[idx] = this.currentUser;
        this.users[targetIndex] = target;
        localStorage.setItem('myidea_users', JSON.stringify(this.users));
        this.setSession(this.currentUser);
        return true;
    }

    // Check if current user is following target
    isFollowing(userId) {
        if (!this.currentUser) return false;
        return Array.isArray(this.currentUser.following) && this.currentUser.following.includes(userId);
    }

    // Simple search by name or email; returns array of users (without passwords)
    searchUsers(query) {
        if (!query) return [];
        const q = query.toLowerCase();
        return this.users.filter(u => (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q))).map(u => ({ id: u.id, name: u.name, avatar: u.avatar }));
    }
}

window.authService = new AuthService();