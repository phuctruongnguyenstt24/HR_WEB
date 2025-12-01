document.addEventListener("DOMContentLoaded", () => {
    const projectsList = document.getElementById("projects-list");
    const addBtn = document.getElementById("add-project-btn");
    const modal = document.getElementById("project-modal");
    const closeModal = document.querySelector(".modal .close");
    const cancelBtn = document.getElementById("cancel-btn");
    const form = document.getElementById("project-form");

    // Risk analysis elements
    const analyzeRisksBtn = document.getElementById('analyze-risks-btn');
    const riskSortSelect = document.getElementById('risk-sort');
    const riskAnalysisBody = document.getElementById('risk-analysis-body');
    const highRiskCountEl = document.getElementById('high-risk-count');
    const mediumRiskCountEl = document.getElementById('medium-risk-count');
    const lowRiskCountEl = document.getElementById('low-risk-count');

    // Use a single source of truth for projects data
    let projects = [
        { id: 1, name: "Hệ thống CRM", start: "2025-09-01", end: "2025-12-01", priority: "high", status: "ongoing", desc: "Nâng cấp CRM phục vụ khách hàng." },
        { id: 2, name: "Ứng dụng di động", start: "2025-08-01", end: "2025-11-15", priority: "medium", status: "delayed", desc: "Phát triển app HR." },
        { id: 3, name: "Website công ty", start: "2025-07-01", end: "2025-09-30", priority: "low", status: "completed", desc: "Thiết kế lại giao diện web." }
    ];

    let editingId = null;

    // --- Core Project Management Functions ---

    // Render Projects
    function renderProjects() {
        projectsList.innerHTML = "";
        projects.forEach(p => {
            const card = document.createElement("div");
            card.className = "project-card";
            card.innerHTML = `
                <div class="project-header">
                    <h4>${p.name}</h4>
                    <div>
                        <button class="edit-btn"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="project-meta">
                    <span><i class="fas fa-calendar"></i> ${p.start} → ${p.end}</span>
                    <span class="priority-${p.priority}">● ${p.priority}</span>
                    <span>${p.status}</span>
                </div>
                <p>${p.desc}</p>
            `;
            card.querySelector(".edit-btn").addEventListener("click", () => openModal(p));
            card.querySelector(".delete-btn").addEventListener("click", () => deleteProject(p.id));
            projectsList.appendChild(card);
        });
        // Call risk analysis after rendering projects
        analyzeProjectRisks();
    }

    // Modal
    function openModal(project = null) {
        modal.style.display = "flex";
        if (project) {
            editingId = project.id;
            document.getElementById("modal-title").textContent = "Chỉnh sửa dự án";
            form["project-name"].value = project.name;
            form["project-start"].value = project.start;
            form["project-end"].value = project.end;
            form["project-priority"].value = project.priority;
            form["project-status"].value = project.status;
            form["project-description"].value = project.desc;
        } else {
            editingId = null;
            document.getElementById("modal-title").textContent = "Thêm dự án mới";
            form.reset();
        }
    }
    function closeModalFn() { modal.style.display = "none"; }

    addBtn.addEventListener("click", () => openModal());
    closeModal.addEventListener("click", closeModalFn);
    cancelBtn.addEventListener("click", closeModalFn);

    form.addEventListener("submit", e => {
        e.preventDefault();
        const newProject = {
            id: editingId || Date.now(),
            name: form["project-name"].value,
            start: form["project-start"].value,
            end: form["project-end"].value,
            priority: form["project-priority"].value,
            status: form["project-status"].value,
            desc: form["project-description"].value
        };
        if (editingId) {
            projects = projects.map(p => (p.id === editingId ? newProject : p));
        } else {
            projects.push(newProject);
        }
        renderProjects();
        closeModalFn();
    });

    function deleteProject(id) {
        if (confirm("Xóa dự án này?")) {
            projects = projects.filter(p => p.id !== id);
            renderProjects();
        }
    }

    // --- Risk Analysis and Sorting Functions ---
    
    let allRisks = [];

    // Main function to analyze and render risks
    function analyzeProjectRisks() {
        riskAnalysisBody.innerHTML = '';
        allRisks = []; // Reset the risks array

        let highRiskCount = 0;
        let mediumRiskCount = 0;
        let lowRiskCount = 0;

        projects.forEach(project => {
            const risks = generateRisksForProject(project);
            risks.forEach(risk => {
                const priority = getRiskPriority(risk.probability, risk.impact);
                risk.priorityText = priority.text;
                risk.priorityClass = priority.class;
                risk.projectName = project.name; // Add project name to risk object
                allRisks.push(risk);
            });
        });

        updateRiskTable();
    }

    // Helper to determine risk priority
    function getRiskPriority(probability, impact) {
        if (probability === 'Cao' && impact === 'Cao') {
            return { text: 'Cao', class: 'high' };
        } else if (probability === 'Thấp' && impact === 'Thấp') {
            return { text: 'Thấp', class: 'low' };
        } else {
            return { text: 'Trung bình', class: 'medium' };
        }
    }

    // Renders the risk table based on the allRisks array
    function updateRiskTable() {
        riskAnalysisBody.innerHTML = '';
        let highCount = 0, mediumCount = 0, lowCount = 0;

        allRisks.forEach(risk => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${risk.projectName}</td>
                <td>${risk.description}</td>
                <td>${risk.probability}</td>
                <td>${risk.impact}</td>
                <td><span class="risk-priority ${risk.priorityClass}">${risk.priorityText}</span></td>
                <td>${risk.mitigation}</td>
            `;
            riskAnalysisBody.appendChild(row);

            if (risk.priorityText === 'Cao') highCount++;
            else if (risk.priorityText === 'Trung bình') mediumCount++;
            else lowCount++;
        });

        highRiskCountEl.textContent = highCount;
        mediumRiskCountEl.textContent = mediumCount;
        lowRiskCountEl.textContent = lowCount;
    }

    // Mock function to generate risks for a project
    function generateRisksForProject(project) {
        const risks = [];
        const today = new Date();
        const endDate = new Date(project.end);
        const timeDiff = endDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff < 14) {
            risks.push({
                description: 'Dự án có nguy cơ trễ deadline',
                probability: 'Cao',
                impact: 'Cao',
                mitigation: 'Ưu tiên phân bổ nguồn lực, xem xét gia hạn timeline'
            });
        }
        
        if (project.priority === 'high') {
            risks.push({
                description: 'Áp lực cao do mức độ ưu tiên của dự án',
                probability: 'Trung bình',
                impact: 'Cao',
                mitigation: 'Đảm bảo phân bổ đủ nguồn lực và theo dõi sát tiến độ'
            });
        }
        
        risks.push({
            description: 'Thiếu hụt nhân sự chủ chốt',
            probability: 'Thấp',
            impact: 'Cao',
            mitigation: 'Đào tạo nhân sự dự phòng, phân chia công việc hợp lý'
        });
        
        risks.push({
            description: 'Thay đổi yêu cầu từ khách hàng',
            probability: 'Trung bình',
            impact: 'Trung bình',
            mitigation: 'Thiết lập quy trình quản lý thay đổi rõ ràng'
        });
        
        return risks;
    }

    // Handles sorting of the risk table
    function updateRiskSorting() {
        const sortBy = riskSortSelect.value;
        if (sortBy === 'name') {
            allRisks.sort((a, b) => a.projectName.localeCompare(b.projectName));
        } else if (sortBy === 'priority') {
            const priorityOrder = { 'Cao': 1, 'Trung bình': 2, 'Thấp': 3 };
            allRisks.sort((a, b) => priorityOrder[a.priorityText] - priorityOrder[b.priorityText]);
        }
        updateRiskTable();
    }

    // --- Initial setup and Event Listeners ---
    analyzeRisksBtn.addEventListener('click', analyzeProjectRisks);
    riskSortSelect.addEventListener('change', updateRiskSorting);
    
    // Initial render
    renderProjects();
});