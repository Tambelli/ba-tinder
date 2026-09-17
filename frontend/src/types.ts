export type Role = "BRAND" | "OPS" | "CREATOR";
export type MatchMode = "MEDIATED" | "DOUBLE_OPT_IN";
export type CommissionMode = "INCLUDED" | "ADDED";
export type Stage =
  | "REQUESTED"
  | "CONTACTING"
  | "AWAITING_CREATOR"
  | "ACCEPTED"
  | "NEGOTIATING"
  | "CLOSED"
  | "DECLINED"
  | "CANCELLED";
export interface Session {
  authenticated: boolean;
  username: string;
  role: Role | "";
  csrfToken: string;
  demo: boolean;
  matchMode: MatchMode;
  commissionMode: CommissionMode;
}
export interface Creator {
  id: number;
  name: string;
  handle: string;
  creatorNiche: string;
  productNiche: string;
  state: string;
  city: string;
  followers: number;
  engagement: number;
  bio: string;
  color: string;
}
export interface Quote {
  budgetCents: number;
  commissionCents: number;
  executionCents: number;
  totalCents: number;
  commissionMode: CommissionMode;
}
export interface Deal extends Quote {
  id: string;
  brandId: string;
  creator: Creator;
  matchMode: MatchMode;
  status: Stage;
  brief: string;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
  events: { actor: string; status: Stage; note: string; createdAt: string }[];
}
export type Filters = Partial<
  Record<
    | "productNiche"
    | "creatorNiche"
    | "state"
    | "minFollowers"
    | "maxFollowers"
    | "minEngagement"
    | "maxEngagement",
    string
  >
>;
