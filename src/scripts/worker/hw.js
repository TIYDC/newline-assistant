(function(){
  'use strict';
  /**
   * Name of chrome NativeHost
   * @type {String}
   */
  const hostName = "com.theironyard.newlinecli.hw";


  /**
   * Unix socket to the native host.
   */
  let connection;


  /**
   * A list of all messages that have been sent and their success and failure
   * handlers.
   *
   * @type {Array}
   */
  let pendingPromises = [];


  /**
   * Create a new nativeMessage connection
   * This opens a unix pipe to the ruby process on the local machine, it also
   * binds handlers when messages are to be sent and recieved.
   *
   * @return {void}
   */
  function connect() {
    console.log("Connecting to native messaging host", hostName);
    connection = chrome.runtime.connectNative(hostName);
    connection.onMessage.addListener(onNativeMessage);
    connection.onDisconnect.addListener(onDisconnected);
  }


  /**
   * recieve a message from the nativeHost
   * This will find the stored promise based upon the message_at unix timestamp
   * and resolve or reject it accordingly.
   *
   * @param  {Object} msg parsed json Object from host
   * @return {void}
   */
  function onNativeMessage(msg) {
    console.log("Message from host", msg);

    // If this is a message has a message_at, which is used to determine message identity.
    if (msg.message_at) {
      const findByMessageId = function (el) { return msg.message_at === el.message_at; };
      const itemInQueue = pendingPromises.find(findByMessageId);
      const itemIndex = pendingPromises.findIndex(findByMessageId);

      // if we have a promise that has not yet been resolved with the same message_at
      if (itemInQueue) {

        // and it has succeeded
        if (msg.status === "ok") {
          itemInQueue.resolve(msg);
        } else  {
          itemInQueue.reject(msg);
        }

        // mark the promise as complete
        itemInQueue.complete = true;

        // remove the promise for the queue it's done, throw it away.
        pendingPromises.splice(itemIndex, 1);
      } else {
        console.error("Message does not have a message_at. callback cannot be completed");
      }
    }
  }


  /**
   * send a message to the nativeHost.
   *
   * internally this will create a list of promises that are pending and track them
   * by message_at timestamp
   * @param  {string} event name of the event to trigger
   * @param  {Object} data  object of data to be sent to nativeHost
   * @return {void}
   */
  function sendNativeMessage(event, data) {
    // open a new connection to the native host if we don't have one.
    if (!connection) {
      connect();
    }
    const at = Date.now();
    let resolve;
    let reject;

    // Build promise object and trigger message to native host.
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

    // Cleanup any promises that take longer than 5 seconds
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

  /**
   * handle a disconnect, when pipe is broken or or nativeHost exists.
   *
   * This will clear all pending promises, and the active connection
   * @return {void}
   */
  function onDisconnected() {
    console.error("Failed to connect: " + chrome.runtime.lastError.message);
    pendingPromises.forEach(function closePromise(item) {
      item.reject({ status: "fail", message: chrome.runtime.lastError.message });
    });
    pendingPromises = [];
    connection = null;
  }


  /**
   * Add handler to listen to events coming from content scripts
   */
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
