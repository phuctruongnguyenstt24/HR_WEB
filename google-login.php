<?php
// google-login.php

// Thiết lập error reporting
error_reporting(0);
ini_set('display_errors', 0);

// Thiết lập header JSON
header('Content-Type: application/json');

// Xử lý CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    include 'config.php';

    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $input = file_get_contents("php://input");
        
        if (empty($input)) {
            throw new Exception('No input data received');
        }
        
        $data = json_decode($input);
        
        if ($data === null || !isset($data->id_token)) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid Google token'
            ]);
            exit;
        }

        $id_token = $data->id_token;

        // Xác thực Google token
        $user_info = verifyGoogleToken($id_token);
        
        if (!$user_info) {
            echo json_encode([
                'success' => false,
                'message' => 'Google token verification failed'
            ]);
            exit;
        }

        // Lấy thông tin từ Google
        $email = $user_info['email'];
        $full_name = $user_info['name'];
        $google_id = $user_info['sub'];
        $avatar_url = $user_info['picture']; // Avatar từ Google
        $first_name = $user_info['given_name'] ?? '';
        $last_name = $user_info['family_name'] ?? '';

        $database = new Database();
        $db = $database->getConnection();

        if (!$db) {
            throw new Exception('Database connection failed');
        }

        // Kiểm tra xem user đã tồn tại chưa (theo email hoặc google_id)
        $query = "SELECT * FROM users WHERE (email = :email OR google_id = :google_id) AND is_active = 1";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":google_id", $google_id);
        $stmt->execute();

        if ($stmt->rowCount() == 1) {
            // User đã tồn tại, cập nhật thông tin mới nhất từ Google
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Cập nhật thông tin nếu có thay đổi
            $update_query = "UPDATE users SET 
                            full_name = :full_name, 
                            avatar_url = :avatar_url,
                            google_id = :google_id
                            WHERE id = :user_id";
            
            $update_stmt = $db->prepare($update_query);
            $update_stmt->bindParam(":full_name", $full_name);
            $update_stmt->bindParam(":avatar_url", $avatar_url);
            $update_stmt->bindParam(":google_id", $google_id);
            $update_stmt->bindParam(":user_id", $user['id']);
            $update_stmt->execute();
            
            // Lấy lại thông tin user sau khi update
            $user_query = "SELECT id, username, full_name, email, role, avatar_url FROM users WHERE id = :id";
            $user_stmt = $db->prepare($user_query);
            $user_stmt->bindParam(":id", $user['id']);
            $user_stmt->execute();
            $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
            
        } else {
            // Tạo user mới từ Google
            $username = generateUsernameFromEmail($email);
            $role = 'employee'; // Mặc định là employee
            $is_active = 1;

            // Tạo password ngẫu nhiên (không dùng cho login Google)
            $random_password = bin2hex(random_bytes(16));
            $hashed_password = password_hash($random_password, PASSWORD_DEFAULT);

            $insert_query = "INSERT INTO users (username, password, full_name, email, role, is_active, avatar_url, google_id, created_at) 
                            VALUES (:username, :password, :full_name, :email, :role, :is_active, :avatar_url, :google_id, NOW())";
            
            $insert_stmt = $db->prepare($insert_query);
            $insert_stmt->bindParam(":username", $username);
            $insert_stmt->bindParam(":password", $hashed_password);
            $insert_stmt->bindParam(":full_name", $full_name);
            $insert_stmt->bindParam(":email", $email);
            $insert_stmt->bindParam(":role", $role);
            $insert_stmt->bindParam(":is_active", $is_active);
            $insert_stmt->bindParam(":avatar_url", $avatar_url);
            $insert_stmt->bindParam(":google_id", $google_id);

            if ($insert_stmt->execute()) {
                $user_id = $db->lastInsertId();
                $user_query = "SELECT id, username, full_name, email, role, avatar_url FROM users WHERE id = :id";
                $user_stmt = $db->prepare($user_query);
                $user_stmt->bindParam(":id", $user_id);
                $user_stmt->execute();
                $user = $user_stmt->fetch(PDO::FETCH_ASSOC);
            } else {
                throw new Exception('Failed to create user from Google');
            }
        }

        // Tạo session token
        $session_token = generateSessionToken();
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
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
            $user_data = [
                'id' => $user['id'],
                'username' => $user['username'],
                'full_name' => $user['full_name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'avatar_url' => $user['avatar_url'], // Avatar từ Google
                'session_token' => $session_token,
                'login_type' => 'google' // Thêm loại login để phân biệt
            ];
            
            echo json_encode([
                'success' => true,
                'message' => 'Google login successful',
                'user' => $user_data
            ]);
        } else {
            throw new Exception('Failed to create session');
        }

    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid request method'
        ]);
    }
} catch (Exception $e) {
    error_log("Google login error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Google login failed. Please try again.'
    ]);
}

// Hàm xác thực Google token
function verifyGoogleToken($id_token) {
    // Google API endpoint để xác thực token
    $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . $id_token;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Tắt SSL verify cho localhost
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        $token_info = json_decode($response, true);
        
        // Kiểm tra các trường cần thiết
        if (isset($token_info['email']) && isset($token_info['name']) && isset($token_info['sub']) && isset($token_info['picture'])) {
            return $token_info;
        }
    }
    
    // Fallback: decode JWT local nếu API không hoạt động
    return decodeJWT($id_token);
}

// Hàm decode JWT local (fallback)
function decodeJWT($jwt) {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return false;
    
    $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1]));
    $data = json_decode($payload, true);
    
    // Kiểm tra các trường bắt buộc
    if (isset($data['email']) && isset($data['name']) && isset($data['sub']) && isset($data['picture'])) {
        return $data;
    }
    
    return false;
}

// Hàm tạo username từ email
function generateUsernameFromEmail($email) {
    $username = explode('@', $email)[0];
    $username = preg_replace('/[^a-zA-Z0-9_]/', '', $username);
    
    // Thêm số ngẫu nhiên nếu username quá ngắn
    if (strlen($username) < 3) {
        $username .= rand(100, 999);
    }
    
    return $username;
}

// Hàm tạo session token
if (!function_exists('generateSessionToken')) {
    function generateSessionToken($length = 64) {
        if (function_exists('random_bytes')) {
            return bin2hex(random_bytes($length));
        } else {
            return bin2hex(openssl_random_pseudo_bytes($length));
        }
    }
}
?>