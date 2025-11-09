// Form Validation Utilities
const ValidationUtils = {
    validators: {
        required: (value) => value !== undefined && value !== null && value.toString().trim() !== '',
        email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        minLength: (value, min) => value.length >= min,
        maxLength: (value, max) => value.length <= max,
        password: (value) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(value),
        matches: (value, field) => value === document.getElementById(field)?.value,
        url: (value) => /^https?:\/\/.+/i.test(value),
        number: (value) => !isNaN(parseFloat(value)) && isFinite(value),
        phone: (value) => /^\+?[\d\s-]{10,}$/.test(value),
        date: (value) => !isNaN(Date.parse(value))
    },

    messages: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        minLength: (min) => `Must be at least ${min} characters`,
        maxLength: (max) => `Must be no more than ${max} characters`,
        password: 'Password must contain at least 8 characters, including letters, numbers, and special characters',
        matches: 'Fields do not match',
        url: 'Please enter a valid URL',
        number: 'Please enter a valid number',
        phone: 'Please enter a valid phone number',
        date: 'Please enter a valid date'
    },

    validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return { valid: false, errors: { form: 'Form not found' } };

        const errors = {};
        let valid = true;

        Object.keys(rules).forEach(fieldName => {
            const field = form.elements[fieldName];
            if (!field) {
                console.error(`Field ${fieldName} not found in form`);
                return;
            }

            const fieldRules = rules[fieldName];
            const fieldErrors = [];

            Object.keys(fieldRules).forEach(rule => {
                const ruleValue = fieldRules[rule];
                const validator = this.validators[rule];
                
                if (!validator) {
                    console.error(`Validator ${rule} not found`);
                    return;
                }

                const isValid = validator(field.value, ruleValue);
                if (!isValid) {
                    fieldErrors.push(
                        typeof this.messages[rule] === 'function' 
                            ? this.messages[rule](ruleValue)
                            : this.messages[rule]
                    );
                }
            });

            if (fieldErrors.length) {
                errors[fieldName] = fieldErrors;
                valid = false;
            }
        });

        return { valid, errors };
    },

    showErrors(errors, formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Clear previous errors
        form.querySelectorAll('.error-message').forEach(el => el.remove());
        form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

        // Show new errors
        Object.keys(errors).forEach(fieldName => {
            const field = form.elements[fieldName];
            if (!field) return;

            const errorContainer = document.createElement('div');
            errorContainer.className = 'error-message';
            errorContainer.textContent = errors[fieldName][0]; // Show first error

            field.classList.add('input-error');
            field.parentNode.insertBefore(errorContainer, field.nextSibling);
        });
    },

    // Real-time validation
    setupLiveValidation(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return;

        Object.keys(rules).forEach(fieldName => {
            const field = form.elements[fieldName];
            if (!field) return;

            field.addEventListener('input', () => {
                const result = this.validateForm(formId, { [fieldName]: rules[fieldName] });
                if (!result.valid) {
                    this.showErrors({ [fieldName]: result.errors[fieldName] }, formId);
                } else {
                    // Clear errors for this field
                    const errorEl = field.parentNode.querySelector('.error-message');
                    if (errorEl) errorEl.remove();
                    field.classList.remove('input-error');
                }
            });
        });
    }
};

// Example usage:
/*
ValidationUtils.setupLiveValidation('loginForm', {
    email: { required: true, email: true },
    password: { required: true, minLength: 8 }
});

const { valid, errors } = ValidationUtils.validateForm('loginForm', {
    email: { required: true, email: true },
    password: { required: true, minLength: 8 }
});

if (!valid) {
    ValidationUtils.showErrors(errors, 'loginForm');
}
*/

window.ValidationUtils = ValidationUtils;