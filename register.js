// register.js - Xử lý đăng ký tài khoản
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    // Form đăng ký
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Real-time validation
    const password = document.getElementById('reg_password');
    const confirmPassword = document.getElementById('confirm_password');
    
    if (password && confirmPassword) {
        password.addEventListener('input', validatePasswordMatch);
        confirmPassword.addEventListener('input', validatePasswordMatch);
    }
}

function validatePasswordMatch() {
    const password = document.getElementById('reg_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const confirmInput = document.getElementById('confirm_password');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = '#dc2626';
    } else if (confirmPassword) {
        confirmInput.style.borderColor = '#10b981';
    } else {
        confirmInput.style.borderColor = '#d1d5db';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('reg_username').value.trim();
    const role = document.getElementById('role').value;
    const password = document.getElementById('reg_password').value;
    const confirm_password = document.getElementById('confirm_password').value;
    
    // Validation
    if (!full_name || !email || !username || !role || !password || !confirm_password) {
        showError('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    if (password !== confirm_password) {
        showError('Mật khẩu xác nhận không khớp');
        return;
    }
    
    if (password.length < 6) {
        showError('Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError('Email không hợp lệ');
        return;
    }
    
    await performRegister(full_name, email, username, role, password, confirm_password);
}

async function performRegister(full_name, email, username, role, password, confirm_password) {
    const registerBtn = document.querySelector('.login-btn');
    const originalText = registerBtn.innerHTML;
    
    try {
        // Hiển thị trạng thái loading
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';
        registerBtn.classList.add('loading');

        const response = await fetch(`${API_BASE_URL}/register.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                full_name: full_name,
                email: email,
                username: username,
                role: role,
                password: password,
                confirm_password: confirm_password
            })
        });

        const result = await response.json();
        
        if (result.success) {
            // THAY ĐỔI: Xử lý trường hợp cần phê duyệt
            if (result.requires_approval) {
                await showSuccess(
                    'Đăng ký thành công!', 
                    'Tài khoản của bạn đã được tạo và đang chờ phê duyệt bởi quản trị viên. Bạn sẽ nhận được thông báo khi tài khoản được kích hoạt.'
                );
                // Reset form sau khi đăng ký thành công
                document.getElementById('register-form').reset();
            } else {
                // Trường hợp không cần phê duyệt (nếu có)
                const roleText = result.user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
                showSuccess('Đăng ký thành công!', `Tài khoản ${roleText} đã được tạo. Vui lòng đăng nhập.`)
                    .then(() => {
                        window.location.href = 'login.html';
                    });
            }
        } else {
            showError(result.message || 'Đăng ký thất bại');
        }
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        showError('Không thể kết nối đến server. Vui lòng thử lại.');
    } finally {
        // Khôi phục trạng thái ban đầu
        registerBtn.innerHTML = originalText;
        registerBtn.classList.remove('loading');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Hiển thị thông báo lỗi
function showError(message) {
    return Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: message,
        confirmButtonColor: '#dc2626'
    });
}

// Hiển thị thông báo thành công - CẬP NHẬT
function showSuccess(title, message, showCancelButton = false) {
    const swalConfig = {
        icon: 'success',
        title: title,
        text: message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#10b981',
        timer: showCancelButton ? null : 5000,
        showConfirmButton: true
    };
    
    if (showCancelButton) {
        swalConfig.showCancelButton = true;
        swalConfig.cancelButtonText = 'Đóng';
    }
    
    return Swal.fire(swalConfig);
}

// Xử lý phím Enter để submit form
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.dispatchEvent(new Event('submit'));
        }
    }
});