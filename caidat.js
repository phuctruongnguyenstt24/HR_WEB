// caidat.js - Settings page functionality
document.addEventListener('DOMContentLoaded', function () {
    initializeSettings();
    setupSettingsTabs();
    loadSettings();
    setupThemeToggle();
});

// Initialize settings page
function initializeSettings() {
    console.log('Initializing settings page...');

    // Set current date với định dạng theo ngôn ngữ
    updateCurrentDate();

    // Load user info
    loadUserInfo();

    // Setup language change listener
    setupLanguageChange();
}

// Hàm mới để cập nhật ngày theo ngôn ngữ
function updateCurrentDate() {
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        if (window.localeManager && typeof localeManager.formatDate === 'function') {
            currentDateElement.textContent = localeManager.formatDate(new Date());
        } else {
            // Fallback nếu localeManager chưa khởi tạo
            const currentDate = new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            currentDateElement.textContent = currentDate;
        }
    }
}
// Hàm thiết lập sự kiện thay đổi ngôn ngữ
function setupLanguageChange() {
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
        languageSelect.addEventListener('change', function () {
            const newLang = this.value;

            // Kiểm tra localeManager đã tồn tại chưa
            if (window.localeManager) {
                localeManager.loadLanguage(newLang);
            }

            // Cập nhật ngày hiện tại với định dạng mới
            updateCurrentDate();

            // Lưu cài đặt ngôn ngữ
            saveLanguagePreference(newLang);
        });
    }

    // Lắng nghe sự kiện thay đổi ngôn ngữ từ các component khác
    window.addEventListener('languageChanged', function (event) {
        const newLang = event.detail.language;
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.value = newLang;
        }
        updateCurrentDate();
    });
}

// Hàm lưu preference ngôn ngữ
function saveLanguagePreference(lang) {
    const settings = JSON.parse(localStorage.getItem('hrms_settings')) || {};
    if (!settings.general) settings.general = {};
    settings.general.language = lang;
    localStorage.setItem('hrms_settings', JSON.stringify(settings));
}

// Load user information
function loadUserInfo() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const decoded = jwt_decode(token);
            document.getElementById('username').textContent = decoded.name || 'Người dùng';
            document.getElementById('user-fullname').textContent = decoded.name || 'Tên người dùng';
            document.getElementById('user-role').textContent = decoded.role || 'Vai trò';
        } catch (error) {
            console.error('Error decoding token:', error);
        }
    }
}

// Setup settings tabs navigation
function setupSettingsTabs() {
    const tabButtons = document.querySelectorAll('.settings-nav-btn');
    const tabs = document.querySelectorAll('.settings-tab');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab') + '-tab';

            // Remove active class from all buttons and tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabs.forEach(tab => tab.classList.remove('active'));

            // Add active class to current button and tab
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Setup theme toggle functionality
function setupThemeToggle() {
    const themeSelect = document.getElementById('theme-color');
    if (themeSelect) {
        themeSelect.addEventListener('change', function () {
            applyTheme(this.value);
        });
    }
}

// Apply theme (Dark/Light)
function applyTheme(theme) {
    const body = document.body;
    const root = document.documentElement;

    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${theme.toLowerCase()}`);

    if (theme.toLowerCase() === 'dark') {
        root.style.setProperty('--bg-color', '#1a1a1a');
        root.style.setProperty('--text-color', '#ffffff');
        root.style.setProperty('--sidebar-bg', '#2d2d2d');
        root.style.setProperty('--sidebar-text', '#f0e8e8ff');
        root.style.setProperty('--card-bg', '#2d2d2d');
        root.style.setProperty('--border-color', '#404040');
        root.style.setProperty('--hover-color', '#3d3d3d');
        root.style.setProperty('--muted', '#888888');
        root.style.setProperty('--header-text', '#ffffff');
        root.style.setProperty('--header-bg', '#1a1a1a');
    } else {
        root.style.setProperty('--bg-color', '#f8f9fa');
        root.style.setProperty('--text-color', '#2c3e50');
        root.style.setProperty('--sidebar-bg', '#ffffff');
        root.style.setProperty('--sidebar-text', '#2c3e50');
        root.style.setProperty('--card-bg', '#ffffff');
        root.style.setProperty('--border-color', '#e9ecef');
        root.style.setProperty('--hover-color', '#f8f9fa');
        root.style.setProperty('--muted', '#6c757d');
        root.style.setProperty('--header-text', '#2c3e50');
        root.style.setProperty('--header-bg', '#ffffff');
    }

    // Save theme preference
    const settings = JSON.parse(localStorage.getItem('hrms_settings')) || {};
    if (!settings.appearance) settings.appearance = {};
    settings.appearance.theme = theme;
    localStorage.setItem('hrms_settings', JSON.stringify(settings));
}

// Load saved settings from localStorage
function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('hrms_settings')) || {};

    // Load language first và áp dụng
    if (savedSettings.general && savedSettings.general.language) {
        const savedLang = savedSettings.general.language;
        document.getElementById('language').value = savedLang;
        if (window.localeManager) {
            localeManager.loadLanguage(savedLang);
        }
    }

    // Load general settings
    if (savedSettings.general) {
        document.getElementById('company-name').value = savedSettings.general.companyName || 'Công ty TNHH ABC';
        document.getElementById('company-tax').value = savedSettings.general.companyTax || '0123456789';
        document.getElementById('company-address').value = savedSettings.general.companyAddress || '123 Đường ABC, TP.HCM';
        document.getElementById('company-phone').value = savedSettings.general.companyPhone || '+84 28 1234 5678';
        document.getElementById('company-email').value = savedSettings.general.companyEmail || 'contact@company.com';
        document.getElementById('company-website').value = savedSettings.general.companyWebsite || 'https://company.com';
        document.getElementById('timezone').value = savedSettings.general.timezone || 'GMT+7';
        document.getElementById('language').value = savedSettings.general.language || 'vi';
        document.getElementById('date-format').value = savedSettings.general.dateFormat || 'DD/MM/YYYY';
        document.getElementById('currency').value = savedSettings.general.currency || 'VND';
    }

    // Load security settings - CHỈ LOAD NẾU PHẦN TỬ TỒN TẠI
    if (savedSettings.security) {
        // Password fields are not pre-filled for security

        // Kiểm tra phần tử tồn tại trước khi set checked
        const twoFactorAuth = document.getElementById('two-factor-auth');
        const loginNotifications = document.getElementById('login-notifications');
        const autoLogout = document.getElementById('auto-logout');

        if (twoFactorAuth) twoFactorAuth.checked = savedSettings.security.twoFactorAuth || false;
        if (loginNotifications) loginNotifications.checked = savedSettings.security.loginNotifications || true;
        if (autoLogout) autoLogout.checked = savedSettings.security.autoLogout || true;
    }

    // Load notification settings
    if (savedSettings.notifications) {
        const emailNotifications = document.getElementById('email-notifications');
        const browserNotifications = document.getElementById('browser-notifications');
        const appNotifications = document.getElementById('app-notifications');

        if (emailNotifications) emailNotifications.checked = savedSettings.notifications.email !== false;
        if (browserNotifications) browserNotifications.checked = savedSettings.notifications.browser !== false;
        if (appNotifications) appNotifications.checked = savedSettings.notifications.app !== false;
    }

    // Load appearance settings
    if (savedSettings.appearance) {
        const theme = savedSettings.appearance.theme || 'Light';
        const themeSelect = document.getElementById('theme-color');
        const densitySelect = document.getElementById('density');

        if (themeSelect) themeSelect.value = theme;
        if (densitySelect) densitySelect.value = savedSettings.appearance.density || 'Comfortable';

        // Apply saved theme immediately
        applyTheme(theme);
    }

    // Load backup settings
    if (savedSettings.backup) {
        const lastBackupElement = document.getElementById('last-backup-date');
        if (lastBackupElement) {
            lastBackupElement.textContent = savedSettings.backup.lastBackup || '2025-11-29';
        }
    }

    // Load integration settings sẽ được xử lý sau
}
// Save settings to localStorage
// Save settings to localStorage
function saveSettings(tab) {
    const settings = JSON.parse(localStorage.getItem('hrms_settings')) || {};

    switch (tab) {
        case 'general':
            settings.general = {
                companyName: document.getElementById('company-name').value,
                companyTax: document.getElementById('company-tax').value,
                companyAddress: document.getElementById('company-address').value,
                companyPhone: document.getElementById('company-phone').value,
                companyEmail: document.getElementById('company-email').value,
                companyWebsite: document.getElementById('company-website').value,
                timezone: document.getElementById('timezone').value,
                language: document.getElementById('language').value,
                dateFormat: document.getElementById('date-format').value,
                currency: document.getElementById('currency').value
            };
            break;

        case 'security':
            // Check password change if fields are filled
            const currentPassword = document.getElementById('current-password');
            const newPassword = document.getElementById('new-password');
            const confirmPassword = document.getElementById('confirm-password');

            if (currentPassword && newPassword && confirmPassword) {
                const currentPasswordValue = currentPassword.value;
                const newPasswordValue = newPassword.value;
                const confirmPasswordValue = confirmPassword.value;

                if (currentPasswordValue || newPasswordValue || confirmPasswordValue) {
                    if (!currentPasswordValue) {
                        Swal.fire('Lỗi', 'Vui lòng nhập mật khẩu hiện tại!', 'error');
                        return;
                    }
                    if (newPasswordValue !== confirmPasswordValue) {
                        Swal.fire('Lỗi', 'Mật khẩu mới và xác nhận mật khẩu không khớp!', 'error');
                        return;
                    }
                    if (newPasswordValue.length < 6) {
                        Swal.fire('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
                        return;
                    }

                    // Simulate password change (in real app, this would be an API call)
                    Swal.fire({
                        title: 'Đang xử lý...',
                        text: 'Đang thay đổi mật khẩu',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });

                    setTimeout(() => {
                        Swal.fire('Thành công', 'Mật khẩu đã được thay đổi!', 'success');

                        // Clear password fields
                        currentPassword.value = '';
                        newPassword.value = '';
                        confirmPassword.value = '';
                    }, 1500);
                }
            }

            // Chỉ lưu security settings nếu các phần tử tồn tại
            settings.security = {};
            const twoFactorAuth = document.getElementById('two-factor-auth');
            const loginNotifications = document.getElementById('login-notifications');
            const autoLogout = document.getElementById('auto-logout');

            if (twoFactorAuth) settings.security.twoFactorAuth = twoFactorAuth.checked;
            if (loginNotifications) settings.security.loginNotifications = loginNotifications.checked;
            if (autoLogout) settings.security.autoLogout = autoLogout.checked;
            break;

        case 'notifications':
            settings.notifications = {
                email: document.getElementById('email-notifications')?.checked || false,
                browser: document.getElementById('browser-notifications')?.checked || false,
                app: document.getElementById('app-notifications')?.checked || false
            };
            break;

        case 'appearance':
            const themeSelect = document.getElementById('theme-color');
            const densitySelect = document.getElementById('density');

            if (themeSelect && densitySelect) {
                const theme = themeSelect.value;
                settings.appearance = {
                    theme: theme,
                    density: densitySelect.value
                };
                // Apply theme immediately
                applyTheme(theme);
            }
            break;

        case 'integrations':
            // Xử lý tích hợp nếu có
            settings.integrations = {
                // Thêm các tích hợp ở đây nếu cần
            };
            break;
    }

    localStorage.setItem('hrms_settings', JSON.stringify(settings));
    Swal.fire('Thành công', 'Cài đặt đã được lưu!', 'success');
}
// Reset settings for a specific tab
function resetSettings(tab) {
    Swal.fire({
        title: 'Xác nhận đặt lại?',
        text: "Bạn có chắc muốn đặt lại cài đặt về mặc định?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Đặt lại',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            const defaultSettings = getDefaultSettings();
            const settings = JSON.parse(localStorage.getItem('hrms_settings')) || {};

            settings[tab] = defaultSettings[tab];
            localStorage.setItem('hrms_settings', JSON.stringify(settings));

            loadSettings(); // Reload settings to update UI
            Swal.fire('Đã đặt lại!', 'Cài đặt đã được đặt về mặc định.', 'success');
        }
    });
}

// Get default settings
// Get default settings
function getDefaultSettings() {
    return {
        general: {
            companyName: 'Công ty TNHH ABC',
            companyTax: '0123456789',
            companyAddress: '123 Đường ABC, TP.HCM',
            companyPhone: '+84 28 1234 5678',
            companyEmail: 'contact@company.com',
            companyWebsite: 'https://company.com',
            timezone: 'GMT+7',
            language: 'vi',
            dateFormat: 'DD/MM/YYYY',
            currency: 'VND'
        },
        security: {
            // Bỏ qua các setting không có trong HTML
        },
        notifications: {
            email: true,
            browser: true,
            app: true
        },
        appearance: {
            theme: 'Light',
            density: 'Comfortable'
        },
        backup: {
            lastBackup: new Date().toISOString().split('T')[0]
        },
        integrations: {
            // Thêm các tích hợp nếu cần
        }
    };
}

// Backup functionality
function startBackup() {
    Swal.fire({
        title: 'Đang sao lưu...',
        text: 'Vui lòng chờ trong giây lát',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Simulate backup process
    setTimeout(() => {
        const backupData = {
            settings: JSON.parse(localStorage.getItem('hrms_settings')) || {},
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };

        // Create and download backup file
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `hrms_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        // Update last backup date
        const settings = JSON.parse(localStorage.getItem('hrms_settings')) || {};
        if (!settings.backup) settings.backup = {};
        settings.backup.lastBackup = new Date().toISOString().split('T')[0];
        localStorage.setItem('hrms_settings', JSON.stringify(settings));

        document.getElementById('last-backup-date').textContent = settings.backup.lastBackup;

        Swal.fire('Thành công!', 'Sao lưu đã được hoàn thành và tải về.', 'success');
    }, 2000);
}

// Restore backup functionality
function restoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const backupData = JSON.parse(e.target.result);

            Swal.fire({
                title: 'Xác nhận khôi phục?',
                text: "Tất cả cài đặt hiện tại sẽ bị ghi đè!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Khôi phục',
                cancelButtonText: 'Hủy'
            }).then((result) => {
                if (result.isConfirmed) {
                    localStorage.setItem('hrms_settings', JSON.stringify(backupData.settings));
                    loadSettings();
                    Swal.fire('Thành công!', 'Cài đặt đã được khôi phục từ bản sao lưu.', 'success');
                }
            });
        } catch (error) {
            Swal.fire('Lỗi!', 'File sao lưu không hợp lệ.', 'error');
        }
    };
    reader.readAsText(file);
}

// Toggle switch functionality for settings
function setupToggleSwitches() {
    const toggles = document.querySelectorAll('.setting-toggle input[type="checkbox"]');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function () {
            const tab = this.closest('.settings-tab').id.replace('-tab', '');
            saveSettings(tab);
        });
    });
}

// Initialize toggle switches
setupToggleSwitches();

// Export settings for other pages to use
window.settingsManager = {
    getTheme: function () {
        const settings = JSON.parse(localStorage.getItem('hrms_settings')) || {};
        return settings.appearance?.theme || 'Light';
    },

    applySavedTheme: function () {
        const theme = this.getTheme();
        applyTheme(theme);
    },

    getSetting: function (category, key) {
        const settings = JSON.parse(localStorage.getItem('hrms_settings')) || {};
        return settings[category]?.[key];
    }
};


// Helper function to safely set element properties
function safeSetElement(id, property, value) {
    const element = document.getElementById(id);
    if (element && element[property] !== undefined) {
        element[property] = value;
    }
}

// Helper function to safely get element
function getElementSafe(id) {
    return document.getElementById(id);
}

// Apply theme when page loads
window.settingsManager.applySavedTheme();