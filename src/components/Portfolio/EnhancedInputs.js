import * as React from "react";
import { Form, Input, Icon } from "antd";
import styled from "styled-components";
import bchLogo from "../../assets/bch-logo-2.png";
import { ScanQRCode } from "./ScanQRCode";
import withSLP from "../../utils/withSLP";

export const InputAddonText = styled.span`
  width: 100%;
  height: 100%;
  display: block;
`;

export const FormItemWithMaxAddon = ({ onMax, inputProps, ...otherProps }) => {
  return (
    <Form.Item {...otherProps}>
      <Input
        prefix={<img src={bchLogo} alt="" width={16} height={16} />}
        addonAfter={<InputAddonText onClick={onMax}>max</InputAddonText>}
        {...inputProps}
      />
    </Form.Item>
  );
};

export const FormItemWithQRCodeAddon = ({ onScan, inputProps, ...otherProps }) => {
  return (
    <Form.Item {...otherProps}>
      <Input
        prefix={<Icon type="wallet" />}
        addonAfter={<ScanQRCode delay={300} onScan={onScan} />}
        {...inputProps}
      />
    </Form.Item>
  );
};

export const AddressValidators = withSLP(SLP => ({
  safelyDetectAddressFormat: value => {
    try {
      return SLP.Address.detectAddressFormat(value);
    } catch (error) {
      return null;
    }
  },
  isSLPAddress: value => AddressValidators.safelyDetectAddressFormat(value) === "slpaddr",
  isBCHAddress: value => AddressValidators.safelyDetectAddressFormat(value) === "cashaddr",
  isLegacyAddress: value => AddressValidators.safelyDetectAddressFormat(value) === "legacy"
}))();
