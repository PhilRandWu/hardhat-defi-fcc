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
    await approveErc20(wethTokenAddress,lendingPool.target,AMOUNT,deployer);
    console.log("Depositing WETH...");
    // console.log("lendingPool",lendingPool);
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
    const erc20Token = await ethers.getContractAt("IERC20",erc20Address,signer);
    const txResponse = await erc20Token.approve(spenderAddress,amount);
    txResponse.wait(1);
    console.log("Approved!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })