#!/usr/bin/env bash
set -euo pipefail

archive="/tmp/server-operations-console.tar.gz"
release="/opt/server-ops/releases/$(date +%Y%m%d%H%M%S)"
install -d -o phong -g phong /opt/server-ops/releases /opt/server-ops/workspace
mkdir -p "$release"
tar -xzf "$archive" -C "$release"
chown -R phong:phong "$release"

cd "$release"
sudo -u phong npm ci --omit=dev --no-audit --no-fund
ln -sfn "$release" /opt/server-ops/app

install -o root -g root -m 0750 "$release/deploy/server-ops-helper.py" /usr/local/sbin/server-ops-helper
install -o root -g root -m 0440 "$release/deploy/server-ops-console.sudoers" /etc/sudoers.d/server-ops-console
visudo -cf /etc/sudoers.d/server-ops-console >/dev/null

if [[ ! -f /etc/server-ops-console.env ]]; then
  admin_password="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  session_secret="$(openssl rand -hex 48)"
  printf 'NODE_ENV=production\nPORT=8090\nADMIN_PASSWORD=%s\nSESSION_SECRET=%s\n' "$admin_password" "$session_secret" > /etc/server-ops-console.env
  chmod 0600 /etc/server-ops-console.env
  echo "INITIAL_ADMIN_PASSWORD=$admin_password"
else
  echo "INITIAL_ADMIN_PASSWORD=unchanged"
fi

install -o root -g root -m 0644 "$release/deploy/server-ops-console.service" /etc/systemd/system/server-ops-console.service
install -o root -g root -m 0644 "$release/deploy/nginx-ops.conf" /etc/nginx/snippets/server-ops.conf

if ! grep -q 'include /etc/nginx/snippets/server-ops.conf;' /etc/nginx/sites-available/default; then
  cp /etc/nginx/sites-available/default "/etc/nginx/sites-available/default.bak-$(date +%Y%m%d%H%M%S)"
  python3 - <<'PY'
from pathlib import Path
p=Path('/etc/nginx/sites-available/default')
s=p.read_text()
needle='    listen 443 ssl;'
if needle not in s:
    raise SystemExit('Không tìm thấy server HTTPS trong Nginx')
s=s.replace(needle,'    include /etc/nginx/snippets/server-ops.conf;\n\n'+needle,1)
p.write_text(s)
PY
fi

nginx -t
systemctl daemon-reload
systemctl enable --now server-ops-console.service
systemctl restart server-ops-console.service
systemctl reload nginx
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8090/ops/api/health; then break; fi
  if [[ "$attempt" == "30" ]]; then journalctl -u server-ops-console.service -n 60 --no-pager; exit 1; fi
  sleep 1
done
echo
systemctl --no-pager --full status server-ops-console.service | sed -n '1,14p'
