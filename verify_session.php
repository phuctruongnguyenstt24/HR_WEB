<?php
// verify_session.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    include 'config.php';
    
    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $input = file_get_contents("php://input");
        $data = json_decode($input);
        
        if (!isset($data->session_token)) {
            echo json_encode(['success' => false, 'message' => 'Thiếu session token']);
            exit;
        }
        
        $database = new Database();
        $db = $database->getConnection();
        
        // Kiểm tra session trong database
        $query = "SELECT ls.*, u.* FROM login_sessions ls 
                 JOIN users u ON ls.user_id = u.id 
                 WHERE ls.session_token = :session_token AND ls.expires_at > NOW()";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":session_token", $data->session_token);
        $stmt->execute();
        
        if ($stmt->rowCount() == 1) {
            $session_data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Trả về thông tin user (không bao gồm password)
            $user_data = [
                'id' => $session_data['id'],
                'username' => $session_data['username'],
                'full_name' => $session_data['full_name'],
                'email' => $session_data['email'],
                'role' => $session_data['role'],
                'avatar_url' => $session_data['avatar_url']
            ];
            
            echo json_encode([
                'success' => true,
                'user' => $user_data
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Session không hợp lệ hoặc đã hết hạn'
            ]);
        }
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi hệ thống'
    ]);
}
?>