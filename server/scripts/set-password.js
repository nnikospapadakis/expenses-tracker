// Create or update the single login user.
// Usage: node scripts/set-password.js <username> <password>
import "dotenv/config";
import { setUser } from "../src/auth.js";

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error("Usage: node scripts/set-password.js <username> <password>");
  process.exit(1);
}

await setUser(username, password);
console.log(`✔ Login set for user "${username}".`);
