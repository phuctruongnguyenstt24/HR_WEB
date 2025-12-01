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

// Thêm tin nhắn mới
$sql = "INSERT INTO messages (conversation_id, sender_type, message, sent_date) 
        VALUES (?, 'employee', ?, ?)";
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