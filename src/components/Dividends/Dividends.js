import React from "react";
import { Row, Col } from "antd";
import PayDividends from "../Portfolio/PayDividends/PayDividends";
import StyledDividends from "../Common/StyledPage";

export default () => {
  return (
    <StyledDividends>
      <Row justify="center" type="flex">
        <Col lg={10} span={24}>
          <PayDividends />
        </Col>
      </Row>
    </StyledDividends>
  );
};
