// profile_nhanvien.js

document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    setupEventListeners();
});

// Kiểm tra xác thực
function checkAuthentication() {
    const currentUser = localStorage.getItem('currentUser');
    const sessionToken = localStorage.getItem('session_token');
    
    if (!currentUser || !sessionToken) {
        window.location.href = 'login.html';
        return;
    }
}

// Thiết lập event listeners
function setupEventListeners() {
    // Các event listeners sẽ được thêm vào đây
}

// Mở modal chỉnh sửa thông tin
function openEditModal() {
    // Hiển thị modal chỉnh sửa
    Swal.fire({
        title: 'Chỉnh sửa thông tin',
        html: `
            <form id="editProfileForm">
                <div class="form-group">
                    <label>Số điện thoại:</label>
                    <input type="tel" id="editPhone" class="swal2-input" placeholder="Số điện thoại">
                </div>
                <div class="form-group">
                    <label>Địa chỉ:</label>
                    <textarea id="editAddress" class="swal2-textarea" placeholder="Địa chỉ"></textarea>
                </div>
            </form>
        `,
        showCancelButton: true,
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
            return updateProfileInfo();
        }
    });
}

// Mở modal cập nhật avatar
function openAvatarModal() {
    Swal.fire({
        title: 'Cập nhật ảnh đại diện',
        html: `
            <div style="text-align: center;">
                <div class="avatar-preview" style="width: 150px; height: 150px; border-radius: 50%; overflow: hidden; margin: 0 auto 20px; border: 4px solid #3498db;">
                    <img id="avatarPreview" src="${getCurrentUser().avatar_url || 'https://i.pravatar.cc/300?img=12'}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <input type="file" id="avatarUpload" accept="image/*" style="display: none;">
                <button type="button" class="btn btn-outline" onclick="document.getElementById('avatarUpload').click()">Chọn ảnh</button>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Cập nhật',
        cancelButtonText: 'Hủy',
        didOpen: () => {
            document.getElementById('avatarUpload').addEventListener('change', handleAvatarSelect);
        },
        preConfirm: () => {
            return updateAvatar();
        }
    });
}

// Xử lý chọn avatar
function handleAvatarSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatarPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Cập nhật thông tin profile
async function updateProfileInfo() {
    const phone = document.getElementById('editPhone').value;
    const address = document.getElementById('editAddress').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/update_profile.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_token: localStorage.getItem('session_token'),
                phone: phone,
                address: address
            })
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire('Thành công!', 'Cập nhật thông tin thành công', 'success');
            // Reload page để hiển thị thông tin mới
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            Swal.fire('Lỗi!', result.message || 'Cập nhật thất bại', 'error');
        }
    } catch (error) {
        console.error('Lỗi cập nhật profile:', error);
        Swal.fire('Lỗi!', 'Không thể kết nối đến server', 'error');
    }
}

// Cập nhật avatar
async function updateAvatar() {
    const fileInput = document.getElementById('avatarUpload');
    if (!fileInput.files[0]) {
        Swal.showValidationMessage('Vui lòng chọn ảnh');
        return false;
    }

    const formData = new FormData();
    formData.append('avatar', fileInput.files[0]);
    formData.append('session_token', localStorage.getItem('session_token'));

    try {
        const response = await fetch(`${API_BASE_URL}/update_avatar.php`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire('Thành công!', 'Cập nhật ảnh đại diện thành công', 'success');
            // Cập nhật avatar trong localStorage và reload
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            currentUser.avatar_url = result.avatar_url;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            Swal.fire('Lỗi!', result.message || 'Cập nhật thất bại', 'error');
        }
    } catch (error) {
        console.error('Lỗi cập nhật avatar:', error);
        Swal.fire('Lỗi!', 'Không thể kết nối đến server', 'error');
    }
}

// Lấy thông tin user hiện tại
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

// Đăng xuất
function logout() {
    Swal.fire({
        title: 'Đăng xuất?',
        text: 'Bạn có chắc chắn muốn đăng xuất?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            // Xóa dữ liệu localStorage
            localStorage.removeItem('currentUser');
            localStorage.removeItem('session_token');
            
            // Gọi API logout nếu cần
            fetch(`${API_BASE_URL}/logout.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_token: localStorage.getItem('session_token')
                })
            });
            
            // Chuyển hướng về trang login
            window.location.href = 'login.html';
        }
    });
}