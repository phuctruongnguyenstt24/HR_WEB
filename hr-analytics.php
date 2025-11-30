<?php
// Thiết lập header
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

// --- CẤU HÌNH CSDL ---
$host = "localhost";
$db_name = "hr_management"; // Tên CSDL đã tạo
$username = "root";    // Username mặc định của XAMPP
$password = "";        // Password mặc định của XAMPP

// --- KẾT NỐI CSDL ---
try {
    $conn = new PDO("mysql:host={$host};dbname={$db_name};charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // Trường hợp lỗi kết nối CSDL, trả về JSON rỗng hoặc thông báo lỗi
    http_response_code(500); 
    echo json_encode(["message" => "Lỗi kết nối CSDL.", "error" => $e->getMessage()]);
    exit();
}

// ==================== HÀM TÍNH TOÁN DỮ LIỆU THỐNG KÊ (MẪU) ====================

function getHRMetrics($conn) {
    // Lấy ngày đầu và cuối của tháng trước
    $start_of_last_month = date('Y-m-01', strtotime('-1 month'));
    $end_of_last_month = date('Y-m-t', strtotime('-1 month'));
    
    // Lấy ngày đầu và cuối của tháng hiện tại
    $start_of_this_month = date('Y-m-01');
    $end_of_this_month = date('Y-m-t');


    /* -------------------------------------
     * 1. TURNOVER (Tỷ lệ nghỉ việc)
     * Giả định: So sánh nhân viên nghỉ việc tháng này vs tháng trước
     * ------------------------------------- */
    
    // Số nhân viên nghỉ việc tháng hiện tại (status = inactive)
    $stmt = $conn->prepare("SELECT COUNT(id) AS count FROM employees 
                            WHERE status = 'inactive' AND 
                            created_at BETWEEN :start_of_this_month AND :end_of_this_month");
    $stmt->execute([':start_of_this_month' => $start_of_this_month, ':end_of_this_month' => $end_of_this_month]);
    $turnover_this_month = $stmt->fetchColumn();

    // Số nhân viên nghỉ việc tháng trước
    $stmt = $conn->prepare("SELECT COUNT(id) AS count FROM employees 
                            WHERE status = 'inactive' AND 
                            created_at BETWEEN :start_of_last_month AND :end_of_last_month");
    $stmt->execute([':start_of_last_month' => $start_of_last_month, ':end_of_last_month' => $end_of_last_month]);
    $turnover_last_month = $stmt->fetchColumn();

    // Giả định tổng số nhân viên (để tính tỷ lệ)
    $stmt = $conn->query("SELECT COUNT(id) FROM employees WHERE status != 'inactive'");
    $total_active_employees = $stmt->fetchColumn();
    
    // Tính toán
    $turnover_rate = ($total_active_employees > 0) ? round(($turnover_this_month / $total_active_employees) * 100, 1) : 0;
    $turnover_diff_value = $turnover_this_month - $turnover_last_month;
    $turnover_diff_sign = $turnover_diff_value >= 0 ? '+' : '';


    /* -------------------------------------
     * 2. TUYỂN MỚI
     * Giả định: Lấy số nhân viên có startDate trong tháng này
     * ------------------------------------- */
    $stmt = $conn->prepare("SELECT COUNT(id) FROM employees 
                            WHERE startDate BETWEEN :start_of_this_month AND :end_of_this_month");
    $stmt->execute([':start_of_this_month' => $start_of_this_month, ':end_of_this_month' => $end_of_this_month]);
    $new_hires = $stmt->fetchColumn();
    
    // Dữ liệu giả định cho Total Candidates (Cần có bảng Recruitment/Candidates)
    $total_candidates = 55; 


    /* -------------------------------------
     * 3. CHI PHÍ TUYỂN DỤNG
     * Dữ liệu giả định (Cần có bảng Finance/Recruitment Cost)
     * ------------------------------------- */
    $cost_per_hire = "12,500,000 VNĐ"; // Giả định chi phí

    /* -------------------------------------
     * 4. ĐÀO TẠO
     * Dữ liệu giả định (Cần có bảng Training/Courses)
     * ------------------------------------- */
    $training_percent_value = 75; // 75% nhân viên đã hoàn thành khóa đào tạo bắt buộc
    $ongoing_courses = 4; // Số khóa học đang diễn ra

    // ==================== TRẢ VỀ DỮ LIỆU JSON ====================

    return [
        "turnover" => [
            "rate" => $turnover_rate . "%",
            "diff" => $turnover_diff_sign . $turnover_diff_value . " người",
        ],
        "newHires" => $new_hires,
        "totalCandidates" => $total_candidates,
        "costPerHire" => $cost_per_hire,
        "training" => [
            "percent" => $training_percent_value . "%",
            "barWidth" => $training_percent_value . "%",
            "ongoing" => $ongoing_courses,
        ],
    ];
}

// Gọi hàm và trả về kết quả
try {
    $metrics = getHRMetrics($conn);
    http_response_code(200);
    echo json_encode($metrics);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Lỗi xử lý dữ liệu HR.", "error" => $e->getMessage()]);
}

?>