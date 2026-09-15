import express from "express";
import compression from "compression";
import helmet from "helmet";
import si from "systeminformation";
import crypto from "node:crypto";
import {spawn} from "node:child_process";
import {readFileSync,existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,"..");
const app=express();
app.set("trust proxy",1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],scriptSrc:["'self'"],imgSrc:["'self'","data:"],connectSrc:["'self'"]}}}));
app.use(compression());
app.use(express.json({limit:"7mb"}));

const port=Number(process.env.PORT||8090);
const password=process.env.ADMIN_PASSWORD||"";
const secret=process.env.SESSION_SECRET||crypto.randomBytes(32).toString("hex");
const sessions=new Map();
const attempts=new Map();
const metrics=[];
let updatesCache={value:0,at:0};
const services=[
  ["nginx","Reverse proxy và HTTPS"],["docker","Container runtime"],["mosquitto","MQTT broker"],["server-ops-console","Dashboard quản trị"]
];
const cookie=(req,name)=>Object.fromEntries((req.headers.cookie||"").split(";").map(x=>x.trim().split("=")).filter(x=>x.length===2))[name];
const sign=value=>crypto.createHmac("sha256",secret).update(value).digest("hex");
const authenticated=req=>{const raw=cookie(req,"ops_session");if(!raw)return false;const[id,sig]=raw.split(".");const session=sessions.get(id),expected=id?sign(id):"";return !!session&&session>Date.now()&&!!sig&&sig.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))};
const protect=(req,res,next)=>authenticated(req)?next():res.status(401).json({error:"Yêu cầu đăng nhập quản trị"});
const sameOrigin=(req,res,next)=>{const origin=req.headers.origin;if(origin&&origin!==`https://${req.headers.host}`&&origin!==`http://${req.headers.host}`)return res.status(403).json({error:"Origin không hợp lệ"});next()};
app.use("/ops/api",sameOrigin);

function command(bin,args=[],input="",timeout=12000){return new Promise((resolve,reject)=>{const child=spawn(bin,args,{env:{...process.env,LANG:"C.UTF-8"}});let out="",err="";const timer=setTimeout(()=>child.kill("SIGKILL"),timeout);child.stdout.on("data",d=>out+=d);child.stderr.on("data",d=>err+=d);child.on("error",reject);child.on("close",code=>{clearTimeout(timer);code===0?resolve(out):reject(new Error((err||out||`Exit ${code}`).trim()))});if(input)child.stdin.end(input);else child.stdin.end()})}
async function helper(action,payload={}){const out=await command("sudo",["-n","/usr/local/sbin/server-ops-helper",action],JSON.stringify(payload),120000);return JSON.parse(out)}
async function collect(){try{const[cpu,mem,fs,net]=await Promise.all([si.currentLoad(),si.mem(),si.fsSize(),si.networkStats()]);const rootFs=fs.find(x=>x.mount==="/")||fs[0],primary=net.find(x=>x.operstate==="up"&&!x.iface.includes("lo"))||net[0];metrics.push({at:Date.now(),cpu:cpu.currentLoad,ram:mem.active/mem.total*100,disk:rootFs?.use||0,rx:(primary?.rx_sec||0)/1024,tx:(primary?.tx_sec||0)/1024});if(metrics.length>120)metrics.shift()}catch(error){console.error("metric",error.message)}}
await collect();setInterval(collect,5000).unref();setInterval(()=>{const now=Date.now();for(const[id,expires]of sessions)if(expires<=now)sessions.delete(id);for(const[ip,row]of attempts)if(row.until&&row.until<=now)attempts.delete(ip)},15*60_000).unref();
async function status(){try{const raw=(await command("systemctl",["list-units","--type=service","--all","--no-pager","--no-legend"])).trim();return raw.split("\n").filter(line=>line&&!line.includes("not-found")).map(line=>{const parts=line.trim().split(/\s+/);const name=parts[0].replace(".service","");const description=parts.slice(4).join(" ");return{name,description:description||name,state:parts[2]}})}catch{return[]}}
async function updateCount(){const now=Date.now();if(now-updatesCache.at>600_000){updatesCache.at=now;command("bash",["-lc","apt list --upgradable 2>/dev/null | tail -n +2 | wc -l"]).then(res=>{updatesCache.value=res.trim()*1}).catch(()=>{updatesCache.at=0})}return updatesCache.value}
function userCount(){try{return readFileSync("/etc/passwd","utf8").split("\n").filter(line=>{const p=line.split(":");return Number(p[2])>=1000&&Number(p[2])<65534}).length}catch{return 0}}

app.get("/ops/api/health",(_,res)=>res.json({ok:true}));
app.get("/ops/api/bootstrap",async(req,res)=>{const[osInfo,servicesData,updatesData]=await Promise.all([si.osInfo(),status(),updateCount()]);res.json({authenticated:authenticated(req),host:osInfo.hostname,os:"Ubuntu 26.04 LTS",uptime:si.time().uptime,metrics,services:servicesData,updates:updatesData,firewall:existsSync("/etc/ufw/ufw.conf")&&readFileSync("/etc/ufw/ufw.conf","utf8").includes("ENABLED=yes")?"Active":"Inactive",users:userCount()})});
app.post("/ops/api/login",async(req,res)=>{const ip=req.ip||"unknown",row=attempts.get(ip)||{count:0,until:0};if(row.until>Date.now())return res.status(429).json({error:"Quá nhiều lần thử. Vui lòng chờ."});const candidate=String(req.body.password||"");const ok=password&&candidate.length===password.length&&crypto.timingSafeEqual(Buffer.from(candidate),Buffer.from(password));if(!ok){row.count++;if(row.count>=5){row.until=Date.now()+15*60_000;row.count=0}attempts.set(ip,row);return res.status(401).json({error:"Mật khẩu không đúng"})}attempts.delete(ip);const id=crypto.randomBytes(24).toString("hex");sessions.set(id,Date.now()+8*60*60_000);res.setHeader("set-cookie",`ops_session=${id}.${sign(id)}; Path=/ops; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`);res.json({ok:true})});
app.post("/ops/api/logout",(req,res)=>{const raw=cookie(req,"ops_session"),id=raw?.split(".")[0];if(id)sessions.delete(id);res.setHeader("set-cookie","ops_session=; Path=/ops; HttpOnly; Secure; SameSite=Strict; Max-Age=0");res.json({ok:true})});
app.post("/ops/api/services/action",protect,async(req,res)=>{try{res.json(await helper("service",req.body))}catch(e){res.status(400).json({error:e.message})}});
app.get("/ops/api/files",protect,async(req,res)=>{try{res.json(await helper("file-list",req.query))}catch(e){res.status(400).json({error:e.message})}});
app.get("/ops/api/files/read",protect,async(req,res)=>{try{res.json(await helper("file-read",req.query))}catch(e){res.status(400).json({error:e.message})}});
app.post("/ops/api/files/write",protect,async(req,res)=>{try{res.json(await helper("file-write",req.body))}catch(e){res.status(400).json({error:e.message})}});
app.post("/ops/api/files/upload",protect,async(req,res)=>{try{res.json(await helper("file-upload",req.body))}catch(e){res.status(400).json({error:e.message})}});
app.post("/ops/api/files/delete",protect,async(req,res)=>{try{res.json(await helper("file-delete",req.body))}catch(e){res.status(400).json({error:e.message})}});
app.get("/ops/api/logs",protect,async(req,res)=>{try{res.json(await helper("logs",req.query))}catch(e){res.status(400).json({error:e.message})}});
app.post("/ops/api/security/action",protect,async(req,res)=>{try{res.json(await helper("security",req.body))}catch(e){res.status(400).json({error:e.message})}});
app.get("/ops/api/security",protect,async(_,res)=>{try{res.json(await helper("security-list"))}catch(e){res.status(400).json({error:e.message})}});
app.get("/ops/api/users",protect,async(_,res)=>{try{res.json(await helper("users"))}catch(e){res.status(400).json({error:e.message})}});
app.post("/ops/api/users/action",protect,async(req,res)=>{try{res.json(await helper("user",req.body))}catch(e){res.status(400).json({error:e.message})}});
app.get("/ops/api/processes",protect,async(_,res)=>{try{const list=(await si.processes()).list.sort((a,b)=>b.cpu-a.cpu).slice(0,15).map(p=>({pid:p.pid,name:p.name,cpu:p.cpu,mem:p.mem,user:p.user}));res.json({items:list})}catch(e){res.status(400).json({error:e.message})}});
app.get("/ops/api/updates",protect,async(_,res)=>{try{res.json(await helper("updates"))}catch(e){res.status(400).json({error:e.message})}});
app.use("/ops",express.static(path.join(root,"dist"),{maxAge:"1h",index:"index.html"}));
app.get("/ops/*path",(_,res)=>res.sendFile(path.join(root,"dist","index.html")));
app.listen(port,"127.0.0.1",()=>console.log(`Server Operations Console on ${port}`));
