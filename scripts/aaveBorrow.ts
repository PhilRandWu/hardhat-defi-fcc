import {getWeth} from "./getWeth";
import {Signer} from "ethers";
import {ethers, network} from "hardhat";
import {NetWorkConfig} from "../config/network";

async function main() {
    const deployer = await ethers.provider.getSigner();
    await getWeth();
    const lendingPool = await getLendingPool(deployer);
    console.log("lendingPool",lendingPool);
}

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

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })