import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const assets = path.resolve("inteliagent-app/assets");
const source = fs.readFileSync(path.join(assets, "icon.svg"), "utf8");
const transparent = source.replace(/<rect width="1024"[^>]*\/>/, "");
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    "C:/Users/amand/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe",
});
const page = await browser.newPage();
async function render(svg, size, file) {
  const data = await page.evaluate(
    async ({ svg, size, type }) => {
      const image = new Image();
      image.src = "data:image/svg+xml;base64," + btoa(svg);
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      canvas.getContext("2d").drawImage(image, 0, 0, size, size);
      return canvas.toDataURL(type, 1).split(",")[1];
    },
    { svg, size, type: file.endsWith(".webp") ? "image/webp" : "image/png" },
  );
  fs.writeFileSync(file, Buffer.from(data, "base64"));
}
try {
  await render(source, 1024, path.join(assets, "icon.png"));
  await render(transparent, 1024, path.join(assets, "adaptive-icon.png"));
  await render(source, 64, path.join(assets, "favicon.png"));
  await render(source, 256, path.join(assets, "splash.png"));
  const res = path.resolve("inteliagent-app/android/app/src/main/res");
  for (const [density, size, foreground] of [
    ["mdpi", 48, 108],
    ["hdpi", 72, 162],
    ["xhdpi", 96, 216],
    ["xxhdpi", 144, 324],
    ["xxxhdpi", 192, 432],
  ]) {
    const folder = path.join(res, "mipmap-" + density);
    if (!fs.existsSync(folder)) continue;
    for (const name of [
      "ic_launcher",
      "ic_launcher_round",
      "ic_launcher_foreground",
    ])
      await render(
        name.endsWith("foreground")
          ? transparent
          : name.endsWith("round")
            ? source.replace('rx="224"', 'rx="512"')
            : source,
        name.endsWith("foreground") ? foreground : size,
        path.join(folder, name + ".webp"),
      );
    const splash = path.join(
      res,
      "drawable-" + density,
      "splashscreen_logo.png",
    );
    if (fs.existsSync(splash)) {
      const width = fs.readFileSync(splash).readUInt32BE(16);
      await render(source, width, splash);
    }
  }
  fs.mkdirSync("inteliagent-webapp/public/brand", { recursive: true });
  fs.writeFileSync("inteliagent-webapp/public/brand/icon.svg", source);
  console.log(
    "Brand assets generated for Expo, native Android launchers and splash, and web.",
  );
} finally {
  await browser.close();
}
