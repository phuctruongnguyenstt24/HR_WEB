<?php
// logout.php

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
        if (!isset($data->session_token)) {
            echo json_encode([
                'success' => false,
                'message' => 'Thiếu thông token đăng nhập'
            ]);
            exit;
        }

        $session_token = trim($data->session_token);
        
        // Kiểm tra dữ liệu rỗng
        if (empty($session_token)) {
            echo json_encode([
                'success' => false,
                'message' => 'Token đăng nhập không hợp lệ'
            ]);
            exit;
        }
        
        $database = new Database();
        $db = $database->getConnection();
        
        // Kiểm tra kết nối database
        if (!$db) {
            throw new Exception('Không thể kết nối đến cơ sở dữ liệu');
        }

        // Kiểm tra xem session token có tồn tại không trước khi update
        $check_query = "SELECT id FROM login_sessions WHERE session_token = :session_token AND logout_time IS NULL";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":session_token", $session_token);
        
        if (!$check_stmt->execute()) {
            throw new Exception('Lỗi truy vấn kiểm tra session');
        }
        
        if ($check_stmt->rowCount() == 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Phiên đăng nhập không tồn tại hoặc đã đăng xuất'
            ]);
            exit;
        }

        // Cập nhật thời gian logout
        $query = "UPDATE login_sessions SET logout_time = NOW() WHERE session_token = :session_token";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":session_token", $session_token);
        
        if ($stmt->execute()) {
            // Kiểm tra xem có bản ghi nào được cập nhật không
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Đăng xuất thành công'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Không thể cập nhật thông tin đăng xuất'
                ]);
            }
        } else {
            // Log lỗi chi tiết
            $errorInfo = $stmt->errorInfo();
            error_log("Logout error: " . $errorInfo[2]);
            
            echo json_encode([
                'success' => false,
                'message' => 'Lỗi đăng xuất'
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
    error_log("Logout system error: " . $e->getMessage());
    
    // Trả về thông báo lỗi chung cho người dùng
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống. Vui lòng thử lại sau.'
    ]);
}
?>