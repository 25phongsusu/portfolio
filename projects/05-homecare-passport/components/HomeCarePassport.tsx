"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarCheck, CaretRight, Check, CheckCircle, ClockCountdown, CurrencyDollar,
  HouseLine, ImageSquare, Lightbulb, MagnifyingGlass, Plus, Receipt, ShieldCheck,
  Toolbox, UploadSimple, WashingMachine, Wrench, X
} from "@phosphor-icons/react";

type View = "dashboard" | "items" | "schedule" | "expenses" | "assistant";
type ItemStatus = "Đang sử dụng" | "Cần chú ý" | "Đang sửa";
type TaskStatus = "Sắp tới" | "Hoàn thành" | "Quá hạn";
type HomeItem = {
  id: number; name: string; category: string; brand: string; model: string; serial: string;
  location: string; purchaseDate: string; warrantyEnd: string; value: number; status: ItemStatus;
  receipt?: string;
};
type CareTask = { id: number; itemId: number; title: string; due: string; frequency: string; status: TaskStatus };
type Repair = { id: number; itemId: number; date: string; provider: string; cost: number; notes: string };

const TODAY = new Date("2026-09-15T00:00:00");
const FOOTER = "Đây là app Demo được thực hiện bởi Phạm Đoàn Thiện Phong";
const itemSeed: HomeItem[] = [
  { id: 11, name: "Máy lạnh phòng ngủ", category: "Điện lạnh", brand: "Daikin", model: "FTKB35", serial: "DK-35-8421", location: "Phòng ngủ", purchaseDate: "2025-04-12", warrantyEnd: "2027-04-12", value: 12490000, status: "Đang sử dụng" },
  { id: 12, name: "Máy giặt cửa trước", category: "Gia dụng", brand: "Electrolux", model: "EWF1024", serial: "EL-1024-771", location: "Khu giặt", purchaseDate: "2024-11-08", warrantyEnd: "2026-11-08", value: 9690000, status: "Cần chú ý" },
  { id: 13, name: "Laptop cá nhân", category: "Điện tử", brand: "Lenovo", model: "ThinkPad T14", serial: "PF-4K29-18", location: "Phòng làm việc", purchaseDate: "2025-08-20", warrantyEnd: "2028-08-20", value: 28750000, status: "Đang sử dụng" },
  { id: 14, name: "Máy lọc nước", category: "Nhà bếp", brand: "Karofi", model: "KAQ-U95", serial: "KF-U95-032", location: "Bếp", purchaseDate: "2024-01-16", warrantyEnd: "2026-01-16", value: 7890000, status: "Đang sửa" }
];
const taskSeed: CareTask[] = [
  { id: 101, itemId: 12, title: "Vệ sinh lồng giặt", due: "2026-09-20", frequency: "3 tháng", status: "Sắp tới" },
  { id: 102, itemId: 11, title: "Vệ sinh lưới lọc", due: "2026-09-18", frequency: "1 tháng", status: "Sắp tới" },
  { id: 103, itemId: 14, title: "Thay lõi lọc số 1", due: "2026-09-08", frequency: "6 tháng", status: "Quá hạn" },
  { id: 104, itemId: 13, title: "Vệ sinh quạt tản nhiệt", due: "2026-08-25", frequency: "6 tháng", status: "Hoàn thành" }
];
const repairSeed: Repair[] = [
  { id: 201, itemId: 14, date: "2026-09-10", provider: "Kỹ thuật Karofi", cost: 650000, notes: "Thay van áp cao" },
  { id: 202, itemId: 11, date: "2026-06-18", provider: "Điện lạnh Minh Tâm", cost: 450000, notes: "Vệ sinh dàn lạnh" }
];

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "") as T; } catch { return fallback; }
}
function money(value: number) { return new Intl.NumberFormat("vi-VN").format(value) + " ₫"; }
function daysUntil(date: string) { return Math.ceil((new Date(`${date}T00:00:00`).getTime() - TODAY.getTime()) / 86_400_000); }
function nextId(values: { id: number }[], floor: number) { return Math.max(floor, ...values.map(value => value.id)) + 1; }
function readFile(file: File | undefined, done: (data: string) => void) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => done(String(reader.result));
  reader.readAsDataURL(file);
}

export default function HomeCarePassport() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [items, setItems] = useState<HomeItem[]>(itemSeed);
  const [tasks, setTasks] = useState<CareTask[]>(taskSeed);
  const [repairs, setRepairs] = useState<Repair[]>(repairSeed);
  const [itemModal, setItemModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [repairModal, setRepairModal] = useState(false);
  const [selected, setSelected] = useState<HomeItem | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setItems(load("homecare-items", itemSeed));
    setTasks(load("homecare-tasks", taskSeed));
    setRepairs(load("homecare-repairs", repairSeed));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("homecare-items", JSON.stringify(items)); }, [items, ready]);
  useEffect(() => { if (ready) localStorage.setItem("homecare-tasks", JSON.stringify(tasks)); }, [tasks, ready]);
  useEffect(() => { if (ready) localStorage.setItem("homecare-repairs", JSON.stringify(repairs)); }, [repairs, ready]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 2400); return () => clearTimeout(timer); }, [toast]);

  const stats = useMemo(() => ({
    items: items.length,
    warranty: items.filter(item => daysUntil(item.warrantyEnd) >= 0 && daysUntil(item.warrantyEnd) <= 90).length,
    due: tasks.filter(task => task.status !== "Hoàn thành" && daysUntil(task.due) <= 14).length,
    spend: repairs.reduce((sum, repair) => sum + repair.cost, 0)
  }), [items, tasks, repairs]);

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("receipt") as File;
    const create = (receipt?: string) => {
      const item: HomeItem = {
        id: nextId(items, 10), name: String(form.get("name")), category: String(form.get("category")),
        brand: String(form.get("brand")), model: String(form.get("model")), serial: String(form.get("serial")),
        location: String(form.get("location")), purchaseDate: String(form.get("purchaseDate")),
        warrantyEnd: String(form.get("warrantyEnd")), value: Number(form.get("value")), status: "Đang sử dụng", receipt
      };
      setItems(current => [item, ...current]); setItemModal(false); setToast("Đã thêm đồ dùng vào hồ sơ");
    };
    file?.size ? readFile(file, data => create(data)) : create();
  }
  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const due = String(form.get("due"));
    const task: CareTask = { id: nextId(tasks, 100), itemId: Number(form.get("itemId")), title: String(form.get("title")), due, frequency: String(form.get("frequency")), status: daysUntil(due) < 0 ? "Quá hạn" : "Sắp tới" };
    setTasks(current => [task, ...current]); setTaskModal(false); setToast("Đã tạo lịch chăm sóc");
  }
  function addRepair(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const repair: Repair = { id: nextId(repairs, 200), itemId: Number(form.get("itemId")), date: String(form.get("date")), provider: String(form.get("provider")), cost: Number(form.get("cost")), notes: String(form.get("notes")) };
    setRepairs(current => [repair, ...current]); setRepairModal(false); setToast("Đã ghi nhận lần sửa chữa");
  }
  function completeTask(task: CareTask) {
    setTasks(current => current.map(value => value.id === task.id ? { ...value, status: "Hoàn thành" } : value));
    setToast("Đã hoàn thành công việc");
  }

  if (!ready) return <div className="loading" aria-label="Đang tải"><span/><span/><span/></div>;
  const nav = [
    { id: "dashboard" as View, label: "Tổng quan", icon: HouseLine },
    { id: "items" as View, label: "Đồ dùng", icon: WashingMachine },
    { id: "schedule" as View, label: "Lịch chăm sóc", icon: CalendarCheck },
    { id: "expenses" as View, label: "Sửa chữa", icon: Receipt },
    { id: "assistant" as View, label: "Smart Assistant", icon: Lightbulb }
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span><ShieldCheck size={24} weight="fill"/></span><div>HomeCare<small>Passport</small></div></div>
      <nav>{nav.map(entry => <button key={entry.id} className={view === entry.id ? "active" : ""} onClick={() => setView(entry.id)}><entry.icon size={20}/><span>{entry.label}</span></button>)}</nav>
      <div className="home-note"><HouseLine size={22}/><p><strong>Nhà của Phong</strong><span>{items.length} đồ dùng đang theo dõi</span></p></div>
    </aside>
    <main className="workspace">
      <header><div><p>HỒ SƠ GIA ĐÌNH</p><h1>{nav.find(entry => entry.id === view)?.label}</h1></div><button className="primary" onClick={() => setItemModal(true)}><Plus size={18} weight="bold"/>Thêm đồ dùng</button></header>
      {view === "dashboard" && <Dashboard stats={stats} items={items} tasks={tasks} select={setSelected} openTask={() => setTaskModal(true)}/>}
      {view === "items" && <Items items={items} select={setSelected} create={() => setItemModal(true)}/>}
      {view === "schedule" && <Schedule tasks={tasks} items={items} complete={completeTask} create={() => setTaskModal(true)}/>}
      {view === "expenses" && <Expenses repairs={repairs} items={items} create={() => setRepairModal(true)}/>}
      {view === "assistant" && <SmartAssistant/>}
      <footer>{FOOTER}</footer>
    </main>
    <nav className="mobile-nav" aria-label="Điều hướng chính">{nav.map(entry => <button key={entry.id} aria-label={entry.label} className={view === entry.id ? "active" : ""} onClick={() => setView(entry.id)}><entry.icon size={21}/><span>{entry.label === "Smart Assistant" ? "Trợ lý" : entry.label}</span></button>)}</nav>
    {selected && <ItemDrawer item={selected} repairs={repairs.filter(repair => repair.itemId === selected.id)} tasks={tasks.filter(task => task.itemId === selected.id)} close={() => setSelected(null)} update={next => { setItems(current => current.map(item => item.id === next.id ? next : item)); setSelected(next); setToast("Đã cập nhật hồ sơ"); }}/>} 
    {itemModal && <Modal title="Thêm đồ dùng" close={() => setItemModal(false)}><ItemForm submit={addItem}/></Modal>}
    {taskModal && <Modal title="Tạo lịch chăm sóc" close={() => setTaskModal(false)}><TaskForm items={items} submit={addTask}/></Modal>}
    {repairModal && <Modal title="Ghi nhận sửa chữa" close={() => setRepairModal(false)}><RepairForm items={items} submit={addRepair}/></Modal>}
    {toast && <div className="toast"><CheckCircle size={19} weight="fill"/>{toast}</div>}
  </div>;
}

function Dashboard({ stats, items, tasks, select, openTask }: { stats: Record<string, number>; items: HomeItem[]; tasks: CareTask[]; select: (item: HomeItem) => void; openTask: () => void }) {
  const urgent = tasks.filter(task => task.status !== "Hoàn thành").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  return <>
    <section className="welcome"><div><span>HOMECARE PASSPORT</span><h2>Mọi đồ dùng đều có một câu chuyện.</h2><p>Giữ hóa đơn, bảo hành và lịch chăm sóc ở một nơi dễ nhớ.</p></div><div className="passport-mark"><ShieldCheck size={38} weight="duotone"/><b>{items.length}</b><small>hồ sơ an toàn</small></div></section>
    <section className="metrics"><Metric icon={<WashingMachine/>} value={stats.items} label="Đồ dùng"/><Metric icon={<ShieldCheck/>} value={stats.warranty} label="Sắp hết bảo hành"/><Metric icon={<ClockCountdown/>} value={stats.due} label="Việc cần làm"/><Metric icon={<CurrencyDollar/>} value={money(stats.spend)} label="Chi phí sửa chữa" wide/></section>
    <section className="dashboard-grid"><div className="panel"><div className="panel-head"><div><h3>Việc cần ưu tiên</h3><p>Trong 14 ngày tới và công việc quá hạn</p></div><button onClick={openTask}><Plus size={17}/>Tạo lịch</button></div>{urgent.map(task => <TaskRow key={task.id} task={task} item={items.find(item => item.id === task.itemId)}/>)}</div><div className="panel warranty-panel"><div className="panel-head"><div><h3>Hồ sơ gần đây</h3><p>Thông tin bảo hành nhanh</p></div></div>{items.slice(0, 3).map(item => <button className="mini-item" key={item.id} onClick={() => select(item)}><span><WashingMachine size={21}/></span><div><strong>{item.name}</strong><small>{item.brand} / {item.location}</small></div><b>{daysUntil(item.warrantyEnd) < 0 ? "Hết hạn" : `${daysUntil(item.warrantyEnd)} ngày`}</b><CaretRight size={17}/></button>)}</div></section>
  </>;
}
function Metric({ icon, value, label, wide = false }: { icon: React.ReactNode; value: number | string; label: string; wide?: boolean }) { return <article className={wide ? "metric wide" : "metric"}><span>{icon}</span><strong>{value}</strong><small>{label}</small></article>; }

function Items({ items, select, create }: { items: HomeItem[]; select: (item: HomeItem) => void; create: () => void }) {
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Tất cả");
  const categories = ["Tất cả", ...Array.from(new Set(items.map(item => item.category)))];
  const shown = items.filter(item => (category === "Tất cả" || item.category === category) && `${item.name} ${item.brand} ${item.model}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="page"><div className="toolbar"><label className="search"><MagnifyingGlass size={18}/><input aria-label="Tìm đồ dùng" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên, hãng hoặc model"/></label><select aria-label="Lọc danh mục" value={category} onChange={event => setCategory(event.target.value)}>{categories.map(value => <option key={value}>{value}</option>)}</select><button className="primary" onClick={create}><Plus size={18}/>Thêm đồ dùng</button></div>{shown.length ? <div className="item-grid">{shown.map(item => <button className="item-card" key={item.id} onClick={() => select(item)}><div className="item-card-top"><span><WashingMachine size={27}/></span><i className={item.status.replaceAll(" ", "-").toLowerCase()}>{item.status}</i></div><small>{item.category}</small><h3>{item.name}</h3><p>{item.brand} {item.model}</p><dl><div><dt>Vị trí</dt><dd>{item.location}</dd></div><div><dt>Bảo hành</dt><dd>{new Date(`${item.warrantyEnd}T00:00:00`).toLocaleDateString("vi-VN")}</dd></div></dl></button>)}</div> : <Empty icon={<MagnifyingGlass/>} title="Không tìm thấy đồ dùng" text="Thử từ khóa hoặc danh mục khác."/>}</section>;
}

function Schedule({ tasks, items, complete, create }: { tasks: CareTask[]; items: HomeItem[]; complete: (task: CareTask) => void; create: () => void }) {
  const [filter, setFilter] = useState("Tất cả"); const shown = filter === "Tất cả" ? tasks : tasks.filter(task => task.status === filter);
  return <section className="page panel schedule-page"><div className="toolbar"><div className="filters">{["Tất cả", "Sắp tới", "Quá hạn", "Hoàn thành"].map(value => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>)}</div><button className="primary" onClick={create}><Plus size={18}/>Tạo lịch</button></div><div className="task-list">{shown.map(task => <TaskRow key={task.id} task={task} item={items.find(item => item.id === task.itemId)} complete={task.status !== "Hoàn thành" ? () => complete(task) : undefined}/>)}</div></section>;
}
function TaskRow({ task, item, complete }: { task: CareTask; item?: HomeItem; complete?: () => void }) { return <article className="task-row"><div className={`date-card ${task.status === "Quá hạn" ? "overdue" : ""}`}><b>{new Date(`${task.due}T00:00:00`).getDate()}</b><span>TH {new Date(`${task.due}T00:00:00`).getMonth() + 1}</span></div><div><strong>{task.title}</strong><small>{item?.name} / mỗi {task.frequency}</small></div><span className={`task-status ${task.status.replaceAll(" ", "-").toLowerCase()}`}>{task.status}</span>{complete ? <button className="complete" aria-label={`Hoàn thành ${task.title}`} onClick={complete}><Check size={17}/>Hoàn thành</button> : <CheckCircle className="done-icon" size={21} weight="fill"/>}</article>; }

function Expenses({ repairs, items, create }: { repairs: Repair[]; items: HomeItem[]; create: () => void }) {
  const total = repairs.reduce((sum, repair) => sum + repair.cost, 0);
  return <section className="page"><div className="expense-summary"><div><p>TỔNG CHI PHÍ ĐÃ GHI NHẬN</p><h2>{money(total)}</h2><span>{repairs.length} lần sửa chữa và bảo dưỡng</span></div><button className="primary" onClick={create}><Plus size={18}/>Thêm chi phí</button></div><div className="panel repair-list"><div className="repair-head"><span>Ngày</span><span>Đồ dùng và nội dung</span><span>Đơn vị</span><span>Chi phí</span></div>{repairs.map(repair => <article className="repair-row" key={repair.id}><time>{new Date(`${repair.date}T00:00:00`).toLocaleDateString("vi-VN")}</time><div><strong>{items.find(item => item.id === repair.itemId)?.name}</strong><small>{repair.notes}</small></div><span>{repair.provider}</span><b>{money(repair.cost)}</b></article>)}</div></section>;
}

function SmartAssistant() {
  const [category, setCategory] = useState("Điện lạnh"); const [symptom, setSymptom] = useState(""); const [result, setResult] = useState<string[]>([]);
  const playbooks: Record<string, string[]> = {
    "Điện lạnh": ["Tắt nguồn thiết bị trong 5 phút rồi khởi động lại.", "Vệ sinh lưới lọc và kiểm tra luồng gió.", "Kiểm tra mã lỗi trên màn hình hoặc đèn báo.", "Nếu có mùi khét hoặc tiếng động lạ, ngắt nguồn và gọi kỹ thuật viên."],
    "Gia dụng": ["Kiểm tra nguồn điện, ổ cắm và cửa thiết bị đã đóng kín.", "Kiểm tra đường cấp, thoát nước và bộ lọc.", "Thử chương trình ngắn khi thiết bị không tải.", "Ngừng sử dụng nếu rò điện, rò nước hoặc có mùi bất thường."],
    "Điện tử": ["Sao lưu dữ liệu quan trọng trước khi xử lý.", "Khởi động lại và ghi nhận thông báo lỗi.", "Kiểm tra bộ sạc, cáp và nhiệt độ thiết bị.", "Không tự tháo thiết bị nếu còn bảo hành."],
    "Nhà bếp": ["Khóa nguồn nước hoặc gas trước khi kiểm tra.", "Kiểm tra bộ lọc, gioăng và vị trí kết nối.", "Đối chiếu chu kỳ thay lõi hoặc vệ sinh trong hướng dẫn sử dụng.", "Liên hệ dịch vụ nếu có rò rỉ hoặc chất lượng nước bất thường."]
  };
  function suggest() { if (symptom.trim().length < 8) return; setResult(playbooks[category]); }
  return <section className="assistant-layout"><div><span>SMART ASSISTANT</span><h2>Kiểm tra an toàn trước khi gọi thợ.</h2><p>Trợ lý sử dụng playbook cục bộ. Không gửi mô tả hoặc dữ liệu thiết bị ra ngoài.</p><div className="privacy-note"><ShieldCheck size={24} weight="duotone"/><div><strong>Riêng tư theo thiết kế</strong><small>Hoạt động hoàn toàn trong trình duyệt</small></div></div></div><div className="panel assistant-panel"><label>Loại thiết bị<select value={category} onChange={event => { setCategory(event.target.value); setResult([]); }}>{Object.keys(playbooks).map(value => <option key={value}>{value}</option>)}</select></label><label>Mô tả hiện tượng<textarea value={symptom} onChange={event => setSymptom(event.target.value)} placeholder="Ví dụ: máy lạnh chạy nhưng không mát và có tiếng kêu nhỏ"/></label><button className="primary" onClick={suggest} disabled={symptom.trim().length < 8}><Lightbulb size={18}/>Xem hướng dẫn an toàn</button>{result.length > 0 && <div className="playbook"><h3>Playbook đề xuất</h3>{result.map((step, index) => <div key={step}><span>{index + 1}</span><p>{step}</p></div>)}</div>}</div></section>;
}

function ItemDrawer({ item, repairs, tasks, close, update }: { item: HomeItem; repairs: Repair[]; tasks: CareTask[]; close: () => void; update: (item: HomeItem) => void }) {
  return <div className="backdrop" onMouseDown={close}><aside className="drawer" onMouseDown={event => event.stopPropagation()}><div className="drawer-head"><div><span>HỒ SƠ #{item.id}</span><h2>{item.name}</h2><p>{item.brand} {item.model}</p></div><button aria-label="Đóng" onClick={close}><X size={19}/></button></div><div className="passport"><ShieldCheck size={34} weight="duotone"/><div><small>Serial number</small><strong>{item.serial}</strong></div><i>{item.status}</i></div><section className="detail-grid"><div><span>Danh mục</span><strong>{item.category}</strong></div><div><span>Vị trí</span><strong>{item.location}</strong></div><div><span>Ngày mua</span><strong>{new Date(`${item.purchaseDate}T00:00:00`).toLocaleDateString("vi-VN")}</strong></div><div><span>Giá trị</span><strong>{money(item.value)}</strong></div></section><label className="drawer-label">Trạng thái<select value={item.status} onChange={event => update({ ...item, status: event.target.value as ItemStatus })}><option>Đang sử dụng</option><option>Cần chú ý</option><option>Đang sửa</option></select></label><section><h3>Hóa đơn bảo hành</h3>{item.receipt ? <img className="receipt-preview" src={item.receipt} alt={`Hóa đơn ${item.name}`}/> : <div className="no-receipt"><ImageSquare size={26}/><span>Chưa có ảnh hóa đơn</span></div>}</section><section><h3>Lịch sử nhanh</h3><div className="history-counts"><div><b>{tasks.length}</b><span>Lịch chăm sóc</span></div><div><b>{repairs.length}</b><span>Lần sửa chữa</span></div><div><b>{money(repairs.reduce((sum, value) => sum + value.cost, 0))}</b><span>Tổng chi phí</span></div></div></section></aside></div>;
}

function ItemForm({ submit }: { submit: (event: FormEvent<HTMLFormElement>) => void }) { return <form className="form" onSubmit={submit}><label className="full">Tên đồ dùng<input name="name" required placeholder="Máy lọc không khí phòng khách"/></label><label>Danh mục<select name="category"><option>Điện lạnh</option><option>Gia dụng</option><option>Điện tử</option><option>Nhà bếp</option><option>Khác</option></select></label><label>Vị trí<input name="location" required placeholder="Phòng khách"/></label><label>Thương hiệu<input name="brand" required/></label><label>Model<input name="model" required/></label><label className="full">Serial number<input name="serial" required/></label><label>Ngày mua<input name="purchaseDate" type="date" required/></label><label>Hết hạn bảo hành<input name="warrantyEnd" type="date" required/></label><label>Giá trị (VNĐ)<input name="value" type="number" min="0" required/></label><label className="upload-label">Ảnh hóa đơn<input name="receipt" type="file" accept="image/*"/><span><UploadSimple size={19}/>Chọn ảnh</span></label><div className="form-actions full"><button type="submit" className="primary">Lưu hồ sơ</button></div></form>; }
function TaskForm({ items, submit }: { items: HomeItem[]; submit: (event: FormEvent<HTMLFormElement>) => void }) { return <form className="form" onSubmit={submit}><label className="full">Công việc<input name="title" required placeholder="Vệ sinh bộ lọc"/></label><label>Đồ dùng<select name="itemId">{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ngày thực hiện<input name="due" type="date" required/></label><label className="full">Tần suất<select name="frequency"><option>1 tháng</option><option>3 tháng</option><option>6 tháng</option><option>1 năm</option><option>Một lần</option></select></label><div className="form-actions full"><button type="submit" className="primary">Tạo lịch</button></div></form>; }
function RepairForm({ items, submit }: { items: HomeItem[]; submit: (event: FormEvent<HTMLFormElement>) => void }) { return <form className="form" onSubmit={submit}><label className="full">Đồ dùng<select name="itemId">{items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Ngày sửa chữa<input name="date" type="date" required/></label><label>Chi phí (VNĐ)<input name="cost" type="number" min="0" required/></label><label className="full">Đơn vị thực hiện<input name="provider" required/></label><label className="full">Nội dung<textarea name="notes" required placeholder="Linh kiện đã thay và công việc đã thực hiện"/></label><div className="form-actions full"><button type="submit" className="primary">Lưu chi phí</button></div></form>; }
function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="backdrop modal-backdrop" onMouseDown={close}><section className="modal" onMouseDown={event => event.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button aria-label="Đóng" onClick={close}><X size={19}/></button></div>{children}</section></div>; }
function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="empty">{icon}<h3>{title}</h3><p>{text}</p></div>; }
