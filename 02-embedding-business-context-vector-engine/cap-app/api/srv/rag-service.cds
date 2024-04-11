type RedditPosts                     : {
    lists : array of RedditPost;
}

type RedditPost                      : {
    id          : String;
    author      : String;
    postingDate : DateTime;
    title       : String;
    longText    : String;
}


@requires: 'authenticated-user'
service RagService @(path: '/rag-api') {
    type ProcessedPost               : {
        date     : String;
        location : String;
        text     : String;
        lat      : String;
        long     : String;
        days     : String;
        distance : String;
    }

    type ProcessedPostWithSimilarity : {
        processedpost                 : {
            ID                        : String;
            text                      : String;
            date                      : String;
            location                  : String;
            distance                  : String;
            long                      : String;
            lat                       : String;
            geo                       : String;
            address                   : String;
            decision                  : String;
            priorityDesc              : String;
            genaiSummary              : String;
            genaiDescription          : String;
            maintenanceNotificationID : String;
            category                  : String;
            sentiment                 : String;

        };
        similarity                    : Double;
    }

    action embed(text : String)                returns Boolean;
    action search(post : ProcessedPost)        returns array of ProcessedPostWithSimilarity;
    action chatCompletion(prompt : String)     returns String;
    action postProcessGenAI(post : RedditPost) returns String;
};
