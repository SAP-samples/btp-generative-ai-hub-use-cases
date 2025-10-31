const cds = require('@sap/cds');
const axios = require('axios');
const xsenv = require("@sap/xsenv");

var s4desturl, s4destauthtoken, s4csrftoken, s4cookies;

getDestination("VERTIGO_S4HC").then((dest) => {
    s4desturl = dest.destinationConfiguration.URL;
    s4destauthtoken = dest.authTokens[0].http_header.value;
    console.log("S4 Destination URL: " + s4desturl);
    console.log("S4 Destination Auth Token: " + s4destauthtoken);
});

module.exports = cds.service.impl(async function () {
    this.on('getBusinessPartner', async req => {
        console.log(s4desturl);
        const payloadBP = req.data.message;
        console.log("Received payload for S4 Business Partners: ", payloadBP);
        const options = {
            method: 'GET',
            url: `${s4desturl}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner`,
            headers: { 'Authorization': s4destauthtoken, 'x-csrf-token': 'fetch' }
        };

        try {
            const response = await axios.request(options);
            // console.log(response);
            console.log(response.headers['x-csrf-token']);
            console.log(response.data);
            s4csrftoken = response.headers['x-csrf-token'];
            s4cookies = response.headers['set-cookie'];
            console.log(s4cookies)

            return { 'csrf': response.headers['x-csrf-token'] };
            // return response.data;
        } catch (error) {
            console.error(error);
        }
    });
    this.on('createNewBusinessPartner', async req => {

        await getS4CsrfToken();

        const payloadBP = req.data.message;
        console.log("Received payload for S4 Business Partners: ", payloadBP);

        const options = {
            method: 'POST',
            url: `${s4desturl}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner`,
            headers: {
                'x-csrf-token': s4csrftoken,
                authorization: s4destauthtoken,
                'content-type': 'application/json',
                'Cookie': s4cookies.join('; ')
            },
            data: {
                BusinessPartnerCategory: '1',
                BusinessPartnerFullName: `${payloadBP.firstName} ${payloadBP.lastName}`,
                FirstName: payloadBP.firstName,
                LastName: payloadBP.lastName,
            }
        };

        try {
            const { data } = await axios.request(options);
            console.log(data);
            return data.d;
        } catch (error) {
            console.error(error);
        }
    });

    this.on('createNewSalesOrder', async req => {

        await getS4CsrfToken(); // Assuming this function is available and works

        const payloadSO = req.data.message;
        console.log("Received payload for S4 Sales Order: ", payloadSO);

        // Construct the S/4HANA Sales Order payload
        const salesOrderPayload = {
            "SalesOrderType": "OR",
            "SalesOrganization": "BA10",
            "DistributionChannel": "10",
            "SoldToParty": payloadSO.BusinessPartnerID, // Passed from frontend
            "to_Item": [{
                "SalesOrderItem": "10",
                "Material": "167", // Assuming '167' is your service item material
                "RequestedQuantity": "1",
                "OrderQuantityUnit": "EA",
                "CostAmount": "0"
            }],
            "to_PricingElement": [{
                "ConditionType": "DRV1", // Deposit Condition Type
                "ConditionRateValue": String(payloadSO.DepositAmount), // Passed from frontend (must be a string for S/4)
                "PricingProcedureStep": "230",
                "PricingProcedureCounter": "1"
            }]
        };

        const options = {
            method: 'POST',
            // OData endpoint for Sales Order creation
            url: `${s4desturl}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder`,
            headers: {
                'x-csrf-token': s4csrftoken,
                authorization: s4destauthtoken,
                'content-type': 'application/json',
                'Cookie': s4cookies.join('; ')
            },
            data: salesOrderPayload
        };

        try {
            const { data } = await axios.request(options);
            console.log("S/4 Sales Order Response:", data);
            // Return the created Sales Order ID
            return data.d;
        } catch (error) {
            console.error("S/4 Sales Order Creation Failed:", error.response ? error.response.data : error.message);
            throw new Error('S/4 Sales Order Creation Failed');
        }
    });

    this.on('addSalesOrderItem', async req => {
        await getS4CsrfToken();

        const payloadItem = req.data.message;
        console.log("Received payload for S4 Sales Order Item: ", payloadItem);

        const itemPayload = {
            "SalesOrder": payloadItem.SalesOrderID, // Existing Sales Order ID
            "Material": payloadItem.MaterialID, // S/4 HANA Product ID (from Course)
            "RequestedQuantity": "1",
            "OrderQuantityUnit": "EA"
        };

        const options = {
            method: 'POST',
            url: `${s4desturl}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrderItem`,
            headers: {
                'x-csrf-token': s4csrftoken,
                authorization: s4destauthtoken,
                'content-type': 'application/json',
                'Cookie': s4cookies.join('; ')
            },
            data: itemPayload
        };

        try {
            const { data } = await axios.request(options);
            console.log("S/4 Sales Order Item Response:", data);
            return data.d;
        } catch (error) {
            console.error("S/4 Sales Order Item Creation Failed:", error.response ? error.response.data : error.message);
            throw new Error('S/4 Sales Order Item Creation Failed');
        }
    });

    this.on('addSalesOrderPricingElement', async req => {
        await getS4CsrfToken();

        const payloadPricing = req.data.message;
        console.log("Received payload for S4 Sales Order Pricing Element: ", payloadPricing);

        const pricingPayload = {
            "ConditionType": "DRV1",
            "ConditionRateValue": String(payloadPricing.ConditionRateValue), // Remaining 90%
            "PricingProcedureStep": "230",
            "PricingProcedureCounter": "2" // Counter 2 to differentiate from the deposit (Counter 1)
        };

        const options = {
            method: 'POST',
            // Deep insert URL: /A_SalesOrder('ID')/to_PricingElement
            url: `${s4desturl}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('${payloadPricing.SalesOrderID}')/to_PricingElement`,
            headers: {
                'x-csrf-token': s4csrftoken,
                authorization: s4destauthtoken,
                'content-type': 'application/json',
                'Cookie': s4cookies.join('; ')
            },
            data: pricingPayload
        };

        try {
            const { data } = await axios.request(options);
            console.log("S/4 Sales Order Pricing Element Response:", data);
            return data.d;
        } catch (error) {
            console.error("S/4 Sales Order Pricing Element Creation Failed:", error.response ? error.response.data : error.message);
            throw new Error('S/4 Sales Order Pricing Element Creation Failed');
        }
    });

});

async function getS4CsrfToken() {
    const options1 = {
        method: 'GET',
        url: `${s4desturl}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner`,
        headers: { 'Authorization': s4destauthtoken, 'x-csrf-token': 'fetch' }
    };

    try {
        const response = await axios.request(options1);
        // console.log(response);
        console.log(response.headers['x-csrf-token']);
        console.log(response.data);
        s4csrftoken = response.headers['x-csrf-token'];
        s4cookies = response.headers['set-cookie'];
        console.log(s4cookies)

        return { 'csrf': response.headers['x-csrf-token'] };
        // return response.data;
    } catch (error) {
        console.error(error);
    }
}

/** Default Helper function to auth your app getting connected with SAP BTP Destination services and return Destination object. */
async function getDestination(dest) {
    try {
        xsenv.loadEnv();
        let services = xsenv.getServices({
            dest: { tag: "destination" },
        });
        try {
            let options1 = {
                method: "POST",
                url: services.dest.url + "/oauth/token?grant_type=client_credentials",
                headers: {
                    Authorization:
                        "Basic " +
                        Buffer.from(
                            services.dest.clientid + ":" + services.dest.clientsecret
                        ).toString("base64"),
                },
            };
            let res1 = await axios(options1);
            try {
                let options2 = {
                    method: "GET",
                    url:
                        services.dest.uri +
                        "/destination-configuration/v1/destinations/" +
                        dest,
                    headers: {
                        Authorization: "Bearer " + res1.data.access_token,
                    },
                };
                let res2 = await axios(options2);
                // return res2.data.destinationConfiguration;
                return res2.data;
            } catch (err) {
                console.log(err.stack);
                return err.message;
            }
        } catch (err) {
            console.log(err.stack);
            return err.message;
        }
    } catch (err) {
        console.log(err.stack);
        return err.message;
    }
}