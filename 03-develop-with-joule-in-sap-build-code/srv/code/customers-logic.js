/**
 * 
 * @On(event = { "CREATE","UPDATE" }, entity = "custloyal_abService.Customers")
 * @param {Object} req - User information, tenant-specific CDS model, headers and query parameters
*/
module.exports = async function(req) {
  // Check if there are purchases in the request
  if (req.data.purchases) {
    // Initialize total purchase value and total reward points
    let totalPurchaseValue = 0;
    let totalRewardPoints = 0;

    // Iterate over each purchase
    for (let purchase of req.data.purchases) {
      // Compute reward points for each purchase
      purchase.rewardPoints = Math.floor(purchase.purchaseValue / 10);

      // Add purchase value and reward points to the total
      totalPurchaseValue += purchase.purchaseValue;
      totalRewardPoints += purchase.rewardPoints;
    }

    // Deduct total reedemed reward points from total reward points
    totalRewardPoints -= req.data.totalRedeemedRewardPoints;

    // Add total purchase value and total reward points to the customer
    req.data.totalPurchaseValue = totalPurchaseValue;
    req.data.totalRewardPoints = totalRewardPoints;
  }
}