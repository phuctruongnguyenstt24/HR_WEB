<?php
header('Content-Type: application/json');

$conn = new mysqli("localhost", "root", "", "hr_management");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

$conversation_id = $_GET['conversation_id'] ?? 0;

$sql = "SELECT *, DATE_FORMAT(sent_date, '%d/%m/%Y %H:%i') as sent_date 
        FROM messages 
        WHERE conversation_id = ? 
        ORDER BY sent_date ASC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $conversation_id);
$stmt->execute();
$result = $stmt->get_result();

$messages = [];
while ($row = $result->fetch_assoc()) {
    $messages[] = $row;
}

echo json_encode(['success' => true, 'messages' => $messages]);

$stmt->close();
$conn->close();
?>