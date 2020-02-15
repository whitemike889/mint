import React, { useState } from "react";
import styled from "styled-components";
import { WalletContext } from "../../../utils/context";
import { sendDividends, DUST } from "../../../utils/sendDividends";
import { Card, Icon, Form, Button, Spin, notification, Badge, Tooltip, message, Alert } from "antd";
import { Row, Col } from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import { FormItemWithMaxAddon } from "../EnhancedInputs";
import { AdvancedOptions } from "./AdvancedOptions";
import { QRCode } from "../../Common/QRCode";
import { getRestUrl } from "../../../utils/withSLP";
import { useInnerScroll } from "../../../utils/useInnerScroll";
import { useDividendsStats } from "./useDividendsStats";

const StyledPayDividends = styled.div`
  * {
    color: rgb(62, 63, 66) !important;
  }

  .ant-alert-message {
    display: flex;
    align-items: center;

    .anticon {
      margin-right: 7px;
      font-size: 18px;
    }
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
  const { wallet, balances, slpBalancesAndUtxos } = React.useContext(WalletContext);
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

  useInnerScroll();

  const { stats } = useDividendsStats({
    token,
    amount: formData.amount,
    setLoading,
    advancedOptions
  });

  const submitEnabled =
    formData.tokenId &&
    formData.amount > DUST &&
    (!stats.maxAmount || formData.amount <= stats.maxAmount) &&
    (!advancedOptions ||
      !advancedOptions.opReturnMessage ||
      advancedOptions.opReturnMessage.length <= 60);

  if (formData.maxAmountChecked && stats.maxAmount !== formData.amount) {
    setFormData({
      ...formData,
      amount: stats.maxAmount
    });
  }

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
      await sendDividends(wallet, slpBalancesAndUtxos.nonSlpUtxos, advancedOptions, {
        value: amount,
        token
      });

      notification.success({
        message: "Success",
        description: (
          <Paragraph>
            Dividend payment scheduled. See "Dividend History" to get more informations.
          </Paragraph>
        ),
        duration: 2
      });

      setLoading(false);
      onClose();
    } catch (e) {
      notification.success({
        message: "Error",
        description: (
          <Paragraph>Unable to schedule dividend payment. Please, try again later.</Paragraph>
        ),
        duration: 2
      });
      console.error(e.message);
      setLoading(false);
    }
  }

  const handleChange = e => {
    const { value, name } = e.target;
    const updatedFormData = { ...formData, dirty: true, maxAmountChecked: false, [name]: value };
    setFormData(updatedFormData);
  };

  const onMaxAmount = async () => {
    setLoading(true);

    try {
      setFormData({
        ...formData,
        maxAmountChecked: true,
        amount: stats.maxAmount
      });
    } catch (err) {
      message.error("Unable to calculate the max amount due to network errors");
    }

    setLoading(false);
  };

  const setAdvancedOptionsAndCalcEligibles = options => {
    setFormData({
      ...formData,
      dirty: true
    });
    setAdvancedOptions(options);
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
                      <Tooltip
                        title={`To be eligible, addresses must have an SLP balance such that their proportional share of your dividend payment is greater than ${DUST} BCH`}
                      >
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
                        <FormItemWithMaxAddon
                          style={{ margin: 0 }}
                          validateStatus={formData.dirty && !submitEnabled ? "error" : ""}
                          help={
                            formData.dirty && !submitEnabled
                              ? `Must be greater than ${DUST} BCH ${
                                  stats.maxAmount > 0
                                    ? `and lower or equal to ${stats.maxAmount}`
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
                      </Form>
                    </Col>
                    <Col span={24}>
                      <Alert
                        style={{ marginBottom: 14 }}
                        message={
                          <>
                            <Icon type="info-circle" />
                            Token holder address and balance list is provided by{" "}
                            {`${getRestUrl()}slp/balancesForToken`} and represents the latest
                            mempool state available to the API.
                          </>
                        }
                        type="info"
                        closable
                      />
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
