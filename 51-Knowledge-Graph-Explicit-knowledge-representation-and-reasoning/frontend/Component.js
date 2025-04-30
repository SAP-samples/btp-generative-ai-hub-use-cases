"use strict";

sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/model/json/JSONModel", "sap/f/library", "sap/f/FlexibleColumnLayoutSemanticHelper"], function (UIComponent, JSONModel, library, FlexibleColumnLayoutSemanticHelper) {

  var LayoutType = library.LayoutType;

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
      // this.getRouter().initialize();
      this.getModel("ui").setProperty("/", {
        sessionId: window.crypto.randomUUID(),
        enabled: true,
        busy: false,
      });
      this.getModel("chat").setProperty("/", []);
      var oProductsModel = new JSONModel(sap.ui.require.toUrl("chat/mockdata/products.json"));
      oProductsModel.setSizeLimit(1000);
      this.setModel(oProductsModel, "products");

      /** NODEJS ENVIRONMENT VARIABLE MANAGEMENT */
      fetch("/getenvironmentvariables") // Call your endpoint
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`); // Handle errors
          }
          return response.json(); // Parse the JSON response
        })
        .then(data => {
          const pyEndpoint = data; // Assign the value
          // console.log("Python endpoint:", pyEndpoint);

          var oModel = new JSONModel({ pyEndpoint: pyEndpoint });
          sap.ui.getCore().setModel(oModel, "endpoint");
        })
        .catch(error => {
          console.log("In Component.js > init");
          console.error("Error fetching environment variable:", error);
          // Handle the error appropriately, e.g., display an error message
          // in your UI.
          // Example:
          // sap.m.MessageToast.show("Error loading configuration.");
        });
    },

    /**
     * Returns an instance of the semantic helper
     * @returns {sap.f.FlexibleColumnLayoutSemanticHelper} An instance of the semantic helper
     */
    getHelper: function () {
      var oFCL = this.getRootControl().byId("fcl"),
        oParams = new URLSearchParams(window.location.search),
        oSettings = {
          defaultTwoColumnLayoutType: LayoutType.TwoColumnsMidExpanded,
          initialColumnsCount: oParams.get("initial"),
          maxColumnsCount: oParams.get("max")
        };

      return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
    }
  });
});
