/**
 * 
 * @On(event = { "RedeemRewards" }, entity = "custloyal_abService.Customers")
 * @param {Object} request - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(request) {
    const { params, data } = request;
    const { RedeemedPoints, RedeemType } = data;

    // Retrieve the customer's current total reward points and total redeemed points
    const customer = await SELECT.one
    .from('custloyal_abService.Customers')
    .columns(['totalRewardPoints', 'totalRedeemedRewardPoints'])
    .where({ ID: params[0].ID });

    // Check if the customer has enough points to redeem
    if (customer.totalRewardPoints >= RedeemedPoints) {
        // Deduct the redemption amount from the customer's total reward points
        // and add that to his total redeemed points
        const updatedRewardPoints = customer.totalRewardPoints - RedeemedPoints;
        const updatedRedeemedPoints = customer.totalRedeemedRewardPoints + RedeemedPoints;

        // Update the customer's total reward points and total redeemed points
        await UPDATE('custloyal_abService.Customers')
        .set({
            totalRewardPoints: updatedRewardPoints,
            totalRedeemedRewardPoints: updatedRedeemedPoints
        })
        .where({ ID: params[0].ID });

        // Create an entry in the Redemptions entity
        await INSERT.into('custloyal_abService.Redemptions')
        .entries({
            redemptionDate: new Date(),
            redeemedAmount: RedeemedPoints,
            type: RedeemType,
            customer_ID: params[0].ID
        });
    } else {
        // Throw an error if the customer doesn't have enough points to redeem
        throw new Error('The customer does not have enough points to redeem.');
    }
}