import {defineConfig,devices} from "@playwright/test";
export default defineConfig({testDir:"./tests",use:{baseURL:process.env.OPS_BASE_URL||"http://127.0.0.1:8090/ops/",trace:"retain-on-failure"},projects:[{name:"desktop",use:{browserName:"chromium",viewport:{width:1440,height:900}}},{name:"mobile",use:{...devices["iPhone 13"],browserName:"chromium"}}]});
