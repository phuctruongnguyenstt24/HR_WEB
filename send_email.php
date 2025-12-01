<?php
header('Content-Type: application/json');

// Kết nối database
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "hr_management";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Kết nối database thất bại']);
    exit();
}

// Lấy dữ liệu từ form
$subject = $_POST['subject'] ?? '';
$message = $_POST['message'] ?? '';
$employee_name = "Nguyễn Văn A";
$employee_position = "Nhân viên Kinh doanh";
$current_date = date('Y-m-d H:i:s');

if (empty($subject) || empty($message)) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ thông tin']);
    exit();
}

// Bắt đầu transaction
$conn->begin_transaction();

try {
    // Tạo hội thoại mới
    $sql_conversation = "INSERT INTO conversations (employee_name, employee_position, subject, created_date, last_updated) 
                         VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql_conversation);
    $stmt->bind_param("sssss", $employee_name, $employee_position, $subject, $current_date, $current_date);
    $stmt->execute();
    
    $conversation_id = $conn->insert_id;
    
    // Thêm tin nhắn đầu tiên
    $sql_message = "INSERT INTO messages (conversation_id, sender_type, message, sent_date) 
                    VALUES (?, 'employee', ?, ?)";
    $stmt = $conn->prepare($sql_message);
    $stmt->bind_param("iss", $conversation_id, $message, $current_date);
    $stmt->execute();
    
    $conn->commit();
    
    // Gửi email thông báo (tùy chọn)
    sendEmailNotification($subject, $message, $employee_name);
    
    echo json_encode(['success' => true, 'message' => 'Tin nhắn đã được gửi thành công']);
    
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
}

$stmt->close();
$conn->close();

function sendEmailNotification($subject, $message, $employee_name) {
    // Code gửi email như trước
}
?>