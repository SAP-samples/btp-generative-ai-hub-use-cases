"use strict";

sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
  return UIComponent.extend("chat.Component", {
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"],
    },

    /**
     * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
     * @public
     * @override
     */
    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      this.getRouter().initialize();
      this.getModel("ui").setProperty("/", {
        sessionId: window.crypto.randomUUID(),
        enabled: true,
        busy: false,
      });
      this.getModel("chat").setProperty("/", []);
    },
  });
});
