# Smart IT Support Assistant

## Chạy ứng dụng

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

Ứng dụng sử dụng playbook cục bộ và không gọi dịch vụ xử lý bên ngoài. Dữ liệu được lưu tại `data/incidents.db`.
