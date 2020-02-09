import chunk from "lodash/chunk";
import BigNumber from "bignumber.js";
import withSLP from "./withSLP";

export const isSlpTx = withSLP((SLP, txDetail) => {
  const scriptASMArray = SLP.Script.toASM(
    Buffer.from(txDetail.vout[0].scriptPubKey.hex, "hex")
  ).split(" ");
  if (
    scriptASMArray[0] !== "OP_RETURN" ||
    scriptASMArray[1] !== "534c5000" ||
    (scriptASMArray[2] !== "OP_1" &&
      scriptASMArray[2] !== "OP_1NEGATE" &&
      scriptASMArray[2] !== "41")
  ) {
    return false;
  }

  return true;
});

const revertChunk = chunkedArray =>
  chunkedArray.reduce((unchunkedArray, chunk) => [...unchunkedArray, ...chunk], []);

const decodeTokenDetails = withSLP((SLP, txDetail) => {
  const script = SLP.Script.toASM(Buffer.from(txDetail.vout[0].scriptPubKey.hex, "hex")).split(" ");

  const tokenDetails = {
    isSlpTxid: false,
    transactionType: "",
    info: {},
    outputs: [],
    symbol: ""
  };
  const isSlp = isSlpTx(txDetail);

  if (isSlp === true) {
    tokenDetails.isSlpTxid = true;
    tokenDetails.transactionType = Buffer.from(script[3], "hex")
      .toString("ascii")
      .toUpperCase();

    if (tokenDetails.transactionType === "GENESIS") {
      const decimals = script[8].startsWith("OP_")
        ? parseInt(script[8].slice(3), 10)
        : parseInt(script[8], 16);
      tokenDetails.info = {
        tokenId: txDetail.txid,
        symbol: Buffer.from(script[4], "hex").toString("ascii"),
        name: Buffer.from(script[5], "hex").toString("ascii"),
        decimals,
        documentUri: Buffer.from(script[6], "hex").toString("ascii"),
        documentHash: script[7]
      };
      tokenDetails.symbol = Buffer.from(script[4], "hex").toString("ascii");
      tokenDetails.outputs = [
        {
          address: SLP.Address.toSLPAddress(txDetail.vout[1].scriptPubKey.addresses[0]),
          amount: new BigNumber(script[10], 16).div(Math.pow(10, decimals))
        }
      ];
    } else if (tokenDetails.transactionType === "MINT") {
      tokenDetails.info = {
        tokenId: script[4]
      };
      tokenDetails.outputs = [
        {
          address: SLP.Address.toSLPAddress(txDetail.vout[1].scriptPubKey.addresses[0]),
          rawAmount: new BigNumber(script[6], 16)
        }
      ];
    } else if (tokenDetails.transactionType === "SEND") {
      tokenDetails.info = {
        tokenId: script[4]
      };
      tokenDetails.outputs = script.slice(5, script.length).map((rawBalance, index) => ({
        address: SLP.Address.toSLPAddress(txDetail.vout[index + 1].scriptPubKey.addresses[0]),
        rawAmount: new BigNumber(rawBalance, 16)
      }));
    }
    return tokenDetails;
  } else {
    return false;
  }
});

const handleTxs = withSLP(async (SLP, txidDetails, tokenInfo) => {
  const slpTxidDetails = txidDetails
    .map(txDetail => ({
      ...txDetail,
      tokenDetails: decodeTokenDetails(txDetail)
    }))
    .filter(detail => detail.tokenDetails !== false);

  if (slpTxidDetails.lenght === 0) return [];
  if (tokenInfo === null || (tokenInfo || {}).tokenId === undefined) {
    const tokenIdChunks = chunk(
      [...new Set(slpTxidDetails.map(detail => detail.tokenDetails.info.tokenId))],
      20
    );
    const tokensInfo = revertChunk(
      await Promise.all(tokenIdChunks.map(tokenIdChunk => SLP.Utils.tokenStats(tokenIdChunk)))
    );

    return slpTxidDetails.map(detail => {
      const tokenInfo = tokensInfo.find(info => info.id === detail.tokenDetails.info.tokenId);
      if (detail.tokenDetails.transactionType !== "GENESIS") {
        const { decimals, symbol } = tokenInfo;
        return {
          ...detail,
          tokenDetails: {
            ...detail.tokenDetails,
            symbol,
            info: { ...detail.tokenDetails.info, ...tokenInfo },
            outputs: detail.tokenDetails.outputs.map(output => ({
              ...output,
              amount: output.rawAmount.div(Math.pow(10, decimals))
            }))
          }
        };
      }
      return detail;
    });
  } else {
    const decodedTxs = slpTxidDetails
      .filter(detail => detail.tokenDetails.info.tokenId === tokenInfo.tokenId)
      .map(tokenTxDetail => {
        if (tokenTxDetail.tokenDetails.transactionType !== "GENESIS") {
          const { decimals, symbol } = tokenInfo;
          return {
            ...tokenTxDetail,
            tokenDetails: {
              ...tokenTxDetail.tokenDetails,
              symbol,
              info: { ...tokenTxDetail.tokenDetails.info, ...tokenInfo },
              outputs: tokenTxDetail.tokenDetails.outputs.map(output => ({
                ...output,
                amount: output.rawAmount.div(Math.pow(10, decimals))
              }))
            }
          };
        }
        return tokenTxDetail;
      });
    return decodedTxs;
  }
});
export const decodeRawSlpTrasactionsByTxids = withSLP(async (SLP, txids, tokenInfo = null) => {
  const txidChunks = chunk(txids, 20);
  const txidDetails = revertChunk(
    await Promise.all(txidChunks.map(txidChunk => SLP.Transaction.details(txidChunk)))
  );
  return handleTxs(txidDetails, tokenInfo);
});

export const decodeRawSlpTrasactionsByTxs = async (txs, tokenInfo = null) =>
  await handleTxs(txs, tokenInfo);
