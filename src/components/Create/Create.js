import React from "react";
import { withRouter, useHistory } from "react-router-dom";
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
  Tooltip,
  Alert,
  Checkbox
} from "antd";
import styled from "styled-components";
import Paragraph from "antd/lib/typography/Paragraph";
import createToken from "../../utils/broadcastTransaction";
import StyledCreate from "../Common/StyledPage";
import { QRCode } from "../Common/QRCode";
import * as CryptoJS from "crypto-js";

const { Dragger } = Upload;

const StyledCard = styled.div`
  .ant-card-body {
    @media (max-width: 425px) {
      padding: 8px;
    }
  }
  .ant-checkbox-inner {
    border: 1px solid #20242d !important;
  }
  .ant-checkbox-wrapper {
    margin-left: 5px;
  }
`;

const StyledAlert = styled.div`
  margin-bottom: 8px;

  .ant-alert.ant-alert-info.ant-alert-no-icon.ant-alert-closable {
    background: #fff;
  }
  .ant-alert-message {
    font-size: 12px;

    .anticon {
      font-size: 14px;
    }
  }
  .ant-alert-close-icon {
    margin-right: -14px;
  }
`;

const StyledMoreOptionsCollapse = styled.div`
  .ant-collapse-content-box {
    padding: 4px !important;
  }
  .ant-collapse-content.ant-collapse-content-active {
    border: none !important;
  }
`;

const StyledHashCollapse = styled.div`
  .ant-collapse .ant-collapse-header {
    color: #c5c5c7 !important;
  }
  .ant-collapse-content.ant-collapse-content-active {
    padding: 0;
    background: #fff !important;

    .ant-collapse-content-box {
      background: #fff !important;
    }
  }

  .ant-collapse.ant-collapse-borderless.ant-collapse-icon-position-left {
    border: 1px solid #eaedf3;
    border-radius: 8px;
  }
  .ant-collapse-header {
    padding: 8px 12px 8px 12px !important;
    background: #fff;
    border-radius: 8px !important;
    font-weight: bold;
  }
  .ant-collapse-item.ant-collapse-no-arrow {
    border-bottom: none;
  }
  .ant-collapse-item.ant-collapse-item-active.ant-collapse-no-arrow {
    border-bottom: 1px solid #eaedf3;
  }
`;

const Create = () => {
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
    amount: "",
    fixedSupply: false
  });
  const [hash, setHash] = React.useState("");
  const [fileList, setFileList] = React.useState();
  const [file, setFile] = React.useState();
  const [tokenIconFileList, setTokenIconFileList] = React.useState();
  const [imageUrl, setImageUrl] = React.useState("");

  const history = useHistory();

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

  const getFileSize = size => size / (1024 * 1024);
  const getFileSizeInKb = size => size / 1024;

  const beforeUpload = file => {
    try {
      if (getFileSize(file.size) > 25) {
        throw new Error("File must be smaller than 25MB!");
      } else {
        setFile(file);
        setHash("");
        setLoading(true);
      }
    } catch (e) {
      console.error("error", e);
      notification.error({
        message: "Error",
        description: e.message || e.error || JSON.stringify(e),
        duration: 2
      });
      setFileList(undefined);
      setFile(undefined);
      setHash("");
      return false;
    }
  };

  const getBase64 = (img, callback) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => callback(reader.result));
    reader.readAsDataURL(img);
  };

  const transformTokenIconFile = file => {
    return new Promise((resolve, reject) => {
      reject();
      setLoading(false);
    });
  };

  const beforeTokenIconUpload = file => {
    try {
      if (getFileSizeInKb(file.size) > 100) {
        throw new Error("File must be smaller than 100KB!");
      } else if (file.type !== "image/png") {
        throw new Error("You can only upload PNG file!");
      } else {
        setData(prev => ({ ...prev, tokenIcon: file }));
        setLoading(true);
        console.log("file :", file);
        getBase64(file, imageUrl => setImageUrl(imageUrl));
      }
    } catch (e) {
      console.error("error", e);
      notification.error({
        message: "Error",
        description: e.message || e.error || JSON.stringify(e),
        duration: 0
      });
      setTokenIconFileList(undefined);
      setData(prev => ({ ...prev, tokenIcon: undefined }));
      setImageUrl("");
      return false;
    }
  };

  const handleChangeTokenIconUpload = info => {
    let list = [...info.fileList];

    if (getFileSizeInKb(info.file.size) > 100 || info.file.type !== "image/png") {
      setTokenIconFileList(undefined);
      setImageUrl("");
    } else {
      setTokenIconFileList(list.slice(-1));
    }
  };

  const handleChangeUpload = info => {
    let list = [...info.fileList];
    if (getFileSize(info.file.size) > 25) {
      setFileList(undefined);
    } else {
      setFileList(list.slice(-1));
    }
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
    const { tokenName, tokenSymbol, documentUri, amount, decimals, fixedSupply, tokenIcon } = data;

    try {
      const docUri = documentUri || "developer.bitcoin.com";
      const link = await createToken(wallet, {
        name: tokenName,
        symbol: tokenSymbol,
        documentHash: hash,
        decimals,
        docUri,
        initialTokenQty: amount,
        fixedSupply
      });

      // Convert to FormData object for server parsing
      let formData = new FormData();
      for (let key in data) {
        formData.append(key, data[key]);
      }
      formData.append("tokenId", link.substr(link.length - 64));
      const apiUrl = "https://mint-icons.btctest.net/new";
      //const apiUrl = "http://localhost:3002/new";
      try {
        const apiTest = await fetch(apiUrl, {
          method: "POST",
          //Note: fetch automatically assigns correct header for multipart form based on formData obj
          headers: {
            Accept: "application/json"
          },
          body: formData
        });
        const apiTestJson = await apiTest.json();
        console.log(apiTestJson);
        // Example response for successful request
        /*{"status": "ok", "approvalRequested": true} */
        // Example response for failed request
        /*{"status": "error", "approvalRequested": false} */
      } catch (err) {
        console.log(`Error in uploading token icon:`);
        console.log(err);
        // TODO Show a popup, "Error in uploading icon. Create token anyway?"
        // Buttons: Yes, No
        // If user clicks Yes, create the token with no icon
        // If user clicks No, exit the function and go back to the form
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
      history.push("/portfolio");
    } catch (e) {
      let message;
      if (e.message) {
        switch (e.message) {
          case "Transaction has no inputs":
            message = "Insufficient balance";
            break;
          case "Document hash must be provided as a 64 character hex string":
            message = e.message;
            break;
          case "Transaction input BCH amount is too low.  Add more BCH inputs to fund this transaction.":
            message = "Not enough BCH. Deposit some funds to use this feature.";
            break;
          default:
            message = "Transaction Failed. Try again later";
            break;
        }
      } else if (/Could not communicate with full node or other external service/.test(e.error)) {
        message = "Could not communicate with API. Please try again.";
      } else {
        message = e.error || JSON.stringify(e);
      }

      notification.error({
        message: "Error",
        description: message,
        duration: 2
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleChangeFile = e => {
    const { files, name } = e.target;
    setData(p => ({ ...p, [name]: files[0] }));
  };

  const handleChange = e => {
    const { value, name } = e.target;

    setData(p => ({ ...p, [name]: value }));
  };

  const handleCheckbox = e => {
    const { checked, name } = e.target;
    setData(p => ({ ...p, [name]: checked }));
  };

  return (
    <StyledCreate>
      <Row justify="center" type="flex">
        <Col lg={12} span={24}>
          <Spin spinning={loading || loadingContext}>
            <StyledCard>
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
                        <QRCode
                          id="borderedQRCode"
                          address={wallet && wallet.Path145.cashAddress}
                        />
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

                  <Form.Item
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

                  <Form.Item
                    style={{ textAlign: "left" }}
                    labelAlign="left"
                    labelCol={{ span: 3, offset: 0 }}
                    colon={false}
                  >
                    <Checkbox
                      name="fixedSupply"
                      checked={data.fixedSupply}
                      onChange={e => handleCheckbox(e)}
                    >
                      Fixed Supply?{" "}
                    </Checkbox>
                    <Tooltip title="If you create a fixed supply token, you will not be able to mint additional supply for this token in the future.">
                      <Icon type="info-circle" />
                    </Tooltip>
                  </Form.Item>

                  <Collapse style={{ marginBottom: "24px" }} accordion>
                    <Collapse.Panel
                      header={<>Add token icon</>}
                      key="1"
                      style={{ textAlign: "left" }}
                    >
                      <Form.Item>
                        <Dragger
                          multiple={false}
                          transformFile={transformTokenIconFile}
                          beforeUpload={beforeTokenIconUpload}
                          onChange={handleChangeTokenIconUpload}
                          onRemove={() => false}
                          fileList={tokenIconFileList}
                          name="tokenIcon"
                          style={{
                            background: "#D3D3D3",
                            borderRadius: "8px"
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt="avatar"
                              style={{ maxHeight: "128px", maxWidth: "100%" }}
                            />
                          ) : (
                            <>
                              {" "}
                              <Icon style={{ fontSize: "24px" }} type="upload" />
                              <p>Click, or drag file to this area to upload</p>
                              <p style={{ fontSize: "12px" }}>Must be a png file and under 100kb</p>
                            </>
                          )}
                        </Dragger>

                        {!loading && data.tokenIcon && (
                          <>
                            <Tooltip title={data.tokenIcon.name}>
                              <Paragraph
                                small
                                ellipsis
                                style={{ lineHeight: "normal", textAlign: "center" }}
                              >
                                <Icon type="paper-clip" />
                                {data.tokenIcon.name}
                              </Paragraph>
                            </Tooltip>{" "}
                          </>
                        )}
                        {/* Upload token icon
                        <Input
                          type="file"
                          placeholder="Token Icon"
                          name="tokenIcon"
                          onChange={e => handleChangeFile(e)}
                        /> */}
                      </Form.Item>

                      <Paragraph>
                        You can also follow{" "}
                        <strong>
                          <a
                            href="https://github.com/kosinusbch/slp-token-icons#adding-your-icon"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            these instructions
                          </a>
                        </strong>{" "}
                        after creating your token.
                      </Paragraph>
                    </Collapse.Panel>
                  </Collapse>

                  <StyledMoreOptionsCollapse>
                    <Collapse style={{ marginBottom: "12px" }} bordered={false}>
                      <Collapse.Panel
                        header={<> More options...</>}
                        key="0"
                        style={{ textAlign: "left" }}
                      >
                        <StyledAlert>
                          <Alert
                            message={
                              <>
                                <Icon type="info-circle" /> The document hash is a sha256 hash of
                                the whitepaper for your token. You can create a hash of any
                                document, and learn more about its use, at
                                <strong>
                                  <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href="https://notary.bitcoin.com"
                                  >
                                    {` notary.bitcoin.com`}
                                  </a>
                                </strong>
                                . Click on the input below to hash the file.
                              </>
                            }
                            type="info"
                            closable
                          />
                        </StyledAlert>
                        <Form.Item style={{ lineHeight: "0px" }}>
                          <StyledHashCollapse>
                            <Collapse bordered={false}>
                              <Collapse.Panel
                                showArrow={false}
                                header={<>add white paper / document hash...</>}
                                key="1"
                                style={{ textAlign: "left" }}
                              >
                                <Dragger
                                  multiple={false}
                                  transformFile={transformFile}
                                  beforeUpload={beforeUpload}
                                  onChange={handleChangeUpload}
                                  onRemove={() => false}
                                  fileList={fileList}
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
                              </Collapse.Panel>
                            </Collapse>
                          </StyledHashCollapse>
                        </Form.Item>

                        <Form.Item>
                          <Input
                            placeholder="token website e.g.: developer.bitcoin.com"
                            name="documentUri"
                            onChange={e => handleChange(e)}
                            required
                          />
                        </Form.Item>
                      </Collapse.Panel>
                    </Collapse>
                  </StyledMoreOptionsCollapse>

                  <div style={{ paddingTop: "12px" }}>
                    <Button onClick={() => handleCreateToken()}>Create Token</Button>
                  </div>
                </Form>
              </Card>
            </StyledCard>
          </Spin>
        </Col>
      </Row>
    </StyledCreate>
  );
};

export default withRouter(Create);
