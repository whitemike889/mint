import withSLP from "./withSLP";
import chunk from "lodash/chunk";
import { decodeRawSlpTrasactionsByTxs } from "./decodeRawSlpTransactions";

export const getUnconfirmedTxs = withSLP(async (SLP, slpAddresses) => {
  const lastTransactions = await SLP.Address.transactions(slpAddresses);

  const goToNextPage = transactions => {
    const confirmedTxs = transactions.map(transactionsByAddress =>
      transactionsByAddress.txs.filter(tx => tx.confirmations !== 0)
    );
    return Math.min(...confirmedTxs.map(txs => txs.length)) === 0;
  };

  const concatenatedUniqueUnconfirmedTransactions = transactions =>
    Object.values(
      transactions
        .map(transactionsByAddress =>
          transactionsByAddress.txs.filter(tx => tx.confirmations === 0)
        )
        .reduce((a, b) => a.concat(b), [])
        .reduce((acc, cur) => ({ ...acc, ...{ [cur.txid]: cur } }), {})
    );

  const unconfirmedTxs = concatenatedUniqueUnconfirmedTransactions(lastTransactions);
  if (goToNextPage(lastTransactions)) {
    const numerOfPages = Math.max(...lastTransactions.map(transaction => transaction.pagesTotal));
    for (let page = 1; page < numerOfPages; page++) {
      const txsOnPage = await SLP.Address.transactions(slpAddresses, page);
      unconfirmedTxs.concat(concatenatedUniqueUnconfirmedTransactions(txsOnPage));
      if (!goToNextPage(txsOnPage)) break;
    }
  }
  return unconfirmedTxs;
});

export const getConfirmedSlpTxsByTokenId = withSLP(async (SLP, slpAddresses, tokenId) => {
  const transactions = await SLP.Utils.bulkTransactions(
    slpAddresses.map(address => ({ tokenId, address }))
  );
  return transactions;
});

export const getAllConfirmedSlpTxs = withSLP(async (SLP, slpAddresses, tokens) => {
  const transactions = await SLP.Utils.bulkTransactions(
    tokens
      .map(token => slpAddresses.map(address => ({ tokenId: token.tokenId, address })))
      .reduce((a, b) => a.concat(b), [])
  );
  return transactions;
});

const getTokenTransactionHistory = async (SLP, slpAddresses, tokenInfo) => {
  try {
    const { tokenId } = tokenInfo;

    const Xor = (x, y) => (x || y) && !(x && y);

    const calculateTransactionBalance = outputs => {
      if (outputs.length === 1 && slpAddresses.includes(outputs[0].address))
        return +outputs[0].amount;
      if (outputs.length === 1 && !slpAddresses.includes(outputs[0].address))
        return +outputs[0].amount * -1;
      if (outputs.length > 1 && slpAddresses.includes(outputs[outputs.length - 1].address))
        return (
          outputs
            .slice(0, outputs.length - 1)
            .map(element => +element.amount)
            .reduce((a, b) => a + b, 0) * -1
        );
      if (
        outputs.length > 1 &&
        outputs.findIndex(element => slpAddresses.includes(element.address)) !== -1
      )
        return +outputs.find(element => slpAddresses.includes(element.address)).amount;
    };

    const tokenTransactionHistory = {
      confirmed: [],
      unconfirmed: []
    };

    const unconfirmedTxs = await getUnconfirmedTxs(slpAddresses);

    if (unconfirmedTxs.length > 0) {
      const decodedTxs = await decodeRawSlpTrasactionsByTxs(unconfirmedTxs, tokenInfo);

      tokenTransactionHistory.unconfirmed = decodedTxs
        .slice(0, 30)
        .map(txidDetail => ({
          txid: txidDetail.txid,
          detail: txidDetail.tokenDetails,
          balance: calculateTransactionBalance(txidDetail.tokenDetails.outputs),
          confirmations: 0,
          date: new Date()
        }))
        .sort((x, y) => {
          if (Xor(x.detail.transactionType === "GENESIS", y.detail.transactionType === "GENESIS")) {
            return (
              +(x.detail.transactionType === "GENESIS") - +(y.detail.transactionType === "GENESIS")
            );
          }
          if (
            Xor(x.detail.transactionType === "MINT", y.detail.transactionType === "MINT") &&
            x.detail.transactionType !== "GENESIS" &&
            y.detail.transactionType !== "GENESIS"
          ) {
            return +(x.detail.transactionType === "MINT") - +(y.detail.transactionType === "MINT");
          } else {
            return 1;
          }
        });
    }

    const remainingNumberTxsDetails = 30 - tokenTransactionHistory.unconfirmed.length;

    const transactions = await getConfirmedSlpTxsByTokenId(slpAddresses, tokenId);

    if (
      transactions.reduce((a, b) => a.concat(b), []).length > 0 &&
      remainingNumberTxsDetails > 0
    ) {
      const lastNtrancations = (N, transactions) => transactions.map(el => el.slice(0, N));
      const slicedTransactions = lastNtrancations(remainingNumberTxsDetails, transactions);
      const concatenatedTransactions = slicedTransactions.reduce((a, b) => a.concat(b), []);
      const uniqueTxids = [
        ...new Set(concatenatedTransactions.map(transaction => transaction.txid))
      ];

      const revertChunk = chunkedArray =>
        chunkedArray.reduce((unchunkedArray, chunk) => [...unchunkedArray, ...chunk], []);

      const txidChunks = chunk(uniqueTxids, 20);
      const txidDetails = revertChunk(
        await Promise.all(txidChunks.map(txidChunk => SLP.Transaction.details(txidChunk)))
      );

      tokenTransactionHistory.confirmed = txidDetails
        .map(txidDetail => ({
          txid: txidDetail.txid,
          detail: concatenatedTransactions.find(el => el.txid === txidDetail.txid).tokenDetails
            .detail,
          balance: calculateTransactionBalance(
            concatenatedTransactions.find(el => el.txid === txidDetail.txid).tokenDetails.detail
              .outputs
          ),
          confirmations: txidDetail.confirmations,
          date: new Date(txidDetail.time * 1000),
          time: txidDetail.time
        }))
        .sort((x, y) => {
          if (Xor(x.detail.transactionType === "GENESIS", y.detail.transactionType === "GENESIS")) {
            return (
              +(x.detail.transactionType === "GENESIS") - +(y.detail.transactionType === "GENESIS")
            );
          }
          if (
            y.time === x.time &&
            Xor(x.detail.transactionType === "MINT", y.detail.transactionType === "MINT") &&
            x.detail.transactionType !== "GENESIS" &&
            y.detail.transactionType !== "GENESIS"
          ) {
            return +(x.detail.transactionType === "MINT") - +(y.detail.transactionType === "MINT");
          }
          if (y.time === x.time) {
            return 1;
          } else {
            return y.time - x.time;
          }
        })
        .slice(0, remainingNumberTxsDetails);
    }

    const { unconfirmed, confirmed } = tokenTransactionHistory;
    const tokenHistory = unconfirmed.concat(confirmed);

    return tokenHistory;
  } catch (err) {
    console.log("err", err);
    return [];
  }
};

export default withSLP(getTokenTransactionHistory);
