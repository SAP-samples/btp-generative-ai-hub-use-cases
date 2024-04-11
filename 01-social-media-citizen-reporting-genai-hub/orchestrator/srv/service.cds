namespace social.citizen.genai.srv;

type Message     : {
    text : String;
}

type Result      : {
    type         : String;
    route        : String;
    replyMessage : String;
}

type RedditPosts : {
    lists : array of RedditPost;
}

type RedditPost  : {
    id          : String;
    author      : String;
    postingDate : DateTime;
    title       : String;
    longText    : String;
}

type GenAIOutput : {
    redditPostID          : String;
    author                : String;
    category              : String;    
    priority              : String;
    summary               : String;
    description           : String;
    address               : String;
    location              : String;
    sentiment             : String;
    date                  : String;
    time                  : String;
}

/** CDS Services exposed Entities & APIs
 * - RedditPosts
 * - S/4HANA Maintenance Notifications
 * - GenAI Hub from SAP AI Core through BTP Destination
 * - ManagerService to Process Issues
 */

service RedditService @(path: '/reddit-api') {
    entity Posts {
        key id          : String;
            author      : String;
            postingDate : DateTime;
            title       : String;
            longText    : String;
    }

    @readonly
    entity RedditPost as projection on Posts;

    action retrieveRedditPosts(message : Message) returns RedditPosts;
}

service S4VDMService @(path: '/s4vdm-api') {
    action createMaintenanceNotificationS4(message : GenAIOutput) returns Result;
    action denyNotificationOfIssue(message : GenAIOutput)         returns Result;
}

service GenAIHubService @(path: '/genaihub-api') {
    action processRedditPostGenAI(post : RedditPost)             returns GenAIOutput;
    action acceptSuggestionFromGenAI(getnAiOutput : GenAIOutput) returns Result;
}
