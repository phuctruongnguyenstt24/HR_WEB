<?php
// login.php

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
        if (!isset($data->username) || !isset($data->password)) {
            echo json_encode([
                'success' => false,
                'message' => 'Thiếu thông tin đăng nhập'
            ]);
            exit;
        }

        $username = trim($data->username);
        $password = $data->password;

        // Kiểm tra dữ liệu rỗng
        if (empty($username) || empty($password)) {
            echo json_encode([
                'success' => false,
                'message' => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu'
            ]);
            exit;
        }

        $database = new Database();
        $db = $database->getConnection();

        // Kiểm tra kết nối database
        if (!$db) {
            throw new Exception('Không thể kết nối đến cơ sở dữ liệu');
        }

        // Tìm user theo username hoặc email
        $query = "SELECT * FROM users WHERE username = :username OR email = :email";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":username", $username);
        $stmt->bindParam(":email", $username);

        if (!$stmt->execute()) {
            throw new Exception('Lỗi truy vấn cơ sở dữ liệu');
        }

        if ($stmt->rowCount() == 1) {
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            // Kiểm tra trạng thái tài khoản trước khi xác thực mật khẩu
            if ($user['is_active'] == 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Tài khoản của bạn chưa được phê duyệt. Vui lòng chờ quản trị viên xét duyệt.'
                ]);
                exit;
            }

            // Kiểm tra mật khẩu
            if (password_verify($password, $user['password'])) {
                // Tạo session token
                $session_token = generateSessionToken();
                $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
                $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

                // Thêm logic hết hạn session (7 ngày)
                $expiration_time = time() + (7 * 24 * 60 * 60);
                $expires_at = date('Y-m-d H:i:s', $expiration_time);

                // Lưu session vào database
                $session_query = "INSERT INTO login_sessions (user_id, session_token, ip_address, user_agent, expires_at) 
                     VALUES (:user_id, :session_token, :ip_address, :user_agent, :expires_at)";
                $session_stmt = $db->prepare($session_query);
                $session_stmt->bindParam(":user_id", $user['id']);
                $session_stmt->bindParam(":session_token", $session_token);
                $session_stmt->bindParam(":ip_address", $ip_address);
                $session_stmt->bindParam(":user_agent", $user_agent);
                $session_stmt->bindParam(":expires_at", $expires_at);

                if ($session_stmt->execute()) {
                    // 🔥 THÊM PHẦN NÀY: Tạo PHP Session
                    session_start();
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['session_token'] = $session_token;
                    $_SESSION['user_role'] = $user['role'];
                    $_SESSION['user_email'] = $user['email'];
                    $_SESSION['full_name'] = $user['full_name'];
                    
                    // Đặt thời gian hết hạn cho session (7 ngày)
                    $_SESSION['expire_time'] = $expiration_time;

                    // Trả về thông tin user (không bao gồm password)
                    $user_data = [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'full_name' => $user['full_name'],
                        'email' => $user['email'],
                        'role' => $user['role'],
                        'avatar_url' => $user['avatar_url'],
                        'session_token' => $session_token
                    ];
                    echo json_encode([
                        'success' => true,
                        'message' => 'Đăng nhập thành công',
                        'user' => $user_data
                    ]);
                } else {
                    // Log lỗi chi tiết
                    $errorInfo = $session_stmt->errorInfo();
                    error_log("Session creation error: " . $errorInfo[2]);

                    echo json_encode([
                        'success' => false,
                        'message' => 'Lỗi tạo phiên đăng nhập'
                    ]);
                }
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Mật khẩu không đúng'
                ]);
            }
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Tài khoản không tồn tại'
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
    error_log("Login system error: " . $e->getMessage());

    // Trả về thông báo lỗi chung cho người dùng
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống. Vui lòng thử lại sau.'
    ]);
}

// Hàm tạo session token
if (!function_exists('generateSessionToken')) {
    function generateSessionToken($length = 64)
    {
        if (function_exists('random_bytes')) {
            return bin2hex(random_bytes($length));
        } elseif (function_exists('openssl_random_pseudo_bytes')) {
            return bin2hex(openssl_random_pseudo_bytes($length));
        } else {
            // Fallback (ít bảo mật hơn)
            $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            $token = '';
            for ($i = 0; $i < $length; $i++) {
                $token .= $characters[rand(0, strlen($characters) - 1)];
            }
            return $token;
        }
    }
}
?>