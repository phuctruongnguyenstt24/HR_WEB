<?php
include 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    
    $user_id = $data->user_id;
    $current_password = $data->current_password;
    $new_password = $data->new_password;
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Kiểm tra mật khẩu hiện tại
    $query = "SELECT password FROM users WHERE id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":user_id", $user_id);
    $stmt->execute();
    
    if ($stmt->rowCount() == 1) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (password_verify($current_password, $user['password'])) {
            // Cập nhật mật khẩu mới
            $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
            $update_query = "UPDATE users SET password = :password WHERE id = :user_id";
            $update_stmt = $db->prepare($update_query);
            $update_stmt->bindParam(":password", $hashed_password);
            $update_stmt->bindParam(":user_id", $user_id);
            
            if ($update_stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Đổi mật khẩu thành công'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Lỗi cập nhật mật khẩu'
                ]);
            }
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Mật khẩu hiện tại không đúng'
            ]);
        }
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Người dùng không tồn tại'
        ]);
    }
}
?>