using { custloyal_ab } from '../srv/service.cds';

annotate custloyal_ab.Customers with @UI.HeaderInfo: { TypeName: 'Customer', TypeNamePlural: 'Customers' };
annotate custloyal_ab.Customers with @UI.DataPoint #email: {
  Value: email,
  Title: 'e-Mail',
};
annotate custloyal_ab.Customers with @UI.DataPoint #customerCode: {
  Value: customerCode_BusinessPartner,
  Title: 'Customer',
};
annotate custloyal_ab.Customers with {
  email @(title: 'e-Mail', Common.FieldControl : #Mandatory);
  customerCode @(title: 'Customer', Common.FieldControl : #Mandatory);
  totalPurchaseValue @(title: 'Total Purchase Value', readonly);
  totalRewardPoints @(title: 'Total Reward Points', readonly);
  totalRedeemedRewardPoints @(title: 'Total Redeemed Reward Points', readonly);
};

annotate custloyal_ab.Customers with @UI.LineItem: [
    { $Type: 'UI.DataField', Value: email },
    { $Type: 'UI.DataField', Value: customerCode_BusinessPartner },
    { $Type: 'UI.DataField', Value: totalPurchaseValue },
    { $Type: 'UI.DataField', Value: totalRewardPoints },
    { $Type: 'UI.DataField', Value: totalRedeemedRewardPoints }
];

annotate custloyal_ab.Customers with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: email },
    { $Type: 'UI.DataField', Value: customerCode_BusinessPartner },
    { $Type: 'UI.DataField', Value: totalPurchaseValue },
    { $Type: 'UI.DataField', Value: totalRewardPoints },
    { $Type: 'UI.DataField', Value: totalRedeemedRewardPoints }
  ]
};

annotate custloyal_ab.Customers with {
  purchases @Common.Label: 'Purchases'
};

annotate custloyal_ab.Customers with @UI.HeaderFacets: [
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#email' },
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#customerCode' }
];

annotate custloyal_ab.Customers with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' },
  { $Type : 'UI.ReferenceFacet', ID : 'Purchases', Target : 'purchases/@UI.LineItem' }
];

annotate custloyal_ab.Purchases with @UI.HeaderInfo: { TypeName: 'Purchase', TypeNamePlural: 'Purchases' };
annotate custloyal_ab.Purchases with {
  customer @Common.ValueList: {
    CollectionPath: 'Customers',
    Parameters    : [
      {
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: customer_ID, 
        ValueListProperty: 'ID'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'name'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'email'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'customerNumber'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'totalPurchaseValue'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'totalRewardPoints'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'totalRedeemedRewardPoints'
      },
    ],
  }
};
annotate custloyal_ab.Purchases with @UI.DataPoint #purchaseValue: {
  Value: purchaseValue,
  Title: 'Purchase Value',
};
annotate custloyal_ab.Purchases with @UI.DataPoint #rewardPoints: {
  Value: rewardPoints,
  Title: 'Reward Points',
};
annotate custloyal_ab.Purchases with {
  purchaseValue @title: 'Purchase Value';
  rewardPoints @(title: 'Reward Points', readonly);
  selectedProduct @(title: 'Selected Product', Common.FieldControl : #Mandatory)
};

annotate custloyal_ab.Purchases with @UI.LineItem: [
    { $Type: 'UI.DataField', Value: purchaseValue },
    { $Type: 'UI.DataField', Value: rewardPoints },
    { $Type: 'UI.DataField', Value: selectedProduct_Product }
];

annotate custloyal_ab.Purchases with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: purchaseValue },
    { $Type: 'UI.DataField', Value: rewardPoints },
    { $Type: 'UI.DataField', Value: selectedProduct_Product }
  ]
};

annotate custloyal_ab.Purchases with {
  customer @Common.Label: 'Customer'
};

annotate custloyal_ab.Purchases with @UI.HeaderFacets: [
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#purchaseValue' },
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#rewardPoints' }
];

annotate custloyal_ab.Purchases with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate custloyal_ab.Purchases with @UI.SelectionFields: [
  customer_ID
];

annotate custloyal_ab.Redemptions with @UI.HeaderInfo: { TypeName: 'Redemption', TypeNamePlural: 'Redemptions' };
annotate custloyal_ab.Redemptions with {
  customer @Common.ValueList: {
    CollectionPath: 'Customers',
    Parameters    : [
      {
        $Type            : 'Common.ValueListParameterInOut',
        LocalDataProperty: customer_ID, 
        ValueListProperty: 'ID'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'name'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'email'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'customerNumber'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'totalPurchaseValue'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'totalRewardPoints'
      },
      {
        $Type            : 'Common.ValueListParameterDisplayOnly',
        ValueListProperty: 'totalRedeemedRewardPoints'
      },
    ],
  }
};
annotate custloyal_ab.Redemptions with @UI.DataPoint #redeemedAmount: {
  Value: redeemedAmount,
  Title: 'Redeemed Amount',
};
annotate custloyal_ab.Redemptions with {
  redeemedAmount @title: 'Redeemed Amount'
};

annotate custloyal_ab.Redemptions with @UI.LineItem: [
    { $Type: 'UI.DataField', Value: redeemedAmount },
    { $Type: 'UI.DataField', Label: 'Customer', Value: customer_ID }
];

annotate custloyal_ab.Redemptions with @UI.FieldGroup #Main: {
  $Type: 'UI.FieldGroupType', Data: [
    { $Type: 'UI.DataField', Value: redeemedAmount },
    { $Type: 'UI.DataField', Label: 'Customer', Value: customer_ID }
  ]
};

annotate custloyal_ab.Redemptions with {
  customer @Common.Label: 'Customer'
};

annotate custloyal_ab.Redemptions with @UI.HeaderFacets: [
 { $Type : 'UI.ReferenceFacet', Target : '@UI.DataPoint#redeemedAmount' }
];

annotate custloyal_ab.Redemptions with @UI.Facets: [
  { $Type: 'UI.ReferenceFacet', ID: 'Main', Label: 'General Information', Target: '@UI.FieldGroup#Main' }
];

annotate custloyal_ab.Redemptions with @UI.SelectionFields: [
  customer_ID
];

annotate custloyal_ab.Redemptions with {
  customer @(
    Common : {
      Text : customer.customerCode.BusinessPartnerName,
      TextArrangement : #TextOnly
    }
  )
}