import * as SolanaWeb3 from "@solana/web3.js";
import * as SplToken from "@solana/spl-token";
import { serialize, deserialize, Schema} from 'borsh'

class PoolData {
    id: string;
    token: string;
    reward_timelines: Uint8Array; // Use Uint8Array for arrays of u8
    reward_percentages: Uint8Array; // Use Uint8Array for arrays of u8
    total_stakes: Array<StakeAmountData>;
    total_liquidity:number;
    available_rewards:number;
    owner:string

    constructor(properties: { id: string; token: string; reward_timelines: Uint8Array; reward_percentages: Uint8Array, total_stakes :Array<StakeAmountData>, total_liquidity:number,available_rewards:number,owner:string }) {
        this.id = properties.id;
        this.token = properties.token;
        this.reward_timelines = properties.reward_timelines;
        this.reward_percentages = properties.reward_percentages;
        this.total_stakes = properties.total_stakes;
        this.total_liquidity = properties.total_liquidity;
        this.available_rewards = properties.available_rewards;
        this.owner = properties.owner;
    }
}




class StakeAmountData {
    amount:number;
    duration:number;
    user:string;
    starts_at: number;
    rewards_claimed_upto: number;

    constructor(fields:{amount: number, duration:number, user:string, starts_at:number, rewards_claimed_upto:number}){
        this.amount = fields.amount;
        this.duration = fields.duration;
        this.user = fields.user;
        this.starts_at = fields.starts_at;
        this.rewards_claimed_upto = fields.rewards_claimed_upto;
    }
}

const stakeSchema = {
    struct : {
        amount : 'u64',
        duration: 'u8',
        user:'string',
        starts_at: 'i64',
        rewards_claimed_upto:'u8'
    }
}

const schema = {
    struct : {
        id :'string',
        token: 'string',
        reward_timelines: { array : {type : 'u8'}},
        reward_percentages: { array: {type: 'u8'}},
        total_stakes: {array: {type: stakeSchema}},
        total_liquidity: 'u64',
        available_rewards:'u64',
        owner:'string'
    }
}

const ProgramId = new SolanaWeb3.PublicKey('BcFEM7BEJNC64Gy599QeRpKgrb3JHEEh4GdjqRcEhp6U')
const connection = new SolanaWeb3.Connection("https://api.devnet.solana.com",'confirmed')
    const FeePayerAccount = SolanaWeb3.Keypair.fromSecretKey(new Uint8Array(
        
        [19,181,212,119,106,158,68,159,225,158,220,54,108,209,44,87,9,191,249,243,150,152,155,9,57,123,154,162,102,94,255,134,65,79,200,251,209,199,74,235,122,87,90,68,65,145,97,1,50,152,83,105,189,251,86,237,198,208,182,51,197,53,233,96]
    ))
    const staker_account = SolanaWeb3.Keypair.fromSecretKey(new Uint8Array(
        [
            196, 205,  89,  18,  34, 132, 231, 209,   2,  65,  30,
            157, 108, 117, 132, 141,  87, 104, 122, 207,  96, 244,
            251, 154, 167,  93,  62, 122, 164, 134,  47, 148, 232,
             65,  84, 120,  81, 125,   3, 161, 211, 194, 232, 110,
            119, 162,   8,  12,   7,  86, 116, 203, 162, 196, 211,
            141,  38, 159, 198,  98, 130, 177,  40, 221
          ]
    )); //Need to change the staker 

    const liquidity_keypair = SolanaWeb3.Keypair.fromSecretKey(new Uint8Array(
        [
            15,  21, 249,   9,  40,  97, 105, 179, 107,  98, 181,
            61, 148, 189,  53, 125, 246, 100, 132, 132, 196, 203,
            65, 180, 210, 109,  10, 199,  27,  71,  19,  43,  41,
           112, 226,   4,  41,  21,  12,  48, 246, 196, 107, 195,
            38, 143, 230, 105, 205, 185, 171,  22,  87, 163, 243,
            92, 137, 236, 134,  38,  62, 206,  20,  22
         ]
    ));
    const pdaAccouunt = new SolanaWeb3.PublicKey('HUZ9GKtjwEb9MBDUzX896vuy53KcKKpfD9vD8fBYKz1K');
    const program_token_account = new SolanaWeb3.PublicKey('GqoyDWeDghNzdxdRsex5oKRLUw6E5hsRymg8xSnJEf8L');
    const token = new SolanaWeb3.PublicKey('A8CfmRr3feTenFrDDWKjhdRRe4pUCeTkojKoqwr1PX1Z');
    let poolAccount = new SolanaWeb3.PublicKey('Eu26cpAyNFoLwhZgu6nDAjT6bWaNbHewGtGHBhUMQUxg')
async function createPoolAccount() {

    
    const seedValue = token.toBase58().slice(0,10)
    const poolAccount = await SolanaWeb3.PublicKey.createWithSeed(
        FeePayerAccount.publicKey,
        seedValue,
        ProgramId
    )

    console.log("Pool Account", poolAccount.toBase58())

    const poolData = new PoolData({
        id: '1',
        token: token.toString(),
        reward_timelines: new Uint8Array([1, 2, 3]), // Use Uint8Array for arrays
        reward_percentages: new Uint8Array([10, 20, 30]), // Use Uint8Array for arrays
        total_stakes: [],
        total_liquidity: 0,
        available_rewards: 0,
        owner:FeePayerAccount.publicKey.toString()
    });


    const pool_serialize = serialize(schema, poolData);
    const rentInlamports = await connection.getMinimumBalanceForRentExemption(pool_serialize.length)
    const poolAccountInfo = await connection.getAccountInfoAndContext(poolAccount)
    const transaction = new SolanaWeb3.Transaction({
        feePayer:FeePayerAccount.publicKey
    })
    if(poolAccountInfo.value?.data == undefined){
        console.log("adding create account instruction", FeePayerAccount.publicKey.toBase58())
        const createPoolAccount = SolanaWeb3.SystemProgram.createAccountWithSeed({
            fromPubkey:FeePayerAccount.publicKey,
            basePubkey:FeePayerAccount.publicKey,
            seed:seedValue,
            newAccountPubkey:poolAccount,
            lamports:rentInlamports * 4,
            space: pool_serialize.length *4,
            programId:ProgramId
        })
        transaction.add(createPoolAccount)
    }
    

    const instruciton = new SolanaWeb3.TransactionInstruction({
        keys:[
            {
                pubkey:FeePayerAccount.publicKey,isSigner: true, isWritable:false

            },
            {
                pubkey:token,isSigner: false, isWritable:false

            },
            {
                pubkey:poolAccount,isSigner: false, isWritable:true

            },{
                pubkey:ProgramId, isSigner:false, isWritable:true
            }
            
        ],
        programId: ProgramId,
        data: Buffer.from([1,...Buffer.from(pool_serialize)])
    })
    
    
    transaction.add(instruciton)
    const signature = await SolanaWeb3.sendAndConfirmTransaction(connection, transaction,[FeePayerAccount]);

    console.log("signature", signature)
}  

async function stakeTokens(amount:number, duration:number) {
     const seedValue = token.toBase58().slice(0,10)
     const poolAccount = await SolanaWeb3.PublicKey.createWithSeed(
        FeePayerAccount.publicKey,
        seedValue,
        ProgramId
    )
    const admin_token_account = await SplToken.getAssociatedTokenAddress(token,FeePayerAccount.publicKey);
    const staker_token_account = await SplToken.getAssociatedTokenAddress(token,staker_account.publicKey);
    // const crete_admin_token_account = await SplToken.createAssociatedTokenAccount(connection,FeePayerAccount, token,FeePayerAccount.publicKey);
    // const create_staker_token_account = await SplToken.createAssociatedTokenAccount(connection, FeePayerAccount,token, staker_account.publicKey);
    // const mint_tokens = await SplToken.mintTo(connection, FeePayerAccount,token, staker_token_account,FeePayerAccount,50000000000)
    let stake_amount_data = new StakeAmountData({
        amount:amount,
        duration:duration,
        user:staker_account.publicKey.toBase58(),
        starts_at:Date.now(),
        rewards_claimed_upto:0
    })
    // new SolanaWeb3.PublicKey('')

    let stake_amount_data_serialize  = serialize(stakeSchema,stake_amount_data);
    
    let transactionInstruction  = new SolanaWeb3.TransactionInstruction({
        keys:[
            {pubkey:staker_account.publicKey, isSigner:false, isWritable:true},
            {pubkey:poolAccount, isSigner:false, isWritable:true},
            {pubkey:staker_token_account, isSigner:false, isWritable:true},
            {pubkey:program_token_account, isSigner:false, isWritable:true},
            {pubkey:SplToken.TOKEN_PROGRAM_ID, isSigner:false, isWritable:false},
            {pubkey:token, isSigner:false, isWritable:false}
        ],
        data: Buffer.from([2,...Buffer.from(stake_amount_data_serialize)]),
        programId:ProgramId
    })
    const transaction = new SolanaWeb3.Transaction({
        feePayer:FeePayerAccount.publicKey
    })
    transaction.add(transactionInstruction);

    const signature = await SolanaWeb3.sendAndConfirmTransaction(connection, transaction,[staker_account,FeePayerAccount]);

    console.log("Signature", signature)
}

async function unstakeTokens() {
    
     const seedValue = token.toBase58().slice(0,10)
     const poolAccount = await SolanaWeb3.PublicKey.createWithSeed(
        FeePayerAccount.publicKey,
        seedValue,
        ProgramId
    )
    const admin_token_account = await SplToken.getAssociatedTokenAddress(token,FeePayerAccount.publicKey);
    const staker_token_account = await SplToken.getAssociatedTokenAddress(token,staker_account.publicKey);
    const seed = Buffer.from('shamla');

    const [pda, bump ] = SolanaWeb3.PublicKey.findProgramAddressSync([seed], ProgramId);
    
    let transactionInstruction  = new SolanaWeb3.TransactionInstruction({
        keys:[
            {pubkey:staker_account.publicKey, isSigner:true, isWritable:true},
            {pubkey:staker_token_account, isSigner:false, isWritable:true},
            {pubkey:pdaAccouunt, isSigner:false, isWritable:true},
            {pubkey:program_token_account, isSigner:false, isWritable:true},
            {pubkey:poolAccount, isSigner:false, isWritable:true},
            {pubkey:SplToken.TOKEN_PROGRAM_ID, isSigner:false, isWritable:false}
        ],
        data: Buffer.from([3,...Buffer.from(Uint8Array.of(bump))]),
        programId:ProgramId
    })
    const transaction = new SolanaWeb3.Transaction({
        feePayer:FeePayerAccount.publicKey
    })
    transaction.add(transactionInstruction);

    const signature = await SolanaWeb3.sendAndConfirmTransaction(connection, transaction,[staker_account,FeePayerAccount]);

    console.log("Signature", signature)
}

async function claimRewards() {
    
    const seedValue = token.toBase58().slice(0,10)
    const poolAccount = await SolanaWeb3.PublicKey.createWithSeed(
       FeePayerAccount.publicKey,
       seedValue,
       ProgramId
   )
   const admin_token_account = await SplToken.getAssociatedTokenAddress(token,FeePayerAccount.publicKey);
   const staker_token_account = await SplToken.getAssociatedTokenAddress(token,staker_account.publicKey);
   
   let transactionInstruction  = new SolanaWeb3.TransactionInstruction({
       keys:[
        {pubkey:pdaAccouunt, isSigner:false, isWritable:true},
        {pubkey:program_token_account, isSigner:false, isWritable:true},
        {pubkey:staker_token_account, isSigner:false, isWritable:true},
           
           {pubkey:SplToken.TOKEN_PROGRAM_ID, isSigner:false, isWritable:false},
           {pubkey:poolAccount, isSigner:false, isWritable:true},
           {pubkey:staker_account.publicKey, isSigner:true, isWritable:true},
           
       ],
       data: Buffer.from([4,...[]]),
       programId:ProgramId
   })
   const transaction = new SolanaWeb3.Transaction({
       feePayer:FeePayerAccount.publicKey
   })
   transaction.add(transactionInstruction);

   const signature = await SolanaWeb3.sendAndConfirmTransaction(connection, transaction,[staker_account,FeePayerAccount]);

   console.log("Signature", signature)
}

async function addLiquidity() {
    



// Example input (numeric value to be passed)
const liquidityData = 123n; // Use BigInt for u64 values in TypeScript

// Convert the BigInt to a 8-byte Little-Endian array
const bufferValue = Buffer.alloc(8);
bufferValue.writeBigUInt64LE(liquidityData);
    const liquidity_keypair = SolanaWeb3.Keypair.fromSecretKey(new Uint8Array(
        [
            15,  21, 249,   9,  40,  97, 105, 179, 107,  98, 181,
            61, 148, 189,  53, 125, 246, 100, 132, 132, 196, 203,
            65, 180, 210, 109,  10, 199,  27,  71,  19,  43,  41,
           112, 226,   4,  41,  21,  12,  48, 246, 196, 107, 195,
            38, 143, 230, 105, 205, 185, 171,  22,  87, 163, 243,
            92, 137, 236, 134,  38,  62, 206,  20,  22
         ]
    ));
   
    const admin_token_account = await SplToken.getAssociatedTokenAddress(token, FeePayerAccount.publicKey);
    const liquidity_token_account = await SplToken.getAssociatedTokenAddress(token, liquidity_keypair.publicKey)
    const transactionInstruction = new SolanaWeb3.TransactionInstruction({
        keys:[
            { pubkey:FeePayerAccount.publicKey, isSigner:true, isWritable:true},
            { pubkey: admin_token_account, isSigner:false, isWritable:true},
            { pubkey:program_token_account, isSigner:false, isWritable:true},
            { pubkey:poolAccount, isSigner:false, isWritable:true},
            { pubkey:SplToken.TOKEN_PROGRAM_ID, isSigner:false, isWritable:false}
        ],
        data: Buffer.from([5,...bufferValue]),
        programId: ProgramId
    })

    const transaction = new SolanaWeb3.Transaction({
        feePayer:FeePayerAccount.publicKey
    });
    transaction.add(transactionInstruction);
    const signature = await SolanaWeb3.sendAndConfirmTransaction(connection, transaction,[FeePayerAccount]);
    console.log("signature", signature)
}


async function removeLiquidity() {
    
   
    const admin_token_account = await SplToken.getAssociatedTokenAddress(token, FeePayerAccount.publicKey);
    const liquidity_token_account = await SplToken.getAssociatedTokenAddress(token, liquidity_keypair.publicKey);

    const seed = Buffer.from('shamla');

    const [pda, bump ] = SolanaWeb3.PublicKey.findProgramAddressSync([seed], ProgramId);
    
    const transactionInstruction = new SolanaWeb3.TransactionInstruction({
        keys:[
            { pubkey: pdaAccouunt, isSigner:false, isWritable:true},
            { pubkey: FeePayerAccount.publicKey, isSigner: true, isWritable:true},
            { pubkey: program_token_account, isSigner:false, isWritable:true},
            { pubkey: admin_token_account, isSigner:false, isWritable:true},
            { pubkey: poolAccount, isSigner:false, isWritable:true},
            { pubkey: SplToken.TOKEN_PROGRAM_ID, isSigner:false, isWritable:false}
        ],
        data: Buffer.from([6,...Buffer.from(Uint8Array.of(bump))]),
        programId: ProgramId
    })

    const transaction = new SolanaWeb3.Transaction({
        feePayer:FeePayerAccount.publicKey
    });
    transaction.add(transactionInstruction);
    const signature = await SolanaWeb3.sendAndConfirmTransaction(connection, transaction,[FeePayerAccount]);
    console.log("signature", signature)
}

async function getPoolData() {
    const seedValue = "ShamlaTech0.13680839071668616";
    const connection = new SolanaWeb3.Connection("https://api.devnet.solana.com","confirmed")
    const accountData = await connection.getAccountInfoAndContext(poolAccount);
    if(accountData.value){
        console.log(deserialize(schema,accountData.value?.data,false))
    }
    
}

async function createPDAAccount() {
    const seed = Buffer.from('shamla');

    const [pda, bump ] = SolanaWeb3.PublicKey.findProgramAddressSync([seed], ProgramId);

    console.log('PDA: ', pda.toString())

    const pdaTokenAccount = await SplToken.createAssociatedTokenAccount(connection, FeePayerAccount, token, pda,undefined, undefined, undefined, true);
    // console.log("get associated token account", await SplToken.getAssociatedTokenAddress(token,pda,true))
    console.log(pdaTokenAccount)
}

// console.log(SolanaWeb3.Keypair.generate())

// createPoolAccount();
// getPoolData();
// stakeTokens(1000,30);
// unstakeTokens();
// addLiquidity();
// removeLiquidity();
// createPDAAccount(); //I have already created
// claimRewards();

//completed the program using PDA account interactions.