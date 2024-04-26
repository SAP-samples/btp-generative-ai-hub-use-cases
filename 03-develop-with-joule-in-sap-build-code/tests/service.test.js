const test_customers_redeem_logic = require('./code/test-customers-redeem-logic');
const cds = require('@sap/cds/lib');
const {
  GET,
  POST,
  PATCH,
  DELETE,
  expect
} = cds.test(__dirname + '../../', '--with-mocks');
cds.env.requires.auth = {
  kind: "dummy"
};
describe('Service Testing', () => {
  it('test customers-redeem-logic', async () => {
    await test_customers_redeem_logic(GET, POST, PATCH, DELETE, expect);
  });
});