const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

/**
 * Obfuscate server-side code only (API routes)
 * KHÔNG obfuscate client-side chunks để tránh lỗi
 */

const SERVER_DIR = path.join(__dirname, '..', '.next', 'server');

// Safe obfuscation options
const OBFUSCATION_OPTIONS = {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: false,
    renameGlobals: false,
    selfDefending: false,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: false,
    stringArrayEncoding: ['base64'],
    stringArrayIndexShift: true,
    stringArrayRotate: true,
    stringArrayShuffle: true,
    stringArrayWrappersCount: 1,
    stringArrayThreshold: 0.5,
    transformObjectKeys: false,
    unicodeEscapeSequence: false
};

function shouldSkipFile(fileName, filePath) {
    // Skip system files
    const skipPatterns = [
        'middleware',
        'instrumentation',
        '_error',
        '_document',
        '_app'
    ];
    
    if (skipPatterns.some(pattern => fileName.toLowerCase().includes(pattern))) {
        return true;
    }
    
    // Skip vendor chunks
    if (filePath.includes('vendor-chunks')) {
        return true;
    }
    
    return false;
}

function obfuscateFile(filePath) {
    try {
        const fileName = path.basename(filePath);
        
        if (shouldSkipFile(fileName, filePath)) {
            console.log(`[Obfuscate] Skipping: ${fileName}`);
            return false;
        }
        
        const code = fs.readFileSync(filePath, 'utf8');
        
        // Skip if already obfuscated
        if (code.includes('_0x')) {
            console.log(`[Obfuscate] Already obfuscated: ${fileName}`);
            return false;
        }
        
        console.log(`[Obfuscate] Processing: ${fileName}`);
        
        const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
        fs.writeFileSync(filePath, obfuscated.getObfuscatedCode(), 'utf8');
        
        console.log(`[Obfuscate] ✓ Done: ${fileName}`);
        return true;
        
    } catch (error) {
        console.error(`[Obfuscate] ✗ Error: ${path.basename(filePath)}`);
        console.error(`  ${error.message.split('\n')[0]}`);
        return false;
    }
}

function obfuscateDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.log(`[Obfuscate] Directory not found: ${dir}`);
        return 0;
    }

    const files = fs.readdirSync(dir);
    let processed = 0;

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
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
console.log('Obfuscating SERVER-SIDE code only...');
console.log('Client-side chunks will NOT be obfuscated');
console.log('='.repeat(60));

const startTime = Date.now();

// Obfuscate API routes
const apiDir = path.join(SERVER_DIR, 'app', 'api');
let processed = 0;

if (fs.existsSync(apiDir)) {
    console.log('\n[API Routes]');
    processed += obfuscateDirectory(apiDir);
}

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n' + '='.repeat(60));
console.log(`✓ Obfuscation complete!`);
console.log(`  Files processed: ${processed}`);
console.log(`  Duration: ${duration}s`);
console.log('='.repeat(60));
console.log('\n✓ Client-side code is NOT obfuscated (safe from errors)');
console.log('✓ Server-side API routes are obfuscated (protected)');
console.log('');
