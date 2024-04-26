using {custloyal_ab as my} from '../db/schema.cds';

@path: '/service/custloyal_ab'
service custloyal_abService {
    @cds.persistence.skip
    entity RewardType {
        type : String;
    }

    annotate BusinessPartner {
        BusinessPartner
        @Common.Label: 'Business Partner';
        BusinessPartnerName
        @Common.Label: 'Name';
    }

    annotate Product {
        Language
        @Common.Label: 'Language';
        ProductName
        @Common.Label: 'Name';
    }

    @odata.draft.enabled
    entity Customers       as projection on my.Customers actions {
                                  @cds.odata.bindingparameter.name: '_it'
                                  @Core.OperationAvailable        : _it.IsActiveEntity
                                  @Common.Label                   : 'Redeem Points'
                                  @Common.SideEffects             : {TargetProperties: [
                                      '_it/totalRewardPoints',
                                      '_it/totalRedeemedRewardPoints'
                                  ]}
                                  action RedeemRewards(
                                  @(Common:{Label: 'Redeemed Points'}) RedeemedPoints : Integer,
                                                       @(Common:{
                                                           Label    : 'Redeem Type',
                                                           ValueList: {
                                                               $Type         : 'Common.ValueListType',
                                                               CollectionPath: 'RewardType',
                                                               Parameters    : [{
                                                                   $Type            : 'Common.ValueListParameterInOut',
                                                                   LocalDataProperty: RedeemType,
                                                                   ValueListProperty: 'type'
                                                               }]
                                                           },
                                                           ValueListWithFixedValues : true
                                                       }) RedeemType : String);
                              };

    @odata.draft.enabled
    entity Redemptions     as projection on my.Redemptions;

    entity Purchases       as projection on my.Purchases;

    @readonly
    @Common.Label: 'Business Partner'
    entity BusinessPartner as projection on my.BusinessPartner;

    @readonly
    @Common.Label: 'Product'
    entity Product         as projection on my.Product;
}

annotate custloyal_abService with @requires: ['authenticated-user'];
