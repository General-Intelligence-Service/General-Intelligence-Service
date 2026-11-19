import { sql } from "@vercel/postgres";

export type AdminSecurityRow = {
  email: string;
  totpSecretEnc: string | null;
  totpEnabled: boolean;
  backupCodeHashes: string[];
  lastTotpStep: number | null;
  pendingSecretEnc: string | null;
  updatedAt: string | null;
};

let initDone = false;

export function isSecurityDbConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export async function ensureAdminSecurityTable(): Promise<void> {
  if (initDone) return;
  if (!isSecurityDbConfigured()) {
    throw new Error("Postgres غير مُعدّ — مطلوب لتخزين إعدادات 2FA");
  }
  await sql`
    CREATE TABLE IF NOT EXISTS admin_security (
      email VARCHAR(255) PRIMARY KEY,
      totp_secret_enc TEXT,
      totp_enabled BOOLEAN NOT NULL DEFAULT false,
      backup_code_hashes JSONB NOT NULL DEFAULT '[]',
      last_totp_step BIGINT,
      pending_secret_enc TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  initDone = true;
}

function rowToSecurity(r: Record<string, unknown>): AdminSecurityRow {
  const hashes = r.backup_code_hashes;
  return {
    email: String(r.email),
    totpSecretEnc: r.totp_secret_enc != null ? String(r.totp_secret_enc) : null,
    totpEnabled: Boolean(r.totp_enabled),
    backupCodeHashes: Array.isArray(hashes) ? hashes.map(String) : [],
    lastTotpStep: r.last_totp_step != null ? Number(r.last_totp_step) : null,
    pendingSecretEnc: r.pending_secret_enc != null ? String(r.pending_secret_enc) : null,
    updatedAt: r.updated_at != null ? String(r.updated_at) : null,
  };
}

export async function getAdminSecurity(email: string): Promise<AdminSecurityRow | null> {
  await ensureAdminSecurityTable();
  const e = email.trim().toLowerCase();
  const { rows } = await sql`SELECT * FROM admin_security WHERE email = ${e} LIMIT 1`;
  if (!rows[0]) return null;
  return rowToSecurity(rows[0] as Record<string, unknown>);
}

/**
 * للاستخدام في تسجيل الدخول: إن تعذّر قراءة الحالة يرمي الخطأ (fail-closed)
 * حتى لا يُتجاوَز 2FA عند تعطّل قاعدة البيانات.
 */
export async function getTotpStatusStrict(email: string): Promise<boolean> {
  if (!isSecurityDbConfigured()) return false;
  const row = await getAdminSecurity(email);
  return Boolean(row?.totpEnabled && row.totpSecretEnc);
}

export async function isTotpEnabledForEmail(email: string): Promise<boolean> {
  if (!isSecurityDbConfigured()) return false;
  try {
    const row = await getAdminSecurity(email);
    return Boolean(row?.totpEnabled && row.totpSecretEnc);
  } catch (e) {
    console.error("isTotpEnabledForEmail:", e);
    return false;
  }
}

export async function upsertPendingSecret(
  email: string,
  pendingSecretEnc: string
): Promise<void> {
  await ensureAdminSecurityTable();
  const e = email.trim().toLowerCase();
  await sql`
    INSERT INTO admin_security (email, pending_secret_enc, updated_at)
    VALUES (${e}, ${pendingSecretEnc}, NOW())
    ON CONFLICT (email) DO UPDATE SET
      pending_secret_enc = EXCLUDED.pending_secret_enc,
      updated_at = NOW()
  `;
}

export async function enableTotp(
  email: string,
  totpSecretEnc: string,
  backupCodeHashes: string[]
): Promise<void> {
  await ensureAdminSecurityTable();
  const e = email.trim().toLowerCase();
  const hashesJson = JSON.stringify(backupCodeHashes);
  await sql`
    INSERT INTO admin_security (
      email, totp_secret_enc, totp_enabled, backup_code_hashes, pending_secret_enc, last_totp_step, updated_at
    )
    VALUES (
      ${e}, ${totpSecretEnc}, true, ${hashesJson}::jsonb, NULL, NULL, NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      totp_secret_enc = EXCLUDED.totp_secret_enc,
      totp_enabled = true,
      backup_code_hashes = EXCLUDED.backup_code_hashes,
      pending_secret_enc = NULL,
      last_totp_step = NULL,
      updated_at = NOW()
  `;
}

export async function disableTotp(email: string): Promise<void> {
  await ensureAdminSecurityTable();
  const e = email.trim().toLowerCase();
  await sql`
    INSERT INTO admin_security (email, totp_enabled, totp_secret_enc, backup_code_hashes, pending_secret_enc, last_totp_step, updated_at)
    VALUES (${e}, false, NULL, '[]'::jsonb, NULL, NULL, NOW())
    ON CONFLICT (email) DO UPDATE SET
      totp_enabled = false,
      totp_secret_enc = NULL,
      backup_code_hashes = '[]'::jsonb,
      pending_secret_enc = NULL,
      last_totp_step = NULL,
      updated_at = NOW()
  `;
}

export async function updateBackupCodeHashes(
  email: string,
  backupCodeHashes: string[]
): Promise<void> {
  await ensureAdminSecurityTable();
  const e = email.trim().toLowerCase();
  const hashesJson = JSON.stringify(backupCodeHashes);
  await sql`
    UPDATE admin_security
    SET backup_code_hashes = ${hashesJson}::jsonb, updated_at = NOW()
    WHERE email = ${e}
  `;
}

export async function setLastTotpStep(email: string, step: number): Promise<void> {
  await ensureAdminSecurityTable();
  const e = email.trim().toLowerCase();
  await sql`
    UPDATE admin_security
    SET last_totp_step = ${step}, updated_at = NOW()
    WHERE email = ${e}
  `;
}

export async function clearPendingSecret(email: string): Promise<void> {
  await ensureAdminSecurityTable();
  const e = email.trim().toLowerCase();
  await sql`
    UPDATE admin_security
    SET pending_secret_enc = NULL, updated_at = NOW()
    WHERE email = ${e}
  `;
}
