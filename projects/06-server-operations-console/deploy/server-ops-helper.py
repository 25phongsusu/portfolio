#!/usr/bin/env python3
import base64, datetime, ipaddress, json, os, pathlib, pwd, re, shutil, subprocess, sys, tempfile

ROOTS={"workspace":pathlib.Path("/opt/server-ops/workspace"),"nginx":pathlib.Path("/etc/nginx/sites-available"),"webroot":pathlib.Path("/var/www/html")}
SERVICES={"nginx","docker","mosquitto","xiaozhi-ws","server-ops-console"}
PROTECTED_USERS={"root","ubuntu","phong","g25phongsusu"}
def run(args,timeout=90):
    p=subprocess.run(args,text=True,capture_output=True,timeout=timeout)
    if p.returncode: raise ValueError((p.stderr or p.stdout).strip() or "Lệnh thất bại")
    return p.stdout
def payload():
    try:return json.loads(sys.stdin.read() or "{}")
    except:raise ValueError("Dữ liệu không hợp lệ")
def target(data,existing=False):
    root=data.get("root",""); rel=str(data.get("path","")).strip("/")
    if root not in ROOTS:raise ValueError("Root không hợp lệ")
    base=ROOTS[root].resolve(); candidate=base.joinpath(rel)
    resolved=candidate.resolve(strict=existing)
    if resolved!=base and base not in resolved.parents:raise ValueError("Đường dẫn nằm ngoài phạm vi")
    return resolved
def output(value):print(json.dumps(value,ensure_ascii=False))
def main():
    action=sys.argv[1] if len(sys.argv)>1 else ""; data=payload()
    if action=="service":
        name=data.get("name"); op=data.get("operation")
        if name not in SERVICES or op not in {"start","stop","restart"}:raise ValueError("Thao tác dịch vụ không hợp lệ")
        if name=="server-ops-console" and op=="stop":raise ValueError("Không thể tự dừng dashboard")
        run(["systemctl",op,f"{name}.service"]);output({"ok":True});return
    if action=="file-list":
        folder=target(data,True)
        if not folder.is_dir():raise ValueError("Không phải thư mục")
        items=[]
        for x in sorted(folder.iterdir(),key=lambda x:(not x.is_dir(),x.name.lower())):
            if x.is_symlink():continue
            st=x.stat();items.append({"name":x.name,"directory":x.is_dir(),"size":st.st_size,"modified":int(st.st_mtime*1000)})
        output({"items":items});return
    if action=="file-read":
        f=target(data,True)
        if not f.is_file() or f.stat().st_size>2_000_000:raise ValueError("File không hợp lệ hoặc quá 2 MB")
        output({"path":str(data.get("path","")),"content":f.read_text(errors="replace")});return
    if action in {"file-write","file-upload"}:
        f=target(data,False)
        if action=="file-upload":
            name=pathlib.Path(str(data.get("name",""))).name
            if not name:raise ValueError("Tên file không hợp lệ")
            f=target({"root":data.get("root"),"path":str(data.get("path","")).strip("/")+"/"+name},False); content=base64.b64decode(data.get("data","") or "",validate=True)
        else:content=str(data.get("content","")).encode()
        if len(content)>2_000_000:raise ValueError("File vượt quá 2 MB")
        f.parent.mkdir(parents=True,exist_ok=True)
        backup=None
        if f.exists():
            backup=str(f)+".bak-"+datetime.datetime.now().strftime("%Y%m%d%H%M%S");shutil.copy2(f,backup)
        fd,tmp=tempfile.mkstemp(dir=f.parent,prefix=".ops-")
        with os.fdopen(fd,"wb") as handle:handle.write(content)
        os.chmod(tmp,0o640);os.replace(tmp,f)
        if data.get("root")=="nginx":
            try:run(["nginx","-t"])
            except Exception:
                if backup:shutil.copy2(backup,f)
                else:f.unlink(missing_ok=True)
                raise
        output({"ok":True});return
    if action=="file-delete":
        f=target(data,True);trash=pathlib.Path("/opt/server-ops/trash");trash.mkdir(parents=True,exist_ok=True)
        destination=trash/(datetime.datetime.now().strftime("%Y%m%d%H%M%S")+"-"+f.name);shutil.move(str(f),destination)
        output({"ok":True,"recoverable":str(destination)});return
    if action=="logs":
        source=data.get("source","system")
        commands={"system":["journalctl","-n","250","--no-pager","-o","short-iso"],"nginx":["tail","-n","250","/var/log/nginx/error.log"],"docker":["journalctl","-u","docker","-n","250","--no-pager","-o","short-iso"],"ssh":["journalctl","-u","ssh","-n","250","--no-pager","-o","short-iso"]}
        if source not in commands:raise ValueError("Nguồn log không hợp lệ")
        output({"text":run(commands[source])});return
    if action=="security":
        op=data.get("action")
        if op in {"port-open","port-close"}:
            port=int(data.get("port",0));proto=data.get("protocol","tcp")
            if port<1024 or port>65535 or proto not in {"tcp","udp"}:raise ValueError("Chỉ quản lý port 1024-65535")
            rule=f"{port}/{proto}";args=["ufw"]+(["delete","allow",rule] if op=="port-close" else ["allow",rule]);run(args)
        elif op in {"ip-block","ip-unblock"}:
            ip=str(ipaddress.ip_address(data.get("ip","")));args=["ufw"]+(["delete","deny","from",ip] if op=="ip-unblock" else ["deny","from",ip]);run(args)
        else:raise ValueError("Thao tác firewall không hợp lệ")
        output({"ok":True});return
    if action=="security-list":
        raw=run(["ufw","status","numbered"]);rules=[x.strip() for x in raw.splitlines() if re.match(r"^\[\s*\d+\]",x.strip())]
        output({"rules":rules});return
    if action=="users":
        users=[]
        for item in pwd.getpwall():
            if 1000<=item.pw_uid<65534:
                state=run(["passwd","-S",item.pw_name]).split()[1]
                users.append({"name":item.pw_name,"uid":item.pw_uid,"shell":item.pw_shell,"locked":state in {"L","LK"},"protected":item.pw_name in PROTECTED_USERS})
        output({"items":users});return
    if action=="user":
        name=str(data.get("name",""));op=data.get("operation")
        try:item=pwd.getpwnam(name)
        except KeyError:raise ValueError("Tài khoản không tồn tại")
        if item.pw_uid<1000 or name in PROTECTED_USERS or op not in {"lock","unlock"}:raise ValueError("Không được phép thay đổi tài khoản này")
        run(["usermod","-L" if op=="lock" else "-U",name]);output({"ok":True});return
    if action=="updates":
        raw=run(["bash","-lc","apt list --upgradable 2>/dev/null | tail -n +2"]);items=[]
        for line in raw.splitlines():
            m=re.match(r"([^/]+)/\S+\s+(\S+)\s+\S+\s+\[upgradable from: ([^\]]+)\]",line)
            if m:items.append({"name":m.group(1),"next":m.group(2),"current":m.group(3)})
        output({"items":items});return
    raise ValueError("Action không hợp lệ")
if __name__=="__main__":
    try:main()
    except Exception as e:print(json.dumps({"error":str(e)},ensure_ascii=False),file=sys.stderr);sys.exit(1)
