// taichinh.js - Quản lý tài chính cho hệ thống HRM (Phiên bản tối ưu)

document.addEventListener('DOMContentLoaded', () => {
    // ================= KHỞI TẠO BIẾN TOÀN CỤC =================
    let transactions = [];
    const charts = {};
    const filters = { time: 'all', category: 'all' };

    // Lưu trữ các phần tử DOM để truy cập nhanh
    const dom = {
        transactionsListContainer: document.getElementById('transactions-list-container'),
        addTransactionBtn: document.getElementById('add-transaction'),
        createInvoiceBtn: document.getElementById('create-invoice'),
        generateReportBtn: document.getElementById('generate-report'),
        timeFilter: document.getElementById('time-filter'),
        categoryFilter: document.getElementById('category-filter'),
        transactionForm: document.getElementById('transaction-form'),
        invoiceForm: document.getElementById('invoice-form'),
        reportForm: document.getElementById('report-form'),
        cancelTransactionBtn: document.getElementById('cancel-transaction'),
        cancelReportBtn: document.getElementById('cancel-report'),
        reportPeriodSelect: document.getElementById('report-period'),
        customDateRange: document.getElementById('custom-date-range'),
        modalTitleTransaction: document.getElementById('modal-title-transaction'),
        currentDateElement: document.getElementById('current-date'),
        cashFlowCtx: document.getElementById('cashFlowChart'),
        expenseCtx: document.getElementById('expenseChart'),
        incomeAmountEl: document.getElementById('income-amount'),
        expenseAmountEl: document.getElementById('expense-amount'),
        profitAmountEl: document.getElementById('profit-amount'),
        budgetAmountEl: document.getElementById('budget-amount'),
        budgetChangeEl: document.querySelector('.overview-card.budget .change')
    };

    // ================= CÁC HÀM TIỆN ÍCH =================
    
    // Hàm đọc ba chữ số (phụ trợ cho amountToWords)
    const readThreeDigits = (number, digitWords) => {
        let result = '';
        const hundreds = Math.floor(number / 100);
        const tens = Math.floor((number % 100) / 10);
        const ones = number % 10;

        if (hundreds > 0) {
            result += `${digitWords[hundreds]} trăm `;
        }
        if (tens === 0 && ones > 0 && hundreds > 0) {
            result += 'linh ';
        } else if (tens === 1) {
            result += 'mười ';
        } else if (tens > 1) {
            result += `${digitWords[tens]} mươi `;
        }
        if (tens === 1 && ones > 0) {
            result += (ones === 5) ? 'lăm' : digitWords[ones];
        } else if (tens > 1 && ones === 1) {
            result += 'mốt';
        } else if (ones === 5 && tens !== 0) {
            result += 'lăm';
        } else if (ones > 0) {
            result += digitWords[ones];
        }
        return result.trim();
    };

    /**
     * Chuyển đổi số tiền thành chữ tiếng Việt
     * @param {number} amount - Số tiền cần chuyển đổi
     * @returns {string} - Chuỗi chữ tương ứng
     */
    const amountToWords = (amount) => {
        if (amount === 0) return "Không đồng";

        const integerPart = Math.abs(Math.round(amount));
        const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
        const digitWords = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

        let result = '';
        let unitIndex = 0;
        let tempAmount = integerPart;

        while (tempAmount > 0) {
            const chunk = tempAmount % 1000;
            if (chunk > 0) {
                let chunkWords = readThreeDigits(chunk, digitWords);
                result = `${chunkWords} ${units[unitIndex]} ${result}`;
            }
            tempAmount = Math.floor(tempAmount / 1000);
            unitIndex++;
        }

        // Clean up and format final result
        result = result.trim().replace(/\s+/g, ' ');
        // Clean up specific Vietnamese grammar quirks
        result = result.replace(/mươi năm/g, 'mươi lăm');
        result = result.replace(/mười năm/g, 'mười lăm');
        result = result.replace(/linh không/g, 'linh');
        result = result.replace(/không trăm/g, '').trim();

        return (result.charAt(0).toUpperCase() + result.slice(1)).trim() + ' đồng';
    };

    /**
     * Định dạng số tiền thành chuỗi tiền tệ hoặc chữ
     * @param {number} amount - Số tiền
     * @param {boolean} [useWords=false] - True để chuyển thành chữ, false để định dạng số
     * @returns {string} - Chuỗi đã định dạng
     */
    const formatCurrency = (amount, useWords = false) => {
        if (useWords) {
            return amountToWords(amount);
        }
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    /**
     * Định dạng chuỗi ngày
     * @param {string} dateString - Chuỗi ngày (ví dụ: '2023-11-10')
     * @returns {string} - Chuỗi ngày đã định dạng (ví dụ: '10/11/2023')
     */
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    /**
     * Hiển thị thông báo tạm thời
     * @param {string} message - Nội dung thông báo
     * @param {string} [type='info'] - Loại thông báo (success, error, info)
     */
    const showNotification = (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    };

    // ================= LOGIC ỨNG DỤNG =================

    /**
     * Cập nhật toàn bộ giao diện
     */
    const updateAll = () => {
        renderTransactions();
        updateFinancialOverview();
        updateCharts();
        console.log('Giao diện đã được cập nhật với bộ lọc mới:', filters);
    };

    /**
     * Lấy danh sách giao dịch đã lọc
     * @returns {Array} - Mảng giao dịch đã lọc
     */
    const getFilteredTransactions = () => {
        const now = new Date();
        let startDate;

        switch (filters.time) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0); // Epoch time for 'all'
                break;
        }

        return transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const isTimeFiltered = transactionDate >= startDate;
            const isCategoryFiltered = filters.category === 'all' || t.category === filters.category;
            return isTimeFiltered && isCategoryFiltered;
        });
    };

    /**
     * Hiển thị danh sách giao dịch lên giao diện
     */
    const renderTransactions = () => {
        if (!dom.transactionsListContainer) return;
        const filteredTransactions = getFilteredTransactions().sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filteredTransactions.length === 0) {
            dom.transactionsListContainer.innerHTML = '<p class="no-data">Không có giao dịch nào phù hợp với bộ lọc.</p>';
            return;
        }

        const html = filteredTransactions.map(transaction => {
            const isIncome = transaction.type === 'income';
            return `
                <div class="transaction-item ${isIncome ? 'income' : 'expense'}">
                    <div class="transaction-icon">
                        <i class="fas ${isIncome ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.description}</h4>
                        <p>${transaction.category} • ${formatDate(transaction.date)}</p>
                        <small class="amount-in-words">${formatCurrency(transaction.amount, true)}</small>
                    </div>
                    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'} ${formatCurrency(transaction.amount)}
                    </div>
                    <div class="transaction-actions">
                        <button class="btn-icon" onclick="window.editTransaction(${transaction.id})" title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.deleteTransaction(${transaction.id})" title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        dom.transactionsListContainer.innerHTML = html;
    };

    /**
     * Cập nhật các thẻ tổng quan tài chính
     */
    const updateFinancialOverview = () => {
        const filteredTrans = getFilteredTransactions();
        const totalIncome = filteredTrans.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = filteredTrans.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const profit = totalIncome - totalExpense;
        const budget = 450000000;

        updateOverviewCard(dom.incomeAmountEl, totalIncome);
        updateOverviewCard(dom.expenseAmountEl, totalExpense);
        updateOverviewCard(dom.profitAmountEl, profit);
        updateOverviewCard(dom.budgetAmountEl, budget);

        if (dom.budgetChangeEl) {
            const budgetUsed = totalExpense;
            const budgetRemainingPercent = ((budget - budgetUsed) / budget * 100).toFixed(0);
            dom.budgetChangeEl.textContent = `Còn ${budgetRemainingPercent}%`;
        }
    };

    const updateOverviewCard = (element, amount) => {
        if (element) {
            element.innerHTML = `
                ${formatCurrency(amount)}<br>
                <small>${formatCurrency(amount, true)}</small>
            `;
        }
    };

    /**
     * Cập nhật dữ liệu cho các biểu đồ
     */
    const updateCharts = () => {
        // Tương tự như trên, cần logic để lấy dữ liệu đã lọc và cập nhật
        console.log('Biểu đồ đã được cập nhật với dữ liệu mới');
        
        // Ví dụ: Cập nhật biểu đồ chi phí (doughnut)
        if (charts.expense) {
            const filteredTrans = getFilteredTransactions().filter(t => t.type === 'expense');
            const categoryAmounts = filteredTrans.reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {});

            const totalExpense = calculateTotalExpense(filteredTrans);
            const labels = Object.keys(categoryAmounts);
            const data = labels.map(label => ((categoryAmounts[label] / totalExpense) * 100).toFixed(2));

            charts.expense.data.labels = labels;
            charts.expense.data.datasets[0].data = data;
            charts.expense.update();
        }
    };
    
    // Tách riêng các hàm tính toán tổng quan
    const calculateTotalIncome = (list = transactions) => list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const calculateTotalExpense = (list = transactions) => list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const calculateProfit = (list = transactions) => calculateTotalIncome(list) - calculateTotalExpense(list);


    // ================= XỬ LÝ SỰ KIỆN =================

    /**
     * Hiển thị/ẩn modal
     * @param {string} modalId - ID của modal
     * @param {boolean} [isOpen=true] - True để mở, false để đóng
     */
    const toggleModal = (modalId, isOpen = true) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = isOpen ? 'flex' : 'none';
        }
    };

    const closeModals = () => {
        document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
    };

    const handleTransactionSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const transactionId = form.getAttribute('data-edit-id');
        const formData = new FormData(form);

        const newTransaction = {
            id: transactionId ? parseInt(transactionId) : Date.now(),
            type: form.querySelector('input[name="transaction-type"]:checked').value,
            amount: parseInt(formData.get('transaction-amount')),
            description: formData.get('transaction-description'),
            category: formData.get('transaction-category'),
            date: formData.get('transaction-date')
        };
        
        if (transactionId) {
            const index = transactions.findIndex(t => t.id === parseInt(transactionId));
            if (index !== -1) {
                transactions[index] = newTransaction;
                showNotification('Giao dịch đã được cập nhật thành công!', 'success');
            }
        } else {
            transactions.unshift(newTransaction);
            showNotification('Giao dịch đã được thêm thành công!', 'success');
        }

        updateAll();
        closeModals();
        form.reset();
        dom.modalTitleTransaction.textContent = 'Thêm giao dịch mới';
        form.removeAttribute('data-edit-id');
    };

    const handleInvoiceSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const customer = formData.get('invoice-customer');
        const amount = parseInt(formData.get('invoice-amount'));
        createInvoice(customer, amount);
        closeModals();
        e.target.reset();
        showNotification(`Hóa đơn cho ${customer} đã được tạo thành công!`, 'success');
    };

    const handleReportSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const period = formData.get('report-period');
        const reportType = formData.get('report-type');
        let startDate = formData.get('start-date');
        let endDate = formData.get('end-date');
        
        generateReport(period, reportType, startDate, endDate);
        closeModals();
        e.target.reset();
    };

    /**
     * Hàm chính để tạo báo cáo PDF
     */
    const generateReport = (period = 'month', reportType = 'financial', startDate = null, endDate = null) => {
        showNotification(`Đang tạo báo cáo ${reportType} cho kỳ ${period}...`, 'info');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text("BÁO CÁO TÀI CHÍNH", 70, 20);
        doc.setFontSize(12);
        doc.text(`Loại báo cáo: ${reportType}`, 20, 30);
        doc.text(`Kỳ báo cáo: ${period}`, 20, 40);

        if (period === 'custom' && startDate && endDate) {
            doc.text(`Từ ngày: ${startDate}`, 20, 50);
            doc.text(`Đến ngày: ${endDate}`, 20, 60);
        }

        let y = 80;
        doc.text(`Tổng thu nhập: ${formatCurrency(calculateTotalIncome())}`, 20, y);
        y += 10;
        doc.text(`Tổng chi phí: ${formatCurrency(calculateTotalExpense())}`, 20, y);
        y += 10;
        doc.text(`Lợi nhuận: ${formatCurrency(calculateProfit())}`, 20, y);

        const fileName = `BaoCao_${reportType}_${period}_${new Date().getTime()}.pdf`;
        doc.save(fileName);
        showNotification('Báo cáo đã được tạo thành công!', 'success');
    };
    
    /**
     * Tạo hóa đơn PDF
     */
    const createInvoice = (customer, amount) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("HÓA ĐƠN", 80, 20);
        doc.setFontSize(12);
        doc.text(`Khách hàng: ${customer}`, 20, 40);
        doc.text(`Số tiền: ${formatCurrency(amount)}`, 20, 50);
        doc.text(`Ngày tạo: ${new Date().toLocaleDateString("vi-VN")}`, 20, 60);
        doc.text(`Bằng chữ: ${formatCurrency(amount, true)}`, 20, 70);
        doc.save(`HoaDon_${customer}_${new Date().getTime()}.pdf`);
    };

    // ================= KHỞI TẠO VÀ SỰ KIỆN CHÍNH =================

    /**
     * Thiết lập các sự kiện nghe
     */
    const setupEventListeners = () => {
        dom.addTransactionBtn?.addEventListener('click', () => toggleModal('transaction-modal'));
        dom.createInvoiceBtn?.addEventListener('click', () => toggleModal('invoice-modal'));
        dom.generateReportBtn?.addEventListener('click', () => toggleModal('report-modal'));
        
        dom.timeFilter?.addEventListener('change', (e) => {
            filters.time = e.target.value;
            updateAll();
        });

        dom.categoryFilter?.addEventListener('change', (e) => {
            filters.category = e.target.value;
            updateAll();
        });

        dom.transactionForm?.addEventListener('submit', handleTransactionSubmit);
        dom.invoiceForm?.addEventListener('submit', handleInvoiceSubmit);
        dom.reportForm?.addEventListener('submit', handleReportSubmit);
        
        document.querySelectorAll('.modal .close, .modal .btn-secondary').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModals();
            }
        });

        dom.reportPeriodSelect?.addEventListener('change', () => {
            if (dom.customDateRange) {
                dom.customDateRange.style.display = dom.reportPeriodSelect.value === 'custom' ? 'block' : 'none';
            }
        });
        
        console.log('Event listeners đã được thiết lập');
    };
    
    /**
     * Khởi tạo các biểu đồ
     */
    const initCharts = () => {
        if (dom.cashFlowCtx) {
            charts.cashFlow = new Chart(dom.cashFlowCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11'],
                    datasets: [
                        { label: 'Thu nhập', data: [250, 280, 300, 320, 350, 370, 400, 420, 450, 480, 325], borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.1)', tension: 0.3, fill: true },
                        { label: 'Chi phí', data: [180, 190, 210, 230, 250, 270, 290, 310, 330, 350, 187], borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.1)', tension: 0.3, fill: true }
                    ]
                },
                options: { responsive: true, plugins: { title: { display: true, text: 'Dòng tiền theo tháng (triệu VNĐ)' }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${context.raw} triệu VNĐ` } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Triệu VNĐ' } } } }
            });
        }

        if (dom.expenseCtx) {
            charts.expense = new Chart(dom.expenseCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Lương', 'Văn phòng phẩm', 'Marketing', 'Thiết bị', 'Khác'],
                    datasets: [{ data: [65, 10, 15, 7, 3], backgroundColor: ['rgb(54, 162, 235)', 'rgb(75, 192, 192)', 'rgb(255, 205, 86)', 'rgb(255, 99, 132)', 'rgb(153, 102, 255)'], hoverOffset: 4 }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw}%` } } } }
            });
        }
        console.log('Biểu đồ đã được khởi tạo');
    };
    
    /**
     * Thiết lập ngày hiện tại
     */
    const setCurrentDate = () => {
        const now = new Date();
        if (dom.currentDateElement) {
            dom.currentDateElement.textContent = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
    };
    
    /**
     * Khởi tạo dữ liệu mẫu
     */
    const initSampleData = () => {
        transactions = [
            { id: 1, type: 'income', amount: 15000000, description: 'Thanh toán dự án A', category: 'Dự án', date: '2023-11-10' },
            { id: 2, type: 'expense', amount: 5000000, description: 'Mua thiết bị văn phòng', category: 'Thiết bị', date: '2023-11-09' },
            { id: 3, type: 'expense', amount: 25000000, description: 'Lương tháng 10', category: 'Lương', date: '2023-11-05' },
            { id: 4, type: 'income', amount: 8000000, description: 'Bảo trì phần mềm', category: 'Dịch vụ', date: '2023-11-03' },
            { id: 5, type: 'expense', amount: 3500000, description: 'Tiếp khách đối tác', category: 'Khác', date: '2023-11-01' },
            { id: 6, type: 'income', amount: 12000000, description: 'Thanh toán dự án B', category: 'Dự án', date: '2023-10-28' },
            { id: 7, type: 'expense', amount: 4500000, description: 'Quảng cáo Facebook', category: 'Marketing', date: '2023-10-25' }
        ];
        console.log('Dữ liệu mẫu đã được khởi tạo');
    };

    /**
     * Khởi tạo toàn bộ ứng dụng
     */
    const initFinanceApp = () => {
        console.log('Khởi tạo ứng dụng tài chính...');
        setCurrentDate();
        initSampleData();
        initCharts();
        setupEventListeners();
        updateAll();
    };

    // ================= HÀM TOÀN CỤC ĐỂ GỌI TỪ HTML =================
    window.editTransaction = (id) => {
        const transaction = transactions.find(t => t.id === id);
        if (transaction) {
            dom.transactionForm?.setAttribute('data-edit-id', id);
            if (dom.modalTitleTransaction) dom.modalTitleTransaction.textContent = 'Chỉnh sửa giao dịch';
            
            document.querySelector(`input[name="transaction-type"][value="${transaction.type}"]`).checked = true;
            document.getElementById('transaction-amount').value = transaction.amount;
            document.getElementById('transaction-description').value = transaction.description;
            document.getElementById('transaction-category').value = transaction.category;
            document.getElementById('transaction-date').value = transaction.date;

            toggleModal('transaction-modal');
        }
    };

    window.deleteTransaction = (id) => {
        if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
            const index = transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                transactions.splice(index, 1);
                updateAll();
                showNotification('Giao dịch đã được xóa thành công!', 'success');
            }
        }
    };

    // Khởi tạo ứng dụng khi DOM đã sẵn sàng
    initFinanceApp();
    console.log('Tài chính JS đã được tải thành công');
});