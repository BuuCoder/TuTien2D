/**
 * Script to create placeholder skin assets by copying knight assets
 * Run: node scripts/create-skin-placeholders.js
 */

const fs = require('fs');
const path = require('path');

const SKINS_TO_CREATE = ['warrior', 'mage', 'assassin', 'dragon_knight'];
const SOURCE_SKIN = 'knight';
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'assets');

function copyDirectory(source, destination) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
        console.log(`✓ Created directory: ${destination}`);
    }

    // Read source directory
    const files = fs.readdirSync(source);

    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);

        // Check if it's a directory
        if (fs.statSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, destPath);
        } else {
            // Copy file
            fs.copyFileSync(sourcePath, destPath);
            console.log(`  ✓ Copied: ${file}`);
        }
    });
}

function createSkinPlaceholders() {
    console.log('🎨 Creating skin placeholder assets...\n');

    const sourceDir = path.join(ASSETS_DIR, SOURCE_SKIN);

    // Check if source exists
    if (!fs.existsSync(sourceDir)) {
        console.error(`❌ Error: Source skin '${SOURCE_SKIN}' not found at ${sourceDir}`);
        console.error('Please make sure the knight assets exist first.');
        process.exit(1);
    }

    // Create each skin
    SKINS_TO_CREATE.forEach(skinId => {
        const destDir = path.join(ASSETS_DIR, skinId);

        console.log(`\n📁 Creating ${skinId}...`);

        // Check if already exists
        if (fs.existsSync(destDir)) {
            console.log(`⚠️  Warning: ${skinId} already exists. Skipping...`);
            return;
        }

        // Copy directory
        try {
            copyDirectory(sourceDir, destDir);
            console.log(`✅ Successfully created ${skinId} placeholder`);
        } catch (error) {
            console.error(`❌ Error creating ${skinId}:`, error.message);
        }
    });

    console.log('\n✨ Done! Placeholder assets created.');
    console.log('\n📝 Note: These are placeholder assets copied from knight.');
    console.log('   Replace them with actual skin assets later for better visuals.');
    console.log('\n📖 See docs/SKIN_ASSETS_GUIDE.md for more information.');
}

// Run the script
createSkinPlaceholders();
