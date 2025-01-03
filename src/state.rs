use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct PoolData {
    pub id: String,
    pub token: String,
    pub reward_timelines: Vec<u8>,
    pub reward_percentages: Vec<u8>,
    pub total_stakes: Vec<StakeAmount>,
    pub total_liquidity: u64,   // New field to track liquidity
    pub available_rewards: u64, // New field to track available rewards
    pub owner: String,
}

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct StakeAmount {
    pub amount: u64,
    pub duration: u8,
    pub user: String,
    pub starts_at: i64,
}


