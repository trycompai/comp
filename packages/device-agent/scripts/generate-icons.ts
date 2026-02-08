/**
 * Generate tray icons for the Comp AI Device Agent.
 *
 * Run this script to create the PNG tray icons used by the system tray.
 * In production, replace these with properly designed 16x16 and 32x32 PNG icons.
 *
 * Usage: npx ts-node scripts/generate-icons.ts
 *
 * Required icons (place in assets/):
 *  - tray-green.png  (16x16, compliant status)
 *  - tray-red.png    (16x16, non-compliant status)
 *  - tray-gray.png   (16x16, unauthenticated/checking status)
 *  - icon.png        (256x256, app icon)
 *  - icon.icns       (macOS app icon)
 *  - icon.ico        (Windows app icon)
 *
 * For now, the app will gracefully handle missing icons by using an empty image.
 */

console.log('Tray icons should be placed in the assets/ directory:');
console.log('  - assets/tray-green.png  (16x16 template icon for compliant)');
console.log('  - assets/tray-red.png    (16x16 template icon for non-compliant)');
console.log('  - assets/tray-gray.png   (16x16 template icon for unauthenticated)');
console.log('  - assets/icon.png        (256x256 app icon)');
console.log('');
console.log('On macOS, tray icons should be template images (black/white, transparency).');
console.log('Use @2x variants for Retina displays (32x32).');
