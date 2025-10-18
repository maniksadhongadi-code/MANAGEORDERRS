import type { Customer } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getAvatar = (index: number) => PlaceHolderImages[index % PlaceHolderImages.length].imageUrl;

const now = new Date();

export const initialCustomers: Customer[] = [
  {
    id: '1',
    email: 'chloe.miller@example.com',
    phone: '555-0101',
    planInfo: '', // Will be calculated
    status: 'active',
    avatarUrl: getAvatar(0),
    switchClicks: 0,
    purchaseDate: new Date(now.setDate(now.getDate() - 700)).toISOString(),
    planDuration: '3 years',
  },
  {
    id: '2',
    email: 'liam.jones@example.com',
    phone: '555-0102',
    planInfo: '', // Will be calculated
    status: 'active',
    avatarUrl: getAvatar(1),
    switchClicks: 0,
    purchaseDate: new Date(now.setDate(now.getDate() - 300)).toISOString(),
    planDuration: '1 year',
  },
  {
    id: '3',
    email: 'sophia.davis@example.com',
    phone: '555-0103',
    planInfo: '', // Will be calculated
    status: 'active',
    avatarUrl: getAvatar(2),
    switchClicks: 0,
    purchaseDate: new Date(now.setDate(now.getDate() - 335)).toISOString(),
    planDuration: '1 year',
  },
  {
    id: '4',
    email: 'noah.williams@example.com',
    phone: '555-0104',
    planInfo: 'Purchased 2 weeks ago',
    status: 'pending',
    avatarUrl: getAvatar(3),
    switchClicks: 0,
    purchaseDate: new Date(now.setDate(now.getDate() - 14)).toISOString(),
  },
  {
    id: '5',
    email: 'ava.brown@example.com',
    phone: '555-0105',
    planInfo: 'Purchased 1 month ago',
    status: 'pending',
    avatarUrl: getAvatar(4),
    switchClicks: 0,
    purchaseDate: new Date(now.setDate(now.getDate() - 30)).toISOString(),
  },
];
