# SAP Joule for ABAP Developers - Demo Repository

Welcome to the SAP Joule for ABAP Developers demonstration repository. This project contains end-to-end examples showcasing how Joule, SAP's AI Copilot, assists developers in building, extending, and testing ABAP applications.

The repository is organized into two main demonstration scenarios:

Customer Loyalty App - A business logic focused use-case.

Travel Management App - A comprehensive technical deep-dive into RAP, Unit Testing, and the ABAP AI SDK.

## 🏗️ Repository Structure
```text
.
├── README.md                   <-- You are here
├── customer-loyalty-app/       <-- Demo 1: Business Logic & Use Case
│   └── README.md               <-- Specific instructions for Loyalty App
└── travel-management-app/      <-- Demo 2: RAP App, Unit Tests, AI SDK
    └── README.md               <-- Specific instructions for Travel App
```

## 🚀 Demo 1: Customer Loyalty App (Business Use Case)

Location: /customer-loyalty-app

This demo focuses on solving a specific business problem: calculating and managing customer loyalty points. It demonstrates Joule's ability to understand business context, generate logic, and explain complex code.

### 📋 Scenario

We need to extend an existing system to calculate loyalty points based on travel distance and booking class.

### 💬 Key Prompts & Flow

Note: These are example prompts. Navigate to the folder for the full script.

**1. Logic Generation**

Goal: Create a method to calculate points based on specific business rules.

```text
Create a method "calculate_loyalty_points" in class "zcl_loyalty_logic".
Input: distance (int), class (string). Output: points (int).
Logic:
- If class is 'Business', points = distance * 2.
- If class is 'Economy', points = distance * 1.
- Add a bonus of 500 points if distance > 5000.
```

**2. Code Explanation**
Goal: Understand legacy or complex logic.

```text
/explain method zcl_loyalty_logic->redeem_points
```

**3. Refactoring**

Goal: Clean up the code.

```text
Refactor the selected code to use inline declarations and switch statements instead of nested IFs.
```

## ✈️ Demo 2: Travel Management App (Technical Deep Dive)

Location: /travel-management-app

This demo is a comprehensive technical walkthrough of building a modern RAP (RESTful Application Programming Model) application from scratch. It covers the entire lifecycle from object generation to AI integration.

**📋 Scenario**

Build a full-stack Travel Booking Agency application where agents can manage travel requests, bookings, and generate AI-powered sightseeing tips.

**🛠️ Capabilities Demonstrated**

1. Joule Cloud Generator: Generating Transactional UI services, CDS Views, and Behavior Definitions (BDEFs).

2. Logic Enhancement: Adding validations (e.g., validate_customer) and determinations (e.g., calculate_total_price).

3. Unit Testing: Automatically generating unit test scaffolding for helper classes.

4. OData Consumption: Generating code to call external APIs (e.g., Business Partners).

5. ABAP AI SDK (ISLM): integrating Generative AI to provide "Sightseeing Tips" for destinations.

**💬 Sample Prompt Preview**

**Generating the App:**
```text
Generate application for a Travel Booking Agency. The Travel entity requires fields: travel id, agency id, customer id, total price, currency code...
```


**Integrating AI:**
```text
Implement the method by calling an LLM to generate sightseeing tips for a given city using the ABAP AI SDK...
```

👉 View the full Travel Management Script & Screenshots here

**🏁 Getting Started**

1. Clone this repository to your local ABAP Development Tools (ADT) workspace or access via BAS.

2. Navigate to the specific folder for the demo you wish to present.

3. Follow the Prompts listed in the respective README.md files to reproduce the demo with Joule.