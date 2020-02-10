import React from "react";
import { withRouter } from "react-router-dom";
import { WalletContext } from "../../utils/context";
import {
  Input,
  Button,
  notification,
  Spin,
  Icon,
  Row,
  Col,
  Card,
  Form,
  Collapse,
  Upload,
  Tooltip
} from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import createToken from "../../utils/broadcastTransaction";
import StyledCreate from "../Common/StyledPage";
import { QRCode } from "../Common/QRCode";

import * as CryptoJS from "crypto-js";

const { Dragger } = Upload;

const Create = ({ history }) => {
  const ContextValue = React.useContext(WalletContext);
  const { wallet, balances, loading: loadingContext } = ContextValue;
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState({
    dirty: true,
    tokenName: "",
    tokenSymbol: "",
    documentHash: "",
    decimals: "",
    documentUri: "",
    amount: ""
  });
  const [hash, setHash] = React.useState("");
  const [file, setFile] = React.useState();

  const transformFile = file => {
    clear();
    return new Promise((resolve, reject) => {
      const SHA256 = CryptoJS.algo.SHA256.create();

      loadingHash(
        file,
        data => {
          const wordBuffer = CryptoJS.lib.WordArray.create(data);
          SHA256.update(wordBuffer);
        },
        () => {
          const encrypted = SHA256.finalize().toString();
          setHash(encrypted);
          setLoading(false);
          reject();
        }
      );
    });
  };

  const beforeUpload = file => {
    setFile(file);
    setHash("");
    setLoading(true);
  };
  const loadingHash = (file, callbackProgress, callbackFinal) => {
    const chunkSize = 1024 * 1024;
    let offset = 0;
    const size = 1024 * 1024;
    let partial;
    let index = 0;

    if (file.size === 0) {
      callbackFinal();
    }

    while (offset < file.size) {
      partial = file.slice(offset, offset + size);
      const reader = new FileReader();
      reader.size = chunkSize;
      reader.offset = offset;
      reader.index = index;
      reader.onload = evt => callbackRead(reader, file, evt, callbackProgress, callbackFinal);

      reader.readAsArrayBuffer(partial);
      offset += chunkSize;
      index += 1;
    }
  };

  let lastOffset = 0;

  const clear = () => (lastOffset = 0);

  const callbackRead = (reader, file, evt, callbackProgress, callbackFinal) => {
    if (lastOffset === reader.offset) {
      lastOffset = reader.offset + reader.size;
      callbackProgress(evt.target.result);
      if (reader.offset + reader.size >= file.size) {
        lastOffset = 0;
        callbackFinal();
      }
    } else {
      setTimeout(() => callbackRead(reader, file, evt, callbackProgress, callbackFinal), 10);
    }
  };

  async function handleCreateToken() {
    setData({
      ...data,
      dirty: false
    });

    if (
      !data.tokenName ||
      !data.tokenSymbol ||
      !data.amount ||
      Number(data.amount) <= 0 ||
      (data.decimals !== "" && data.decimals < 0) ||
      (data.decimals !== "" && data.decimals > 9) ||
      (data.decimals !== "" && data.decimals % 1 !== 0) ||
      data.decimals === ""
    ) {
      return;
    }

    setLoading(true);
    const { tokenName, tokenSymbol, documentUri, amount, decimals } = data;
    try {
      const docUri = documentUri || "developer.bitcoin.com";
      const link = await createToken(wallet, {
        name: tokenName,
        symbol: tokenSymbol,
        documentHash: hash,
        decimals,
        docUri,
        initialTokenQty: amount
      });

      notification.success({
        message: "Success",
        description: (
          <a href={link} target="_blank" rel="noopener noreferrer">
            <Paragraph>Transaction successful. Click or tap here for more details</Paragraph>
          </a>
        ),
        duration: 2
      });
    } catch (e) {
      let message;
      switch (e.message) {
        case "Transaction has no inputs":
          message = "Insufficient balance";
          break;
        case "Document hash must be provided as a 64 character hex string":
          message = e.message;
          break;
        default:
          message = "Unknown Error, try again later";
          break;
      }

      notification.error({
        message: "Error",
        description: message,
        duration: 2
      });
    } finally {
      setLoading(false);
    }
  }

  const handleChange = e => {
    const { value, name } = e.target;

    setData(p => ({ ...p, [name]: value }));
  };
  return (
    <StyledCreate>
      <Row justify="center" type="flex">
        <Col lg={8} span={24}>
          <Spin spinning={loading || loadingContext}>
            <Card
              title={
                <h2>
                  <Icon type="plus-square" theme="filled" /> Create Token
                </h2>
              }
              bordered={true}
            >
              <div>
                {!loadingContext && !balances.totalBalance ? (
                  <>
                    <Paragraph>
                      <QRCode id="borderedQRCode" address={wallet && wallet.Path145.cashAddress} />
                    </Paragraph>
                    <Paragraph>You currently have 0 BCH.</Paragraph>
                    <Paragraph>
                      Deposit some BCH in order to pay for the transaction that will generate the
                      token.
                    </Paragraph>
                    <Paragraph>
                      Get free BCH from the{" "}
                      <strong>
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          href="https://free.bitcoin.com/"
                        >
                          Bitcoin.com Faucet
                        </a>
                      </strong>
                      !
                    </Paragraph>
                  </>
                ) : null}
              </div>
              <Form>
                <Form.Item
                  label=" "
                  labelAlign="left"
                  labelCol={{ span: 3, offset: 0 }}
                  colon={false}
                  validateStatus={!data.dirty && !data.tokenSymbol ? "error" : ""}
                  help={
                    !data.dirty && !data.tokenSymbol
                      ? "Should be combination of numbers & alphabets"
                      : ""
                  }
                  required
                >
                  <Input
                    placeholder="token symbol e.g.: PTC"
                    name="tokenSymbol"
                    onChange={e => handleChange(e)}
                    required
                  />
                </Form.Item>
                <Form.Item
                  label=" "
                  labelAlign="left"
                  labelCol={{ span: 3, offset: 0 }}
                  required
                  colon={false}
                  validateStatus={!data.dirty && Number(data.tokenName) <= 0 ? "error" : ""}
                  help={
                    !data.dirty && Number(data.tokenName) <= 0
                      ? "Should be combination of numbers & alphabets"
                      : ""
                  }
                >
                  <Input
                    placeholder="token name"
                    name="tokenName"
                    onChange={e => handleChange(e)}
                    required
                  />
                </Form.Item>
                <Form.Item style={{ lineHeight: "0px" }}>
                  <Collapse accordion>
                    <Collapse.Panel
                      header={<>Add white paper / document hash...</>}
                      key="0"
                      style={{ textAlign: "left" }}
                    >
                      <Dragger
                        multiple={false}
                        transformFile={transformFile}
                        beforeUpload={beforeUpload}
                        name="documentHashUpload"
                        style={{
                          background: "#D3D3D3",
                          borderRadius: "8px"
                        }}
                      >
                        <Icon style={{ fontSize: "24px" }} type="upload" />
                        <p>Click, or drag file to this area to hash.</p>
                        <p style={{ fontSize: "12px" }}>
                          The hash is performed client-side and the file is not uploaded.
                        </p>
                        <Input
                          style={{ borderRadius: 0, align: "center" }}
                          placeholder={"white paper/document hash"}
                          name="documentHash"
                          disabled
                          value={hash}
                        />
                      </Dragger>
                      {!loading && hash && (
                        <>
                          <Tooltip title={file.name}>
                            <Paragraph
                              small
                              ellipsis
                              style={{ lineHeight: "normal", textAlign: "center" }}
                            >
                              <Icon type="paper-clip" />
                              {file.name}
                            </Paragraph>
                          </Tooltip>
                          <p style={{ textAlign: "left", marginBottom: "-6px" }}>
                            White paper/document hash:
                          </p>
                          <Paragraph
                            style={{ marginBottom: "2px" }}
                            small
                            copyable={{ text: hash }}
                            ellipsis
                          >
                            {hash}
                          </Paragraph>
                        </>
                      )}

                      <Collapse accordion>
                        <Collapse.Panel
                          header={<>What is white paper/document hash?</>}
                          key="1"
                          style={{ textAlign: "left" }}
                        >
                          <Paragraph>
                            The document hash is a sha256 hash of the whitepaper for your token. You
                            can create a hash of any document, and learn more about its use, at
                            <strong>
                              <a
                                target="_blank"
                                rel="noopener noreferrer"
                                href="https://notary.bitcoin.com"
                              >
                                {` notary.bitcoin.com`}
                              </a>
                            </strong>
                          </Paragraph>
                        </Collapse.Panel>
                      </Collapse>
                    </Collapse.Panel>
                  </Collapse>
                </Form.Item>

                <Form.Item>
                  <Input
                    placeholder="token website e.g.: developer.bitcoin.com"
                    name="documentUri"
                    onChange={e => handleChange(e)}
                    required
                  />
                </Form.Item>
                <Form.Item
                  label=" "
                  labelAlign="left"
                  labelCol={{ span: 3, offset: 0 }}
                  colon={false}
                  required
                  validateStatus={
                    (!data.dirty && data.decimals < 0) ||
                    (!data.dirty && data.decimals > 9) ||
                    (!data.dirty && data.decimals % 1 !== 0) ||
                    (!data.dirty && data.decimals === "")
                      ? "error"
                      : ""
                  }
                  help={
                    (!data.dirty && data.decimals < 0) ||
                    (!data.dirty && data.decimals > 9) ||
                    (!data.dirty && data.decimals % 1 !== 0) ||
                    (!data.dirty && data.decimals === "")
                      ? "Must be an integer between 0 and 9"
                      : ""
                  }
                >
                  <Input
                    style={{ padding: "0px 20px" }}
                    placeholder="decimals"
                    name="decimals"
                    onChange={e => handleChange(e)}
                    required
                    type="number"
                    min="0"
                    max="9"
                    step="1"
                  />
                </Form.Item>

                <Form.Item
                  label=" "
                  labelAlign="left"
                  labelCol={{ span: 3, offset: 0 }}
                  colon={false}
                  required
                  validateStatus={!data.dirty && Number(data.amount) <= 0 ? "error" : ""}
                  help={!data.dirty && Number(data.amount) <= 0 ? "Should be greater than 0" : ""}
                >
                  <Input
                    style={{ padding: "0px 20px" }}
                    placeholder="quantity"
                    name="amount"
                    onChange={e => handleChange(e)}
                    required
                    type="number"
                  />
                </Form.Item>
                <Collapse accordion>
                  <Collapse.Panel
                    header={<>How can I add an icon?</>}
                    key="1"
                    style={{ textAlign: "left" }}
                  >
                    <Paragraph>
                      After creating your token, follow{" "}
                      <strong>
                        <a
                          href="https://github.com/kosinusbch/slp-token-icons#adding-your-icon"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          these instructions
                        </a>
                      </strong>{" "}
                      to add your own token icon.
                    </Paragraph>
                  </Collapse.Panel>
                </Collapse>
                <div style={{ paddingTop: "12px" }}>
                  <Button onClick={() => handleCreateToken()}>Create Token</Button>
                </div>
              </Form>
            </Card>
          </Spin>
        </Col>
      </Row>
    </StyledCreate>
  );
};

export default withRouter(Create);
