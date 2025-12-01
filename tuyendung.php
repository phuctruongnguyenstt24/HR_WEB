<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Xử lý CORS preflight
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Kết nối database (thay đổi thông tin kết nối phù hợp)
$host = 'localhost';
$dbname = 'hr_management';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi kết nối database: ' . $e->getMessage()]);
    exit;
}

// Lấy action từ request
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'getCandidates':
        getCandidates($pdo);
        break;
    case 'getCandidate':
        getCandidate($pdo);
        break;
    case 'saveCandidate':
        saveCandidate($pdo);
        break;
    case 'deleteCandidate':
        deleteCandidate($pdo);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Action không hợp lệ']);
        break;
}

// Lấy danh sách ứng viên
function getCandidates($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT * FROM candidates 
            ORDER BY created_at DESC
        ");
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $candidates
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi khi lấy danh sách ứng viên: ' . $e->getMessage()
        ]);
    }
}

// Lấy thông tin một ứng viên
function getCandidate($pdo) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Thiếu ID ứng viên']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM candidates WHERE id = ?");
        $stmt->execute([$id]);
        $candidate = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($candidate) {
            echo json_encode([
                'success' => true,
                'data' => $candidate
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Không tìm thấy ứng viên'
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi khi lấy thông tin ứng viên: ' . $e->getMessage()
        ]);
    }
}

// Lưu ứng viên (thêm mới hoặc cập nhật)
function saveCandidate($pdo) {
    // Lấy dữ liệu từ FormData
    $candidateData = json_decode($_POST['candidateData'], true);
    $id = $_POST['id'] ?? null;
    
    if (!$candidateData) {
        echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ']);
        return;
    }
    
    // Validate dữ liệu
    if (empty($candidateData['name']) || empty($candidateData['email']) || empty($candidateData['position'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ thông tin bắt buộc']);
        return;
    }
    
    try {
        // Xử lý upload file CV
        $resumePath = null;
        if (isset($_FILES['resume']) && $_FILES['resume']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = 'uploads/cv/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            $fileName = time() . '_' . basename($_FILES['resume']['name']);
            $resumePath = $uploadDir . $fileName;
            
            if (!move_uploaded_file($_FILES['resume']['tmp_name'], $resumePath)) {
                throw new Exception('Lỗi khi upload file CV');
            }
        }
        
        if ($id) {
            // Cập nhật ứng viên
            $sql = "UPDATE candidates SET 
                    name = ?, email = ?, phone = ?, position = ?, source = ?, notes = ?,
                    updated_at = NOW()" . 
                    ($resumePath ? ", resume_path = ?" : "") . 
                    " WHERE id = ?";
            
            $params = [
                $candidateData['name'],
                $candidateData['email'],
                $candidateData['phone'] ?? null,
                $candidateData['position'],
                $candidateData['source'] ?? null,
                $candidateData['notes'] ?? null
            ];
            
            if ($resumePath) {
                $params[] = $resumePath;
            }
            
            $params[] = $id;
            
        } else {
            // Thêm ứng viên mới
            $sql = "INSERT INTO candidates (name, email, phone, position, source, notes, resume_path, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'new', NOW())";
            
            $params = [
                $candidateData['name'],
                $candidateData['email'],
                $candidateData['phone'] ?? null,
                $candidateData['position'],
                $candidateData['source'] ?? null,
                $candidateData['notes'] ?? null,
                $resumePath
            ];
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        echo json_encode([
            'success' => true,
            'message' => $id ? 'Cập nhật ứng viên thành công' : 'Thêm ứng viên thành công'
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi khi lưu ứng viên: ' . $e->getMessage()
        ]);
    }
}

// Xóa ứng viên
function deleteCandidate($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = $input['id'] ?? null;
    
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Thiếu ID ứng viên']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM candidates WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Xóa ứng viên thành công'
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi khi xóa ứng viên: ' . $e->getMessage()
        ]);
    }
}

// Tạo bảng candidates nếu chưa tồn tại
//  function createCandidatesTable($pdo) {
//     $sql = "
//         CREATE TABLE IF NOT EXISTS candidates (
//             id INT AUTO_INCREMENT PRIMARY KEY,
//             name VARCHAR(255) NOT NULL,
//             email VARCHAR(255) NOT NULL,
//             phone VARCHAR(20),
//             position VARCHAR(100) NOT NULL,
//             source VARCHAR(50),
//             notes TEXT,
//             resume_path VARCHAR(500),
//             status ENUM('new', 'reviewed', 'interview', 'hired', 'rejected') DEFAULT 'new',
//             interview_date DATETIME,
//             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//             updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//         )
//     ";
    
//     $pdo->exec($sql);
// }

// Gọi hàm tạo bảng khi cần
// createCandidatesTable($pdo);
?>