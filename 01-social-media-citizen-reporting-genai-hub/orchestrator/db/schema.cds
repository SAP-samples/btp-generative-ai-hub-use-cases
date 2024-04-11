namespace social.citizen.genai;

entity ProcessedIssues {
    key ID                        : Integer;
        processor                 : String;
        processDate               : String; // Date the manager handles de issue
        processTime               : String;
        reportedBy                : String; //  author
        decision                  : String; //  notified or unattended
        redditPostID              : String;
        maintenanceNotificationID : String;
        address                   : String;
        location                  : String;        
        lat                       : String; //  location latitude TO REMOVE, replaced by location?
        long                      : String; //  location longitude TO REMOVE, replaced by location?
        genaiSummary              : String; //  genai processed summary, TO MODIFY to summary (no genai prefix for all the genAI details like category...)
        genaiDescription          : String; //  genai processed description, TO MODIFY to description
        priority                  : String;
        priorityDesc              : String; //  priority description
        sentiment                 : String;
        category                  : String;
        date                      : String; // Date of the Reddit post
        time                      : String;
}
