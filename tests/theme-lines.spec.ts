import { expect, test } from "@playwright/test";

function countVisibleBorders() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("*"));
  let count = 0;

  for (const el of nodes) {
    const cs = window.getComputedStyle(el);
    const widths = [
      parseFloat(cs.borderTopWidth),
      parseFloat(cs.borderRightWidth),
      parseFloat(cs.borderBottomWidth),
      parseFloat(cs.borderLeftWidth),
    ];
    const styles = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
    const colors = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor];

    for (let i = 0; i < 4; i++) {
      if (!(widths[i] > 0)) continue;
      if (styles[i] === "none") continue;
      if (colors[i] === "rgba(0, 0, 0, 0)" || colors[i] === "transparent") continue;
      count++;
      break;
    }
  }

  return count;
}

test("白色主题首次加载线条可见，切换往返保持稳定", async ({ page }) => {
  await page.context().addCookies([
    { name: "theme", value: "light", url: "http://localhost:3100" },
  ]);

  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const lightBorderColor = await page.evaluate(() =>
    window.getComputedStyle(document.documentElement).getPropertyValue("--border-color").trim()
  );
  expect(lightBorderColor.length).toBeGreaterThan(0);

  const lightBorderCount = await page.evaluate(countVisibleBorders);
  expect(lightBorderCount).toBeGreaterThan(0);

  await page.getByRole("button", { name: "切换到深色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const darkBorderColor = await page.evaluate(() =>
    window.getComputedStyle(document.documentElement).getPropertyValue("--border-color").trim()
  );
  expect(darkBorderColor.length).toBeGreaterThan(0);

  await page.getByRole("button", { name: "切换到浅色模式" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const lightBorderCountAfter = await page.evaluate(countVisibleBorders);
  expect(lightBorderCountAfter).toBeGreaterThan(0);
});
