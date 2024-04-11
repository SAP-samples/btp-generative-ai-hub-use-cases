using {social.citizen.genai as mgtsvc} from '../db/data-model';

service PublicManagerService @(path: '/manager-api') {
    entity ProcessedIssues as
        projection on mgtsvc.ProcessedIssues
        excluding {
            embedding, vector, text
        };

    action acceptGenAISuggestion(processedIssues : ProcessedIssues:ID, newprocessor : String) returns {
        ID : Integer
    };
}
