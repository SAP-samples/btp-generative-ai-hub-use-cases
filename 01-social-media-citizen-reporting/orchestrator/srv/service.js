const cds = require("@sap/cds");
const axios = require("axios");
const xsenv = require("@sap/xsenv");

const {
    maintenanceNotificationService
} = require("@sap/cloud-sdk-vdm-maintenance-notification-service");
const { maintenanceNotificationApi } = maintenanceNotificationService();

const { buildMaintenanceNotificationForCreate } = require("./helper");

const s4Dest = { destinationName: cds.env.aicore.dest };   //  Defined S4HC_GENAI in BTP Dest defined in package.json
const genAIModelDeploymentEndpoint = process.env.deploymentUrl;
var genAIAuthToken, genAIAPIURL, redditAuthURL, redditAuthParam, redditAPIURL;

getDestination("REDDIT_API_AUTH").then((dest) => {
    redditAuthParam = dest.authTokens[0].http_header.value;
    redditAuthURL = dest.destinationConfiguration.URL;
});

getDestination("REDDIT_API").then((dest) => {
    redditAPIURL = dest.destinationConfiguration.URL;
});

getDestination("GENAICORE").then((dest) => {
    genAIAuthToken = "Bearer " + dest.authTokens[0].value;
    genAIAPIURL = dest.destinationConfiguration.URL;
});

module.exports = cds.service.impl(async function () {
    const db = await cds.connect.to("db");
    const { RedditPost, ProcessedIssues } = db.entities;

    /** [S/4HANA Maintenance Module VDM Cloud SDK API] */
    this.on('createMaintenanceNotificationS4', async req => {
        try {
            const payloadMN = req.data.message;

            var paramPriority, locationParts, priorDesc;
            locationParts = payloadMN.location.split(",");
            switch (req.data.message.priority) {
                case "1-Very High":
                    priorDesc = "very high";
                    paramPriority = "1";
                    break;
                case "2-High":
                    priorDesc = "high";
                    paramPriority = "2";
                    break;
                case "3-Medium":
                    priorDesc = "medium";
                    paramPriority = "3";
                    break;
                case "4-Low":
                    priorDesc = "low";
                    paramPriority = "4";
                    break;
                default:
                    console.log("priority not defined");
            }

            const datamn = {
                NotificationType: "M1", //  maint. request type
                NotificationText: payloadMN.summary,
                MaintNotifLongTextForEdit: payloadMN.description,
                MaintPriority: paramPriority,
                // ReportedByUser: "CB9980003338", //  optional
                LocationDescription: payloadMN.location,
                // PersonResponsible: "50005672"   //  optional
            }

            const mn = buildMaintenanceNotificationForCreate(datamn);
            const result = await maintenanceNotificationApi
                .requestBuilder()
                .create(mn)
                .execute(s4Dest)
                .catch((err) => {
                    message = err.rootCause?.message;
                });
            if (result === undefined) {
                req.error({
                    code: "Error in S4HC Maint. Noti. Call",
                    message: message,
                    target: "service.js|createMaintenanceNotificationS4",
                    status: 419,
                });
            } else {
                const mnResult = result.toJSON();
                const mnId = mnResult.maintenanceNotification;

                var nextID;

                const { ID } = await cds
                    .tx(req)
                    .run(SELECT.one.from(ProcessedIssues).columns("max(ID) as ID"));
                nextID = ID + 1;

                var currentDate = getCurrentDate();
                var currentTime = getCurrentTime();

                await cds.db.run(INSERT.into(ProcessedIssues).columns(
                    'ID', 'processor', 'processDate', 'processTime', 'reportedBy', 'decision', 'redditPostID', 'maintenanceNotificationID', 'address', 'location', 'lat', 'long', 'genaiSummary', 'genaiDescription', 'priority', 'priorityDesc', 'sentiment', 'category', 'date', 'time'
                ).values(
                    nextID, "processor", currentDate, currentTime, payloadMN.author, "notified", payloadMN.redditPostID, mnId, payloadMN.address, payloadMN.location, locationParts[0], locationParts[1], payloadMN.summary, payloadMN.description, paramPriority, priorDesc, payloadMN.sentiment, payloadMN.category, payloadMN.date, payloadMN.time
                ));

                const res = {
                    type: payloadMN.sentiment,
                    route: "notified",
                    replyMessage: "Maintenance Notification #" + mnId
                };
                return res;
            }

        } catch (err) {
            req.error(err.code, err.message);
        }
    });

    this.on('denyNotificationOfIssue', async req => {
        try {
            const payloadMN = req.data.message;
            var paramPriority, locationParts, priorDesc;
            locationParts = payloadMN.location.split(",");
            switch (req.data.message.priority) {
                case "1-Very High":
                    priorDesc = "very high";
                    paramPriority = "1";
                    break;
                case "2-High":
                    priorDesc = "high";
                    paramPriority = "2";
                    break;
                case "3-Medium":
                    priorDesc = "medium";
                    paramPriority = "3";
                    break;
                case "4-Low":
                    priorDesc = "low";
                    paramPriority = "4";
                    break;
                default:
                // console.log("priority not defined");
            }

            var nextID;

            const { ID } = await cds
                .tx(req)
                .run(SELECT.one.from(ProcessedIssues).columns("max(ID) as ID"));
            nextID = ID + 1;

            var currentDate = getCurrentDate();
            var currentTime = getCurrentTime();

            await cds.db.run(INSERT.into(ProcessedIssues).columns(
                'ID', 'processor', 'processDate', 'processTime', 'reportedBy', 'decision', 'redditPostID', 'maintenanceNotificationID', 'address', 'location', 'lat', 'long', 'genaiSummary', 'genaiDescription', 'priority', 'priorityDesc', 'sentiment', 'category', 'date', 'time'
            ).values(
                nextID, "processor", currentDate, currentTime, payloadMN.author, "unattended", payloadMN.redditPostID, "", payloadMN.address, payloadMN.location, locationParts[0], locationParts[1], payloadMN.summary, payloadMN.description, paramPriority, priorDesc, payloadMN.sentiment, payloadMN.category, payloadMN.date, payloadMN.time
            ));

            const res = {
                type: payloadMN.sentiment,
                route: "unattended",
                replyMessage: "Processed Issue created."
            };
            return res;
        } catch (error) {
            req.error(error.code, error.message);
        }

    });


    /** [GenAI Hub API] Each post is processed with GenAI Hub API 
     * to summarise, sentiment analysis, context based solution suggestion 
     * - id, summary, sentiment, proposed maintenance type, person responsible, priority 
     * Output: Post to SAP HANA Cloud DB & S/4 on the decision
     */
    this.on('processRedditPostGenAI', async req => {
        try {

            /** Parameterised endpoints in CDS ENV package.json and manisfest.yml
             * More info refer below
             * https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/consume-generative-ai-models-using-sap-ai-core?q=models
             * You consume a generative AI model by sending a request to the endpoint 
             * {{deploymentUrl}}/chat/completions?api-version={{api-version}}. 
             **/

            getDestination("GENAICORE").then((dest) => {
                genAIAuthToken = "Bearer " + dest.authTokens[0].value;
            });

            //  Context for Prompt Engineering
            var problemCategoryContext, urgencyContext;

            //  Guidance Instructions for Prompt Engineering
            var promptGuidance;

            //  Input retrieve from Reddit Post for Prompt Engineering
            var msg = req.data.post.longText;
            var author = req.data.post.author;
            var postingDate = req.data.post.postingDate;
            var redditPostId = req.data.post.id;

            socialMediaPost = "RedditPostId: " + redditPostId + "\n"
                + "Author: " + author + "\n"
                + "Message: " + msg + "\n"
                + "Posting Date: " + postingDate + "\n";

            problemCategoryContext = "Identify the category from one of the following categories names:\
            \"PUBLIC CLEANLINESS\",\"ROADS & FOOTPATHS\",\"FACILITY & PARK MAINTENANCE\",\"PESTS,DRAINS & SEWERS\". \n \
            Where \n \
            \"PUBLIC CLEANLINESS\": Dirty public areas, overflowing dustbins and littering. Bulky waste in common areas. \n \
            \"ROADS & FOOTPATHS\": Including covered linkways, signboards & streetlights. E.g. Pot holes, huge cracks, etc. \n \
            \"FACILITY & PARK MAINTENANCE\": Fallen trees, overgrown grass, and maintenance of park lighting and facilities. \n \
            \"PESTS\": Sighting of bees and hornets, potential mosquito breeding sites, and more. \n \
            \"DRAINS & SEWERS\": Choked, overflowing, or damaged drains, bad sewage smells, flooding. \n \
            Return the category name. If none of the categories fits, or in doubt, return \"OTHER - PLEASE CHECK\". \n ";

            urgencyContext = "4-Low : the issue does not pose any problem with public safety and does not necessarily need to be handled urgently. \n \
            3-Medium : the issue does not cause any immediate danger, but it has significant and negative impact on the daily life of people in the neighborhood.\n \
            2-High : the issue needs to be resolved quickly because it can potentially cause dangerous situations or disruptions. \n \
            1-Very High : the issue needs to be handled as soon as possible, as it is a matter of public safety. \n \
            Return the priority level. If in doubt, return 3-Medium \n";

            summary = "Summarize the issue that is being reported in 40 characters and a neutral tone. \n";
            description = "Summarize the issue that is being reported in not more that 300 characters and a neutral tone. \n";
            address = "Extract the address where the issue has been noticed. Return the street only and omit the town or country. \n";
            location = "Extract the coordinates where the issue has been notices. The format should be: float, float. \n";
            sentiment = "Extract the sentiment of the post:  \n \
                            1. NEUTRAL: if the issue is reported politely \n \
                            2. NEGATIVE: if the post shows irritation, impatience, annoyance \n \
                            3. VERY NEGATIVE: the post expresses rage, hatred \n";

            promptGuidance = "```SOCIAL MEDIA POST: \n"
                + socialMediaPost
                + "INSTRUCTIONS  \n "
                + "For social media post above, extract the following information: \n"
                + "redditPostID: redditPostId from the message RedditPostId \n"
                + "author: author from the message Author \n"
                + "category: " + problemCategoryContext + "\n"
                + "priority: " + urgencyContext + "\n"
                + "summary: " + summary + "\n"
                + "description: " + description + "\n"
                + "address: " + address + "\n"
                + "location: " + location + "\n"
                + "sentiment: " + sentiment + "\n"
                + "date: date from the message posting date \n"
                + "time: time from the message posting date\n"
                + "Return a JSON file, all the fields should be in string format```";

            const aicoreAPI = await cds.connect.to("GENAICORE");

            let data = JSON.stringify({
                "messages": [
                    {
                        "role": "user",
                        "content": promptGuidance
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0,
                "frequency_penalty": 0,
                "presence_penalty": 0,
                "stop": "null"
            });

            var headers = {
                'AI-Resource-Group': 'default',
                'Content-Type': 'application/json',
                'Authorization': genAIAuthToken
            };

            const results = await aicoreAPI
                .tx(req)
                .send("POST", genAIModelDeploymentEndpoint, data, headers);

            var res = JSON.parse(results.choices[0].message.content);

            return res;
        } catch (err) {
            req.error(err.code, err.message);
        }
    });

    /** [Reddit API] Get a list of Reddit Post of the community /r/SAGENAICITY
     * There are 2 type of auth grant types: password & client_credentials.
     * More info here: https://www.reddit.com/r/redditdev/comments/9ecpyh/difference_between_two_types_of_access_token/
     */
    this.on('READ', RedditPost, async req => {
        /**
         * Custom Event Handler to manage
         * - /GET Collection Request
         * - /GET('id') Single Data Entity Request
         */
        getDestination("REDDIT_API_AUTH").then((dest) => {
            redditAuthParam = dest.authTokens[0].http_header.value;
            redditAuthURL = dest.destinationConfiguration.URL;
        });

        var requestType, requestParam;

        //  * - /GET Collection Request
        if (req.params[0] == null || req.params[0] == undefined) {
            // req.error(300, "undefined");
            requestType = "collection";
        }
        //  * - /GET('id') Single Data Entity Request
        else {
            // console.log(req.params[0]);
            requestType = "single";
            requestParam = req.params[0].id;
        }

        try {
            var redditToken, res;

            const redditAuthAPI = await cds.connect.to("REDDITAUTH");
            const redditAPI = await cds.connect.to("REDDITAPI");

            var headers = {
                'Authorization': redditAuthParam
            };

            const results = await redditAuthAPI
                .tx(req)
                .send("POST", "?grant_type=client_credentials", headers);
            console.log(results);

            redditToken = results.access_token;

            var apiheaders = {
                'User-Agent': 'CAP CDS Orchestrator Service',
                'Authorization': 'bearer ' + redditToken,
                'Content-Type': 'application/json'
            };

            const apiresults = await redditAPI
                .tx(req)
                .send({ method: 'GET', path: '/r/MOCK_SAGENAICITY/new?limit=1000', headers: apiheaders });

            var redditLists = apiresults.data.children;
            const redditListArr = [];

            redditLists.forEach(post => {
                var x = new Date(post.data.created * 1000);

                if (requestType == "single") {
                    if (requestParam == post.data.id) {
                        redditListArr.push({
                            id: post.data.id,
                            author: post.data.author,
                            title: post.data.title,
                            longText: post.data.selftext,
                            postingDate: x
                        })
                    }
                } else {
                    redditListArr.push({
                        id: post.data.id,
                        author: post.data.author,
                        title: post.data.title,
                        longText: post.data.selftext,
                        postingDate: x
                    })
                }
            });
            res = redditListArr;
            return res;
        } catch (err) {
            req.error(err.code, err.message);
        }
    });

    this.before("CREATE", "ProcessedIssues", genid);
});

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
                options2 = {
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

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function getCurrentDate() {
    // Get the current date and time as a Date object
    const now = new Date();

    // Separate the date and time components
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // Months are zero-indexed, so add 1
    const day = now.getDate();

    // Combine the date and time strings with your desired format
    const currentDate = `${year}-${month}-${day}`;

    // Print the results to the console
    return currentDate;
}

function getCurrentTime() {
    // Get the current date and time as a Date object
    const now = new Date();

    const hour = now.getHours(); // 24-hour format by default
    const minute = now.getMinutes();
    const second = now.getSeconds();

    // Pad hour, minute, and second with leading zeros if needed
    const formattedHour = hour.toString().padStart(2, "0");
    const formattedMinute = minute.toString().padStart(2, "0");
    const formattedSecond = second.toString().padStart(2, "0");

    // Combine the date and time strings with your desired format
    const currentTime = `${formattedHour}:${formattedMinute}:${formattedSecond}`;

    // Print the results to the console
    return currentTime;
}

/** Generate primary keys for target entity in request */
async function genid(req) {
    const { ID } = await cds
        .tx(req)
        .run(SELECT.one.from(req.target).columns("max(ID) as ID"));
    req.data.ID = ID + 1;
}