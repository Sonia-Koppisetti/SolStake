use borsh::{BorshDeserialize, BorshSerialize};

use borsh::io::Error;
use solana_program::address_lookup_table::program;
use solana_program::clock::Clock;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

// use spl_token;

pub fn create_stake_pool(
    pubkey: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let admin_account = next_account_info(accounts_iter)?;
    let staked_token = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;
    let mut pool_data =
        try_from_slice_unchecked::<crate::state::PoolData>(*pool_account.data.borrow()).unwrap();

    let pool_data_ = crate::state::PoolData::try_from_slice(&instruction_data)?;

    pool_data.id = pool_data_.id;
    pool_data.token = pool_data_.token;
    pool_data.reward_timelines = pool_data_.reward_timelines;
    pool_data.reward_percentages = pool_data_.reward_percentages;

    pool_data.serialize(&mut &mut pool_account.try_borrow_mut_data()?[..])?;
    msg!("{}", pool_data.id);
    Ok(())
}

pub fn stake_tokens(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let staker_account = next_account_info(accounts_iter)?;
    let pool_account = next_account_info(accounts_iter)?;
    let staker_token_account = next_account_info(accounts_iter)?;
    let pool_owner_token_account = next_account_info(accounts_iter)?;
    let token_program_id = next_account_info(accounts_iter)?;

    let mut pool_data =
        try_from_slice_unchecked::<crate::state::PoolData>(*pool_account.data.borrow()).unwrap();

    let stake_data = crate::state::StakeAmount::try_from_slice(&instruction_data)?;

    if stake_data.amount > 0 {
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
    }
    Ok(())
}

pub fn unstake_tokens(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
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

    let current_user_stake = pool_data
        .total_stakes
        .iter()
        .find(|&i| i.user == staker_account.key.to_string())
        .expect("UserNot found");

    if current_user_stake.amount != 0 {
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
    }

    Ok(())
}

pub fn claim_rewards(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
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

    let mut current_user_stake = pool_data
        .total_stakes
        .iter()
        .find(|&i| i.user == staker_account.key.to_string())
        .expect("UserNot found");

    let user_stake_start_time = current_user_stake.clone();
    let clock = Clock::get();
    let difference = user_stake_start_time.starts_at - clock.unwrap().unix_timestamp;
    let difference_in_days = difference / 86400;

    let claim_percentage = find_nearest_index(difference_in_days, &pool_data.reward_timelines)
        .expect("Unable to find nearest percentage");

    transfer_tokens(
        &[
            admin_token_account.clone(),
            staker_token_account.clone(),
            token_program_id.clone(),
            admin_account.clone(),
        ],
        pool_data.reward_percentages[claim_percentage] as u64 * current_user_stake.amount / 100,
    )
    .expect("transfer tokens error");
    Ok(())
}

pub fn create_pda_account(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();

    let payer_account_info = next_account_info(account_info_iter)?;
    let pda_account_info = next_account_info(account_info_iter)?;
    let rent_sysvar_account_info = &Rent::from_account_info(next_account_info(account_info_iter)?)?;

    // find space and minimum rent required for account
    let space = instruction_data[0];
    let bump = instruction_data[1];
    let rent_lamports = rent_sysvar_account_info.minimum_balance(space.into());

    invoke_signed(
        &system_instruction::create_account(
            &payer_account_info.key,
            &pda_account_info.key,
            rent_lamports,
            space.into(),
            program_id,
        ),
        &[payer_account_info.clone(), pda_account_info.clone()],
        &[&[&payer_account_info.key.as_ref(), &[bump]]],
    )?;

    Ok(())
}

fn find_nearest_index(target: i64, numbers: &[u8]) -> Option<usize> {
    numbers
        .iter()
        .enumerate()
        .min_by_key(|&(_, &value)| {
            let diff = (value as i64) - target; // Cast `u8` to `i64`
            diff.abs() // Get the absolute difference
        })
        .map(|(index, _)| index) // Return the index of the nearest number
}

/* Internal Method to transfer tokens */
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

/* Internal Method to Deserialize Data  */
pub fn try_from_slice_unchecked<T: BorshDeserialize>(data: &[u8]) -> Result<T, Error> {
    let mut data_mut = data;
    let result = T::deserialize(&mut data_mut)?;
    Ok(result)
}
