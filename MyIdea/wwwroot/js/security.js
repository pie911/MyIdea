// Security Utilities
const SecurityUtils = {
    // XSS Prevention
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // Content Security Policy Headers (to be implemented server-side)
    getCSPHeaders() {
        return {
            'Content-Security-Policy': 
                "default-src 'self'; " +
                "script-src 'self' https://cdnjs.cloudflare.com; " +
                "style-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'; " +
                "img-src 'self' data: https: blob:; " +
                "font-src 'self' https://cdnjs.cloudflare.com; " +
                "connect-src 'self'; " +
                "frame-src 'none'; " +
                "object-src 'none';"
        };
    },

    // Input Validation
    validateInput(input, type) {
        const patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            username: /^[a-zA-Z0-9_]{3,30}$/,
            password: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
            text: /^[\s\S]{1,5000}$/, // Allow any text up to 5000 chars
            url: /^https?:\/\/.+/i
        };
        return patterns[type]?.test(input) ?? false;
    },

    // CSRF Token Management
    generateCSRFToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Session Security
    validateSession() {
        try {
            const session = JSON.parse(localStorage.getItem('myidea_session'));
            if (!session) return false;

            // Check expiration
            if (Date.now() > session.expires) {
                this.clearSession();
                return false;
            }

            // Validate session integrity (accept either 'token' or legacy 'csrfToken')
            if (!session.user || !session.user.id || (!session.token && !session.csrfToken)) {
                this.clearSession();
                return false;
            }

            return true;
        } catch (error) {
            this.clearSession();
            return false;
        }
    },

    clearSession() {
        localStorage.removeItem('myidea_session');
        localStorage.removeItem('myidea_currentUser');
        sessionStorage.clear();
    },

    // Rate Limiting
    rateLimiter: {
        attempts: {},
        maxAttempts: 5,
        timeWindow: 300000, // 5 minutes

        checkLimit(action) {
            const now = Date.now();
            const key = `${action}_${now}`;
            
            // Clean up old attempts
            Object.keys(this.attempts).forEach(k => {
                if (now - this.attempts[k].timestamp > this.timeWindow) {
                    delete this.attempts[k];
                }
            });

            // Check current attempts
            const currentAttempts = Object.values(this.attempts)
                .filter(a => a.action === action && now - a.timestamp < this.timeWindow)
                .length;

            if (currentAttempts >= this.maxAttempts) {
                return false;
            }

            this.attempts[key] = { action, timestamp: now };
            return true;
        }
    },

    // Sensitive Data Handling
    sanitizeUserData(user) {
        if (!user) return null;
        const { password, ...safeData } = user;
        return safeData;
    },

    // Content Security
    validateFileUpload(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!file) return { valid: false, error: 'No file provided' };
        if (file.size > maxSize) return { valid: false, error: 'File too large (max 5MB)' };
        if (!allowedTypes.includes(file.type)) return { valid: false, error: 'Invalid file type' };
        
        return { valid: true };
    },

    // URL Sanitization
    sanitizeURL(url) {
        try {
            const parsed = new URL(url);
            // Only allow specific protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                throw new Error('Invalid protocol');
            }
            return parsed.toString();
        } catch {
            return '';
        }
    }
};

window.SecurityUtils = SecurityUtils;