<?php
// Thiết lập header cho phép CORS và định dạng JSON
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- CẤU HÌNH CSDL ---
$host = "localhost";
$db_name = "hr_management"; // Tên CSDL đã tạo ở trên
$username = "root";    // Username mặc định của XAMPP
$password = "";        // Password mặc định của XAMPP

// --- KẾT NỐI CSDL ---
try {
    $conn = new PDO("mysql:host={$host};dbname={$db_name};charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Thiết lập Fetch Mode để lấy dữ liệu dưới dạng mảng kết hợp (Associative Array)
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode(["message" => "Lỗi kết nối CSDL: " . $e->getMessage()]);
    exit();
}

// Lấy phương thức HTTP
$method = $_SERVER['REQUEST_METHOD'];

// Lấy dữ liệu đầu vào (cho POST, PUT, DELETE)
$data = json_decode(file_get_contents("php://input"), true);

// Xử lý Preflight Request (cho trình duyệt)
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==================== XỬ LÝ API ====================

switch ($method) {
    case 'GET':
        handleGetRequest($conn);
        break;
    case 'POST':
        handlePostRequest($conn, $data);
        break;
    case 'PUT':
        handlePutRequest($conn, $data);
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(["message" => "Phương thức không được hỗ trợ."]);
        break;
}

// ==================== CÁC HÀM XỬ LÝ ====================

/**
 * Xử lý yêu cầu GET: Lấy tất cả nhân viên.
 */
function handleGetRequest($conn) {
    $sql = "SELECT id, code, name, email, department, position, startDate, status, locked FROM employees ORDER BY id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $employees = $stmt->fetchAll();

    http_response_code(200);
    echo json_encode($employees);
}

/**
 * Xử lý yêu cầu POST: Thêm nhân viên mới.
 */
function handlePostRequest($conn, $data) {
    // 1. Kiểm tra dữ liệu bắt buộc
    $required_fields = ['code', 'name', 'email', 'department', 'position', 'startDate', 'status'];
    foreach ($required_fields as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(["message" => "Vui lòng điền đầy đủ các trường bắt buộc."]);
            return;
        }
    }
    
    // 2. VALIDATE DỮ LIỆU THEO CẤU TRÚC BẢNG
    // Kiểm tra độ dài mã nhân viên (max 20 ký tự)
    if (strlen($data['code']) > 20) {
        http_response_code(400);
        echo json_encode(["message" => "Mã nhân viên không được vượt quá 20 ký tự."]);
        return;
    }
    
    // Kiểm tra giá trị status hợp lệ
    $allowed_status = ['active', 'probation', 'inactive'];
    if (!in_array($data['status'], $allowed_status)) {
        http_response_code(400);
        echo json_encode(["message" => "Trạng thái không hợp lệ. Chỉ chấp nhận: active, probation, inactive"]);
        return;
    }
    
    // 3. Chuẩn bị câu lệnh SQL
    $sql = "INSERT INTO employees (code, name, email, department, position, startDate, status, locked) 
            VALUES (:code, :name, :email, :department, :position, :startDate, :status, :locked)";
    
    // 4. Thực thi
    try {
        $stmt = $conn->prepare($sql);
        
        // Gán giá trị
        $stmt->bindParam(':code', $data['code']);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':department', $data['department']);
        $stmt->bindParam(':position', $data['position']);
        $stmt->bindParam(':startDate', $data['startDate']);
        $stmt->bindParam(':status', $data['status']);
        $stmt->bindValue(':locked', 0, PDO::PARAM_INT);
        
        $stmt->execute();
        
        // Trả về thông tin nhân viên vừa thêm
        $new_id = $conn->lastInsertId();
        http_response_code(201);
        echo json_encode([
            "message" => "Thêm nhân viên mới thành công.",
            "id" => $new_id
        ]);
        
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode(["message" => "Mã nhân viên hoặc Email đã tồn tại!"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Lỗi khi thêm nhân viên: " . $e->getMessage()]);
        }
    }
}



/**
 * Xử lý yêu cầu PUT: Cập nhật nhân viên hoặc Khóa/Mở khóa.
 */
function handlePutRequest($conn, $data) {
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(["message" => "Thiếu ID nhân viên."]);
        return;
    }
    $id = $data['id'];

    // Trường hợp 1: Cập nhật trạng thái Khóa/Mở khóa
    if (isset($data['locked'])) {
        $sql = "UPDATE employees SET locked = :locked WHERE id = :id";
        try {
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':locked', $data['locked'], PDO::PARAM_INT);
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(["message" => "Cập nhật trạng thái khóa thành công."]);
            } else {
                http_response_code(404);
                echo json_encode(["message" => "Không tìm thấy nhân viên."]);
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["message" => "Lỗi cập nhật trạng thái khóa: " . $e->getMessage()]);
        }
        return;
    }

    // Trường hợp 2: Cập nhật thông tin chi tiết
    $required_fields = ['code', 'name', 'email', 'department', 'position', 'startDate', 'status'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field])) {
            http_response_code(400);
            echo json_encode(["message" => "Vui lòng cung cấp đầy đủ thông tin cập nhật."]);
            return;
        }
    }
    
    // VALIDATE DỮ LIỆU
    if (strlen($data['code']) > 20) {
        http_response_code(400);
        echo json_encode(["message" => "Mã nhân viên không được vượt quá 20 ký tự."]);
        return;
    }
    
    $allowed_status = ['active', 'probation', 'inactive'];
    if (!in_array($data['status'], $allowed_status)) {
        http_response_code(400);
        echo json_encode(["message" => "Trạng thái không hợp lệ. Chỉ chấp nhận: active, probation, inactive"]);
        return;
    }
    
    $sql = "UPDATE employees SET code = :code, name = :name, email = :email, department = :department, 
            position = :position, startDate = :startDate, status = :status 
            WHERE id = :id";
    
    try {
        $stmt = $conn->prepare($sql);
        
        $stmt->bindParam(':code', $data['code']);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':email', $data['email']);
        $stmt->bindParam(':department', $data['department']);
        $stmt->bindParam(':position', $data['position']);
        $stmt->bindParam(':startDate', $data['startDate']);
        $stmt->bindParam(':status', $data['status']);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
             http_response_code(200);
             echo json_encode(["message" => "Cập nhật thông tin nhân viên thành công."]);
        } else {
             http_response_code(200);
             echo json_encode(["message" => "Không có dữ liệu nào được thay đổi."]);
        }
        
    } catch (PDOException $e) {
         if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode(["message" => "Mã nhân viên hoặc Email đã tồn tại!"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Lỗi khi cập nhật nhân viên: " . $e->getMessage()]);
        }
    }
}

?>