# AI IT Support Assistant

## Chạy ứng dụng

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

Không có `OPENAI_API_KEY`, ứng dụng vẫn chạy bằng bộ máy gợi ý cục bộ. Dữ liệu được lưu tại `data/incidents.db`.

