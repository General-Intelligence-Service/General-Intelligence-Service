/**
 * توليد هاش bcrypt لكلمة مرور الأدمن.
 * الاستخدام: node scripts/hash-password.cjs "YourPassword"
 */
const bcrypt = require("bcryptjs");

const plain = process.argv[2];
if (!plain) {
  console.error('Usage: node scripts/hash-password.cjs "YourPassword"');
  process.exit(1);
}

bcrypt.hash(plain, 12).then((hash) => {
  console.log(hash);
  console.log("\nPut this in Vercel as ADMIN_PASSWORD_HASH (or email:hash in ADMIN_CREDENTIALS).");
});
