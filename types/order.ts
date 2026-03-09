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
