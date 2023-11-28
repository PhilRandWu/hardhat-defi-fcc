import {getNamedAccounts, ethers, network} from "hardhat";
import {NetWorkConfig} from "../config/network";

export const AMOUNT = ethers.parseEther("1");

export async function getWeth() {
    const {deployer} = await getNamedAccounts();
    const signer = await ethers.provider.getSigner();
    // console.log("NetWork", network.config);
    const chainId = network.config.chainId;
    const IWeth = await ethers.getContractAt(
        "IWeth",
        NetWorkConfig[chainId!].wethToken,
        signer as any
    )

    // iWeth 的 deposit() 函数允许用户将自己的 ETH 存入 iWeth 合约，并将其转换为 iWeth 代币，从而获得更多的功能和流动性。
    const txResponse = await IWeth.deposit({
        value: AMOUNT
    });
    await txResponse.wait(1);
    const wethBalance = await IWeth.balanceOf(deployer);
    console.log(`deployer Got ${wethBalance.toString()} WETH`)
}