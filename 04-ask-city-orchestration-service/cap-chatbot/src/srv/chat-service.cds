using {asksagai as db} from '../db/schema';

type OrchestrationResponse_AdditionalContents {
    score       : String;
    pageContent : String;
}

type OrchestrationResponse {
    role               : String;
    content            : String;
    timestamp          : String;
    additionalContents : array of OrchestrationResponse_AdditionalContents;
}

service ChatService {
    entity Conversation as projection on db.Conversation;
    entity Message      as projection on db.Message;
    action getAiResponse(sessionId : String, content : String, timestamp : Timestamp) returns OrchestrationResponse;
    action deleteChatSession(sessionId : UUID)                                        returns String;
}

annotate ChatService with @(requires: 'authenticated-user');