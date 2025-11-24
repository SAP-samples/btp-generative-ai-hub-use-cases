# Joule for ABAP Developers: Demo Guide
This repository contains the step-by-step prompts and workflow for demonstrating the capabilities of Joule (SAP's AI Copilot) in the ABAP environment. Follow the sections below to build, enhance, and test a RAP (RESTful Application Programming Model) Travel Booking application.
## Table of Contents
1. Introduction to Joule
2. Building the RAP Application
3. Joule Cloud Generator (Transactional UI)
4. Adjusting Behavior Definitions
5. Creating Helper Classes
6. Enhancing Data Models
7. General Help & Explanation
8. Unit Test Generation
9. Predictive RAP Business Logic
10. OData Consumption
11. ABAP AI SDK (ISLM) Integration

## 1. Introduction to Joule
Goal: Establish context and verify Joule's capabilities in the ABAP environment.

Prompt:
```text
Hi, Joule!
⁃ How can you help me in ABAP?
⁃ What is your base LLM?
⁃ Have you been fine-tuned for ABAP?
```


Expected Output: Joule introduces itself and explains its specific training for SAP development.

## 2. Guide on how to build your RAP app

Goal: Brainstorm and define the initial structure for the Travel Booking Management App.

Prompt:
```text
Generate application for a Travel Booking Agency
The Travel entity requires the fields:
travel id
agency id
customer id
first name
last name
destination
booking fees
total price
currency code
Use the data element types from the package /DMO for all the above fields.
Create the object names with the prefix 'ms' and without a suffix.
The application will have a helper class with the following methods:
get_booking_status
validate_customer
generate_description
The application will have another class with one method called ‘generate_demo_data’
to create 5 sample records in the travel entity.
Change the data type of the following fields in the entity Travel:
'booking fees’ to the data element '/DMO/Booking_FEE’
‘destination’ to the data element '/DMO/City’
Add new field ‘status’ in the entity Travel and use /DMO/BOOKING_STATUS as Data
Element for it.
Add new field ‘description’ in the entity Travel for the description of the destination city,
and use /DMO/DESCRIPTION as Data Element for it.
```

Expected Output: Joule outlines the plan for the application entities and classes.

## 3. Joule Cloud Generator - Generate Transactional UI
Goal: Use the Generator to create the Business Objects (BOs).
Prompt #1 (Creation)
```text
Create a transaction application for travel management. Create the entity Travel based
on the structure /DMO/TRAVEL_DATA.
The second entity is Booking based on /DMO/BOOKING_DATA. The generated objects
should end with suffix “_MS”
```


Prompt #2 (Refinement)
```text
Change the data type of the following fields in the entity Travel:
'booking fees’ to the data element '/DMO/Booking_FEE’
‘destination’ to the data element '/DMO/City’
Add Destination field for entity Travel, use /DMO/CITY as data element.
Add SightseeingsTips field for entity Travel, use /DMO/DESCRIPTION as data element.
Add DiscountedFlightPrice field for entity Booking, use /DMO/FLIGHT_PRICE as data
element.
```


Expected Output: The system generates the artifacts (CDS Views, BOs) for the Travel and Booking entities.

## 4. Adjust CDS Behavior Definitions
Goal: Add logic controls (Mandatory fields, Read-only fields) to the Behavior Definition (BDEF).

Prompt:
```text
Adjust the selected behavior definition with the following steps and add comment
starting with //
1. Set CustomerID field as mandatory for ZR_TRAVEL_MS
2. Add the fields SightseeingsTips and TotalPrice as readonly for ZR_TRAVEL_MS
3. Add field mandatory during the creation and set the following fields Destination,
StartDate and EndDate for ZR_TRAVEL_MS
4. Set field DiscountedFieldPrice as readonly for ZR_BOOKING_MS
```

Expected Output: Joule modifies the BDEF code to include validation flags.
## 5. Suggest Code Snippets (Create Helper Class)
Goal: Create a helper class (zcl_travel_helper_MS) with common business logic methods.

Prompt:
```text
Add a helper class with name "zcl_travel_helper_MS" that will contain common
business logic that can be consumed by different business objects & methods - for
example, in determinations or validations within my RAP application. It has the following
methods:
⁃ validate_customer with input type pf /dmo/customer_id, and output return type
- abap_bool. This method checks in the database if there exists a row with the given
CustomerID. If such a row exists, return true, otherwise return false.
⁃ get_booking_status with input type of /dmo/booking_status_text, and output
return type - /dmo/booking_status. This method checks the booking status within ONLY
3 options: B if booked, N if new, X if Cancelled.
⁃ get_sightseeing_tips with input type of /dmo/city and, output return type -
/dmo/description. This method uses ABAP AI SDK powered by ISLM to call an LLM &
generate sightseeing tips for a specific city, however, keep the implementation empty!
```

Expected Output: Joule generates the ABAP class definition and method signatures.


## 6. Enhance CDS Data Models
Goal: Implement logic for calculated fields in the CDS View.

Prompt (Context: DiscountedFlightPrice field):
```text
Add the following code lines for the field “DiscountedFlightPrice” to calculate the total
price with discount based on field “carrier_id”:
• If field “carrier_id” is equal to LH, the discount is 10% of field “flight_price”
• If field “carrier_id” is equal to AF, the discount is 15% of field “flight_price”
Use CAST explicitly as follows:
• cast field “flight_price” as abap.dec(16,2)
• cast “discount percentage value” as abap.dec(5,2)
```

Expected Output: Joule writes the CASE statement logic within the CDS view.

## 7. Provide Help Content & Explain Code
Goal: Demonstrate Joule's ability to act as a documentation reference and code explainer.

Prompt (Help):
```text
How to define an ABAP CDS view? Given me an example for a travel entity?
```

Prompt (Explain):
```text
/explain class zcl_travel_helper_ms
```

Expected Output: Joule explains the syntax of CDS views and breaks down the logic of the specific class provided.

## 8. ABAP Unit Test Generation

Goal: Automate the creation of unit test scaffolding.

Prompt:
```text
Define a unit test “LTCL_Travel_Helper_MS” without any methods for the ABAP Class
“ZCL_TRAVEL_HELPER_MS”
```


Expected Output: An ABAP Unit Test class definition is generated.


## 9. Predict RAP Business Logic Capability

Goal: Use predictive capabilities to implement Validations and Determinations.

### A. Enhance Validation - validateCustomer

Description/Prompt:
```text
Instantiate the helper class ZCL_TRAVEL_HELPER_MS, then read the CustomerID field
from the CDS view ZR_TRAVEL_MS.
Check if the CustomerID is initial, and validate it using the ZCL_TRAVEL_HELPER_MS
helper class.
If the CustomerID is missing or invalid, append the key failed-travel. Also, add the key to
reported-travel with a NEW_MESSAGE_WITH_TEXT error message.
```

### B. Enhance Determination - setSightseeingTips
Description/Prompt:
```text
Instantiate a helper class ZCL_TRAVEL_HELPER_MS. Read the SightseeingsTips field
from the Travel entity
Filter out all entries where SightseeingsTips is already filled.
Use get_sightseeing_tips to generate sightseeing tips based on the Destination.
Update the SightseeingsTips field with this generated value
```

### C. Predictive Code Completion - calcTotalTravelPrice
Description/Prompt:
```text
"1) Read Travel and Booking entities
"2) Calculate the total flight price of the bookings using reduce operator in
calculated_total_price variable
"3) Update the total price of the Travel
```

Expected Output: Joule autocompletes the complex ABAP logic for validations and determinations based on the comments/descriptions.


## 10. OData Consume Capability

Goal: Generate code to consume external OData services.
Prompt 1:
```text
/Consume GET/A_BusinessPartner?$select=BusinessPartner, Customer,
BusinessPartnerUUID, BusinessPartnerCategory
```

Prompt 2:
```text
/Consume I want to read the field ID from all Business Partners.
```

Expected Output: Joule generates the CL_HTTP_CLIENT or Service Consumption logic.

## 11. Consume ABAP AI SDK powered by ISLM
Goal: Implement the AI logic for get_sightseeing_tips using the SAP AI Core.
Prompt:
Implement the selected method by calling an LLM to generate the sightseeing tips for a
given city using the ABAP AI SDK, powered by ISLM following the steps below:
" Step 1: Create an instance of SAP AI Core ISLM completion API Factory based on the
ISLM_Scenario ‘ZINST_Travel_Demo_MS’
" Step 2: Set system prompt “| You are a Travel Expert and support by giving
sightseeing tips for a given city. | && | Write a short summary of the top 10 most
sightseeing tips | && | using a brief listing without a caption | && | it should be less
than 1000 characters. |.”
" Step 3: Set user prompt ‘The city is…’
" Step 4: Create a message container via Message Container API & Add the system
prompt and user prompt
" Step 5: Execute Completion API & Get the Completion
" Step 6: Ensure sightseeings tips length limit
" Step 7: Return the sightseeings tips
" Step 8: Catch if any Exceptions


Expected Output: Joule generates the complete ABAP code to interface with the AI SDK/ISLM.
