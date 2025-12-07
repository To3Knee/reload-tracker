//===============================================================
//Script Name: generate_hash.js
//Script Location: backend/tools/generate_hash.js
//Date: 12/07/2025
//Created By: T03KNEE
//About: Generates a valid password hash and SQL update statement.
//       Usage: node backend/tools/generate_hash.js
//===============================================================

import crypto from 'node:crypto';

const PASSWORD = 'password123';
const SALT_HEX = 'e5c2b0d3f4a1b2c3'; // Fixed salt for consistency

function generate() {
  console.log(`\n🔐 GENERATING HASH FOR: "${PASSWORD}"\n`);

  // 1. Create Salt Buffer
  const salt = Buffer.from(SALT_HEX, 'hex');

  // 2. Hash (PBKDF2 - Matches authService.js)
  // crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')
  const hash = crypto.pbkdf2Sync(PASSWORD, salt, 100000, 64, 'sha512');

  // 3. Format: pbkdf2$iterations$saltB64$hashB64
  const storedValue = [
    'pbkdf2',
    '100000',
    salt.toString('base64'),
    hash.toString('base64')
  ].join('$');

  console.log('✅ HASH GENERATED SUCCESSFULLY!');
  console.log('---------------------------------------------------');
  console.log('RUN THIS SQL TO FIX YOUR ADMIN USER:');
  console.log('');
  console.log(`UPDATE users SET password_hash = '${storedValue}' WHERE username = 'admin';`);
  console.log('');
  console.log('---------------------------------------------------');
}

generate();