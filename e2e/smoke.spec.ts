import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * 화면 구성이 바뀌어도 살아남아야 하는 최소 계약만 확인합니다 —
 * 페이지가 뜨고, 404가 진짜 404이고, 테마가 유지되고, 심각한 접근성 위반이 없다.
 */

test("홈이 뜨고 주 메뉴가 있다", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "주 메뉴" })).toBeAttached();
});

test("없는 주소는 상태 코드 404로 응답한다", async ({ page }) => {
  const res = await page.goto("/__no-such-page__");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "홈으로" })).toBeVisible();
});

test("테마 전환이 새로고침 뒤에도 유지된다", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: "다크 모드" }).first();
  test.skip(!(await toggle.isVisible()), "이 뷰포트에서는 토글이 메뉴 안에 있습니다");

  // 다크는 속성이 없는 상태이므로 속성 값이 아니라 해석된 테마로 비교합니다
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme ?? "dark");

  const before = await theme();
  await toggle.click();
  const after = await theme();
  expect(after).not.toBe(before);

  await page.reload();
  expect(await theme()).toBe(after);
});

test("홈에 심각한 접근성 위반이 없다", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});
