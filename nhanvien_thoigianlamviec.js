// nhanvien_thoigianlamviec.js - Quản lý thời gian làm việc nhân viên

let currentUser = null;
let workTimeData = [];
let timeDistributionChart = null;
let workTrendChart = null;

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    console.log('Trang thời gian làm việc được tải');
    
    // Kiểm tra đăng nhập
    checkAuthentication();
    
    // Thiết lập sự kiện
    setupEventListeners();
    
    // Cập nhật thông tin user
    updateUserInfo();
    
    // Tải dữ liệu thời gian làm việc
    loadWorkTimeData();
});

// Kiểm tra xác thực
function checkAuthentication() {
    const currentUserData = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const sessionToken = localStorage.getItem('session_token');
    
    console.log('🔐 Kiểm tra đăng nhập:', { currentUserData, sessionToken });
    
    if (!currentUserData || !sessionToken) {
        window.location.href = 'login.html';
        return;
    }
    
    // Kiểm tra role - chỉ cho phép nhân viên vào trang này
    const allowedRoles = ['employee', 'nhanvien', 'staff'];
    if (!allowedRoles.includes(currentUserData.role)) {
        if (currentUserData.role === 'admin' || currentUserData.role === 'quanly') {
            window.location.href = 'qlns.html';
        } else {
            window.location.href = 'login.html';
        }
        return;
    }
    
    currentUser = currentUserData;
}

// Cập nhật thông tin người dùng
function updateUserInfo() {
    if (!currentUser) return;

    const userAvatar = document.querySelector('.user-avatar');
    const userName = document.getElementById('user-name');
    const userPosition = document.getElementById('user-position');
    
    // Hiển thị avatar hoặc chữ cái đầu
    if (currentUser.avatar_url || currentUser.picture) {
        userAvatar.innerHTML = `<img src="${currentUser.avatar_url || currentUser.picture}" alt="Avatar">`;
    } else {
        const name = currentUser.full_name || currentUser.name || currentUser.username || 'NV';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        userAvatar.textContent = initials.substring(0, 2);
    }
    
    // Cập nhật tên và chức vụ
    if (userName) {
        userName.textContent = currentUser.full_name || currentUser.name || currentUser.username || 'Nguyễn Văn A';
    }
    if (userPosition) {
        userPosition.textContent = getRoleDisplayName(currentUser.role);
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
    // Xử lý đăng xuất
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            logout();
        });
    }
    
    // Lọc dữ liệu theo tháng
    const filterBtn = document.getElementById('filter-btn');
    const monthFilter = document.getElementById('month-filter');
    
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            loadWorkTimeData();
        });
    }
    
    if (monthFilter) {
        monthFilter.addEventListener('change', function() {
            loadWorkTimeData();
        });
    }
    
    // Xuất Excel
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
    
    // Refresh dữ liệu
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadWorkTimeData();
        });
    }
    
    // Xử lý thông báo
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', showNotifications);
    }
}

// Tải dữ liệu thời gian làm việc
async function loadWorkTimeData() {
    showLoadingState();
    
    try {
        const monthFilter = document.getElementById('month-filter').value;
        const [year, month] = monthFilter.split('-');
        
        // Giả lập API call - trong thực tế sẽ gọi API thật
        const response = await fetchWorkTimeData(year, month);
        workTimeData = response.data;
        
        // Cập nhật giao diện
        updateSummaryCards(response.summary);
        renderWorkTimeTable(workTimeData);
        updateCharts(workTimeData, response.summary);
        
        hideLoadingState();
        
    } catch (error) {
        console.error('❌ Lỗi tải dữ liệu:', error);
        showErrorState('Không thể tải dữ liệu thời gian làm việc');
    }
}

// Giả lập API lấy dữ liệu thời gian làm việc
async function fetchWorkTimeData(year, month) {
    // Giả lập delay API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Dữ liệu mẫu
    const sampleData = generateSampleWorkTimeData(year, month);
    
    return {
        success: true,
        data: sampleData.workDays,
        summary: sampleData.summary
    };
}

// Tạo dữ liệu mẫu
function generateSampleWorkTimeData(year, month) {
    const workDays = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    let totalHours = 0;
    let overtimeHours = 0;
    let workDaysCount = 0;
    let leaveDaysCount = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        // Bỏ qua cuối tuần (0: Chủ nhật, 6: Thứ 7)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const status = Math.random() > 0.1 ? 'present' : 
                          Math.random() > 0.5 ? 'late' : 'leave';
            
            let checkIn = '08:00';
            let checkOut = '17:00';
            let total = 8;
            let overtime = 0;
            
            if (status === 'late') {
                checkIn = '08:' + (15 + Math.floor(Math.random() * 45)).toString().padStart(2, '0');
                total = 7.5;
            } else if (status === 'leave') {
                checkIn = '--:--';
                checkOut = '--:--';
                total = 0;
                leaveDaysCount++;
            } else {
                workDaysCount++;
                // Random overtime
                if (Math.random() > 0.7) {
                    overtime = Math.floor(Math.random() * 3) + 1;
                    overtimeHours += overtime;
                    checkOut = (17 + overtime) + ':00';
                    total += overtime;
                }
            }
            
            totalHours += total;
            
            workDays.push({
                date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
                dayOfWeek: getDayOfWeekVietnamese(dayOfWeek),
                checkIn,
                checkOut,
                total: total > 0 ? total + 'h' : '--',
                overtime: overtime > 0 ? overtime + 'h' : '--',
                status,
                note: getStatusNote(status)
            });
        }
    }
    
    return {
        workDays,
        summary: {
            totalDays: workDaysCount,
            totalHours: Math.round(totalHours * 10) / 10,
            overtimeHours: Math.round(overtimeHours * 10) / 10,
            leaveDays: leaveDaysCount
        }
    };
}

// Lấy tên thứ tiếng Việt
function getDayOfWeekVietnamese(day) {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return days[day];
}

// Lấy ghi chú theo trạng thái
function getStatusNote(status) {
    const notes = {
        'present': 'Làm việc bình thường',
        'late': 'Đi làm muộn',
        'leave': 'Nghỉ phép',
        'absent': 'Nghỉ không phép'
    };
    return notes[status] || '';
}

// Cập nhật thẻ tổng quan
function updateSummaryCards(summary) {
    document.getElementById('total-days').textContent = summary.totalDays;
    document.getElementById('total-hours').textContent = summary.totalHours + 'h';
    document.getElementById('overtime-hours').textContent = summary.overtimeHours + 'h';
    document.getElementById('leave-days').textContent = summary.leaveDays;
}

// Render bảng thời gian làm việc
function renderWorkTimeTable(data) {
    const tbody = document.getElementById('work-time-body');
    
    if (!data || data.length === 0) {
        showEmptyState();
        return;
    }
    
    tbody.innerHTML = data.map(day => `
        <tr>
            <td>${day.date}</td>
            <td>${day.dayOfWeek}</td>
            <td>${day.checkIn}</td>
            <td>${day.checkOut}</td>
            <td>${day.total}</td>
            <td>${day.overtime}</td>
            <td>
                <span class="status-badge status-${day.status}">
                    ${getStatusText(day.status)}
                </span>
            </td>
            <td>${day.note}</td>
        </tr>
    `).join('');
}

// Lấy text trạng thái
function getStatusText(status) {
    const statusMap = {
        'present': 'Đúng giờ',
        'late': 'Đi muộn',
        'leave': 'Nghỉ phép',
        'absent': 'Vắng mặt'
    };
    return statusMap[status] || status;
}

// Cập nhật biểu đồ
function updateCharts(data, summary) {
    updateTimeDistributionChart(summary);
    updateWorkTrendChart(data);
}

// Biểu đồ phân bổ thời gian
function updateTimeDistributionChart(summary) {
    const ctx = document.getElementById('timeDistributionChart').getContext('2d');
    
    if (timeDistributionChart) {
        timeDistributionChart.destroy();
    }
    
    timeDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Giờ làm chính', 'Tăng ca', 'Nghỉ phép'],
            datasets: [{
                data: [
                    summary.totalHours - summary.overtimeHours,
                    summary.overtimeHours,
                    summary.leaveDays * 8 // Giả sử mỗi ngày nghỉ = 8h
                ],
                backgroundColor: [
                    '#3498db',
                    '#e67e22',
                    '#9b59b6'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Biểu đồ xu hướng làm việc
function updateWorkTrendChart(data) {
    const ctx = document.getElementById('workTrendChart').getContext('2d');
    
    if (workTrendChart) {
        workTrendChart.destroy();
    }
    
    // Lấy dữ liệu 7 ngày gần nhất
    const recentData = data.slice(-7);
    
    workTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: recentData.map(day => day.date.split('/')[0]),
            datasets: [{
                label: 'Giờ làm mỗi ngày',
                data: recentData.map(day => {
                    const total = day.total.replace('h', '');
                    return total === '--' ? 0 : parseFloat(total);
                }),
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 12,
                    title: {
                        display: true,
                        text: 'Giờ làm'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Ngày'
                    }
                }
            }
        }
    });
}

// Xuất Excel
function exportToExcel() {
    Swal.fire({
        title: 'Xuất Excel',
        text: 'Tính năng đang được phát triển',
        icon: 'info',
        confirmButtonText: 'Đã hiểu'
    });
}

// Hiển thị thông báo
function showNotifications() {
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
                    <strong>Bảng lương tháng 12</strong><br>
                    <small>1 ngày trước</small>
                </div>
            </div>
        `,
        showCloseButton: true,
        showConfirmButton: false
    });
}

// Quản lý trạng thái loading
function showLoadingState() {
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('work-time-body').innerHTML = '';
}

function hideLoadingState() {
    document.getElementById('loading-state').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('empty-state').style.display = 'block';
    document.getElementById('work-time-body').innerHTML = '';
}

function showErrorState(message) {
    hideLoadingState();
    Swal.fire({
        icon: 'error',
        title: 'Lỗi',
        text: message,
        confirmButtonText: 'Thử lại'
    }).then(() => {
        loadWorkTimeData();
    });
}

// Đăng xuất
async function logout() {
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

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Đang đăng xuất...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // Gọi API logout nếu có
        if (sessionToken) {
            try {
                const API_BASE_URL = 'http://localhost/unitop-php';
                await fetch(`${API_BASE_URL}/logout.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_token: sessionToken })
                });
            } catch (error) {
                console.warn('Lỗi API logout:', error);
            }
        }

        // Xóa dữ liệu và chuyển hướng
        localStorage.removeItem('currentUser');
        localStorage.removeItem('session_token');

        Swal.close();
        await Swal.fire({
            icon: 'success',
            title: 'Đăng xuất thành công',
            timer: 1500,
            showConfirmButton: false
        });

        window.location.href = 'login.html';

    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
    }
}

// Xử lý lỗi toàn cục
window.addEventListener('error', function(e) {
    console.error('Lỗi toàn cục:', e.error);
});