// Biến toàn cục
let candidates = [];
let currentEditingId = null;

// Khởi tạo trang tuyển dụng
document.addEventListener('DOMContentLoaded', function() {
    initializeRecruitmentPage();
    loadCandidates();
    initializeChart();
    setupEventListeners();
});

// Khởi tạo trang
function initializeRecruitmentPage() {
    console.log('Khởi tạo trang tuyển dụng...');
    
    // Cập nhật thống kê
    updateRecruitmentStats();
}

// Tải danh sách ứng viên
async function loadCandidates() {
    try {
        showLoading();
        
        const response = await fetch('tuyendung.php?action=getCandidates', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Lỗi khi tải danh sách ứng viên');
        }

        const result = await response.json();
        
        if (result.success) {
            candidates = result.data;
            renderCandidatesList(candidates);
            updateRecruitmentStats();
            updateChart();
        } else {
            throw new Error(result.message || 'Lỗi không xác định');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        showError('Không thể tải danh sách ứng viên: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Hiển thị danh sách ứng viên
function renderCandidatesList(candidatesData) {
const candidatesList = document.getElementById('candidates-list');

if (!candidatesData || candidatesData.length === 0) {
    candidatesList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">
                <i class="fas fa-user-plus"></i>
            </div>
            <h3>Bắt đầu hành trình tuyển dụng</h3>
            <p>Chưa có ứng viên nào trong hệ thống. Hãy thêm ứng viên đầu tiên để xây dựng đội ngũ của bạn.</p>

            <div class="empty-actions">
                <span class="add-first-text">
                    👉 Vào mục <b>Quản lý ứng viên</b> để thêm hồ sơ mới
                </span>
                <p class="empty-note">Tạo mới hoặc import từ nhiều nguồn khác nhau</p>
            </div>
        </div>
    `;
    return;
}
    candidatesList.innerHTML = candidatesData.map(candidate => `
        <div class="candidate-item" data-id="${candidate.id}">
            <div class="candidate-avatar">
                <img src="${candidate.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(candidate.name) + '&background=random'}" 
                     alt="${candidate.name}">
            </div>
            <div class="candidate-info">
                <h4>${candidate.name}</h4>
                <p>${candidate.position}</p>
                <div class="candidate-meta">
                    <span class="candidate-email"><i class="fas fa-envelope"></i> ${candidate.email}</span>
                    <span class="candidate-phone"><i class="fas fa-phone"></i> ${candidate.phone || 'Chưa có'}</span>
                </div>
            </div>
            <div class="candidate-status">
                <span class="status-badge status-${candidate.status}">${getStatusText(candidate.status)}</span>
                <span class="candidate-date">${formatDate(candidate.created_at)}</span>
            </div>
            <div class="candidate-actions">
                <button class="icon-btn btn-edit" title="Chỉnh sửa" data-id="${candidate.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn btn-delete" title="Xóa" data-id="${candidate.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Thêm event listeners cho các nút
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const candidateId = e.currentTarget.getAttribute('data-id');
            editCandidate(candidateId);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const candidateId = e.currentTarget.getAttribute('data-id');
            deleteCandidate(candidateId);
        });
    });
}

// Lấy text hiển thị cho trạng thái
function getStatusText(status) {
    const statusMap = {
        'new': 'Mới ứng tuyển',
        'reviewed': 'Đã xem xét',
        'interview': 'Phỏng vấn',
        'hired': 'Đã tuyển',
        'rejected': 'Từ chối'
    };
    return statusMap[status] || status;
}

// Định dạng ngày tháng
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Cập nhật thống kê
function updateRecruitmentStats() {
    const openPositions = document.getElementById('open-positions');
    const newCandidates = document.getElementById('new-candidates');
    const todayInterviews = document.getElementById('today-interviews');
    const hiredCount = document.getElementById('hired-count');

    if (openPositions) openPositions.textContent = '12'; // Có thể lấy từ API
    if (newCandidates) newCandidates.textContent = candidates.filter(c => c.status === 'new').length;
    
    // Giả lập số lượng phỏng vấn hôm nay
    const todayInterviewsCount = candidates.filter(c => {
        const interviewDate = new Date(c.interview_date);
        const today = new Date();
        return interviewDate.toDateString() === today.toDateString() && c.status === 'interview';
    }).length;
    
    if (todayInterviews) todayInterviews.textContent = todayInterviewsCount;
    if (hiredCount) hiredCount.textContent = candidates.filter(c => c.status === 'hired').length;
}

// Khởi tạo biểu đồ
function initializeChart() {
    const ctx = document.getElementById('candidateStatusChart').getContext('2d');
    
    window.candidateChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mới ứng tuyển', 'Đã xem xét', 'Phỏng vấn', 'Đã tuyển', 'Từ chối'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    '#3498db',
                    '#f39c12',
                    '#9b59b6',
                    '#27ae60',
                    '#e74c3c'
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
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// Cập nhật biểu đồ
function updateChart() {
    if (!window.candidateChart) return;

    const statusCount = {
        'new': 0,
        'reviewed': 0,
        'interview': 0,
        'hired': 0,
        'rejected': 0
    };

    candidates.forEach(candidate => {
        statusCount[candidate.status]++;
    });

    window.candidateChart.data.datasets[0].data = [
        statusCount.new,
        statusCount.reviewed,
        statusCount.interview,
        statusCount.hired,
        statusCount.rejected
    ];

    window.candidateChart.update();
}

// Thiết lập event listeners
function setupEventListeners() {
    // Modal thêm ứng viên
    const addCandidateBtn = document.getElementById('add-candidate-btn');
    const candidateModal = document.getElementById('candidate-modal');
    const closeModal = document.querySelector('.close');
    const cancelCandidate = document.getElementById('cancel-candidate');
    const candidateForm = document.getElementById('candidate-form');

    if (addCandidateBtn) {
        addCandidateBtn.addEventListener('click', showAddCandidateModal);
    }

    if (closeModal) {
        closeModal.addEventListener('click', hideCandidateModal);
    }

    if (cancelCandidate) {
        cancelCandidate.addEventListener('click', hideCandidateModal);
    }

    if (candidateForm) {
        candidateForm.addEventListener('submit', handleCandidateSubmit);
    }

    // Bộ lọc
    const positionFilter = document.getElementById('position-filter');
    const statusFilter = document.getElementById('status-filter');
    const candidateSearch = document.getElementById('candidate-search');

    if (positionFilter) {
        positionFilter.addEventListener('change', filterCandidates);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', filterCandidates);
    }

    if (candidateSearch) {
        candidateSearch.addEventListener('input', filterCandidates);
    }

    // Đóng modal khi click bên ngoài
    window.addEventListener('click', (e) => {
        if (e.target === candidateModal) {
            hideCandidateModal();
        }
    });
}

// Hiển thị modal thêm ứng viên
function showAddCandidateModal() {
    currentEditingId = null;
    const modal = document.getElementById('candidate-modal');
    const form = document.getElementById('candidate-form');
    const title = modal.querySelector('h3');
    
    title.textContent = 'Thêm ứng viên mới';
    form.reset();
    modal.style.display = 'flex';
    
    // Focus vào trường đầu tiên
    setTimeout(() => {
        document.getElementById('candidate-name').focus();
    }, 100);
}

// Hiển thị modal chỉnh sửa ứng viên
async function editCandidate(candidateId) {
    try {
        showLoading();
        
        const response = await fetch(`tuyendung.php?action=getCandidate&id=${candidateId}`);
        
        if (!response.ok) {
            throw new Error('Lỗi khi tải thông tin ứng viên');
        }

        const result = await response.json();
        
        if (result.success) {
            const candidate = result.data;
            currentEditingId = candidateId;
            showEditCandidateModal(candidate);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        showError('Không thể tải thông tin ứng viên: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Hiển thị modal chỉnh sửa
function showEditCandidateModal(candidate) {
    const modal = document.getElementById('candidate-modal');
    const form = document.getElementById('candidate-form');
    const title = modal.querySelector('h3');
    
    title.textContent = 'Chỉnh sửa ứng viên';
    
    // Điền dữ liệu vào form
    document.getElementById('candidate-name').value = candidate.name;
    document.getElementById('candidate-email').value = candidate.email;
    document.getElementById('candidate-phone').value = candidate.phone || '';
    document.getElementById('candidate-position').value = candidate.position;
    document.getElementById('candidate-source').value = candidate.source || '';
    document.getElementById('candidate-notes').value = candidate.notes || '';
    
    modal.style.display = 'block';
}

// Ẩn modal
function hideCandidateModal() {
    const modal = document.getElementById('candidate-modal');
    modal.style.display = 'none';
    currentEditingId = null;
}

// Xử lý submit form
async function handleCandidateSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const candidateData = {
        name: document.getElementById('candidate-name').value,
        email: document.getElementById('candidate-email').value,
        phone: document.getElementById('candidate-phone').value,
        position: document.getElementById('candidate-position').value,
        source: document.getElementById('candidate-source').value,
        notes: document.getElementById('candidate-notes').value
    };

    // Thêm file CV nếu có
    const resumeFile = document.getElementById('candidate-resume').files[0];
    if (resumeFile) {
        formData.append('resume', resumeFile);
    }

    // Thêm dữ liệu ứng viên
    formData.append('candidateData', JSON.stringify(candidateData));
    
    if (currentEditingId) {
        formData.append('id', currentEditingId);
    }

    try {
        showLoading();
        
        const response = await fetch('tuyendung.php?action=saveCandidate', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            showSuccess(currentEditingId ? 'Cập nhật ứng viên thành công!' : 'Thêm ứng viên thành công!');
            hideCandidateModal();
            loadCandidates(); // Tải lại danh sách
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Lỗi:', error);
        showError('Lỗi khi lưu ứng viên: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Xóa ứng viên
async function deleteCandidate(candidateId) {
    const candidate = candidates.find(c => c.id == candidateId);
    
    if (!candidate) return;

    const result = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: `Bạn có chắc muốn xóa ứng viên ${candidate.name}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (result.isConfirmed) {
        try {
            showLoading();
            
            const response = await fetch('tuyendung.php?action=deleteCandidate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: candidateId })
            });

            const data = await response.json();
            
            if (data.success) {
                showSuccess('Xóa ứng viên thành công!');
                loadCandidates(); // Tải lại danh sách
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Lỗi:', error);
            showError('Lỗi khi xóa ứng viên: ' + error.message);
        } finally {
            hideLoading();
        }
    }
}

// Lọc ứng viên
function filterCandidates() {
    const positionFilter = document.getElementById('position-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const searchTerm = document.getElementById('candidate-search').value.toLowerCase();

    let filteredCandidates = candidates;

    // Lọc theo vị trí
    if (positionFilter) {
        filteredCandidates = filteredCandidates.filter(candidate => 
            candidate.position === positionFilter
        );
    }

    // Lọc theo trạng thái
    if (statusFilter) {
        filteredCandidates = filteredCandidates.filter(candidate => 
            candidate.status === statusFilter
        );
    }

    // Tìm kiếm
    if (searchTerm) {
        filteredCandidates = filteredCandidates.filter(candidate =>
            candidate.name.toLowerCase().includes(searchTerm) ||
            candidate.email.toLowerCase().includes(searchTerm) ||
            candidate.position.toLowerCase().includes(searchTerm)
        );
    }

    renderCandidatesList(filteredCandidates);
}

// Hiển thị loading
function showLoading() {
    // Có thể thêm spinner loading ở đây
    console.log('Loading...');
}

// Ẩn loading
function hideLoading() {
    console.log('Loading completed');
}

// Hiển thị thông báo thành công
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Thành công!',
        text: message,
        timer: 2000,
        showConfirmButton: false
    });
}

// Hiển thị thông báo lỗi
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Lỗi!',
        text: message,
        confirmButtonText: 'OK'
    });
}