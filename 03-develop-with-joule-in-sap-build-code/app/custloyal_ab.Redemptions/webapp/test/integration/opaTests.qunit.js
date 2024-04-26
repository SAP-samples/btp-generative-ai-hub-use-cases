sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'custloyalab/Redemptions/test/integration/FirstJourney',
		'custloyalab/Redemptions/test/integration/pages/RedemptionsMain'
    ],
    function(JourneyRunner, opaJourney, RedemptionsMain) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('custloyalab/Redemptions') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheRedemptionsMain: RedemptionsMain
                }
            },
            opaJourney.run
        );
    }
);