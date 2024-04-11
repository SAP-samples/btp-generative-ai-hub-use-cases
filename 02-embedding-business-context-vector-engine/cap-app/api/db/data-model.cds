namespace social.citizen.genai;

entity ProcessedIssues {
    key ID                        : Integer;
        processor                 : String;
        processDate               : String; //  Date that the manager handles the issue
        processTime               : String;
        reportedBy                : String; //  Author of the Reddit Post
        decision                  : String; //  Notified or Unattended
        redditPostID              : String;
        maintenanceNotificationID : String;
        address                   : String;
        location                  : String;
        lat                       : String; //  Latitude of Coordinates
        long                      : String; //  Longitude of Coordinates
        genaiSummary              : String; //  GenAI Processed Summary (short enough to post into Maintenance Notification title)
        genaiDescription          : String; //  GenAI Processed Description
        priority                  : String;
        priorityDesc              : String; //  Description of the Priority
        sentiment                 : String;
        category                  : String;
        date                      : Date; //  Date of the Reddit post
        time                      : String;
        text                      : String;
        embedding                 : LargeString;
        vector                    : cds.Vector(1536);
}
