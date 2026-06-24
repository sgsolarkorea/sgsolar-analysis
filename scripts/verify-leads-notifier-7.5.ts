/**
 * Step 7.5 — Solapi lead notifier verification
 */
import {
  buildLeadSmsText,
  getSolapiConfig,
  isSolapiEnabled,
  sendLeadKakaoNotification,
  sendLeadSmsNotification,
} from "../src/lib/leads/adapters/solapi";
import { LEAD_CRM_DEFAULTS } from "../src/lib/leads/leadRecordHelpers";
import { notifyLeadCreated } from "../src/lib/leads/notifier";
import type { LeadRecord } from "../src/types/lead";

const sampleLead: LeadRecord = {
  id: "test-id",
  createdAt: new Date().toISOString(),
  leadType: "consultation",
  status: "new",
  source: "consultation",
  name: "홍길동",
  phone: "010-1234-5678",
  address: "충남 서산시 대산읍",
  estimatedCapacityKw: 300,
  ...LEAD_CRM_DEFAULTS,
};

let failed = 0;

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failed += 1;
  } else {
    console.log(`OK: ${label}`);
  }
}

async function withEnv(
  env: Record<string, string | undefined>,
  fn: () => Promise<void> | void,
): Promise<void> {
  const backup: Record<string, string | undefined> = {};
  for (const key of Object.keys(env)) {
    backup[key] = process.env[key];
    const value = env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(backup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function main() {
  await withEnv({ SOLAPI_ENABLED: "false" }, async () => {
    assert("SOLAPI disabled flag", !isSolapiEnabled());
    assert("config null when disabled", getSolapiConfig() === null);

    const sms = await sendLeadSmsNotification(sampleLead);
    assert("sms skipped when disabled", sms.skipped === true && sms.ok === true);

    const kakao = await sendLeadKakaoNotification(sampleLead);
    assert("kakao skipped when disabled", kakao.skipped === true && kakao.ok === true);
  });

  await withEnv(
    {
      SOLAPI_ENABLED: "true",
      SOLAPI_API_KEY: "",
      SOLAPI_API_SECRET: "",
      SOLAPI_SENDER: "",
      SOLAPI_ADMIN_PHONE: "",
    },
    async () => {
      assert("enabled without keys", isSolapiEnabled());
      assert("config null when misconfigured", getSolapiConfig() === null);

      const sms = await sendLeadSmsNotification(sampleLead);
      assert("sms graceful fail without keys", sms.ok === false && Boolean(sms.error));

      const kakao = await sendLeadKakaoNotification(sampleLead);
      assert("kakao graceful fail without keys", kakao.ok === false && Boolean(kakao.error));
    },
  );

  const smsText = buildLeadSmsText(sampleLead);
  assert("sms text includes HOT priority", smsText.includes("유형: HOT"));
  assert("sms text includes admin url", smsText.includes("/admin/leads"));
  assert("sms text includes capacity", smsText.includes("300kW"));

  await withEnv({ SOLAPI_ENABLED: "false" }, async () => {
    const result = await notifyLeadCreated({ ...sampleLead, leadType: "save_result" });
    assert("notifier solapi_sms skipped", result.adapters.solapi_sms?.skipped === true);
    assert("notifier solapi_kakao skipped", result.adapters.solapi_kakao?.skipped === true);
    assert("notifier admin_dashboard ok", result.adapters.admin_dashboard?.ok === true);
  });

  if (failed) process.exit(1);
  console.log("\nAll Step 7.5 Solapi notifier checks passed");
}

void main();
