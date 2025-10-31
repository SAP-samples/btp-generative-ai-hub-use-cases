Here is a full list of scenarios.
Choose the one that is suitable for your use case and copy into a REST client extension to test.


Of course. Based on the robust data model and services you've defined, here are several key scenarios your Vertigo Travels CAP application should support.

For each scenario, I've drafted the sequence of HTTP requests. You can copy and paste this directly into a `test.http` or `.rest` file in your VS Code project and use the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) to execute them.

---

### **Instructions for `test.http` File**

This format uses variables (`{{...}}`) to chain requests together. The REST Client extension automatically captures values from responses (e.g., a new ID) and uses them in subsequent requests.

*   `@host`: The base URL of your running CAP service (e.g., `http://localhost:4004`).
*   `@name variableName`: This is a REST Client feature that saves a value from the response body into a variable.

Let's start with a setup step that creates the necessary course.

### **Scenario 0: Admin Setup - Create a Course**

This is a prerequisite for all other scenarios. Barry, the travel agent, defines a new course.

```http
### =================================================================
### SCENARIO 0: ADMIN - CREATE A NEW COURSE
### =================================================================

# @name createCourse
POST {{host}}/admin/Courses
Content-Type: application/json

{
    "name": "Sailing Level 2",
    "description": "An advanced course for experienced sailors.",
    "price": 1200.00,
    "depositAmount": 200.00,
    "requiredDocuments": [
        { "documentType": "ID_CARD", "description": "Government-issued Photo ID" },
        { "documentType": "SAILING_CERT_L1", "description": "Sailing Level 1 Certificate" }
    ]
}

# Save the created course ID for later use
@courseId = {{createCourse.response.body.ID}}
```

---

### **Scenario 1: Happy Path - Solo Traveler Books, Gets Approved**

Mary books a course, submits a valid document, it gets approved, she pays the deposit, and the subscription is confirmed.

```http
### =================================================================
### SCENARIO 1: SOLO TRAVELER - HAPPY PATH
### =================================================================

# 1. Mary signs up (we'll use the Admin service to create her record for this test)
# @name createTravelerMary
POST {{host}}/admin/Travelers
Content-Type: application/json

{
    "firstName": "Mary",
    "lastName": "Major",
    "email": "mary.major@example.com",
    "dateOfBirth": "1990-05-15"
}
@travelerIdMary = {{createTravelerMary.response.body.ID}}


# 2. Mary subscribes to the Sailing Level 2 course
# @name createSubscriptionMary
POST {{host}}/traveler/Subscriptions
Content-Type: application/json

{
    "traveler_ID": "{{travelerIdMary}}",
    "course_ID": "{{courseId}}",
    "status": "DocsPending"
}
@subscriptionIdMary = {{createSubscriptionMary.response.body.ID}}


# 3. Mary uploads her ID card
# @name uploadDocumentMary
POST {{host}}/traveler/SubmittedDocuments
Content-Type: application/json

{
    "subscription_ID": "{{subscriptionIdMary}}",
    "documentType": "ID_CARD",
    "fileName": "mary_id_card.pdf",
    "mimeType": "application/pdf"
}
@documentIdMary = {{uploadDocumentMary.response.body.ID}}

# --- SIMULATION: Backend/Admin processing ---

# 4. SIMULATION: The document is processed and approved (by an Admin or automated process)
PATCH {{host}}/admin/SubmittedDocuments/{{documentIdMary}}
Content-Type: application/json

{
    "status": "Approved",
    "extractedData": "{\"firstName\": \"Mary\", \"lastName\": \"Major\", \"dob\": \"1990-05-15\"}"
}


# 5. SIMULATION: Since all docs are approved, the subscription status is updated to DepositPending
PATCH {{host}}/admin/Subscriptions/{{subscriptionIdMary}}
Content-Type: application/json

{
    "status": "DepositPending"
}


# 6. SIMULATION: Mary pays the deposit, and a webhook confirms the payment.
#    The system updates the status to Confirmed and adds S/4HANA IDs.
PATCH {{host}}/admin/Subscriptions/{{subscriptionIdMary}}
Content-Type: application/json

{
    "status": "Confirmed",
    "s4hanaBusinessPartnerID": "BP100234",
    "s4hanaSalesOrderID": "SO500456"
}
```

---

### **Scenario 2: Document Rejected & Subscription Canceled**

Mary books a course, but her submitted document is invalid. Barry rejects it, and Mary decides to cancel her subscription.

```http
### =================================================================
### SCENARIO 2: DOCUMENT REJECTED & CANCELLATION
### =================================================================

# 1. We'll use Mary's record from Scenario 1
#    Create a new subscription for her
# @name createSubscriptionRejected
POST {{host}}/traveler/Subscriptions
Content-Type: application/json

{
    "traveler_ID": "{{travelerIdMary}}",
    "course_ID": "{{courseId}}",
    "status": "DocsPending"
}
@subscriptionIdRejected = {{createSubscriptionRejected.response.body.ID}}


# 2. Mary uploads a blurry ID card
# @name uploadRejectedDoc
POST {{host}}/traveler/SubmittedDocuments
Content-Type: application/json

{
    "subscription_ID": "{{subscriptionIdRejected}}",
    "documentType": "ID_CARD",
    "fileName": "blurry_id.jpg",
    "mimeType": "image/jpeg"
}
@documentIdRejected = {{uploadRejectedDoc.response.body.ID}}


# --- SIMULATION: Backend/Admin processing ---

# 3. SIMULATION: Doc AI fails, or Barry manually reviews. The document is rejected.
PATCH {{host}}/admin/SubmittedDocuments/{{documentIdRejected}}
Content-Type: application/json

{
    "status": "Rejected",
    "rejectionReason": "The image is too blurry to read the details."
}


# 4. The subscription status is moved to 'ActionRequired' to notify Mary.
PATCH {{host}}/admin/Subscriptions/{{subscriptionIdRejected}}
Content-Type: application/json

{
    "status": "ActionRequired"
}


# 5. Mary sees the rejection and decides to withdraw her application.
PATCH {{host}}/traveler/Subscriptions/{{subscriptionIdRejected}}
Content-Type: application/json

{
    "status": "Canceled"
}
```

---

### **Scenario 3: Family Booking - Parent Books for a Child**

Mary books the sailing course for her son, Sam, who is a minor. She manages the subscription on his behalf.

```http
### =================================================================
### SCENARIO 3: FAMILY BOOKING FOR A MINOR
### =================================================================

# 1. We have Mary's record from before (ID: {{travelerIdMary}})
#    Now, create her son, Sam, and link him to Mary's record.
# @name createTravelerSam
POST {{host}}/admin/Travelers
Content-Type: application/json

{
    "firstName": "Sam",
    "lastName": "Major",
    "email": "sam.major.kid@example.com",
    "dateOfBirth": "2010-10-20",
    "isKid": true,
    "parent_ID": "{{travelerIdMary}}"
}
@travelerIdSam = {{createTravelerSam.response.body.ID}}


# 2. Mary creates a subscription FOR SAM (using his traveler ID)
# @name createSubscriptionSam
POST {{host}}/traveler/Subscriptions
Content-Type: application/json

{
    "traveler_ID": "{{travelerIdSam}}",
    "course_ID": "{{courseId}}",
    "status": "DocsPending"
}
@subscriptionIdSam = {{createSubscriptionSam.response.body.ID}}


# 3. Mary uploads Sam's L1 Sailing Certificate
# @name uploadDocumentSam
POST {{host}}/traveler/SubmittedDocuments
Content-Type: application/json

{
    "subscription_ID": "{{subscriptionIdSam}}",
    "documentType": "SAILING_CERT_L1",
    "fileName": "sam_cert.pdf",
    "mimeType": "application/pdf"
}
@documentIdSam = {{uploadDocumentSam.response.body.ID}}


# 4. Check the state of Sam's subscription, expanding to see the traveler and parent info
GET {{host}}/admin/Subscriptions/{{subscriptionIdSam}}?$expand=traveler($expand=parent)
```

---

### **Scenario 4: Subscription Requiring Multiple Documents**

A traveler books a course that requires two documents. The subscription status should only move to `DepositPending` after *both* documents are approved.

```http
### =================================================================
### SCENARIO 4: SUBSCRIPTION WITH MULTIPLE REQUIRED DOCUMENTS
### =================================================================
# Prerequisite: Uses @courseId and @travelerIdMary from previous scenarios.

# 1. Mary creates a new subscription for the course requiring two documents.
# @name createMultiDocSub
POST {{host}}/traveler/Subscriptions
Content-Type: application/json

{
    "traveler_ID": "{{travelerIdMary}}",
    "course_ID": "{{courseId}}",
    "status": "DocsPending"
}
@subscriptionIdMulti = {{createMultiDocSub.response.body.ID}}


# 2. Mary uploads the first document (ID Card).
# @name uploadMultiDoc1
POST {{host}}/traveler/SubmittedDocuments
Content-Type: application/json

{
    "subscription_ID": "{{subscriptionIdMulti}}",
    "documentType": "ID_CARD",
    "fileName": "mary_id_card_2.pdf",
    "mimeType": "application/pdf"
}
@docIdMulti1 = {{uploadMultiDoc1.response.body.ID}}


# 3. Mary uploads the second document (Sailing Certificate).
# @name uploadMultiDoc2
POST {{host}}/traveler/SubmittedDocuments
Content-Type: application/json

{
    "subscription_ID": "{{subscriptionIdMulti}}",
    "documentType": "SAILING_CERT_L1",
    "fileName": "mary_sailing_cert.pdf",
    "mimeType": "application/pdf"
}
@docIdMulti2 = {{uploadMultiDoc2.response.body.ID}}

# --- SIMULATION: Backend/Admin processing ---

# 4. SIMULATION: Admin (Barry) approves the first document.
PATCH {{host}}/admin/SubmittedDocuments/{{docIdMulti1}}
Content-Type: application/json

{ "status": "Approved" }

# At this point, the subscription status should remain 'DocsPending' or similar,
# because not all required documents are approved yet.
# Let's check the subscription status.
GET {{host}}/admin/Subscriptions/{{subscriptionIdMulti}}


# 5. SIMULATION: Admin approves the second document.
PATCH {{host}}/admin/SubmittedDocuments/{{docIdMulti2}}
Content-Type: application/json

{ "status": "Approved" }


# 6. SIMULATION: Now that ALL required docs are approved, the business logic
#    (in your CAP handler) should update the subscription status.
PATCH {{host}}/admin/Subscriptions/{{subscriptionIdMulti}}
Content-Type: application/json

{ "status": "DepositPending" }

```

---

### **Scenario 5: Partial Approval, Rejection, and Re-upload**

A traveler submits two documents. One is approved, the other is rejected. The traveler re-uploads the corrected document to proceed.

```http
### =================================================================
### SCENARIO 5: PARTIAL APPROVAL, REJECTION & RE-UPLOAD
### =================================================================

# 1. Create a new traveler, "Tom", for a clean test case.
# @name createTravelerTom
POST {{host}}/admin/Travelers
Content-Type: application/json

{
    "firstName": "Tom",
    "lastName": "Thumb",
    "email": "tom.thumb@example.com",
    "dateOfBirth": "1985-03-10"
}
@travelerIdTom = {{createTravelerTom.response.body.ID}}


# 2. Tom subscribes to the course.
# @name createReuploadSub
POST {{host}}/traveler/Subscriptions
Content-Type: application/json

{
    "traveler_ID": "{{travelerIdTom}}",
    "course_ID": "{{courseId}}",
    "status": "DocsPending"
}
@subscriptionIdReupload = {{createReuploadSub.response.body.ID}}


# 3. Tom uploads a valid ID card and an expired certificate.
# @name uploadReuploadDoc1
POST {{host}}/traveler/SubmittedDocuments
Content-Type: application/json
{ "subscription_ID": "{{subscriptionIdReupload}}", "documentType": "ID_CARD", "fileName": "tom_id.pdf", "mimeType": "application/pdf"}
@docIdReupload1 = {{uploadReuploadDoc1.response.body.ID}}

# @name uploadReuploadDoc2
POST {{host}}/traveler/SubmittedDocuments
Content-Type: application/json
{ "subscription_ID": "{{subscriptionIdReupload}}", "documentType": "SAILING_CERT_L1", "fileName": "expired_cert.pdf", "mimeType": "application/pdf"}
@docIdReupload2 = {{uploadReuploadDoc2.response.body.ID}}

# --- SIMULATION: Backend/Admin processing ---

# 4. Admin approves the valid ID card.
PATCH {{host}}/admin/SubmittedDocuments/{{docIdReupload1}}
Content-Type: application/json
{ "status": "Approved" }


# 5. Admin rejects the expired certificate.
PATCH {{host}}/admin/SubmittedDocuments/{{docIdReupload2}}
Content-Type: application/json
{ "status": "Rejected", "rejectionReason": "Certificate has expired. Please upload a valid one." }


# 6. The subscription status is now 'ActionRequired'.
PATCH {{host}}/admin/Subscriptions/{{subscriptionIdReupload}}
Content-Type: application/json
{ "status": "ActionRequired" }


# 7. Tom sees the rejection reason and uploads a NEW, valid certificate.
#    This creates a new document record linked to the same subscription.
# @name uploadReuploadDoc3
POST {{host}}/traveler/SubmittedDocuments
Content-Type: application/json

{
    "subscription_ID": "{{subscriptionIdReupload}}",
    "documentType": "SAILING_CERT_L1",
    "fileName": "valid_cert_new.pdf",
    "mimeType": "application/pdf"
}
@docIdReupload3 = {{uploadReuploadDoc3.response.body.ID}}


# 8. Admin reviews and approves the newly submitted certificate.
PATCH {{host}}/admin/SubmittedDocuments/{{docIdReupload3}}
Content-Type: application/json
{ "status": "Approved" }


# 9. Since all requirements are now met, the subscription moves to DepositPending.
PATCH {{host}}/admin/Subscriptions/{{subscriptionIdReupload}}
Content-Type: application/json
{ "status": "DepositPending" }
```

---

### **Scenario 6: Admin Querying and Management**

Barry, the travel agent, needs to perform administrative tasks like finding all subscriptions awaiting payment and updating course details.

```http
### =================================================================
### SCENARIO 6: ADMIN QUERYING AND MANAGEMENT
### =================================================================

# 1. Barry wants to find all subscriptions that are currently pending a deposit
#    so he can send a payment reminder. He uses OData's $filter query option.
GET {{host}}/admin/Subscriptions?$filter=status eq 'DepositPending'&$expand=traveler


# 2. Barry needs to find a specific traveler, Tom Thumb, by his email.
GET {{host}}/admin/Travelers?$filter=email eq 'tom.thumb@example.com'


# 3. Vertigo Travels decides to increase the price of the Sailing course.
#    Barry updates the course using a PATCH request.
PATCH {{host}}/admin/Courses/{{courseId}}
Content-Type: application/json

{
    "price": 1250.00,
    "description": "An advanced course for experienced sailors. Now with an updated curriculum!"
}

# 4. Verify the course was updated successfully.
GET {{host}}/admin/Courses/{{courseId}}
```

---

### **Scenario 7: Traveler Viewing Their Data**

Mary logs into the portal to check the status of all her family's subscriptions. This tests the read projections of the `TravelerService`.

```http
### =================================================================
### SCENARIO 7: TRAVELER VIEWING THEIR DATA
### =================================================================
# Prerequisite: Assumes Mary and Sam exist and have subscriptions from scenarios 1 & 3.

# 1. Mary's UI fetches all available courses.
#    This tests the @readonly projection on the TravelerService.
GET {{host}}/traveler/Courses


# 2. Mary's UI fetches all subscriptions associated with her AND her dependents.
#    (This query logic would be implemented in your CAP service handler for a real app,
#    but for testing we can query the admin service to verify the data structure).
GET {{host}}/admin/Travelers/{{travelerIdMary}}?$expand=subscriptions($expand=course)


# 3. Mary wants to see the detailed status of her son Sam's subscription,
#    including the status of each document.
GET {{host}}/traveler/Subscriptions/{{subscriptionIdSam}}?$expand=documents

```