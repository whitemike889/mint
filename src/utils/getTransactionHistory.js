import withSLP from "./withSLP";
import chunk from "lodash/chunk";
import { getUnconfirmedTxs, getAllConfirmedSlpTxs } from "./getTokenTransactionHistory";
import { isSlpTx } from "./decodeRawSlpTransactions";

export const isBchDividens = withSLP((SLP, vout) => {
  const scriptASMArray = SLP.Script.toASM(Buffer.from(vout[0].scriptPubKey.hex, "hex")).split(" ");
  const metaData =
    scriptASMArray.length > 1
      ? Buffer.from(scriptASMArray[1], "hex")
          .toString("ascii")
          .split(" ")
      : null;
  return scriptASMArray[0] === "OP_RETURN" &&
    metaData &&
    metaData[1] &&
    metaData[1].includes("MintDividend")
    ? decodeBchDividensMetaData(metaData)
    : false;
});

export const hasOpReturn = withSLP((SLP, vout) => {
  const scriptASMArray = SLP.Script.toASM(Buffer.from(vout[0].scriptPubKey.hex, "hex")).split(" ");

  return scriptASMArray[0] === "OP_RETURN";
});

const decodeBchDividensMetaData = metaData => {
  console.log("metaData :", metaData);
  return {
    tokenId: metaData[0],
    message: metaData.length > 2 ? metaData.slice(2, metaData.length).join(" ") : ""
  };
};

const getTransactionHistory = async (SLP, cashAddresses, transactions, tokens) => {
  try {
    const calculateTransactionBalance = vout => {
      console.log("vout :", vout);
      const isDividends = isBchDividens(vout);

      console.log("isDividends :", isDividends);
      if (isDividends) {
        if (
          vout.length > 2 &&
          cashAddresses.includes(
            SLP.Address.toCashAddress(vout[vout.length - 1].scriptPubKey.addresses[0])
          )
        )
          return {
            balance:
              vout
                .slice(1, vout.length - 1)
                .map(element => +element.value)
                .reduce((a, b) => a + b, 0) * -1,
            type: "MintDividend Sent",
            addrs: vout
              .slice(1, vout.length - 1)
              .map(element => SLP.Address.toCashAddress(element.scriptPubKey.addresses[0])),
            metaData: isDividends
          };
        if (
          vout.length > 2 &&
          vout
            .slice(1, vout.length - 1)
            .findIndex(element =>
              cashAddresses.includes(SLP.Address.toCashAddress(element.scriptPubKey.addresses[0]))
            ) !== -1
        )
          return {
            balance: vout
              .slice(1, vout.length - 1)
              .filter(element =>
                cashAddresses.includes(SLP.Address.toCashAddress(element.scriptPubKey.addresses[0]))
              )
              .map(el => +el.value)
              .reduce((a, b) => a + b, 0),
            type: "MintDividend Received",
            addrs: vout
              .slice(1, vout.length - 1)
              .filter(element =>
                cashAddresses.includes(SLP.Address.toCashAddress(element.scriptPubKey.addresses[0]))
              )
              .map(el => SLP.Address.toCashAddress(el.scriptPubKey.addresses[0])),
            metaData: isDividends
          };
      } else if (!hasOpReturn(vout)) {
        if (
          vout.length === 1 &&
          cashAddresses.includes(SLP.Address.toCashAddress(vout[0].scriptPubKey.addresses[0]))
        )
          return { balance: +vout[0].value, type: "Received" };
        if (
          vout.length === 1 &&
          !cashAddresses.includes(SLP.Address.toCashAddress(vout[0].scriptPubKey.addresses[0]))
        )
          return { balance: +vout[0].value * -1, type: "Sent" };
        if (
          vout.length > 1 &&
          cashAddresses.includes(
            SLP.Address.toCashAddress(vout[vout.length - 1].scriptPubKey.addresses[0])
          )
        )
          return {
            balance:
              vout
                .slice(0, vout.length - 1)
                .map(element => +element.value)
                .reduce((a, b) => a + b, 0) * -1,
            type: "Sent"
          };
        if (
          vout.length > 1 &&
          vout.findIndex(element =>
            cashAddresses.includes(SLP.Address.toCashAddress(element.scriptPubKey.addresses[0]))
          ) !== -1
        )
          return {
            balance: +vout.find(element =>
              cashAddresses.includes(SLP.Address.toCashAddress(element.scriptPubKey.addresses[0]))
            ).value,
            type: "Received"
          };
      } else {
        return {
          balance: null,
          type: "unknow"
        };
      }
    };

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
        transactionBalance: calculateTransactionBalance(el.vout)
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
      console.log("transactionHistory.confirmed :", transactionHistory.confirmed);

      transactionHistory.confirmed = txidDetails
        .sort((x, y) => y.time - x.time)
        .map(el => ({
          txid: el.txid,
          date: new Date(el.time * 1000),
          confirmations: el.confirmations,
          transactionBalance: calculateTransactionBalance(el.vout)
        }));
    }

    const { unconfirmed, confirmed } = transactionHistory;
    const history = unconfirmed.concat(confirmed);

    console.log("history :", history);
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
