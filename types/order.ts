/** عنصر طلبية واحد (منتج + كمية) */
export interface OrderItemPayload {
  slug: string;
  sku: string;
  name: string;
  quantity: number;
  giftTier?: string;
  category?: string;
}

/** طلبية كاملة كما تُحفظ في Firestore */
export interface OrderPayload {
  date: string; // ISO date string
  requesterName: string;
  notes?: string;
  items: OrderItemPayload[];
  totalPieces: number;
  userId?: string; // إن وُجد تسجيل دخول
  userEmail?: string;
  createdAt: string; // ISO string
}

export interface OrderRecord extends OrderPayload {
  id: string;
}

const ORDERS_STORAGE_KEY = "orders_history";

export function getStoredOrders(): OrderRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveOrderToHistory(order: OrderRecord): void {
  if (typeof window === "undefined") return;
  try {
    const list = getStoredOrders();
    list.unshift(order);
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** مسودة طلبية (قبل التصدير) */
export interface OrderDraft {
  items: { slug: string; quantity: number }[];
  requesterName: string;
  orderNotes: string;
  savedAt: string;
}

const DRAFT_STORAGE_KEY = "order_draft";

export function getOrderDraft(): OrderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrderDraft;
  } catch {
    return null;
  }
}

export function saveOrderDraft(draft: OrderDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearOrderDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
