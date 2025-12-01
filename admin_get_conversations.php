<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "hr_management");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$sql = "SELECT c.*, 
               (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_type = 'employee' AND m.is_read = FALSE) as unread_count,
               (SELECT MAX(sent_date) FROM messages WHERE conversation_id = c.id) as last_message_time
        FROM conversations c 
        ORDER BY last_message_time DESC";

$result = $conn->query($sql);

$conversations = [];
while ($row = $result->fetch_assoc()) {
    $conversations[] = $row;
}

echo json_encode(['success' => true, 'conversations' => $conversations]);

$conn->close();
?>