// Biến toàn cục được hợp nhất
let appData = {
    okrData: [],
    cycles: [],
    departments: []
};

// =================================================================
// Cấu hình Biểu đồ (Charts) - Giữ lại các hàm giả lập/chưa định nghĩa để không phá vỡ cấu trúc tổng thể
// =================================================================

// Hàm giả lập API (Fake API) để lấy dữ liệu mới dựa trên bộ lọc hiệu suất (Performance)
// *Lưu ý: Bạn cần định nghĩa hàm này để quản lý biểu đồ hiệu suất.*
function updatePerformanceData() {
    console.log('Cập nhật dữ liệu biểu đồ hiệu suất...');
    // Ví dụ: Gọi hàm cập nhật biểu đồ tại đây
    // updateChart(appData.okrData); 
}

// =================================================================
// Quản lý OKR (OKR Management)
// =================================================================

// Hàm khởi tạo OKR management
async function initOKRManagement() {
    // Gắn sự kiện filter trước khi tải data
    setupOKREventListeners();
    try {
        await loadOKRData();
    } catch (error) {
        console.error('Lỗi khởi tạo OKR:', error);
        showNotification('Lỗi tải dữ liệu OKR ban đầu', 'error');
    }
}

// Tải dữ liệu OKR từ API
async function loadOKRData() {
    const cycleFilter = document.getElementById('okr-cycle').value;
    const ownerFilter = document.getElementById('okr-owner').value;
    const statusFilter = document.getElementById('okr-status').value;
    const departmentFilter = document.getElementById('department-filter').value;

    const params = new URLSearchParams({
        cycle: cycleFilter === 'all' ? '' : cycleFilter,
        owner: ownerFilter === 'all' ? '' : ownerFilter,
        status: statusFilter === 'all' ? '' : statusFilter,
        department: departmentFilter === 'all' ? '' : departmentFilter
    });

    const url = `okr.php?${params.toString()}`;

    // Sửa lỗi: Cải thiện fetch API
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();

    if (result.success) {
        // Cập nhật biến toàn cục appData
        appData.okrData = result.data.okrs;
        appData.cycles = result.data.cycles;
        appData.departments = result.data.departments;

        updateFilterOptions();
        renderOKRList();
    } else {
        throw new Error(result.message || 'Lỗi không xác định khi tải OKR.');
    }
}

// Cập nhật options cho filter (cả filter list và modal)
function updateFilterOptions() {
    // --- Chu kỳ (Cycle Filter) ---
    const cycleSelect = document.getElementById('okr-cycle');
    const currentSelectedCycle = cycleSelect.value;
    cycleSelect.innerHTML = '<option value="all">Tất cả chu kỳ</option>' +
        appData.cycles.map(cycle =>
            `<option value="${cycle.id}" ${cycle.id == currentSelectedCycle ? 'selected' : ''}>${cycle.name}</option>`
        ).join('');



    // --- Chu kỳ (Modal Select) ---
    const modalCycleSelect = document.getElementById('okr-cycle-select');


    // Giữ nguyên trạng thái nếu có, nếu không thì chọn giá trị đầu tiên (hoặc để trống)
    const currentModalCycle = modalCycleSelect ? modalCycleSelect.value : '';
    if (modalCycleSelect) {
        modalCycleSelect.innerHTML = '<option value="all">Tất cả chu kỳ</option>' + appData.cycles.map(cycle =>
            `<option value="${cycle.id}" ${cycle.id == currentModalCycle ? 'selected' : ''}>${cycle.name}</option>`
        ).join('');
    }


    // --- Phòng ban (Modal Select) ---
    const departmentSelect = document.getElementById('department-select');
    // Đảm bảo departmentSelect tồn tại trước khi cập nhật
    if (departmentSelect) {
        departmentSelect.innerHTML = '<option value="">Chọn phòng ban</option>' +
            appData.departments.map(dept =>
                `<option value="${dept.id}">${dept.name}</option>`
            ).join('');
    }

    // --- Phòng ban (OKR Filter) ---
    // Cần phải cập nhật bộ lọc Phòng ban cho danh sách OKR (nếu có, dùng chung ID 'department-filter')
    const okrDepartmentFilter = document.getElementById('department-filter');
    if (okrDepartmentFilter) {
        okrDepartmentFilter.innerHTML = '<option value="all">Tất cả phòng ban</option>' +
            appData.departments.map(dept =>
                `<option value="${dept.id}">${dept.name}</option>`
            ).join('');
    }
}

// Hàm thiết lập Event Listeners cho OKR
function setupOKREventListeners() {
    document.getElementById('add-okr-btn').addEventListener('click', showAddOKRModal);
    document.getElementById('okr-form').addEventListener('submit', handleOKRSubmit);
    document.getElementById('cancel-okr').addEventListener('click', closeOKRModal);
    document.querySelector('#okr-modal .close').addEventListener('click', closeOKRModal);
    document.getElementById('add-kr-btn').addEventListener('click', () => addKeyResultInput()); // Bọc lại để gọi không tham số

    // Event Listeners cho bộ lọc OKR (đặt ở đây để đảm bảo gắn trước khi gọi loadOKRData lần đầu)
    document.getElementById('okr-cycle').addEventListener('change', loadOKRData);
    document.getElementById('okr-owner').addEventListener('change', loadOKRData);
    document.getElementById('okr-status').addEventListener('change', loadOKRData);
    document.getElementById('department-filter').addEventListener('change', loadOKRData);
}

// Hiển thị modal thêm OKR
function showAddOKRModal() {
    const modal = document.getElementById('okr-modal');
    document.getElementById('modal-title').textContent = 'Thêm OKR mới';
    document.getElementById('okr-form').reset();
    document.getElementById('okr-form').removeAttribute('data-edit-id');

    // Xóa trường status nếu có (chỉ dùng khi sửa)
    const existingStatusSelect = document.getElementById('okr-status-select');
    if (existingStatusSelect) {
        existingStatusSelect.closest('.form-group').remove();
    }

    // Xóa các Key Results cũ và thêm 1 KR mặc định
    const krContainer = document.getElementById('key-results-container');
    krContainer.innerHTML = '';
    addKeyResultInput();

    modal.classList.add('active'); // Sử dụng class active từ CSS đã sửa
}

// Đóng modal
function closeOKRModal() {
    document.getElementById('okr-modal').classList.remove('active');
}

// Thêm Key Result Input
function addKeyResultInput(kr = {}) {
    const container = document.getElementById('key-results-container');
    const krCount = container.children.length + 1;
    // Kiểm tra và đặt giá trị mặc định an toàn
    const defaultValue = kr.current_value !== undefined && kr.current_value !== null ? kr.current_value : 0;
    const defaultTarget = kr.target_value !== undefined && kr.target_value !== null ? kr.target_value : 100;
    const defaultWeight = kr.weight !== undefined && kr.weight !== null ? kr.weight : 1;

    const krHTML = `
        <div class="kr-input-group kr-form-item" data-id="${kr.id || ''}">
            <div class="kr-input-wrapper">
                <label>Kết quả then chốt ${krCount}</label>
                <input type="text" name="kr_description[]" placeholder="Mô tả kết quả then chốt" 
                        value="${kr.description || ''}" required>
            </div>
            <div class="kr-input-wrapper kr-value">
                <label>Hiện tại</label>
                <input type="number" name="kr_current_value[]" value="${defaultValue}" min="0">
            </div>
            <div class="kr-input-wrapper kr-value">
                <label>Mục tiêu</label>
                <input type="number" name="kr_target_value[]" value="${defaultTarget}" min="1" required>
            </div>
            <div class="kr-input-wrapper kr-unit">
                <label>Đơn vị</label>
                <input type="text" name="kr_unit[]" placeholder="%, $$, Lượt" value="${kr.unit || 'Lần'}" required>
            </div>
            <div class="kr-input-wrapper kr-weight">
                <label>Trọng số</label>
                <input type="number" name="kr_weight[]" value="${defaultWeight}" min="0.1" step="0.1">
            </div>
            <button type="button" class="remove-kr-btn" onclick="this.closest('.kr-input-group').remove()">
                <i class="fas fa-times-circle"></i>
            </button>
        </div>
    `;
    // Sử dụng appendChild hoặc insertAdjacentHTML cho DOM manipulation hiệu quả
    container.insertAdjacentHTML('beforeend', krHTML);
}

// Xử lý thêm/sửa OKR mới
async function handleOKRSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const okrId = form.dataset.editId;
    const formData = getOKRFormData();

    // Kiểm tra Key Results tối thiểu
    if (formData.keyResults.length === 0) {
        showNotification('OKR phải có ít nhất một Key Result.', 'error');
        return;
    }

    try {
        const url = okrId ? `okr.php?id=${okrId}` : 'okr.php';
        const method = okrId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            closeOKRModal();
            await loadOKRData();
        } else {
            // Xử lý lỗi API trả về 200 nhưng success: false, hoặc HTTP lỗi (400, 500)
            throw new Error(result.message || `Lỗi API: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Lỗi khi lưu OKR:', error);
        showNotification('Lỗi khi lưu OKR: ' + error.message, 'error');
    }
}

// Lấy dữ liệu từ form
function getOKRFormData() {
    const keyResults = [];
    // Selector mới: sử dụng class .kr-form-item và parent class .kr-input-group
    const krElements = document.querySelectorAll('#key-results-container .kr-input-group');

    krElements.forEach(kr => {
        // Sử dụng mảng name[] để đảm bảo thứ tự
        keyResults.push({
            description: kr.querySelector('input[name="kr_description[]"]').value,
            current_value: parseFloat(kr.querySelector('input[name="kr_current_value[]"]').value) || 0,
            target_value: parseFloat(kr.querySelector('input[name="kr_target_value[]"]').value) || 0,
            unit: kr.querySelector('input[name="kr_unit[]"]').value,
            weight: parseFloat(kr.querySelector('input[name="kr_weight[]"]').value) || 1,
            // Thêm ID nếu đang sửa
            id: kr.dataset.id || null
        });
    });

    // Lấy status chỉ khi đang sửa (field tồn tại)
    const statusSelect = document.getElementById('okr-status-select');
    const status = statusSelect ? statusSelect.value : 'not-started';

    return {
        objective: document.getElementById('objective').value,
        cycle_id: document.getElementById('okr-cycle-select').value,
        owner_type: document.getElementById('okr-owner-select').value,
        department_id: document.getElementById('department-select').value || null,
        keyResults: keyResults,
        status: status
    };
}

// Helper: Lấy nhãn của Chủ sở hữu
function getOwnerLabel(ownerType) {
    const labels = {
        'company': 'Công ty',
        'department': 'Phòng ban',
        'individual': 'Cá nhân'
    };
    return labels[ownerType] || ownerType;
}

// Helper: Lấy nhãn của Trạng thái
function getStatusLabel(status) {
    const statusLabels = {
        'on-track': 'Đúng tiến độ',
        'at-risk': 'Có rủi ro',
        'completed': 'Hoàn thành',
        'not-started': 'Chưa bắt đầu'
    };
    return statusLabels[status] || status;
}

// Hiển thị thông báo (Sử dụng SweetAlert2)
function showNotification(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: type,
            title: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        console.warn(`Thông báo (${type}): ${message}`);
    }
}

// Render danh sách OKR
function renderOKRList() {
    const okrList = document.getElementById('okr-list');

    if (appData.okrData.length === 0) {
        okrList.innerHTML = `
        <div class="no-okr" style="text-align: center; padding: 50px; color: #aaa; background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);">
            <i class="fas fa-bullseye fa-3x" style="margin-bottom: 15px; color: #ccc;"></i>
            <p style="font-size: 1.1em; font-weight: 500;">Chưa có OKR nào phù hợp với bộ lọc. Hãy thêm OKR đầu tiên!</p>
        </div>
    `;
        return;
    }

    okrList.innerHTML = appData.okrData.map(okr => {
        // Tính toán thanh tiến độ OKR tổng thể (có thể cải tiến trong logic backend)
        const totalProgress = Math.round(okr.progress || 0);
        const progressClass = totalProgress >= 70 ? 'completed' : (totalProgress >= 30 ? 'on-track' : 'at-risk');


        //→ Tổng trọng số = 0.5 + 0.3 + 0.2 = 1.0 (rất chuẩn, nhiều công ty dùng tổng = 1 hoặc 10 hoặc 100)

        //Tiến độ tổng = (33.33% × 0.5) + (75% × 0.3) + (50% × 0.2)
        //  = 16.665%     + 22.5%      + 10%
        //  = 49.165% ≈ 49%

        // Lấy tên chu kỳ chính xác
        const cycle = appData.cycles.find(c => c.id == okr.cycle_id);
        const cycleName = cycle ? cycle.name : 'Chưa rõ chu kỳ';

        return `
            <div class="okr-item" data-okr-id="${okr.id}">
                <div class="okr-header">
                    <h4 class="okr-objective">${okr.objective}</h4>
                    <div class="okr-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${cycleName}</span>
                        <span><i class="fas fa-user-tag"></i> ${getOwnerLabel(okr.owner_type)}</span>
                        ${okr.department_name ? `<span><i class="fas fa-sitemap"></i> ${okr.department_name}</span>` : ''}
                        <span class="okr-status ${okr.status}">${getStatusLabel(okr.status)}</span>
                    </div>
                </div>
                
                <div class="okr-body">
                    <div class="progress-info" style="margin-bottom: 15px;">
                        <div class="progress-bar">
                            <div class="progress-fill ${progressClass}" style="width: ${totalProgress > 100 ? 100 : totalProgress}%" title="${totalProgress}%"></div>
                        </div>
                        <div class="kr-percentage" style="text-align: right; margin-top: 5px;">
                            ${totalProgress}%
                        </div>
                    </div>
                    
                    <div class="key-results-list">
                        ${okr.keyResults.map(kr => {
            const krProgress = Math.round((kr.current_value / kr.target_value) * 100);
            // Phiên bản ĐÚNG và HỢP LÝ NHẤT cho từng KR
            const krProgressClass = krProgress >= 80
                ? 'completed'        // ≥80%: Rất tốt, gần hoàn thành
                : krProgress >= 50
                    ? 'on-track'       // 50–79%: Đúng tiến độ
                    : krProgress > 0
                        ? 'at-risk'      // 1–49%: Có nguy cơ, cần đẩy mạnh
                        : 'not-started'; // 0%: Chưa làm gì

            return `
                                <div class="kr-item">
                                    <div class="kr-text">
                                        ${kr.description} 
                                    </div>
                                    <div class="kr-progress">
                                        <div class="progress-bar">
                                            <div class="progress-fill ${krProgressClass}" style="width: ${krProgress > 100 ? 100 : krProgress}%"></div>
                                        </div>
                                    </div>
                                    <div class="kr-percentage">
                                        ${kr.current_value} / ${kr.target_value} ${kr.unit}
                                    </div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
                
                <div class="okr-actions">
                    <button class="btn-info update-kr-progress" data-id="${okr.id}">
                        <i class="fas fa-chart-line"></i> Cập nhật
                    </button>
                    <button class="btn-secondary edit-okr" data-id="${okr.id}">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn-danger delete-okr" data-id="${okr.id}">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Gắn event listeners cho các button sau khi render
    attachOKRActionListeners();
}


// Hàm gắn sự kiện cho các nút Sửa, Xóa, Cập nhật
function attachOKRActionListeners() {
    document.querySelectorAll('.edit-okr').forEach(button => {
        button.removeEventListener('click', (e) => showEditOKRModal(e.currentTarget.dataset.id)); // Xóa Listener cũ
        button.addEventListener('click', (e) => showEditOKRModal(e.currentTarget.dataset.id));
    });

    document.querySelectorAll('.delete-okr').forEach(button => {
        button.removeEventListener('click', (e) => confirmDeleteOKR(e.currentTarget.dataset.id)); // Xóa Listener cũ
        button.addEventListener('click', (e) => confirmDeleteOKR(e.currentTarget.dataset.id));
    });

    document.querySelectorAll('.update-kr-progress').forEach(button => {
        button.removeEventListener('click', (e) => showUpdateProgressModal(e.currentTarget.dataset.id)); // Xóa Listener cũ
        button.addEventListener('click', (e) => showUpdateProgressModal(e.currentTarget.dataset.id));
    });
}

// Xử lý Xóa OKR
function confirmDeleteOKR(okrId) {
    if (typeof Swal === 'undefined') {
        if (confirm('Bạn chắc chắn muốn xóa OKR này? Hành động này không thể hoàn tác!')) {
            deleteOKR(okrId);
        }
        return;
    }
    Swal.fire({
        title: 'Bạn chắc chắn muốn xóa?',
        text: "Hành động này không thể hoàn tác!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Có, xóa nó đi!',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            deleteOKR(okrId);
        }
    });
}

async function deleteOKR(okrId) {
    try {
        const response = await fetch(`okr.php?id=${okrId}`, {
            method: 'DELETE',
        });
        const result = await response.json();

        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            await loadOKRData();
        } else {
            throw new Error(result.message || `Lỗi API: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Lỗi khi xóa OKR:', error);
        showNotification('Lỗi khi xóa OKR: ' + error.message, 'error');
    }
}

// Hiển thị modal Sửa OKR
function showEditOKRModal(okrId) {
    const okr = appData.okrData.find(o => o.id == okrId);
    if (!okr) {
        showNotification('Không tìm thấy OKR để sửa.', 'error');
        return;
    }

    const modal = document.getElementById('okr-modal');
    const form = document.getElementById('okr-form');
    const krContainer = document.getElementById('key-results-container');

    document.getElementById('modal-title').textContent = `Sửa OKR: ${okr.objective.substring(0, 50)}...`;
    form.setAttribute('data-edit-id', okrId);

    // Điền dữ liệu chung
    document.getElementById('objective').value = okr.objective;
    document.getElementById('okr-cycle-select').value = okr.cycle_id;
    document.getElementById('okr-owner-select').value = okr.owner_type;
    document.getElementById('department-select').value = okr.department_id || '';

    // --- Xử lý trường Trạng thái OKR (chỉ hiển thị khi Sửa) ---
    let statusGroup = document.getElementById('okr-status-group');
    if (!statusGroup) {
        statusGroup = document.createElement('div');
        statusGroup.classList.add('form-group');
        statusGroup.id = 'okr-status-group';
        statusGroup.innerHTML = `
            <label for="okr-status-select">Trạng thái OKR</label>
            <select id="okr-status-select">
                <option value="not-started">Chưa bắt đầu</option>
                <option value="on-track">Đúng tiến độ</option>
                <option value="at-risk">Có rủi ro</option>
                <option value="completed">Hoàn thành</option>
            </select>
        `;
        document.getElementById('objective').closest('.form-group').after(statusGroup);
    }
    document.getElementById('okr-status-select').value = okr.status;

    // Điền Key Results
    krContainer.innerHTML = '';
    okr.keyResults.forEach(kr => {
        addKeyResultInput(kr);
    });

    modal.classList.add('active'); // Sử dụng class active
}

// Hiển thị modal Cập nhật tiến độ KR (chỉ dành cho current_value)
function showUpdateProgressModal(okrId) {
    const okr = appData.okrData.find(o => o.id == okrId);
    if (!okr) return;

    // Tạo nội dung form cập nhật progress
    let krInputsHTML = okr.keyResults.map(kr => `
        <div class="form-group" style="display:flex; justify-content: space-between; align-items: center; gap: 10px;">
            <label style="flex: 2; margin:0;">${kr.description}</label>
            <div style="flex: 1; min-width: 100px;">
                <input type="number" 
                        data-kr-id="${kr.id}" 
                        data-target="${kr.target_value}"
                        data-unit="${kr.unit}"
                        placeholder="Giá trị hiện tại" 
                        value="${kr.current_value}" 
                        min="0" 
                        max="${kr.target_value > kr.current_value ? kr.target_value : kr.current_value * 2}"
                        step="${kr.unit === '%' ? 0.1 : 1}"
                        style="width: 100%; padding: 8px;">
            </div>
            <span style="flex: 1; text-align: left; font-weight: 500;">/ ${kr.target_value} ${kr.unit}</span>
        </div>
    `).join('');

    if (typeof Swal === 'undefined') {
        showNotification('Chức năng cập nhật tiến độ yêu cầu SweetAlert2.', 'warning');
        return;
    }

    Swal.fire({
        title: `Cập nhật Tiến độ: ${okr.objective}`,
        html: `<form id="progress-update-form" style="text-align: left; margin-top: 15px;">${krInputsHTML}</form>`,
        showCancelButton: true,
        confirmButtonText: 'Lưu Tiến độ',
        cancelButtonText: 'Hủy',
        customClass: {
            container: 'swal-progress-update'
        },
        preConfirm: () => {
            const updates = [];
            const inputs = document.querySelectorAll('#progress-update-form input[type="number"]');

            inputs.forEach(input => {
                updates.push({
                    id: input.dataset.krId,
                    current_value: parseFloat(input.value)
                });
            });
            return { okrId: okrId, updates: updates };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            handleProgressUpdate(result.value.okrId, result.value.updates);
        }
    });
}

// Xử lý cập nhật tiến độ KR
async function handleProgressUpdate(okrId, updates) {
    try {
        const response = await fetch(`okr.php?id=${okrId}&action=update_progress`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ keyResultUpdates: updates })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showNotification(result.message, 'success');
            await loadOKRData();
        } else {
            throw new Error(result.message || `Lỗi API: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật tiến độ:', error);
        showNotification('Lỗi khi cập nhật tiến độ: ' + error.message, 'error');
    }
}


// Khởi tạo ban đầu
document.addEventListener('DOMContentLoaded', function () {
    initOKRManagement();
});