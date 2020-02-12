import React, { useState } from "react";
import { withRouter } from "react-router-dom";
import Img from "react-image";
import makeBlockie from "ethereum-blockies-base64";
import { WalletContext } from "../../utils/context";
import { Icon, Row, Col, Empty, Progress, Descriptions } from "antd";
import styled, { createGlobalStyle } from "styled-components";
import moment from "moment";
import { useEffect } from "react";
import Dividends from "../../utils/dividends/dividends";
import { SLP_TOKEN_ICONS_URL } from "../Portfolio/Portfolio";
import { EnhancedCard } from "../Portfolio/EnhancedCard";
import bchFlagLogo from "../../assets/4-bitcoin-cash-logo-flag.png";
import { getEncodedOpReturnMessage } from "../../utils/sendDividends";

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
  transform: scale(0.7, 0.7) translate(-35%, -130%);

  .ant-progress-text {
    color: #00c389 !important;
  }
`;

const StyledDescriptions = styled(Descriptions)`
  margin-top: 6px;

  .ant-descriptions-item {
    white-space: nowrap;
  }
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
                    <Descriptions.Item label="Start Date">
                      {moment(dividend.startDate).format("LL LTS")}
                    </Descriptions.Item>
                    <Descriptions.Item label="End Date">
                      {moment(dividend.endDate).format("LL LTS")}
                    </Descriptions.Item>
                  </StyledDescriptions>
                )}
                onClose={() => setSelected(null)}
              >
                <StyledSummary>
                  <StyledSummaryIcons>
                    <Img src={bchFlagLogo} width="96" height="54" />
                    <StyledProgressAndIcon>
                      <StyledProgress
                        strokeColor="#00c389"
                        status="normal"
                        type="circle"
                        percent={100 * dividend.progress}
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
