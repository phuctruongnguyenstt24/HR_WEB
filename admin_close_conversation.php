<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "quanlynhansu");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$conversation_id = $_POST['conversation_id'] ?? 0;

$sql = "UPDATE conversations SET status = 'đã đóng' WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $conversation_id);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Hội thoại đã được đóng']);
} else {
    echo json_encode(['success' => false, 'message' => 'Lỗi khi đóng hội thoại']);
}

$stmt->close();
$conn->close();
?>