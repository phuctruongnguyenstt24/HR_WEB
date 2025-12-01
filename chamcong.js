// ===== CHẤM CÔNG JAVASCRIPT =====

class AttendanceSystem {
    constructor() {
        this.isCheckedIn = false;
        this.currentPunchId = null;
        this.userId = null;
        this.userRole = null; // THÊM DÒNG NÀY
        this.isAdmin = false; // THÊM DÒNG NÀY
        this.init();
        this.setupSalaryEventListeners();
    }


    // Thêm phương thức setupSalaryEventListeners
    setupSalaryEventListeners() {
        document.getElementById('calculate-salary-btn').addEventListener('click', () => this.calculateSalary());
        document.getElementById('export-salary-btn').addEventListener('click', () => this.exportSalary());
    }

    //Thêm 1 
    async loadAllAttendanceData() {
        try {
            const response = await this.apiCall('attendance.php', 'POST', {
                action: 'get_all_data'
            });

            if (response.success) {
                this.updateAllAttendanceLog(response.all_logs);
                this.updateAdminStats(response.stats);
            }
        } catch (error) {
            console.error('Load all attendance data error:', error);
        }
    }

    //Thêm 2 

   updateAllAttendanceLog(logs) {
    const logBody = document.getElementById('log-body');
    logBody.innerHTML = '';

    if (!logs || logs.length === 0) {
        logBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Chưa có dữ liệu chấm công</td></tr>';
        return;
    }

    logs.forEach(log => {
        const row = document.createElement('tr');

        const checkInTime = log.check_in ? new Date(log.check_in).toLocaleTimeString('vi-VN') : '-';
        const checkOutTime = log.check_out ? new Date(log.check_out).toLocaleTimeString('vi-VN') : '-';

        // HIỂN THỊ TỔNG GIỜ LÀM CHI TIẾT HƠN
        let totalHoursDisplay = '-';
        if (log.total_hours) {
            const hours = Math.floor(log.total_hours);
            const minutes = Math.round((log.total_hours % 1) * 60);

            if (hours === 0 && minutes > 0) {
                totalHoursDisplay = `${minutes} phút`;
            } else if (minutes === 0) {
                totalHoursDisplay = `${hours} giờ`;
            } else {
                totalHoursDisplay = `${hours}h ${minutes}m`;
            }
        }

        let statusBadge = '';
        switch (log.status) {
            case 'late':
                statusBadge = '<span class="status-badge status-late">Đến muộn</span>';
                break;
            case 'absent':
                statusBadge = '<span class="status-badge status-absent">Vắng</span>';
                break;
            case 'present':
                statusBadge = '<span class="status-badge status-present">Đúng giờ</span>';
                break;
            default:
                statusBadge = '<span class="status-badge">-</span>';
        }

        // SỬA THỨ TỰ CÁC CỘT Ở ĐÂY:
  row.innerHTML = `
    <td>${new Date(log.date).toLocaleDateString('vi-VN')}</td>
     <td>
        <strong>${log.full_name}</strong>
        <div style="font-size: 12px; color: #666;">${log.department || 'Chưa có'}</div>
    </td>
    <td>${checkInTime}</td>
    <td>${checkOutTime}</td>
    <td>${statusBadge}</td>
    <td>${totalHoursDisplay}</td>
     
`;

        logBody.appendChild(row);
    });
}

    //Thêm 3 
    updateAdminStats(stats) {
        if (stats) {
            // Cập nhật thống kê tổng quan cho admin
            document.getElementById('weekly-hours').textContent =
                `${stats.total_hours || 0} giờ`;
            document.getElementById('late-count').textContent = `${stats.total_late || 0} lần`;
            document.getElementById('overtime-hours').textContent =
                `${stats.total_employees || 0} nhân viên`;
        }
    }



    // Thêm phương thức calculateSalary
    async calculateSalary() {
        if (!this.userId) {
            this.showNotification('Vui lòng đăng nhập để sử dụng tính năng này', 'error');
            return;
        }

        const month = document.getElementById('salary-month').value;
        if (!month) {
            this.showNotification('Vui lòng chọn tháng cần tính lương', 'error');
            return;
        }

        try {
            const response = await this.apiCall('attendance.php', 'POST', {
                user_id: this.userId,
                action: 'calculate_salary',
                month: month
            });

            if (response.success) {
                this.displaySalaryResult(response.salary_data, month);
            } else {
                throw new Error(response.message || 'Có lỗi xảy ra khi tính lương');
            }
        } catch (error) {
            console.error('Calculate salary error:', error);
            this.showNotification('Có lỗi xảy ra: ' + error.message, 'error');
        }
    }

    // Thêm phương thức displaySalaryResult
    displaySalaryResult(salaryData, month) {
        // Hiển thị khu vực kết quả
        document.getElementById('salary-result').style.display = 'block';
        document.getElementById('salary-details').style.display = 'block';

        // Cập nhật tháng hiển thị
        document.getElementById('salary-month-display').textContent =
            new Date(month + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

        // Định dạng tiền tệ
        const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        });

        // Cập nhật tổng quan lương
        document.getElementById('basic-salary').textContent = formatter.format(salaryData.basic_salary);
        document.getElementById('total-work-hours').textContent = `${salaryData.total_hours} giờ`;
        document.getElementById('hourly-salary').textContent = formatter.format(salaryData.hourly_salary);
        document.getElementById('overtime-hours-salary').textContent = `${salaryData.overtime_hours} giờ`;
        document.getElementById('overtime-salary').textContent = formatter.format(salaryData.overtime_pay);
        document.getElementById('leave-days').textContent = `${salaryData.leave_days} ngày`;
        document.getElementById('leave-deduction').textContent = formatter.format(salaryData.leave_deduction);
        document.getElementById('net-salary').textContent = formatter.format(salaryData.net_salary);

        // Cập nhật chi tiết theo ngày
        this.updateDailySalaryTable(salaryData.daily_details);
    }

    // Thêm phương thức updateDailySalaryTable
    updateDailySalaryTable(dailyDetails) {
        const tbody = document.getElementById('daily-salary-body');
        tbody.innerHTML = '';

        if (!dailyDetails || dailyDetails.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 20px; color: #666;">
                    Không có dữ liệu chấm công cho tháng này
                </td>
            </tr>
        `;
            return;
        }

        const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        });

        dailyDetails.forEach(day => {
            const row = document.createElement('tr');

            let statusBadge = '';
            switch (day.status) {
                case 'present':
                    statusBadge = '<span class="status-badge status-present">Đúng giờ</span>';
                    break;
                case 'late':
                    statusBadge = '<span class="status-badge status-late">Muộn</span>';
                    break;
                case 'absent':
                    statusBadge = '<span class="status-badge status-absent">Vắng</span>';
                    break;
                case 'holiday':
                    statusBadge = '<span class="status-badge" style="background: #9b59b6;">Ngày lễ</span>';
                    break;
                default:
                    statusBadge = '<span class="status-badge">-</span>';
            }

            row.innerHTML = `
            <td>${new Date(day.date).toLocaleDateString('vi-VN')}</td>
            <td>${day.check_in || '-'}</td>
            <td>${day.check_out || '-'}</td>
            <td>${day.total_hours || '0'} giờ</td>
            <td>${day.regular_hours || '0'} giờ</td>
            <td>${day.overtime_hours || '0'} giờ</td>
            <td>${day.daily_salary ? formatter.format(day.daily_salary) : '0 VNĐ'}</td>
            <td>${statusBadge}</td>
        `;

            tbody.appendChild(row);
        });
    }

    // Sửa phương thức exportSalary trong chamcong.js
    async exportSalary() {
        if (!this.userId) {
            this.showNotification('Vui lòng đăng nhập để sử dụng tính năng này', 'error');
            return;
        }

        const month = document.getElementById('salary-month').value;
        if (!month) {
            this.showNotification('Vui lòng chọn tháng cần xuất bảng lương', 'error');
            return;
        }

        try {
            this.showNotification('Đang xuất file Excel...', 'info');

            const response = await this.apiCall('attendance.php', 'POST', {
                user_id: this.userId,
                action: 'export_salary',
                month: month
            });

            if (response.success && response.download_url) {
                // Tạo link tải xuống
                const link = document.createElement('a');
                link.href = response.download_url;
                link.download = `bang_luong_${month}.csv`;
                link.target = '_blank';

                // Thêm vào DOM và click
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.showNotification('Đã xuất file Excel thành công!', 'success');
            } else {
                throw new Error(response.message || 'Có lỗi xảy ra khi xuất file Excel');
            }
        } catch (error) {
            console.error('Export salary error:', error);
            this.showNotification('Có lỗi xảy ra: ' + error.message, 'error');
        }
    }

    // Trong phương thức init(), thêm:
    init() {
        this.loadUserData();
        this.updateClock();
        this.setupEventListeners();
        this.setupSalaryEventListeners();

        // PHÂN BIỆT THEO QUYỀN
        if (this.isAdmin) {
            this.loadAllAttendanceData(); // Cho admin: load tất cả dữ liệu
        } else {
            this.loadAttendanceData(); // Cho nhân viên: chỉ load dữ liệu cá nhân
        }

        setInterval(() => this.updateClock(), 1000);

        // Auto-refresh mỗi 30 giây (chỉ cho admin)
        if (this.isAdmin) {
            setInterval(() => {
                this.loadAllAttendanceData();
            }, 30000);
        }
    }

    loadUserData() {
        // SỬA PHƯƠNG THỨC NÀY
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        if (currentUser && currentUser.id) {
            this.userId = currentUser.id;
            this.userRole = currentUser.role;
            this.isAdmin = this.userRole === 'admin' || this.userRole === 'manager';

            // Cập nhật tên user trên giao diện
            const usernameElements = document.querySelectorAll('#username, #sidebar-username');
            usernameElements.forEach(el => {
                if (el) el.textContent = currentUser.full_name || currentUser.username;
            });

            // Ẩn/HIỆN tính năng theo quyền
            this.toggleFeaturesByRole();
        } else {
            console.warn('Chưa đăng nhập. Vui lòng đăng nhập để sử dụng hệ thống chấm công.');
            this.showNotification('Vui lòng đăng nhập để sử dụng hệ thống chấm công', 'error');
        }
    }

    // THÊM PHƯƠNG THỨC MỚI
    toggleFeaturesByRole() {
        if (this.isAdmin) {
            // Hiển thị tất cả tính năng cho admin
            console.log('Admin mode activated');
        } else {
            // Ẩn một số tính năng không cần thiết cho nhân viên
            const clearLogBtn = document.getElementById('clear-log-btn');
            if (clearLogBtn) clearLogBtn.style.display = 'none';

            // Có thể ẩn thêm các nút khác nếu cần
        }
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
        document.getElementById('current-date-full').textContent = dateString;
    }

    setupEventListeners() {
        // Nút chấm công
        document.getElementById('punch-btn').addEventListener('click', () => this.handlePunch());

        // Modal nghỉ phép
        document.getElementById('open-leave-form-btn').addEventListener('click', () => this.openLeaveModal());
        document.getElementById('cancel-leave-btn').addEventListener('click', () => this.closeLeaveModal());
        document.getElementById('leave-form').addEventListener('submit', (e) => this.submitLeaveRequest(e));

        // Xóa nhật ký
        document.getElementById('clear-log-btn').addEventListener('click', () => this.clearAttendanceLog());

        // Đóng modal khi click bên ngoài
        document.getElementById('leave-modal').addEventListener('click', (e) => {
            if (e.target.id === 'leave-modal') {
                this.closeLeaveModal();
            }
        });

        // Nút làm mới dữ liệu
        const refreshBtn = document.getElementById('refresh-all-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAllAttendanceData());
        }


    }


    async handlePunch() {
        if (!this.userId) {
            this.showNotification('Vui lòng đăng nhập để sử dụng tính năng này', 'error');
            return;
        }

        try {
            // SỬA: Không gửi timestamp từ client nữa, để server tự xử lý
            const punchData = {
                user_id: this.userId,
                type: this.isCheckedIn ? 'out' : 'in'
                // KHÔNG GỬI timestamp nữa
            };

            const response = await this.apiCall('attendance.php', 'POST', punchData);

            if (response.success) {
                // SỬA: Sử dụng thời gian hiện tại từ client để hiển thị (chỉ để hiển thị)
                const now = new Date();
                const localTimeString = now.toLocaleTimeString('vi-VN');

                if (this.isCheckedIn) {
                    this.showNotification('Check-out thành công!', 'success');
                    this.isCheckedIn = false;
                    document.getElementById('punch-text').textContent = 'Check-in';
                    document.getElementById('punch-btn').classList.remove('punch-out');
                    document.getElementById('punch-status-text').textContent = 'Bạn đã Check-out lúc ' + localTimeString;

                    document.getElementById('punch-btn').disabled = true;
                    document.getElementById('punch-btn').style.opacity = '0.6';
                    document.getElementById('punch-btn').style.cursor = 'not-allowed';

                } else {
                    this.showNotification('Check-in thành công!', 'success');
                    this.isCheckedIn = true;
                    this.currentPunchId = response.punch_id;
                    document.getElementById('punch-text').textContent = 'Check-out';
                    document.getElementById('punch-btn').classList.add('punch-out');
                    document.getElementById('punch-status-text').textContent = 'Bạn đã Check-in lúc ' + localTimeString;

                    document.getElementById('punch-btn').disabled = false;
                    document.getElementById('punch-btn').style.opacity = '1';
                    document.getElementById('punch-btn').style.cursor = 'pointer';
                }

                // Load lại dữ liệu ngay lập tức
                await this.loadAttendanceData();
            } else {
                throw new Error(response.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Punch error:', error);
            this.showNotification('Có lỗi xảy ra: ' + error.message, 'error');
        }
    }

    async loadAttendanceData() {
        if (!this.userId) {
            this.updateAttendanceLog([]);
            return;
        }

        try {
            const response = await this.apiCall(`attendance.php?user_id=${this.userId}&action=get_data`);

            if (response.success) {
                this.updateStats(response.stats);
                this.updateAttendanceLog(response.logs);
                this.updateLeaveHistory(response.leave_requests);

                // Kiểm tra trạng thái check-in hiện tại
                if (response.current_status && response.current_status.is_checked_in) {
                    this.isCheckedIn = true;
                    this.currentPunchId = response.current_status.punch_id;
                    document.getElementById('punch-text').textContent = 'Check-out';
                    document.getElementById('punch-btn').classList.add('punch-out');
                    document.getElementById('punch-status-text').textContent =
                        'Bạn đã Check-in lúc ' + new Date(response.current_status.check_in_time).toLocaleTimeString('vi-VN');

                    // KÍCH HOẠT NÚT CHECK-OUT
                    document.getElementById('punch-btn').disabled = false;
                } else {
                    this.isCheckedIn = false;
                    document.getElementById('punch-text').textContent = 'Check-in';
                    document.getElementById('punch-btn').classList.remove('punch-out');

                    // KIỂM TRA: Nếu đã có dữ liệu chấm công hôm nay thì disable nút
                    const today = new Date().toLocaleDateString('vi-VN');
                    const hasTodayRecord = response.logs && response.logs.some(log =>
                        new Date(log.date).toLocaleDateString('vi-VN') === today
                    );

                    if (hasTodayRecord) {
                        document.getElementById('punch-status-text').textContent = 'Bạn đã hoàn thành chấm công hôm nay';
                        document.getElementById('punch-btn').disabled = true;
                        document.getElementById('punch-btn').style.opacity = '0.6';
                        document.getElementById('punch-btn').style.cursor = 'not-allowed';
                    } else {
                        document.getElementById('punch-status-text').textContent = 'Bạn chưa Check-in';
                        document.getElementById('punch-btn').disabled = false;
                        document.getElementById('punch-btn').style.opacity = '1';
                        document.getElementById('punch-btn').style.cursor = 'pointer';
                    }
                }
            } else {
                this.updateAttendanceLog([]);
            }
        } catch (error) {
            console.error('Load attendance data error:', error);
            this.updateAttendanceLog([]);
        }
    }
    updateStats(stats) {
        if (stats) {
            document.getElementById('weekly-hours').textContent =
                `${stats.weekly_hours || 0} giờ ${stats.weekly_minutes || 0} phút`;
            document.getElementById('late-count').textContent = `${stats.late_count || 0} lần`;
            document.getElementById('overtime-hours').textContent =
                `${stats.overtime_hours || 0} giờ ${stats.overtime_minutes || 0} phút`;
        } else {
            document.getElementById('weekly-hours').textContent = '0 giờ 0 phút';
            document.getElementById('late-count').textContent = '0 lần';
            document.getElementById('overtime-hours').textContent = '0 giờ 0 phút';
        }
    }

    updateAttendanceLog(logs) {
        const logBody = document.getElementById('log-body');
        logBody.innerHTML = '';

        if (!logs || logs.length === 0) {
            logBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #666;">Chưa có dữ liệu chấm công</td></tr>';
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');

            const checkInTime = log.check_in ? new Date(log.check_in).toLocaleTimeString('vi-VN') : '-';
            const checkOutTime = log.check_out ? new Date(log.check_out).toLocaleTimeString('vi-VN') : '-';

            // HIỂN THỊ TỔNG GIỜ LÀM CHI TIẾT HƠN
            let totalHoursDisplay = '-';
            if (log.total_hours) {
                const hours = Math.floor(log.total_hours);
                const minutes = Math.round((log.total_hours % 1) * 60);

                if (hours === 0 && minutes > 0) {
                    totalHoursDisplay = `${minutes} phút`;
                } else if (minutes === 0) {
                    totalHoursDisplay = `${hours} giờ`;
                } else {
                    totalHoursDisplay = `${hours}h ${minutes}m`;
                }
            }

            let statusBadge = '';
            let lateInfo = '';

            if (log.status === 'late') {
                statusBadge = '<span class="status-badge status-late">Đến muộn</span>';

                // TÍNH SỐ PHÚT MUỘN - KIỂM TRA CẢ 2 CA
                const checkInTimeObj = new Date(log.check_in);
                const checkInHour = checkInTimeObj.getHours();

                let expectedTime;
                let shiftType = '';

                if (checkInHour < 12) {
                    // CA SÁNG: muộn sau 8:15
                    expectedTime = new Date(log.date + 'T08:15:00+07:00');
                    shiftType = 'sáng';
                } else {
                    // CA CHIỀU: muộn sau 13:30
                    expectedTime = new Date(log.date + 'T13:30:00+07:00');
                    shiftType = 'chiều';
                }

                const minutesLate = Math.round((checkInTimeObj - expectedTime) / (1000 * 60));

                if (minutesLate > 0) {
                    lateInfo = `<div style="font-size: 12px; color: #e74c3c;">Muộn ${minutesLate} phút (ca ${shiftType})</div>`;
                }
            } else if (log.status === 'absent') {
                statusBadge = '<span class="status-badge status-absent">Vắng</span>';
            } else if (log.status === 'present') {
                statusBadge = '<span class="status-badge status-present">Đúng giờ</span>';

                // HIỂN THỊ THỜI GIAN CHECK-IN - CẬP NHẬT CHO CẢ 2 CA
                const checkInTimeObj = new Date(log.check_in);
                const checkInHour = checkInTimeObj.getHours();
                const checkInMinute = checkInTimeObj.getMinutes();

                let shiftType = checkInHour < 12 ? 'sáng' : 'chiều';

                if ((checkInHour === 8 && checkInMinute <= 15) || (checkInHour === 13 && checkInMinute <= 30)) {
                    lateInfo = `<div style="font-size: 12px; color: #27ae60;">Đúng giờ (ca ${shiftType})</div>`;
                } else if ((checkInHour < 8) || (checkInHour === 12) || (checkInHour === 13 && checkInMinute < 30)) {
                    lateInfo = `<div style="font-size: 12px; color: #27ae60;">Đến sớm (ca ${shiftType})</div>`;
                }
            } else {
                statusBadge = '<span class="status-badge">-</span>';
            }

            // THÊM THÔNG TIN CA LÀM
            let shiftInfo = '';
            const checkInTimeObj = log.check_in ? new Date(log.check_in) : null;
            if (checkInTimeObj) {
                const hour = checkInTimeObj.getHours();
                if (hour < 12) {
                    shiftInfo = '<div style="font-size: 12px; color: #3498db;">Ca sáng (8:00-12:00)</div>';
                } else {
                    shiftInfo = '<div style="font-size: 12px; color: #e67e22;">Ca chiều (13:00-17:00)</div>';
                }
            }

            row.innerHTML = `
            <td>${new Date(log.date).toLocaleDateString('vi-VN')}</td>
             <td>
                <strong>${log.full_name}</strong>
                <div style="font-size: 12px; color: #666;">${log.department || 'Chưa có'}</div>
            </td>
            <td>
                ${checkInTime}
                ${lateInfo}
                ${shiftInfo}
            </td>
            <td>${checkOutTime}</td>
            
            <td>${statusBadge}</td>
             <td>${totalHoursDisplay}</td>
        `;

            logBody.appendChild(row);
        });
    }
    updateLeaveHistory(requests) {
        const leaveBody = document.getElementById('leave-requests-body');
        leaveBody.innerHTML = '';

        if (!requests || requests.length === 0) {
            leaveBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">Chưa có đơn xin nghỉ phép</td></tr>';
            return;
        }

        requests.forEach(request => {
            const row = document.createElement('tr');

            let statusClass = '';
            let statusText = '';
            switch (request.status) {
                case 'approved':
                    statusClass = 'status-present';
                    statusText = 'Đã duyệt';
                    break;
                case 'rejected':
                    statusClass = 'status-absent';
                    statusText = 'Từ chối';
                    break;
                default:
                    statusClass = 'status-late';
                    statusText = 'Chờ duyệt';
            }

            row.innerHTML = `
                <td>${new Date(request.leave_date).toLocaleDateString('vi-VN')}</td>
                <td>${request.leave_type}</td>
                <td>${request.reason}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            `;

            leaveBody.appendChild(row);
        });
    }

    openLeaveModal() {
        if (!this.userId) {
            this.showNotification('Vui lòng đăng nhập để sử dụng tính năng này', 'error');
            return;
        }

        document.getElementById('leave-modal').classList.remove('hidden');
        // Set min date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('leave-date').min = today;
    }

    closeLeaveModal() {
        document.getElementById('leave-modal').classList.add('hidden');
        document.getElementById('leave-form').reset();
    }

    async submitLeaveRequest(e) {
        e.preventDefault();

        if (!this.userId) {
            this.showNotification('Vui lòng đăng nhập để sử dụng tính năng này', 'error');
            return;
        }

        const formData = {
            user_id: this.userId,
            leave_date: document.getElementById('leave-date').value,
            leave_type: document.getElementById('leave-type').value,
            reason: document.getElementById('leave-reason').value
        };

        try {
            const response = await this.apiCall('attendance.php', 'POST', {
                ...formData,
                action: 'submit_leave'
            });

            if (response.success) {
                this.showNotification('Đã gửi đơn xin nghỉ phép thành công!', 'success');
                this.closeLeaveModal();
                this.loadAttendanceData();
            } else {
                throw new Error(response.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Submit leave request error:', error);
            this.showNotification('Có lỗi xảy ra: ' + error.message, 'error');
        }
    }

    async clearAttendanceLog() {
        if (!this.userId) {
            this.showNotification('Vui lòng đăng nhập để sử dụng tính năng này', 'error');
            return;
        }

        if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký chấm công? Hành động này không thể hoàn tác.')) {
            return;
        }

        try {
            const response = await this.apiCall('attendance.php', 'POST', {
                user_id: this.userId,
                action: 'clear_log'
            });

            if (response.success) {
                this.showNotification('Đã xóa nhật ký chấm công!', 'success');
                this.loadAttendanceData();
            } else {
                throw new Error(response.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Clear log error:', error);
            this.showNotification('Có lỗi xảy ra: ' + error.message, 'error');
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
        // Tạo thông báo tạm thời
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Thêm style cho notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
        `;

        if (type === 'success') {
            notification.style.background = '#28a745';
        } else if (type === 'error') {
            notification.style.background = '#dc3545';
        } else {
            notification.style.background = '#17a2b8';
        }

        document.body.appendChild(notification);

        // Tự động xóa sau 3 giây
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

// Khởi tạo hệ thống chấm công khi trang được tải
document.addEventListener('DOMContentLoaded', function () {
    new AttendanceSystem();
});

// Thêm CSS animation cho notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

