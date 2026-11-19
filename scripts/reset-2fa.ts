/**
 * إعادة ضبط التحقق الثنائي (2FA) لحساب محدد — للمطوّر فقط، يُشغَّل يدوياً من الطرفية.
 *
 * الاستخدام (من جذر المشروع، مع متغيرات البيئة من .env.local):
 *   npx tsx --env-file=.env.local scripts/reset-2fa.ts admin@example.com --yes
 *
 * يعطّل 2FA ويمسح السر والرموز الاحتياطية ويُسجّل العملية في سجل النشاط.
 * لا يطبع أي أسرار.
 */

import { sql } from "@vercel/postgres";
import { ensureAdminSecurityTable } from "../lib/admin-security-db";
import { ensureAuditLogTable, writeAuditLog } from "../lib/audit-log";

const SCRIPT_ACTOR = "script:reset-2fa";

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const email = (args.find((a) => !a.startsWith("--")) ?? "").trim().toLowerCase();
  const confirmed = args.includes("--yes");

  if (!email || !email.includes("@")) {
    fail("أدخل البريد الإلكتروني للحساب: npx tsx scripts/reset-2fa.ts admin@example.com --yes");
  }
  if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
    fail("POSTGRES_URL غير مضبوط. شغّل السكربت مع --env-file=.env.local");
  }
  if (!confirmed) {
    fail("أضف --yes للتأكيد. العملية تعطّل 2FA لهذا الحساب فوراً.");
  }

  await ensureAdminSecurityTable();
  await ensureAuditLogTable();

  const existing = await sql`
    SELECT totp_enabled FROM admin_security WHERE email = ${email} LIMIT 1
  `;
  if (existing.rows.length === 0) {
    console.log(`ℹ لا يوجد إعداد 2FA للحساب ${email}. لا شيء يُعدّل.`);
    process.exit(0);
  }
  const wasEnabled = Boolean(existing.rows[0]?.totp_enabled);

  await sql`
    UPDATE admin_security
    SET totp_enabled = false,
        totp_secret_enc = NULL,
        pending_secret_enc = NULL,
        backup_code_hashes = '[]'::jsonb,
        last_totp_step = NULL,
        updated_at = NOW()
    WHERE email = ${email}
  `;

  await writeAuditLog({
    actorEmail: SCRIPT_ACTOR,
    action: "auth.2fa_reset_admin",
    targetType: "حساب",
    targetId: email,
    targetLabel: email,
    changes: { totpEnabled: { from: wasEnabled, to: false } },
    ip: "local-cli",
    userAgent: "reset-2fa script",
    result: "success",
  });

  console.log(`✔ تمت إعادة ضبط التحقق الثنائي للحساب ${email} وسُجّلت العملية في سجل النشاط.`);
  console.log("  عند الدخول التالي سيُطلب إعداد 2FA من جديد إن كان REQUIRE_2FA مفعّلاً.");
  process.exit(0);
}

main().catch((e) => {
  console.error("✖ فشلت العملية:", e instanceof Error ? e.message : e);
  process.exit(1);
});
