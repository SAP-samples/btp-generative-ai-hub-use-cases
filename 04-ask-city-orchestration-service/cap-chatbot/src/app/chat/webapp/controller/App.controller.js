"use strict";

sap.ui.define(
  ["sap/base/Log", "sap/ui/core/mvc/Controller", "sap/tnt/library"],
  function (Log, BaseController, tntLib) {
    const logger = Log.getLogger("ask-sa-gai-city-chat");

    return BaseController.extend("chat.controller.App", {
      onDeleteChat: async function (evt) {
        this.setAppBusy(true);
        const uiModel = this.getView().getModel("ui");
        const objectBinding = evt.getSource().getObjectBinding();
        objectBinding.setParameter(
          "sessionId",
          uiModel.getProperty("/sessionId")
        );
        await objectBinding.execute();
        this.getView().getModel("chat").setProperty("/", []);
        uiModel.setProperty("/sessionId", window.crypto.randomUUID());
        this.setAppBusy(false);
      },

      onSendMessage: async function (evt) {
        this.setAppBusy(true);
        const userMessage = this.addUserMessageToChat(
          evt.getParameter("value")
        );
        const payload = {
          sessionId: this.getView().getModel("ui").getProperty("/sessionId"),
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        };

        try {
          const response = await this.askAiAssistent(payload);
          logger.info(JSON.stringify(response));
          this.addSystemMessageToChat(response);
        } catch (err) {
          this.addSystemMessageToChat({
            //content: "Error connecting to AI...",
            content: err.error?.message,
            timestamp: new Date().toJSON(),
          });
          logger.error(err);
        }
        this.setAppBusy(false);
      },

      setAppBusy: function (isBusy) {
        const uiModel = this.getView().getModel("ui");
        uiModel.setProperty("/enabled", !isBusy);
        uiModel.setProperty("/busy", isBusy);
      },

      askAiAssistent: async function (payload) {
        const url =
          this.getOwnerComponent().getManifestEntry("sap.app").dataSources
            .mainService.uri + "getAiResponse";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("fetch error...");
        }
      },

      addUserMessageToChat: function (content) {
        const chatModel = this.getView().getModel("chat");
        const userMessage = {
          timestamp: new Date().toJSON(),
          content: content,
          role: "user",
          icon: "sap-icon://person-placeholder",
        };
        chatModel.getProperty("/").push(userMessage);
        chatModel.updateBindings(true);
        return userMessage;
      },

      addSystemMessageToChat: function (payload) {
        const chatModel = this.getView().getModel("chat");
        const systemMessage = {
          timestamp: payload.timestamp,
          content: payload?.content,
          role: "system",
          icon: "sap-icon://ai",
        };
        chatModel.getProperty("/").push(systemMessage);
        chatModel.updateBindings(true);
        return systemMessage;
      },
    });
  }
);
