import withSLP from "./withSLP";

const deriveAccount = withSLP((SLPInstance, { masterHDNode, path }) => {
  const node = SLPInstance.HDNode.derivePath(masterHDNode, path);
  const cashAddress = SLPInstance.HDNode.toCashAddress(node);
  const slpAddress = SLPInstance.Address.toSLPAddress(cashAddress);

  return {
    cashAddress,
    slpAddress,
    fundingWif: SLPInstance.HDNode.toWIF(node),
    fundingAddress: SLPInstance.Address.toSLPAddress(cashAddress),
    legacyAddress: SLPInstance.Address.toLegacyAddress(cashAddress)
  };
});

const getWalletDetails = (SLPInstance, wallet) => {
  const NETWORK = process.env.REACT_APP_NETWORK;
  const mnemonic = wallet.mnemonic;
  const rootSeedBuffer = SLPInstance.Mnemonic.toSeed(mnemonic);
  let masterHDNode;

  if (NETWORK === `mainnet`) masterHDNode = SLPInstance.HDNode.fromSeed(rootSeedBuffer);
  else masterHDNode = SLPInstance.HDNode.fromSeed(rootSeedBuffer, "testnet");

  const Path245 = deriveAccount({ masterHDNode, path: "m/44'/245'/0'/0/0" });
  const Path145 = deriveAccount({ masterHDNode, path: "m/44'/145'/0'/0/0" });
  const PathZero = deriveAccount({ masterHDNode, path: "m/44'/0'/0'/0/0" });
  const Accounts = [Path245, Path145, PathZero];

  return {
    mnemonic: wallet.mnemonic,
    cashAddresses: [Path245.cashAddress, Path145.cashAddress, PathZero.cashAddress],
    slpAddresses: [Path245.slpAddress, Path145.slpAddress, PathZero.slpAddress],

    Path245,
    Path145,
    PathZero,
    Accounts
  };
};

export default withSLP(getWalletDetails);
