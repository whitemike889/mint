import getWalletDetails from "./getWalletDetails";
import withSLP from "./withSLP";

const getBalance = async (SLP, wallet, logs = true) => {
  const log = logs ? console.log.bind(console) : () => null;

  try {
    const walletDetails = getWalletDetails(wallet);

    let bitcoinCashBalance = await SLP.Address.details(walletDetails.cashAddress);

    const slpTokensBalance = await SLP.Utils.balancesForAddress(walletDetails.slpAddress);
    bitcoinCashBalance.tokens = slpTokensBalance;

    log(`Balance: ${JSON.stringify(bitcoinCashBalance, null, 4)}:`);

    return {
      ...bitcoinCashBalance,
      totalBalance: bitcoinCashBalance.balance + bitcoinCashBalance.unconfirmedBalance,
      transient: false
    };
  } catch (err) {
    log(`Error in getBalance: `, err.message);
    throw err;
  }
};

export default withSLP(getBalance);
