namespace asksagai;

using {
    cuid,
    managed
} from '@sap/cds/common';

// No persistence for conversations and messages
@cds.persistence.skip
entity Conversation : cuid, managed {
    userId   : String;
    title    : String;
    messages : Composition of many Message
                   on messages.conversation = $self;
}

@cds.persistence.skip
entity Message : cuid, managed {
    conversation : Association to Conversation;
    role         : String;
    content      : LargeString;
}
