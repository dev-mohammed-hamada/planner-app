import { expect, test } from "playwright/test";

test("planner redirects unauthenticated users to login with next path", async ({ page }) => {
  await page.goto("/planner");

  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fplanner/);
});
