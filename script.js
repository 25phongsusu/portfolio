const myProjects = [
    {
        number: "01",
        title: "Smart IT Support Assistant",
        description: "Tiếp nhận sự cố, phân loại mức độ ưu tiên, đề xuất troubleshooting và xuất incident report.",
        stack: ["Python", "Streamlit", "SQLite", "Playbook"],
        link: "http://127.0.0.1:8501"
    },
    {
        number: "02",
        title: "IT Toolbox",
        description: "Bộ công cụ hỗ trợ DNS, HTTP, port, SSL, IP, JSON, Base64, file hash và mật khẩu.",
        stack: ["Python", "Streamlit", "Networking", "Security"],
        link: "http://127.0.0.1:8502"
    },
    {
        number: "03",
        title: "Smart IT Service Hub",
        description: "Không gian quản lý ticket, thiết bị, phân quyền Employee/Admin và trợ lý xử lý theo playbook.",
        stack: ["Next.js", "React", "Supabase", "TypeScript"],
        link: "http://127.0.0.1:3000"
    },
    {
        number: "04",
        title: "Preventive Maintenance Manager",
        description: "Quản lý thiết bị, lịch bảo trì, checklist, ảnh hiện trường và báo cáo bảo trì tự động.",
        stack: ["Next.js", "React", "LocalStorage", "Playwright"],
        link: "http://127.0.0.1:3001"
    }
];

document.addEventListener("DOMContentLoaded", () => {
    // Tự động render danh sách dự án
    const projectsGrid = document.getElementById("projects-grid");
    if (projectsGrid) {
        myProjects.forEach(proj => {
            const card = document.createElement("article");
            card.className = "card";
            card.innerHTML = `
                <div class="card-topline">
                    <span class="project-number">${proj.number}</span>
                    <span class="project-status">Demo local</span>
                </div>
                <h4>${proj.title}</h4>
                <p>${proj.description}</p>
                <div class="project-stack" aria-label="Công nghệ sử dụng">
                    ${proj.stack.map(item => `<span>${item}</span>`).join("")}
                </div>
                <a href="${proj.link}" target="_blank" rel="noopener noreferrer" class="card-link">
                    Mở web app <span aria-hidden="true">↗</span>
                </a>
            `;
            projectsGrid.appendChild(card);
        });
    }

    const mailBody = document.getElementById("mail-body");
    const btnSend = document.getElementById("btn-send");
    const mailTarget = document.getElementById("mail-target").innerText;
    const mailStatus = document.getElementById("mail-status");

    const sendEmail = () => {
        const text = mailBody.value.trim();
        if (!text) {
            mailStatus.innerText = "Vui lòng nhập nội dung trước khi gửi.";
            setTimeout(() => mailStatus.innerText = "", 2000);
            return;
        }
        
        btnSend.innerText = "Đang chuyển hướng...";
        
        const subject = encodeURIComponent("Kết nối công việc qua Portfolio");
        const body = encodeURIComponent(text);
        
        // Mở Gmail compose
        const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${mailTarget}&su=${subject}&body=${body}`;
        window.open(gmailLink, '_blank');
        
        setTimeout(() => {
            btnSend.innerText = "Mở ứng dụng Gmail";
            mailStatus.innerText = "Đã mở tab Gmail. Cảm ơn bạn!";
            mailBody.value = ""; 
            setTimeout(() => mailStatus.innerText = "", 4000);
        }, 1500);
    };

    btnSend.addEventListener("click", sendEmail);

    mailBody.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
            sendEmail();
        }
    });
});
