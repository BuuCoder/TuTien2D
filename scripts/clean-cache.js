const fs = require('fs');
const path = require('path');

/**
 * Clean Next.js and Turbopack cache
 * Xóa toàn bộ cache để tránh lỗi khi build với obfuscation
 */

const CACHE_DIRS = [
    '.next',
    'node_modules/.cache',
];

function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

console.log('='.repeat(60));
console.log('🧹 Cleaning Next.js and Turbopack cache...');
console.log('='.repeat(60));

let cleaned = 0;

CACHE_DIRS.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);

    if (fs.existsSync(fullPath)) {
        console.log(`[Clean] Removing: ${dir}`);
        try {
            deleteFolderRecursive(fullPath);
            console.log(`[Clean] ✓ Removed: ${dir}`);
            cleaned++;
        } catch (error) {
            console.error(`[Clean] ✗ Error removing ${dir}: ${error.message}`);
        }
    } else {
        console.log(`[Clean] Skipping (not found): ${dir}`);
    }
});

console.log('='.repeat(60));
console.log(`✓ Cache cleaning complete!`);
console.log(`  Directories removed: ${cleaned}`);
console.log('='.repeat(60));
console.log('');
