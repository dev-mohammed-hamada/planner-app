import { expect, test } from "playwright/test";

test("planner redirects unauthenticated users to login with next path", async ({ page }) => {
  await page.goto("/planner");

  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fplanner/);
});

test("protected redesigned routes redirect unauthenticated users to login", async ({ page }) => {
  for (const route of ["/planner", "/calendar", "/notes", "/settings"]) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/auth/login\\?next=%2F${route.slice(1)}`));
  }
});
