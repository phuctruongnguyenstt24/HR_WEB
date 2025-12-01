<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "hr_management");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$conversation_id = $_POST['conversation_id'] ?? 0;
$message = $_POST['message'] ?? '';
$current_date = date('Y-m-d H:i:s');

if (empty($message)) {
    echo json_encode(['success' => false, 'message' => 'Tin nhắn không được để trống']);
    exit();
}

// Kiểm tra xem hội thoại có đang mở không
$check_sql = "SELECT status FROM conversations WHERE id = ?";
$check_stmt = $conn->prepare($check_sql);
$check_stmt->bind_param("i", $conversation_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();
$conversation = $check_result->fetch_assoc();

if (!$conversation || $conversation['status'] !== 'mở') {
    echo json_encode(['success' => false, 'message' => 'Hội thoại đã đóng, không thể gửi tin nhắn']);
    exit();
}

// Thêm tin nhắn mới
$sql = "INSERT INTO messages (conversation_id, sender_type, message, sent_date) 
        VALUES (?, 'admin', ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("iss", $conversation_id, $message, $current_date);

if ($stmt->execute()) {
    // Cập nhật thời gian cuối cùng
    $update_sql = "UPDATE conversations SET last_updated = ? WHERE id = ?";
    $update_stmt = $conn->prepare($update_sql);
    $update_stmt->bind_param("si", $current_date, $conversation_id);
    $update_stmt->execute();
    
    echo json_encode(['success' => true, 'message' => 'Tin nhắn đã được gửi']);
} else {
    echo json_encode(['success' => false, 'message' => 'Lỗi khi gửi tin nhắn']);
}

$stmt->close();
$conn->close();
?>