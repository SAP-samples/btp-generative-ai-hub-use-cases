namespace vertigo.travels;

using {
    cuid,
    managed
} from '@sap/cds/common';

/**
 * Entity to define available courses or travel packages.
 * Each course can have a list of required documents.
 */
entity Courses : cuid, managed {
    name              : String(100) @title: 'Course Name';
    description       : LargeString;
    price             : Decimal(10, 2);
    depositAmount     : Decimal(10, 2);
    requiredDocuments : Composition of many RequiredDocuments
                            on requiredDocuments.course = $self;
    image             : LargeString;
    s4hanaProductID   : String(10); // ID from S/4HANA Product
}

/**
 * Defines a type of document required for a specific course.
 */
entity RequiredDocuments : cuid {
    key course               : Association to Courses;
        documentType         : String(50) @title: 'Document Type'; // e.g., 'ID_CARD', 'MEDICAL_CERT'
        description          : String(255);
        documentTypeSchemaID : String(100); // ID from Document AI schema
}


/**
 * Entity for the traveler (customer or dependent).
 * Can model parent-child relationships via a self-association.
 */
entity Travelers : cuid, managed {
    firstName                          : String(100);
    lastName                           : String(100);
    email                              : String(255);
    dateOfBirth                        : Date;
    isKid                              : Boolean default false;
    parent                             : Association to Travelers; // Self-association for dependents
    businessPartnerID                  : String(10); // ID from S/4HANA Business Partner
    subscriptions                      : Association to many Subscriptions
                                             on subscriptions.traveler = $self;
    specialDiscount                    : Decimal(10, 2);
    incomeStatement_documentID         : String(100);
    noOfKids                           : Integer;
    familyGrossIncome                  : Decimal(15, 2);
    noOfKids_documentEntityID          : String(100);
    familyGrossIncome_documentEntityID : String(100);
}


/**

 * Central entity to track a traveler's subscription to a course.
 */
entity Subscriptions : cuid, managed {
    traveler                : Association to Travelers;
    course                  : Association to Courses;
    subscriptionDate        : Date default $now;
    status                  : String(20) enum {
        Draft; // Initial request
        DocsPending; // Waiting for documents
        DocsChecking; // Documents uploaded, being processed by Doc AI
        DepositPending; // Docs approved, waiting for payment
        DepositPaid;  // When the traveler pays the deposit, the subscription will be set to this status.
        Confirmed; // Deposit paid, pushed to S/4HANA
        Canceled; // Canceled by user or system
        ActionRequired; // Manual check needed by agent (Barry)
    };
    documents               : Composition of many SubmittedDocuments
                                  on documents.subscription = $self;
    // --- Fields for S/4HANA Integration ---
    s4hanaBusinessPartnerID : String(10);
    s4hanaSalesOrderID      : String(10);
}


/**
 * Entity to store uploaded documents for a subscription.
 * Integrates with a document store and Document Information Extraction.
 */
entity SubmittedDocuments : cuid {
    key subscription         : Association to Subscriptions;
        documentType         : String(50); // Matches RequiredDocuments.documentType
        fileName             : String(255);
        mimeType             : String(100);

        @Core.MediaType: mimeType
        content              : LargeBinary; // Stores the document content
        status               : String(20) enum {
            Uploaded;
            Processing; // Sent to Doc AI
            Approved;
            Rejected;
            Confirmed; // Manually confirmed by agent in Doc AI UI
            Missing;
        };
        extractedData        : LargeString; // Stores JSON result from Doc AI
        rejectionReason      : String;
        documentID           : String(100); // ID from document store
        documentTypeSchemaID : String(100); // ID from Document AI schema
}

/**
 * Stores application-wide configuration settings.
 */
entity AppSettings : cuid, managed {
    key settingKey  : String(100)      @assert.unique  @(
            title      : 'Setting Key',
            description: 'Unique identifier for the setting (e.g., DocAISchema.IncomeStatement)'
        ); // Unique identifier for the setting
        value       : String(500)      @(
            title      : 'Setting Value',
            description: 'The value of the setting'
        ); // The value of the setting (stored as a string)
        description : String(255) null @(
            title      : 'Description',
            description: 'Explanation of the setting'
        ); // Optional: A description of what the setting does
}
