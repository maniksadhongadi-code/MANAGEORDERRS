export type CustomerStatus = 'active' | 'pending';

export type Customer = {
  id: string;
  email: string;
  phone: string;
  tenure: string;
  status: CustomerStatus;
  avatarUrl: string;
  switchClicks: number;
};
