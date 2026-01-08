import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Simulate logic from authController (assuming it's in src/controllers)
// But we are in src/scripts, so ../../uploads works same way to reach backend/uploads
const targetDir = path.resolve(__dirname, '../../uploads', 'siggy');
console.log('Testing path:', targetDir);
try {
    if (!fs.existsSync(targetDir)) {
        console.log('Directory does not exist!');
    }
    else {
        console.log('Directory exists.');
        const files = fs.readdirSync(targetDir);
        console.log('All files found:', files.slice(0, 5)); // Show first 5
        const images = files.filter(f => /\.(png|jpe?g|webp|gif)$/i.test(f));
        console.log('Image files:', images.slice(0, 5));
        if (images.length > 0) {
            const chosen = images[Math.floor(Math.random() * images.length)];
            console.log('Chosen:', `/uploads/siggy/${chosen}`);
        }
        else {
            console.log('No images found.');
        }
    }
}
catch (e) {
    console.error('Error:', e);
}
//# sourceMappingURL=debugAvatar.js.map