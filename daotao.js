// Sample data for courses
const coursesData = [
    {
        id: 1,
        name: "Kỹ năng giao tiếp chuyên nghiệp",
        teacher: "Nguyễn Thị Hương",
        startDate: "2023-10-15",
        endDate: "2023-10-20",
        students: 25,
        maxStudents: 30,
        rating: 4.5,
        status: "Đang diễn ra",
        department: "Tất cả"
    },
    {
        id: 2,
        name: "Quản lý dự án Agile",
        teacher: "Trần Văn Minh",
        startDate: "2023-10-25",
        endDate: "2023-10-30",
        students: 18,
        maxStudents: 20,
        rating: 4.8,
        status: "Sắp diễn ra",
        department: "Kỹ thuật"
    },
    {
        id: 3,
        name: "Kỹ năng bán hàng chuyên nghiệp",
        teacher: "Lê Thị Hằng",
        startDate: "2023-10-10",
        endDate: "2023-10-12",
        students: 15,
        maxStudents: 15,
        rating: 4.2,
        status: "Đã hoàn thành",
        department: "Kinh doanh"
    },
    {
        id: 4,
        name: "Quản lý tài chính cơ bản",
        teacher: "Phạm Văn Tài",
        startDate: "2023-10-18",
        endDate: "2023-10-22",
        students: 22,
        maxStudents: 25,
        rating: 4.6,
        status: "Đang diễn ra",
        department: "Kế toán"
    },
    {
        id: 5,
        name: "Kỹ năng phỏng vấn tuyển dụng",
        teacher: "Hoàng Thanh Mai",
        startDate: "2023-11-01",
        endDate: "2023-11-03",
        students: 12,
        maxStudents: 20,
        rating: 0,
        status: "Sắp diễn ra",
        department: "Nhân sự"
    },
    {
        id: 6,
        name: "Lập trình ReactJS nâng cao",
        teacher: "Vũ Đình Khôi",
        startDate: "2023-10-05",
        endDate: "2023-10-12",
        students: 18,
        maxStudents: 18,
        rating: 4.9,
        status: "Đã hoàn thành",
        department: "Kỹ thuật"
    }
];

// DOM elements
const activeCoursesList = document.getElementById('active-courses-list');
const upcomingCoursesList = document.getElementById('upcoming-courses-list');
const trainingReportTableBody = document.getElementById('training-report-table-body');
const openCreateModalBtn = document.getElementById('open-create-modal');
const createCourseModal = document.getElementById('create-course-modal');
const closeModalTopBtn = document.getElementById('close-modal-top');
const closeModalBtn = document.getElementById('close-modal-btn');
const saveCourseBtn = document.getElementById('save-course-btn');
const departmentFilter = document.getElementById('department-filter');
const statusFilter = document.getElementById('status-filter');
const sortBy = document.getElementById('sort-by');
const searchInput = document.getElementById('search-input');
const exportReportBtn = document.getElementById('export-report-btn');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem user đã đăng nhập chưa (dashboard có hiển thị không)
    // Nếu chưa đăng nhập, chúng ta vẫn thiết lập event listeners cho phần đăng nhập
    if (document.getElementById('dashboard').style.display === 'block') {
        renderCourses();
    }
    setupEventListeners();
    
    // Nếu đang ở trang đào tạo, luôn render dữ liệu mẫu
    if (window.location.pathname.includes('daotao.html') || 
        window.location.pathname.endsWith('daotao.html') ||
        (window.location.pathname === '/' || window.location.pathname === '')) {
        renderCourses();
    }
});

// Set up event listeners
function setupEventListeners() {
    openCreateModalBtn.addEventListener('click', openCreateModal);
    closeModalTopBtn.addEventListener('click', closeCreateModal);
    closeModalBtn.addEventListener('click', closeCreateModal);
    saveCourseBtn.addEventListener('click', saveCourse);
    
    departmentFilter.addEventListener('change', filterCourses);
    statusFilter.addEventListener('change', filterCourses);
    sortBy.addEventListener('change', filterCourses);
    searchInput.addEventListener('input', filterCourses);
    
    exportReportBtn.addEventListener('click', exportReport);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === createCourseModal) {
            closeCreateModal();
        }
    });
}

// Render courses based on filters
function renderCourses() {
    const departmentValue = departmentFilter.value;
    const statusValue = statusFilter.value;
    const sortValue = sortBy.value;
    const searchValue = searchInput.value.toLowerCase();
    
    // Filter courses
    let filteredCourses = coursesData.filter(course => {
        const matchesDepartment = departmentValue === 'all' || course.department === departmentValue;
        const matchesStatus = statusValue === 'all' || course.status === statusValue;
        const matchesSearch = course.name.toLowerCase().includes(searchValue) || 
                             course.teacher.toLowerCase().includes(searchValue);
        
        return matchesDepartment && matchesStatus && matchesSearch;
    });
    
    // Sort courses
    if (sortValue === 'newest') {
        filteredCourses.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    } else if (sortValue === 'oldest') {
        filteredCourses.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    } else if (sortValue === 'students') {
        filteredCourses.sort((a, b) => b.students - a.students);
    }
    
    // Render active courses
    const activeCourses = filteredCourses.filter(course => course.status === 'Đang diễn ra');
    renderCourseList(activeCourses, activeCoursesList);
    
    // Render upcoming courses
    const upcomingCourses = filteredCourses.filter(course => course.status === 'Sắp diễn ra');
    renderCourseList(upcomingCourses, upcomingCoursesList);
    
    // Render report table
    renderReportTable(filteredCourses);
}

// Render course list
function renderCourseList(courses, container) {
    if (courses.length === 0) {
        container.innerHTML = '<p class="text-muted">Không có khóa học nào.</p>';
        return;
    }
    
    container.innerHTML = courses.map(course => `
        <div class="course-item">
            <div class="course-header">
                <h4 class="course-name">${course.name}</h4>
                <span class="course-status ${getStatusClass(course.status)}">${course.status}</span>
            </div>
            <div class="course-details">
                <div class="course-detail">
                    <i class="fas fa-chalkboard-teacher"></i>
                    <span>${course.teacher}</span>
                </div>
                <div class="course-detail">
                    <i class="fas fa-users"></i>
                    <span>${course.students}/${course.maxStudents} học viên</span>
                </div>
                <div class="course-detail">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${formatDate(course.startDate)} - ${formatDate(course.endDate)}</span>
                </div>
            </div>
            <div class="course-progress">
                <div class="progress-info">
                    <span>Tiến độ</span>
                    <span>${Math.round((course.students / course.maxStudents) * 100)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(course.students / course.maxStudents) * 100}%"></div>
                </div>
            </div>
            <div class="course-actions">
                <button class="btn-icon" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Xóa"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

// Render report table
function renderReportTable(courses) {
    if (courses.length === 0) {
        trainingReportTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Không có dữ liệu khóa học</td></tr>';
        return;
    }
    
    trainingReportTableBody.innerHTML = courses.map(course => `
        <tr>
            <td>${course.name}</td>
            <td>${course.teacher}</td>
            <td>${formatDate(course.startDate)}</td>
            <td>${formatDate(course.endDate)}</td>
            <td>${course.students}/${course.maxStudents}</td>
            <td>${course.rating > 0 ? course.rating + '/5' : 'Chưa có'}</td>
            <td><span class="status-badge ${getStatusClass(course.status)}">${course.status}</span></td>
            <td class="table-actions">
                <button class="btn-icon" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Xóa"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Get status class for styling
function getStatusClass(status) {
    switch(status) {
        case 'Đang diễn ra': return 'status-active';
        case 'Sắp diễn ra': return 'status-upcoming';
        case 'Đã hoàn thành': return 'status-completed';
        default: return '';
    }
}

// Format date to dd/mm/yyyy
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

// Filter courses based on selected filters
function filterCourses() {
    renderCourses();
}

// Open create course modal
function openCreateModal() {
    createCourseModal.style.display = 'flex';
}

// Close create course modal
function closeCreateModal() {
    createCourseModal.style.display = 'none';
    // Reset form
    document.getElementById('course-name').value = '';
    document.getElementById('course-teacher').value = '';
    document.getElementById('course-start').value = '';
    document.getElementById('course-end').value = '';
    document.getElementById('course-students').value = '';
    document.getElementById('course-status').value = 'Đang tiến hành';
}

// Save new course
function saveCourse() {
    const name = document.getElementById('course-name').value;
    const teacher = document.getElementById('course-teacher').value;
    const startDate = document.getElementById('course-start').value;
    const endDate = document.getElementById('course-end').value;
    const students = parseInt(document.getElementById('course-students').value);
    const status = document.getElementById('course-status').value;
    
    // Simple validation
    if (!name || !teacher || !startDate || !endDate || isNaN(students)) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('Ngày kết thúc không thể trước ngày bắt đầu');
        return;
    }
    
    // Add new course (in a real app, this would be sent to a server)
    const newCourse = {
        id: coursesData.length + 1,
        name,
        teacher,
        startDate,
        endDate,
        students,
        maxStudents: students + Math.floor(Math.random() * 10) + 5, // Random max students
        rating: 0,
        status,
        department: 'Tất cả' // Default department
    };
    
    coursesData.push(newCourse);
    
    // Update UI
    renderCourses();
    closeCreateModal();
    
    // Show success message
    alert('Đã tạo khóa học mới thành công!');
}

// Export report to Excel
function exportReport() {
    try {
        // Prepare data for export
        const data = coursesData.map(course => ({
            'Tên khóa học': course.name,
            'Giảng viên': course.teacher,
            'Ngày bắt đầu': formatDate(course.startDate),
            'Ngày kết thúc': formatDate(course.endDate),
            'Số học viên': `${course.students}/${course.maxStudents}`,
            'Đánh giá': course.rating > 0 ? `${course.rating}/5` : 'Chưa có',
            'Trạng thái': course.status,
            'Phòng ban': course.department
        }));
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(data);
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Báo cáo đào tạo");
        
        // Generate Excel file and trigger download
        XLSX.writeFile(wb, "bao_cao_dao_tao.xlsx");
        
    } catch (error) {
        console.error('Lỗi khi xuất báo cáo:', error);
        alert('Có lỗi xảy ra khi xuất báo cáo. Vui lòng thử lại.');
    }
}