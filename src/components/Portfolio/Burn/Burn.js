import React, { useState } from "react";
import styled from "styled-components";
import { ButtonQR } from "badger-components-react";
import { WalletContext } from "../../../utils/context";
import burnToken from "../../../utils/broadcastTransaction";
import { Alert, Card, Icon, Form, Input, Button, Spin, notification } from "antd";
import { Row, Col } from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import { FireIcon } from "../../Common/CustomIcons";

const StyledButtonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const StyledBurnAlert = styled.div`
  .ant-alert.ant-alert-warning.ant-alert-no-icon {
    margin-bottom: 10px;
    border: 2px solid #e4454f !important;
    border-radius: 4px;
    background-color: #fdf1f0 !important;
  }
  .anticon.anticon-warning {
    color: #f2484c !important;
  }
`;

const Burn = ({ token, onClose }) => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet, balances } = ContextValue;
  const [formData, setFormData] = useState({
    dirty: true,
    textToDelete: ""
  });
  const [loading, setLoading] = useState(false);

  async function submit() {
    setFormData({
      ...formData,
      dirty: false
    });

    if (formData.textToDelete !== `burn ${token.info.name}`) {
      return;
    }

    setLoading(true);

    try {
      const link = await burnToken(wallet, {
        tokenId: token.tokenId,
        amount: token.balance
      });

      notification.success({
        message: "Success",
        description: (
          <a href={link} target="_blank" rel="noopener noreferrer">
            <Paragraph>Tokens burned. Click or tap here for more details</Paragraph>
          </a>
        ),
        duration: 3
      });

      onClose();
      setLoading(false);
    } catch (e) {
      const message = e.message;

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

    setFormData(p => ({ ...p, [name]: value }));
  };

  return (
    <Row type="flex">
      <Col span={24}>
        <Spin spinning={loading}>
          <Card
            title={
              <h2>
                <FireIcon /> Burn
              </h2>
            }
            bordered={false}
          >
            <br />
            <Row justify="center" type="flex">
              <Col span={24}>
                <StyledBurnAlert>
                  <div
                    style={{
                      fontSize: "32px",
                      textAlign: "center",
                      marginBottom: "-21px",
                      zIndex: "2",
                      position: "relative"
                    }}
                  >
                    <Icon twoToneColor="#F34745" theme="twoTone" type="exclamation-circle" />
                  </div>
                  <Alert
                    message={
                      <span>
                        <Paragraph>Be careful!</Paragraph>
                        <Paragraph>
                          Burning tokens is <strong>irreversible</strong>.
                        </Paragraph>
                        <Paragraph>
                          <strong>You will LOSE all of your {token.info.name} tokens.</strong>
                        </Paragraph>
                      </span>
                    }
                    type="warning"
                  />
                </StyledBurnAlert>
              </Col>
            </Row>
            <Row type="flex">
              <Col span={24}>
                <Form style={{ width: "auto" }}>
                  <Form.Item
                    validateStatus={
                      formData.dirty && formData.textToDelete !== `burn ${token.info.name}`
                        ? "error"
                        : ""
                    }
                    help={
                      formData.dirty && formData.textToDelete !== `burn ${token.info.name}`
                        ? `Type "burn ${token.info.name}" to confirm.`
                        : ""
                    }
                  >
                    <Input
                      prefix={<Icon type="block" />}
                      placeholder=""
                      name="textToDelete"
                      onChange={e => handleChange(e)}
                      required
                      type="text"
                    />
                  </Form.Item>
                  <div style={{ paddingTop: "12px" }}>
                    <Button onClick={() => submit()}>Burn</Button>
                  </div>
                </Form>
              </Col>
            </Row>
          </Card>
        </Spin>
      </Col>
    </Row>
  );
};

export default Burn;
