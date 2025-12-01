class EmployeeAttendance {
    constructor() {
        this.userId = null;
        this.isCheckedIn = false;
        this.currentPunchId = null;
        this.init();
    }

    init() {
        this.loadUserData();
        this.updateClock();
        this.loadTodayAttendance();
        this.setupEventListeners();
        
        setInterval(() => this.updateClock(), 1000);
    }

    loadUserData() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser && currentUser.id) {
            this.userId = currentUser.id;
            
            // Cập nhật thông tin user
            document.getElementById('user-name').textContent = currentUser.full_name || currentUser.username;
            document.getElementById('user-position').textContent = this.getRoleDisplayName(currentUser.role);
            
            const avatar = document.getElementById('user-avatar');
            if (currentUser.avatar_url) {
                avatar.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;">`;
            } else {
                const initials = currentUser.full_name ? 
                    currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'NV';
                avatar.textContent = initials;
            }
        } else {
            this.showNotification('Vui lòng đăng nhập', 'error');
            setTimeout(() => location.href = 'login.html', 2000);
        }
    }

    getRoleDisplayName(role) {
        const roleMap = {
            'employee': 'Nhân viên',
            'nhanvien': 'Nhân viên',
            'staff': 'Nhân viên'
        };
        return roleMap[role] || 'Nhân viên';
    }

    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('vi-VN');
        const dateString = now.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        document.getElementById('current-time').textContent = timeString;
        document.getElementById('current-date').textContent = dateString;
    }

    setupEventListeners() {
        document.getElementById('punch-btn').addEventListener('click', () => this.handlePunch());
    }

    async handlePunch() {
        if (!this.userId) {
            this.showNotification('Vui lòng đăng nhập', 'error');
            return;
        }

        try {
            const punchData = {
                user_id: this.userId,
                type: this.isCheckedIn ? 'out' : 'in'
            };

            const response = await this.apiCall('attendance.php', 'POST', punchData);
            
            if (response.success) {
                if (this.isCheckedIn) {
                    this.showNotification('Check-out thành công!', 'success');
                    this.isCheckedIn = false;
                    document.getElementById('punch-text').textContent = 'CHECK-IN';
                    document.getElementById('punch-btn').classList.remove('check-out');
                    document.getElementById('attendance-status').textContent = 
                        'Bạn đã Check-out lúc ' + new Date().toLocaleTimeString('vi-VN');
                } else {
                    this.showNotification('Check-in thành công!', 'success');
                    this.isCheckedIn = true;
                    this.currentPunchId = response.punch_id;
                    document.getElementById('punch-text').textContent = 'CHECK-OUT';
                    document.getElementById('punch-btn').classList.add('check-out');
                    document.getElementById('attendance-status').textContent = 
                        'Bạn đã Check-in lúc ' + new Date().toLocaleTimeString('vi-VN');
                }
                
                await this.loadTodayAttendance();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            this.showNotification('Lỗi: ' + error.message, 'error');
        }
    }

    async loadTodayAttendance() {
        if (!this.userId) return;

        try {
            const response = await this.apiCall(`attendance.php?user_id=${this.userId}&action=get_today_data`);
            
            if (response.success) {
                this.updateTodaySummary(response.today_data);
                
                // Cập nhật trạng thái nút
                if (response.today_data && response.today_data.check_in && !response.today_data.check_out) {
                    this.isCheckedIn = true;
                    document.getElementById('punch-text').textContent = 'CHECK-OUT';
                    document.getElementById('punch-btn').classList.add('check-out');
                } else {
                    this.isCheckedIn = false;
                    document.getElementById('punch-text').textContent = 'CHECK-IN';
                    document.getElementById('punch-btn').classList.remove('check-out');
                }
            }
        } catch (error) {
            console.error('Load today attendance error:', error);
        }
    }

    updateTodaySummary(todayData) {
        if (todayData && todayData.check_in) {
            document.getElementById('check-in-time').textContent = 
                new Date(todayData.check_in).toLocaleTimeString('vi-VN');
            document.getElementById('check-out-time').textContent = 
                todayData.check_out ? new Date(todayData.check_out).toLocaleTimeString('vi-VN') : '--:--';
            document.getElementById('total-hours').textContent = 
                todayData.total_hours ? todayData.total_hours + 'h' : '0h';
            
            let statusText = 'Đang làm';
            if (todayData.check_out) {
                statusText = todayData.status === 'late' ? 'Muộn' : 'Đã xong';
            } else if (todayData.status === 'late') {
                statusText = 'Muộn';
            }
            document.getElementById('work-status').textContent = statusText;
        } else {
            document.getElementById('check-in-time').textContent = '--:--';
            document.getElementById('check-out-time').textContent = '--:--';
            document.getElementById('total-hours').textContent = '0h';
            document.getElementById('work-status').textContent = 'Chưa làm';
        }
    }

    async apiCall(url, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

function logout() {
    Swal.fire({
        title: 'Xác nhận đăng xuất',
        text: 'Bạn có chắc chắn muốn đăng xuất?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('session_token');
            location.href = 'login.html';
        }
    });
}

// Khởi tạo hệ thống
document.addEventListener('DOMContentLoaded', function() {
    new EmployeeAttendance();
});