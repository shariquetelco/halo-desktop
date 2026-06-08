#!/usr/bin/env node
// HALO License Key Generator
// Usage: node tools/keygen.js
// Keep this file PRIVATE — never commit to public repo

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  // Generate 12 random chars (3 segments of 4)
  let body = '';
  for (let i = 0; i < 12; i++) {
    body += chars[Math.floor(Math.random() * chars.length)];
  }

  // Calculate checksum (must match Rust validation)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += body.charCodeAt(i);
  }
  const checksum = (sum % 10000).toString(16).toUpperCase().padStart(4, '0');
  
  const fullBody = body + checksum;
  
  // Format as HALO-XXXX-XXXX-XXXX-XXXX
  const key = `HALO-${fullBody.slice(0,4)}-${fullBody.slice(4,8)}-${fullBody.slice(8,12)}-${fullBody.slice(12,16)}`;
  
  return key;
}

// Generate 1 or multiple keys
const count = parseInt(process.argv[2]) || 1;

console.log('\n🌟 HALO License Key Generator\n');
for (let i = 0; i < count; i++) {
  console.log(generateKey());
}
console.log('\n');