import withSLP from "./withSLP";
import chunk from "lodash/chunk";
import { getUnconfirmedTxs, getAllConfirmedSlpTxs } from "./getTokenTransactionHistory";
import { isSlpTx } from "./decodeRawSlpTransactions";

const getTransactionHistory = async (SLP, cashAddresses, transactions, tokens) => {
  try {
    const transactionHistory = {
      confirmed: [],
      unconfirmed: []
    };
    const slpAddresses = cashAddresses.map(addr => SLP.Address.toSLPAddress(addr));
    const nonZeroIndexes = transactions.reduce((a, e, i) => {
      if (e.length > 0) a.push(i);
      return a;
    }, []);

    const unconfirmedTxs = await getUnconfirmedTxs(slpAddresses);
    const unconfirmedSlpTxids = unconfirmedTxs.filter(tx => isSlpTx(tx)).map(tx => tx.txid);
    transactionHistory.unconfirmed = unconfirmedTxs
      .filter(tx => !isSlpTx(tx))
      .map(el => ({
        txid: el.txid,
        date: new Date(),
        confirmations: el.confirmations,
        transactionBalance:
          (cashAddresses.includes(SLP.Address.toCashAddress(el.vin[0].addr)) ? -1 : 1) *
          el.vout[0].value
      }));
    const unconfirmedBchTxids = transactionHistory.unconfirmed.map(tx => tx.txid);

    const confirmedSlpTxs = await getAllConfirmedSlpTxs(slpAddresses, tokens);
    const concatenatedConfirmedSlpTxids = confirmedSlpTxs
      .map(txsByAddr => txsByAddr.map(tx => tx.txid))
      .reduce((a, b) => a.concat(b), []);
    const confirmedSlpTxids = [...new Set(concatenatedConfirmedSlpTxids)];
    const slpTxids = unconfirmedSlpTxids.concat(confirmedSlpTxids);

    const remainingNumberTxsDetails = 30 - transactionHistory.unconfirmed.length;

    if (remainingNumberTxsDetails > 0) {
      const confirmedBchTxids = Array.from({ length: nonZeroIndexes.length });
      nonZeroIndexes.forEach((e, i) => {
        confirmedBchTxids[i] = transactions[e].filter(
          el => !slpTxids.includes(el) && !unconfirmedBchTxids.includes(el)
        );
      });

      const lastNtrancationIds = (N, transactionIds) => transactionIds.map(el => el.slice(0, N));
      const slicedTxids = lastNtrancationIds(remainingNumberTxsDetails, confirmedBchTxids);
      const concatenatedTxids = slicedTxids.reduce((a, b) => a.concat(b), []);
      const uniqueTxids = [...new Set(concatenatedTxids)];

      const revertChunk = chunkedArray =>
        chunkedArray.reduce((unchunkedArray, chunk) => [...unchunkedArray, ...chunk], []);

      const txidChunks = chunk(uniqueTxids, 20);
      const txidDetails = revertChunk(
        await Promise.all(txidChunks.map(txidChunk => SLP.Transaction.details(txidChunk)))
      );

      transactionHistory.confirmed = txidDetails
        .sort((x, y) => y.time - x.time)
        .map(el => ({
          txid: el.txid,
          date: new Date(el.time * 1000),
          confirmations: el.confirmations,
          transactionBalance:
            (cashAddresses.includes(el.vin[0].cashAddress) ? -1 : 1) * el.vout[0].value
        }));
    }

    const { unconfirmed, confirmed } = transactionHistory;
    const history = unconfirmed.concat(confirmed);
    return {
      bchTransactions: history,
      wallets: nonZeroIndexes.map(el => cashAddresses[el])
    };
  } catch (e) {
    console.log("error :", e);
    return [];
  }
};

export default withSLP(getTransactionHistory);
