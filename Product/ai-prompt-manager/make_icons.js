const fs = require('fs');
const path = require('path');

// 非常に短い1x1ピクセルの透過PNGデータ（Base64）
const transparentPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buffer = Buffer.from(transparentPngBase64, 'base64');

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}

sizes.forEach(size => {
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buffer);
});

console.log("Dummy icons created.");
