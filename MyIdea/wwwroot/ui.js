// UI Helper Functions

// Page Transition Animation
function showPageTransition(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'page-transition';
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        if (callback) callback();
    }, 300);
}

// Theme Management
function applyTheme(theme = 'light') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('myidea_theme', theme);
    
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.className = theme === 'light' ? 'fas fa-moon theme-icon' : 'fas fa-sun theme-icon';
    }
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('myidea_theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    showNotification(`Switched to ${newTheme} theme`, 'info');
}

// Button States & Loading
function setButtonLoading(button, isLoading) {
    if (!button) return;
    
    const originalText = button.dataset.originalText || button.textContent;
    if (isLoading) {
        button.dataset.originalText = originalText;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        button.disabled = true;
    } else {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Enhanced Notifications
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notificationContainer') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} notification-enter`;
    
    const icon = getNotificationIcon(type);
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Trigger enter animation
    setTimeout(() => notification.classList.add('notification-show'), 10);
    
    // Auto remove after duration
    setTimeout(() => {
        notification.classList.remove('notification-show');
        notification.classList.add('notification-exit');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Form Validation & Error Display
function showFormError(inputId, message) {
    const errorEl = document.getElementById(`${inputId}Error`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.add('input-error');
            input.addEventListener('input', function removeError() {
                this.classList.remove('input-error');
                errorEl.style.display = 'none';
                this.removeEventListener('input', removeError);
            });
        }
    }
}

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('modal-enter');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('modal-enter');
        modal.classList.add('modal-exit');
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('modal-exit');
            document.body.style.overflow = '';
        }, 300);
    }
}

// Post UI Helpers
function updatePostButton() {
    const postBtn = document.getElementById('postBtn');
    const postText = document.getElementById('postText');
    const imagePreview = document.getElementById('imagePreview');
    
    if (postBtn) {
        const hasText = postText && postText.value.trim().length > 0;
        const hasImage = imagePreview && imagePreview.querySelector('img');
        postBtn.disabled = !hasText && !hasImage;
    }
}

// Enhanced Image Upload Preview
function showImagePreview(file, previewElement) {
    if (!file || !previewElement) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'preview-image';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item';
        wrapper.innerHTML = `
            <div class="preview-overlay">
                <button class="remove-preview" onclick="this.closest('.preview-item').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        wrapper.insertBefore(img, wrapper.firstChild);
        
        previewElement.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
}

// Loading States
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }
}

function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const spinner = container.querySelector('.loading-spinner');
        if (spinner) spinner.remove();
    }
}

// Export functions to window
window.showPageTransition = showPageTransition;
window.toggleTheme = toggleTheme;
window.showNotification = showNotification;
window.showFormError = showFormError;
window.showModal = showModal;
window.hideModal = hideModal;
window.updatePostButton = updatePostButton;