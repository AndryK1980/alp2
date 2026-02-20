/**
 * Telegram integration for static landing form.
 * Sends data to backend API which handles Telegram communication securely.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "pendingOrders";
  var API_ENDPOINT = "/api/send-message.php";

  function getPendingOrders() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Не удалось прочитать отложенные заявки:", error);
      return [];
    }
  }

  function savePendingOrders(orders) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      return true;
    } catch (error) {
      console.error("Не удалось сохранить отложенные заявки:", error);
      return false;
    }
  }

  function queuePendingOrder(formData) {
    var pending = getPendingOrders();
    pending.push({
      payload: {
        name: formData.name || "",
        phone: formData.phone || "",
        address: formData.address || "",
      },
      createdAt: Date.now(),
    });

    return savePendingOrders(pending);
  }

  async function sendToBackend(formData) {
    var response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.name || "",
        phone: formData.phone || "",
        address: formData.address || "",
      }),
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    var data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || "Unknown backend error");
    }

    return data;
  }

  async function sendToTelegram(formData) {
    try {
      await sendToBackend(formData);
      return { ok: true, queued: false };
    } catch (error) {
      console.warn(
        "Не удалось отправить заявку, сохраняю локально:",
        error
      );

      var queued = queuePendingOrder(formData);
      return { ok: false, queued: queued };
    }
  }

  async function retryPendingOrders() {
    var pending = getPendingOrders();
    if (pending.length === 0) {
      return;
    }

    var stillPending = [];

    for (var i = 0; i < pending.length; i += 1) {
      var item = pending[i];
      try {
        await sendToBackend(item.payload || {});
      } catch (error) {
        stillPending.push(item);
      }
    }

    savePendingOrders(stillPending);
  }

  window.sendToTelegram = sendToTelegram;

  window.addEventListener("DOMContentLoaded", function () {
    retryPendingOrders();
  });
})();
