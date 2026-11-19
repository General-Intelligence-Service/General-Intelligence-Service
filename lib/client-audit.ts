/** تسجيل أحداث من الواجهة دون انتظار النتيجة */
export function logClientAudit(input: {
  action: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  result?: "success" | "failure";
}): void {
  void fetch("/api/audit/client-event", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {});
}
