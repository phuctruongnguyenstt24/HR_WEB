<?php
$conn = new mysqli("localhost", "root", "", "quanlynhansu");

if (!$conn->connect_error) {
    $conversation_id = $_POST['conversation_id'] ?? 0;
    
    $sql = "UPDATE messages SET is_read = TRUE 
            WHERE conversation_id = ? AND sender_type = 'employee'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $conversation_id);
    $stmt->execute();
    $stmt->close();
}

$conn->close();
?>