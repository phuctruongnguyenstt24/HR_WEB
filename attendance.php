<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

class AttendanceSystem
{
    private $pdo;

    public function __construct()
    {
        date_default_timezone_set('Asia/Ho_Chi_Minh');
        $this->connectDatabase();
        $this->testConnection(); // Thêm dòng này để debug
    }
    private function testConnection()
    {
        try {
            $stmt = $this->pdo->query("SELECT DATABASE() as current_db");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            error_log("Current database: " . $result['current_db']);

            // Kiểm tra bảng
            $stmt = $this->pdo->query("SHOW TABLES LIKE 'attendance'");
            if ($stmt->rowCount() == 0) {
                error_log("Attendance table doesn't exist!");
            }
        } catch (PDOException $e) {
            error_log("Connection test failed: " . $e->getMessage());
        }
    }
    private function connectDatabase()
    {
        $host = 'localhost';
        $username = 'root';
        $password = '';
        $database = 'hr_management';

        try {
            // Kết nối đến MySQL server trước
            $this->pdo = new PDO("mysql:host=$host", $username, $password);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Thiết lập múi giờ
            $this->pdo->exec("SET time_zone = '+07:00'");

            // Tạo database nếu chưa tồn tại
            $this->createDatabase();

            // ĐÓNG kết nối cũ và kết nối lại với database cụ thể
            $this->pdo = null;
            $this->pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8mb4", $username, $password);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->exec("SET time_zone = '+07:00'");

            // Tạo các bảng nếu chưa tồn tại
            $this->createTables();

        } catch (PDOException $e) {
            // Thử kết nối trực tiếp đến database
            try {
                $this->pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8mb4", $username, $password);
                $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $this->pdo->exec("SET time_zone = '+07:00'");
            } catch (PDOException $e2) {
                $this->sendError('Database connection failed: ' . $e2->getMessage());
            }
        }
    }

    private function createDatabase()
    {
        $database = 'hr_management';
        $this->pdo->exec("CREATE DATABASE IF NOT EXISTS $database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }

  private function createTables()
{
    // Bảng users đã tồn tại, chỉ cần tạo các bảng khác
    // Bảng chấm công
    $this->pdo->exec("
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            date DATE NOT NULL,
            check_in DATETIME NOT NULL,
            check_out DATETIME NULL,
            total_hours DECIMAL(4,2) NOT NULL,
            status ENUM('present', 'late', 'absent') DEFAULT 'present',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_attendance_user_date (user_id, date),
            INDEX idx_attendance_check_in (check_in)
        )
    ");

    // Bảng đơn xin nghỉ phép
    $this->pdo->exec("
        CREATE TABLE IF NOT EXISTS leave_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            leave_date DATE NOT NULL,
            leave_type ENUM('Nghỉ có lương', 'Nghỉ ốm', 'Nghỉ không lương') NOT NULL,
            reason TEXT NOT NULL,
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_leave_requests_user_date (user_id, leave_date)
        )
    ");

    // Thêm cột basic_salary vào bảng users nếu chưa có
    // try {
    //     $this->pdo->exec("
    //         ALTER TABLE users 
    //         ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(10,2) DEFAULT 8000000,
    //         ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL,
    //         ADD COLUMN IF NOT EXISTS position VARCHAR(100) NULL
    //     ");
    // } catch (PDOException $e) {
    //     error_log("Error adding columns to users table: " . $e->getMessage());
    // }

    // Tạo dữ liệu mẫu nếu cần
    // $this->createSampleData();
}

    public function handleRequest()
    {
        $method = $_SERVER['REQUEST_METHOD'];

        // Xử lý preflight request
        if ($method == 'OPTIONS') {
            exit;
        }

        // Lấy dữ liệu từ request
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $_GET['action'] ?? $input['action'] ?? '';

        // THÊM DEBUG
        error_log("Action: $action, User ID from GET: " . ($_GET['user_id'] ?? 'none'));

        switch ($action) {
            
            case 'get_data':
                $this->getAttendanceData($input);
                break;
            case 'get_all_data': // THÊM CASE NÀY
                $this->getAllAttendanceData($input);
                break;
            case 'get_today_data': // THÊM CASE NÀY
                $this->getTodayAttendanceData($input);
                break;
            case 'submit_leave':
                $this->submitLeaveRequest($input);
                break;
            case 'clear_log':
                $this->clearAttendanceLog($input);
                break;
            case 'calculate_salary':
                $this->calculateSalary($input);
                break;
            case 'export_salary':
                $this->exportSalary($input);
                break;
            default:
                $this->handlePunch($input);
                break;
        }
    }

    // Thêm phương thức calculateSalary
    private function calculateSalary($data)
    {
        if (!isset($data['user_id']) || !isset($data['month'])) {
            $this->sendError('Missing required fields: user_id and month');
            return;
        }

        $userId = (int) $data['user_id'];
        $month = $data['month'];

        // Lấy thông tin lương cơ bản của user (giả sử mỗi user có mức lương cơ bản)
        $basicSalary = $this->getUserBasicSalary($userId);
        $hourlyRate = $basicSalary / 26 / 8; // Lương theo giờ (26 ngày công/8 giờ mỗi ngày)
        $overtimeRate = $hourlyRate * 1.5; // Lương làm thêm tính 150%

        try {
            // Lấy dữ liệu chấm công trong tháng
            $attendanceStmt = $this->pdo->prepare("
            SELECT 
                DATE(check_in) as date,
                check_in,
                check_out,
                total_hours,
                status
            FROM attendance 
            WHERE user_id = ? 
            AND YEAR(check_in) = YEAR(?)
            AND MONTH(check_in) = MONTH(?)
            ORDER BY check_in
        ");
            $attendanceStmt->execute([$userId, $month . '-01', $month . '-01']);
            $attendanceData = $attendanceStmt->fetchAll(PDO::FETCH_ASSOC);

            // Lấy số ngày nghỉ phép được duyệt trong tháng
            $leaveStmt = $this->pdo->prepare("
            SELECT COUNT(*) as leave_days
            FROM leave_requests 
            WHERE user_id = ? 
            AND YEAR(leave_date) = YEAR(?)
            AND MONTH(leave_date) = MONTH(?)
            AND status = 'approved'
        ");
            $leaveStmt->execute([$userId, $month . '-01', $month . '-01']);
            $leaveResult = $leaveStmt->fetch(PDO::FETCH_ASSOC);
            $leaveDays = $leaveResult['leave_days'] ?? 0;

            $totalHours = 0;
            $overtimeHours = 0;
            $dailyDetails = [];

            foreach ($attendanceData as $day) {
                $dayHours = (float) $day['total_hours'];
                $regularHours = min($dayHours, 8); // Giờ thường tối đa 8h/ngày
                $dayOvertime = max($dayHours - 8, 0); // Giờ làm thêm

                $dailySalary = ($regularHours * $hourlyRate) + ($dayOvertime * $overtimeRate);

                $totalHours += $dayHours;
                $overtimeHours += $dayOvertime;

                $dailyDetails[] = [
                    'date' => $day['date'],
                    'check_in' => $day['check_in'] ? date('H:i', strtotime($day['check_in'])) : null,
                    'check_out' => $day['check_out'] ? date('H:i', strtotime($day['check_out'])) : null,
                    'total_hours' => round($dayHours, 2),
                    'regular_hours' => round($regularHours, 2),
                    'overtime_hours' => round($dayOvertime, 2),
                    'daily_salary' => round($dailySalary),
                    'status' => $day['status']
                ];
            }

            // Tính tổng lương
            $regularPay = $totalHours * $hourlyRate;
            $overtimePay = $overtimeHours * ($overtimeRate - $hourlyRate); // Chỉ tính phần chênh lệch
            $leaveDeduction = $leaveDays * 8 * $hourlyRate; // Khấu trừ nghỉ phép
            $netSalary = $regularPay + $overtimePay - $leaveDeduction;

            $this->sendSuccess([
                'salary_data' => [
                    'basic_salary' => $basicSalary,
                    'total_hours' => round($totalHours, 2),
                    'hourly_rate' => round($hourlyRate),
                    'hourly_salary' => round($regularPay),
                    'overtime_hours' => round($overtimeHours, 2),
                    'overtime_rate' => round($overtimeRate),
                    'overtime_pay' => round($overtimePay),
                    'leave_days' => $leaveDays,
                    'leave_deduction' => round($leaveDeduction),
                    'net_salary' => max(0, round($netSalary)),
                    'daily_details' => $dailyDetails
                ]
            ]);

        } catch (PDOException $e) {
            $this->sendError('Database error: ' . $e->getMessage());
        }
    }

    // Thêm phương thức getUserBasicSalary
private function getUserBasicSalary($userId)
{
    try {
        $stmt = $this->pdo->prepare("SELECT basic_salary FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result ? $result['basic_salary'] : 8000000;
    } catch (PDOException $e) {
        error_log("Error getting user salary: " . $e->getMessage());
        return 8000000; // Mặc định 8 triệu
    }
}
    // Thêm phương thức exportSalary (đơn giản)
// Thay thế phương thức exportSalary cũ bằng cái này


    private function exportSalary($data)
    {
        if (!isset($data['user_id']) || !isset($data['month'])) {
            $this->sendError('Missing required fields: user_id and month');
            return;
        }

        $userId = (int) $data['user_id'];
        $month = $data['month'];

        try {
            // Lấy dữ liệu lương đã tính toán
            $salaryData = $this->calculateSalaryData($userId, $month);

            // Tạo file Excel
            $fileName = $this->generateExcelFile($salaryData, $userId, $month);

            $this->sendSuccess([
                'download_url' => $fileName,
                'message' => 'Xuất file Excel thành công!'
            ]);

        } catch (Exception $e) {
            $this->sendError('Lỗi khi xuất file Excel: ' . $e->getMessage());
        }
    }

    // Thêm phương thức calculateSalaryData để tái sử dụng
    private function calculateSalaryData($userId, $month)
    {
        $basicSalary = $this->getUserBasicSalary($userId);
        $hourlyRate = $basicSalary / 26 / 8;
        $overtimeRate = $hourlyRate * 1.5;

        // Lấy dữ liệu chấm công
        $attendanceStmt = $this->pdo->prepare("
        SELECT 
            DATE(check_in) as date,
            check_in,
            check_out,
            total_hours,
            status
        FROM attendance 
        WHERE user_id = ? 
        AND YEAR(check_in) = YEAR(?)
        AND MONTH(check_in) = MONTH(?)
        ORDER BY check_in
    ");
        $attendanceStmt->execute([$userId, $month . '-01', $month . '-01']);
        $attendanceData = $attendanceStmt->fetchAll(PDO::FETCH_ASSOC);

        // Lấy số ngày nghỉ phép
        $leaveStmt = $this->pdo->prepare("
        SELECT COUNT(*) as leave_days
        FROM leave_requests 
        WHERE user_id = ? 
        AND YEAR(leave_date) = YEAR(?)
        AND MONTH(leave_date) = MONTH(?)
        AND status = 'approved'
    ");
        $leaveStmt->execute([$userId, $month . '-01', $month . '-01']);
        $leaveResult = $leaveStmt->fetch(PDO::FETCH_ASSOC);
        $leaveDays = $leaveResult['leave_days'] ?? 0;

        $totalHours = 0;
        $overtimeHours = 0;
        $dailyDetails = [];

        foreach ($attendanceData as $day) {
            $dayHours = (float) $day['total_hours'];
            $regularHours = min($dayHours, 8);
            $dayOvertime = max($dayHours - 8, 0);

            $dailySalary = ($regularHours * $hourlyRate) + ($dayOvertime * $overtimeRate);

            $totalHours += $dayHours;
            $overtimeHours += $dayOvertime;

            $dailyDetails[] = [
                'date' => $day['date'],
                'check_in' => $day['check_in'] ? date('H:i', strtotime($day['check_in'])) : '-',
                'check_out' => $day['check_out'] ? date('H:i', strtotime($day['check_out'])) : '-',
                'total_hours' => round($dayHours, 2),
                'regular_hours' => round($regularHours, 2),
                'overtime_hours' => round($dayOvertime, 2),
                'daily_salary' => round($dailySalary),
                'status' => $day['status']
            ];
        }

        $regularPay = $totalHours * $hourlyRate;
        $overtimePay = $overtimeHours * ($overtimeRate - $hourlyRate);
        $leaveDeduction = $leaveDays * 8 * $hourlyRate;
        $netSalary = $regularPay + $overtimePay - $leaveDeduction;

        return [
            'basic_salary' => $basicSalary,
            'total_hours' => round($totalHours, 2),
            'hourly_rate' => round($hourlyRate),
            'hourly_salary' => round($regularPay),
            'overtime_hours' => round($overtimeHours, 2),
            'overtime_rate' => round($overtimeRate),
            'overtime_pay' => round($overtimePay),
            'leave_days' => $leaveDays,
            'leave_deduction' => round($leaveDeduction),
            'net_salary' => max(0, round($netSalary)),
            'daily_details' => $dailyDetails,
            'month' => $month,
            'user_id' => $userId
        ];
    }

    // Thêm phương thức generateExcelFile
    private function generateExcelFile($salaryData, $userId, $month)
    {
        // Tạo thư mục exports nếu chưa tồn tại
        $exportDir = __DIR__ . '/exports/';
        if (!is_dir($exportDir)) {
            mkdir($exportDir, 0777, true);
        }

        $fileName = 'bang_luong_' . $userId . '_' . str_replace('-', '_', $month) . '.csv';
        $filePath = $exportDir . $fileName;

        // Mở file để ghi
        $file = fopen($filePath, 'w');

        // Thêm BOM UTF-8 để hiển thị tiếng Việt tốt trong Excel
        fputs($file, $bom = (chr(0xEF) . chr(0xBB) . chr(0xBF)));

        // Tiêu đề bảng lương
        fputcsv($file, ['BẢNG LƯƠNG THÁNG ' . date('m/Y', strtotime($month . '-01'))], ',');
        fputcsv($file, [], ',');

        // Thông tin chung
        fputcsv($file, ['Mã nhân viên:', $userId], ',');
        fputcsv($file, ['Tháng:', date('m/Y', strtotime($month . '-01'))], ',');
        fputcsv($file, ['Ngày xuất:', date('d/m/Y H:i:s')], ',');
        fputcsv($file, [], ',');

        // Tổng quan lương
        fputcsv($file, ['TỔNG QUAN LƯƠNG'], ',');
        fputcsv($file, ['Lương cơ bản', number_format($salaryData['basic_salary'], 0, ',', '.') . ' VNĐ'], ',');
        fputcsv($file, ['Tổng giờ làm', $salaryData['total_hours'] . ' giờ'], ',');
        fputcsv($file, ['Lương theo giờ', number_format($salaryData['hourly_salary'], 0, ',', '.') . ' VNĐ'], ',');
        fputcsv($file, ['Giờ làm thêm', $salaryData['overtime_hours'] . ' giờ'], ',');
        fputcsv($file, ['Lương làm thêm', number_format($salaryData['overtime_pay'], 0, ',', '.') . ' VNĐ'], ',');
        fputcsv($file, ['Số ngày nghỉ phép', $salaryData['leave_days'] . ' ngày'], ',');
        fputcsv($file, ['Khấu trừ nghỉ phép', number_format($salaryData['leave_deduction'], 0, ',', '.') . ' VNĐ'], ',');
        fputcsv($file, ['TỔNG LƯƠNG THỰC NHẬN', number_format($salaryData['net_salary'], 0, ',', '.') . ' VNĐ'], ',');
        fputcsv($file, [], ',');
        fputcsv($file, [], ',');

        // Chi tiết theo ngày
        fputcsv($file, ['CHI TIẾT LƯƠNG THEO NGÀY'], ',');
        fputcsv($file, [
            'Ngày',
            'Giờ vào',
            'Giờ ra',
            'Tổng giờ',
            'Giờ thường',
            'Giờ làm thêm',
            'Lương ngày (VNĐ)',
            'Trạng thái'
        ], ',');

        foreach ($salaryData['daily_details'] as $day) {
            $statusText = '';
            switch ($day['status']) {
                case 'present':
                    $statusText = 'Đúng giờ';
                    break;
                case 'late':
                    $statusText = 'Muộn';
                    break;
                case 'absent':
                    $statusText = 'Vắng';
                    break;
                default:
                    $statusText = $day['status'];
            }

            fputcsv($file, [
                date('d/m/Y', strtotime($day['date'])),
                $day['check_in'],
                $day['check_out'],
                $day['total_hours'],
                $day['regular_hours'],
                $day['overtime_hours'],
                number_format($day['daily_salary'], 0, ',', '.'),
                $statusText
            ], ',');
        }

        fclose($file);

        // Trả về đường dẫn download
        return 'exports/' . $fileName;
    }

    private function handlePunch($data)
    {
        if (!isset($data['user_id']) || !isset($data['type'])) {
            $this->sendError('Missing required fields: user_id and type');
            return;
        }

        $userId = (int) $data['user_id'];
        $type = $data['type'];

        // SỬA DÒNG NÀY: Sử dụng thời gian từ server thay vì client
        $timestamp = date('Y-m-d H:i:s'); // Luôn dùng thời gian server
        $today = date('Y-m-d');

        try {
            if ($type === 'in') {
                // KIỂM TRA: Đã check-in hôm nay chưa?
                $checkStmt = $this->pdo->prepare("
                SELECT id, check_in, check_out
                FROM attendance 
                WHERE user_id = ? AND date = ?
                ORDER BY check_in DESC 
                LIMIT 1
            ");
                $checkStmt->execute([$userId, $today]);
                $todayRecord = $checkStmt->fetch(PDO::FETCH_ASSOC);

                if ($todayRecord) {
                    if ($todayRecord['check_out'] === null) {
                        $this->sendError('Bạn đã check-in lúc ' . date('H:i:s', strtotime($todayRecord['check_in'])) . ' mà chưa check-out!');
                        return;
                    } else {
                        $this->sendError('Bạn đã check-in và check-out hôm nay rồi! Mỗi ngày chỉ được chấm công một lần.');
                        return;
                    }
                }

                // Check-in
                $stmt = $this->pdo->prepare("
                INSERT INTO attendance (user_id, check_in, date) 
                VALUES (?, ?, ?)
            ");
                $stmt->execute([$userId, $timestamp, $today]);

                $punchId = $this->pdo->lastInsertId();

                $this->sendSuccess([
                    'message' => 'Check-in thành công!',
                    'punch_id' => $punchId,
                    'server_time' => $timestamp // THÊM DÒNG NÀY ĐỂ DEBUG
                ]);

            } else if ($type === 'out') {
                // Tìm check-in của ngày hôm nay chưa check-out
                $findStmt = $this->pdo->prepare("
                SELECT id, check_in 
                FROM attendance 
                WHERE user_id = ? AND date = ? AND check_out IS NULL
                ORDER BY check_in DESC 
                LIMIT 1
            ");
                $findStmt->execute([$userId, $today]);
                $checkinRecord = $findStmt->fetch(PDO::FETCH_ASSOC);

                if (!$checkinRecord) {
                    $this->sendError('Không tìm thấy lượt check-in nào để check-out hôm nay');
                    return;
                }

                // Check-out
                $stmt = $this->pdo->prepare("
                UPDATE attendance 
                SET check_out = ? 
                WHERE id = ?
            ");
                $stmt->execute([$timestamp, $checkinRecord['id']]);

                if ($stmt->rowCount() > 0) {
                    // Tính tổng giờ làm
                    $this->calculateWorkHours($userId, $timestamp);

                    $this->sendSuccess([
                        'message' => 'Check-out thành công!',
                        'server_time' => $timestamp // THÊM DÒNG NÀY ĐỂ DEBUG
                    ]);
                } else {
                    $this->sendError('Check-out thất bại');
                }
            }

        } catch (PDOException $e) {
            $this->sendError('Database error: ' . $e->getMessage());
        }
    }

    private function calculateWorkHours($userId, $checkoutTime)
    {
        try {
            $stmt = $this->pdo->prepare("
            SELECT id, check_in, check_out, DATE(check_in) as date 
            FROM attendance 
            WHERE user_id = ? AND check_out = ?
            ORDER BY check_in DESC 
            LIMIT 1
        ");
            $stmt->execute([$userId, $checkoutTime]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($record) {
                $timezone = new DateTimeZone('Asia/Ho_Chi_Minh');
                $checkIn = new DateTime($record['check_in'], $timezone);
                $checkOut = new DateTime($record['check_out'], $timezone);

                // XÁC ĐỊNH TRẠNG THÁI: ĐÚNG GIỜ HAY MUỘN
                $checkInHour = (int) $checkIn->format('H');
                $checkInMinute = (int) $checkIn->format('i');

                $status = 'present'; // Mặc định là đúng giờ

                // KIỂM TRA THEO CA LÀM
                if ($checkInHour < 12) {
                    // CA SÁNG: muộn sau 8:15
                    $lateThreshold = new DateTime($record['date'] . ' 08:15:00', $timezone);
                    if ($checkIn > $lateThreshold) {
                        $status = 'late';
                    }
                } else {
                    // CA CHIỀU: muộn sau 13:30
                    $lateThreshold = new DateTime($record['date'] . ' 13:30:00', $timezone);
                    if ($checkIn > $lateThreshold) {
                        $status = 'late';
                    }
                }

                // TÍNH TỔNG GIỜ LÀM (CÓ XÉT GIỜ NGHỈ TRƯA)
                $totalHours = $this->calculateWorkingHours($checkIn, $checkOut);

                // Cập nhật lại DB
                $updateStmt = $this->pdo->prepare("
                UPDATE attendance
                SET total_hours = ?, status = ?
                WHERE id = ?
            ");
                $updateStmt->execute([$totalHours, $status, $record['id']]);

                // GHI LOG ĐỂ DEBUG
                error_log("Check-in: " . $checkIn->format('H:i:s') .
                    ", Check-out: " . $checkOut->format('H:i:s') .
                    ", Total hours: " . $totalHours .
                    ", Status: " . $status .
                    ", Ca: " . ($checkInHour < 12 ? 'Sáng' : 'Chiều'));
            }
        } catch (PDOException $e) {
            error_log("Calculate work hours error: " . $e->getMessage());
        }
    }

    // THÊM PHƯƠNG THỨC MỚI ĐỂ TÍNH GIỜ LÀM (CÓ XÉT GIỜ NGHỈ TRƯA)
// THÊM PHƯƠNG THỨC MỚI ĐỂ TÍNH GIỜ LÀM (CÓ XÉT GIỜ NGHỈ TRƯA)
    private function calculateWorkingHours($checkIn, $checkOut)
    {
        // Nếu check-out trước hoặc bằng check-in, return 0
        if ($checkOut <= $checkIn) {
            return 0;
        }

        // Tính tổng thời gian trực tiếp trước (để so sánh)
        $directDiff = $checkIn->diff($checkOut);
        $directMinutes = $directDiff->h * 60 + $directDiff->i;

        // Nếu thời gian dưới 1 phút, tính là 0 giờ (tránh lỗi)
        if ($directMinutes < 1) {
            return 0;
        }

        // Giờ nghỉ trưa: 12:00 - 13:00
        $lunchStart = clone $checkIn;
        $lunchStart->setTime(12, 0, 0); // 12:00

        $lunchEnd = clone $checkIn;
        $lunchEnd->setTime(13, 0, 0); // 13:00

        $totalMinutes = 0;

        // Trường hợp đặc biệt: Check-in và check-out trong cùng khung giờ (vài phút)
        if ($directMinutes <= 480) { // 8 tiếng = 480 phút
            // Tính trực tiếp không xét nghỉ trưa cho thời gian ngắn
            $totalMinutes = $directMinutes;

            // GHI LOG ĐỂ DEBUG THỜI GIAN NGẮN
            error_log("Short session: " . $checkIn->format('H:i:s') . " to " . $checkOut->format('H:i:s') .
                ", Minutes: " . $directMinutes . ", Hours: " . round($directMinutes / 60, 2));
        } else {
            // Tính theo ca làm việc có xét nghỉ trưa (cho thời gian dài)

            // Trường hợp 1: Check-in và check-out trước giờ nghỉ trưa
            if ($checkOut <= $lunchStart) {
                $diff = $checkIn->diff($checkOut);
                $totalMinutes = $diff->h * 60 + $diff->i;
            }
            // Trường hợp 2: Check-in trước giờ nghỉ và check-out sau giờ nghỉ
            elseif ($checkIn <= $lunchStart && $checkOut >= $lunchEnd) {
                // Tính giờ sáng (check-in đến 12:00)
                $morningDiff = $checkIn->diff($lunchStart);
                $morningMinutes = $morningDiff->h * 60 + $morningDiff->i;

                // Tính giờ chiều (13:00 đến check-out)
                $afternoonDiff = $lunchEnd->diff($checkOut);
                $afternoonMinutes = $afternoonDiff->h * 60 + $afternoonDiff->i;

                $totalMinutes = $morningMinutes + $afternoonMinutes;
            }
            // Trường hợp 3: Check-in trong giờ nghỉ trưa
            elseif ($checkIn >= $lunchStart && $checkIn <= $lunchEnd) {
                // Bắt đầu tính từ 13:00
                $startTime = ($checkIn < $lunchEnd) ? $lunchEnd : $checkIn;
                $diff = $startTime->diff($checkOut);
                $totalMinutes = $diff->h * 60 + $diff->i;
            }
            // Trường hợp 4: Check-in sau giờ nghỉ trưa
            elseif ($checkIn >= $lunchEnd) {
                $diff = $checkIn->diff($checkOut);
                $totalMinutes = $diff->h * 60 + $diff->i;
            }
            // Trường hợp 5: Check-out trong giờ nghỉ trưa
            elseif ($checkOut >= $lunchStart && $checkOut <= $lunchEnd) {
                // Tính đến 12:00
                $endTime = ($checkOut > $lunchStart) ? $lunchStart : $checkOut;
                $diff = $checkIn->diff($endTime);
                $totalMinutes = $diff->h * 60 + $diff->i;
            }
        }

        // Chuyển đổi phút sang giờ
        $totalHours = $totalMinutes / 60;

        return round($totalHours, 2);
    }

private function getAllAttendanceData($data)
{
    try {
        // Lấy tất cả chấm công của tất cả nhân viên
        $query = "
            SELECT 
                a.*,
                u.full_name,
                u.email,
                u.department,
                u.position
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY a.check_in DESC
            LIMIT 100
        ";

        $stmt = $this->pdo->prepare($query);
        $stmt->execute();
        $allLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Lấy thống kê tổng quan
        $statsQuery = "
            SELECT 
                COUNT(DISTINCT user_id) as total_employees,
                COUNT(*) as total_records,
                ROUND(SUM(total_hours), 2) as total_hours,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as total_late,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as total_absent,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as total_present
            FROM attendance 
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ";

        $statsStmt = $this->pdo->prepare($statsQuery);
        $statsStmt->execute();
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

        $this->sendSuccess([
            'all_logs' => $allLogs,
            'stats' => $stats
        ]);

    } catch (PDOException $e) {
        $this->sendError('Database error: ' . $e->getMessage());
    }
}

    private function getTodayAttendanceData($data)
    {
        $userId = (int) ($_GET['user_id'] ?? $data['user_id'] ?? 0);

        if ($userId === 0) {
            $this->sendError('User ID is required');
            return;
        }

        try {
            $today = date('Y-m-d');

            $stmt = $this->pdo->prepare("
            SELECT check_in, check_out, total_hours, status
            FROM attendance 
            WHERE user_id = ? AND date = ?
            ORDER BY check_in DESC 
            LIMIT 1
        ");
            $stmt->execute([$userId, $today]);
            $todayData = $stmt->fetch(PDO::FETCH_ASSOC);

            $this->sendSuccess([
                'today_data' => $todayData ?: null
            ]);

        } catch (PDOException $e) {
            $this->sendError('Database error: ' . $e->getMessage());
        }
    }
private function getAttendanceData($data)
{
    $userId = (int) ($_GET['user_id'] ?? $data['user_id'] ?? 0);

    if ($userId === 0) {
        $this->sendError('User ID is required');
        return;
    }

    try {
        // Lấy trạng thái hiện tại
        $currentStmt = $this->pdo->prepare("
            SELECT id as punch_id, check_in, '1' as is_checked_in
            FROM attendance 
            WHERE user_id = ? AND check_out IS NULL 
            ORDER BY check_in DESC 
            LIMIT 1
        ");
        $currentStmt->execute([$userId]);
        $currentStatus = $currentStmt->fetch(PDO::FETCH_ASSOC);

        // Lấy nhật ký 30 ngày gần đây với thông tin user
        $logStmt = $this->pdo->prepare("
            SELECT 
                a.*,
                u.full_name,
                u.department,
                u.position
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE a.user_id = ? 
            AND DATE(a.check_in) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            ORDER BY a.check_in DESC
            LIMIT 20
        ");
        $logStmt->execute([$userId]);
        $logs = $logStmt->fetchAll(PDO::FETCH_ASSOC);

        // Tính thống kê tuần này
        $statsStmt = $this->pdo->prepare("
            SELECT 
                COALESCE(SUM(total_hours), 0) as total_weekly_hours,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
                COALESCE(SUM(CASE WHEN total_hours > 8 THEN total_hours - 8 ELSE 0 END), 0) as overtime_hours
            FROM attendance 
            WHERE user_id = ? 
            AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)
        ");
        $statsStmt->execute([$userId]);
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

        // Định dạng thống kê
        $weeklyHours = floor($stats['total_weekly_hours']);
        $weeklyMinutes = round(($stats['total_weekly_hours'] - $weeklyHours) * 60);
        $overtimeHours = floor($stats['overtime_hours']);
        $overtimeMinutes = round(($stats['overtime_hours'] - $overtimeHours) * 60);

        // Lấy lịch sử nghỉ phép
        $leaveStmt = $this->pdo->prepare("
            SELECT leave_date, leave_type, reason, status
            FROM leave_requests 
            WHERE user_id = ? 
            ORDER BY leave_date DESC
            LIMIT 10
        ");
        $leaveStmt->execute([$userId]);
        $leaveRequests = $leaveStmt->fetchAll(PDO::FETCH_ASSOC);

        $this->sendSuccess([
            'current_status' => $currentStatus ?: null,
            'logs' => $logs,
            'stats' => [
                'weekly_hours' => $weeklyHours,
                'weekly_minutes' => $weeklyMinutes,
                'late_count' => $stats['late_count'],
                'overtime_hours' => $overtimeHours,
                'overtime_minutes' => $overtimeMinutes
            ],
            'leave_requests' => $leaveRequests
        ]);

    } catch (PDOException $e) {
        $this->sendError('Database error: ' . $e->getMessage());
    }
}
    private function submitLeaveRequest($data)
    {
        if (!isset($data['user_id']) || !isset($data['leave_date']) || !isset($data['leave_type']) || !isset($data['reason'])) {
            $this->sendError('Missing required fields');
            return;
        }

        $userId = (int) $data['user_id'];
        $leaveDate = $data['leave_date'];
        $leaveType = $data['leave_type'];
        $reason = $data['reason'];

        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO leave_requests (user_id, leave_date, leave_type, reason, status) 
                VALUES (?, ?, ?, ?, 'pending')
            ");
            $stmt->execute([$userId, $leaveDate, $leaveType, $reason]);

            $this->sendSuccess([
                'message' => 'Đã gửi đơn xin nghỉ phép thành công!'
            ]);

        } catch (PDOException $e) {
            $this->sendError('Database error: ' . $e->getMessage());
        }
    }

    private function clearAttendanceLog($data)
    {
        if (!isset($data['user_id'])) {
            $this->sendError('User ID is required');
            return;
        }

        $userId = (int) $data['user_id'];

        try {
            $stmt = $this->pdo->prepare("
                DELETE FROM attendance 
                WHERE user_id = ? AND date < CURDATE()
            ");
            $stmt->execute([$userId]);

            $this->sendSuccess([
                'message' => 'Đã xóa nhật ký chấm công!',
                'deleted_rows' => $stmt->rowCount()
            ]);

        } catch (PDOException $e) {
            $this->sendError('Database error: ' . $e->getMessage());
        }
    }



    private function sendSuccess($data)
    {
        echo json_encode(array_merge(['success' => true], $data));
    }

    private function sendError($message)
    {
        echo json_encode(['success' => false, 'message' => $message]);
    }
}

// Khởi chạy hệ thống
$attendanceSystem = new AttendanceSystem();
$attendanceSystem->handleRequest();
?>