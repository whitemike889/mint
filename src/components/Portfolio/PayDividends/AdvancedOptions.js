import * as React from "react";
import styled from "styled-components";
import { debounce } from "lodash";
import { StyledCollapse } from "../../Common/StyledCollapse";
import {
  Collapse,
  Row,
  Col,
  Checkbox,
  List,
  Badge,
  Icon,
  Button,
  Form,
  Input,
  Tooltip
} from "antd";
import { FormItemWithQRCodeAddon, AddressValidators } from "../EnhancedInputs";

const StyledButton = styled(Button)`
  margin-top: 12px;
`;

const StyledAdvancedOptions = styled.div`
  .ant-badge {
    width: 100%;
    cursor: pointer;
  }

  .ant-form-item {
    width: 100%;
    margin-bottom: 0;
  }

  .ant-divider {
    font-size: 14px !important;
    margin: 0 !important;
  }

  .ant-list-item {
    border-bottom: none !important;
  }
`;

export const AdvancedOptions = ({ advancedOptions, setAdvancedOptions }) => {
  const setOpReturnMessage = React.useCallback(
    debounce(opReturnMessage => setAdvancedOptions({ ...advancedOptions, opReturnMessage }))
  );

  const updateAddressesToExclude = (address, index) => {
    const addresses = [...advancedOptions.addressesToExclude];
    const singleUpdate = (address || "").indexOf(",") === -1;
    if (singleUpdate) {
      addresses[index] = {
        address,
        valid: address
          ? AddressValidators.isSLPAddress(address) ||
            AddressValidators.isBCHAddress(address) ||
            AddressValidators.isLegacyAddress(address)
          : null
      };
    } else {
      const newAddresses = address.split(",").map(addr => ({
        address: addr,
        valid: addr
          ? AddressValidators.isSLPAddress(addr) ||
            AddressValidators.isBCHAddress(addr) ||
            AddressValidators.isLegacyAddress(addr)
          : null
      }));
      addresses.splice(index, 1, ...newAddresses);
    }
    setAdvancedOptions({ ...advancedOptions, addressesToExclude: addresses });
  };

  const addAddress = () => {
    setAdvancedOptions({
      ...advancedOptions,
      addressesToExclude: [
        ...advancedOptions.addressesToExclude,
        {
          address: "",
          valid: null
        }
      ]
    });
  };

  const removeAddress = index => {
    advancedOptions.addressesToExclude.splice(index, 1);
    setAdvancedOptions({
      ...advancedOptions,
      addressesToExclude: [...advancedOptions.addressesToExclude]
    });
  };

  const opReturnMessageError =
    advancedOptions &&
    advancedOptions.opReturnMessage &&
    advancedOptions.opReturnMessage.length > 60
      ? "OP_RETURN messages on dividend payments with this tool are currently limited to 60 characters."
      : "";

  return (
    <StyledAdvancedOptions>
      <StyledCollapse>
        <Collapse.Panel header="Advanced options">
          <Form>
            <Row>
              <Col span={24}>
                <Form.Item
                  validateStatus={opReturnMessageError ? "error" : ""}
                  help={opReturnMessageError}
                  colon={false}
                  label={
                    <Tooltip title="Recipients, and anyone else, can see this message on the blockchain. Forever.">
                      OP_RETURN message <Icon type="question-circle" />
                    </Tooltip>
                  }
                >
                  <Input
                    placeholder="Describe your transaction"
                    onChange={e => setOpReturnMessage(e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
            <br />
            <Row>
              <Col span={24}>
                <Form.Item
                  colon={false}
                  label={
                    <Tooltip title="Receiving addresses to exclude from dividend.">
                      Addresses to exclude <Icon type="question-circle" />
                    </Tooltip>
                  }
                >
                  <Checkbox
                    onChange={() =>
                      setAdvancedOptions({
                        ...advancedOptions,
                        ignoreOwnAddress: !advancedOptions.ignoreOwnAddress
                      })
                    }
                    checked={advancedOptions.ignoreOwnAddress}
                  >
                    Ignore own address
                  </Checkbox>
                </Form.Item>
                <List
                  dataSource={advancedOptions.addressesToExclude}
                  renderItem={(addressToExclude, index) => (
                    <List.Item key={addressToExclude.address}>
                      <Badge
                        count={
                          index > 0 ? (
                            <Icon
                              type="close-circle"
                              style={{ color: "#f5222d" }}
                              onClick={() => removeAddress(index)}
                            />
                          ) : null
                        }
                      >
                        <FormItemWithQRCodeAddon
                          validateStatus={addressToExclude.valid === false ? "error" : ""}
                          help={
                            addressToExclude.valid === false
                              ? "Must be a valid BCH or SLP address"
                              : ""
                          }
                          onScan={result => updateAddressesToExclude(result, index)}
                          inputProps={{
                            placeholder: "BCH or SLP address, comma separated (optionally)",
                            onChange: e => updateAddressesToExclude(e.target.value, index),
                            required: true,
                            value: advancedOptions.addressesToExclude[index]
                              ? advancedOptions.addressesToExclude[index].address
                              : ""
                          }}
                        />
                      </Badge>
                    </List.Item>
                  )}
                />
                <StyledButton onClick={addAddress}>
                  <Icon type="plus" />
                  Add Address
                </StyledButton>
              </Col>
            </Row>
          </Form>
        </Collapse.Panel>
      </StyledCollapse>
    </StyledAdvancedOptions>
  );
};
