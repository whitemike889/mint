/* eslint-disable react-hooks/exhaustive-deps */

import * as React from "react";
import { message } from "antd";
import { getBalancesForToken, getEligibleAddresses } from "../../../utils/sendDividends";
import retry from "../../../utils/retry";
import { WalletContext } from "../../../utils/context";

export const useDividendsStats = ({ token, amount, setLoading, advancedOptions }) => {
  const { wallet, balances, slpBalancesAndUtxos } = React.useContext(WalletContext);
  const [stats, setStats] = React.useState({
    tokens: 0,
    holders: 0,
    balances: null,
    eligibles: 0,
    txFee: 0,
    maxAmount: 0
  });

  React.useEffect(() => {
    setLoading(true);
    retry(() => getBalancesForToken(token.tokenId))
      .then(balancesForToken => {
        setStats({
          ...stats,
          tokens: balancesForToken.totalBalance,
          holders: balancesForToken.length ? balancesForToken.length : 0,
          balances: balancesForToken,
          txFee: 0
        });
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  // max amount
  React.useEffect(() => {
    if (!stats.balances || !balances.totalBalance || !slpBalancesAndUtxos || !token) {
      return;
    }
    try {
      const { txFee } = getEligibleAddresses(
        wallet,
        stats.balances,
        balances.totalBalance,
        slpBalancesAndUtxos.nonSlpUtxos,
        advancedOptions,
        token.tokenId
      );
      const maxAmount = (balances.totalBalance - txFee).toFixed(8);
      setStats(stats => ({ ...stats, maxAmount }));
    } catch (error) {}
  }, [wallet, balances, stats.balances, slpBalancesAndUtxos, token, advancedOptions]);

  // eligible addresses to the amount
  React.useEffect(() => {
    try {
      if (!Number.isNaN(Number(amount)) && amount > 0) {
        const { addresses, txFee } = getEligibleAddresses(
          wallet,
          stats.balances,
          amount,
          slpBalancesAndUtxos.nonSlpUtxos,
          advancedOptions,
          token.tokenId
        );

        setStats(stats => ({ ...stats, eligibles: addresses.length, txFee }));
      } else {
        setStats(stats => ({ ...stats, eligibles: 0, txFee: 0 }));
      }
    } catch (error) {
      message.error("Unable to calculate eligible addresses due to network errors");
    }
  }, [wallet, balances, stats.balances, slpBalancesAndUtxos, advancedOptions, token, amount]);

  return {
    stats,
    setLoading
  };
};
