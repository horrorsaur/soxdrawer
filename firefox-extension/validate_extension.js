// Simple validation script to check extension files
const fs = require('fs');

function validateFile(filename) {
  try {
    if (fs.existsSync(filename)) {
      console.log(`✅ ${filename} exists`);
      return true;
    } else {
      console.log(`❌ ${filename} missing`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error checking ${filename}: ${error.message}`);
    return false;
  }
}

function validateManifest() {
  try {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    console.log(`✅ manifest.json is valid JSON`);
    console.log(`   Name: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Manifest Version: ${manifest.manifest_version}`);
    return true;
  } catch (error) {
    console.log(`❌ manifest.json validation failed: ${error.message}`);
    return false;
  }
}

console.log('🔍 Validating SoxDrawer Firefox Extension...\n');

const files = ['manifest.json', 'popup.html', 'popup.js', 'background.js'];
let allValid = true;

files.forEach(file => {
  if (!validateFile(file)) {
    allValid = false;
  }
});

if (!validateManifest()) {
  allValid = false;
}

console.log('\n' + (allValid ? '🎉 All files valid! Extension ready to load.' : '⚠️  Some issues found.'));
