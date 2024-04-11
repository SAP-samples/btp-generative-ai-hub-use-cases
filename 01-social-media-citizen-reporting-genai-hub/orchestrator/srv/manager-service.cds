using {social.citizen.genai as mgtsvc} from '../db/schema';

service PublicManagerService @(path: '/manager-api') {
    entity ProcessedIssues    as projection on mgtsvc.ProcessedIssues;

    action acceptGenAISuggestion(processedIssues : ProcessedIssues:ID, newprocessor : String) returns {
        ID : Integer
    };
}