import { expect, test } from "@playwright/test";

/**
 * 포트폴리오 홈의 계약 — 역량을 고르면 URL에 남고, 그 역량을 쓴 프로젝트만 남으며,
 * 같은 주소로 다시 열어도 그 상태가 복원됩니다. 데이터는 운영 DB의 실제 값이라
 * 특정 역량 이름 대신 "첫 번째 역량"으로 검사합니다.
 */

test("역량을 누르면 URL에 남고 다시 열어도 유지된다", async ({ page }) => {
  await page.goto("/#skills");
  const chip = page.locator(".legend__chip").first();
  test.skip((await chip.count()) === 0, "등록된 역량이 없습니다");

  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/[?&]skill=/);

  const skill = new URL(page.url()).searchParams.get("skill");
  // 남은 프로젝트 카드는 모두 그 역량 칩을 강조하고 있어야 합니다
  const cards = page.locator(".work");
  for (const card of await cards.all()) {
    await expect(card.locator(".work__stack li[data-active]")).toHaveCount(1);
  }

  await page.reload();
  await expect(page.locator(`.legend__chip[aria-pressed="true"]`)).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get("skill")).toBe(skill);

  await page.getByRole("button", { name: "전체 보기" }).click();
  await expect(page).not.toHaveURL(/[?&]skill=/);
  await expect(page.locator(`.legend__chip[aria-pressed="true"]`)).toHaveCount(0);
});

test("메뉴가 홈의 섹션과 기록으로 이어진다", async ({ page }) => {
  await page.goto("/");
  for (const id of ["about", "skills", "projects", "career"]) {
    await expect(page.locator(`section#${id}`)).toHaveCount(1);
  }
  await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "기록" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "기록" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
