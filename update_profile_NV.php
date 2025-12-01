<?php
session_start();
include("config.php");

// Ưu tiên xác thực qua session trước
$authenticated = false;
$user = null;

// Kiểm tra session trước
if (isset($_SESSION['user_id']) && isset($_SESSION['token'])) {
    try {
        $stmt = $conn->prepare("
            SELECT users.* FROM login_sessions
            JOIN users ON users.id = login_sessions.user_id
            WHERE session_token = ? AND expires_at > NOW()
        ");
        $stmt->execute([$_SESSION['token']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            $authenticated = true;
            $token = $_SESSION['token'];
        }
    } catch (PDOException $e) {
        // Log lỗi nhưng tiếp tục kiểm tra các phương thức khác
        error_log("Session auth error: " . $e->getMessage());
    }
}

// Nếu session không hợp lệ, thử các phương thức khác
if (!$authenticated) {
    $token = '';
    
    // Kiểm tra Authorization header
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
    } 
    // Kiểm tra POST parameter
    else if (isset($_POST['auth_token'])) {
        $token = $_POST['auth_token'];
    }
    // Kiểm tra cookie
    else if (isset($_COOKIE['auth_token'])) {
        $token = $_COOKIE['auth_token'];
    }

    if (empty($token)) {
        http_response_code(401);
        die(json_encode(['error' => 'Bạn chưa đăng nhập!']));
    }

    // Xác thực token
    try {
        $stmt = $conn->prepare("
            SELECT users.* FROM login_sessions
            JOIN users ON users.id = login_sessions.user_id
            WHERE session_token = ? AND expires_at > NOW()
        ");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(401);
            die(json_encode(['error' => 'Phiên đăng nhập không hợp lệ!']));
        }
        
        // Cập nhật session để lần sau dễ dàng hơn
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['token'] = $token;
        
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Lỗi xác thực: ' . $e->getMessage()]));
    }
}

// Xử lý cập nhật thông tin
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Kiểm tra token CSRF
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        http_response_code(403);
        die(json_encode(['error' => 'Token bảo mật không hợp lệ!']));
    }
    
    $id = $_POST['id'] ?? '';
    $name = htmlspecialchars(trim($_POST['name'] ?? ''));
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    
    // Kiểm tra dữ liệu
    if (empty($id) || empty($name) || !$email) {
        http_response_code(400);
        die(json_encode(['error' => 'Dữ liệu không hợp lệ!']));
    }
    
    try {
        // Kiểm tra email trùng lặp (trừ email của chính mình)
        $stmt = $conn->prepare("SELECT id FROM employees WHERE email = ? AND id != ?");
        $stmt->execute([$email, $id]);
        if ($stmt->fetch()) {
            http_response_code(409);
            die(json_encode(['error' => 'Email đã được sử dụng bởi nhân viên khác!']));
        }
        
        // Cập nhật thông tin
        $stmt = $conn->prepare("UPDATE employees SET name = ?, email = ? WHERE id = ?");
        if ($stmt->execute([$name, $email, $id])) {
            // Đồng bộ email trong bảng users nếu cần
            if (isset($user['email']) && $user['email'] !== $email) {
                $stmt = $conn->prepare("UPDATE users SET email = ? WHERE id = ?");
                $stmt->execute([$email, $user['id']]);
            }
            
            echo json_encode(['success' => 'Cập nhật thông tin thành công!']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Có lỗi xảy ra khi cập nhật!']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(['error' => 'Lỗi cơ sở dữ liệu: ' . $e->getMessage()]));
    }
    exit;
}

http_response_code(405);
die(json_encode(['error' => 'Phương thức không được hỗ trợ!']));
?>