import type { Customer } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getAvatar = (index: number) => PlaceHolderImages[index % PlaceHolderImages.length].imageUrl;

export const initialCustomers: Customer[] = [
  {
    id: '1',
    email: 'chloe.miller@example.com',
    phone: '555-0101',
    tenure: '3 years',
    status: 'active',
    avatarUrl: getAvatar(0),
    switchClicks: 0,
  },
  {
    id: '2',
    email: 'liam.jones@example.com',
    phone: '555-0102',
    tenure: '1 year',
    status: 'active',
    avatarUrl: getAvatar(1),
    switchClicks: 0,
  },
  {
    id: '3',
    email: 'sophia.davis@example.com',
    phone: '555-0103',
    tenure: '1 year',
    status: 'active',
    avatarUrl: getAvatar(2),
    switchClicks: 0,
  },
  {
    id: '4',
    email: 'noah.williams@example.com',
    phone: '555-0104',
    tenure: 'Purchased 2 weeks ago',
    status: 'pending',
    avatarUrl: getAvatar(3),
    switchClicks: 0,
  },
  {
    id: '5',
    email: 'ava.brown@example.com',
    phone: '555-0105',
    tenure: 'Purchased 1 month ago',
    status: 'pending',
    avatarUrl: getAvatar(4),
    switchClicks: 0,
  },
];
