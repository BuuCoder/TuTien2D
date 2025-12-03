/**
 * Remove console.log statements from production build
 * Chạy sau khi build: node scripts/remove-console-logs.js
 */

const fs = require('fs');
const path = require('path');

// Directories to clean
const DIRS_TO_CLEAN = [
    path.join(__dirname, '..', '.next', 'server'),
    path.join(__dirname, '..', '.next', 'static'),
];

// Patterns to remove - more careful to avoid syntax errors
const CONSOLE_PATTERNS = [
    // Match console.log with semicolon
    /console\.log\([^)]*\);/g,
    /console\.debug\([^)]*\);/g,
    /console\.info\([^)]*\);/g,
    // Match console.log without semicolon (in expressions)
    /,\s*console\.log\([^)]*\)/g,
    /,\s*console\.debug\([^)]*\)/g,
    /,\s*console\.info\([^)]*\)/g,
    // Keep console.error and console.warn for debugging
];

let filesProcessed = 0;
let logsRemoved = 0;

function cleanFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let removedCount = 0;
        const originalContent = content;

        CONSOLE_PATTERNS.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                removedCount += matches.length;
                content = content.replace(pattern, '');
                modified = true;
            }
        });

        if (modified) {
            // Verify syntax by checking for common errors
            const hasErrors = 
                /return\s*,/.test(content) ||  // return ,
                /\(\s*,/.test(content) ||       // ( ,
                /,\s*\)/.test(content) ||       // , )
                /,\s*,/.test(content);          // , ,

            if (hasErrors) {
                console.log(`[Clean] ⚠ ${path.basename(filePath)} - Skipped (potential syntax errors)`);
                return;
            }

            fs.writeFileSync(filePath, content, 'utf8');
            filesProcessed++;
            logsRemoved += removedCount;
            console.log(`[Clean] ✓ ${path.basename(filePath)} - Removed ${removedCount} console statements`);
        }

    } catch (error) {
        console.error(`[Clean] ✗ Error processing ${filePath}:`, error.message);
    }
}

function cleanDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`[Clean] Directory not found: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            cleanDirectory(filePath);
        } else if (file.endsWith('.js') && !file.includes('.map')) {
            cleanFile(filePath);
        }
    });
}

// Main
console.log('='.repeat(60));
console.log('Removing console.log statements from production build...');
console.log('='.repeat(60));
console.log('');

const startTime = Date.now();

DIRS_TO_CLEAN.forEach(dir => {
    console.log(`[Clean] Processing: ${dir}`);
    cleanDirectory(dir);
});

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('');
console.log('='.repeat(60));
console.log('✓ Console cleanup complete!');
console.log(`  Files processed: ${filesProcessed}`);
console.log(`  Console statements removed: ${logsRemoved}`);
console.log(`  Duration: ${duration}s`);
console.log('='.repeat(60));
console.log('');
console.log('⚠️  Note: console.error and console.warn are kept for debugging');
console.log('');
