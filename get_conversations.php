<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "hr_management");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$employee_name = "Nguyễn Văn A";

$sql = "SELECT c.*, 
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_type = 'admin' AND m.is_read = FALSE) as unread_count,
               (SELECT MAX(sent_date) FROM messages WHERE conversation_id = c.id) as last_message_time
        FROM conversations c 
        WHERE c.employee_name = ?
        ORDER BY last_message_time DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $employee_name);
$stmt->execute();
$result = $stmt->get_result();

$conversations = [];
while ($row = $result->fetch_assoc()) {
    $conversations[] = $row;
}

echo json_encode(['success' => true, 'conversations' => $conversations]);

$stmt->close();
$conn->close();
?>