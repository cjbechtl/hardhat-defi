const { network } = require("hardhat");
const { developmentChains, INITIAL_SUPPLY } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();
	const chainId = network.config.chainId;
	const args = [INITIAL_SUPPLY];

	const ourToken = await deploy("OurToken", {
		from: deployer,
		args,
		log: true,
		waitConfirmations: network.config.blockConfirmations || 1,
	});

	console.log("OurToken deployed at: ", ourToken.address);

	if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
		await verify(ourToken.address, args);
	}
	log("---------------------------------------");
};

module.exports.tags = ["all", "ourToken"];
