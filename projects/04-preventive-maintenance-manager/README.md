# Preventive Maintenance Manager

## Chạy local

```powershell
npm install
npm run dev
```

Mặc định chạy tại `http://localhost:3001`. Dữ liệu demo được lưu trong localStorage.

## Kết nối Supabase

1. Chạy `supabase/schema.sql` trong SQL Editor.
2. Copy `.env.example` thành `.env.local` và điền thông tin project.
3. Tạo policy Storage chi tiết theo mô hình người dùng của doanh nghiệp trước khi production.

Ảnh demo được lưu dạng data URL trong localStorage. Bản production nên upload vào bucket `maintenance-photos`.
