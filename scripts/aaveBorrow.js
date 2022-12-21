const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("./getWeth");

const main = async () => {
	await getWeth();
	const { deployer } = await getNamedAccounts();

	// lending pool address provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
	const lendingPool = await getLendingPool(deployer);
	console.log(lendingPool.address);

	// TODO: save this in config helper
	const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

	// approve
	await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);

	console.log("depositing...");
	await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
	console.log("deposited");

	// get the DAI priceFeed
	const daiEthPrice = await getDaiPrice();

	let { availableBorrowsETH, totalDebtETH, totalCollateralETH } = await getBorrowUserData(
		lendingPool,
		deployer
	);

	//console.log("availableBorrowsETH ", availableBorrowsETH);

	const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiEthPrice.toNumber());
	const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString());
	// borrow
	// console.log(amountDaiToBorrowWei);
	const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

	await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
	await getBorrowUserData(lendingPool, deployer);
	// repay

	await repay(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
	await getBorrowUserData(lendingPool, deployer);
};

const getLendingPool = async (account) => {
	const lendingPoolAddressesProvider = await ethers.getContractAt(
		"ILendingPoolAddressesProvider",
		"0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
		account
	);

	const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
	const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account);
	return lendingPool;
};

const approveErc20 = async (erc20Address, spenderAddress, amountToSpend, account) => {
	const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account);
	const tx = await erc20Token.approve(spenderAddress, amountToSpend);
	await tx.wait(1);
	console.log("Approved!");
};

const getBorrowUserData = async (lendingPool, account) => {
	const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
		await lendingPool.getUserAccountData(account);
	console.log(
		availableBorrowsETH.toString(),
		totalDebtETH.toString(),
		totalCollateralETH.toString()
	);
	return { availableBorrowsETH, totalDebtETH, totalCollateralETH };
};

const getDaiPrice = async () => {
	const daiEthPriceFeed = await ethers.getContractAt(
		"AggregatorV3Interface",
		"0x773616E4d11A78F511299002da57A0a94577F1f4"
	);

	const price = (await daiEthPriceFeed.latestRoundData())[1];
	console.log("DAI/ETH price is ", price);
	return price;
};

const borrowDai = async (daiAddress, lendingPool, amountDaiToBorrowWei, account) => {
	const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account);
	await borrowTx.wait(1);
	console.log("you've borrowed!");
};

const repay = async (daiAddress, lendingPool, amountDaiToRepayWei, account) => {
	await approveErc20(daiAddress, lendingPool.address, amountDaiToRepayWei, account);
	const repayTx = await lendingPool.repay(daiAddress, amountDaiToRepayWei, 1, account);
	await repayTx.wait(1);
	console.log("Repaid!");
};

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
