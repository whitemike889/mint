/* eslint-disable no-loop-func */

import { Utils } from "slpjs";
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

export const getEligibleAddresses = withSLP(async (SLP, wallet, balances, value) => {
  let addresses = [];
  let values = [];

  let eligibleBalances = [
    ...balances.filter(
      balance =>
        balance.slpAddress !== wallet.Path245.slpAddress &&
        balance.slpAddress !== wallet.Path145.slpAddress
    )
  ];

  while (true) {
    const tokenBalanceSum = eligibleBalances.reduce((p, c) => c.tokenBalance + p, 0);

    const newEligibleBalances = eligibleBalances.filter(eligibleBalance => {
      const eligibleValue = Number(
        ((eligibleBalance.tokenBalance / tokenBalanceSum) * value).toFixed(8)
      );
      if (eligibleValue > DUST) {
        addresses.push(Utils.toCashAddress(eligibleBalance.slpAddress));
        values.push(eligibleValue);
        return true;
      }
      return false;
    });

    if (newEligibleBalances.length === eligibleBalances.length) {
      break;
    } else {
      eligibleBalances = newEligibleBalances;
      addresses = [];
      values = [];
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const byteCount = SLP.BitcoinCash.getByteCount({ P2PKH: 1 }, { P2PKH: addresses.length + 1 });
  const satoshisPerByte = SATOSHIS_PER_BYTE;
  const txFee = SLP.BitcoinCash.toBitcoinCash(Math.floor(satoshisPerByte * byteCount)).toFixed(8);

  return {
    addresses,
    values,
    txFee
  };
});

export const sendDividends = async (wallet, utxos, { value, tokenId }) => {
  const outputs = await getBalancesForToken(tokenId);

  const { addresses, values } = await getEligibleAddresses(wallet, outputs, value);

  return await sendBch(wallet, utxos, { addresses, values });
};
