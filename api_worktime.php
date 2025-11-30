<?php
// api_worktime.php - API quản lý thời gian làm việc
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config.php';

// Xử lý CORS preflight
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

session_start();

// Kiểm tra đăng nhập
function checkAuth() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
        exit;
    }
}

// Lấy dữ liệu thời gian làm việc
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    checkAuth();
    
    $user_id = $_SESSION['user_id'];
    $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
    
    try {
        // Giả lập dữ liệu - trong thực tế sẽ query database
        $data = getWorkTimeData($user_id, $month);
        
        echo json_encode([
            'success' => true,
            'data' => $data['workDays'],
            'summary' => $data['summary']
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi server: ' . $e->getMessage()
        ]);
    }
}

// Hàm giả lập lấy dữ liệu thời gian làm việc
function getWorkTimeData($user_id, $month) {
    // Trong thực tế, đây sẽ là query database
    // Tạm thời trả về dữ liệu mẫu
    
    $workDays = [];
    list($year, $month_num) = explode('-', $month);
    $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month_num, $year);
    
    $totalHours = 0;
    $overtimeHours = 0;
    $workDaysCount = 0;
    $leaveDaysCount = 0;
    
    for ($day = 1; $day <= $daysInMonth; $day++) {
        $date = new DateTime("$year-$month_num-$day");
        $dayOfWeek = $date->format('w');
        
        // Bỏ qua cuối tuần
        if ($dayOfWeek != 0 && $dayOfWeek != 6) {
            $status = rand(0, 100) > 10 ? 'present' : (rand(0, 100) > 50 ? 'late' : 'leave');
            
            $checkIn = '08:00';
            $checkOut = '17:00';
            $total = 8;
            $overtime = 0;
            
            if ($status === 'late') {
                $checkIn = '08:' . str_pad(15 + rand(0, 45), 2, '0', STR_PAD_LEFT);
                $total = 7.5;
            } elseif ($status === 'leave') {
                $checkIn = '--:--';
                $checkOut = '--:--';
                $total = 0;
                $leaveDaysCount++;
            } else {
                $workDaysCount++;
                if (rand(0, 100) > 70) {
                    $overtime = rand(1, 3);
                    $overtimeHours += $overtime;
                    $checkOut = (17 + $overtime) . ':00';
                    $total += $overtime;
                }
            }
            
            $totalHours += $total;
            
            $workDays[] = [
                'date' => $date->format('d/m/Y'),
                'dayOfWeek' => getVietnameseDayOfWeek($dayOfWeek),
                'checkIn' => $checkIn,
                'checkOut' => $checkOut,
                'total' => $total > 0 ? $total . 'h' : '--',
                'overtime' => $overtime > 0 ? $overtime . 'h' : '--',
                'status' => $status,
                'note' => getStatusNote($status)
            ];
        }
    }
    
    return [
        'workDays' => $workDays,
        'summary' => [
            'totalDays' => $workDaysCount,
            'totalHours' => round($totalHours, 1),
            'overtimeHours' => round($overtimeHours, 1),
            'leaveDays' => $leaveDaysCount
        ]
    ];
}

function getVietnameseDayOfWeek($day) {
    $days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return $days[$day];
}

function getStatusNote($status) {
    $notes = [
        'present' => 'Làm việc bình thường',
        'late' => 'Đi làm muộn',
        'leave' => 'Nghỉ phép',
        'absent' => 'Nghỉ không phép'
    ];
    return $notes[$status] ?? '';
}
?>