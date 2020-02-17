import React, { useState } from "react";
import Img from "react-image";
import makeBlockie from "ethereum-blockies-base64";
import { WalletContext } from "../../utils/context";
import { Icon, Row, Col, Empty, Progress, Descriptions, Button, Alert } from "antd";
import styled, { createGlobalStyle } from "styled-components";
import moment from "moment";
import { useEffect } from "react";
import Dividends from "../../utils/dividends/dividends";
import { SLP_TOKEN_ICONS_URL } from "../Portfolio/Portfolio";
import { EnhancedCard } from "../Portfolio/EnhancedCard";
import bchFlagLogo from "../../assets/4-bitcoin-cash-logo-flag.png";
import { getEncodedOpReturnMessage } from "../../utils/sendDividends";
import ButtonGroup from "antd/lib/button/button-group";

const StyledCol = styled(Col)`
  margin-top: 8px;
`;

const StyledSummary = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const GlobalStyle = createGlobalStyle`
    .ant-modal-body ${StyledSummary} {
        padding-top: 50px;
    }
`;

const StyledSummaryIcons = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StyledProgressAndIcon = styled.div`
  position: relative;
`;

const StyledProgress = styled(Progress)`
  position: absolute;
  top: 0;
  left: 0;
  transform: scale(0.8, 0.8) translate(-35%, -120%);

  .ant-progress-text {
    color: ${props => props.strokeColor} !important;
  }
`;

const StyledDescriptions = styled(Descriptions)`
  margin-top: 6px;
  overflow: visible;

  .ant-descriptions-item-content,
  .ant-descriptions-item-content * {
    font-size: 14px;
    color: rgba(127, 127, 127, 0.65) !important;
  }

  .ant-descriptions-row > th,
  .ant-descriptions-row > td {
    padding-bottom: 4px;
  }

  .ant-descriptions-item-label {
    color: black;

    &::after {
      margin-right: 4px;
    }
  }
`;

const StyledSummaryIconArrow = styled(Icon)`
  font-size: 20px;
`;

const StyledCard = styled(EnhancedCard)`
  margin-top: 8px;
  text-align: left;
  overflow hidden;

  .ant-modal-body ${StyledSummary} {
    padding-top: 50px;
  }
`;

const DividendHistory = () => {
  const { balances } = React.useContext(WalletContext);
  const [dividends, setDividends] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setDividends(Object.values(Dividends.getAll()).sort((a, b) => b.startDate - a.startDate));
  }, [balances]);

  const isEmpty = !dividends || dividends.length === 0;

  const getProgressColor = dividend => {
    if (dividend.status === Dividends.Status.PAUSED) {
      return "orange";
    } else if (
      dividend.status === Dividends.Status.CANCELED ||
      dividend.status === Dividends.Status.CRASHED
    ) {
      return "red";
    } else {
      return "#00c389";
    }
  };

  const updateDividendStatus = (dividend, status) => {
    const div = dividends.find(d => d.startDate === dividend.startDate);
    div.status = status;
    setDividends([...dividends]);
    Dividends.save(dividend);
  };

  return (
    <>
      <GlobalStyle />
      {isEmpty ? (
        <Empty description="No dividends found" />
      ) : (
        <Row type="flex" gutter={32}>
          {dividends.map(dividend => (
            <StyledCol xl={8} lg={12} span={24}>
              <StyledCard
                onClick={() => setSelected(dividend)}
                expand={selected && selected.startDate === dividend.startDate}
                renderExpanded={() => (
                  <>
                    <br />
                    {dividend.progress === 1 && (
                      <Alert
                        style={{ marginBottom: 14 }}
                        message={
                          <>
                            <Icon type="info-circle" />
                            Completed
                          </>
                        }
                        type="info"
                        closable={false}
                      />
                    )}
                    {dividend.status === Dividends.Status.CANCELED && (
                      <Alert
                        style={{ marginBottom: 14 }}
                        message={
                          <>
                            <Icon type="stop" />
                            Canceled
                          </>
                        }
                        type="info"
                        closable={false}
                      />
                    )}
                    {dividend.status === Dividends.Status.CRASHED && (
                      <Alert
                        style={{ marginBottom: 14 }}
                        message={
                          <>
                            <Icon type="stop" />
                            Crashed {dividend.error ? `Cause: ${dividend.error}` : ""}
                          </>
                        }
                        type="error"
                        closable={false}
                      />
                    )}
                    {dividend.progress < 1 && dividend.status !== Dividends.Status.CANCELED ? (
                      <ButtonGroup>
                        {dividend.status !== Dividends.Status.PAUSED &&
                        dividend.status !== Dividends.Status.CRASHED ? (
                          <Button
                            type="primary"
                            icon="pause-circle"
                            onClick={() => updateDividendStatus(dividend, Dividends.Status.PAUSED)}
                          >
                            Pause
                          </Button>
                        ) : (
                          <Button
                            type="primary"
                            icon="play-circle"
                            onClick={() =>
                              updateDividendStatus(dividend, Dividends.Status.IN_PROGRESS)
                            }
                          >
                            Resume
                          </Button>
                        )}
                      </ButtonGroup>
                    ) : null}
                    <StyledDescriptions bordered column={1}>
                      <Descriptions.Item label="Addresses">
                        {dividend.totalRecipients}
                      </Descriptions.Item>
                      <Descriptions.Item label="OP Return Messasge">
                        {
                          getEncodedOpReturnMessage(dividend.opReturn, dividend.token.tokenId)
                            .decodedOpReturn
                        }
                      </Descriptions.Item>
                      <Descriptions.Item label="Start Date">
                        {moment(dividend.startDate).format("LL LTS")}
                      </Descriptions.Item>
                      {dividend.endDate ? (
                        <Descriptions.Item label="End Date">
                          {moment(dividend.endDate).format("LL LTS")}
                        </Descriptions.Item>
                      ) : null}
                      {dividend.txs.map((tx, index) => (
                        <Descriptions.Item label={`Transaction ${index + 1}`}>
                          <a
                            href={`https://explorer.bitcoin.com/bch/tx/${tx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {tx}
                          </a>
                        </Descriptions.Item>
                      ))}
                    </StyledDescriptions>
                    <br />
                  </>
                )}
                onClose={() => setSelected(null)}
              >
                <StyledSummary>
                  <StyledSummaryIcons>
                    <Img src={bchFlagLogo} width="96" height="54" />
                    <StyledProgressAndIcon>
                      <StyledProgress
                        strokeColor={getProgressColor(dividend)}
                        status="normal"
                        type="circle"
                        percent={Number(100 * dividend.progress).toFixed(0)}
                        width={40}
                      />
                      <StyledSummaryIconArrow type="arrow-right" />
                    </StyledProgressAndIcon>
                    <Img
                      src={`${SLP_TOKEN_ICONS_URL}/${dividend.token.tokenId}.png`}
                      unloader={
                        <img
                          alt={`identicon of tokenId ${dividend.token.tokenId} `}
                          heigh="60"
                          width="60"
                          style={{ borderRadius: "50%" }}
                          key={`identicon-${dividend.token.tokenId}`}
                          src={makeBlockie(dividend.token.tokenId)}
                        />
                      }
                    />
                  </StyledSummaryIcons>
                  <StyledDescriptions column={1}>
                    <Descriptions.Item label="BCH Amount">{dividend.totalValue}</Descriptions.Item>
                    <Descriptions.Item label="Token">
                      {dividend.token.info.symbol}
                    </Descriptions.Item>
                  </StyledDescriptions>
                </StyledSummary>
              </StyledCard>
            </StyledCol>
          ))}
        </Row>
      )}
    </>
  );
};

export default DividendHistory;
