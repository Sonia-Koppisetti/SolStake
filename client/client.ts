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

    constructor(fields:{amount: number, duration:number, user:string, starts_at:number}){
        this.amount = fields.amount;
        this.duration = fields.duration;
        this.user = fields.user;
        this.starts_at = fields.starts_at;
    }
}

const stakeSchema = {
    struct : {
        amount : 'u64',
        duration: 'u8',
        user:'string',
        starts_at: 'i64'
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

const ProgramId = new SolanaWeb3.PublicKey('CFtkNRDTUhyDiLdgmktxpcfw6gqMSWR6exy9D8MBuvXV')
const connection = new SolanaWeb3.Connection("https://api.devnet.solana.com",'confirmed')
    const FeePayerAccount = SolanaWeb3.Keypair.fromSecretKey(new Uint8Array(
        
        [19,181,212,119,106,158,68,159,225,158,220,54,108,209,44,87,9,191,249,243,150,152,155,9,57,123,154,162,102,94,255,134,65,79,200,251,209,199,74,235,122,87,90,68,65,145,97,1,50,152,83,105,189,251,86,237,198,208,182,51,197,53,233,96]
    ))
    const staker_account = SolanaWeb3.Keypair.fromSecretKey(new Uint8Array(
        [19,181,212,119,106,158,68,159,225,158,220,54,108,209,44,87,9,191,249,243,150,152,155,9,57,123,154,162,102,94,255,134,65,79,200,251,209,199,74,235,122,87,90,68,65,145,97,1,50,152,83,105,189,251,86,237,198,208,182,51,197,53,233,96]
    ));
const token = new SolanaWeb3.PublicKey('A8CfmRr3feTenFrDDWKjhdRRe4pUCeTkojKoqwr1PX1Z');
async function createPoolAccount() {

    
    const seedValue = token.toBase58().slice(0,8)
    const poolAccount = await SolanaWeb3.PublicKey.createWithSeed(
        FeePayerAccount.publicKey,
        seedValue,
        ProgramId
    )

    const poolData = new PoolData({
        id: '1',
        token: token.toString(),
        reward_timelines: new Uint8Array([1, 2, 3]), // Use Uint8Array for arrays
        reward_percentages: new Uint8Array([10, 20, 30]), // Use Uint8Array for arrays
        total_stakes: [],
        total_liquidity: 0,
        available_rewards: 0,
        owner:FeePayerAccount.publicKey.toBase58()
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
        transaction.add(createPoolAccount);
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
                pubkey:poolAccount,isSigner: false, isWritable:false

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
    const staker_account = SolanaWeb3.Keypair.fromSecretKey(new Uint8Array([
        53,   8,   2,  44,  96, 193, 153,   7, 131,  91, 229,
        13,  15, 194,  47, 252,  27, 218, 168,  82, 243, 246,
       173, 188,  89,  88, 169,  10, 235, 208, 221,  95,  28,
        32,  50,   7, 233, 158,  25,  29,   3, 154, 252, 109,
        17, 248, 218, 251, 167, 182,  91, 219,  16,  48,  42,
       149, 228,  75,  70, 135,  13, 215,  89, 206
     ]));
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
    const mint_tokens = await SplToken.mintTo(connection, FeePayerAccount,token, staker_token_account,FeePayerAccount,50000000000)
    let stake_amount_data = new StakeAmountData({
        amount:amount,
        duration:duration,
        user:staker_account.publicKey.toBase58(),
        starts_at:Date.now()
    })

    let stake_amount_data_serialize  = serialize(stakeSchema,stake_amount_data);
    
    let transactionInstruction  = new SolanaWeb3.TransactionInstruction({
        keys:[
            {pubkey:staker_account.publicKey, isSigner:true, isWritable:true},
            {pubkey:poolAccount, isSigner:false, isWritable:true},
            {pubkey:staker_token_account, isSigner:false, isWritable:true},
            {pubkey:admin_token_account, isSigner:false, isWritable:true},
            {pubkey:SplToken.TOKEN_PROGRAM_ID, isSigner:false, isWritable:false}
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
    
    let transactionInstruction  = new SolanaWeb3.TransactionInstruction({
        keys:[
            {pubkey:staker_account.publicKey, isSigner:true, isWritable:true},
            
            {pubkey:staker_token_account, isSigner:false, isWritable:true},
            {pubkey:FeePayerAccount.publicKey, isSigner:true, isWritable:true},
            {pubkey:admin_token_account, isSigner:false, isWritable:true},
            {pubkey:poolAccount, isSigner:false, isWritable:true},
            {pubkey:SplToken.TOKEN_PROGRAM_ID, isSigner:false, isWritable:false}
        ],
        data: Buffer.from([3,...[]]),
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
        {pubkey:FeePayerAccount.publicKey, isSigner:true, isWritable:true},
        {pubkey:admin_token_account, isSigner:false, isWritable:true},
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
    // const transactionInstruction = new SolanaWeb3.TransactionInstruction({

    // })
}

async function getPoolData() {
    const seedValue = "ShamlaTech0.13680839071668616";
    const connection = new SolanaWeb3.Connection("https://api.devnet.solana.com","confirmed")
    const matchAccount = new SolanaWeb3.PublicKey('2wGVQLGpSDdTQze8uScPAdGC19rAa56nyphcv3eWJZ57');
    const accountData = await connection.getAccountInfoAndContext(matchAccount);
    if(accountData.value){
        console.log(deserialize(schema,accountData.value?.data,false))
    }
    
}



createPoolAccount();
// getPoolData();
// stakeTokens(1000,30);
//unstakeTokens();