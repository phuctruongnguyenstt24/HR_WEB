<?php
// admin_approval.php - Xử lý phê duyệt tài khoản

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

session_start();

try {
    include 'config.php';

    // Kiểm tra authentication qua session hoặc token
    function checkAdminAuth() {
        // Kiểm tra session
        if (isset($_SESSION['user_id']) && isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') {
            return true;
        }
        
        // Kiểm tra token từ header
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
            
            $database = new Database();
            $db = $database->getConnection();
            
            $query = "SELECT u.* FROM users u 
                     INNER JOIN login_sessions ls ON u.id = ls.user_id 
                     WHERE ls.session_token = :token AND u.role = 'admin' AND u.is_active = 1 
                     AND ls.expires_at > NOW()";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":token", $token);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_role'] = $user['role'];
                return true;
            }
        }
        
        return false;
    }

    if (!checkAdminAuth()) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized - Admin access required']);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] == 'GET') {
        // Lấy danh sách tất cả users
        $database = new Database();
        $db = $database->getConnection();
        
        $query = "SELECT id, username, full_name, email, role, is_active, avatar_url, created_at 
                  FROM users 
                  ORDER BY created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'users' => $users
        ]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
        // Phê duyệt hoặc từ chối tài khoản
        $input = file_get_contents("php://input");
        $data = json_decode($input);
        
        if (!isset($data->user_id) || !isset($data->action)) {
            echo json_encode(['success' => false, 'message' => 'Thiếu thông tin']);
            exit;
        }
        
        $database = new Database();
        $db = $database->getConnection();
        
        if ($data->action === 'approve') {
            // Phê duyệt tài khoản
            $query = "UPDATE users SET is_active = 1 WHERE id = :user_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $data->user_id);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Tài khoản đã được phê duyệt']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Lỗi khi phê duyệt']);
            }
            
        } elseif ($data->action === 'reject') {
            // Xóa tài khoản bị từ chối
            $query = "DELETE FROM users WHERE id = :user_id AND is_active = 0";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $data->user_id);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Tài khoản đã bị từ chối']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Lỗi khi từ chối']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Hành động không hợp lệ']);
        }
    }
    
} catch (Exception $e) {
    error_log("Admin approval error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống']);
}
?>