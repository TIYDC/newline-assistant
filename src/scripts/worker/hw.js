(function(){
  'use strict';
  const hostName = "com.theironyard.newlinecli.hw";
  let connection;
  let pendingPromises = [];

  function connect() {
    console.log("Connecting to native messaging host", hostName);
    connection = chrome.runtime.connectNative(hostName);
    connection.onMessage.addListener(onNativeMessage);
    connection.onDisconnect.addListener(onDisconnected);
  }

  function onNativeMessage(msg) {
    console.log("Message from host", msg);
    if (msg.message_at) {
      let findByMessageId = function (el) { return msg.message_at === el.message_at; };
      let itemInQueue = pendingPromises.find(findByMessageId);
      let itemIndex = pendingPromises.findIndex(findByMessageId);
      if (itemInQueue) {

        if (msg.status === "ok") {
          itemInQueue.resolve(msg);
        } else  {
          itemInQueue.reject(msg);
        }

        itemInQueue.complete = true;
        pendingPromises.splice(itemIndex, 1);
      }
    }
  }

  function sendNativeMessage(event, data) {
    if (!connection) {
      connect();
    }
    const at = Date.now();
    let resolve;
    let reject;

    let promise  = new Promise(function (res, rej){
      const payload = { event: event, message_at: at,  data: data };
      console.log("Sending Data to NewlineHW", payload);
      connection.postMessage(payload);
      resolve = res;
      reject = rej;
    });

    let item = {
      message_at: at,
      resolve,
      reject,
      complete: false
    };

    setTimeout(function killItem() {
      if (!item.complete) {
        item.reject(
          { status: "fail", message: "Timeout communicating with newline_hw" }
        );
        item = null;
      }
    }, 5000);

    pendingPromises.push(item);
    return promise;
  }

  function onDisconnected() {
    console.error("Failed to connect: " + chrome.runtime.lastError.message);
    pendingPromises.forEach(function closePromise(item) {
      item.reject(chrome.runtime.lastError.message);
    });
    pendingPromises = [];
    connection = null;
  }

  chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url : "from the extension");
    sendNativeMessage(request.event, request.data).then(function (msg) {
      console.log("sending data to frontend", msg);
      sendResponse(msg);
    }).catch(function (msg) {
      sendResponse(msg);
    });
    return true;
  });

})();
