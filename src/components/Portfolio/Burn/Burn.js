import React, { useState } from "react";
import { WalletContext } from "../../../utils/context";
import burnToken from "../../../utils/broadcastTransaction";
import { Alert, Card, Icon, Form, Input, Button, Spin, notification } from "antd";
import { Row, Col } from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import { FireIcon } from "../../Common/CustomIcons";

const Burn = ({ token, onClose }) => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet } = ContextValue;
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
              <Col>
                <Alert
                  style={{ marginBottom: "10px" }}
                  message={
                    <span>
                      <Paragraph>
                        <Icon type="warning" /> Be careful.
                      </Paragraph>
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
                        ? `Please make sure you type "burn ${token.info.name}" before continuing.`
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
