const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

/**
 * Obfuscate all JS files in .next/static/chunks
 * Chạy sau khi build: npm run build:obfuscate
 */

const BUILD_DIR = path.join(__dirname, '..', '.next', 'static', 'chunks');

// Obfuscation options
const OBFUSCATION_OPTIONS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    selfDefending: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
};

function obfuscateFile(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        
        // Skip if already obfuscated
        if (code.includes('_0x')) {
            console.log(`[Obfuscate] Skipping (already obfuscated): ${path.basename(filePath)}`);
            return false;
        }
        
        console.log(`[Obfuscate] Processing: ${path.basename(filePath)}`);
        
        const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
        
        fs.writeFileSync(filePath, obfuscated.getObfuscatedCode(), 'utf8');
        
        console.log(`[Obfuscate] ✓ Done: ${path.basename(filePath)}`);
        return true;
        
    } catch (error) {
        console.error(`[Obfuscate] ✗ Error: ${path.basename(filePath)} - ${error.message.split('\n')[0]}`);
        console.log(`[Obfuscate] ⚠ Skipping file due to error`);
        return false;
    }
}

function obfuscateDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`[Obfuscate] Directory not found: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);
    let processed = 0;

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Recursive
            processed += obfuscateDirectory(filePath);
        } else if (file.endsWith('.js') && !file.includes('.map')) {
            if (obfuscateFile(filePath)) {
                processed++;
            }
        }
    });

    return processed;
}

// Main
console.log('='.repeat(60));
console.log('Starting code obfuscation...');
console.log('='.repeat(60));

const startTime = Date.now();
const processed = obfuscateDirectory(BUILD_DIR);
const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('='.repeat(60));
console.log(`✓ Obfuscation complete!`);
console.log(`  Files processed: ${processed}`);
console.log(`  Duration: ${duration}s`);
console.log('='.repeat(60));
console.log('');
console.log('⚠️  WARNING: Obfuscated code is harder to debug!');
console.log('   Use "npm run build" for development builds.');
console.log('   Use "npm run build:obfuscate" for production only.');
console.log('');
