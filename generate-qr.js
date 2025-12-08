#!/usr/bin/env node

const QRCode = require('qrcode-terminal');

const url = 'http://10.250.135.3:4000';

console.log('\n');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║        Scan this QR code with your iPhone                ║');
console.log('║         using Expo Go or Camera app                      ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('\n');

QRCode.generate(url, { small: true }, function(qr_code) {
  console.log(qr_code);
  console.log('\n');
  console.log('📱 Or manually visit:');
  console.log(`   ${url}`);
  console.log('\n');
  console.log('Make sure your iPhone is on the same WiFi network!');
  console.log('\n');
});
