from __future__ import annotations

import io
import sqlite3
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

import streamlit as st
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

APP_DIR = Path(__file__).parent
DB_PATH = APP_DIR / "data" / "incidents.db"
CATEGORIES = ["Hardware", "Software", "Network", "Account"]
PRIORITIES = ["Low", "Medium", "High", "Critical"]


def init_db() -> None:
    DB_PATH.parent.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                requester TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                priority TEXT NOT NULL,
                troubleshooting TEXT NOT NULL,
                response TEXT NOT NULL,
                report TEXT NOT NULL
            )"""
        )


def local_assessment(description: str, category: str, priority: str) -> dict[str, str]:
    playbooks = {
        "Hardware": ["Kiểm tra nguồn, cáp và đèn trạng thái.", "Tháo và kết nối lại thiết bị ngoại vi.", "Chạy chẩn đoán phần cứng của nhà sản xuất.", "Ghi lại mã lỗi và thử linh kiện thay thế đã xác minh."],
        "Software": ["Xác nhận phiên bản ứng dụng và hệ điều hành.", "Khởi động lại ứng dụng, sau đó kiểm tra log gần nhất.", "Thử lại bằng hồ sơ người dùng sạch hoặc safe mode.", "Cập nhật hoặc rollback bản phát hành gần nhất nếu phù hợp."],
        "Network": ["Kiểm tra Wi-Fi, cáp mạng và địa chỉ IP.", "Thử ping gateway và phân giải DNS.", "Kiểm tra proxy, VPN và firewall đang áp dụng.", "So sánh kết quả trên một thiết bị hoặc mạng khác."],
        "Account": ["Xác nhận đúng username và phạm vi tài khoản.", "Kiểm tra trạng thái khóa, MFA và thời hạn mật khẩu.", "Thu hồi phiên đăng nhập cũ nếu có dấu hiệu bất thường.", "Reset thông tin xác thực qua quy trình đã phê duyệt."],
    }
    steps = "\n".join(f"{i}. {step}" for i, step in enumerate(playbooks[category], 1))
    response = f"Chào bạn, chúng tôi đã ghi nhận sự cố {category.lower()} với mức ưu tiên {priority}. Vui lòng giữ thiết bị ở trạng thái hiện tại và thử các bước an toàn được gửi kèm. Đội IT sẽ tiếp tục hỗ trợ nếu sự cố chưa được khắc phục."
    report = f"""## Incident summary
- Category: {category}
- Priority: {priority}
- Description: {description.strip()}
- Initial assessment: Sự cố cần được xác minh theo playbook {category.lower()}.
- Recommended action: Thực hiện checklist, ghi nhận kết quả từng bước và chuyển cấp nếu không khắc phục được.
- Generated at: {datetime.now().strftime('%d/%m/%Y %H:%M')}"""
    return {"troubleshooting": steps, "response": response, "report": report}


def smart_assessment(description: str, category: str, priority: str) -> dict[str, str]:
    return local_assessment(description, category, priority)


def make_pdf(title: str, body: str) -> bytes:
    font_name = "Helvetica"
    for font_path in (Path("C:/Windows/Fonts/arial.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")):
        if font_path.exists():
            font_name = "ReportUnicode"
            if font_name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
            break
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
    styles = getSampleStyleSheet()
    heading = ParagraphStyle("Heading", parent=styles["Title"], textColor=HexColor("#153e3a"), fontSize=20, spaceAfter=12)
    heading.fontName = font_name
    body_style = ParagraphStyle("Body", parent=styles["BodyText"], fontName=font_name, fontSize=10, leading=15, textColor=HexColor("#243431"))
    story = [Paragraph(title, heading), Spacer(1, 4)]
    for line in body.splitlines():
        clean = line.lstrip("#- ").strip() or " "
        story.append(Paragraph(escape(clean), body_style))
        story.append(Spacer(1, 4))
    doc.build(story)
    return buffer.getvalue()


def save_incident(requester: str, description: str, category: str, priority: str, result: dict[str, str]) -> int:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "INSERT INTO incidents (created_at, requester, description, category, priority, troubleshooting, response, report) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (datetime.now().isoformat(timespec="seconds"), requester, description, category, priority, result["troubleshooting"], result["response"], result["report"]),
        )
        return int(cursor.lastrowid)


def app() -> None:
    st.set_page_config(page_title="Resolve Desk", page_icon="RD", layout="wide")
    init_db()
    st.markdown("""<style>
    :root { --ink:#15231f; --muted:#61716b; --accent:#147d6c; --paper:#f4f7f5; }
    .stApp { background:var(--paper); color:var(--ink); }
    [data-testid="stSidebar"] { background:#e7efeb; border-right:1px solid #ccdad4; }
    h1,h2,h3 { letter-spacing:-.035em; }
    .hero { padding:2rem 0 1.2rem; border-bottom:1px solid #cfdbd6; margin-bottom:1.6rem; }
    .hero p { color:var(--muted); max-width:650px; }
    .metric { background:#153e3a; color:#effaf5; padding:18px; border-radius:14px; min-height:110px; }
    .metric strong { display:block; font-size:28px; margin-top:10px; }
    .stButton button, .stDownloadButton button { border-radius:10px; font-weight:700; }
    footer { visibility:hidden; }
    .copyright { text-align:center; color:#63736d; padding:3rem 0 1rem; font-size:.86rem; }
    @media (max-width: 768px) {
      .block-container { padding-left: 1rem !important; padding-right: 1rem !important; }
      .hero { padding-top: 1rem; }
      .hero h1 { font-size: 2rem !important; line-height: 1.08; }
      [data-testid="stHorizontalBlock"] { flex-wrap: wrap; }
      [data-testid="column"] { min-width: 100% !important; }
    }
    </style>""", unsafe_allow_html=True)

    st.markdown('<section class="hero"><small>RESOLVE DESK</small><h1>Smart IT Support Assistant</h1><p>Thu thập sự cố, áp dụng playbook xử lý và tạo báo cáo kỹ thuật trong một luồng làm việc.</p></section>', unsafe_allow_html=True)
    tab_new, tab_history = st.tabs(["Tạo incident", "Lịch sử"])
    with tab_new:
        with st.form("incident_form"):
            left, right = st.columns([1.6, 1])
            with left:
                requester = st.text_input("Người yêu cầu", placeholder="Nguyễn Minh Anh")
                description = st.text_area("Mô tả sự cố", height=180, placeholder="Mô tả triệu chứng, thời điểm bắt đầu và thông báo lỗi...")
            with right:
                category = st.selectbox("Phân loại", CATEGORIES)
                priority = st.select_slider("Mức độ ưu tiên", options=PRIORITIES, value="Medium")
                st.caption("Không đưa mật khẩu, token hoặc dữ liệu nhạy cảm vào mô tả.")
            submitted = st.form_submit_button("Phân tích sự cố", use_container_width=True, type="primary")
        if submitted:
            if not requester.strip() or len(description.strip()) < 12:
                st.error("Vui lòng nhập người yêu cầu và mô tả tối thiểu 12 ký tự.")
            else:
                with st.status("Đang xây dựng phương án xử lý...", expanded=False) as status:
                    result = smart_assessment(description, category, priority)
                    incident_id = save_incident(requester, description, category, priority, result)
                    status.update(label=f"Đã tạo incident #{incident_id}", state="complete")
                st.session_state["latest"] = (incident_id, result)
        if "latest" in st.session_state:
            incident_id, result = st.session_state["latest"]
            st.subheader(f"Kết quả incident #{incident_id}")
            c1, c2 = st.columns(2)
            with c1:
                st.markdown("#### Các bước troubleshooting")
                st.markdown(result["troubleshooting"])
            with c2:
                st.markdown("#### Phản hồi người dùng")
                st.info(result["response"])
            st.markdown(result["report"])
            md = f"# Incident #{incident_id}\n\n{result['report']}\n\n## Troubleshooting\n{result['troubleshooting']}\n\n## User response\n{result['response']}"
            d1, d2, _ = st.columns([1, 1, 2])
            d1.download_button("Tải Markdown", md, f"incident-{incident_id}.md", "text/markdown", use_container_width=True)
            d2.download_button("Tải PDF", make_pdf(f"Incident #{incident_id}", md), f"incident-{incident_id}.pdf", "application/pdf", use_container_width=True)
    with tab_history:
        with sqlite3.connect(DB_PATH) as conn:
            rows = conn.execute("SELECT id, created_at, requester, category, priority, description FROM incidents ORDER BY id DESC LIMIT 100").fetchall()
        if not rows:
            st.info("Chưa có incident. Tạo bản ghi đầu tiên ở tab bên cạnh.")
        else:
            st.dataframe([{"ID": r[0], "Thời gian": r[1].replace("T", " "), "Người yêu cầu": r[2], "Phân loại": r[3], "Ưu tiên": r[4], "Mô tả": r[5]} for r in rows], use_container_width=True, hide_index=True)
    st.markdown('<div class="copyright">Đây là app Demo được thực hiện bởi Phạm Đoàn Thiện Phong</div>', unsafe_allow_html=True)


if __name__ == "__main__":
    app()
