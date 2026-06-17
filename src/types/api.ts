import type { FinanceData } from "./finance";

export interface ApiUser {
  id: string;
  username: string;
  email: string;
}

export interface ApiAuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiBudgetData {
  finance_data: FinanceData;
  dark_mode: boolean;
  currency: string;
  updated_at?: string;
}

export interface ApiSetupStatus {
  needsSetup: boolean;
  authEnabled: boolean;
}
