export type TripGiftType = "catalog" | "other";
export type TripStatus = "open" | "returned";

export type TripGift = {
  id: string;
  giftType: TripGiftType;
  productSlug: string | null;
  productName: string | null;
  customName: string | null;
  quantity: number;
  deliveredTo: string | null;
  /** الكمية المُسلَّمة عند العودة */
  deliveredQty: number;
  /** الكمية المُرجعة للمخزون عند العودة */
  returnedQty: number;
  notes: string | null;
};

export type Trip = {
  id: string;
  organization: string;
  recipient: string;
  destination: string;
  tripDate: string;
  returnDate: string | null;
  status: TripStatus;
  notes: string | null;
  gifts: TripGift[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripGiftInput = {
  giftType: TripGiftType;
  productSlug?: string | null;
  customName?: string | null;
  quantity: number;
  deliveredTo?: string | null;
  deliveredQty?: number;
  returnedQty?: number;
  notes?: string | null;
};

export type TripInput = {
  organization: string;
  recipient: string;
  destination: string;
  tripDate: string;
  returnDate?: string | null;
  status?: TripStatus;
  notes?: string | null;
  gifts: TripGiftInput[];
};

export type TripReturnGiftInput = {
  giftId: string;
  deliveredQty: number;
  returnedQty: number;
  deliveredTo?: string | null;
};
