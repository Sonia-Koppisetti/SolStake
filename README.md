# Solana Staking Contract

This project is a Solana-based staking contract that allows users to stake and unstake tokens. It also supports reward calculation for staking. The contract is written in Rust and deploys on the Solana blockchain.

## Features

- **Stake Tokens**: Users can stake tokens for a specific duration.
- **Unstake Tokens**: Users can withdraw their staked tokens after the staking duration ends.
- **Claim Rewards**: Users can claim staking rewards based on the duration and amount staked.

---

## Prerequisites

To deploy and interact with this contract, you need the following:

- Rust: Installed and updated to the latest stable version. Follow the [Rust installation guide](https://www.rust-lang.org/tools/install).
- Solana CLI: Installed and configured. Follow the [Solana installation guide](https://docs.solana.com/cli/install-solana-cli-tools).
- Node.js (for scripts and integration): Download and install from [Node.js](https://nodejs.org/).
- Anchor (optional, for advanced interaction): Follow the [Anchor installation guide](https://project-serum.github.io/anchor/getting-started/installation.html).

---

## Installation

1. Clone this repository:

2. Run Smart Contracts:
   ```bash
   
   git clone https://github.com/your-username/solana-staking-contract.git
   cd solana-staking-contract
   cargo build-bpf
   solana program deploy target/deploy/staking_contract.so

3. Run Smart Contract Client

   ```bash
   npm install
