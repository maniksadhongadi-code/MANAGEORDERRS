export type CustomerStatus = 'active' | 'pending';

export type Customer = {
  id: string;
  email: string;
  phone: string;
  planInfo: string; // Used for pending, can be free text. For active, it's calculated.
  status: CustomerStatus;
  avatarUrl: string;
  switchClicks: number;
  restoreClicks?: number; // Added for 3-click restore
  deleteClicks?: number; // Added for 5-click delete
  purchaseDate: string; // ISO 8601 date string
  planDuration: '1 year' | '3 years';
  expirationDate: string;
  isArchived: boolean;
  reasonForArchival?: string;
  notes?: string;
  followUpDate?: string; // ISO 8601 date string for follow-up
  hasAccessPlan?: boolean;
  autodeskApp?: string;
};

export type AutodeskApp = {
  id: string;
  name: string;
};
