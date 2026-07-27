import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const srcDir = path.resolve(
  process.env.INSTALL_VISUAL_SRC ??
    path.join(process.cwd(), "..", ".cursor", "projects", "c-Users-b0109-sgsolar-analysis", "assets"),
);
const outDir = path.join(process.cwd(), "public", "install-visuals");

const files = [
  ["ground-aerial-01.png", "ground-aerial-01.webp", 1920],
  ["ground-aerial-02.png", "ground-aerial-02.webp", 1920],
  ["ground-detail-01.png", "ground-detail-01.webp", 1200],
  ["factory-roof-01.png", "factory-roof-01.webp", 1920],
  ["warehouse-roof-01.png", "warehouse-roof-01.webp", 1200],
  ["residential-roof-01.png", "residential-roof-01.webp", 1200],
  ["residential-roof-02.png", "residential-roof-02.webp", 1200],
  ["carport-home-01.png", "carport-home-01.webp", 1200],
  ["carport-commercial-01.png", "carport-commercial-01.webp", 1920],
  ["solar-detail-01.png", "solar-detail-01.webp", 1200],
];

fs.mkdirSync(outDir, { recursive: true });

for (const [srcName, destName, maxW] of files) {
  const input = path.join(srcDir, srcName);
  if (!fs.existsSync(input)) {
    console.error("missing:", input);
    process.exitCode = 1;
    continue;
  }
  const output = path.join(outDir, destName);
  const info = await sharp(input)
    .resize({ width: maxW, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(destName, `${info.width}x${info.height}`, info.size);
}
