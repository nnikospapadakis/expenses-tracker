// Passenger startup shim for cPanel's "Setup Node.js App".
// Passenger loads this file with require() (CommonJS); the real app is ESM,
// so we bridge to it with a dynamic import. Point the "Application startup
// file" in cPanel at  app.cjs  and everything else stays the same.
import("./src/index.js").catch((err) => {
  console.error("Failed to start app:", err);
  process.exit(1);
});
