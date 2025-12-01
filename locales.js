// locales.js - Quản lý đa ngôn ngữ
const translations = {
    vi: {
        // Common
        'dashboard': 'Trang chủ',
        'employees': 'Nhân sự',
        'organization': 'Tổ chức',
        'attendance': 'Chấm công',
        'training': 'Đào tạo',
        'performance': 'Hiệu suất',
        'hr_calendar': 'Lịch HR',
        'recruitment': 'Tuyển dụng',
        'projects': 'Dự án',
        'finance': 'Tài chính',
        'settings': 'Cài đặt',
        'logout': 'Đăng xuất',
        
        // Settings page
        'system_settings': 'Cài đặt hệ thống',
        'general_settings': 'Cài đặt chung',
        'security': 'Bảo mật',
        'notifications': 'Thông báo',
        'appearance': 'Giao diện',
        'backup_restore': 'Sao lưu & Khôi phục',
        'integrations': 'Tích hợp',
        
        // Company info
        'company_info': 'Thông tin công ty',
        'company_name': 'Tên công ty',
        'tax_code': 'Mã số thuế',
        'address': 'Địa chỉ',
        'phone': 'Điện thoại',
        'website': 'Website',
        
        // System settings
        'system': 'Hệ thống',
        'timezone': 'Múi giờ',
        'language': 'Ngôn ngữ',
        'date_format': 'Định dạng ngày',
        'currency': 'Tiền tệ',
        
        // Buttons
        'save': 'Lưu',
        'reset': 'Đặt lại',
        'backup_now': 'Sao lưu ngay',
        
        // Messages
        'save_success': 'Cài đặt đã được lưu!',
        'reset_confirm': 'Bạn có chắc muốn đặt lại cài đặt về mặc định?'
    },
    
    en: {
        // Common
        'dashboard': 'Dashboard',
        'employees': 'Employees',
        'organization': 'Organization',
        'attendance': 'Attendance',
        'training': 'Training',
        'performance': 'Performance',
        'hr_calendar': 'HR Calendar',
        'recruitment': 'Recruitment',
        'projects': 'Projects',
        'finance': 'Finance',
        'settings': 'Settings',
        'logout': 'Logout',
        
        // Settings page
        'system_settings': 'System Settings',
        'general_settings': 'General Settings',
        'security': 'Security',
        'notifications': 'Notifications',
        'appearance': 'Appearance',
        'backup_restore': 'Backup & Restore',
        'integrations': 'Integrations',
        
        // Company info
        'company_info': 'Company Information',
        'company_name': 'Company Name',
        'tax_code': 'Tax Code',
        'address': 'Address',
        'phone': 'Phone',
        'website': 'Website',
        
        // System settings
        'system': 'System',
        'timezone': 'Timezone',
        'language': 'Language',
        'date_format': 'Date Format',
        'currency': 'Currency',
        
        // Buttons
        'save': 'Save',
        'reset': 'Reset',
        'backup_now': 'Backup Now',
        
        // Messages
        'save_success': 'Settings saved successfully!',
        'reset_confirm': 'Are you sure you want to reset to default settings?'
    }
};

class LocaleManager {
    constructor() {
        this.currentLang = localStorage.getItem('hrms_language') || 'vi';
        this.init();
    }

    init() {
        // Load saved language preference
        this.loadLanguage(this.currentLang);
    }

    loadLanguage(lang) {
        if (!translations[lang]) {
            console.warn(`Language ${lang} not found, falling back to Vietnamese`);
            lang = 'vi';
        }
        
        this.currentLang = lang;
        localStorage.setItem('hrms_language', lang);
        
        // Update HTML lang attribute
        document.documentElement.lang = lang;
        
        // Apply translations to current page
        this.applyTranslations();
        
        // Dispatch event for other components to update
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: lang }
        }));
    }

    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            
            if (translation) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // Update page title and other dynamic content
        this.updateDynamicContent();
    }

    getTranslation(key) {
        const keys = key.split('.');
        let value = translations[this.currentLang];
        
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }
        
        return value;
    }

    updateDynamicContent() {
        // Update page titles and other content that might not have data-i18n attributes
        const pageTitle = this.getTranslation('system_settings');
        if (pageTitle && document.title.includes('Cài đặt')) {
            document.title = `${pageTitle} - HR Management System`;
        }
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    // Method to format dates, numbers, etc. based on language
    formatDate(date, options = {}) {
        const lang = this.currentLang;
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        };
        
        return new Date(date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', 
            { ...defaultOptions, ...options });
    }

    formatNumber(number) {
        return new Intl.NumberFormat(this.currentLang === 'vi' ? 'vi-VN' : 'en-US').format(number);
    }
}

// Create global instance
window.localeManager = new LocaleManager();