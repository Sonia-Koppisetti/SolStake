use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instrucion_data: &[u8],
) -> ProgramResult {
    if instrucion_data.len() == 0 {
        return Err(ProgramError::InvalidInstructionData);
    }

    if instrucion_data[0] == 1 {
        return crate::processor::create_stake_pool(
            program_id,
            accounts,
            &instrucion_data[1..instrucion_data.len()],
        );
    }

    if instrucion_data[0] == 2 {
        return crate::processor::stake_tokens(
            program_id,
            accounts,
            &instrucion_data[1..instrucion_data.len()],
        );
    }

    if instrucion_data[0] == 3 {
        return crate::processor::unstake_tokens(
            program_id,
            accounts,
            &instrucion_data[1..instrucion_data.len()],
        );
    }

    if instrucion_data[0] == 4 {
        return crate::processor::claim_rewards(
            program_id,
            accounts,
            &instrucion_data[1..instrucion_data.len()],
        );
    }
    if instrucion_data[0] == 5 {
        return crate::processor::add_liquidity(
            program_id,
            accounts,
            &instrucion_data[1..instrucion_data.len()],
        );
    }
    if instrucion_data[0] == 6 {
        return crate::processor::remove_liquidity(
            program_id,
            accounts,
            &instrucion_data[1..instrucion_data.len()],
        );
    }

    msg!("Didn't found the entrypoint required");
    Err(ProgramError::InvalidInstructionData)
}
