/** Shapes returned by `GET /api/admin/users/[userId]`. */

export interface UserDetails {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  telegramUsername: string | null;
  /** Legacy nickname (pre-AR customers) — only shown when there is no AR. */
  gameUsername: string | null;
  adventureRank: number | null;
  receiptEmail: string | null;
  createdAt: string;
  updatedAt: string;
  hasPassword: boolean;
  authProviders: string[];
  /** Set when this account is linked to a booster roster row (portal access). */
  linkedBoosterId: string | null;
}

export interface OrderLine {
  title: string | null;
  quantity: number | null;
  priceAtPurchase: string;
  startDate: string | null;
  endDate: string | null;
  addonChoice: string | null;
}

export interface Order {
  id: string;
  status: string;
  totalPrice: string;
  paymentId: string | null;
  userNotes: string | null;
  promocode: string | null;
  createdAt: string;
  updatedAt: string;
  boosterId: string | null;
  boosterName: string | null;
  items: OrderLine[];
}

export interface Review {
  id: string;
  rating: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface CartLine {
  id: string;
  serviceId: string;
  title: string | null;
  slug: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  startDate: string | null;
  endDate: string | null;
  addonChoice: string | null;
  createdAt: string;
}

export interface PromocodeUse {
  id: string;
  code: string | null;
  discountPercent: number | null;
  usedAt: string;
  orderId: string | null;
}

export interface Stats {
  totalSpent: number;
  totalOrders: number;
  paidOrders: number;
  totalReviews: number;
  avgOrder: number;
  maxOrder: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  daysSinceLastOrder: number | null;
  daysSinceRegistration: number;
  avgRating: number | null;
  statusCounts: Record<string, number>;
}

export interface MonthSpend {
  month: string;
  total: number;
}

export interface TopService {
  serviceId: string;
  title: string;
  count: number;
}

export interface UserDetailPayload {
  user: UserDetails;
  orders: Order[];
  reviews: Review[];
  cart: CartLine[];
  cartTotal: number;
  cartUpdatedAt: string | null;
  promocodeUses: PromocodeUse[];
  stats: Stats;
  monthlySpend: MonthSpend[];
  topServices: TopService[];
}
