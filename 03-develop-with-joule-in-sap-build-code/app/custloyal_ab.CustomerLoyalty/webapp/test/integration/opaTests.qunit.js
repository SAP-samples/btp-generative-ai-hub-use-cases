sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'custloyalab/CustomerLoyalty/test/integration/FirstJourney',
		'custloyalab/CustomerLoyalty/test/integration/pages/CustomersList',
		'custloyalab/CustomerLoyalty/test/integration/pages/CustomersObjectPage'
    ],
    function(JourneyRunner, opaJourney, CustomersList, CustomersObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('custloyalab/CustomerLoyalty') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheCustomersList: CustomersList,
					onTheCustomersObjectPage: CustomersObjectPage
                }
            },
            opaJourney.run
        );
    }
);