const {
    maintenanceNotificationService,
} = require("@sap/cloud-sdk-vdm-maintenance-notification-service");
const { maintenanceNotificationApi } = maintenanceNotificationService();

const _prepareMnBody = (mn) => {

    //  Object variables: https://help.sap.com/doc/38ea0a832f064060a834a2d328038ceb/1.0/en-us/classes/_sap_cloud_sdk_vdm_maintenance_notification_service.maintenancenotification-1.html
    return {
        notificationType: "M1",
        notificationText: limit(mn.NotificationText, 40),  //  (mandatory) Short Text. Short description of the contents of a notification. Maximum length: 40.
        maintNotifLongTextForEdit: mn.MaintNotifLongTextForEdit,    //  (optional) Long Text. Maximum length: 1333.
        maintPriority: mn.MaintPriority,    //  (optional) Priority. The key in this field indicates the importance of the processing of the order/notification. Maximum length: 1.
        // reportedByUser: mn.ReportedByUser,  //  (optional) Name of Person Reporting Notification. Name of the person who reported the notification. Maximum length: 12.
        locationDescription: mn.LocationDescription,    //  (optional) Description of Current Location. Maximum length: 50.
        // personResponsible: "50005672"   //  (optional) Person Responsible ID. Specifies the internal identification number of the person who is responsible for processing the job. Maximum length: 12.
    }
};

function limit(string = "", limit = 0) {
    return string.substring(0, limit);
}

function randomIntFromInterval(min, max) {
    // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

const buildMaintenanceNotificationForCreate = (data) => {
    const mn = maintenanceNotificationApi.entityBuilder().fromJson(_prepareMnBody(data));
    return mn;
};

module.exports = {
    buildMaintenanceNotificationForCreate
};