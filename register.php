<?php
// register.php

// Thiết lập error reporting
error_reporting(0);
ini_set('display_errors', 0);

// Thiết lập header JSON ngay từ đầu
header('Content-Type: application/json');

// Xử lý CORS nếu cần
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    include 'config.php';

    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        // Kiểm tra input data
        $input = file_get_contents("php://input");
        
        if (empty($input)) {
            throw new Exception('No input data received');
        }
        
        $data = json_decode($input);
        
        if ($data === null || json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON data');
        }
        
        // Validate required fields
        $required_fields = ['username', 'password', 'confirm_password', 'full_name', 'email', 'role'];
        foreach ($required_fields as $field) {
            if (!isset($data->$field)) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Thiếu thông tin bắt buộc: ' . $field
                ]);
                exit;
            }
        }

        $username = trim($data->username);
        $password = $data->password;
        $confirm_password = $data->confirm_password;
        $full_name = trim($data->full_name);
        $email = trim($data->email);
        $role = $data->role;
        
        // Kiểm tra dữ liệu rỗng
        if (empty($username) || empty($password) || empty($confirm_password) || empty($full_name) || empty($email) || empty($role)) {
            echo json_encode([
                'success' => false,
                'message' => 'Vui lòng điền đầy đủ thông tin'
            ]);
            exit;
        }
        
        // Kiểm tra role hợp lệ
        $valid_roles = ['admin', 'employee'];
        if (!in_array($role, $valid_roles)) {
            echo json_encode([
                'success' => false,
                'message' => 'Phân quyền không hợp lệ'
            ]);
            exit;
        }
        
        // Kiểm tra mật khẩu xác nhận
        if ($password !== $confirm_password) {
            echo json_encode([
                'success' => false,
                'message' => 'Mật khẩu xác nhận không khớp'
            ]);
            exit;
        }
        
        // Kiểm tra độ mạnh mật khẩu
        if (strlen($password) < 6) {
            echo json_encode([
                'success' => false,
                'message' => 'Mật khẩu phải có ít nhất 6 ký tự'
            ]);
            exit;
        }
        
        // Kiểm tra email hợp lệ
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode([
                'success' => false,
                'message' => 'Email không hợp lệ'
            ]);
            exit;
        }

        $database = new Database();
        $db = $database->getConnection();
        
        // Kiểm tra kết nối database
        if (!$db) {
            throw new Exception('Không thể kết nối đến cơ sở dữ liệu');
        }

        // Kiểm tra username đã tồn tại chưa
        $check_username = "SELECT id FROM users WHERE username = :username";
        $stmt_username = $db->prepare($check_username);
        $stmt_username->bindParam(":username", $username);
        
        if (!$stmt_username->execute()) {
            throw new Exception('Lỗi kiểm tra username');
        }
        
        if ($stmt_username->rowCount() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Tên đăng nhập đã tồn tại'
            ]);
            exit;
        }
        
        // Kiểm tra email đã tồn tại chưa
        $check_email = "SELECT id FROM users WHERE email = :email";
        $stmt_email = $db->prepare($check_email);
        $stmt_email->bindParam(":email", $email);
        
        if (!$stmt_email->execute()) {
            throw new Exception('Lỗi kiểm tra email');
        }
        
        if ($stmt_email->rowCount() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Email đã được sử dụng'
            ]);
            exit;
        }
        
        // Hash mật khẩu
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        
        // THAY ĐỔI QUAN TRỌNG: Mặc định is_active = 0 (chờ phê duyệt)
        $is_active = 0;
        $avatar_url = 'assets/default-avatar.png'; // Avatar mặc định
        
        // Thêm user mới vào database với trạng thái chờ phê duyệt
        $query = "INSERT INTO users (username, password, full_name, email, role, is_active, avatar_url, created_at) 
                  VALUES (:username, :password, :full_name, :email, :role, :is_active, :avatar_url, NOW())";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":username", $username);
        $stmt->bindParam(":password", $hashed_password);
        $stmt->bindParam(":full_name", $full_name);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":role", $role);
        $stmt->bindParam(":is_active", $is_active);
        $stmt->bindParam(":avatar_url", $avatar_url);
        
        if ($stmt->execute()) {
            // THAY ĐỔI: Thông báo chờ phê duyệt thay vì thành công ngay lập tức
            echo json_encode([
                'success' => true,
                'message' => 'Đăng ký tài khoản thành công. Tài khoản của bạn đang chờ được phê duyệt bởi quản trị viên.',
                'requires_approval' => true
            ]);
        } else {
            // Log lỗi chi tiết
            $errorInfo = $stmt->errorInfo();
            error_log("Registration error: " . $errorInfo[2]);
            
            echo json_encode([
                'success' => false,
                'message' => 'Lỗi khi tạo tài khoản. Vui lòng thử lại.'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Phương thức không hợp lệ. Chỉ chấp nhận POST.'
        ]);
    }
} catch (Exception $e) {
    // Log error cho quản trị viên
    error_log("Registration system error: " . $e->getMessage());
    
    // Trả về thông báo lỗi chung cho người dùng
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống. Vui lòng thử lại sau.'
    ]);
}
?>