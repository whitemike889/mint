import Big from "big.js";
import withSLP from "./withSLP";
import { sendBch, SATOSHIS_PER_BYTE } from "./sendBch";

export const DUST = 0.00005;

export const getBalancesForToken = withSLP(async (SLP, tokenId) => {
  try {
    const balances = await SLP.Utils.balancesForToken(tokenId);
    balances.totalBalance = balances.reduce((p, c) => c.tokenBalance + p, 0);
    return balances;
  } catch (err) {
    console.error(`Error in getTokenInfo: `, err);
    throw err;
  }
});

export const getEligibleAddresses = withSLP(
  async (SLP, wallet, balances, value, utxos, advancedOptions) => {
    const addresses = [];
    const values = [];

    const slpAddressesToExclude = advancedOptions.addressesToExclude
      .filter(addressToExclude => addressToExclude.valid)
      .map(addressToExclude => SLP.Address.toSLPAddress(addressToExclude.address));

    if (advancedOptions.ignoreOwnAddress) {
      slpAddressesToExclude.push(...wallet.slpAddresses);
    }

    const eligibleBalances = balances
      .filter(balance => !slpAddressesToExclude.includes(balance.slpAddress))
      .map(eligibleBalance => ({
        ...eligibleBalance,
        tokenBalance: new Big(eligibleBalance.tokenBalanceString)
      }));
    const tokenBalanceSum = eligibleBalances.reduce((p, c) => p.plus(c.tokenBalance), new Big(0));
    const minTokenBalance = tokenBalanceSum.mul(DUST).div(value);

    const filteredEligibleBalances = eligibleBalances.filter(eligibleBalance =>
      minTokenBalance.lte(eligibleBalance.tokenBalance)
    );
    const filteredTokenBalanceSum = filteredEligibleBalances.reduce(
      (p, c) => p.plus(c.tokenBalance),
      new Big(0)
    );
    filteredEligibleBalances.forEach(async eligibleBalance => {
      const eligibleValue = eligibleBalance.tokenBalance.div(filteredTokenBalanceSum).mul(value);
      values.push(eligibleValue);
      addresses.push(eligibleBalance.slpAddress);
    });

    const byteCount = SLP.BitcoinCash.getByteCount(
      { P2PKH: utxos.length },
      { P2PKH: addresses.length + 1 }
    );
    const txFee = SLP.BitcoinCash.toBitcoinCash(Math.floor(SATOSHIS_PER_BYTE * byteCount)).toFixed(
      8
    );

    return {
      addresses,
      values,
      txFee
    };
  }
);

export const sendDividends = async (wallet, utxos, advancedOptions, { value, tokenId }) => {
  const outputs = await getBalancesForToken(tokenId);

  const { addresses, values } = await getEligibleAddresses(
    wallet,
    outputs,
    value,
    utxos,
    advancedOptions
  );

  return await sendBch(wallet, utxos, { addresses, values });
};
