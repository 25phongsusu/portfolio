# AI-Powered IT Service Hub

## Chạy local

```powershell
npm install
npm run dev
```

Mở `http://localhost:3000`. Nếu chưa có biến môi trường Supabase, app tự chạy chế độ demo và lưu dữ liệu bằng localStorage.

## Kết nối Supabase

1. Tạo project Supabase.
2. Chạy `supabase/schema.sql` trong SQL Editor.
3. Copy `.env.example` thành `.env.local` và điền URL cùng anon key.
4. Bật Email Auth trong Supabase.

Schema đã bật RLS cho Employee và Admin. Bản UI demo mô phỏng hai role để kiểm tra nhanh workflow.
