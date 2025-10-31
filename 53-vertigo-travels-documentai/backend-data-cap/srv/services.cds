using vertigo.travels from '../db/schema';

type Result          : {
    type         : String;
    route        : String;
    replyMessage : String;
}

type GenAIOutput     : {
    redditPostID              : String;
    author                    : String;
    category                  : String;
    priority                  : String;
    summary                   : String;
    description               : String;
    address                   : String;
    location                  : String;
    sentiment                 : String;
    date                      : String;
    time                      : String;
    longText                  : String;
    maintenanceNotificationID : String;
    ID                        : String;
    processor                 : String;
    decision                  : String;
}

type BusinessPartner : {
    businessPartnerID : String;
    firstName         : String;
    lastName          : String;
    email             : String;
}

type SalesOrder      : {
    BusinessPartnerID  : String;
    DepositAmount      : String;
    SalesOrderID       : String;
    MaterialID         : String;
    ConditionRateValue : String;
}

/**
 * Service for travelers (e.g., Mary) to manage their subscriptions.
 * Exposed to the public-facing website/UI5 app.
 */
@path: '/traveler'
service TravelerService {
    @readonly
    entity Courses            as projection on travels.Courses;

    entity Subscriptions      as projection on travels.Subscriptions;
    // The 'content' field is implicitly served for media upload/download
    entity SubmittedDocuments as projection on travels.SubmittedDocuments;
}


/**
 * Service for travel agents (e.g., Barry) to manage and review subscriptions.
 * This should be protected with appropriate authorizations.
 */
@path: '/admin'
service AdminService {
    entity Travelers          as projection on travels.Travelers;
    entity Courses            as projection on travels.Courses;
    entity Subscriptions      as projection on travels.Subscriptions;
    entity SubmittedDocuments as projection on travels.SubmittedDocuments;
    entity AppSettings        as projection on travels.AppSettings;
}

service S4Service @(path: '/s4-api') {
    action getBusinessPartner(message: BusinessPartner)       returns Result;
    action getAllBusinessPartners(message: BusinessPartner)   returns Result;
    action createNewBusinessPartner(message: BusinessPartner) returns Result;
    action createNewSalesOrder(message: SalesOrder)           returns Result;
    action addSalesOrderItem(message: SalesOrder)             returns Result;
    action addSalesOrderPricingElement(message: SalesOrder)   returns Result;
}
