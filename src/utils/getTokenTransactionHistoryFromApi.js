import withSLP from "./withSLP";
import chunk from "lodash/chunk";

const getTokenTransactionHistoryFromApi = async (SLP, slpAddresses, tokenId) => {
  try {
    const tokenTransactionHistory = {
      confirmed: [],
      unconfirmed: []
    };

    const transactions = await SLP.Utils.bulkTransactions(
      slpAddresses.map(address => ({ tokenId, address }))
    );
    if (transactions[0].length > 0) {
      const lastNtrancations = (N, transactions) => transactions.map(el => el.slice(0, N));
      const slicedTransactions = lastNtrancations(30, transactions);
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
          if (x.detail.transactionType === "GENESIS" || y.detail.transactionType === "GENESIS") {
            return (
              +(x.detail.transactionType === "GENESIS") - +(y.detail.transactionType === "GENESIS")
            );
          }
          if (
            y.time === x.time &&
            (x.detail.transactionType === "MINT" || y.detail.transactionType === "MINT") &&
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
        });
    }

    console.log("tokenTransactionHistory.confirmed", tokenTransactionHistory.confirmed);
  } catch (err) {
    console.log("err", err);
    return [];
  }
};

export default withSLP(getTokenTransactionHistoryFromApi);
