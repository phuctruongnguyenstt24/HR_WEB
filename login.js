document.addEventListener('DOMContentLoaded', function () {
    checkExistingLogin();
    setupEventListeners();
});

// --- Kiểm tra Session Hiện có ---
function checkExistingLogin() {
    const savedUser = localStorage.getItem('currentUser');
    const sessionToken = localStorage.getItem('session_token');

    // Nếu có token, thử xác thực với server để chuyển hướng
    if (savedUser && sessionToken) {
        verifySession(sessionToken);
    }
}

// --- Thiết lập Sự kiện ---
function setupEventListeners() {
    // Form đăng nhập
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Lắng nghe sự kiện submit, bao gồm cả khi nhấn Enter
        loginForm.addEventListener('submit', handleLogin);
    }
}

// --- Xử lý Đăng nhập Form ---
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showError('Vui lòng nhập **đầy đủ** thông tin đăng nhập');
        return;
    }

    await performLogin(username, password);
}

// --- Thực hiện Đăng nhập API ---
async function performLogin(username, password) {
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn ? loginBtn.innerHTML : 'Đăng nhập';

    if (!loginBtn) return; // Bảo vệ nếu nút không tồn tại

    try {
        // Hiển thị trạng thái loading
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
        loginBtn.classList.add('loading');

        const response = await fetch(`${API_BASE_URL}/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            // Thêm login_type
            result.user.login_type = 'normal';

            // Lưu thông tin user và session token
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            localStorage.setItem('session_token', result.user.session_token);

            await showSuccess('Đăng nhập thành công!', `Chào mừng **${result.user.full_name}** đến với hệ thống`);

            // CHUYỂN HƯỚNG THEO ROLE
            redirectByRole(result.user.role);
        } else {
            showError(result.message || 'Đăng nhập thất bại. Vui lòng kiểm tra tên đăng nhập và mật khẩu.');
        }
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        showError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc thử lại.');
    } finally {
        // Khôi phục trạng thái ban đầu
        loginBtn.innerHTML = originalText;
        loginBtn.classList.remove('loading');
    }
}

//
 

// --- Chuyển hướng theo Role ---
function redirectByRole(role) {
    switch (role) {
        case 'admin':
        case 'manager':
        case 'quanly':
            window.location.href = 'qlns.html';
            break;
        case 'employee':
        case 'nhanvien':
        case 'staff':
            window.location.href = 'nhanvien_trangchu.html';
            break;
        default:
            window.location.href = 'nhanvien_trangchu.html';
            break;
    }
}

// --- Xác thực Session với Server ---
async function verifySession(sessionToken) {
    try {
        const response = await fetch(`${API_BASE_URL}/verify_session.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_token: sessionToken })
        });

        const result = await response.json();

        if (result.success) {
            // Session hợp lệ, cập nhật lại thông tin user và chuyển hướng theo role
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            redirectByRole(result.user.role);
        } else {
            // Session không hợp lệ hoặc hết hạn
            clearSessionData();
        }
    } catch (error) {
        console.error('Lỗi xác thực session:', error);
        // Lỗi mạng hoặc server không phản hồi -> xóa dữ liệu session
        clearSessionData();
    }
}

// --- Xử lý Google Sign-In (GSI) ---
window.handleGoogleCredentialResponse = async (response) => {
    const idToken = response.credential;

    if (!idToken) {
        showError('Đăng nhập Google thất bại. Vui lòng thử lại.');
        return;
    }

    // Hiển thị loading
    const googleBtn = document.querySelector('.g_id_signin');
    if (googleBtn) {
        googleBtn.classList.add('google-loading');
    }

    try {
        const fetchResponse = await fetch(`${API_BASE_URL}/google-login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_token: idToken })
        });

        const result = await fetchResponse.json();

        if (result.success) {
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            localStorage.setItem('session_token', result.user.session_token);

            await showSuccess('Đăng nhập Google thành công!', `Chào mừng ${result.user.full_name}`);

            // CHUYỂN HƯỚNG THEO ROLE - SỬA LỖI Ở ĐÂY
            redirectByRole(result.user.role);
        } else {
            showError(result.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
        }
    } catch (error) {
        console.error('Lỗi đăng nhập Google:', error);
        showError('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    } finally {
        // Xóa loading state
        if (googleBtn) {
            googleBtn.classList.remove('google-loading');
        }
    }
}

// --- Hàm tiện ích (Utility Functions) ---

// Xóa dữ liệu session khỏi Local Storage
function clearSessionData() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('session_token');
    // Có thể thêm Swal.fire thông báo session hết hạn nếu cần thiết
}

// Hiển thị thông báo lỗi (Sử dụng SweetAlert2)
function showError(message) {
    return Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        html: message, // Dùng html để hỗ trợ bold/tag
        confirmButtonColor: '#dc2626'
    });
}

// Hiển thị thông báo thành công (Sử dụng SweetAlert2)
function showSuccess(title, message) {
    return Swal.fire({
        icon: 'success',
        title: title,
        html: message, // Dùng html để hỗ trợ bold/tag
        timer: 2000,
        showConfirmButton: false
    });
}

// Hiển thị thông báo thông tin (Sử dụng SweetAlert2)
function showInfo(title, message) {
    return Swal.fire({
        icon: 'info',
        title: title,
        text: message,
        confirmButtonColor: '#4f46e5'
    });
}

// Utility function: Kiểm tra email domain (Giữ lại nếu bạn cần sử dụng)
function isValidCompanyEmail(email) {
    const allowedDomains = ['company.com', 'enterprise.vn', 'business.com'];
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
}