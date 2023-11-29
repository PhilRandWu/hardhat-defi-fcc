import {AMOUNT, getWeth} from "./getWeth";
import {Addressable, Signer} from "ethers";
import {ethers, network} from "hardhat";
import {NetWorkConfig} from "../config/network";

async function main() {
    const deployer = await ethers.provider.getSigner();
    const chainId = network.config.chainId;
    await getWeth();
    const lendingPool = await getLendingPool(deployer);
    const wethTokenAddress = NetWorkConfig[chainId!].wethToken;
    await approveErc20(wethTokenAddress, lendingPool.target, AMOUNT, deployer);
    console.log("Depositing WETH...");
    // 将一定数量的 WETH（Wrapped Ether）代币存入 Aave 金库中，并生成相应的借贷凭证。
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log("Deposited!")
    const {availableBorrowsETH, totalDebtETH} = await getBorrowUserData(lendingPool, deployer);
    const price = await getDaiPrice();
    // 1 ETH * (3 Dai / 1 ETH) * 0.95(限制最大借出比率)
    const amountDaiToBorrow = Number(availableBorrowsETH) * (1 / Number(price)) * (95 / 100);
    const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString());
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI, ${amountDaiToBorrowWei} Wei`);
    await borrowDai(
        NetWorkConfig[chainId!].daiToken,
        lendingPool,
        amountDaiToBorrowWei,
        deployer.address
    )
    await getBorrowUserData(lendingPool, deployer);
}

/**
 * 获取 lendingPool 合约地址
 * @param account 获取账户
 */
async function getLendingPool(account: Signer) {
    const chainId = network.config.chainId;
    // 获取合约地址提供者
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        NetWorkConfig[chainId!].lendingPoolAddressesProvider,
        account
    );
    // 获取 lendingPool 合约地址
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
    return await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    );
}

/**
 * 使用指定账户（即 signer）来批准某个 ERC20 代币合约的转移操作。
 * @param erc20Address ERC20 代币合约地址。
 * @param spenderAddress 被授权转移代币的目标地址。
 * @param amount 需要被批准的代币数量，以代币最小单位为单位。
 * @param signer 用于发送交易的账户对象（即 Signer 对象）。
 */
async function approveErc20(erc20Address: string, spenderAddress: string | Addressable, amount: bigint, signer: Signer) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, signer);
    const txResponse = await erc20Token.approve(spenderAddress, amount);
    txResponse.wait(1);
    console.log("Approved!");
}

/**
 * 获取指定 Aave 金库账户的借贷相关信息
 * @param lendingPool Aave 协议的 LendingPool 合约实例。
 * @param account 要查询的账户地址。
 * @returns totalCollateralETH: 存入到 Aave 金库中的 ETH 总价值。
 * @returns totalDebtETH: 借出的 ETH 总价值。
 * @returns availableBorrowsETH: 可以借出的 ETH 价值。
 */
async function getBorrowUserData(lendingPool: any, account: Signer): Promise<{
    availableBorrowsETH: number;
    totalDebtETH: number;
}> {
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH
    } = await lendingPool.getUserAccountData(account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return {availableBorrowsETH, totalDebtETH}
}

/**
 * 获取当前 DAI/ETH 交易对的最新价格
 * @return price 当前 DAI/ETH 交易对的最新价格
 */
async function getDaiPrice(): Promise<string> {
    const chainId = network.config.chainId;
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        NetWorkConfig[chainId!].daiEthPriceFeed
    );
    const price = (await daiEthPriceFeed.latestRoundData())[1];
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price.toString()
}

/**
 *
 * @param daiAddress DAI 代币合约地址。
 * @param lendingPool
 * @param amountDaiToBorrow 需要借出的 DAI 代币数量，以最小单位为单位。
 * @param account 借款账户地址。
 */
async function borrowDai(daiAddress: string, lendingPool: any, amountDaiToBorrow: BigInt, account: string) {
    // 1: 借出资产类型，默认为 1（即固定利率）。
    // 0: 还款期限，默认为 0（即无限期）
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 2, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })