// Kiểm tra đăng nhập và phân quyền
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadUserData();
    setupEventListeners();
});

// Kiểm tra xác thực
function checkAuthentication() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const sessionToken = localStorage.getItem('session_token');
    
    console.log('🔐 Kiểm tra đăng nhập:', { currentUser, sessionToken });
    
    if (!currentUser || !sessionToken) {
        window.location.href = 'login.html';
        return;
    }
    
    // Kiểm tra role - chỉ cho phép nhân viên vào trang này
    const allowedRoles = ['employee', 'nhanvien', 'staff'];
    if (!allowedRoles.includes(currentUser.role)) {
        // Nếu không phải nhân viên, chuyển hướng về trang phù hợp
        if (currentUser.role === 'admin' || currentUser.role === 'quanly') {
            window.location.href = 'qlns.html';
        } else {
            window.location.href = 'login.html';
        }
        return;
    }
}

// Tải thông tin người dùng
function loadUserData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (currentUser) {
        // Cập nhật thông tin người dùng trong header
        const userAvatar = document.querySelector('.user-avatar');
        const userName = document.querySelector('.user-details h3');
        const userPosition = document.querySelector('.user-details p');
        
        // Hiển thị avatar hoặc chữ cái đầu
        if (currentUser.avatar_url || currentUser.picture) {
            userAvatar.innerHTML = `<img src="${currentUser.avatar_url || currentUser.picture}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            // Lấy chữ cái đầu từ tên
            const name = currentUser.full_name || currentUser.name || currentUser.username || 'NV';
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
            userAvatar.textContent = initials.substring(0, 2);
            userAvatar.style.display = 'flex';
            userAvatar.style.alignItems = 'center';
            userAvatar.style.justifyContent = 'center';
            userAvatar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            userAvatar.style.color = 'white';
            userAvatar.style.fontWeight = 'bold';
        }
        
        // Cập nhật tên và chức vụ
        if (userName) {
            userName.textContent = currentUser.full_name || currentUser.name || currentUser.username || 'Nguyễn Văn A';
        }
        if (userPosition) {
            userPosition.textContent = getRoleDisplayName(currentUser.role);
        }
    }
}

// Chuyển đổi role thành tên hiển thị
function getRoleDisplayName(role) {
    const roleMap = {
        'employee': 'Nhân viên',
        'nhanvien': 'Nhân viên',
        'staff': 'Nhân viên',
        'admin': 'Quản trị viên',
        'quanly': 'Quản lý'
    };
    return roleMap[role] || 'Nhân viên';
}

// Thiết lập sự kiện
function setupEventListeners() {
    // Xử lý đăng xuất - SỬA LẠI PHẦN NÀY
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔄 Click đăng xuất');
            logout();
        });
    }
    
    // Xử lý các liên kết sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '') {
                e.preventDefault();
                
                // Xóa active class từ tất cả các liên kết
                document.querySelectorAll('.sidebar-nav a').forEach(a => {
                    a.classList.remove('active');
                });
                
                // Thêm active class cho liên kết được click
                this.classList.add('active');
                
                // Xử lý các chức năng cụ thể
                const linkText = this.querySelector('span').textContent;
                handleSidebarClick(linkText);
            }
        });
    });

    // Xử lý các nút thao tác nhanh
    document.querySelectorAll('.action-btn').forEach(button => {
        button.addEventListener('click', function() {
            const actionText = this.querySelector('.action-text').textContent;
            
            switch(actionText) {
                case 'Chấm công':
                    handleTimekeeping();
                    break;
                case 'Đăng ký nghỉ phép':
                    handleLeaveRequest();
                    break;
                case 'Báo cáo công việc':
                    handleWorkReport();
                    break;
                case 'Xem lương':
                    handleViewSalary();
                    break;
            }
            
            // Hiệu ứng click
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // Xử lý thông báo
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', function() {
            Swal.fire({
                title: 'Thông báo',
                html: `
                    <div style="text-align:left; max-height:300px; overflow-y:auto;">
                        <div style="padding:10px; border-bottom:1px solid #eee;">
                            <strong>Chấm công thành công</strong><br>
                            <small>Hôm nay, 08:05</small>
                        </div>
                        <div style="padding:10px; border-bottom:1px solid #eee;">
                            <strong>Lịch họp tuần mới</strong><br>
                            <small>2 giờ trước</small>
                        </div>
                        <div style="padding:10px;">
                            <strong>Khóa đào tạo mới</strong><br>
                            <small>1 ngày trước</small>
                        </div>
                    </div>
                `,
                showCloseButton: true,
                showConfirmButton: false
            });
        });
    }
}

// Xử lý click sidebar
function handleSidebarClick(menuItem) {
    console.log('📱 Click menu:', menuItem);
    switch(menuItem) {
        case 'Thông tin cá nhân':
            window.location.href = 'profile_nhanvien.html';
            break;
        case 'Chấm công':
            window.location.href = 'nhanvien_chamcong.html';
            break;
        case 'Thời gian làm việc':
            showWorkTime();
            break;
        case 'Đào tạo':
            showTraining();
            break;
        case 'Hiệu suất':
            showPerformance();
            break;
        case 'Lịch làm việc':
            showWorkSchedule();
            break;
        case 'Lương & Phúc lợi':
            showSalaryBenefits();
            break;
        case 'Tài chính cá nhân':
            showPersonalFinance();
            break;
        case 'Đăng xuất':
            logout(); // Thêm xử lý cho đăng xuất
            break;
        default:
            // Trang chủ - không làm gì cả
            break;
    }
}

// Đăng xuất - SỬA LẠI HÀM NÀY
async function logout() {
    console.log('🚪 Bắt đầu đăng xuất...');
    
    const sessionToken = localStorage.getItem('session_token');
    
    try {
        const result = await Swal.fire({
            title: 'Xác nhận đăng xuất',
            text: 'Bạn có chắc chắn muốn đăng xuất?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Đăng xuất',
            cancelButtonText: 'Hủy'
        });

        if (!result.isConfirmed) {
            console.log('❌ Người dùng hủy đăng xuất');
            return;
        }

        // Hiển thị loading
        Swal.fire({
            title: 'Đang đăng xuất...',
            text: 'Vui lòng chờ trong giây lát',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Gọi API logout nếu có session token
        if (sessionToken) {
            try {
                const API_BASE_URL = 'http://localhost/unitop-php';
                const response = await fetch(`${API_BASE_URL}/logout.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        session_token: sessionToken
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (!result.success) {
                        console.warn('Logout warning:', result.message);
                    }
                }
            } catch (apiError) {
                console.warn('Lỗi API logout:', apiError);
                // Vẫn tiếp tục đăng xuất dù API có lỗi
            }
        }

        // Đóng loading
        Swal.close();

        // Xóa dữ liệu local storage
        localStorage.removeItem('currentUser');
        localStorage.removeItem('session_token');

        // Hiển thị thông báo thành công
        await Swal.fire({
            icon: 'success',
            title: 'Đăng xuất thành công',
            text: 'Bạn đã đăng xuất khỏi hệ thống',
            timer: 1500,
            showConfirmButton: false
        });

        console.log('✅ Đăng xuất thành công, chuyển hướng...');
        // Chuyển hướng về trang login
        window.location.href = 'login.html';

    } catch (error) {
        console.error('❌ Lỗi đăng xuất:', error);

        // Đóng loading nếu có lỗi
        Swal.close();

        // Vẫn tiếp tục đăng xuất ngay cả khi có lỗi
        localStorage.removeItem('currentUser');
        localStorage.removeItem('session_token');

        // Thông báo lỗi nhưng vẫn chuyển hướng
        await Swal.fire({
            icon: 'warning',
            title: 'Đã đăng xuất',
            text: 'Đã xảy ra lỗi nhưng bạn vẫn đã được đăng xuất khỏi hệ thống',
            timer: 2000,
            showConfirmButton: false
        });

        window.location.href = 'login.html';
    }
}

// Các hàm xử lý thao tác nhanh
function handleTimekeeping() {
    Swal.fire({
        title: 'Chấm công',
        text: 'Bạn đã chấm công thành công!',
        icon: 'success',
        timer: 2000
    });
}

function handleLeaveRequest() {
    Swal.fire({
        title: 'Đăng ký nghỉ phép',
        html: `
            <div style="text-align:left;">
                <label>Loại nghỉ phép:</label>
                <select class="swal2-input">
                    <option>Nghỉ phép năm</option>
                    <option>Nghỉ ốm</option>
                    <option>Nghỉ việc riêng</option>
                </select>
                <label>Từ ngày:</label>
                <input type="date" class="swal2-input">
                <label>Đến ngày:</label>
                <input type="date" class="swal2-input">
                <label>Lý do:</label>
                <textarea class="swal2-textarea" placeholder="Nhập lý do nghỉ phép..."></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Gửi đơn',
        preConfirm: () => {
            // Xử lý gửi đơn ở đây
        }
    });
}

function handleWorkReport() {
    Swal.fire({
        title: 'Báo cáo công việc',
        text: 'Tính năng đang được phát triển',
        icon: 'info'
    });
}

function handleViewSalary() {
    Swal.fire({
        title: 'Xem lương',
        text: 'Tính năng đang được phát triển',
        icon: 'info'
    });
}

// Các hàm hiển thị (giữ nguyên)
function showPersonalInfo() {
    console.log('Hiển thị thông tin cá nhân');
}

function showTimekeeping() {
    console.log('Hiển thị chấm công');
}

function showWorkTime() {
    console.log('Hiển thị thời gian làm việc');
}

function showTraining() {
    console.log('Hiển thị đào tạo');
}

function showPerformance() {
    console.log('Hiển thị hiệu suất');
}

function showWorkSchedule() {
    console.log('Hiển thị lịch làm việc');
}

function showSalaryBenefits() {
    console.log('Hiển thị lương & phúc lợi');
}

function showPersonalFinance() {
    console.log('Hiển thị tài chính cá nhân');
}

// Xử lý lỗi toàn cục
window.addEventListener('error', function(e) {
    console.error('Lỗi toàn cục:', e.error);
});