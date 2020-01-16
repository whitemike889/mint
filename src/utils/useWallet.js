/* eslint-disable react-hooks/exhaustive-deps */

import React, { useEffect, useState } from "react";
import Paragraph from "antd/lib/typography/Paragraph";
import { notification } from "antd";
import Big from "big.js";
import * as slpjs from "slpjs";
import { getWallet, createWallet } from "./createWallet";
import usePrevious from "./usePrevious";
import withSLP from "./withSLP";
import getTokenInfo from "./getTokenInfo";

const normalizeSlpBalancesAndUtxos = (SLP, slpBalancesAndUtxos, wallet) => {
  slpBalancesAndUtxos.forEach(balanceAndUtxos => {
    const derivatedAccount = wallet.Accounts.find(
      account => account.slpAddress === balanceAndUtxos.address
    );
    balanceAndUtxos.account = derivatedAccount;
  });

  return slpBalancesAndUtxos.sort((a, b) =>
    a.result.satoshis_available_bch > b.result.satoshis_available_bch ? -1 : 1
  );
};

const normalizeUtxos = (SLP, slpBalancesAndUtxos) =>
  slpBalancesAndUtxos.reduce(
    (previousBalanceAndUtxos, balanceAndUtxos) => [
      ...previousBalanceAndUtxos,
      ...balanceAndUtxos.result.nonSlpUtxos.map(utxo => ({
        ...utxo,
        wif: balanceAndUtxos.account.fundingWif
      }))
    ],
    []
  );

const normalizeBalance = (SLP, slpBalancesAndUtxos) => {
  const totalBalanceInSatohis = slpBalancesAndUtxos.reduce(
    (previousBalance, balance) => previousBalance + balance.result.satoshis_available_bch,
    0
  );
  return {
    totalBalanceInSatohis,
    totalBalance: SLP.BitcoinCash.toBitcoinCash(totalBalanceInSatohis)
  };
};

const normalizeTokens = async (SLP, slpBalancesAndUtxos, wallet) => {
  const tokensMap = {};
  slpBalancesAndUtxos.forEach(balanceAndUtxos => {
    Object.entries(balanceAndUtxos.result.slpTokenBalances).forEach(tokenBalanceEntry => {
      const tokenId = tokenBalanceEntry[0];
      let token = tokensMap[tokenId]
        ? tokensMap[tokenId]
        : {
            tokenId,
            satoshisBalance: 0,
            info: null
          };
      token.satoshisBalance += Number(tokenBalanceEntry[1]);
      tokensMap[tokenId] = token;
    });
  });

  const tokens = Object.values(tokensMap).sort((a, b) => (a.tokenId > b.tokenId ? 1 : -1));

  const infos = await getTokenInfo(wallet.slpAddresses, tokens.map(token => token.tokenId));
  tokens.forEach(token => {
    token.info = infos.find(i => i.tokenIdHex === token.tokenId);
    token.balance = new Big(token.satoshisBalance).div(new Big(Math.pow(10, token.info.decimals)));
  });

  return tokens;
};

const update = withSLP(
  async (SLP, { wallet, setBalances, setTokens, setSlpBalancesAndUtxos, setUtxos }) => {
    try {
      if (!wallet) {
        return;
      }
      const bitboxNetwork = new slpjs.BitboxNetwork(SLP);
      const slpBalancesAndUtxos = await bitboxNetwork.getAllSlpBalancesAndUtxos(
        wallet.slpAddresses
      );

      setSlpBalancesAndUtxos(normalizeSlpBalancesAndUtxos(SLP, slpBalancesAndUtxos, wallet));
      setUtxos(normalizeUtxos(SLP, slpBalancesAndUtxos, wallet));

      setBalances(normalizeBalance(SLP, slpBalancesAndUtxos));

      try {
        setTokens(await normalizeTokens(SLP, slpBalancesAndUtxos, wallet));
      } catch (error) {}
    } catch (error) {}
  }
);

export const useWallet = () => {
  const [wallet, setWallet] = useState(getWallet());
  const [balances, setBalances] = useState({});
  const [tokens, setTokens] = useState([]);
  const [slpBalancesAndUtxos, setSlpBalancesAndUtxos] = useState([]);
  const [utxos, setUtxos] = useState([]);
  const [loading, setLoading] = useState(true);

  const previousBalances = usePrevious(balances);

  if (
    previousBalances &&
    balances &&
    "totalBalance" in previousBalances &&
    "totalBalance" in balances &&
    new Big(balances.totalBalance).minus(previousBalances.totalBalance).gt(0)
  ) {
    notification.success({
      message: "BCH",
      description: (
        <Paragraph>
          You received {Number(balances.totalBalance - previousBalances.totalBalance).toFixed(8)}{" "}
          BCH!
        </Paragraph>
      ),
      duration: 2
    });
  }

  useEffect(() => {
    const updateRoutine = () => {
      update({
        wallet: getWallet(),
        setBalances,
        setTokens,
        setSlpBalancesAndUtxos,
        setUtxos
      }).finally(() => {
        setLoading(false);
        setTimeout(updateRoutine, 10000);
      });
    };

    updateRoutine();
  }, []);

  return {
    wallet,
    slpBalancesAndUtxos,
    utxos,
    balances,
    tokens,
    loading,
    update: () =>
      update({
        wallet: getWallet(),
        setBalances,
        setTokens,
        setLoading,
        setSlpBalancesAndUtxos,
        setUtxos
      }),
    createWallet: importMnemonic => {
      setLoading(true);
      const newWallet = createWallet(importMnemonic);
      setWallet(newWallet);
      update({
        wallet: newWallet,
        setBalances,
        setTokens,
        setSlpBalancesAndUtxos,
        setUtxos
      }).finally(() => setLoading(false));
    }
  };
};
