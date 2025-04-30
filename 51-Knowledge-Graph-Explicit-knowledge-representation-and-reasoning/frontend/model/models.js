"use strict";

sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    return {
        /**
         * Provides runtime info for the device the UI5 app is running on as JSONModel
         */
        createDeviceModel: function () {
            const model = new JSONModel(Device);
            model.setDefaultBindingMode("OneWay");
            return model;
        }
    };

});