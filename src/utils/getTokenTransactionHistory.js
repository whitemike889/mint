import withSLP from "./withSLP";
import getTokenTransactionHistoryFromApi from "./getTokenTransactionHistoryFromApi";

const getTokenTransactionHistory = async (SLP, slpAddresses, tokenId) => {
  try {
    const query = {
      v: 3,
      q: {
        db: ["c", "u"],
        find: {
          $or: [
            {
              "in.e.a": { $in: slpAddresses }
            },
            {
              "out.e.a": { $in: slpAddresses }
            }
          ],
          "slp.detail.tokenIdHex": tokenId
        },
        sort: {
          "blk.t": -1
        },
        limit: 30
      },
      r: {
        f: "[.[] | { txid: .tx.h, tokenDetails: .slp, blk: .blk } ]"
      }
    };

    await getTokenTransactionHistoryFromApi(slpAddresses, tokenId);

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

    const slpDbInstance = SLP.SLPDB;
    const queryResults = await slpDbInstance.get(query);
    const tokenTransactionHistory = {
      confirmed: [],
      unconfirmed: []
    };

    if (queryResults.c.length) {
      tokenTransactionHistory.confirmed = queryResults.c
        .sort((x, y) => {
          if (
            x.tokenDetails.detail.transactionType === "GENESIS" ||
            y.tokenDetails.detail.transactionType === "GENESIS"
          ) {
            return (
              +(x.tokenDetails.detail.transactionType === "GENESIS") -
              +(y.tokenDetails.detail.transactionType === "GENESIS")
            );
          }
          if (
            y.blk.t === x.blk.t &&
            (x.tokenDetails.detail.transactionType === "MINT" ||
              y.tokenDetails.detail.transactionType === "MINT") &&
            x.tokenDetails.detail.transactionType !== "GENESIS" &&
            y.tokenDetails.detail.transactionType !== "GENESIS"
          ) {
            return (
              +(x.tokenDetails.detail.transactionType === "MINT") -
              +(y.tokenDetails.detail.transactionType === "MINT")
            );
          }
          if (y.blk.t === x.blk.t) {
            return -1;
          } else {
            return y.blk.t - x.blk.t;
          }
        })
        .map(el => ({
          txid: el.txid,
          detail: el.tokenDetails.detail,
          balance: calculateTransactionBalance(el.tokenDetails.detail.outputs),
          date: new Date(Number(el.blk.t) * 1000),
          confirmed: true
        }));
    }

    if (queryResults.u.length) {
      tokenTransactionHistory.unconfirmed = queryResults.u
        .sort((x, y) => {
          if (
            x.tokenDetails.detail.transactionType === "GENESIS" ||
            y.tokenDetails.detail.transactionType === "GENESIS"
          ) {
            return (
              +(x.tokenDetails.detail.transactionType === "GENESIS") -
              +(y.tokenDetails.detail.transactionType === "GENESIS")
            );
          }
          if (
            (x.tokenDetails.detail.transactionType === "MINT" ||
              y.tokenDetails.detail.transactionType === "MINT") &&
            x.tokenDetails.detail.transactionType !== "GENESIS" &&
            y.tokenDetails.detail.transactionType !== "GENESIS"
          ) {
            return (
              +(x.tokenDetails.detail.transactionType === "MINT") -
              +(y.tokenDetails.detail.transactionType === "MINT")
            );
          } else {
            return -1;
          }
        })
        .map(el => ({
          txid: el.txid,
          detail: el.tokenDetails.detail,
          balance: calculateTransactionBalance(el.tokenDetails.detail.outputs),
          date: new Date(),
          confirmed: false
        }));
    }
    const { confirmed, unconfirmed } = tokenTransactionHistory;

    return unconfirmed.concat(confirmed);
  } catch (e) {
    console.log("error :", e);
    return [];
  }
};

export default withSLP(getTokenTransactionHistory);
