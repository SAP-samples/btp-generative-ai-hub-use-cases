const {
    desc
} = require("@sap-cloud-sdk/odata-v4");

const {
    maintenanceNotificationService
} = require("@sap/cloud-sdk-vdm-maintenance-notification-service");
const { maintenanceNotificationApi } = maintenanceNotificationService();

const s4Dest = { destinationName: cds.env.aicore.dest };   //  Defined S4HC_GENAI in BTP Dest defined in package.json

module.exports = async function () {
    const db = await cds.connect.to("db");
    const {
        MaintenanceNotifications
    } = db.entities;

    this.on('READ', MaintenanceNotifications, async req => {
        try {
            const result = await maintenanceNotificationApi
                .requestBuilder()
                .getAll()
                .orderBy(desc(maintenanceNotificationApi.schema.MAINTENANCE_NOTIFICATION))
                .filter(maintenanceNotificationApi.schema.NOTIFICATION_TYPE.equals('M1'))
                .execute(s4Dest)
                .catch((err) => {
                    message = err.rootCause?.message;
                });
            return result;
        } catch (error) {
            console.log(error);
        }
    });
};