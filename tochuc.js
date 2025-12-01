// tochuc.js
document.addEventListener('DOMContentLoaded', () => {
    const orgTree = document.querySelector('.org-tree');
    const tabs = document.querySelectorAll('.details-tabs .tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const detailsTitle = document.querySelector('.details-title');
    const editButton = document.querySelector('.org-actions .btn');
    const infoTab = document.getElementById('info-tab');
    const searchInput = document.querySelector('.tree-search input');

    // Dữ liệu giả lập cho các phòng ban
   let departmentData = JSON.parse(localStorage.getItem('departmentData')) || {
        'Công ty ABC': {
            info: {
                id: 'ABC-001',
                head: 'Nguyễn Văn Tổng Giám đốc',
                phone: '(024) 3716 2898',
                email: 'info@company.com',
                founded: '01/01/2010',
                description: 'Quản lý và điều hành chung toàn bộ công ty.'
            },
            members: [
                { name: 'Nguyễn Văn Tổng Giám đốc', position: 'Tổng Giám đốc', avatar: 'https://i.pravatar.cc/150?img=11' },
                { name: 'Trần Thị Giám đốc', position: 'Giám đốc Điều hành', avatar: 'https://i.pravatar.cc/150?img=12' }
            ],
            stats: {
                total: 125,
                working: 110,
                onLeave: 15,
                projects: 30,
                performance: 85,
                newHires: 25,
                roles: {
                    'Ban Giám đốc': 5,
                    'Phòng Công nghệ': 45,
                    'Phòng Kinh doanh': 30,
                    'Phòng Marketing': 20,
                    'Phòng Nhân sự': 15,
                    'Phòng Kế toán': 10
                }
            }
        },
        'Ban Giám đốc': {
            info: {
                id: 'BD-001',
                head: 'Nguyễn Văn A',
                phone: '(024) 3716 2898',
                email: 'bd@company.com',
                founded: '01/01/2010',
                description: 'Phụ trách công tác quản lý và điều hành các hoạt động kinh doanh, chiến lược, nhân sự,...'
            },
            members: [
                { name: 'Nguyễn Văn A', position: 'Trưởng phòng - Lập trình viên Senior', avatar: 'https://i.pravatar.cc/150?img=1' },
                { name: 'Trần Thị B', position: 'Phó phòng - Quản lý dự án', avatar: 'https://i.pravatar.cc/150?img=2' }
            ],
            stats: {
                total: 5,
                working: 4,
                onLeave: 1,
                projects: 5,
                performance: 95,
                newHires: 1,
                roles: {
                    'Trưởng phòng': 1,
                    'Phó phòng': 1,
                    'Chuyên viên': 3
                }
            }
        },
        'Phòng Công nghệ': {
            info: {
                id: 'IT-001',
                head: 'Nguyễn Văn A',
                deputyHead: 'Trần Thị B',
                phone: '(024) 3716 2898',
                email: 'it@company.com',
                founded: '15/08/2015',
                description: 'Phụ trách phát triển và vận hành hệ thống công nghệ của công ty.'
            },
            members: [
                { name: 'Nguyễn Văn A', position: 'Trưởng phòng - Lập trình viên Senior', avatar: 'https://i.pravatar.cc/150?img=1' },
                { name: 'Trần Thị B', position: 'Phó phòng - Quản lý dự án', avatar: 'https://i.pravatar.cc/150?img=2' },
                { name: 'Lê Văn C', position: 'Lập trình viên Full-stack', avatar: 'https://i.pravatar.cc/150?img=3' },
                { name: 'Phạm Thị D', position: 'Lập trình viên Front-end', avatar: 'https://i.pravatar.cc/150?img=4' },
                { name: 'Hoàng Văn E', position: 'Chuyên viên bảo mật', avatar: 'https://i.pravatar.cc/150?img=5' }
            ],
            stats: {
                total: 45,
                working: 38,
                onLeave: 7,
                projects: 12,
                performance: 82,
                newHires: 15,
                roles: {
                    'Trưởng phòng': 1,
                    'Phó phòng': 1,
                    'Trưởng nhóm': 3,
                    'Chuyên viên': 25,
                    'Thực tập sinh': 5
                }
            }
        },
        'Phòng Kinh doanh': {
            info: {
                id: 'KD-001',
                head: 'Đỗ Thị F',
                deputyHead: 'Vũ Văn G',
                phone: '(024) 3716 2899',
                email: 'sales@company.com',
                founded: '20/02/2012',
                description: 'Tăng trưởng doanh số và mở rộng thị trường cho các sản phẩm/dịch vụ của công ty.'
            },
            members: [
                { name: 'Đỗ Thị F', position: 'Trưởng phòng - Chuyên gia Bán hàng', avatar: 'https://i.pravatar.cc/150?img=6' },
                { name: 'Vũ Văn G', position: 'Phó phòng - Quản lý Đối tác', avatar: 'https://i.pravatar.cc/150?img=7' }
            ],
            stats: {
                total: 30,
                working: 28,
                onLeave: 2,
                projects: 8,
                performance: 90,
                newHires: 10,
                roles: {
                    'Trưởng phòng': 1,
                    'Phó phòng': 1,
                    'Trưởng nhóm': 2,
                    'Nhân viên Kinh doanh': 20,
                    'Thực tập sinh': 6
                }
            }
        },
        'Phòng Marketing': {
            info: {
                id: 'MKT-001',
                head: 'Lê Văn H',
                phone: '(024) 3716 2900',
                email: 'marketing@company.com',
                founded: '10/06/2017',
                description: 'Xây dựng và phát triển thương hiệu, thực hiện các chiến dịch truyền thông.'
            },
            members: [
                { name: 'Lê Văn H', position: 'Trưởng phòng - Chuyên gia Marketing', avatar: 'https://i.pravatar.cc/150?img=8' }
            ],
            stats: {
                total: 20,
                working: 18,
                onLeave: 2,
                projects: 5,
                performance: 88,
                newHires: 8,
                roles: {
                    'Trưởng phòng': 1,
                    'Chuyên viên': 15,
                    'Thực tập sinh': 4
                }
            }
        },
        'Phòng Nhân sự': {
            info: {
                id: 'NS-001',
                head: 'Phạm Thị I',
                phone: '(024) 3716 2901',
                email: 'hr@company.com',
                founded: '05/03/2011',
                description: 'Quản lý nhân sự, tuyển dụng, đào tạo và các chính sách phúc lợi.'
            },
            members: [
                { name: 'Phạm Thị I', position: 'Trưởng phòng - Chuyên gia Nhân sự', avatar: 'https://i.pravatar.cc/150?img=9' }
            ],
            stats: {
                total: 15,
                working: 14,
                onLeave: 1,
                projects: 3,
                performance: 95,
                newHires: 5,
                roles: {
                    'Trưởng phòng': 1,
                    'Chuyên viên Tuyển dụng': 5,
                    'Chuyên viên C&B': 4,
                    'Chuyên viên Đào tạo': 3,
                    'Thực tập sinh': 2
                }
            }
        },
        'Phòng Kế toán': {
            info: {
                id: 'KT-001',
                head: 'Võ Văn K',
                phone: '(024) 3716 2902',
                email: 'acc@company.com',
                founded: '25/07/2013',
                description: 'Quản lý tài chính, kế toán, báo cáo thuế và kiểm toán nội bộ.'
            },
            members: [
                { name: 'Võ Văn K', position: 'Trưởng phòng - Kế toán trưởng', avatar: 'https://i.pravatar.cc/150?img=10' }
            ],
            stats: {
                total: 10,
                working: 10,
                onLeave: 0,
                projects: 2,
                performance: 98,
                newHires: 2,
                roles: {
                    'Trưởng phòng': 1,
                    'Kế toán viên': 7,
                    'Thực tập sinh': 2
                }
            }
        },
        'Nhóm Phát triển': {
            info: {
                id: 'DEV-001',
                head: 'Lê Văn C',
                phone: '(024) 3716 2898',
                email: 'dev@company.com',
                founded: '15/08/2015',
                description: 'Nghiên cứu và phát triển các ứng dụng phần mềm của công ty.'
            },
            members: [
                { name: 'Lê Văn C', position: 'Trưởng nhóm - Lập trình viên Full-stack', avatar: 'https://i.pravatar.cc/150?img=3' },
                { name: 'Phạm Thị D', position: 'Lập trình viên Front-end', avatar: 'https://i.pravatar.cc/150?img=4' }
            ],
            stats: {
                total: 25,
                working: 23,
                onLeave: 2,
                projects: 8,
                performance: 85,
                newHires: 7,
                roles: {
                    'Trưởng nhóm': 1,
                    'Lập trình viên': 20,
                    'Thực tập sinh': 4
                }
            }
        },
        'Nhóm Bảo mật': {
            info: {
                id: 'SEC-001',
                head: 'Hoàng Văn E',
                phone: '(024) 3716 2898',
                email: 'security@company.com',
                founded: '15/08/2015',
                description: 'Đảm bảo an toàn thông tin và bảo mật dữ liệu cho hệ thống công ty.'
            },
            members: [
                { name: 'Hoàng Văn E', position: 'Trưởng nhóm - Chuyên viên bảo mật', avatar: 'https://i.pravatar.cc/150?img=5' }
            ],
            stats: {
                total: 10,
                working: 9,
                onLeave: 1,
                projects: 2,
                performance: 92,
                newHires: 3,
                roles: {
                    'Trưởng nhóm': 1,
                    'Chuyên viên': 9
                }
            }
        },
        'Nhóm Hạ tầng': {
            info: {
                id: 'INFRA-001',
                head: 'Nguyễn Văn Z',
                phone: '(024) 3716 2898',
                email: 'infra@company.com',
                founded: '15/08/2015',
                description: 'Quản lý và vận hành cơ sở hạ tầng mạng, máy chủ và các thiết bị IT.'
            },
            members: [
                { name: 'Nguyễn Văn Z', position: 'Trưởng nhóm - Chuyên viên Hạ tầng', avatar: 'https://i.pravatar.cc/150?img=15' }
            ],
            stats: {
                total: 10,
                working: 6,
                onLeave: 4,
                projects: 2,
                performance: 80,
                newHires: 5,
                roles: {
                    'Trưởng nhóm': 1,
                    'Chuyên viên': 9
                }
            }
        },
        'Nhóm Bán lẻ': {
            info: {
                id: 'TL-001',
                head: 'Phạm Thị G',
                phone: '(024) 3716 2899',
                email: 'retail@company.com',
                founded: '20/02/2012',
                description: 'Quản lý kênh bán hàng trực tiếp, cửa hàng và các hoạt động bán lẻ.'
            },
            members: [
                { name: 'Phạm Thị G', position: 'Trưởng nhóm - Chuyên viên Bán lẻ', avatar: 'https://i.pravatar.cc/150?img=16' }
            ],
            stats: {
                total: 15,
                working: 14,
                onLeave: 1,
                projects: 4,
                performance: 92,
                newHires: 6,
                roles: {
                    'Trưởng nhóm': 1,
                    'Nhân viên bán hàng': 12,
                    'Thực tập sinh': 2
                }
            }
        },
        'Nhóm Đối tác': {
            info: {
                id: 'PT-001',
                head: 'Vũ Văn M',
                phone: '(024) 3716 2899',
                email: 'partner@company.com',
                founded: '20/02/2012',
                description: 'Phát triển và duy trì mối quan hệ với các đối tác chiến lược.'
            },
            members: [
                { name: 'Vũ Văn M', position: 'Trưởng nhóm - Quản lý Đối tác', avatar: 'https://i.pravatar.cc/150?img=17' }
            ],
            stats: {
                total: 15,
                working: 14,
                onLeave: 1,
                projects: 4,
                performance: 88,
                newHires: 4,
                roles: {
                    'Trưởng nhóm': 1,
                    'Chuyên viên': 14
                }
            }
        }
    };

    let currentDepartment = 'Phòng Công nghệ';

    // Initial content setup for the "Phòng Công nghệ" (IT Department)
    updateDepartmentDetails(currentDepartment);

    // Xử lý sự kiện tìm kiếm
    searchInput.addEventListener('input', (event) => {
        const searchText = event.target.value.toLowerCase();
        filterTree(searchText);
    });

    // Lắng nghe sự kiện click trên các nút trong cây tổ chức
    orgTree.addEventListener('click', (event) => {
        const nodeContent = event.target.closest('.tree-node-content');
        if (!nodeContent) return;

        // Xóa class 'active' khỏi tất cả các nút
        orgTree.querySelectorAll('.tree-node-content').forEach(node => {
            node.classList.remove('active');
        });

        // Thêm class 'active' cho nút được click
        nodeContent.classList.add('active');

        // Cập nhật chi tiết dựa trên nút được click
        currentDepartment = nodeContent.querySelector('.node-text').textContent;
        updateDepartmentDetails(currentDepartment);
    });

    // Xử lý sự kiện click trên các tab
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Xóa class 'active' khỏi tất cả các tab và nội dung tab
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Thêm class 'active' cho tab và nội dung tương ứng
            const targetTab = tab.dataset.tab;
            tab.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });

    // Xử lý sự kiện click vào nút "Xem thêm"
    const loadMoreButton = document.querySelector('#members-tab .btn');
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => {
            alert('Chức năng "Xem thêm" đang được phát triển.');
        });
    }

    // Xử lý sự kiện click vào nút "Chỉnh sửa"
    editButton.addEventListener('click', () => {
        const isEditing = editButton.dataset.editing === 'true';
        if (isEditing) {
            // Lưu thay đổi
            saveDepartmentDetails();
        } else {
            // Chuyển sang chế độ chỉnh sửa
            switchToEditMode();
        }
    });

    // Hàm lọc cây tổ chức
    function filterTree(searchText) {
        const allNodes = orgTree.querySelectorAll('.tree-node');

        allNodes.forEach(node => {
            const nodeText = node.querySelector('.node-text').textContent.toLowerCase();
            const parentNode = node.closest('.tree-node');

            // Ẩn hoặc hiện nút dựa vào kết quả tìm kiếm
            if (nodeText.includes(searchText)) {
                node.style.display = 'block';
                // Hiện tất cả các nút cha của nút tìm thấy
                let tempParent = node.parentNode.closest('.tree-node');
                while (tempParent) {
                    tempParent.style.display = 'block';
                    tempParent = tempParent.parentNode.closest('.tree-node');
                }
            } else {
                node.style.display = 'none';
            }
        });

        // Hiện lại các node cha của các node con đã tìm thấy
        const foundNodes = orgTree.querySelectorAll('.tree-node:not([style*="display: none"])');
        foundNodes.forEach(node => {
            let parent = node.closest('.tree-node');
            if (parent) {
                parent.style.display = 'block';
            }
        });
    }

    // Hàm chuyển sang chế độ chỉnh sửa
    function switchToEditMode() {
        // Thay đổi văn bản và biểu tượng của nút
        editButton.innerHTML = '<i class="fas fa-save"></i> Lưu';
        editButton.classList.remove('btn-secondary');
        editButton.classList.add('btn-primary');
        editButton.dataset.editing = 'true';

        // Lấy dữ liệu hiện tại
        const currentData = departmentData[currentDepartment].info;

        // Chuyển văn bản tĩnh sang trường nhập liệu
        infoTab.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Mã phòng ban</div>
                    <input type="text" class="info-input" id="edit-id" value="${currentData.id}" disabled>
                </div>
                <div class="info-item">
                    <div class="info-label">Tên phòng ban</div>
                    <input type="text" class="info-input" id="edit-name" value="${currentDepartment}">
                </div>
                <div class="info-item">
                    <div class="info-label">Trưởng phòng</div>
                    <input type="text" class="info-input" id="edit-head" value="${currentData.head}">
                </div>
                <div class="info-item">
                    <div class="info-label">Phó phòng</div>
                    <input type="text" class="info-input" id="edit-deputy" value="${currentData.deputyHead || ''}">
                </div>
                <div class="info-item">
                    <div class="info-label">Số điện thoại</div>
                    <input type="text" class="info-input" id="edit-phone" value="${currentData.phone}">
                </div>
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <input type="email" class="info-input" id="edit-email" value="${currentData.email}">
                </div>
                <div class="info-item">
                    <div class="info-label">Ngày thành lập</div>
                    <input type="text" class="info-input" id="edit-founded" value="${currentData.founded}">
                </div>
                <div class="info-item full-width">
                    <div class="info-label">Mô tả</div>
                    <textarea class="info-input" id="edit-description">${currentData.description}</textarea>
                </div>
            </div>
            <div class="info-item full-width">
                <div class="info-label">Chức năng nhiệm vụ</div>
                <textarea class="info-input" id="edit-functions" rows="4">
                    ${getFunctionsAsText(currentDepartment)}
                </textarea>
            </div>
        `;
    }

    // Hàm lấy chức năng dưới dạng chuỗi
    function getFunctionsAsText(deptName) {
        switch (deptName) {
            case 'Phòng Công nghệ':
                return 'Phát triển và bảo trì hệ thống phần mềm\nQuản lý hạ tầng công nghệ thông tin\nĐảm bảo an ninh mạng và bảo mật dữ liệu\nNghiên cứu và ứng dụng công nghệ mới';
            case 'Phòng Kinh doanh':
                return 'Tăng trưởng doanh số\nMở rộng thị trường';
            default:
                return 'Chưa có thông tin.';
        }
    }

    // Hàm lưu thông tin phòng ban
    function saveDepartmentDetails() {
        const newName = document.getElementById('edit-name').value;
        const newHead = document.getElementById('edit-head').value;
        const newDeputy = document.getElementById('edit-deputy').value;
        const newPhone = document.getElementById('edit-phone').value;
        const newEmail = document.getElementById('edit-email').value;
        const newFounded = document.getElementById('edit-founded').value;
        const newDescription = document.getElementById('edit-description').value;

        // Cập nhật đối tượng dữ liệu trong bộ nhớ
        const oldData = departmentData[currentDepartment];

        // Lưu trữ dữ liệu cũ dưới tên mới nếu tên thay đổi
        if (currentDepartment !== newName) {
            departmentData[newName] = oldData;
            delete departmentData[currentDepartment];
            currentDepartment = newName;

            // Cập nhật văn bản của nút trong cây tổ chức
            const activeNode = orgTree.querySelector('.tree-node-content.active .node-text');
            if (activeNode) {
                activeNode.textContent = newName;
            }
        }

        // Cập nhật các thuộc tính thông tin
        departmentData[currentDepartment].info.head = newHead;
        departmentData[currentDepartment].info.deputyHead = newDeputy;
        departmentData[currentDepartment].info.phone = newPhone;
        departmentData[currentDepartment].info.email = newEmail;
        departmentData[currentDepartment].info.founded = newFounded;
        departmentData[currentDepartment].info.description = newDescription;


         // Lưu xuống localStorage
          localStorage.setItem('departmentData', JSON.stringify(departmentData));

        // Trở lại chế độ xem và hiển thị lại
        alert('Đã lưu thông tin phòng ban thành công!');
        updateDepartmentDetails(currentDepartment);
    }

    // Hàm cập nhật bảng chi tiết dựa trên phòng ban được chọn
    function updateDepartmentDetails(departmentName) {
        // Chuyển về chế độ xem
        editButton.innerHTML = '<i class="fas fa-pencil-alt"></i> Chỉnh sửa';
        editButton.classList.remove('btn-primary');
        editButton.classList.add('btn-secondary');
        editButton.dataset.editing = 'false';

        // Cập nhật tiêu đề chi tiết
        detailsTitle.textContent = departmentName;

        // Reset về tab 'Thông tin chung'
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        document.querySelector('.tab[data-tab="info"]').classList.add('active');
        infoTab.classList.add('active');

        // Lấy dữ liệu mới
        const data = departmentData[departmentName] || getNotFoundData();

        // Cập nhật tab Thông tin
        updateInfoTab(data.info);

        // Cập nhật tab Thành viên
        updateMembersTab(data.members);

        // Cập nhật tab Thống kê
        updateStatsTab(data.stats);
    }

    // Hàm xử lý trường hợp không tìm thấy dữ liệu
    function getNotFoundData() {
        return {
            info: {
                id: 'N/A',
                head: 'N/A',
                deputyHead: 'N/A',
                phone: 'N/A',
                email: 'N/A',
                founded: 'N/A',
                description: 'Không có thông tin chi tiết cho phòng ban này.'
            },
            members: [],
            stats: {
                total: 0,
                working: 0,
                onLeave: 0,
                projects: 0,
                performance: 0,
                newHires: 0,
                roles: {}
            }
        };
    }

    // Hàm cập nhật tab "Thông tin chung"
    function updateInfoTab(info) {
        infoTab.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Mã phòng ban</div>
                    <div class="info-value">${info.id}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tên phòng ban</div>
                    <div class="info-value">${detailsTitle.textContent}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Trưởng phòng</div>
                    <div class="info-value">${info.head}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Phó phòng</div>
                    <div class="info-value">${info.deputyHead || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Số điện thoại</div>
                    <div class="info-value">${info.phone}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value">${info.email}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Ngày thành lập</div>
                    <div class="info-value">${info.founded}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Mô tả</div>
                    <div class="info-value">${info.description}</div>
                </div>
            </div>
            <div class="info-item full-width">
                <div class="info-label">Chức năng nhiệm vụ</div>
                <div class="info-value">
                    <ul>
                        <li>${getFunctionsAsText(detailsTitle.textContent).split('\n').join('</li><li>')}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    // Hàm cập nhật tab "Thành viên"
    function updateMembersTab(members) {
        const membersList = document.querySelector('#members-tab .members-list');
        const memberCountTab = document.querySelector('.tab[data-tab="members"]');

        if (!membersList || !memberCountTab) return;

        // Cập nhật số lượng thành viên trong tiêu đề tab
        memberCountTab.textContent = `Thành viên (${members.length})`;

        // Xóa các thành viên hiện có
        membersList.innerHTML = '';

        // Hiển thị danh sách thành viên mới
        members.forEach(member => {
            const memberCard = document.createElement('div');
            memberCard.className = 'member-card';
            memberCard.innerHTML = `
                <img src="${member.avatar}" alt="Avatar" class="member-avatar">
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-position">${member.position}</div>
                </div>
                <div class="member-actions">
                    <div class="action-btn"><i class="fas fa-envelope"></i></div>
                    <div class="action-btn"><i class="fas fa-phone"></i></div>
                    <div class="action-btn"><i class="fas fa-ellipsis-v"></i></div>
                </div>
            `;
            membersList.appendChild(memberCard);
        });
    }

    // Hàm cập nhật tab "Thống kê"
    function updateStatsTab(stats) {
        const statsTab = document.getElementById('stats-tab');
        if (!statsTab) return;

        // Cập nhật các thẻ thống kê
        const statCards = statsTab.querySelectorAll('.stat-card .stat-value');
        if (statCards.length >= 6) {
            statCards[0].textContent = stats.total;
            statCards[1].textContent = stats.working;
            statCards[2].textContent = stats.onLeave;
            statCards[3].textContent = stats.projects;
            statCards[4].textContent = `${stats.performance}%`;
            statCards[5].textContent = stats.newHires;
        }

        // Cập nhật danh sách 'Phân bố theo chức vụ'
        const rolesList = statsTab.querySelector('#stats-tab .info-value ul');
        if (rolesList) {
            rolesList.innerHTML = ''; // Xóa danh sách hiện có
            for (const role in stats.roles) {
                if (stats.roles.hasOwnProperty(role)) {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${role}: ${stats.roles[role]}`;
                    rolesList.appendChild(listItem);
                }
            }
        }
    }
});