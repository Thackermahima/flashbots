const { FlashbotsBundleProvider, } = require("@flashbots/ethers-provider-bundle");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

require("dotenv").config({ path : ".env"});

async function main(){

    //Deploy FakeNFT Contract.
    const fakeNFT = await ethers.getContractFactory("FakeNFT");
    const FakeNFT = await fakeNFT.deploy();
    await FakeNFT.deployed();

    console.log("Address of Fake NFT Contract:", FakeNFT.address);

    //Create a Quicknode WebSocket Provider
    const provider = new ethers.providers.WebSocketProvider(
        process.env.QUICKNODE_WS_URL,
        "sepolia"
    );

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    //Create a FlashBots Provider which will forward the request to the relayers.
    //Which will furture send it to the flashbot miner.

    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        signer,
        "https://relay-sepolia.flashbots.net",
        "sepolia"
    );

    provider.on("block", async(blockNumber) => {
        console.log("Block Number: ",blockNumber);

        //Send the Bundle of transactions to the flashbots relayer.

        const bundleResponse = await flashbotsProvider.sendBundle(
            [
                {
                    transaction : {
                        chainId : 11155111,
                        // Post-London Upgrade gas model which is EIP-1559.
                        type : 2,
                        // Value of 1 FakeNFT
                        value : ethers.utils.parseEther("0.01"),

                        //Address of the FakeNFT
                        to : FakeNFT.address,
                        //In the data field, we pass the function selector of the Mint function.
                        data : FakeNFT.interface.getSighash("mint()"),

                        //Max Gas Fee you are willing to pay
                        maxFeePerGas: BigNumber.from(10).pow(9).mul(3),
                        
                        //Max Priority gas fees you are willing to pay
                        maxPriorityFeePerGas: BigNumber.from(10).pow(9).mul(2), 
                    },
                    signer: signer,
                },
            ],
            blockNumber + 1
        );
        //If an error is present, log it.

        if("error" in bundleResponse) {
            console.log(bundleResponse.error.message);
        }
    });
}
main();
