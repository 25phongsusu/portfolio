# Server Operations Console

Dashboard quản trị VPS cho portfolio: theo dõi CPU, RAM, disk, network; xem file và log; điều khiển service; quản lý firewall; kiểm tra cập nhật hệ thống.

Giao diện công khai ở chế độ chỉ đọc. Các endpoint nhạy cảm yêu cầu session quản trị. Quyền root được giới hạn qua `/usr/local/sbin/server-ops-helper` và sudoers allowlist.

## Local

```bash
npm install
npm run build
PORT=8090 ADMIN_PASSWORD=... SESSION_SECRET=... npm start
```
