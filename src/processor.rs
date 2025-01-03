use borsh::io::Error;
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use spl_token;

use crate::state::PoolData;

pub fn add_liquidity(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let admin_account = next_account_info(accounts_iter)?;
    let admin_token_account = next_account_info(accounts_iter)?;
    let liquidity_token_account = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;
    let token_program_id = next_account_info(accounts_iter)?;

    let liquidity_data =
        u64::from_le_bytes(instruction_data.try_into().expect("Invalid liquidity data"));

    let mut pool_data = try_from_slice_unchecked::<PoolData>(*pool_account.data.borrow()).unwrap();

    if admin_account.key.to_string() != pool_data.owner {
        msg!(
            "{} {} accounts here",
            admin_account.key.to_string(),
            pool_data.owner
        );
        return Err(ProgramError::IncorrectProgramId);
    }
    // Transfer liquidity tokens to the pool
    transfer_tokens(
        &[
            admin_token_account.clone(),
            liquidity_token_account.clone(),
            token_program_id.clone(),
            admin_account.clone(),
        ],
        liquidity_data,
    )?;

    pool_data.total_liquidity += liquidity_data;
    pool_data.available_rewards += liquidity_data; // Add to available rewards

    pool_data.serialize(&mut &mut pool_account.try_borrow_mut_data()?[..])?;
    msg!("Liquidity added: {}", liquidity_data);
    Ok(())
}

pub fn remove_liquidity(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let liquidity_account = next_account_info(accounts_iter)?;
    let admin_account = next_account_info(accounts_iter)?;
    let liquidity_token_account = next_account_info(accounts_iter)?;
    let admin_token_account = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;
    let token_program_id = next_account_info(accounts_iter)?;

    let mut pool_data = try_from_slice_unchecked::<PoolData>(*pool_account.data.borrow()).unwrap();

    if admin_account.key != &pool_data.owner.parse::<Pubkey>().unwrap() {
        return Err(ProgramError::IncorrectProgramId);
    }
    let tokens_to_remove = pool_data.total_liquidity;
    pool_data.total_liquidity = 0;
    pool_data.available_rewards = 0; // Add to available rewards
                                     // Transfer liquidity tokens to the pool
    transfer_tokens(
        &[
            liquidity_token_account.clone(),
            admin_token_account.clone(),
            token_program_id.clone(),
            liquidity_account.clone(),
        ],
        tokens_to_remove,
    )?;

    pool_data.serialize(&mut &mut pool_account.try_borrow_mut_data()?[..])?;
    Ok(())
}

pub fn calculate_rewards(pool_data: &PoolData, _staker_amount: u64, staker_share: u64) -> u64 {
    // Calculate rewards based on the staker's share in the total liquidity pool
    let total_rewards = pool_data.available_rewards;
    let reward_percentage = staker_share * 100 / pool_data.total_liquidity;

    total_rewards * reward_percentage / 100
}

pub fn claim_rewards(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let admin_account = next_account_info(accounts_iter)?;
    let admin_token_account = next_account_info(accounts_iter)?;
    let staker_token_account = next_account_info(accounts_iter)?;
    let token_program_id = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;
    let staker_account = next_account_info(accounts_iter)?;

    let mut pool_data =
        try_from_slice_unchecked::<crate::state::PoolData>(*pool_account.data.borrow()).unwrap();

    let current_user_stake = pool_data
        .total_stakes
        .iter()
        .find(|&i| i.user == staker_account.key.to_string())
        .expect("UserNot found");

    // Calculate reward share based on liquidity share
    let staker_share = current_user_stake.amount * 100 / pool_data.total_liquidity;

    let reward_amount = calculate_rewards(&pool_data, current_user_stake.amount, staker_share);

    transfer_tokens(
        &[
            admin_token_account.clone(),
            staker_token_account.clone(),
            token_program_id.clone(),
            admin_account.clone(),
        ],
        reward_amount,
    )?;

    // Reduce the available rewards in the pool
    pool_data.available_rewards -= reward_amount;

    pool_data.serialize(&mut &mut pool_account.try_borrow_mut_data()?[..])?;
    Ok(())
}

pub fn update_pool_rewards(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let admin_account = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;

    let reward_data = u64::from_le_bytes(instruction_data.try_into().expect("Invalid reward data"));

    let mut pool_data =
        try_from_slice_unchecked::<crate::state::PoolData>(*pool_account.data.borrow()).unwrap();

    // Only allow the admin to update the reward pool
    if admin_account.key != &pool_data.owner.parse::<Pubkey>().unwrap() {
        return Err(ProgramError::IncorrectProgramId);
    }

    pool_data.available_rewards += reward_data;

    pool_data.serialize(&mut &mut pool_account.try_borrow_mut_data()?[..])?;
    msg!("Pool rewards updated: {}", reward_data);
    Ok(())
}

pub fn create_stake_pool(
    _pubkey: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let _admin_account = next_account_info(accounts_iter)?;
    let _pool_owner_account = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;
    let _program_id = next_account_info(accounts_iter)?;

    // if !(program_id.owner.to_string() == admin_account.key.to_string()) {
    //     msg!(
    //         "{}, {}",
    //         program_id.owner.to_string(),
    //         admin_account.key.to_string()
    //     );
    //     return Err((ProgramError::InvalidAccountOwner));
    // }
    let mut pool_data =
        try_from_slice_unchecked::<crate::state::PoolData>(*pool_account.data.borrow()).unwrap();

    let pool_data_ = crate::state::PoolData::try_from_slice(&instruction_data)?;

    pool_data.id = pool_data_.id;
    pool_data.token = pool_data_.token;
    pool_data.reward_timelines = pool_data_.reward_timelines;
    pool_data.reward_percentages = pool_data_.reward_percentages;
    pool_data.owner = pool_data_.owner;
    pool_data.total_stakes = pool_data_.total_stakes;
    pool_data.available_rewards = pool_data_.available_rewards;
    pool_data.total_liquidity = pool_data_.total_liquidity;

    pool_data.serialize(&mut &mut pool_account.try_borrow_mut_data()?[..])?;
    msg!("{}", pool_data.id);
    Ok(())
}

pub fn stake_tokens(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let staker_account = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;
    let staker_token_account = next_account_info(accounts_iter)?;
    let pool_owner_token_account = next_account_info(accounts_iter)?;
    let token_program_id = next_account_info(accounts_iter)?;
    let token_address = next_account_info(accounts_iter)?;

    let mut pool_data =
        try_from_slice_unchecked::<crate::state::PoolData>(*pool_account.data.borrow()).unwrap();

    let stake_data = crate::state::StakeAmount::try_from_slice(&instruction_data)?;

    if stake_data.amount > 0 && token_address.key.to_string() == pool_data.token {
        transfer_tokens(
            &[
                staker_token_account.clone(),
                pool_owner_token_account.clone(),
                token_program_id.clone(),
                staker_account.clone(),
            ],
            stake_data.amount,
        )
        .expect("transfer tokens error");
        pool_data.total_stakes.push(stake_data);
        pool_data.serialize(&mut &mut pool_account.try_borrow_mut_data()?[..])?;
    }
    Ok(())
}

pub fn unstake_tokens(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let staker_account = next_account_info(accounts_iter)?;
    let staker_token_account = next_account_info(accounts_iter)?;
    let admin_account = next_account_info(accounts_iter)?;
    let admin_token_account = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;
    let token_program_id = next_account_info(accounts_iter)?;

    let mut pool_data =
        try_from_slice_unchecked::<crate::state::PoolData>(*pool_account.data.borrow()).unwrap();

    match pool_data
        .total_stakes
        .iter()
        .position(|stake| stake.user == staker_account.key.to_string())
    {
        Some(current_user_stake_index) => {
            // Successfully found the user's stake
            let current_user_stake = pool_data.total_stakes[current_user_stake_index].clone();

            if current_user_stake.amount != 0 {
                // Remove the user's stake
                pool_data.total_stakes.remove(current_user_stake_index);

                // Perform the token transfer
                transfer_tokens(
                    &[
                        admin_token_account.clone(),
                        staker_token_account.clone(),
                        token_program_id.clone(),
                        admin_account.clone(),
                    ],
                    current_user_stake.amount,
                )
                .expect("transfer tokens error");

                // Serialize the updated pool data back into the account
                pool_data.serialize(&mut &mut pool_account.try_borrow_mut_data()?[..])?;
            }
        }
        None => {
            // User's stake was not found
            return Err(ProgramError::InvalidArgument); // or any appropriate error type
        }
    }
    Ok(())
}

pub fn transfer_tokens(accounts: &[AccountInfo; 4], amount: u64) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let from_token_account = next_account_info(accounts_iter)?;
    let to_token_account = next_account_info(accounts_iter)?;
    let token_program_id = next_account_info(accounts_iter)?;
    let authority_id = next_account_info(accounts_iter)?;

    let ix = spl_token::instruction::transfer(
        token_program_id.key,
        from_token_account.key,
        to_token_account.key,
        authority_id.key,
        &[authority_id.key],
        amount,
    )?;

    invoke(
        &ix,
        &[
            from_token_account.clone(),
            to_token_account.clone(),
            token_program_id.clone(),
            authority_id.clone(),
        ],
    )?;

    Ok(())
}

pub fn try_from_slice_unchecked<T: BorshDeserialize>(data: &[u8]) -> Result<T, Error> {
    let mut data_mut = data;
    let result = T::deserialize(&mut data_mut)?;
    Ok(result)
}
