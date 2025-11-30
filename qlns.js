// qlns.js - Script chính cho trang quản lý nhân sự

// Biến toàn cục
let currentUser = null;
let employees = [];
let departments = JSON.parse(localStorage.getItem('departments')) || [];
let projects = JSON.parse(localStorage.getItem('projects')) || [];
let searchTimeout;

// ==================== HÀM ĐỒNG BỘ THỐNG KÊ NHÂN VIÊN ====================

/**
 * Cập nhật thống kê nhân viên trên dashboard từ localStorage
 */
function updateDashboardEmployeeStats() {
    try {
        const stats = JSON.parse(localStorage.getItem('employeeStats') || '{}');

        // Cập nhật các phần tử trên dashboard
        const totalEmployeesEl = document.querySelectorAll('[data-employee-count]');
        const activeEmployeesDashEl = document.getElementById('active-employees-dash');
        const inactiveEmployeesDashEl = document.getElementById('inactive-employees-dash');

        if (totalEmployeesEl) {
            totalEmployeesEl.textContent = stats.total || 0;
        }
        if (activeEmployeesDashEl) {
            activeEmployeesDashEl.textContent = stats.active || 0;
        }
        if (inactiveEmployeesDashEl) {
            inactiveEmployeesDashEl.textContent = stats.inactive || 0;
        }

        console.log('Đã cập nhật thống kê nhân viên trên dashboard:', stats);
    } catch (error) {
        console.error('Lỗi khi cập nhật thống kê nhân viên:', error);
    }
}

// Thêm hàm này nếu chưa có trong qlns.js
function initEmployeeStatsSync() {
    // Cập nhật ngay khi trang load
    updateDashboardStats();

    // Lắng nghe sự kiện storage (khi có thay đổi từ tab khác)
    window.addEventListener('storage', function (e) {
        if (e.key === 'employeeStats') {
            console.log('🔄 Nhận thông báo cập nhật stats từ tab khác');
            updateDashboardStats();
        }
    });

    // Lắng nghe sự kiện tùy chỉnh (trong cùng tab)
    window.addEventListener('employeeStatsUpdated', function (e) {
        console.log('🔄 Nhận sự kiện employeeStatsUpdated từ nhansu.js');
        updateDashboardStats();
    });

    // Cập nhật định kỳ mỗi 5 giây để đảm bảo đồng bộ
    setInterval(updateDashboardStats, 5000);
}

// Định nghĩa API_BASE_URL - SỬA LẠI ĐƯỜNG DẪN
const API_BASE_URL = 'http://localhost/unitop-php';

// Khởi tạo ứng dụng khi trang được tải
// Khởi tạo ứng dụng khi trang được tải
document.addEventListener('DOMContentLoaded', function () {
    console.log('=== QLNS.JS ĐƯỢC TẢI ===');
    console.log('API Base URL:', API_BASE_URL); // Debug

    // KIỂM TRA TRANG HIỆN TẠI NGAY LẬP TỨC
    const currentPage = window.location.pathname.split("/").pop();
    console.log('Trang hiện tại:', currentPage);

    console.log('Đang ở trang qlns.html, khởi tạo...');

    // ĐỒNG BỘ DỮ LIỆU
    syncEmployeesData();

    // KHỞI TẠO ỨNG DỤNG
    initializeApp();
    setupEventListeners();
    updateCurrentDate();

    // THÊM DÒNG NÀY: Khởi tạo đồng bộ thống kê nhân viên
    initEmployeeStatsSync();
});
// Khởi tạo ứng dụng
async function initializeApp() {
    try {
        console.log('Bắt đầu khởi tạo ứng dụng...');

        // Kiểm tra trạng thái đăng nhập
        const isLoggedIn = await checkLoginStatus();

        if (isLoggedIn) {
            console.log('Đã đăng nhập, khởi tạo dữ liệu...');

            // Khởi tạo dữ liệu
            initializeSampleData();
            updateDashboardStats();

            setupSearchKeyboardNavigation();

            console.log('Khởi tạo ứng dụng thành công');
        }
    } catch (error) {
        console.error('Lỗi khởi tạo ứng dụng:', error);
    }
}

// Kiểm tra trạng thái đăng nhập với server - PHIÊN BẢN ĐÃ SỬA
// Kiểm tra trạng thái đăng nhập - PHIÊN BẢN ĐÃ XÓA verify_session.php
async function checkLoginStatus() {
    console.log('🔐 Kiểm tra đăng nhập...');

    const savedUser = localStorage.getItem('currentUser');
    const sessionToken = localStorage.getItem('session_token');

    console.log('Thông tin đăng nhập:', {
        savedUser: !!savedUser,
        sessionToken: !!sessionToken
    });

    // NẾU KHÔNG CÓ THÔNG TIN ĐĂNG NHẬP -> CHUYỂN HƯỚNG NGAY
    if (!savedUser || !sessionToken) {
        console.log('❌ Không có session, chuyển hướng đến login');
        showLoginPage();
        return false; // QUAN TRỌNG: return ngay lập tức
    }

    // NẾU CÓ THÔNG TIN ĐĂNG NHẬP TRONG LOCALSTORAGE -> CHO PHÉP TRUY CẬP
    try {
        console.log('Có session, sử dụng dữ liệu local...');

        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            showDashboard();
            updateUserInfo(); // CẬP NHẬT THÔNG TIN USER
            applyRolePermissions(); // ÁP DỤNG PHÂN QUYỀN
            return true;
        } else {
            showLoginPage();
            return false;
        }
    } catch (parseError) {
        console.error('Lỗi parse user data:', parseError);
        showLoginPage();
        return false;
    }
}


/// Áp dụng quyền hạn truy cập dựa trên vai trò của người dùng - ĐÃ SỬA HOÀN TOÀN
function applyRolePermissions() {
    if (!currentUser) {
        console.log('Không có currentUser, không thể áp dụng phân quyền');
        return;
    }

    console.log('Áp dụng phân quyền cho:', currentUser.role);

    // Lấy tất cả các menu item trong sidebar
    const sidebarItems = document.querySelectorAll('.sidebar-nav ul li');
    const cards = document.querySelectorAll('.card');

    if (currentUser.role === 'admin') {
        // Admin: Hiển thị tất cả
        console.log('Admin: Hiển thị tất cả menu và card');

        sidebarItems.forEach(item => {
            item.style.display = 'block';
            item.style.opacity = '1';
            item.style.pointerEvents = 'auto';
        });

        cards.forEach(card => {
            card.style.display = 'block';
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        });

    } else if (currentUser.role === 'employee') {
        // Nhân viên: Làm mờ các menu không được phép, nhưng vẫn click được


        // Xử lý cards trên dashboard
        cards.forEach(card => {
            const cardId = card.id;
            // Chỉ hiển thị card chấm công cho nhân viên
            if (cardId === 'card-schedule') {
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            } else {
                card.style.display = 'block';
                card.style.opacity = '0.6';
                card.style.pointerEvents = 'auto';
            }
        });
    }

    // Ẩn biểu đồ và thống kê nếu là nhân viên

}




// Hiển thị trang đăng nhập - PHIÊN BẢN AN TOÀN
function showLoginPage() {
    console.log('🔄 Chuyển hướng đến trang đăng nhập...');

    // KIỂM TRA LẠI TRANG HIỆN TẠI
    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === 'login.html') {
        console.log('Đã ở trang login, không chuyển hướng');
        return;
    }

    console.log('Thực hiện chuyển hướng đến login.html');
    window.location.href = 'login.html';
}

// Hiển thị dashboard
function showDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'flex';
        console.log('✅ Đã hiển thị dashboard');
    }
}



// Cập nhật thông tin người dùng trên giao diện - ĐÃ SỬA
function updateUserInfo() {
    if (!currentUser) {
        console.log('Không có currentUser');
        return;
    }

    console.log('Cập nhật thông tin user:', currentUser);

    // Cập nhật avatar và tên người dùng - SỬA LẠI PHẦN NÀY
    const avatars = document.querySelectorAll('#user-avatar, .user-avatar img');
    const usernames = document.querySelectorAll('#username, #sidebar-username, .user-name');
    const userEmails = document.querySelectorAll('#user-email, .user-email');
    const userRoles = document.querySelectorAll('#user-role, .user-role');

    // Cập nhật avatar (ưu tiên avatar từ Google)
    avatars.forEach(avatar => {
        if (currentUser.avatar_url) {
            avatar.src = currentUser.avatar_url;
        } else if (currentUser.picture) {
            avatar.src = currentUser.picture; // Avatar từ Google
        } else {
            avatar.src = 'https://i.pravatar.cc/150?img=1'; // Avatar mặc định
        }
        avatar.alt = currentUser.full_name || currentUser.name || 'User';
    });

    // Cập nhật tên (ưu tiên full_name từ Google)
    usernames.forEach(element => {
        element.textContent = currentUser.full_name || currentUser.name || 'User';
    });

    // Cập nhật email
    userEmails.forEach(element => {
        element.textContent = currentUser.email || 'Không có email';
    });

    // Cập nhật role với badge
    userRoles.forEach(element => {
        const roleText = currentUser.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
        const roleClass = currentUser.role === 'admin' ? 'role-admin' : 'role-employee';
        element.innerHTML = `<span class="role-badge ${roleClass}">${roleText}</span>`;
    });

    // Hiển thị loại đăng nhập nếu có
    const loginTypeElements = document.querySelectorAll('.login-type');
    loginTypeElements.forEach(element => {
        if (currentUser.login_type === 'google') {
            element.textContent = 'Đăng nhập bằng Google';
            element.className = 'login-type google';
        } else {
            element.textContent = 'Đăng nhập thường';
            element.className = 'login-type normal';
        }
    });
}

// Hàm xử lý lỗi toàn cục
function handleGlobalError(error) {
    console.error('Lỗi toàn cục:', error);

    // Chỉ hiển thị thông báo lỗi nếu đang trong trang dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        const errorMessage = `
            <div style="text-align: center; padding: 20px;">
                <h3>Đã xảy ra lỗi</h3>
                <p>Vui lòng thử lại sau hoặc liên hệ quản trị viên.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Tải lại trang
                </button>
            </div>
        `;

        dashboard.innerHTML = errorMessage;
    }
}
// Toggle hiển thị search
function toggleSearch() {
    const searchWrapper = document.querySelector('.search-wrapper');
    const searchInput = document.getElementById('header-search');

    searchWrapper.classList.toggle('active');

    if (searchWrapper.classList.contains('active')) {
        searchInput.focus();
        showSearchResults();
    } else {
        hideSearch();
    }
}

// Ẩn search
function hideSearch() {
    const searchWrapper = document.querySelector('.search-wrapper');
    const searchInput = document.getElementById('header-search');

    searchWrapper.classList.remove('active');
    searchInput.value = '';
    hideSearchResults();
}

// Thiết lập các sự kiện
function setupEventListeners() {
    // Nút đăng xuất
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault(); // QUAN TRỌNG: Ngăn chặn chuyển hướng mặc định
            handleLogout();
        });
    }

    // Nút toggle sidebar
    const toggleBtn = document.querySelector('.toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }

    // Thêm sự kiện cho input tìm kiếm
    const searchInput = document.getElementById('header-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('focus', showSearchResults);
    }
    // Đóng kết quả khi click ra ngoài
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.search-wrapper')) {
            hideSearchResults();
        }
    });

    // Click trên các card để điều hướng
    setupCardNavigation();

    // Xử lý sự kiện cho các phần tử khác
    setupAdditionalEventListeners();
}

// Hàm xử lý tìm kiếm với debounce
function handleSearch(e) {
    const searchTerm = e.target.value.trim();
    const resultsDropdown = document.getElementById('search-results-dropdown');

    clearTimeout(searchTimeout);

    if (!resultsDropdown) {
        createSearchResultsDropdown();
    }

    if (searchTerm.length === 0) {
        showRecentSearches();
        return;
    }

    if (searchTerm.length > 1) {
        showLoadingState();

        // Debounce: chờ 300ms sau khi user ngừng gõ
        searchTimeout = setTimeout(() => {
            try {
                const results = performSearch(searchTerm);
                displaySearchResults(results, searchTerm);
            } catch (error) {
                console.error('Lỗi tìm kiếm:', error);
                showErrorState();
            }
        }, 300);
    } else {
        showEmptyState();
    }
}

// Hiển thị trạng thái rỗng
function showEmptyState() {
    const resultsDropdown = document.getElementById('search-results-dropdown');
    if (resultsDropdown) {
        resultsDropdown.innerHTML = `
            <div class="no-results">
                <p>Nhập từ khóa để tìm kiếm...</p>
            </div>
        `;
        resultsDropdown.style.display = 'block';
    }
}

// Tạo dropdown kết quả
function createSearchResultsDropdown() {
    const searchWrapper = document.querySelector('.search-wrapper');
    const oldDropdown = document.getElementById('search-results-dropdown');
    if (oldDropdown) {
        oldDropdown.remove();
    }

    const dropdownHTML = `
        <div id="search-results-dropdown" class="search-results-dropdown" style="display: none;">
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Nhập từ khóa để tìm kiếm...</p>
            </div>
        </div>
    `;
    searchWrapper.insertAdjacentHTML('beforeend', dropdownHTML);
}

// Hàm tìm kiếm chính với full text search
function performSearch(query) {

    // LUÔN đồng bộ dữ liệu mới nhất trước khi tìm kiếm
    syncEmployeesData();

    const queryLower = query.trim().toLowerCase().replace(/\s+/g, ' ');
    const searchTerms = queryLower.split(' ').filter(term => term.length > 0);

    if (searchTerms.length === 0) {
        return [];
    }

    const results = [];

    // Tìm kiếm nhân viên với full text
    employees.forEach(emp => {
        const searchableText = [
            emp.name, emp.code, emp.department, emp.position,
            emp.email, emp.phone, emp.address
        ].filter(Boolean).join(' ').toLowerCase();

        const score = calculateFullTextScore(searchableText, searchTerms, emp);
        if (score > 0) {
            results.push({
                type: 'employee',
                data: emp,
                score: score
            });
        }
    });

    // Tìm kiếm phòng ban với full text
    departments.forEach(dept => {
        const searchableText = [
            dept.name, dept.description
        ].filter(Boolean).join(' ').toLowerCase();

        const score = calculateFullTextScore(searchableText, searchTerms, dept);
        if (score > 0) {
            results.push({
                type: 'department',
                data: dept,
                score: score
            });
        }
    });

    // Tìm kiếm dự án với full text
    projects.forEach(proj => {
        const searchableText = [
            proj.name, proj.department, proj.status,
            proj.description
        ].filter(Boolean).join(' ').toLowerCase();

        const score = calculateFullTextScore(searchableText, searchTerms, proj);
        if (score > 0) {
            results.push({
                type: 'project',
                data: proj,
                score: score
            });
        }
    });
    // === TÌM KIẾM ĐÀO TẠO (thêm dữ liệu mẫu) ===
    const trainingData = JSON.parse(localStorage.getItem('training')) || getSampleTrainingData();
    trainingData.forEach(training => {
        const searchableText = [
            training.name, training.department, training.status,
            training.description, training.trainer
        ].filter(Boolean).join(' ').toLowerCase();

        const score = calculateFullTextScore(searchableText, searchTerms, training);
        if (score > 0) {
            results.push({
                type: 'training',
                data: training,
                score: score
            });
        }
    });


    // === TÌM KIẾM TUYỂN DỤNG (thêm dữ liệu mẫu) ===
    const recruitmentData = JSON.parse(localStorage.getItem('recruitment')) || getSampleRecruitmentData();
    recruitmentData.forEach(recruitment => {
        const searchableText = [
            recruitment.position, recruitment.department, recruitment.status,
            recruitment.description, recruitment.requirements
        ].filter(Boolean).join(' ').toLowerCase();

        const score = calculateFullTextScore(searchableText, searchTerms, recruitment);
        if (score > 0) {
            results.push({
                type: 'recruitment',
                data: recruitment,
                score: score
            });
        }
    });


    // === TÌM KIẾM TÀI CHÍNH (thêm dữ liệu mẫu) ===
    const financeData = JSON.parse(localStorage.getItem('finance')) || getSampleFinanceData();
    financeData.forEach(finance => {
        const searchableText = [
            finance.name, finance.type, finance.department,
            finance.description, finance.status
        ].filter(Boolean).join(' ').toLowerCase();

        const score = calculateFullTextScore(searchableText, searchTerms, finance);
        if (score > 0) {
            results.push({
                type: 'finance',
                data: finance,
                score: score
            });
        }
    });

    // Sắp xếp kết quả theo độ liên quan
    results.sort((a, b) => b.score - a.score);

    return results;
}

// Tính điểm liên quan với full text search
function calculateFullTextScore(text, searchTerms, item) {
    let totalScore = 0;

    searchTerms.forEach(term => {
        if (text.includes(term)) {
            // Điểm cơ bản cho việc tìm thấy từ khóa
            totalScore += 2;

            // Thêm điểm nếu từ khóa xuất hiện nhiều lần
            const occurrences = (text.match(new RegExp(term, 'g')) || []).length;
            totalScore += Math.min(occurrences * 0.5, 3);

            // Ưu tiên kết quả khớp chính xác
            const exactMatches = text.split(' ').filter(word => word === term).length;
            totalScore += exactMatches * 3;
        }
    });

    // Ưu tiên các trường quan trọng
    if (item.name && searchTerms.some(term => item.name.toLowerCase().includes(term))) {
        totalScore += 5;
    }

    if (item.code && searchTerms.some(term => item.code.toLowerCase().includes(term))) {
        totalScore += 4;
    }

    if (item.email && searchTerms.some(term => item.email.toLowerCase().includes(term))) {
        totalScore += 3;
    }

    return totalScore;
}

// Hàm highlight text trong kết quả tìm kiếm
function highlightText(text, searchTerms) {
    if (!text) return '';

    let highlighted = text.toString();
    searchTerms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    return highlighted;
}

function showLoadingState() {
    const resultsDropdown = document.getElementById('search-results-dropdown');
    if (resultsDropdown) {
        resultsDropdown.innerHTML = `
            <div class="loading-results">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Đang tìm kiếm...</p>
            </div>
        `;
        resultsDropdown.style.display = 'block';
    }
}

// Hiển thị trạng thái lỗi
function showErrorState() {
    const resultsDropdown = document.getElementById('search-results-dropdown');
    if (resultsDropdown) {
        resultsDropdown.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Đã có lỗi xảy ra khi tìm kiếm</p>
            </div>
        `;
        resultsDropdown.style.display = 'block';
    }
}

function setupSearchKeyboardNavigation() {
    const searchInput = document.getElementById('header-search');

    // QUAN TRỌNG: Kiểm tra phần tử có tồn tại không
    if (!searchInput) {
        console.warn('Phần tử header-search không tồn tại trong DOM');
        return;
    }

    searchInput.addEventListener('keydown', function (e) {
        const resultsDropdown = document.getElementById('search-results-dropdown');
        if (!resultsDropdown || resultsDropdown.style.display !== 'block') return;

        const results = resultsDropdown.querySelectorAll('.result-item');
        const currentActive = resultsDropdown.querySelector('.result-item.active');
        let currentIndex = Array.from(results).indexOf(currentActive);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = (currentIndex + 1) % results.length;
                setActiveResult(results, currentIndex);
                break;

            case 'ArrowUp':
                e.preventDefault();
                currentIndex = (currentIndex - 1 + results.length) % results.length;
                setActiveResult(results, currentIndex);
                break;

            case 'Enter':
                e.preventDefault();
                if (currentActive) {
                    currentActive.click();
                }
                break;

            case 'Escape':
                hideSearch();
                break;
        }
    });
}

function setActiveResult(results, index) {
    results.forEach(result => result.classList.remove('active'));
    if (results[index]) {
        results[index].classList.add('active');
        results[index].scrollIntoView({ block: 'nearest' });
    }
}

// Hiển thị kết quả tìm kiếm với highlight
function displaySearchResults(results, searchTerm) {
    const resultsDropdown = document.getElementById('search-results-dropdown');
    if (!resultsDropdown) return;

    if (results.length === 0) {
        resultsDropdown.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Không tìm thấy kết quả cho "${searchTerm}"</p>
            </div>
        `;
        resultsDropdown.style.display = 'block';
        return;
    }

    let html = '';
    const searchTerms = searchTerm.toLowerCase().split(' ');

    // Nhóm kết quả
    const employeesResults = results.filter(r => r.type === 'employee');
    const departmentsResults = results.filter(r => r.type === 'department');
    const projectsResults = results.filter(r => r.type === 'project');
    const trainingResults = results.filter(r => r.type === 'training');
    const recruitmentResults = results.filter(r => r.type === 'recruitment');
    const financeResults = results.filter(r => r.type === 'finance');

    // Nhân viên
    if (employeesResults.length > 0) {
        html += `
            <div class="result-group">
                <h4><i class="fas fa-users"></i> Nhân viên (${employeesResults.length})</h4>
        `;
        employeesResults.slice(0, 5).forEach(result => {
            const emp = result.data;
            html += `
                <div class="result-item" onclick="selectSearchResult('employee', ${emp.id}, '${searchTerm.replace(/'/g, "\\'")}')">
                    <i class="fas fa-user"></i>
                    <div class="result-item-content">
                        <strong>${highlightText(emp.name, searchTerms)}</strong>
                        <span>${highlightText(emp.code, searchTerms)} • ${highlightText(emp.department, searchTerms)}</span>
                        <small>${highlightText(emp.position, searchTerms)}</small>
                    </div>
                </div>
            `;
        });
        if (employeesResults.length > 5) {
            html += `<div class="view-all-results" onclick="showAllEmployeeResults('${searchTerm}')">Xem thêm ${employeesResults.length - 5} kết quả</div>`;
        }
        html += '</div>';
    }

    // Phòng ban
    if (departmentsResults.length > 0) {
        html += `
            <div class="result-group">
                <h4><i class="fas fa-building"></i> Phòng ban (${departmentsResults.length})</h4>
        `;
        departmentsResults.slice(0, 3).forEach(result => {
            const dept = result.data;
            html += `
                <div class="result-item" onclick="selectSearchResult('department', ${dept.id}, '${searchTerm.replace(/'/g, "\\'")}')">
                    <i class="fas fa-sitemap"></i>
                    <div class="result-item-content">
                        <strong>${highlightText(dept.name, searchTerms)}</strong>
                        <span>${highlightText(dept.description, searchTerms)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    // Dự án
    if (projectsResults.length > 0) {
        html += `
            <div class="result-group">
                <h4><i class="fas fa-project-diagram"></i> Dự án (${projectsResults.length})</h4>
        `;
        projectsResults.slice(0, 3).forEach(result => {
            const proj = result.data;
            html += `
                <div class="result-item" onclick="selectSearchResult('project', ${proj.id}, '${searchTerm.replace(/'/g, "\\'")}')">
                    <i class="fas fa-tasks"></i>
                    <div class="result-item-content">
                        <strong>${highlightText(proj.name, searchTerms)}</strong>
                        <span>${highlightText(proj.department, searchTerms)} • ${highlightText(proj.status, searchTerms)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }


    // --- ĐÀO TẠO ---
    if (trainingResults.length > 0) {
        html += `
            <div class="result-group">
                <h4><i class="fas fa-chalkboard-teacher"></i> Đào tạo (${trainingResults.length})</h4>
        `;
        trainingResults.slice(0, 3).forEach(result => {
            const training = result.data;
            html += `
                <div class="result-item" onclick="selectSearchResult('training', ${training.id}, '${searchTerm.replace(/'/g, "\\'")}')">
                    <i class="fas fa-graduation-cap"></i>
                    <div class="result-item-content">
                        <strong>${highlightText(training.name, searchTerms)}</strong>
                        <span>${highlightText(training.department, searchTerms)} • ${highlightText(training.status, searchTerms)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    // --- TUYỂN DỤNG ---
    if (recruitmentResults.length > 0) {
        html += `
            <div class="result-group">
                <h4><i class="fas fa-id-card"></i> Tuyển dụng (${recruitmentResults.length})</h4>
        `;
        recruitmentResults.slice(0, 3).forEach(result => {
            const recruitment = result.data;
            html += `
                <div class="result-item" onclick="selectSearchResult('recruitment', ${recruitment.id}, '${searchTerm.replace(/'/g, "\\'")}')">
                    <i class="fas fa-briefcase"></i>
                    <div class="result-item-content">
                        <strong>${highlightText(recruitment.position, searchTerms)}</strong>
                        <span>${highlightText(recruitment.department, searchTerms)} • ${highlightText(recruitment.status, searchTerms)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    // --- TÀI CHÍNH ---
    if (financeResults.length > 0) {
        html += `
            <div class="result-group">
                <h4><i class="fas fa-piggy-bank"></i> Tài chính (${financeResults.length})</h4>
        `;
        financeResults.slice(0, 3).forEach(result => {
            const finance = result.data;
            html += `
                <div class="result-item" onclick="selectSearchResult('finance', ${finance.id}, '${searchTerm.replace(/'/g, "\\'")}')">
                    <i class="fas fa-money-bill-wave"></i>
                    <div class="result-item-content">
                        <strong>${highlightText(finance.name, searchTerms)}</strong>
                        <span>${highlightText(finance.type, searchTerms)} • ${highlightText(finance.status, searchTerms)}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }


    resultsDropdown.innerHTML = html;
    resultsDropdown.style.display = 'block';
}

// Hàm xem tất cả kết quả
function showAllResults(type, searchTerm) {
    let url = '';

    switch (type) {
        case 'employee':
            url = `nhansu.html?search=${encodeURIComponent(searchTerm)}`;
            break;
        case 'department':
            url = `tochuc.html?search=${encodeURIComponent(searchTerm)}`;
            break;
        case 'project':
            url = `duan.html?search=${encodeURIComponent(searchTerm)}`;
            break;
        case 'training':
            url = `daotao.html?search=${encodeURIComponent(searchTerm)}`;
            break;
        case 'recruitment':
            url = `tuyendung.html?search=${encodeURIComponent(searchTerm)}`;
            break;
        case 'finance':
            url = `taichinh.html?search=${encodeURIComponent(searchTerm)}`;
            break;
        default:
            console.log('Loại không được hỗ trợ:', type);
            return;
    }

    if (url) {
        window.location.href = url;
    }
}
// Hiển thị kết quả tìm kiếm
function showSearchResults() {
    const resultsDropdown = document.getElementById('search-results-dropdown');
    if (resultsDropdown) {
        const searchInput = document.getElementById('header-search');
        if (searchInput && searchInput.value.trim() === '') {
            showRecentSearches();
        } else {
            resultsDropdown.style.display = 'block';
        }
    } else {
        createSearchResultsDropdown();
        showEmptyState();
    }
}

// Ẩn kết quả
function hideSearchResults() {
    const resultsDropdown = document.getElementById('search-results-dropdown');
    if (resultsDropdown) {
        resultsDropdown.style.display = 'none';
    }
}

// Xử lý khi chọn kết quả
function selectSearchResult(type, id, query = '') {
    hideSearch();

    // Lưu vào recent searches
    if (query) {
        saveToRecentSearches(query, type, id);
    }

    switch (type) {
        case 'employee':
            window.location.href = `nhansu.html?employeeId=${id}`;
            break;
        case 'department':
            window.location.href = `tochuc.html?departmentId=${id}`;
            break;
        case 'project':
            window.location.href = `duan.html?projectId=${id}`;
            break;

        case 'training':
            window.location.href = `daotao.html?trainingId=${id}`;
            break;
        case 'recruitment':
            window.location.href = `tuyendung.html?recruitmentId=${id}`;
            break;
        case 'finance':
            window.location.href = `taichinh.html?financeId=${id}`;
            break;
        default:
            console.log('Loại tìm kiếm chưa được hỗ trợ:', type);
    }
}

function getResultIcon(type) {
    const icons = {
        'employee': 'user',
        'department': 'building',
        'project': 'project-diagram',
        'training': 'graduation-cap',
        'recruitment': 'briefcase',
        'finance': 'money-bill-wave'
    };
    return icons[type] || 'search';
}


function removeRecentSearch(event, timestamp) {
    event.stopPropagation(); // Ngăn chặn sự kiện click lan truyền

    const recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    const updatedSearches = recentSearches.filter(item => item.timestamp !== timestamp);

    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    showRecentSearches(); // Refresh hiển thị
}

// Xử lý đăng xuất
async function handleLogout() {
    const sessionToken = localStorage.getItem('session_token');

    // Hiển thị confirm dialog
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
        return; // Người dùng hủy, không làm gì cả
    }

    try {
        // Hiển thị loading
        Swal.fire({
            title: 'Đang đăng xuất...',
            text: 'Vui lòng chờ trong giây lát',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        if (sessionToken) {
            const response = await fetch(`${API_BASE_URL}/logout.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_token: sessionToken
                })
            });

            const result = await response.json();

            if (!result.success) {
                console.warn('Logout warning:', result.message);
                // Vẫn tiếp tục đăng xuất dù server có lỗi
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

        // Chuyển hướng về trang login
        window.location.href = 'login.html';

    } catch (error) {
        console.error('Logout error:', error);

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
// Toggle sidebar trên mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

// Thiết lập điều hướng khi click vào card
function setupCardNavigation() {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('click', function () {
            const cardId = this.id;
            navigateToPage(cardId);
        });

        // Thêm hiệu ứng hover
        card.addEventListener('mouseenter', function () {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.3s ease';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'translateY(0)';
        });

    });
}


// Cập nhật điều hướng trang - ĐÃ SỬA PHÂN QUYỀN
function navigateToPage(cardId) {
    let pageUrl = '';
    let pageName = '';

    // Kiểm tra nếu là nhân viên và không phải trang được phép


    switch (cardId) {
        case 'card-employees':
            pageUrl = 'nhansu.html';
            pageName = 'Quản lý nhân sự';
            break;
        case 'card-projects':
            pageUrl = 'duan.html';
            pageName = 'Quản lý dự án';
            break;
        case 'card-departments':
            pageUrl = 'tochuc.html';
            pageName = 'Tổ chức';
            break;
        case 'card-training':
            pageUrl = 'daotao.html';
            pageName = 'Đào tạo';
            break;
        case 'card-schedule':
            pageUrl = 'lichhr.html';
            pageName = 'Lịch HR';
            break;
        case 'card-tasks':
            pageUrl = 'hieusuat.html';
            pageName = 'Hiệu suất';
            break;
        case 'card-notifications':
            pageUrl = 'lichhr.html';
            pageName = 'Lịch HR';
            break;
        case 'card-profile':
            pageUrl = 'tuyendung.html';
            pageName = 'Tuyển dụng';
            break;
        case 'card-salary':
            pageUrl = 'taichinh.html';
            pageName = 'Tài chính';
            break;
        default:
            console.log('Trang chưa được triển khai');
            return;
    }

    if (pageUrl) {
        Swal.fire({
            title: 'Đang chuyển trang...',
            text: `Chuyển đến ${pageName}`,
            icon: 'info',
            timer: 1000,
            showConfirmButton: false
        }).then(() => {
            window.location.href = pageUrl;
        });
    }
}


// Thiết lập các sự kiện bổ sung
function setupAdditionalEventListeners() {
    // Xử lý sự kiện cho notification bell
    const notificationBell = document.querySelector('.fa-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', showNotifications);
    }
}

// Hiển thị dropdown thông báo
function showNotifications() {
    const notificationDropdown = document.getElementById('notification-dropdown');

    // Tạo dropdown nếu chưa tồn tại
    if (!notificationDropdown) {
        createNotificationDropdown();
    } else {
        // Toggle hiển thị dropdown
        notificationDropdown.style.display =
            notificationDropdown.style.display === 'block' ? 'none' : 'block';

        // Ẩn các dropdown khác
        hideOtherDropdowns('notification-dropdown');
    }
}

// Tạo dropdown thông báo
function createNotificationDropdown() {
    const notificationBell = document.querySelector('.fa-bell');
    const dropdownHTML = `
        <div id="notification-dropdown" class="dropdown-menu notification-dropdown">
            <div class="dropdown-header">
                <h4>Thông báo</h4>
                <span class="notification-count">3 mới</span>
            </div>
            <div class="dropdown-content">
                <div class="notification-item unread">
                    <div class="notification-icon">
                        <i class="fas fa-user-plus" style="color: #3498db;"></i>
                    </div>
                    <div class="notification-content">
                        <p><strong>3 nhân viên mới</strong> trong tuần</p>
                        <span class="notification-time">2 giờ trước</span>
                    </div>
                </div>
                <div class="notification-item unread">
                    <div class="notification-icon">
                        <i class="fas fa-file-contract" style="color: #f39c12;"></i>
                    </div>
                    <div class="notification-content">
                        <p><strong>2 hợp đồng</strong> sắp hết hạn</p>
                        <span class="notification-time">1 ngày trước</span>
                    </div>
                </div>
                <div class="notification-item">
                    <div class="notification-icon">
                        <i class="fas fa-check-circle" style="color: #27ae60;"></i>
                    </div>
                    <div class="notification-content">
                        <p><strong>Dự án ABC</strong> đã hoàn thành</p>
                        <span class="notification-time">3 ngày trước</span>
                    </div>
                </div>
                <div class="notification-item">
                    <div class="notification-icon">
                        <i class="fas fa-birthday-cake" style="color: #e74c3c;"></i>
                    </div>
                    <div class="notification-content">
                        <p><strong>2 nhân viên</strong> có sinh nhật hôm nay</p>
                        <span class="notification-time">Hôm nay</span>
                    </div>
                </div>
            </div>
            <div class="dropdown-footer">
                <a href="#" class="view-all">Xem tất cả thông báo</a>
            </div>
        </div>
    `;

    notificationBell.insertAdjacentHTML('afterend', dropdownHTML);

    // Gắn sự kiện đóng dropdown khi click ra ngoài
    setTimeout(() => {
        setupDropdownCloseEvents('notification-dropdown');
    }, 100);
}

// Ẩn các dropdown khác
function hideOtherDropdowns(currentDropdownId) {
    const dropdowns = ['notification-dropdown', 'user-dropdown'];

    dropdowns.forEach(dropdownId => {
        if (dropdownId !== currentDropdownId) {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                dropdown.style.display = 'none';
            }
        }
    });
}

// Thiết lập sự kiện đóng dropdown khi click ra ngoài
function setupDropdownCloseEvents(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && !e.target.closest('.fa-bell, .user-profile')) {
            dropdown.style.display = 'none';
        }
    });
}

// Cập nhật ngày hiện tại
function updateCurrentDate() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    const dateString = now.toLocaleDateString('vi-VN', options);
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}

// Khởi tạo dữ liệu mẫu - SỬA LẠI
function initializeSampleData() {
    // QUAN TRỌNG: Đồng bộ dữ liệu nhân viên từ nhansu.js
    // Luôn lấy dữ liệu mới nhất từ localStorage
    syncEmployeesData();

    // Dữ liệu phòng ban mẫu
    if (departments.length === 0) {
        departments = [
            { id: 1, name: 'IT', description: 'Phòng Kỹ thuật - Phát triển sản phẩm' },
            { id: 2, name: 'Nhân sự', description: 'Phòng Nhân sự - Quản lý nhân sự' },
            { id: 3, name: 'Kinh doanh', description: 'Phòng Kinh doanh - Bán hàng' },
            { id: 4, name: 'Marketing', description: 'Phòng Marketing - Quảng bá' },
            { id: 5, name: 'Tài chính', description: 'Phòng Tài chính - Kế toán' }
        ];
        localStorage.setItem('departments', JSON.stringify(departments));
    }

    // Dữ liệu dự án mẫu
    if (projects.length === 0) {
        projects = [
            { id: 1, name: 'Dự án Website', status: 'ongoing', progress: 65, department: 'IT' },
            { id: 2, name: 'Dự án Mobile App', status: 'completed', progress: 100, department: 'IT' },
            { id: 3, name: 'Dự án CRM', status: 'ongoing', progress: 30, department: 'Kinh doanh' },
            { id: 4, name: 'Chiến dịch Marketing Q4', status: 'ongoing', progress: 45, department: 'Marketing' }
        ];
        localStorage.setItem('projects', JSON.stringify(projects));
    }

    // === THÊM DỮ LIỆU MẪU CHO CÁC TRANG KHÁC ===

    // Dữ liệu đào tạo mẫu
    const trainingData = JSON.parse(localStorage.getItem('training')) || [];
    if (trainingData.length === 0) {
        const sampleTraining = [
            {
                id: 1,
                name: 'Đào tạo ReactJS',
                department: 'IT',
                status: 'ongoing',
                description: 'Khóa học ReactJS cơ bản đến nâng cao',
                trainer: 'Nguyễn Văn A',
                startDate: '2024-01-15',
                endDate: '2024-02-15',
                participants: 12,
                location: 'Phòng đào tạo'
            },
            {
                id: 2,
                name: 'Kỹ năng giao tiếp',
                department: 'Nhân sự',
                status: 'completed',
                description: 'Đào tạo kỹ năng giao tiếp chuyên nghiệp',
                trainer: 'Trần Thị B',
                startDate: '2024-01-10',
                endDate: '2024-01-12',
                participants: 25,
                location: 'Hội trường A'
            },
            {
                id: 3,
                name: 'Quản lý dự án Agile',
                department: 'Kinh doanh',
                status: 'upcoming',
                description: 'Đào tạo phương pháp quản lý dự án Agile',
                trainer: 'Lê Văn C',
                startDate: '2024-02-01',
                endDate: '2024-02-03',
                participants: 18,
                location: 'Phòng họp B'
            }
        ];
        localStorage.setItem('training', JSON.stringify(sampleTraining));
    }

    // Dữ liệu tuyển dụng mẫu
    const recruitmentData = JSON.parse(localStorage.getItem('recruitment')) || [];
    if (recruitmentData.length === 0) {
        const sampleRecruitment = [
            {
                id: 1,
                position: 'Lập trình viên Frontend',
                department: 'IT',
                status: 'open',
                description: 'Tuyển dụng lập trình viên ReactJS',
                requirements: '2+ năm kinh nghiệm ReactJS, JavaScript',
                salary: '15-20 triệu',
                deadline: '2024-02-15',
                applicants: 8
            },
            {
                id: 2,
                position: 'Chuyên viên Marketing',
                department: 'Marketing',
                status: 'closed',
                description: 'Tuyển dụng chuyên viên Marketing Digital',
                requirements: 'Có kinh nghiệm SEO, Google Ads, Facebook Ads',
                salary: '12-15 triệu',
                deadline: '2024-01-20',
                applicants: 15
            },
            {
                id: 3,
                position: 'Kế toán tổng hợp',
                department: 'Tài chính',
                status: 'open',
                description: 'Tuyển dụng kế toán tổng hợp',
                requirements: 'Có chứng chỉ kế toán, kinh nghiệm 3 năm',
                salary: '10-13 triệu',
                deadline: '2024-02-28',
                applicants: 12
            }
        ];
        localStorage.setItem('recruitment', JSON.stringify(sampleRecruitment));
    }

    // Dữ liệu tài chính mẫu
    const financeData = JSON.parse(localStorage.getItem('finance')) || [];
    if (financeData.length === 0) {
        const sampleFinance = [
            {
                id: 1,
                name: 'Bảng lương tháng 12/2023',
                type: 'salary',
                department: 'Toàn công ty',
                status: 'completed',
                description: 'Tính toán lương tháng 12 cho nhân viên',
                amount: 250000000,
                date: '2023-12-25',
                createdBy: 'Phòng Tài chính'
            },
            {
                id: 2,
                name: 'Ngân sách quý 1/2024',
                type: 'budget',
                department: 'IT',
                status: 'pending',
                description: 'Lập ngân sách quý 1 cho phòng IT',
                amount: 150000000,
                date: '2024-01-10',
                createdBy: 'Trưởng phòng IT'
            },
            {
                id: 3,
                name: 'Báo cáo thuế quý 4/2023',
                type: 'tax',
                department: 'Tài chính',
                status: 'ongoing',
                description: 'Báo cáo thuế quý 4 năm 2023',
                amount: 45000000,
                date: '2024-01-15',
                createdBy: 'Kế toán trưởng'
            }
        ];
        localStorage.setItem('finance', JSON.stringify(sampleFinance));
    }

    // Dữ liệu chấm công mẫu
    const attendanceData = JSON.parse(localStorage.getItem('attendance')) || [];
    if (attendanceData.length === 0) {
        const sampleAttendance = [
            {
                id: 1,
                employeeName: 'Nguyễn Văn A',
                department: 'IT',
                date: '2024-01-15',
                checkIn: '08:00',
                checkOut: '17:00',
                status: 'present',
                overtime: 0
            },
            {
                id: 2,
                employeeName: 'Trần Thị B',
                department: 'Marketing',
                date: '2024-01-15',
                checkIn: '08:15',
                checkOut: '17:30',
                status: 'present',
                overtime: 0.5
            }
        ];
        localStorage.setItem('attendance', JSON.stringify(sampleAttendance));
    }

    // Dữ liệu hiệu suất mẫu
    const performanceData = JSON.parse(localStorage.getItem('performance')) || [];
    if (performanceData.length === 0) {
        const samplePerformance = [
            {
                id: 1,
                employeeName: 'Nguyễn Văn A',
                department: 'IT',
                period: 'Tháng 12/2023',
                rating: 4.5,
                completedTasks: 15,
                kpi: 95,
                feedback: 'Hoàn thành tốt công việc'
            },
            {
                id: 2,
                employeeName: 'Trần Thị B',
                department: 'Marketing',
                period: 'Tháng 12/2023',
                rating: 4.2,
                completedTasks: 12,
                kpi: 88,
                feedback: 'Có tiến bộ tốt'
            }
        ];
        localStorage.setItem('performance', JSON.stringify(samplePerformance));
    }

    console.log('Đã khởi tạo dữ liệu mẫu cho tất cả các trang');
}

// Hàm đồng bộ dữ liệu nhân viên - THÊM HÀM MỚI
function syncEmployeesData() {
    const nhansuEmployees = JSON.parse(localStorage.getItem('employees'));
    if (nhansuEmployees && Array.isArray(nhansuEmployees)) {
        employees = nhansuEmployees;
    } else {
        // Nếu chưa có dữ liệu, khởi tạo mảng rỗng
        employees = [];
        localStorage.setItem('employees', JSON.stringify(employees));
    }
    console.log('Đồng bộ dữ liệu nhân viên:', employees.length, 'nhân viên');
}

// Cập nhật thống kê dashboard - PHIÊN BẢN ĐÃ SỬA (KHÔNG new-hire-count)
function updateDashboardStats() {
    // Kiểm tra xem có đang ở trang dashboard không
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) {
        console.log('❌ Không phải trang dashboard, không cập nhật stats');
        return;
    }

    console.log('🔄 qlns.js - Đang cập nhật dashboard stats...');

    // ƯU TIÊN: Sử dụng dữ liệu từ localStorage (đồng bộ với nhansu.js)
    const employeeStats = JSON.parse(localStorage.getItem('employeeStats') || '{}');
    console.log('📊 qlns.js - Dữ liệu từ localStorage:', employeeStats);

    const totalEmployees = employeeStats.total || 0;
    const activeEmployees = employeeStats.active || 0;
    const inactiveEmployees = employeeStats.inactive || 0;

    // QUAN TRỌNG: Sử dụng querySelectorAll cho data-employee-count
    const employeeCountElements = document.querySelectorAll('[data-employee-count]');
    const activeEmployeesDashEl = document.getElementById('active-employees-dash');
    const inactiveEmployeesDashEl = document.getElementById('inactive-employees-dash');

    console.log('🔍 qlns.js - Tìm thấy phần tử data-employee-count:', employeeCountElements.length);

    // Cập nhật tất cả các phần tử có data-employee-count
    if (employeeCountElements && employeeCountElements.length > 0) {
        employeeCountElements.forEach(element => {
            element.textContent = totalEmployees;
            console.log('✅ qlns.js - Đã cập nhật data-employee-count:', totalEmployees);
        });
    } else {
        console.warn('❌ qlns.js - Không tìm thấy phần tử [data-employee-count]');
    }

    // Các giá trị khác
    if (activeEmployeesDashEl) {
        activeEmployeesDashEl.textContent = activeEmployees;
        console.log('✅ qlns.js - Đã cập nhật active-employees-dash:', activeEmployees);
    }

    if (inactiveEmployeesDashEl) {
        inactiveEmployeesDashEl.textContent = inactiveEmployees;
        console.log('✅ qlns.js - Đã cập nhật inactive-employees-dash:', inactiveEmployees);
    }

    console.log('✅ qlns.js - Hoàn thành cập nhật dashboard stats');
}

//Phần 2 

//.............................
document.addEventListener('DOMContentLoaded', () => {
    const HR_ANALYTICS_ENDPOINT = "hr-analytics.php";
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

    // Helper: set text
    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // Helper: set width
    function setWidth(id, value) {
        const el = document.getElementById(id);
        if (el) el.style.width = value;
    }

    async function loadHRAnalytics() {
        try {
            const response = await fetch(HR_ANALYTICS_ENDPOINT);

            if (!response.ok) {
                throw new Error("HTTP Status: " + response.status);
            }

            const data = await response.json();

            /* ============================
             * 1. TURNOVER
             ============================ */
            if (data.turnover) {
                setText("turnover-rate", data.turnover.rate ?? "0%");
                setText("turnover-diff", data.turnover.diff ?? "0%");

                const diffEl = document.getElementById("turnover-diff");
                if (diffEl) {
                    diffEl.style.color = data.turnover.diff?.startsWith("+")
                        ? "#e74c3c" // tăng → đỏ
                        : "#27ae60"; // giảm → xanh
                }
            }

            /* ============================
             * 2. TUYỂN MỚI
             ============================ */

            //               new-hire-count = employees.length

            //               new-hire-count luôn bằng số nhân viên:

            //              Sửa thành:
            setText("new-hire-count", employees.length);
            setText("total-candidates", data.totalCandidates ?? 0);

            /* ============================
             * 3. CHI PHÍ TUYỂN DỤNG
             ============================ */
            setText("cost-per-hire", data.costPerHire ?? "0 VNĐ");

            /* ============================
             * 4. ĐÀO TẠO
             ============================ */
            if (data.training) {
                setText("training-percent", data.training.percent ?? "0%");
                setWidth("training-bar", data.training.barWidth ?? "0%");

                const ongoing = data.training.ongoing ?? 0;
                setText("ongoing-courses", ongoing);
                setText("ongoing-courses-2", ongoing);
            }

        } catch (err) {
            console.error("❌ Lỗi tải dữ liệu HR Analytics:", err);
        }
    }

    // Load ngay khi vào trang
    loadHRAnalytics();

    // Tự refresh mỗi 5 phút
    setInterval(loadHRAnalytics, REFRESH_INTERVAL_MS);
});





///......................



// Utility function: Định dạng số
function formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(num);
}

// Utility function: Định dạng ngày (tương thích với nhansu.js)
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Utility function: Lấy text trạng thái (tương thích với nhansu.js)
function getStatusText(status) {
    switch (status) {
        case 'active': return 'Đang làm việc';
        case 'probation': return 'Thử việc';
        case 'inactive': return 'Đã nghỉ';
        default: return status;
    }
}

// Xử lý sự kiện trước khi trang đóng
window.addEventListener('beforeunload', function () {
    // Lưu dữ liệu hiện tại vào localStorage
    localStorage.setItem('departments', JSON.stringify(departments));
    localStorage.setItem('projects', JSON.stringify(projects));
});

// Xử lý lỗi toàn cục
window.addEventListener('error', function (e) {
    console.error('Lỗi toàn cục:', e.error);
});

function saveToRecentSearches(query, type, id) {
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

    // Loại bỏ nếu đã tồn tại
    const existingIndex = recentSearches.findIndex(item =>
        item.query === query && item.type === type && item.id === id
    );

    if (existingIndex > -1) {
        recentSearches.splice(existingIndex, 1);
    }

    // Thêm vào đầu mảng
    recentSearches.unshift({
        query,
        type,
        id,
        timestamp: Date.now()
    });

    // Giới hạn 10 mục
    if (recentSearches.length > 10) {
        recentSearches.pop();
    }

    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
}

function showRecentSearches() {
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    const resultsDropdown = document.getElementById('search-results-dropdown');

    if (recentSearches.length === 0) {
        showEmptyState();
        return;
    }

    let html = `
        <div class="result-group">
            <h4><i class="fas fa-history"></i> Tìm kiếm gần đây</h4>
    `;

    recentSearches.slice(0, 5).forEach(item => {
        html += `
            <div class="result-item" onclick="selectSearchResult('${item.type}', ${item.id})">
                <i class="fas fa-${getResultIcon(item.type)}"></i>
                <div class="result-item-content">
                    <strong>${item.query}</strong>
                    <span>${getResultTypeText(item.type)}</span>
                </div>
                <button class="remove-recent" onclick="removeRecentSearch(event, ${item.timestamp})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });

    html += `</div>`;
    resultsDropdown.innerHTML = html;
    resultsDropdown.style.display = 'block';
}

function getResultTypeText(type) {
    const types = {
        'employee': 'Nhân viên',
        'department': 'Phòng ban',
        'project': 'Dự án',
        'training': 'Đào tạo',
        'recruitment': 'Tuyển dụng',
        'finance': 'Tài chính'
    };
    return types[type] || type;
}

// Hàm refresh dữ liệu để gọi từ các trang khác - THÊM HÀM MỚI
function refreshEmployeesData() {
    syncEmployeesData();
    updateDashboardStats();
    if (typeof initializeCharts === 'function') {
        initializeCharts();
    }
}

// Export các hàm để sử dụng trong console (cho mục đích debug)
window.qlns = {
    getEmployees: () => employees,
    getDepartments: () => departments,
    getProjects: () => projects,
    getCurrentUser: () => currentUser,
    updateDashboard: updateDashboardStats,

    refreshData: refreshEmployeesData // THÊM HÀM MỚI
};