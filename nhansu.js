document.addEventListener('DOMContentLoaded', function () {
    // ==================== KHỞI TẠO DỮ LIỆU & BIẾN TOÀN CỤC ====================

    // Khởi tạo employees rỗng, sẽ được điền bằng dữ liệu từ API
    let employees = [];

    let currentView = []; // Lưu danh sách nhân viên đang hiển thị (đã được lọc/tìm kiếm)
    let currentPage = 1; // Thêm biến phân trang
    const recordsPerPage = 5; // Số bản ghi mỗi trang



    // ==================== TRUY VẤN CÁC PHẦN TỬ DOM ====================
    const employeeTableBody = document.getElementById('employee-table-body');
    const addEmployeeBtn = document.getElementById('add-employee-btn');
    const employeeModal = document.getElementById('employee-modal');
    const filterModal = document.getElementById('filter-modal');
    const closeModalBtns = document.querySelectorAll('.close-btn');
    const employeeForm = document.getElementById('employee-form');
    const modalTitle = document.getElementById('modal-title');
    const searchInput = document.getElementById('employee-search');

    // Thống kê
    const totalEmployeesEl = document.querySelector('[data-employee-count]');
    const activeEmployeesEl = document.getElementById('active-employees');
    const probationEmployeesEl = document.getElementById('probation-employees');
    const inactiveEmployeesEl = document.getElementById('inactive-employees');

    // Nút chức năng
    const exportExcelBtn = document.getElementById('export-excel');
    const exportCsvBtn = document.getElementById('export-csv');
    const exportPDFBtn = document.getElementById('export-pdf');
    const filterBtn = document.getElementById('filter-btn');
    const filterForm = document.getElementById('filter-form');
    const resetFilterBtn = document.getElementById('reset-filter');

    // Phân trang
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');


    // ==================== CÁC HÀM XỬ LÝ CHÍNH ====================

    // Hàm FORMAT & HELPER
    function formatDate(dateString) {
        if (!dateString) return '';
        // Đảm bảo tạo đối tượng Date từ chuỗi YYYY-MM-DD
        const date = new Date(dateString.replace(/-/g, '/'));
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function getStatusText(status) {
        switch (status) {
            case 'active': return 'Đang làm việc';
            case 'probation': return 'Thử việc';
            case 'inactive': return 'Đã nghỉ';
            default: return '';
        }
    }

    function getLockStatusText(locked) {
        // API có thể trả về 0/1 hoặc true/false
        return locked === true || locked === 1 ? 'Đã khóa' : 'Đang hoạt động';
    }

    function updateStats(data = employees) {
        const total = data.length;
        // Chú ý: Trạng thái khóa không ảnh hưởng đến thống kê active/probation/inactive thông thường
        const active = data.filter(emp => emp.status === 'active').length;
        const probation = data.filter(emp => emp.status === 'probation').length;
        const inactive = data.filter(emp => emp.status === 'inactive').length;

        totalEmployeesEl.textContent = total;
        activeEmployeesEl.textContent = active;
        probationEmployeesEl.textContent = probation;
        inactiveEmployeesEl.textContent = inactive;
        // Đồng bộ với biểu đồ thống kê (nếu có)
        if (typeof updateEmployeeStats === 'function') {
            updateEmployeeStats(data);
        }
    }

    /**
     * Hiển thị dữ liệu nhân viên lên bảng, có xử lý phân trang.
     * @param {Array} data - Mảng dữ liệu nhân viên để render.
     */
    function renderEmployeeTable(data = employees) {
        // FIX: Kiểm tra employeeTableBody tồn tại
        if (!employeeTableBody) {
            console.error('employeeTableBody not found');
            return;
        }

        employeeTableBody.innerHTML = '';
        currentView = data;

        // Tính toán phân trang
        const totalPages = Math.ceil(data.length / recordsPerPage);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        } else if (totalPages === 0) {
            currentPage = 1;
        }

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = Math.min(startIndex + recordsPerPage, data.length);
        const paginatedData = data.slice(startIndex, endIndex);

        // Render dữ liệu phân trang
        if (paginatedData.length === 0 && data.length > 0) {
            // Trường hợp đã reset currentPage nhưng vẫn không có data (chỉ xảy ra khi recordsPerPage quá lớn hoặc lỗi logic)
            employeeTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Không tìm thấy nhân viên nào phù hợp với bộ lọc/tìm kiếm.</td></tr>`;
        } else if (paginatedData.length === 0) {
            employeeTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Chưa có dữ liệu nhân viên.</td></tr>`;
        } else {
            paginatedData.forEach(employee => {
                const row = document.createElement('tr');
                const statusClass = `status-${employee.status}`;
                const statusText = getStatusText(employee.status);
                const formattedDate = formatDate(employee.startDate);
                const isLocked = employee.locked === true || employee.locked === 1; // Xử lý 0/1 hoặc true/false
                const lockStatusText = getLockStatusText(isLocked);
                const lockStatusClass = isLocked ? 'status-locked' : 'status-active';

                row.innerHTML = `
                    <td>${employee.code}</td>
                    <td>${employee.name}</td>
                    <td>${employee.email}</td>
                    <td>${employee.department}</td>
                    <td>${employee.position}</td>
                    <td>${formattedDate}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td><span class="status-badge ${lockStatusClass}">${lockStatusText}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" data-id="${employee.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn ${isLocked ? 'unlock-btn' : 'lock-btn'}" data-id="${employee.id}">
                                <i class="fas ${isLocked ? 'fa-lock' : 'fa-unlock'}"></i>
                            </button>
                        </div>
                    </td>
                `;
                employeeTableBody.appendChild(row);
            });
        }

        // Cập nhật thống kê và render phân trang
        updateStats(data);
        renderPagination(data.length);
        
           // ✅ Gắn sự kiện SAU KHI render bảng thành công
    attachEditLockEvents();
        // Gắn lại sự kiện cho các nút Edit/Lock sau khi đã render
        // *Đã chuyển logic gắn sự kiện vào hàm attachEditLockEvents*
    }

    function openAddEmployeeModal() {
        modalTitle.textContent = 'Thêm nhân viên mới';
        employeeForm.dataset.mode = 'add';
        employeeForm.reset();
        employeeForm.removeAttribute('data-id'); // Đảm bảo ID được xóa
        employeeModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        employeeModal.classList.add('show');
    }

    function editEmployee(id) {
        const employee = employees.find(emp => emp.id === parseInt(id));
        if (!employee) return;

        modalTitle.textContent = 'Chỉnh sửa nhân viên';
        employeeForm.dataset.mode = 'edit';
        employeeForm.dataset.id = id;

        // Xử lý giá trị ngày tháng YYYY-MM-DD cho input type="date"
        const startDateValue = employee.startDate && employee.startDate.includes('T') ? employee.startDate.split('T')[0] : employee.startDate;

        document.getElementById('emp-code').value = employee.code;
        document.getElementById('emp-name').value = employee.name;
        document.getElementById('emp-email').value = employee.email;
        document.getElementById('emp-department').value = employee.department;
        document.getElementById('emp-position').value = employee.position;
        document.getElementById('emp-start-date').value = startDateValue;
        document.getElementById('emp-status').value = employee.status;

        employeeModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        employeeModal.classList.add('show');
    }

    // SỬA: Chuyển hàm này thành async để gọi API
    async function toggleEmployeeLock(id) {
        const employee = employees.find(emp => emp.id === parseInt(id));
        if (!employee) return;

        // Kiểm tra 0/1 hay true/false
        const currentLockStatus = employee.locked === true || employee.locked === 1;
        const newLockStatus = !currentLockStatus;

        const action = newLockStatus ? 'khóa' : 'mở khóa';
        const actionText = newLockStatus ? 'Khóa tài khoản' : 'Mở khóa tài khoản';

        Swal.fire({
            title: `Xác nhận ${actionText}`,
            text: `Bạn có chắc chắn muốn ${action} tài khoản của nhân viên ${employee.name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: newLockStatus ? '#d33' : '#28a745',
            cancelButtonColor: '#3085d6',
            confirmButtonText: action,
            cancelButtonText: 'Hủy bỏ'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Gọi API để cập nhật trạng thái khóa
                    await toggleLockAPI(employee.id, newLockStatus);

                    // Tải lại dữ liệu từ API
                    await fetchEmployees();

                    Swal.fire(
                        'Thành công!',
                        `Đã ${action} tài khoản nhân viên ${employee.name} thành công.`,
                        'success'
                    );
                } catch (error) {
                    console.error('Lỗi khi khóa/mở khóa:', error);
                    Swal.fire(
                        'Lỗi!',
                        `Không thể ${action} tài khoản: ${error.message}`,
                        'error'
                    );
                }
            }
        });
    }

    // HÀM REFRESH VIEW
    function refreshEmployeeView() {
        // FIX: Kiểm tra searchInput tồn tại
        const searchTerm = searchInput ? searchInput.value.trim() : '';

        // Luồng ưu tiên: Tìm kiếm > Lọc > Toàn bộ danh sách
        if (searchTerm) {
            searchEmployees();
        } else if (filterForm && filterForm.dataset.applied === 'true') {
            filterEmployees();
        } else {
            renderEmployeeTable(employees);
        }
    }

    // Hàm API Calls (Được định nghĩa ở dưới, chỉ cần đảm bảo gọi đúng)

    // SỬA: Xử lý submit form (Add/Edit)
    async function handleFormSubmit(e) {
        e.preventDefault();

        const formData = {
            code: document.getElementById('emp-code').value.trim(),
            name: document.getElementById('emp-name').value.trim(),
            email: document.getElementById('emp-email').value.trim(),
            department: document.getElementById('emp-department').value.trim(),
            position: document.getElementById('emp-position').value.trim(),
            startDate: document.getElementById('emp-start-date').value,
            status: document.getElementById('emp-status').value
        };

        // Validation
        if (Object.values(formData).some(value => value === '')) {
            Swal.fire('Lỗi', 'Vui lòng điền đầy đủ thông tin', 'error');
            return;
        }

        try {
            if (employeeForm.dataset.mode === 'add') {
                await addEmployeeAPI(formData);
                Swal.fire('Thành công', 'Thêm nhân viên mới thành công', 'success');
            } else {
                const id = parseInt(employeeForm.dataset.id);
                await updateEmployeeAPI(id, formData);
                Swal.fire('Thành công', 'Cập nhật thông tin nhân viên thành công', 'success');
            }

            // Tải lại dữ liệu từ API và cập nhật giao diện
            await fetchEmployees();
            closeModal(employeeModal);

        } catch (error) {
            Swal.fire('Lỗi', error.message, 'error');
        }
    }

    /**
     * HÀM MỚI: Thực hiện tìm kiếm nâng cao trên các trường (code, name, email)
     * @param {string} searchTerm - Chuỗi tìm kiếm.
     * @returns {Array} - Mảng nhân viên đã lọc.
     */


    // Thay thế logic trong hàm searchEmployees bằng cách gọi advancedEmployeeSearch
    function searchEmployees() {
        currentPage = 1;
        const searchTerm = searchInput.value.trim();

        if (!searchTerm) {
            refreshEmployeeView();
            return;
        }

        // Luôn tìm kiếm trên toàn bộ dữ liệu gốc
        const filtered = advancedEmployeeSearch(searchTerm, employees);
        renderEmployeeTable(filtered);
    }
    /**
     * Hỗ trợ xuất file: Chuyển đổi mảng object sang mảng array cho CSV/Excel
     */
    function prepareDataForExport(data) {
        const headers = [
            "Mã NV", "Họ tên", "Email", "Phòng ban", "Chức vụ", "Ngày vào làm", "Trạng thái", "Trạng thái tài khoản"
        ];

        const exportData = data.map(employee => {
            return [
                employee.code,
                employee.name,
                employee.email,
                employee.department,
                employee.position,
                formatDate(employee.startDate),
                getStatusText(employee.status),
                getLockStatusText(employee.locked)
            ];
        });

        return [headers, ...exportData];
    }

    /**
     * Xuất dữ liệu nhân viên đang hiển thị (currentView) ra file Excel (.xlsx).
     */
    function exportToExcel() {
        if (typeof XLSX === 'undefined') {
            Swal.fire('Lỗi', 'Thư viện XLSX chưa được tải. Vui lòng thử lại sau.', 'error');
            return;
        }

        const dataToExport = prepareDataForExport(currentView);
        const ws = XLSX.utils.aoa_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DanhSachNhanVien");
        XLSX.writeFile(wb, `Danh_sach_nhan_vien_${new Date().getTime()}.xlsx`);
        Swal.fire('Thành công', `Đã xuất ${currentView.length} bản ghi ra Excel`, 'success');
    }

    /**
     * Xuất dữ liệu nhân viên đang hiển thị (currentView) ra file CSV (.csv).
     */
    function exportToCSV() {
        if (typeof XLSX === 'undefined') {
            Swal.fire('Lỗi', 'Thư viện XLSX chưa được tải. Vui lòng thử lại sau.', 'error');
            return;
        }

        const dataToExport = prepareDataForExport(currentView);
        const ws = XLSX.utils.aoa_to_sheet(dataToExport);
        const csvString = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob(["\uFEFF", csvString], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Danh_sach_nhan_vien_${new Date().getTime()}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Swal.fire('Thành công', `Đã xuất ${currentView.length} bản ghi ra CSV`, 'success');
    }

    function exportToPDF() {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined' || typeof window.jspdf.autoTable === 'undefined') {
            Swal.fire('Lỗi', 'Thư viện jsPDF hoặc autoTable chưa được tải. Vui lòng kiểm tra liên kết thư viện.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const data = prepareDataForExport(currentView);
        const headers = data[0];
        const body = data.slice(1);

        doc.setFont("Helvetica");
        doc.setFontSize(16);
        doc.text("DANH SÁCH NHÂN VIÊN", 105, 15, null, null, "center");

        doc.autoTable({
            head: [headers],
            body: body,
            startY: 25,
            styles: { fontSize: 8 },
            headStyles: {
                fillColor: [200, 200, 200],
                textColor: [0, 0, 0],
                fontSize: 9
            },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 30 },
                2: { cellWidth: 45 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25 },
                6: { cellWidth: 20 },
                7: { cellWidth: 25 }
            }
        });

        doc.save(`Danh_sach_nhan_vien_${new Date().getTime()}.pdf`);
        Swal.fire('Thành công', `Đã xuất ${currentView.length} bản ghi ra PDF`, 'success');
    }

    function filterEmployees() {
        currentPage = 1; // Reset về trang đầu khi lọc
        const department = document.getElementById('filter-department').value.trim();
        const position = document.getElementById('filter-position').value.trim();
        const status = document.getElementById('filter-status').value.trim();
        const startDate = document.getElementById('filter-date').value;
        const locked = document.getElementById('filter-locked').value;

        let filtered = [...employees];

        if (department) filtered = filtered.filter(emp => emp.department === department);
        if (position) filtered = filtered.filter(emp => emp.position === position);
        if (status) filtered = filtered.filter(emp => emp.status === status);
        if (startDate) filtered = filtered.filter(emp => new Date(emp.startDate) >= new Date(startDate));
        if (locked !== '') {
            const isLocked = locked === 'true' || locked === '1'; // Xử lý 'true' hoặc '1'
            filtered = filtered.filter(emp => (emp.locked === true || emp.locked === 1) === isLocked);
        }

        // Thêm một thuộc tính dataset để biết bộ lọc đã được áp dụng
        filterForm.dataset.applied = (department || position || status || startDate || locked !== '') ? 'true' : 'false';

        renderEmployeeTable(filtered);
        closeModal(filterModal);
    }

    function resetFilter() {
        filterForm.reset();
        filterForm.dataset.applied = 'false'; // Đặt lại trạng thái bộ lọc
        renderEmployeeTable(employees); // Hiển thị toàn bộ danh sách
        closeModal(filterModal);
    }

    function closeModal(modalElement) {
        modalElement.classList.remove('show');
        document.body.classList.remove('modal-open');
        setTimeout(() => {
            modalElement.style.display = 'none';
        }, 300);
    }

    /**
     * Render thanh phân trang
     * @param {number} totalRecords - Tổng số bản ghi
     */
    function renderPagination(totalRecords) {
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        pageNumbersContainer.innerHTML = '';

        if (totalPages <= 1) {
            prevPageBtn.style.display = 'none';
            nextPageBtn.style.display = 'none';
            pageNumbersContainer.style.display = 'none';
            return;
        } else {
            prevPageBtn.style.display = 'inline-block';
            nextPageBtn.style.display = 'inline-block';
            pageNumbersContainer.style.display = 'flex';
        }

        // Logic phân trang giữ nguyên
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Nút về trang đầu
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.textContent = '1';
            firstPageBtn.className = 'page-btn';
            firstPageBtn.addEventListener('click', () => {
                currentPage = 1;
                renderEmployeeTable(currentView);
            });
            pageNumbersContainer.appendChild(firstPageBtn);

            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }

        // Các nút số trang
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.className = 'page-btn';
            if (i === currentPage) pageBtn.classList.add('active');
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderEmployeeTable(currentView);
            });
            pageNumbersContainer.appendChild(pageBtn);
        }

        // Nút về trang cuối
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
            const lastPageBtn = document.createElement('button');
            lastPageBtn.textContent = totalPages;
            lastPageBtn.className = 'page-btn';
            lastPageBtn.addEventListener('click', () => {
                currentPage = totalPages;
                renderEmployeeTable(currentView);
            });
            pageNumbersContainer.appendChild(lastPageBtn);
        }

        // Xử lý nút Prev/Next
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;

        prevPageBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderEmployeeTable(currentView);
            }
        };

        nextPageBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderEmployeeTable(currentView);
            }
        };
    }

    /**
     * Gắn sự kiện cho các nút Edit/Lock (Sử dụng Delegation)
     */

    function attachEditLockEvents() {
        // FIX: KIỂM TRA TỒN TẠI và KHÔNG NULL
        if (!employeeTableBody || employeeTableBody === null) {
            console.warn('employeeTableBody is null or undefined, skipping event attachment');
            return;
        }

        try {
            // Sử dụng try-catch để an toàn
            employeeTableBody.removeEventListener('click', handleTableActions);
            employeeTableBody.addEventListener('click', handleTableActions);
        } catch (error) {
            console.error('Error attaching edit/lock events:', error);
        }
    }

    function handleTableActions(e) {
        if (e.target.closest('.edit-btn')) {
            const id = e.target.closest('.edit-btn').dataset.id;
            editEmployee(id);
        }
        if (e.target.closest('.lock-btn') || e.target.closest('.unlock-btn')) {
            const id = e.target.closest('.lock-btn, .unlock-btn').dataset.id;
            toggleEmployeeLock(id); // Hàm này đã là async
        }
    }


    // ==================== HÀM GỌI API (ASYNC) ====================

    // FIX: Chỉ gọi renderEmployeeTable sau khi tải xong
    async function fetchEmployees() {
        try {
            const response = await fetch('api_employees.php');
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Lỗi kết nối API');
            }
            const data = await response.json();
            employees = data; // Cập nhật biến toàn cục
            refreshEmployeeView(); // Cập nhật giao diện (áp dụng tìm kiếm/lọc nếu có)
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            // Nếu không tải được data, hiển thị bảng rỗng
            employees = [];
            renderEmployeeTable(employees);
            Swal.fire('Lỗi', `Không thể tải dữ liệu nhân viên: ${error.message}`, 'error');
        }
    }

    async function addEmployeeAPI(employeeData) {
        const response = await fetch('api_employees.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employeeData)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Lỗi API POST: ${response.status}`);
        return result;
    }

    async function updateEmployeeAPI(id, employeeData) {
        const response = await fetch('api_employees.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...employeeData })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Lỗi API PUT: ${response.status}`);
        return result;
    }

    // FIX: Cập nhật hàm toggleLockAPI để gửi đúng dữ liệu
    async function toggleLockAPI(id, locked) {
        const response = await fetch('api_employees.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, locked: locked ? 1 : 0, action: 'toggle_lock' }) // Thêm action/flag cho backend
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Lỗi API Toggle Lock: ${response.status}`);
        return result;
    }

    // ==================== ĐỒNG BỘ SỐ LƯỢNG NHÂN VIÊN VỚI DASHBOARD ====================

    /**
     * Cập nhật thống kê nhân viên lên localStorage để dashboard có thể truy cập
     */
    function syncEmployeeStatsToStorage(data = employees) {
        const total = data.length;
        const active = data.filter(emp => emp.status === 'active').length;
        const probation = data.filter(emp => emp.status === 'probation').length;
        const inactive = data.filter(emp => emp.status === 'inactive').length;

        const employeeStats = {
            total: total,
            active: active,
            probation: probation,
            inactive: inactive,
            lastUpdated: new Date().toISOString()
        };

        // Lưu lên localStorage
        localStorage.setItem('employeeStats', JSON.stringify(employeeStats));

        // Phát sự kiện tùy chỉnh để các tab/trang khác biết có thay đổi
        window.dispatchEvent(new CustomEvent('employeeStatsUpdated', {
            detail: employeeStats
        }));

        console.log('Đã đồng bộ thống kê nhân viên:', employeeStats);
        return employeeStats;
    }

    /**
     * Hàm cập nhật thống kê (sửa lại hàm updateStats hiện có)
     */
    function updateStats(data = employees) {
        const total = data.length;
        const active = data.filter(emp => emp.status === 'active').length;
        const probation = data.filter(emp => emp.status === 'probation').length;
        const inactive = data.filter(emp => emp.status === 'inactive').length;

        // FIX: Kiểm tra phần tử tồn tại trước khi cập nhật
        if (totalEmployeesEl) totalEmployeesEl.textContent = total;
        if (activeEmployeesEl) activeEmployeesEl.textContent = active;
        if (probationEmployeesEl) probationEmployeesEl.textContent = probation;
        if (inactiveEmployeesEl) inactiveEmployeesEl.textContent = inactive;

        // Đồng bộ với localStorage
        syncEmployeeStatsToStorage(data);

        // Đồng bộ với biểu đồ thống kê (nếu có)
        if (typeof updateEmployeeStats === 'function') {
            updateEmployeeStats(data);
        }
    }

    //  ...................
    function advancedEmployeeSearch(searchTerm, sourceData = employees) {
        const lowerCaseTerm = searchTerm.toLowerCase();
        return sourceData.filter(employee =>
            employee.code.toLowerCase().includes(lowerCaseTerm) ||
            employee.name.toLowerCase().includes(lowerCaseTerm) ||
            employee.email.toLowerCase().includes(lowerCaseTerm)
        );
    }




    // ==================== KHỞI TẠO & GẮN SỰ KIỆN ====================

    // Tải thư viện XLSX (giữ nguyên)
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    document.head.appendChild(script);

    // FIX: SỬA LỖI GỌI HÀM TRÙNG LẶP VÀ ĐẢM BẢO GỌI ĐÚNG VỊ TRÍ
    fetchEmployees(); // Tải dữ liệu ban đầu

    // FIX: Kiểm tra phần tử tồn tại trước khi gắn sự kiện
    function safeAddEventListener(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn('Element not found for event:', event, element);
        }
    }

    // Gắn sự kiện cho các nút và form với kiểm tra an toàn
    if (addEmployeeBtn) safeAddEventListener(addEmployeeBtn, 'click', openAddEmployeeModal);
    if (employeeForm) safeAddEventListener(employeeForm, 'submit', handleFormSubmit);
    if (searchInput) safeAddEventListener(searchInput, 'input', searchEmployees);
    if (exportExcelBtn) safeAddEventListener(exportExcelBtn, 'click', exportToExcel);
    if (exportCsvBtn) safeAddEventListener(exportCsvBtn, 'click', exportToCSV);
    if (exportPDFBtn) safeAddEventListener(exportPDFBtn, 'click', exportToPDF);
    if (filterBtn) safeAddEventListener(filterBtn, 'click', () => {
        filterModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        filterModal.classList.add('show');
    });

    if (filterForm) safeAddEventListener(filterForm, 'submit', function (e) {
        e.preventDefault();
        filterEmployees();
    });
    if (resetFilterBtn) safeAddEventListener(resetFilterBtn, 'click', resetFilter);

    // Gắn sự kiện đóng modal chung
    closeModalBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const modalToClose = e.target.closest('.modal');
                if (modalToClose) {
                    closeModal(modalToClose);
                }
            });
        }
    });

    // Đóng modal khi click ra ngoài
    window.addEventListener('click', (e) => {
        if (e.target === employeeModal) {
            closeModal(employeeModal);
        }
        if (e.target === filterModal) {
            closeModal(filterModal);
        }
    });

    // Khởi tạo Event Delegation cho các nút Edit/Lock
    attachEditLockEvents();

});