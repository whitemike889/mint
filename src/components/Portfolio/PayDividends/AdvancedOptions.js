import * as React from "react";
import styled from "styled-components";
import { StyledCollapse } from "../../Common/StyledCollapse";
import { Collapse, Row, Col, Checkbox, Divider, List, Badge, Icon, Button } from "antd";
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

  return (
    <StyledAdvancedOptions>
      <StyledCollapse>
        <Collapse.Panel header="Advanced options">
          <Row>
            <Col span={24}>
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
            </Col>
            <br />
            <br />
            <Col span={24}>
              <Divider orientation="left">Addresses to exclude</Divider>
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
        </Collapse.Panel>
      </StyledCollapse>
    </StyledAdvancedOptions>
  );
};
