namespace custloyal_ab;

using { S4_PRODUCT } from '../srv/external/S4_PRODUCT.cds';

using { S4_BUSINESS_PARTNER } from '../srv/external/S4_BUSINESS_PARTNER.cds';

entity Customers
{
    key ID : UUID;
    customerCode : Association to one BusinessPartner;
    email : String;
    totalPurchaseValue : Decimal(10,2);
    totalRewardPoints : Integer default 0;
    totalRedeemedRewardPoints : Integer default 0;
    purchases : Composition of many Purchases on purchases.customer = $self;
}

entity Purchases
{
    key ID : UUID;
    purchaseValue : Decimal(10,2);
    rewardPoints : Integer;
    selectedProduct : Association to one Product on selectedProduct.Product = selectedProduct_Product;
    selectedProduct_Product : type of Product:Product not null
        @sap.display.format : 'UpperCase'
        @sap.label : 'Material Code'
        @sap.quickinfo : 'Material Number'
        @sap.required.in.filter : 'false';
    customer : Association to one Customers;
}

entity Redemptions
{
    key ID : UUID;
    redemptionDate : Date;
    redeemedAmount : Integer;
    type : String(15);
    customer : Association to one Customers;
}

entity BusinessPartner as
    projection on S4_BUSINESS_PARTNER.YY1_BusinessPartnerPerson;

entity Product as
    projection on S4_PRODUCT.YY1_ProductText;
