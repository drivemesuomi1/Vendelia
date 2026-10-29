// Usage: npm run admin:hash -w frontend -- "your password"
// Prints the ADMIN_PASSWORD_HASH value to put in the environment (Vercel project settings or frontend/.env.local).
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: npm run admin:hash -w frontend -- "<password of at least 12 characters>"');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = await promisify(scrypt)(password, salt, 64);
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString("base64")}$${Buffer.from(hash).toString("base64")}`);
