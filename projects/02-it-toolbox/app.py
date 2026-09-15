from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import re
import socket
import sqlite3
import ssl
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests
import streamlit as st

APP_DIR = Path(__file__).parent
DB_PATH = APP_DIR / "data" / "toolbox.db"


def init_db() -> None:
    DB_PATH.parent.mkdir(exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS checks (id INTEGER PRIMARY KEY, created_at TEXT, tool TEXT, target TEXT, result TEXT)")


def save(tool: str, target: str, result: str) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("INSERT INTO checks(created_at, tool, target, result) VALUES (?, ?, ?, ?)", (datetime.now().isoformat(timespec="seconds"), tool, target[:240], result[:2000]))


def public_host(value: str) -> str:
    host = (urlparse(value).hostname or value).strip().rstrip(".")
    if not host or len(host) > 253:
        raise ValueError("Hostname không hợp lệ")
    addresses = socket.getaddrinfo(host, None)
    for item in addresses:
        ip = ipaddress.ip_address(item[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ValueError("Không cho phép kiểm tra địa chỉ nội bộ, loopback hoặc reserved")
    return host


def password_score(value: str) -> tuple[int, list[str]]:
    score, tips = 0, []
    checks = [(len(value) >= 12, "Dùng ít nhất 12 ký tự"), (bool(re.search(r"[a-z]", value)), "Thêm chữ thường"), (bool(re.search(r"[A-Z]", value)), "Thêm chữ hoa"), (bool(re.search(r"\d", value)), "Thêm chữ số"), (bool(re.search(r"[^A-Za-z0-9]", value)), "Thêm ký tự đặc biệt")]
    for passed, tip in checks:
        score += int(passed)
        if not passed:
            tips.append(tip)
    return score, tips


def app() -> None:
    st.set_page_config(page_title="FieldKit IT Toolbox", page_icon="FK", layout="wide")
    init_db()
    st.markdown("""<style>
    :root{--ink:#171b20;--muted:#68717c;--accent:#c5532d;--paper:#f2f1ed}
    .stApp{background:var(--paper);color:var(--ink)} [data-testid="stSidebar"]{background:#20262c;color:#f4f2eb}
    h1,h2,h3{letter-spacing:-.04em}.mast{padding:1.8rem 0;border-bottom:2px solid #23282e;margin-bottom:1.2rem}
    .mast p{color:var(--muted);max-width:680px}.notice{padding:14px 16px;border-left:4px solid var(--accent);background:#e8e5df}
    .stButton button{border-radius:6px;font-weight:750}.copyright{text-align:center;color:#6c716f;padding:3rem 0 1rem;font-size:.86rem} footer{visibility:hidden}
    @media (max-width:768px){.block-container{padding-left:1rem!important;padding-right:1rem!important}.mast{padding-top:1rem}.mast h1{font-size:2rem!important}[data-testid="stHorizontalBlock"]{flex-wrap:wrap}[data-testid="column"]{min-width:100%!important}}
    </style>""", unsafe_allow_html=True)
    st.markdown('<section class="mast"><small>FIELDKIT / OPERATIONS</small><h1>IT Toolbox</h1><p>Các phép kiểm tra thiết yếu cho DNS, HTTP, cổng mạng, SSL, dữ liệu và file.</p></section>', unsafe_allow_html=True)
    authorized = st.checkbox("Tôi xác nhận chỉ kiểm tra server và website mình sở hữu hoặc được phép kiểm tra.")
    if not authorized:
        st.markdown('<div class="notice">Hãy xác nhận quyền kiểm tra để mở các công cụ mạng. Công cụ dữ liệu cục bộ vẫn có thể sử dụng.</div>', unsafe_allow_html=True)
    network, data, history = st.tabs(["Network", "Data & Security", "Lịch sử"])
    with network:
        tool = st.selectbox("Công cụ", ["DNS lookup", "HTTP status & response time", "Port check", "SSL expiry", "IP information"])
        target = st.text_input("Hostname hoặc URL", placeholder="example.com")
        port = st.number_input("Port", 1, 65535, 443, disabled=tool != "Port check")
        if st.button("Chạy kiểm tra", type="primary", disabled=not authorized, use_container_width=True):
            try:
                host = public_host(target)
                if tool == "DNS lookup":
                    values = sorted({x[4][0] for x in socket.getaddrinfo(host, None)})
                    result = json.dumps({"host": host, "addresses": values}, ensure_ascii=False, indent=2)
                elif tool == "HTTP status & response time":
                    url = target if target.startswith(("http://", "https://")) else f"https://{host}"
                    start = time.perf_counter()
                    response = requests.get(url, timeout=8, allow_redirects=True, stream=True)
                    elapsed = round((time.perf_counter() - start) * 1000, 1)
                    result = json.dumps({"status": response.status_code, "response_ms": elapsed, "final_url": response.url}, ensure_ascii=False, indent=2)
                elif tool == "Port check":
                    start = time.perf_counter()
                    with socket.create_connection((host, int(port)), timeout=4):
                        elapsed = round((time.perf_counter() - start) * 1000, 1)
                    result = json.dumps({"host": host, "port": int(port), "open": True, "response_ms": elapsed}, indent=2)
                elif tool == "SSL expiry":
                    context = ssl.create_default_context()
                    with socket.create_connection((host, 443), timeout=6) as sock:
                        with context.wrap_socket(sock, server_hostname=host) as secure:
                            cert = secure.getpeercert()
                    expires = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                    result = json.dumps({"expires_at": expires.isoformat(), "days_remaining": (expires - datetime.now(timezone.utc)).days, "issuer": dict(x[0] for x in cert.get("issuer", []))}, ensure_ascii=False, indent=2)
                else:
                    ip = socket.gethostbyname(host)
                    response = requests.get(f"https://ipwho.is/{ip}", timeout=8)
                    payload = response.json()
                    result = json.dumps({"ip": ip, "country": payload.get("country"), "region": payload.get("region"), "city": payload.get("city"), "connection": payload.get("connection")}, ensure_ascii=False, indent=2)
                st.code(result, language="json")
                save(tool, target, result)
            except Exception as exc:
                st.error(f"Không thể hoàn tất kiểm tra: {exc}")
    with data:
        choice = st.radio("Tiện ích", ["JSON formatter", "Base64", "File hash", "Password strength"], horizontal=True)
        if choice == "JSON formatter":
            raw = st.text_area("JSON", height=180, placeholder='{"status":"ok"}')
            if st.button("Định dạng JSON"):
                try:
                    output = json.dumps(json.loads(raw), ensure_ascii=False, indent=2, sort_keys=True)
                    st.code(output, language="json"); save(choice, "local text", output)
                except json.JSONDecodeError as exc:
                    st.error(f"JSON không hợp lệ tại dòng {exc.lineno}, cột {exc.colno}.")
        elif choice == "Base64":
            raw = st.text_area("Nội dung", height=150)
            mode = st.segmented_control("Chế độ", ["Encode", "Decode"], default="Encode")
            if st.button("Xử lý Base64"):
                try:
                    output = base64.b64encode(raw.encode()).decode() if mode == "Encode" else base64.b64decode(raw, validate=True).decode()
                    st.code(output); save(f"Base64 {mode}", "local text", output)
                except Exception:
                    st.error("Dữ liệu Base64 không hợp lệ hoặc không phải UTF-8.")
        elif choice == "File hash":
            upload = st.file_uploader("Chọn file", help="File chỉ được xử lý trong phiên hiện tại.")
            algo = st.selectbox("Thuật toán", ["sha256", "sha512", "md5"])
            if upload:
                digest = hashlib.new(algo, upload.getvalue()).hexdigest()
                st.code(digest); save(f"File hash {algo}", upload.name, digest)
        else:
            password = st.text_input("Mật khẩu cần đánh giá", type="password", help="Không lưu mật khẩu vào lịch sử.")
            if password:
                score, tips = password_score(password)
                labels = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Mạnh", "Rất mạnh"]
                st.metric("Độ mạnh", labels[score])
                if tips:
                    st.write("Gợi ý: " + "; ".join(tips))
    with history:
        with sqlite3.connect(DB_PATH) as conn:
            rows = conn.execute("SELECT created_at, tool, target, result FROM checks ORDER BY id DESC LIMIT 100").fetchall()
        if rows:
            st.dataframe([{"Thời gian": r[0].replace("T", " "), "Công cụ": r[1], "Mục tiêu": r[2], "Kết quả": r[3]} for r in rows], use_container_width=True, hide_index=True)
        else:
            st.info("Chưa có lịch sử kiểm tra.")
    st.markdown('<div class="copyright">Đây là app Demo được thực hiện bởi Phạm Đoàn Thiện Phong</div>', unsafe_allow_html=True)


if __name__ == "__main__":
    app()
