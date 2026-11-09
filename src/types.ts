export interface Charity {
  id: string;
  name: string;
  ein_tax_id?: string;
  website: string;
  wallet_address: string;
  description: string;
  avatar_url: string;
  is_verified: boolean;
  total_donations_sol: number;
  created_at?: string;
}

export interface Launch {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_url: string;
  metadata_uri: string;
  creator_wallet: string;
  charity_id: string;
  donation_bps: number; // e.g. 2500 = 25%
  is_immutable: boolean;
  tx_signature: string;
  config_pda?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  is_featured: boolean;
  market_cap_sol: number;
  bonding_curve_progress: number; // 0 to 100%
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

export interface Donation {
  id: string;
  launch_id: string | null;
  charity_id: string;
  amount_sol: number;
  tx_signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  distribution_type: 'fee_share_distribution' | 'initial_dev_pledge' | 'direct_donation';
  created_at: string;
}

export interface NetworkStatus {
  network: string;
  rpcUrl: string;
  rpcHealthy: boolean;
  pumpFunProgramId: string;
  pumpFeesProgramId: string;
}

export interface AdminSession {
  token: string;
  email: string;
  role: string;
}
