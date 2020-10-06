import React, { useState } from "react";
import { Row, Col, Card, Icon, Typography, Select, Alert, notification } from "antd";
import styled from "styled-components";
import StyledSatoshiDice from "../Common/StyledPage";
import SendBCH from "../Portfolio/SendBCH/SendBCH";
import satoshiDice from "../../utils/satoshiDice";
import { WalletContext } from "../../utils/context";

const { Option } = Select;
const { Text, Title, Paragraph } = Typography;

const StyledSelect = styled(Select)`
  width: 200px;
  margin-top: 15px !important;
`;

export default () => {
  const [multiplier, setMultiplier] = useState(satoshiDice[`1.1x`]);
  const [betTxId, setBetTxId] = useState(false);
  const { balances } = React.useContext(WalletContext);

  React.useEffect(() => {
    async function checkResultBet() {
      if (betTxId) {
        console.log(`https://satoshidice.com/api/game?txid=${betTxId}`);
        setTimeout(() => {
          fetch(`https://satoshidice.com/api/game?txid=${betTxId}`).then(response => response.json())
          .then(data => { 
            if (data.payload.length > 0) {
              if (data.payload[0].win) {
                notification.success({
                  message: "Congratulations",
                  description: (
                  
                  <Paragraph>You won {data.payload[0].payout} BCH!</Paragraph>
                   
                  ),
                  duration: 2
                });
              } else {
                notification.error({
                  message: "You lost",
                  description: (
                    <Paragraph>You lost. Try again next time!</Paragraph>
                     
                    ),
                    duration: 2
                })
              } 
            }
         

          })
        }, 3000);
      }
   }

   checkResultBet()
  }, [betTxId])

  return (
    <StyledSatoshiDice>
      <Row justify="center" type="flex">
        <Col sm={24} lg={12} span={24}>
          <Card
            className="audit"
            title={
              <h2>
                <Icon type="trophy" theme="filled" /> Satoshi Dice
              </h2>
            }
            bordered={true}
          >
            <Title level={4}>A provably fair on-chain Bitcoin Cash game.</Title>
            <Text>
              Check the complete set of rules{" "}
              <a href="https://satoshidice.com/rules/" rel="noopener noreferrer" target="_blank">
                here
              </a>
              .
              <br />
            </Text>
            <StyledSelect
              defaultValue={`1.1x`}
              onChange={value => setMultiplier(satoshiDice[value])}
            >
              {Object.keys(satoshiDice).map(s => (
                <Option value={s}>
                  {s} - {satoshiDice[s].description}
                </Option>
              ))}
            </StyledSelect>

            <Alert
              style={{ marginTop: "10px" }}
              message={
                <>
                  <Paragraph>
                    <Icon type="warning" /> Be careful.
                  </Paragraph>
                  <Paragraph>
                    <strong>MIN</strong>: {multiplier.min} BCH - <strong>MAX</strong>:{" "}
                    {multiplier.max} BCH
                  </Paragraph>
                </>
              }
            />
            {multiplier && <SendBCH callbackTxId={(txId) => setBetTxId(txId)} filledAddress={multiplier.address} onClose={() => null} />}
          </Card>
        </Col>
      </Row>
    </StyledSatoshiDice>
  );
};
