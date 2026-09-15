import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("dashboard renders responsively with the required footer", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Mọi đồ dùng đều có một câu chuyện." })).toBeVisible();
  await expect(page.getByText("Đây là app Demo được thực hiện bởi Phạm Đoàn Thiện Phong")).toBeVisible();
  await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("adds an item with a receipt and persists it after reload", async ({ page }) => {
  await page.getByRole("button", { name: "Thêm đồ dùng", exact: true }).first().click();
  await page.locator('input[name="name"]').fill("Máy lọc không khí");
  await page.locator('select[name="category"]').selectOption("Điện tử");
  await page.locator('input[name="location"]').fill("Phòng khách");
  await page.locator('input[name="brand"]').fill("Xiaomi");
  await page.locator('input[name="model"]').fill("Air 4 Pro");
  await page.locator('input[name="serial"]').fill("XM-AIR-E2E-01");
  await page.locator('input[name="purchaseDate"]').fill("2026-09-01");
  await page.locator('input[name="warrantyEnd"]').fill("2028-09-01");
  await page.locator('input[name="value"]').fill("4590000");
  await page.locator('input[name="receipt"]').setInputFiles("tests/fixtures/receipt.svg");
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(page.getByText("Đã thêm đồ dùng vào hồ sơ")).toBeVisible();
  await page.getByRole("button", { name: "Đồ dùng", exact: true }).click();
  await page.getByRole("button", { name: /Máy lọc không khí/ }).click();
  await expect(page.getByRole("img", { name: "Hóa đơn Máy lọc không khí" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Đồ dùng", exact: true }).click();
  await expect(page.getByRole("button", { name: /Máy lọc không khí/ })).toBeVisible();
});

test("searches and filters the household inventory", async ({ page }) => {
  await page.getByRole("button", { name: "Đồ dùng", exact: true }).click();
  await page.getByLabel("Tìm đồ dùng").fill("ThinkPad");
  await expect(page.getByRole("button", { name: /Laptop cá nhân/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Máy giặt cửa trước/ })).toHaveCount(0);
  await page.getByLabel("Tìm đồ dùng").fill("");
  await page.getByLabel("Lọc danh mục").selectOption("Điện lạnh");
  await expect(page.getByRole("button", { name: /Máy lạnh phòng ngủ/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Laptop cá nhân/ })).toHaveCount(0);
});

test("creates and completes a care task", async ({ page }) => {
  await page.getByRole("button", { name: "Lịch chăm sóc", exact: true }).click();
  await page.getByRole("main").getByRole("button", { name: "Tạo lịch", exact: true }).click();
  await page.locator('input[name="title"]').fill("Kiểm tra pin laptop");
  await page.locator('select[name="itemId"]').selectOption({ label: "Laptop cá nhân" });
  await page.locator('input[name="due"]').fill("2026-09-25");
  await page.locator('select[name="frequency"]').selectOption("6 tháng");
  await page.locator("form").getByRole("button", { name: "Tạo lịch", exact: true }).click();
  await expect(page.getByText("Đã tạo lịch chăm sóc")).toBeVisible();
  await page.getByRole("button", { name: "Hoàn thành Kiểm tra pin laptop" }).click();
  await expect(page.getByText("Đã hoàn thành công việc")).toBeVisible();
  await expect(page.getByText("Hoàn thành", { exact: true }).last()).toBeVisible();
});

test("records a repair expense and updates the total", async ({ page }) => {
  await page.getByRole("button", { name: "Sửa chữa", exact: true }).click();
  await page.getByRole("button", { name: "Thêm chi phí", exact: true }).click();
  await page.locator('select[name="itemId"]').selectOption({ label: "Máy giặt cửa trước" });
  await page.locator('input[name="date"]').fill("2026-09-15");
  await page.locator('input[name="cost"]').fill("375000");
  await page.locator('input[name="provider"]').fill("Điện máy An Tâm");
  await page.locator('textarea[name="notes"]').fill("Vệ sinh bơm xả và kiểm tra đường nước");
  await page.getByRole("button", { name: "Lưu chi phí" }).click();
  await expect(page.getByText("Đã ghi nhận lần sửa chữa")).toBeVisible();
  await expect(page.getByText("1.475.000 ₫")).toBeVisible();
  await expect(page.getByText("Điện máy An Tâm")).toBeVisible();
});

test("smart assistant returns a local safety playbook", async ({ page }) => {
  await page.getByRole("button", { name: "Smart Assistant", exact: true }).click();
  await expect(page.getByText("Không gửi mô tả hoặc dữ liệu thiết bị ra ngoài.")).toBeVisible();
  await page.getByLabel("Loại thiết bị").selectOption("Gia dụng");
  await page.getByLabel("Mô tả hiện tượng").fill("Máy giặt không thoát nước sau khi hoàn thành chương trình");
  await page.getByRole("button", { name: "Xem hướng dẫn an toàn" }).click();
  await expect(page.getByRole("heading", { name: "Playbook đề xuất" })).toBeVisible();
  await expect(page.getByText("Kiểm tra đường cấp, thoát nước và bộ lọc.")).toBeVisible();
});
