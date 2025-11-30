<?php
// okr.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With'); // Thêm X-Requested-With cho CORS

$host = 'localhost';
$username = 'root';
$password = '';
$database_name = 'hr_management'; // Đổi tên biến để tránh nhầm lẫn

// =================================================================
// CÁC HÀM HELPER VÀ LỚP DATABASE CƠ BẢN
// =================================================================

// Helper: Xử lý Response
function response($success, $data = null, $message = null)
{
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message]);
    exit();
}

// Lớp Database giả lập (CẦN THAY THẾ BẰNG LỚP THẬT CỦA BẠN)
class Database
{
    private $conn;
    private $host;
    private $username;
    private $password;
    private $database_name;

    public function __construct()
    {
        global $host, $username, $password, $database_name;
        $this->host = $host;
        $this->username = $username;
        $this->password = $password;
        $this->database_name = $database_name;
    }

    public function getConnection()
    {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->database_name, $this->username, $this->password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8");
            return $this->conn;
        } catch (PDOException $exception) {
            // Trong môi trường production nên ghi log thay vì echo
            die("Connection error: " . $exception->getMessage());
        }
    }
}

// =================================================================
// LOGIC CHÍNH
// =================================================================

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Xử lý preflight request cho CORS
if ($method === 'OPTIONS') {
    response(true, null, 'Preflight OK');
}

switch ($method) {
    case 'GET':
        getOKRs();
        break;
    case 'POST':
        addOKR();
        break;
    case 'PUT':
        if ($action === 'update_progress') {
            updateKRProgress();
        } else {
            updateOKR();
        }
        break;
    case 'DELETE':
        deleteOKR();
        break;
    default:
        response(false, null, 'Method not allowed');
}

function getOKRs()
{
    global $db;

    // Lấy params, dùng giá trị rỗng thay vì 'all' để đơn giản hóa query
    $cycle = $_GET['cycle'] ?? '';
    $owner = $_GET['owner'] ?? '';
    $department = $_GET['department'] ?? '';
    $status = $_GET['status'] ?? '';

    try {
        $query = "SELECT o.*, c.name as cycle_name, d.name as department_name 
                  FROM okrs o 
                  LEFT JOIN okr_cycles c ON o.cycle_id = c.id 
                  LEFT JOIN departments d ON o.department_id = d.id 
                  WHERE 1=1";

        $params = [];

        if (!empty($cycle)) {
            $query .= " AND o.cycle_id = ?";
            $params[] = $cycle;
        }

        if (!empty($owner)) {
            $query .= " AND o.owner_type = ?";
            $params[] = $owner;
        }
        
        // Sửa lỗi: Nếu department rỗng/null (tức là OKR cấp công ty/cá nhân không liên kết với phòng ban), 
        // nó sẽ không bị lọc, điều này là đúng. Nếu muốn lọc theo department của OKR cấp phòng ban, 
        // cần thêm logic phức tạp hơn. Hiện tại, lọc theo ID phòng ban nếu được chọn.
        if (!empty($department)) {
            $query .= " AND o.department_id = ?";
            $params[] = $department;
        }

        if (!empty($status)) {
            $query .= " AND o.status = ?";
            $params[] = $status;
        }

        $query .= " ORDER BY o.created_at DESC";

        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $okrs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Lấy key results cho từng OKR
        foreach ($okrs as &$okr) {
            $kr_stmt = $db->prepare("SELECT * FROM key_results WHERE okr_id = ? ORDER BY id ASC");
            $kr_stmt->execute([$okr['id']]);
            $okr['keyResults'] = $kr_stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Lấy danh sách cycles và departments cho filter
        $cycles_stmt = $db->query("SELECT * FROM okr_cycles ORDER BY start_date DESC");
        $departments_stmt = $db->query("SELECT * FROM departments");

        response(true, [
            'okrs' => $okrs,
            'cycles' => $cycles_stmt->fetchAll(PDO::FETCH_ASSOC),
            'departments' => $departments_stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);

    } catch (PDOException $e) {
        response(false, null, 'Database error: ' . $e->getMessage());
    }
}

function addOKR()
{
    global $db;

    $data = json_decode(file_get_contents('php://input'), true);

    try {
        $db->beginTransaction();

        // Thêm OKR
        $stmt = $db->prepare("INSERT INTO okrs (objective, cycle_id, owner_type, department_id, progress, status, created_by) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['objective'],
            $data['cycle_id'],
            $data['owner_type'],
            $data['department_id'] ?: null,
            0,
            'not-started',
            1 // Trong thực tế lấy từ session
        ]);

        $okr_id = $db->lastInsertId();

        // Thêm Key Results
        $kr_stmt = $db->prepare("INSERT INTO key_results (okr_id, description, current_value, target_value, unit, weight) 
                                VALUES (?, ?, ?, ?, ?, ?)");

        foreach ($data['keyResults'] as $kr) {
            $kr_stmt->execute([
                $okr_id,
                $kr['description'],
                $kr['current_value'],
                $kr['target_value'],
                $kr['unit'],
                $kr['weight'] ?? 1
            ]);
        }
        
        // Tính toán progress ban đầu (vì đã thêm KR)
        calculateOKRProgress($okr_id);

        $db->commit();
        response(true, ['id' => $okr_id], 'OKR đã được thêm thành công');

    } catch (PDOException $e) {
        $db->rollBack();
        response(false, null, 'Lỗi khi thêm OKR: ' . $e->getMessage());
    }
}

function updateOKR()
{
    global $db;

    $data = json_decode(file_get_contents('php://input'), true);
    // Lấy ID từ URL
    $id = $_GET['id'];

    try {
        $db->beginTransaction();

        // Cập nhật OKR
        $stmt = $db->prepare("UPDATE okrs SET objective=?, cycle_id=?, owner_type=?, department_id=?, status=? WHERE id=?");
        $stmt->execute([
            $data['objective'],
            $data['cycle_id'],
            $data['owner_type'],
            $data['department_id'] ?: null,
            $data['status'] ?: 'not-started', // Đảm bảo status có giá trị
            $id
        ]);

        // Xóa key results cũ và thêm mới (hoặc cập nhật)
        // Việc xóa hết và thêm lại là đơn giản nhất nhưng kém hiệu quả, 
        // nhưng tôi sẽ giữ lại phương pháp này để đơn giản hóa logic frontend.
        $db->prepare("DELETE FROM key_results WHERE okr_id = ?")->execute([$id]);

        $kr_stmt = $db->prepare("INSERT INTO key_results (okr_id, description, current_value, target_value, unit, weight) 
                                VALUES (?, ?, ?, ?, ?, ?)");

        foreach ($data['keyResults'] as $kr) {
            $kr_stmt->execute([
                $id,
                $kr['description'],
                $kr['current_value'],
                $kr['target_value'],
                $kr['unit'],
                $kr['weight'] ?? 1
            ]);
        }

        // Tính toán lại progress
        $progress = calculateOKRProgress($id);
        
        // Cập nhật lại status dựa trên progress (tùy chọn, ở đây giữ nguyên status từ client)
        if ($progress >= 100) {
             $db->prepare("UPDATE okrs SET status = 'completed' WHERE id = ?")->execute([$id]);
        }


        $db->commit();
        response(true, null, 'OKR đã được cập nhật thành công');

    } catch (PDOException $e) {
        $db->rollBack();
        response(false, null, 'Lỗi khi cập nhật OKR: ' . $e->getMessage());
    }
}

// Hàm mới: Cập nhật chỉ Current Value của Key Results
function updateKRProgress() {
    global $db;
    $data = json_decode(file_get_contents('php://input'), true);
    $okr_id = $_GET['id'];

    try {
        $db->beginTransaction();

        $update_kr_stmt = $db->prepare("UPDATE key_results SET current_value = ? WHERE id = ? AND okr_id = ?");

        foreach ($data['keyResultUpdates'] as $update) {
            $update_kr_stmt->execute([
                $update['current_value'],
                $update['id'],
                $okr_id
            ]);
        }

        // Tính toán lại progress của OKR
        calculateOKRProgress($okr_id);

        $db->commit();
        response(true, null, 'Tiến độ KR đã được cập nhật thành công');

    } catch (PDOException $e) {
        $db->rollBack();
        response(false, null, 'Lỗi khi cập nhật tiến độ KR: ' . $e->getMessage());
    }
}


function deleteOKR()
{
    global $db;

    $id = $_GET['id'];

    try {
        $db->beginTransaction();
        
        // Xóa các Key Results liên quan
        $db->prepare("DELETE FROM key_results WHERE okr_id = ?")->execute([$id]);
        
        // Xóa OKR
        $stmt = $db->prepare("DELETE FROM okrs WHERE id = ?");
        $stmt->execute([$id]);
        
        $db->commit();

        response(true, null, 'OKR đã được xóa thành công');

    } catch (PDOException $e) {
        $db->rollBack();
        response(false, null, 'Lỗi khi xóa OKR: ' . $e->getMessage());
    }
}

function calculateOKRProgress($okr_id)
{
    global $db;

    $stmt = $db->prepare("
        SELECT 
            SUM(kr.weight * LEAST(kr.current_value / kr.target_value, 1)) / SUM(kr.weight) * 100 as progress
        FROM key_results kr 
        WHERE kr.okr_id = ?
    ");
    $stmt->execute([$okr_id]);
    $progress = $stmt->fetch(PDO::FETCH_ASSOC)['progress'] ?? 0;
    
    // Giới hạn progress ở 100%
    $progress = min($progress, 100);

    // Cập nhật progress
    $update_stmt = $db->prepare("UPDATE okrs SET progress = ? WHERE id = ?");
    $update_stmt->execute([round($progress, 2), $okr_id]);
    
    // Cập nhật status dựa trên progress (tùy ý theo quy tắc OKR)
    $status = 'not-started';
    if ($progress > 0 && $progress < 70) {
        $status = 'at-risk';
    } elseif ($progress >= 70 && $progress < 100) {
        $status = 'on-track';
    } elseif ($progress >= 100) {
        $status = 'completed';
    }
    
    $update_status_stmt = $db->prepare("UPDATE okrs SET status = ? WHERE id = ?");
    $update_status_stmt->execute([$status, $okr_id]);


    return $progress;
}
?>