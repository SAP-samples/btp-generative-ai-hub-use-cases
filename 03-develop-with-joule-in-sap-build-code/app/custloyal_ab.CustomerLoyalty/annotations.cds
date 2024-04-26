using custloyal_abService as service from '../../srv/service';
using from '../annotations';

annotate service.Customers with {
    customerCode @(Common: {
        ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'BusinessPartner',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: customerCode_BusinessPartner,
                    ValueListProperty: 'BusinessPartner'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'BusinessPartnerName',
                },
            ],
            Label         : 'Business Partner',
        },
        ValueListWithFixedValues: false,
        Text                    : customerCode.BusinessPartnerName,
        TextArrangement         : #TextFirst
    });
};

annotate service.Customers with @(UI.SelectionFields: [
    customerCode_BusinessPartner,
    email,
]);

annotate service.Customers with {
    customerCode @Common.Label: 'Customer'
};

annotate service.Customers with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: customerCode_BusinessPartner,
    },
    {
        $Type: 'UI.DataField',
        Value: email,
    },
    {
        $Type: 'UI.DataField',
        Value: totalPurchaseValue,
        Label: 'Total Purchases',
    },
    {
        $Type: 'UI.DataField',
        Value: totalRewardPoints,
    },
    {
        $Type: 'UI.DataField',
        Value: totalRedeemedRewardPoints,
        Label: 'Total Redeemed Points',
    },
    {
        $Type : 'UI.DataFieldForAction',
        Action: 'custloyal_abService.RedeemRewards',
        Label : 'Redeem Points',
    },
]);

annotate service.Customers with {
    email @Common.Label: 'e-Mail'
};

annotate service.Customers with @(UI.HeaderFacets: [
    {
        $Type : 'UI.ReferenceFacet',
        ID    : 'customerCode_BusinessPartner',
        Target: '@UI.DataPoint#customerCode_BusinessPartner',
    },
    {
        $Type : 'UI.ReferenceFacet',
        Target: '@UI.DataPoint#email',
    },
]);

annotate service.Customers with @(UI.DataPoint #customerCode_BusinessPartner: {
    $Type: 'UI.DataPointType',
    Value: customerCode_BusinessPartner,
    Title: 'Customer',
});

annotate service.Customers with @(UI.FieldGroup #Main: {
    $Type: 'UI.FieldGroupType',
    Data : [
        {
            $Type: 'UI.DataField',
            Value: customerCode_BusinessPartner,
        },
        {
            $Type: 'UI.DataField',
            Value: email,
        },
        {
            $Type: 'UI.DataField',
            Value: totalPurchaseValue,
        },
        {
            $Type: 'UI.DataField',
            Value: totalRewardPoints,
        },
        {
            $Type: 'UI.DataField',
            Value: totalRedeemedRewardPoints,
            Label: 'Total Redeemed Points',
        },
    ],
});

annotate service.Purchases with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: selectedProduct_Product,
        Label: 'Selected Product',
    },
    {
        $Type: 'UI.DataField',
        Value: purchaseValue,
    },
    {
        $Type: 'UI.DataField',
        Value: rewardPoints,
    },
]);

annotate service.Purchases with {
    selectedProduct_Product @(Common: {
        ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'Product',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: selectedProduct_Product,
                    ValueListProperty: 'Product'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'ProductName'
                }
            ],
            Label         : 'Product',
        },
        ValueListWithFixedValues: false,
        Text                    : selectedProduct.ProductName,
        TextArrangement         : #TextFirst
    });
};

annotate service.Customers with @(UI.Identification: [{
    $Type : 'UI.DataFieldForAction',
    Action: 'custloyal_abService.RedeemRewards',
    Label : 'Redeem Points'
}]);

annotate service.Customers with @(UI.Facets: [
    {
        $Type : 'UI.ReferenceFacet',
        ID    : 'Main',
        Label : 'General Information',
        Target: '@UI.FieldGroup#Main',
    },
    {
        $Type : 'UI.ReferenceFacet',
        ID    : 'Purchases',
        Target: 'purchases/@UI.LineItem',
        Label : 'Purchases',
    },
]);
