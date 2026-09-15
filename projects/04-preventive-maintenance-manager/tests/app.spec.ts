import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("dashboard renders without horizontal overflow", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Thiết bị khỏe. Vận hành liền mạch." })).toBeVisible();
  await expect(page.getByText("Đây là app Demo được thực hiện bởi Phạm Đoàn Thiện Phong")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("creates equipment and keeps it after reload", async ({ page }) => {
  await page.getByRole("button", { name: "Thiết bị", exact: true }).click();
  await page.getByRole("button", { name: "Thêm thiết bị", exact: true }).click();
  await page.locator('input[name="name"]').fill("UPS phòng server");
  await page.locator('input[name="code"]').fill("UPS-E2E-01");
  await page.locator('input[name="location"]').fill("Server room");
  await page.locator('select[name="type"]').selectOption("Electrical");
  await page.locator('input[name="interval"]').fill("30");
  await page.locator('input[name="lastService"]').fill("2026-09-01");
  await page.locator('input[name="nextService"]').fill("2026-10-01");
  await page.getByRole("button", { name: "Lưu thiết bị" }).click();
  await expect(page.getByRole("heading", { name: "UPS phòng server" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Thiết bị", exact: true }).click();
  await expect(page.getByRole("heading", { name: "UPS phòng server" })).toBeVisible();
});

test("completes workflow, uploads photo and generates report", async ({ page }) => {
  await page.getByRole("button", { name: "Lên lịch", exact: true }).click();
  await page.locator('input[name="title"]').fill("Kiểm tra E2E hệ thống UPS");
  await page.locator('select[name="equipment"]').selectOption({ label: "Tủ điện phân phối" });
  await page.locator('input[name="due"]').fill("2026-09-20");
  await page.locator('input[name="assignee"]').fill("QA Automation");
  await page.locator('textarea[name="checklist"]').fill("Cô lập nguồn điện\nĐo điện áp đầu vào\nKiểm tra cảnh báo UPS");
  await page.getByRole("button", { name: "Tạo lịch" }).click();
  await expect(page.getByText("Đã lên lịch bảo trì")).toBeVisible();
  await page.getByRole("button", { name: /Kiểm tra E2E hệ thống UPS/ }).click();
  await page.getByLabel("Cô lập nguồn điện").check();
  await page.getByLabel("Đo điện áp đầu vào").check();
  await page.getByLabel("Kiểm tra cảnh báo UPS").check();
  await page.getByLabel("Lỗi phát hiện").fill("Đầu nối input lỏng");
  await page.getByLabel("Linh kiện đã thay").fill("Đầu cos 16 mm2, số lượng 2");
  await page.locator('.drawer input[type="file"]').first().setInputFiles("tests/fixtures/maintenance-before.svg");
  await expect(page.getByRole("img", { name: "Trước bảo trì" })).toBeVisible();
  await page.locator(".drawer select").selectOption("Completed");
  await page.getByRole("button", { name: "Tạo maintenance report" }).click();
  await expect(page.getByText("Checklist: 3/3 hạng mục hoàn thành")).toBeVisible();
  await expect(page.getByText("Lỗi phát hiện: Đầu nối input lỏng")).toBeVisible();
  await page.getByRole("button", { name: "×" }).click();
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await expect(page.getByRole("button", { name: /Kiểm tra E2E hệ thống UPS.*AI report/ })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Báo cáo", exact: true }).click();
  await expect(page.getByRole("button", { name: /Kiểm tra E2E hệ thống UPS.*AI report/ })).toBeVisible();
});
