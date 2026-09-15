"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArchiveBoxIcon as ArchiveBox, ChartBar, CheckCircle, Cpu, GearSix, Lightning, Plus, SignOut, Ticket, UserCircle, Warning } from "@phosphor-icons/react";

type Status = "Open" | "In Progress" | "Resolved";
type Priority = "Low" | "Medium" | "High" | "Critical";
type TicketItem = { id: number; title: string; requester: string; category: string; priority: Priority; status: Status; assignee: string; createdAt: string; history: string[]; aiSummary?: string };
type Asset = { id: number; name: string; model: string; serial: string; owner: string; status: "In use" | "Available" | "Repair"; warranty: string };

const seedTickets: TicketItem[] = [
  { id: 1048, title: "Không kết nối được VPN", requester: "Minh Khoa", category: "Network", priority: "High", status: "In Progress", assignee: "Thiện Phong", createdAt: "15/09/2026", history: ["Ticket được tạo", "Phân công Thiện Phong"] },
  { id: 1047, title: "Outlook yêu cầu đăng nhập lại", requester: "Hà My", category: "Account", priority: "Medium", status: "Open", assignee: "Chưa phân công", createdAt: "15/09/2026", history: ["Ticket được tạo"] },
  { id: 1046, title: "Màn hình phòng họp chớp", requester: "Quốc Bảo", category: "Hardware", priority: "Low", status: "Resolved", assignee: "Thanh Ngân", createdAt: "14/09/2026", history: ["Ticket được tạo", "Đã thay cáp HDMI", "Đã xử lý"] }
];
const seedAssets: Asset[] = [
  { id: 301, name: "Laptop - Minh Khoa", model: "Dell Latitude 7450", serial: "DL-74K-921", owner: "Minh Khoa", status: "In use", warranty: "2027-04-18" },
  { id: 302, name: "Laptop dự phòng", model: "ThinkPad T14 Gen 5", serial: "LT-14G-287", owner: "Chưa giao", status: "Available", warranty: "2028-01-09" },
  { id: 303, name: "Máy in Kế toán", model: "HP LaserJet Pro 4103", serial: "HP-4103-88", owner: "Phòng Kế toán", status: "Repair", warranty: "2026-10-02" }
];

const nav = [
  { id: "dashboard", label: "Tổng quan", icon: ChartBar },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "assets", label: "Thiết bị", icon: Cpu },
  { id: "ai", label: "AI hỗ trợ", icon: Lightning }
];

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
}

export default function ServiceHub() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [role, setRole] = useState<"Employee" | "Admin">("Admin");
  const [active, setActive] = useState("dashboard");
  const [tickets, setTickets] = useState<TicketItem[]>(seedTickets);
  const [assets, setAssets] = useState<Asset[]>(seedAssets);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [selected, setSelected] = useState<TicketItem | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setTickets(loadLocal("relay-tickets", seedTickets));
    setAssets(loadLocal("relay-assets", seedAssets));
    setLoggedIn(localStorage.getItem("relay-session") === "active");
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("relay-tickets", JSON.stringify(tickets)); }, [tickets, ready]);
  useEffect(() => { if (ready) localStorage.setItem("relay-assets", JSON.stringify(assets)); }, [assets, ready]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 2600); return () => clearTimeout(timer); }, [toast]);

  const stats = useMemo(() => ({ open: tickets.filter(t => t.status !== "Resolved").length, critical: tickets.filter(t => t.priority === "Critical" || t.priority === "High").length, activeAssets: assets.filter(a => a.status === "In use").length, expiring: assets.filter(a => new Date(a.warranty) < new Date("2027-01-01")).length }), [tickets, assets]);

  function authenticate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); const email = String(form.get("email")).trim().toLowerCase(); const password = String(form.get("password"));
    const users = loadLocal<{email:string;password:string}[]>("relay-users", [{email:"admin@relay.local",password:"demo1234"}]);
    if (authMode === "register") {
      if (users.some(u => u.email === email)) { setAuthError("Email này đã được đăng ký."); return; }
      localStorage.setItem("relay-users", JSON.stringify([...users, {email, password}]));
    } else if (!users.some(u => u.email === email && u.password === password)) { setAuthError("Email hoặc mật khẩu không đúng."); return; }
    setAuthError(""); localStorage.setItem("relay-session", "active"); setLoggedIn(true);
  }
  function logout() { localStorage.removeItem("relay-session"); setLoggedIn(false); }
  function addTicket(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    const item: TicketItem = { id: Math.max(...tickets.map(t => t.id), 1000) + 1, title: String(form.get("title")), requester: "Người dùng demo", category: String(form.get("category")), priority: String(form.get("priority")) as Priority, status: "Open", assignee: "Chưa phân công", createdAt: new Date().toLocaleDateString("vi-VN"), history: ["Ticket được tạo"] };
    setTickets([item, ...tickets]); setTicketOpen(false); setToast("Đã tạo ticket mới");
  }
  function addAsset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    const item: Asset = { id: Math.max(...assets.map(a => a.id), 300) + 1, name: String(form.get("name")), model: String(form.get("model")), serial: String(form.get("serial")), owner: String(form.get("owner")) || "Chưa giao", status: "Available", warranty: String(form.get("warranty")) };
    setAssets([item, ...assets]); setAssetOpen(false); setToast("Đã thêm thiết bị");
  }
  function updateStatus(item: TicketItem, status: Status) {
    const summary = status === "Resolved" ? `Đã xử lý ${item.category.toLowerCase()} cho ${item.requester}. Kỹ thuật viên ${item.assignee} đã hoàn tất ticket với ${item.history.length + 1} cập nhật.` : item.aiSummary;
    setTickets(tickets.map(t => t.id === item.id ? { ...t, status, aiSummary: summary, history: [...t.history, `Chuyển trạng thái sang ${status}`] } : t));
    setSelected(prev => prev ? { ...prev, status, aiSummary: summary, history: [...prev.history, `Chuyển trạng thái sang ${status}`] } : null); setToast("Đã cập nhật trạng thái");
  }
  function assign(item: TicketItem, assignee: string) { const next={...item,assignee,history:[...item.history,`Phân công ${assignee}`]}; setTickets(tickets.map(t=>t.id===item.id?next:t)); setSelected(next); setToast("Đã phân công kỹ thuật viên"); }
  function updateAsset(next: Asset) { setAssets(assets.map(a=>a.id===next.id?next:a)); setToast("Đã cập nhật thiết bị"); }

  if (!ready) return <div className="loading-shell"><div className="skeleton wide"/><div className="skeleton"/></div>;
  if (!loggedIn) return <main className="login-page"><section className="login-story"><div className="brand-mark">R</div><p className="eyebrow">RELAY SERVICE OPERATIONS</p><h1>Mọi yêu cầu IT.<br/>Một nơi xử lý.</h1><p>Quản lý ticket, thiết bị và phản hồi AI trong cùng một không gian vận hành.</p></section><form className="login-card" onSubmit={authenticate}><div><span className="kicker">{authMode === "login" ? "WELCOME BACK" : "CREATE WORKSPACE"}</span><h2>{authMode === "login" ? "Đăng nhập hệ thống" : "Đăng ký tài khoản"}</h2></div><label>Email<input name="email" type="email" defaultValue={authMode === "login" ? "admin@relay.local" : ""} required/></label><label>Mật khẩu<input name="password" type="password" minLength={8} defaultValue={authMode === "login" ? "demo1234" : ""} required/></label><label>Vai trò<select value={role} onChange={e => setRole(e.target.value as "Employee" | "Admin")}><option>Admin</option><option>Employee</option></select></label>{authError&&<p className="auth-error">{authError}</p>}<button className="primary" type="submit">{authMode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button><button className="auth-switch" type="button" onClick={()=>{setAuthMode(authMode === "login" ? "register" : "login");setAuthError("")}}>{authMode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}</button><p className="helper">Demo local. Kết nối Supabase Auth bằng file .env khi triển khai.</p></form><footer>Đây là app Demo được thực hiện bởi Phạm Đoàn Thiện Phong</footer></main>;

  return <div className="app-shell">
    <aside>
      <div className="logo"><span>R</span><div>Relay<small>IT service hub</small></div></div>
      <nav>{nav.map(item => <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}><item.icon size={20} weight={active === item.id ? "fill" : "regular"}/>{item.label}</button>)}</nav>
      <div className="side-foot"><button><GearSix size={19}/>Cài đặt</button><button onClick={logout}><SignOut size={19}/>Đăng xuất</button></div>
    </aside>
    <main className="workspace">
      <header><div><p>{role} workspace</p><h1>{nav.find(n => n.id === active)?.label}</h1></div><div className="profile"><div><strong>Thiện Phong</strong><small>{role}</small></div><UserCircle size={34}/></div></header>
      {active === "dashboard" && <Dashboard stats={stats} tickets={tickets} assets={assets} onTicket={() => setTicketOpen(true)} onSelect={setSelected}/>} 
      {active === "tickets" && <Tickets tickets={role === "Employee" ? tickets.filter(t => t.requester === "Người dùng demo") : tickets} onCreate={() => setTicketOpen(true)} onSelect={setSelected}/>} 
      {active === "assets" && <Assets assets={assets} admin={role === "Admin"} onCreate={() => setAssetOpen(true)} onUpdate={updateAsset}/>} 
      {active === "ai" && <AIAssistant tickets={tickets}/>} 
      <footer className="app-footer">Đây là app Demo được thực hiện bởi Phạm Đoàn Thiện Phong</footer>
    </main>
    {ticketOpen && <Modal title="Tạo ticket" onClose={() => setTicketOpen(false)}><form className="form-grid" onSubmit={addTicket}><label className="full">Tiêu đề<input name="title" required placeholder="Mô tả ngắn sự cố"/></label><label>Phân loại<select name="category"><option>Hardware</option><option>Software</option><option>Network</option><option>Account</option></select></label><label>Ưu tiên<select name="priority"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><div className="modal-actions full"><button type="button" className="ghost" onClick={() => setTicketOpen(false)}>Hủy</button><button className="primary">Tạo ticket</button></div></form></Modal>}
    {assetOpen && <Modal title="Thêm thiết bị" onClose={() => setAssetOpen(false)}><form className="form-grid" onSubmit={addAsset}><label>Tên thiết bị<input name="name" required/></label><label>Model<input name="model" required/></label><label>Serial number<input name="serial" required/></label><label>Người sử dụng<input name="owner"/></label><label className="full">Hết hạn bảo hành<input name="warranty" type="date" required/></label><div className="modal-actions full"><button type="button" className="ghost" onClick={() => setAssetOpen(false)}>Hủy</button><button className="primary">Lưu thiết bị</button></div></form></Modal>}
    {selected && <Modal title={`Ticket #${selected.id}`} onClose={() => setSelected(null)}><div className="ticket-detail"><span className={`priority ${selected.priority.toLowerCase()}`}>{selected.priority}</span><h3>{selected.title}</h3><p>{selected.category} / {selected.requester} / {selected.assignee}</p><div className="detail-fields"><label>Trạng thái<select value={selected.status} onChange={e => updateStatus(selected, e.target.value as Status)}><option>Open</option><option>In Progress</option><option>Resolved</option></select></label>{role==="Admin"&&<label>Kỹ thuật viên<select value={selected.assignee} onChange={e=>assign(selected,e.target.value)}><option>Chưa phân công</option><option>Thiện Phong</option><option>Thanh Ngân</option><option>Đức Huy</option></select></label>}</div>{selected.aiSummary&&<div className="summary"><strong>AI incident summary</strong><p>{selected.aiSummary}</p></div>}<h4>Lịch sử xử lý</h4>{selected.history.map((h, i) => <div className="history-item" key={`${h}-${i}`}><CheckCircle size={17}/>{h}</div>)}</div></Modal>}
    {toast && <div className="toast"><CheckCircle size={19} weight="fill"/>{toast}</div>}
  </div>;
}

function Dashboard({ stats, tickets, assets, onTicket, onSelect }: { stats: Record<string, number>; tickets: TicketItem[]; assets: Asset[]; onTicket: () => void; onSelect: (ticket: TicketItem) => void }) {
  return <><section className="welcome"><div><p className="eyebrow">SERVICE HEALTH</p><h2>Hôm nay cần xử lý gì?</h2><p>Ưu tiên ticket ảnh hưởng công việc và thiết bị sắp hết bảo hành.</p></div><button className="primary" onClick={onTicket}><Plus size={18} weight="bold"/>Tạo ticket</button></section><section className="metric-grid"><Metric label="Ticket đang mở" value={stats.open} icon={<Ticket/>}/><Metric label="Ưu tiên cao" value={stats.critical} icon={<Warning/>}/><Metric label="Thiết bị đang dùng" value={stats.activeAssets} icon={<Cpu/>}/><Metric label="Sắp hết bảo hành" value={stats.expiring} icon={<ArchiveBox/>}/></section><div className="split"><section className="panel"><div className="panel-head"><h3>Ticket gần đây</h3><span>{tickets.length} tổng cộng</span></div>{tickets.slice(0,4).map(t => <button className="ticket-row" key={t.id} onClick={() => onSelect(t)}><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span><div><strong>{t.title}</strong><small>#{t.id} / {t.requester}</small></div><span className="status">{t.status}</span></button>)}</section><section className="panel"><div className="panel-head"><h3>Tình trạng thiết bị</h3><span>Cập nhật hôm nay</span></div><div className="donut-row"><div className="donut" style={{"--value": `${Math.round(assets.filter(a => a.status === "In use").length / assets.length * 100)}%`} as React.CSSProperties}><b>{assets.length}</b><small>thiết bị</small></div><div className="legend"><span><i className="use"/>Đang dùng <b>{assets.filter(a => a.status === "In use").length}</b></span><span><i/>Sẵn sàng <b>{assets.filter(a => a.status === "Available").length}</b></span><span><i className="repair"/>Sửa chữa <b>{assets.filter(a => a.status === "Repair").length}</b></span></div></div></section></div></>;
}
function Metric({label, value, icon}:{label:string;value:number;icon:React.ReactNode}) { return <article className="metric"><span>{icon}</span><strong>{value}</strong><small>{label}</small></article>; }
function Tickets({tickets,onCreate,onSelect}:{tickets:TicketItem[];onCreate:()=>void;onSelect:(t:TicketItem)=>void}) { const [q,setQ]=useState(""); const shown=tickets.filter(t=>t.title.toLowerCase().includes(q.toLowerCase())); return <section className="panel page-panel"><div className="toolbar"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm theo tiêu đề..."/><button className="primary" onClick={onCreate}><Plus size={18}/>Tạo ticket</button></div><div className="table"><div className="table-head"><span>ID</span><span>Yêu cầu</span><span>Ưu tiên</span><span>Trạng thái</span><span>Phụ trách</span></div>{shown.length ? shown.map(t=><button className="table-row" key={t.id} onClick={()=>onSelect(t)}><span>#{t.id}</span><span><strong>{t.title}</strong><small>{t.requester} / {t.category}</small></span><span><i className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</i></span><span>{t.status}</span><span>{t.assignee}</span></button>):<div className="empty"><Ticket size={38}/><h3>Không tìm thấy ticket</h3><p>Thử một từ khóa khác hoặc tạo ticket mới.</p></div>}</div></section>; }
function Assets({assets,admin,onCreate,onUpdate}:{assets:Asset[];admin:boolean;onCreate:()=>void;onUpdate:(a:Asset)=>void}) { return <section className="panel page-panel"><div className="toolbar"><div><h2>Danh mục thiết bị</h2><p>Model, serial, người sử dụng và bảo hành.</p></div>{admin&&<button className="primary" onClick={onCreate}><Plus size={18}/>Thêm thiết bị</button>}</div><div className="asset-grid">{assets.map(a=><article className="asset" key={a.id}><Cpu size={28}/>{admin?<select className="asset-status editable" value={a.status} onChange={e=>onUpdate({...a,status:e.target.value as Asset["status"]})}><option>In use</option><option>Available</option><option>Repair</option></select>:<span className={`asset-status ${a.status.replace(" ","").toLowerCase()}`}>{a.status}</span>}<h3>{a.name}</h3><p>{a.model}</p><dl><div><dt>Serial</dt><dd>{a.serial}</dd></div><div><dt>Người dùng</dt><dd>{admin?<input value={a.owner} aria-label={`Người dùng ${a.name}`} onChange={e=>onUpdate({...a,owner:e.target.value})}/>:a.owner}</dd></div><div><dt>Bảo hành</dt><dd>{admin?<input type="date" value={a.warranty} aria-label={`Bảo hành ${a.name}`} onChange={e=>onUpdate({...a,warranty:e.target.value})}/>:new Date(a.warranty).toLocaleDateString("vi-VN")}</dd></div></dl></article>)}</div></section>; }
function AIAssistant({tickets}:{tickets:TicketItem[]}) { const [issue,setIssue]=useState(""); const [answer,setAnswer]=useState(""); function generate(){const category=/wifi|vpn|mạng|internet/i.test(issue)?"Network":/mật khẩu|đăng nhập|account/i.test(issue)?"Account":"Software";setAnswer(`Phân loại đề xuất: ${category}\n\n1. Xác nhận phạm vi ảnh hưởng và thời điểm bắt đầu.\n2. Thu thập thông báo lỗi, phiên bản và log liên quan.\n3. Thử lại bằng cấu hình đã xác minh an toàn.\n4. Nếu chưa xử lý được, chuyển cấp kèm bằng chứng đã thu thập.\n\nPhản hồi gợi ý: Đội IT đã ghi nhận sự cố và đang kiểm tra. Chúng tôi sẽ cập nhật ngay khi có kết quả.`)} return <section className="ai-layout"><div><p className="eyebrow">AI COPILOT</p><h2>Chuẩn hóa phản hồi kỹ thuật</h2><p>Dùng AI API ở production hoặc quy tắc cục bộ trong bản demo.</p><div className="ai-context"><Lightning size={24}/><span>{tickets.filter(t=>t.status!=="Resolved").length} ticket đang mở để tham chiếu</span></div></div><div className="panel ai-panel"><label>Mô tả sự cố<textarea value={issue} onChange={e=>setIssue(e.target.value)} placeholder="Nhập triệu chứng, phạm vi ảnh hưởng và lỗi đã thấy..."/></label><button className="primary" onClick={generate} disabled={issue.trim().length<8}>Tạo phương án xử lý</button>{answer&&<pre>{answer}</pre>}</div></section>; }
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="Đóng">×</button></div>{children}</section></div>; }
