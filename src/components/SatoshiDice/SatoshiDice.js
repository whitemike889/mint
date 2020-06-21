import React, { useState } from "react";
import { Row, Col, Card, Icon, Typography, Select, Alert } from "antd";
import styled from "styled-components";
import StyledSatoshiDice from "../Common/StyledPage";
import SendBCH from "../Portfolio/SendBCH/SendBCH";
import satoshiDice from "../../utils/satoshiDice";

const { Option } = Select;
const { Text, Title, Paragraph } = Typography;

const StyledSelect = styled(Select)`
  width: 200px;
  margin-top: 15px !important;
`;

export default () => {
  const [multiplier, setMultiplier] = useState(satoshiDice[`1.1x`]);

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
            {multiplier && <SendBCH filledAddress={multiplier.address} />}

            <br />
            <Alert
              style={{ marginBottom: "10px" }}
              message={
                <span>
                  <Paragraph>
                    <strong>
                      If you win the bet, you will receive the payout in a few seconds.
                    </strong>
                  </Paragraph>
                  <Paragraph>
                    Check recent games at{" "}
                    <a href="https://satoshidice.com" rel="noopener noreferrer" target="_blank">
                      satoshidice.com
                    </a>
                  </Paragraph>
                </span>
              }
              type="warning"
            />
          </Card>
        </Col>
      </Row>
    </StyledSatoshiDice>
  );
};
