using {social.citizen.genai as mgtsvc} from '../db/schema';

service NotificationService @(path: '/notification-api') {
    entity MaintenanceNotification {
        maintenanceNotification : String;
        notificationText        : String;
        maintPriority           : String;
        maintPriorityDesc       : String;
        notificationType        : String;
        creationDate            : String;
    }

    @readonly
    entity MaintenanceNotifications as projection on MaintenanceNotification;
}
