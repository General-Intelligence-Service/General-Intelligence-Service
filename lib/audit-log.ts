import { sql } from "@vercel/postgres";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/rate-limit";

export type AuditResult = "success" | "failure";

export type AuditChangeMap = Record<string, { from: unknown; to: unknown }>;

export type AuditEntryInput = {
  actorEmail: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  changes?: AuditChangeMap | null;
  ip?: string | null;
  userAgent?: string | null;
  result?: AuditResult;
};

export type AuditLogRow = {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  changes: AuditChangeMap | null;
  ip: string | null;
  userAgent: string | null;
  result: AuditResult;
};

let initDone = false;

export function isAuditDbConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export async function ensureAuditLogTable(): Promise<void> {
  if (initDone) return;
  if (!isAuditDbConfigured()) {
    throw new Error("Postgres غير مُعدّ — مطلوب لسجل النشاط");
  }
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor_email VARCHAR(255) NOT NULL,
      action VARCHAR(128) NOT NULL,
      target_type VARCHAR(64),
      target_id VARCHAR(255),
      target_label VARCHAR(512),
      changes JSONB,
      ip VARCHAR(64),
      user_agent VARCHAR(512),
      result VARCHAR(16) NOT NULL DEFAULT 'success'
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_email)`;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action)`;
  initDone = true;
}

function shortenUa(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const s = ua.trim();
  if (!s) return null;
  return s.length > 240 ? `${s.slice(0, 237)}…` : s;
}

/** يستخرج IP و User-Agent من الطلب دون تسجيل أسرار */
export function auditRequestMeta(request: NextRequest | Request): {
  ip: string;
  userAgent: string | null;
} {
  const ip =
    "headers" in request
      ? getClientIp(request as NextRequest)
      : "unknown";
  const ua =
    request.headers.get("user-agent") ??
    request.headers.get("User-Agent") ??
    null;
  return { ip, userAgent: shortenUa(ua) };
}

/**
 * إضافة سجل نشاط — لا يرمي للخارج؛ يطبع الخطأ فقط حتى لا تفشل العملية الأصلية.
 */
export async function writeAuditLog(entry: AuditEntryInput): Promise<void> {
  try {
    if (!isAuditDbConfigured()) return;
    await ensureAuditLogTable();
    const actor = (entry.actorEmail ?? "").trim() || "زائر";
    const action = entry.action.trim();
    if (!action) return;
    const result = entry.result === "failure" ? "failure" : "success";
    const changesJson =
      entry.changes && Object.keys(entry.changes).length > 0
        ? JSON.stringify(entry.changes)
        : null;
    await sql`
      INSERT INTO audit_logs (
        actor_email, action, target_type, target_id, target_label,
        changes, ip, user_agent, result
      )
      VALUES (
        ${actor},
        ${action},
        ${entry.targetType ?? null},
        ${entry.targetId ?? null},
        ${entry.targetLabel ?? null},
        ${changesJson}::jsonb,
        ${entry.ip ?? null},
        ${shortenUa(entry.userAgent)},
        ${result}
      )
    `;
  } catch (e) {
    console.error("audit-log write failed:", e);
  }
}

export type AuditQuery = {
  actorEmail?: string;
  action?: string;
  result?: AuditResult | "";
  q?: string;
  from?: string; // ISO date
  to?: string;
  page?: number;
  pageSize?: number;
};

function rowToAudit(r: Record<string, unknown>): AuditLogRow {
  let changes: AuditChangeMap | null = null;
  if (r.changes && typeof r.changes === "object") {
    changes = r.changes as AuditChangeMap;
  }
  return {
    id: String(r.id),
    timestamp: String(r.created_at),
    actorEmail: String(r.actor_email),
    action: String(r.action),
    targetType: r.target_type != null ? String(r.target_type) : null,
    targetId: r.target_id != null ? String(r.target_id) : null,
    targetLabel: r.target_label != null ? String(r.target_label) : null,
    changes,
    ip: r.ip != null ? String(r.ip) : null,
    userAgent: r.user_agent != null ? String(r.user_agent) : null,
    result: r.result === "failure" ? "failure" : "success",
  };
}

export async function queryAuditLogs(
  query: AuditQuery
): Promise<{ rows: AuditLogRow[]; total: number; page: number; pageSize: number }> {
  await ensureAuditLogTable();
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 50));
  const page = Math.max(1, query.page ?? 1);
  const offset = (page - 1) * pageSize;

  const actor = (query.actorEmail ?? "").trim().toLowerCase();
  const action = (query.action ?? "").trim();
  const result = query.result === "success" || query.result === "failure" ? query.result : "";
  const q = (query.q ?? "").trim();
  const from = (query.from ?? "").trim();
  const to = (query.to ?? "").trim();

  // بناء استعلام مرن عبر شروط اختيارية
  const { rows: countRows } = await sql`
    SELECT COUNT(*)::int AS c
    FROM audit_logs
    WHERE
      (${actor} = '' OR lower(actor_email) = ${actor})
      AND (${action} = '' OR action = ${action})
      AND (${result} = '' OR result = ${result})
      AND (${from} = '' OR created_at >= ${from}::timestamptz)
      AND (${to} = '' OR created_at <= ${to}::timestamptz)
      AND (
        ${q} = ''
        OR actor_email ILIKE ${"%" + q + "%"}
        OR action ILIKE ${"%" + q + "%"}
        OR COALESCE(target_label, '') ILIKE ${"%" + q + "%"}
        OR COALESCE(target_id, '') ILIKE ${"%" + q + "%"}
        OR COALESCE(ip, '') ILIKE ${"%" + q + "%"}
      )
  `;
  const total = Number((countRows[0] as { c: number })?.c ?? 0);

  const { rows } = await sql`
    SELECT *
    FROM audit_logs
    WHERE
      (${actor} = '' OR lower(actor_email) = ${actor})
      AND (${action} = '' OR action = ${action})
      AND (${result} = '' OR result = ${result})
      AND (${from} = '' OR created_at >= ${from}::timestamptz)
      AND (${to} = '' OR created_at <= ${to}::timestamptz)
      AND (
        ${q} = ''
        OR actor_email ILIKE ${"%" + q + "%"}
        OR action ILIKE ${"%" + q + "%"}
        OR COALESCE(target_label, '') ILIKE ${"%" + q + "%"}
        OR COALESCE(target_id, '') ILIKE ${"%" + q + "%"}
        OR COALESCE(ip, '') ILIKE ${"%" + q + "%"}
      )
    ORDER BY created_at DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  return {
    rows: rows.map((r) => rowToAudit(r as Record<string, unknown>)),
    total,
    page,
    pageSize,
  };
}

export async function getAuditLogById(id: string): Promise<AuditLogRow | null> {
  await ensureAuditLogTable();
  const { rows } = await sql`SELECT * FROM audit_logs WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) return null;
  return rowToAudit(rows[0] as Record<string, unknown>);
}

/** يحذف السجلات الأقدم من 365 يوماً */
export async function cleanupOldAuditLogs(retentionDays = 365): Promise<number> {
  await ensureAuditLogTable();
  const { rows } = await sql`
    WITH deleted AS (
      DELETE FROM audit_logs
      WHERE created_at < NOW() - (${retentionDays} || ' days')::interval
      RETURNING id
    )
    SELECT COUNT(*)::int AS c FROM deleted
  `;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

export async function getLastSuccessfulLogin(
  email: string
): Promise<{ timestamp: string; ip: string | null } | null> {
  if (!isAuditDbConfigured()) return null;
  try {
    await ensureAuditLogTable();
    const e = email.trim().toLowerCase();
    const { rows } = await sql`
      SELECT created_at, ip
      FROM audit_logs
      WHERE lower(actor_email) = ${e}
        AND action = 'auth.login_success'
        AND result = 'success'
      ORDER BY created_at DESC
      LIMIT 1 OFFSET 1
    `;
    // OFFSET 1 = الدخول السابق (الحالي هو الأحدث بعد تسجيل الدخول)
    if (!rows[0]) {
      // إن لم يوجد سابق، أعِد الأحدث
      const { rows: latest } = await sql`
        SELECT created_at, ip
        FROM audit_logs
        WHERE lower(actor_email) = ${e}
          AND action = 'auth.login_success'
          AND result = 'success'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (!latest[0]) return null;
      return {
        timestamp: String((latest[0] as { created_at: string }).created_at),
        ip: (latest[0] as { ip: string | null }).ip ?? null,
      };
    }
    return {
      timestamp: String((rows[0] as { created_at: string }).created_at),
      ip: (rows[0] as { ip: string | null }).ip ?? null,
    };
  } catch (e) {
    console.error("getLastSuccessfulLogin:", e);
    return null;
  }
}

export async function countFailedLoginsLast24h(): Promise<number> {
  if (!isAuditDbConfigured()) return 0;
  try {
    await ensureAuditLogTable();
    const { rows } = await sql`
      SELECT COUNT(*)::int AS c
      FROM audit_logs
      WHERE action IN ('auth.login_failed', 'auth.login_locked', 'auth.2fa_failed')
        AND result = 'failure'
        AND created_at >= NOW() - INTERVAL '24 hours'
    `;
    return Number((rows[0] as { c: number })?.c ?? 0);
  } catch (e) {
    console.error("countFailedLoginsLast24h:", e);
    return 0;
  }
}

/** مقارنة حقول منتج للتعديلات */
export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  fields: string[]
): AuditChangeMap {
  const changes: AuditChangeMap = {};
  if (!before || !after) return changes;
  for (const field of fields) {
    const from = before[field];
    const to = after[field];
    const fromS = JSON.stringify(from ?? null);
    const toS = JSON.stringify(to ?? null);
    if (fromS !== toS) {
      changes[field] = { from: from ?? null, to: to ?? null };
    }
  }
  return changes;
}
