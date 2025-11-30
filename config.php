<?php
class Database {
    private $host = "localhost";
    private $db_name = "hr_management";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->exec("SET NAMES utf8mb4");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            error_log("Database error: " . $exception->getMessage());
        }
        return $this->conn;
    }
}

/* ✅ TẠO $conn Ở ĐÂY */
$db = new Database();
$conn = $db->getConnection();

if (!$conn) {
    die("Kết nối CSDL thất bại!");
}

/* TOKEN SESSION */
function generateSessionToken($length = 32) {
    return bin2hex(random_bytes($length));
}

/* API JSON RESPONSE */
function response($success, $data = null, $message = '') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message
    ]);
    exit;
}
?>
