# Customer Loyalty Program - Joule Demo

This scenario demonstrates how to build a Customer Loyalty Management application using Joule. You will create a transactional UI, consume external OData services (Business Partners, Products), and implement complex logic for point calculations and redemptions.

## 📋 Use Case Overview

We are building an app to manage:

1. Customers: Tracking their total purchases and reward points.

2. Purchases: Logging individual purchases to calculate points.

3. Redemptions: allowing customers to spend points.

## 🛠️ Step 1: BO Generator

Goal: Generate the initial application structure, including the Root entity (Customer) and its Child entities (Purchases, Redemptions).

**Prompt:**
```text
Create a transactional application for a customer loyalty program containing the entities below: 
> Create a root entity for customers with fields:
- customer ID (semantic key): char(10)
- name : char(81)
- email : string(0)
- total purchase value : decimal(15, 2)
- total reward points : int8 
- total redeemed reward points : int8
- qualification : string(0)
* NOTE: do not define the total purchase value as a currency field!

> Create a child entity purchases for the root entity customers with fields:
- purchase value : decimal(15, 2)
- reward points : int8
- selected product : char(40)
- product name : char(40)
* NOTE: do not define the purchase value as a currency field and do not create a semantic key (purchase ID) for this entity as it's a composition of the root entity customers!

> Create a child entity redemptions for the root entity customers with fields:
- redemption type : char(15)
- redeemed amount : int8
* NOTE: do not create a semantic key (redemption ID) for this entity as it's a composition of the root entity customers!

Create all repository object names with prefix LPM.
```

## 🔌 Step 2: OData Service Consumption

Goal: Generate code to consume external APIs (Business Partners and Products) to enrich the application data.

### 2.1 Read Business Partners

**Prompt (Filter):**
```text
I want to read all YY1_BusinessPartnerPerson where BusinessPartner equals '001' and BusinessPartnerName equals 'John'
```

**Prompt (By Key):**
```text
I want to read the field BusinessPartnerName from a specific YY1_BusinessPartnerPerson using the entity key
```

### 2.2 Read Products

**Prompt (Filter):**
```text
I want to read all YY1_ProductText where ProductName like 'Mountain bike*'
```

**Prompt (By Key):**
```text
I want to read a specific YY1_ProductText using the entity key
```

## 🧠 Step 3: Totals Calculation Logic

Goal: Implement a determination that updates the Customer's Total Purchase Value and Total Reward Points whenever a purchase is created, updated, or deleted.

Prompt:
```text
This code is executed whenever the purchase value of purchases from the affected Customer is modified (purchase create or update) or one or more purchases are deleted. All EML reads and modifies must be done from the Customer entity (root entity) using its Uuid in the WITH clause. Here's the procedure:
 
1. Declare variables to totalize purchase value (decimal number with 15 positions and 2 decimal digits), reward points (int8) of all Customer's purchases, and a variable to hold the Customer Uuid (ParentUuid of the affected purchases)

2. Initialize totals with 0.

3. Read the ParentUuid (Customer Uuid) from the Customer's affected purchases using the Customer root entity.

4. If the result is empty, that means the affected purchase(s) has(have) been deleted and no other action(s) - create or update - have been executed (no other affected purchase(s)). Therefore, in that case, the ParentUuid must be read directly from the Purchase draft table using the following code template (placeholder between "<>"):

      DATA(lv_uuid) = keys[ 1 ]-uuid.

      SELECT SINGLE parentuuid FROM ZLPMPURCHASE_D WHERE uuid = @lv_uuid INTO @<previously declared variable>.

5. If the result of the SELECT operation is still empty, that means the Customer itself has been deleted. Therefore, in that case, the procedure must stop here (no other operations can be executed).

6. If one of the previous steps (4 or 5) are successful, then the ParentUuid (Customer Uuid) must be stored in the previously declared variable.

7. Read all Customer purchases using the following code template (placeholder between "<>"):

    READ ENTITIES OF ZLPMR_CUSTOMER IN LOCAL MODE

      ENTITY Customer BY \_Purchase

      FIELDS ( PurchaseValue RewardPoints )

      WITH VALUE #( ( Uuid = <previously declared variable> ) )

      RESULT DATA(lt_customer_purchases).

8. Loop through the resulting dataset executing:

   8.1 Totalize purchase value using the previously declared variable.

   8.2 Calculate the reward points of each purchase as: purchase value / 10, and also totalize such reward points using the previously declared variable.

   8.3 Update the reward points of each Customer's purchase. But, in this case, unlike in the previous template begin the statement with:

  MODIFY ENTITIES OF ZLPMR_CUSTOMER IN LOCAL MODE

    ENTITY Purchase

9. Read the total redeemed reward points from the affected Customer using the previously stored ParentUuid as Customer Uuid (use a variable named: lv_total_rr_points). The resultset is a table, so its element must be referenced using [ 1 ].  

10. If the previously calculated total reward points subtracted by the Customer's total redeemed reward points is negative, then total reward points must be set to 0, else, the total redeemed reward points must be subtracted from it. To execute this operation use the "subtract_positive_or_zero" from the "zlp4bp_r_customer_helper" helper using the following code template (placeholder between "<>"):

    DATA(lo_helper) = NEW zlpmbp_r_customer_helper(  ).

    lv_total_reward_points = lo_helper->subtract_positive_or_zero( EXPORTING i_total_reward_points = <total reward points> i_total_rr_points = <total redeemed reward points ). 

11. Finally, update the affected Customer with the totals: total purchase value and total reward points, using the previously stored ParentUuid as Customer Uuid. Use Uuid in the WITH clause instead of %tky.
```

## 🎁 Step 4: Rewards Redemption Logic

Goal: Implement logic to handle point deductions when a redemption record is created.

Prompt:
```text
This code is executed whenever a new redemption is created (impacting field RedeemedAmount). All EML reads and modifies must be done from the Customer entity (root entity) using its Uuid in the WITH clause. Do not declare table variables before reading entities. Here's the procedure:
 
1. Read the ParentUuid (Customer Uuid) and the redeemed amount from the Customer's affected redemptions (Redemption entity) using the Customer root entity.

2. Read the Uuid, total reward points and total redeemed reward points from the Customer entity using the Customer Uuid (Redemption ParentUuid).

3. Sum up all redeemed reward points, using reduce operator following the code template below (placeholder between "<>"):

    DATA(lv_sum_redeemed_points) = REDUCE int8( INIT lv_sum_pt TYPE int8

                                                 FOR ls_redemption IN <previously read redemptions table>

                                                 NEXT lv_sum_pt += ls_redemption-RedeemedAmount ).

4. Save the redemption validation flag in the static member "mv_redemption_is_valid" using the following code template (placeholder between "<>"):

    mv_redemption_is_valid = COND #( WHEN lv_sum_redeemed_points > <previously read customer table>[ 1 ]-TotalRewardPoints THEN abap_false ELSE abap_true ).

4. If mv_redemption_is_valid = abap_true, then calculate the new total reward points as current total reward points - lv_sum_redeemed_points and the new total redeemed points as current total reedemed points + lv_sum_redeemed_points. With those results, update the corresponding fields in the Customer entity using the Customer Uuid.
```

## 🛡️ Step 5: Rewards Redemption Validation Logic

Goal: Validate that a customer has enough points for the redemption.

Note: This logic is designed to be used with Predictive Code Completion within the validation method.

Action: Open the validation method implementation and check the suggestions provided by Joule based on the context established in Step 4.