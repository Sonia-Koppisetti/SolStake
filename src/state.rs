use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct PoolData {
    pub id: String,
    pub token: String,
    pub reward_timelines: Vec<u8>,
    pub reward_percentages: Vec<u8>,
    pub total_stakes: Vec<StakeAmount>,
}

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone)]
pub struct StakeAmount {
    pub amount: u64,
    pub duration: u8,
    pub user: String,
    pub starts_at: i64,
}
