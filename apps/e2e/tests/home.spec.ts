import { expect, test } from "@playwright/test";

test("menampilkan status persiapan PETORA dalam bahasa Indonesia", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Fondasi PETORA sedang disiapkan" }),
  ).toBeVisible();
  await expect(
    page.getByText("Belum ada transaksi bisnis yang tersedia."),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
});
