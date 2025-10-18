export type CustomerStatus = 'active' | 'pending';

export type Customer = {
  id: string;
  email: string;
  phone: string;
  planInfo: string; // Used for pending, can be free text. For active, it's calculated.
  status: CustomerStatus;
  avatarUrl: string;
  switchClicks: number;
  purchaseDate: string; // ISO 8601 date string
  planDuration?: '1 year' | '3 years'; // Optional, for active customers
  expirationDate?: string; // Optional, calculated for active customers
  isArchived: boolean;
};
