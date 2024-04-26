/**
 * Given a running CAP service, the unit test should be able to get passed.
 *
 * @param {Function} GET - The `axios` function to send a GET request
 * @param {Function} POST - The `axios` function to send a POST request
 * @param {Function} PATCH - The `axios` function to send a PATCH request
 * @param {Function} DELETE - The `axios` function to send a DELETE request
 * @param {Function} expect - The `chai` function to assert the response
 */
module.exports = async function(GET, POST, PATCH, DELETE, expect) {
  // Positive test case: customer has enough points to redeem
  try {
    // Assume we have a customer with ID 764d4d2a-2488-41b8-97e6-2900d5480a61 and has 100 reward points
    let response = await POST('/service/custloyal_ab/Customers(ID=764d4d2a-2488-41b8-97e6-2900d5480a61,IsActiveEntity=true)/custloyal_abService.RedeemRewards', {
      RedeemedPoints: 100,
      RedeemType: 'Voucher'
    });
    expect(response.status).to.equal(204);
  } catch (error) {
    console.error(error);
    throw error;
  }

  // Negative test case: customer doesn't have enough points to redeem
  try {
    // Assume we have a customer with ID 509d975a-b3dc-43da-955a-66dbabc9c69d and has 100 reward points
    let response = await POST('/service/custloyal_ab/Customers(ID=509d975a-b3dc-43da-955a-66dbabc9c69d,IsActiveEntity=true)/custloyal_abService.RedeemRewards', {
      RedeemedPoints: 120,
      RedeemType: 'Product'
    });
    expect(response.status).to.equal(204);
  } catch (error) {
    expect(error.response.status).to.equal(500);
    expect(error.message).to.equal('500 - The customer does not have enough points to redeem.');
  }
};