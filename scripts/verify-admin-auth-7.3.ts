/**
 * Step 7.3 — Admin auth guard verification
 */
import { checkAdminApiAccess, isAdminConfigured } from "../src/lib/admin/auth";

let failed = 0;

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

async function main() {
  const configured = isAdminConfigured();
  console.log("ADMIN_PASSWORD configured:", configured);

  const unauthed = await checkAdminApiAccess();
  if (configured) {
    assert("unauthenticated api access blocked", !unauthed.allowed && unauthed.status === 401);
  } else {
    assert("unconfigured api access returns 503", !unauthed.allowed && unauthed.status === 503);
  }

  if (failed) process.exit(1);
  console.log("\nAll Step 7.3 admin auth checks passed");
}

void main();
