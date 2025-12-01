<?php
$servername = "localhost";
$username = "root"; // tài khoản mặc định XAMPP
$password = "";
$dbname = "chamcong_db"; // đổi tên DB cho đúng

$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset("utf8");

if ($conn->connect_error) {
    die(json_encode(["error" => "Kết nối thất bại: " . $conn->connect_error]));
}

$sql = "SELECT * FROM logs ORDER BY id DESC";
$result = $conn->query($sql);

$logs = [];
while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
}

echo json_encode($logs);
$conn->close();
?>
