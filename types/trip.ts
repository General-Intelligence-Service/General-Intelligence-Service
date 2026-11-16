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
  notes: string | null;
};

export type Trip = {
  id: string;
  organization: string;
  recipient: string;
  destination: string;
  tripDate: string;
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
  notes?: string | null;
};

export type TripInput = {
  organization: string;
  recipient: string;
  destination: string;
  tripDate: string;
  status?: TripStatus;
  notes?: string | null;
  gifts: TripGiftInput[];
};
