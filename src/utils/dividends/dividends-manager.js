import DividendsPayment from "./dividends";
import { sendBch, SEND_BCH_ERRORS } from "../sendBch";
import Dividends from "./dividends";
import { getEncodedOpReturnMessage } from "../sendDividends";

export default class DividendsManager {
  static async update({ wallet, utxos }) {
    try {
      const dividends = Object.values(DividendsPayment.getAll());
      const dividend = dividends.find(
        dividend => dividend.progress < 1 && dividend.status === Dividends.Status.IN_PROGRESS
      );
      if (dividend && utxos) {
        await DividendsManager._update({ wallet, dividend, utxos });
      }
    } catch (error) {
      console.info("Unable to update dividends", error.message);
    }
  }

  static async _update({ wallet, dividend, utxos }) {
    try {
      const addresses = dividend.remainingRecipients.slice(0, Dividends.BATCH_SIZE);
      const values = dividend.remainingValues.slice(0, Dividends.BATCH_SIZE);
      const { encodedOpReturn } = getEncodedOpReturnMessage(
        dividend.opReturn,
        dividend.token.tokenId
      );

      const link = await sendBch(wallet, utxos, {
        addresses,
        values,
        encodedOpReturn
      });
      const tx = link.match(/([^/]+)$/)[1];
      dividend.txs.push(tx);
      dividend.remainingRecipients = dividend.remainingRecipients.slice(Dividends.BATCH_SIZE);
      dividend.remainingValues = dividend.remainingValues.slice(Dividends.BATCH_SIZE);
      dividend.progress = 1 - dividend.remainingRecipients.length / dividend.totalRecipients;
      if (dividend.remainingValues.length === 0) {
        dividend.endDate = Date.now();
      }
      Dividends.save(dividend);
    } catch (error) {
      if (
        error.code &&
        (error.code === SEND_BCH_ERRORS.DOUBLE_SPENDING ||
          error.code === SEND_BCH_ERRORS.NETWORK_ERROR)
      ) {
        return;
      }

      dividend.error = error.message;
      dividend.status = Dividends.Status.CRASHED;
      Dividends.save(dividend);
      console.info("Unable to update dividend", error.message);
    }
  }
}
