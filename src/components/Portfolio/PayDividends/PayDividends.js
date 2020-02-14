/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { WalletContext } from "../../../utils/context";
import retry from "../../../utils/retry";
import {
  sendDividends,
  getBalancesForToken,
  DUST,
  getEligibleAddresses
} from "../../../utils/sendDividends";
import { Card, Icon, Form, Button, Spin, notification, Badge, Tooltip, message } from "antd";
import { Row, Col } from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import debounce from "../../../utils/debounce";
import { FormItemWithMaxAddon } from "../EnhancedInputs";
import { AdvancedOptions } from "./AdvancedOptions";
import { QRCode } from "../../Common/QRCode";
import { getRestUrl } from "../../../utils/withSLP";

const StyledPayDividends = styled.div`
  * {
    color: rgb(62, 63, 66) !important;
  }
`;

const StyledStat = styled.div`
  font-size: 12px;

  .ant-badge sup {
    background: #fbfcfd;
    color: rgba(255, 255, 255, 0.65);
    box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.35);
  }
`;

export const StyledButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const PayDividends = ({ SLP, token, onClose }) => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet, balances, slpBalancesAndUtxos } = ContextValue;
  const [formData, setFormData] = useState({
    dirty: false,
    amount: "",
    tokenId: token.tokenId,
    maxAmount: 0,
    maxAmountChecked: false
  });
  const [advancedOptions, setAdvancedOptions] = useState({
    ignoreOwnAddress: true,
    addressesToExclude: [{ address: "", valid: null }]
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ tokens: 0, holders: 0, eligibles: 0, txFee: 0 });
  const [showMaxAmountTooltip, setShowMaxAmountTooltip] = useState(false);

  const totalBalance = balances.totalBalance;

  const submitEnabled =
    formData.tokenId &&
    formData.amount > DUST &&
    (!formData.maxAmount || formData.amount <= formData.maxAmount);

  useEffect(() => {
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
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!stats.balances || !totalBalance || !slpBalancesAndUtxos) {
      return;
    }
    try {
      const { txFee } = getEligibleAddresses(
        wallet,
        stats.balances,
        totalBalance,
        slpBalancesAndUtxos.nonSlpUtxos,
        advancedOptions
      );
      let { amount } = formData;
      const maxAmount = (totalBalance - txFee).toFixed(8);
      if (formData.maxAmountChecked && maxAmount !== formData.maxAmount) {
        amount = maxAmount;
        setShowMaxAmountTooltip(true);
        setTimeout(() => setShowMaxAmountTooltip(false), 3000);
      }

      setFormData({
        ...formData,
        maxAmount,
        amount
      });
    } catch (error) {}
  }, [wallet, balances, stats.balances, slpBalancesAndUtxos, advancedOptions]);

  const calcEligiblesAndFee = useCallback(
    debounce((amount, advancedOptions) => {
      if (stats.balances && !Number.isNaN(amount) && amount > 0) {
        setLoading(true);
        try {
          const { addresses, txFee } = getEligibleAddresses(
            wallet,
            stats.balances,
            amount,
            slpBalancesAndUtxos.nonSlpUtxos,
            advancedOptions
          );
          setStats({ ...stats, eligibles: addresses.length, txFee });
        } catch (error) {
          message.error("Unable to calculate eligible addresses due to network errors");
        }
        setLoading(false);
      } else {
        setStats({ ...stats, eligibles: 0, txFee: 0 });
      }
    }),
    [wallet, stats]
  );

  async function submit() {
    setFormData({
      ...formData,
      dirty: true
    });

    if (!submitEnabled) {
      return;
    }

    setLoading(true);
    const { amount } = formData;
    try {
      const link = await sendDividends(wallet, slpBalancesAndUtxos.nonSlpUtxos, advancedOptions, {
        value: amount,
        tokenId: token.tokenId
      });

      if (!link) {
        setLoading(false);

        return notification.info({
          message: "Info",
          description: (
            <Paragraph>No token holder with sufficient balance to receive dividends.</Paragraph>
          ),
          duration: 2
        });
      }

      notification.success({
        message: "Success",
        description: (
          <a href={link} target="_blank" rel="noopener noreferrer">
            <Paragraph>Transaction successful. Click or tap here for more details</Paragraph>
          </a>
        ),
        duration: 2
      });

      setLoading(false);
      onClose();
    } catch (e) {
      let message;

      if (/don't have the minting baton/.test(e.message)) {
        message = e.message;
      } else if (/Invalid BCH address/.test(e.message)) {
        message = "Invalid BCH address";
      } else if (/64: dust/.test(e.message)) {
        message = "Small amount";
      } else if (/Balance 0/.test(e.message)) {
        message = "Balance of sending address is zero";
      } else if (/Insufficient funds/.test(e.message)) {
        message = "Insufficient funds.";
      }
      if (!e.error) {
        message = message = `Transaction failed. This error is probably caused by ${getRestUrl()} being down.`;
      } else {
        message = e.message;
      }

      notification.error({
        message: "Error",
        description: message,
        duration: 2
      });
      console.error(e.message);
      setLoading(false);
    }
  }

  const handleChange = e => {
    const { value, name } = e.target;
    setFormData(p => ({ ...p, dirty: true, maxAmountChecked: false, [name]: value }));

    if (name === "amount") {
      calcEligiblesAndFee(value, advancedOptions);
    }
  };

  const onMaxAmount = useCallback(async () => {
    setLoading(true);

    try {
      let amount = formData.maxAmount >= 0 ? formData.maxAmount : 0;
      setFormData({
        ...formData,
        maxAmountChecked: true,
        amount
      });
      await calcEligiblesAndFee(amount, advancedOptions);
    } catch (err) {
      message.error("Unable to calculate the max amount due to network errors");
    }

    setLoading(false);
  }, [formData, advancedOptions]);

  const setAdvancedOptionsAndCalcEligibles = options => {
    setFormData({
      ...formData,
      dirty: true
    });
    setAdvancedOptions(options);
    calcEligiblesAndFee(formData.amount, options);
  };

  return (
    <StyledPayDividends>
      <Row type="flex" className="dividends">
        <Col span={24}>
          <Spin spinning={loading}>
            <Card
              title={
                <h2>
                  <Icon type="dollar-circle" theme="filled" /> Pay Dividends
                </h2>
              }
              bordered={false}
            >
              {!balances.totalBalance ? (
                <Row justify="center" type="flex">
                  <Col>
                    <br />
                    <StyledButtonWrapper>
                      <>
                        <Paragraph>
                          You currently have 0 BCH. Deposit some funds to use this feature.
                        </Paragraph>
                        <Paragraph>
                          <QRCode id="borderedQRCode" address={wallet.Path145.cashAddress} />
                        </Paragraph>
                      </>
                    </StyledButtonWrapper>
                  </Col>
                </Row>
              ) : (
                <>
                  <br />
                  <Row type="flex">
                    <Col>
                      <Tooltip title="Circulating Supply">
                        <StyledStat>
                          <Icon type="gold" />
                          &nbsp;
                          <Badge
                            count={new Intl.NumberFormat("en-US").format(stats.tokens)}
                            overflowCount={Number.MAX_VALUE}
                            showZero
                          />
                          <Paragraph>Tokens</Paragraph>
                        </StyledStat>
                      </Tooltip>
                    </Col>
                    &nbsp; &nbsp; &nbsp;
                    <Col>
                      <Tooltip title="Addresses with at least one token">
                        <StyledStat>
                          <Icon type="team" />
                          &nbsp;
                          <Badge
                            count={new Intl.NumberFormat("en-US").format(stats.holders)}
                            overflowCount={Number.MAX_VALUE}
                            showZero
                          />
                          <Paragraph>Holders</Paragraph>
                        </StyledStat>
                      </Tooltip>
                    </Col>
                    &nbsp; &nbsp; &nbsp;
                    <Col>
                      <Tooltip title="Addresses eligible to receive dividends for the specified amount">
                        <StyledStat>
                          <Icon type="usergroup-add" />
                          &nbsp;
                          <Badge
                            count={new Intl.NumberFormat("en-US").format(stats.eligibles)}
                            overflowCount={Number.MAX_VALUE}
                            showZero
                          />
                          <Paragraph>Eligibles</Paragraph>
                        </StyledStat>
                      </Tooltip>
                    </Col>
                  </Row>
                  <Row type="flex">
                    <Col span={24}>
                      <Form style={{ width: "auto", marginBottom: "1em" }} noValidate>
                        <Tooltip
                          placement="topRight"
                          visible={showMaxAmountTooltip}
                          title={`Max amount changed to ${formData.maxAmount}!`}
                        >
                          <FormItemWithMaxAddon
                            style={{ margin: 0 }}
                            validateStatus={formData.dirty && !submitEnabled ? "error" : ""}
                            help={
                              formData.dirty && !submitEnabled
                                ? `Must be greater than ${DUST} BCH ${
                                    formData.maxAmount > 0
                                      ? `and lower or equal to ${formData.maxAmount}`
                                      : ""
                                  }`
                                : ""
                            }
                            onMax={onMaxAmount}
                            inputProps={{
                              suffix: "BCH",
                              name: "amount",
                              placeholder: "Amount",
                              onChange: e => handleChange(e),
                              required: true,
                              value: formData.amount
                            }}
                          />
                        </Tooltip>
                      </Form>
                    </Col>
                    <Col span={24}>
                      <AdvancedOptions
                        advancedOptions={advancedOptions}
                        setAdvancedOptions={setAdvancedOptionsAndCalcEligibles}
                      />
                    </Col>
                    <Col span={24}>
                      <div style={{ paddingTop: "12px" }}>
                        <Button disabled={!submitEnabled} onClick={() => submit()}>
                          Pay Dividends
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </>
              )}
            </Card>
          </Spin>
        </Col>
      </Row>
    </StyledPayDividends>
  );
};

export default PayDividends;
