import React, { useState } from "react";
import {
  Row,
  Col,
  Card,
  Icon,
  Alert,
  Typography,
  Form,
  Input,
  Button,
  Collapse,
  Select
} from "antd";
import StyledConfigure from "../Common/StyledPage";
import { WalletContext } from "../../utils/context";
import { StyledCollapse } from "../Common/StyledCollapse";
import { getRestUrl } from "../../utils/withSLP";
const { Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const selectBefore = (protocol, handleChangeProcotol) => (
  <Select defaultValue={protocol} style={{ width: 90 }} onChange={handleChangeProcotol}>
    <Option value="https://">https://</Option>
    <Option value="http://">http://</Option>
  </Select>
);

export default () => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet } = ContextValue;
  const [visible, setVisible] = useState(true);
  const [option, setOption] = useState(getRestUrl());
  const [protocol, setProtocol] = useState("https://");

  const handleClose = () => setVisible(false);
  const [isConfigUpdated, setIsConfigUpdated] = React.useState(false);
  const [data, setData] = React.useState({
    dirty: true,
    restAPI: window.localStorage.getItem("restAPI")
  });
  const defaultRestUrl = "https://rest.bch.actorforth.org/v2";

  const newRestApiUrl = (protocol, restAPI) => protocol.concat(restAPI);
  const handleChangeProcotol = protocol => setProtocol(protocol);
  const isValidCustomRest = (option, protocol, restAPI) =>
    option === "custom" &&
    // eslint-disable-next-line
    /^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(
      newRestApiUrl(protocol, restAPI)
    );

  const handleConfigure = () => {
    setData(p => ({ ...p, dirty: false }));
    if (
      (option === "custom" && !isValidCustomRest(option, protocol, data.restAPI)) ||
      (option !== "custom" && getRestUrl() !== defaultRestUrl && option !== defaultRestUrl) ||
      option === getRestUrl()
    ) {
      return;
    } else {
      window.localStorage.setItem(
        "restAPI",
        option === "custom" ? newRestApiUrl(protocol, data.restAPI) : defaultRestUrl
      );
      setIsConfigUpdated(true);
      window.localStorage.setItem("wallet", null);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };
  const handleChange = e => {
    const { value, name } = e.target;
    setData(p => ({ ...p, [name]: value }));
  };

  return (
    <StyledConfigure>
      <Row justify="center" type="flex">
        <Col lg={8} span={24}>
          <Card
            title={
              <h2>
                <Icon type="tool" theme="filled" /> Maintenance
              </h2>
            }
            bordered={true}
          >
            {visible ? (
              <Alert
                style={{ marginBottom: "10px" }}
                message={
                  <span>
                    <Paragraph>
                      <Icon type="warning" /> Announcement
                    </Paragraph>
                    <Paragraph>
                      Mint will soon become Pitico 2.0, a revamped and improved version of the
                      original project that became Mint.
                    </Paragraph>
                    <Paragraph>All features are disabled for now.</Paragraph>
                    <Paragraph>
                      If you already have a wallet, backup your seed below. Your funds are safe.
                    </Paragraph>
                    <Paragraph>
                      For further questions and updates, join our telegram group:
                      https://t.me/piticocash
                    </Paragraph>
                  </span>
                }
                type="warning"
                closable
                afterClose={handleClose}
              />
            ) : null}
            {wallet && wallet.mnemonic && (
              <StyledCollapse>
                <Panel header="Seed Phrase (Mnemonic)" key="1" disabled={!(wallet || {}).mnemonic}>
                  <p>{wallet && wallet.mnemonic ? wallet.mnemonic : ""}</p>
                </Panel>
              </StyledCollapse>
            )}
          </Card>
        </Col>
      </Row>
    </StyledConfigure>
  );
};
