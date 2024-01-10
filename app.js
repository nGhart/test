"use strict";

const token = process.env.WHATSAPP_TOKEN;

const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json());
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

const createLog = (data) => {
  console.log(
    "del",
    "entry id:",
    data.id,
    "phone_number_id:",
    data.phone_number_id,
    "recipient_id:",
    data.recipient_id,
    "status_id:",
    data.status_id,
    "status:",
    data.status,
    "timestamp:",
    data.timestamp
  );
};

const subscribe = (data) => {
  console.log("subscribe", data.from);
};

const unsubscribe = (data) => {
  console.log("unsubscribe from database", data.from);
};

app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
   **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

async function handleDeliveryStatus(entry) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const {
        id,
        changes: [{ value: { metadata = {}, statuses = [{}] } = {} } = {}] = [],
      } = entry;

      if (!id || !metadata.phone_number_id || !statuses[0]) {
        console.error("Invalid delivery status data");
        reject(new Error("Invalid delivery status data"));
      }

      const { phone_number_id } = metadata;
      const { id: status_id, status, timestamp, recipient_id } = statuses[0];

      createLog({
        phone_number_id,
        recipient_id,
        status_id,
        status,
        timestamp,
      });
      //console.log("del", "entry id:", id, "phone_number_id:", phone_number_id,"recipient_id:",recipient_id,  "status_id:", status_id, "status:", status, "timestamp:", timestamp);
      resolve();
    }, 1000);
  });
}

function handleReceivedMessage(entry) {
  const {
    changes: [{ value: { metadata = {}, messages = [{}] } = {} } = {}],
  } = entry;

  if (!metadata.phone_number_id || !messages[0]) {
    console.error("Invalid received message data");
    return;
  }

  const { phone_number_id } = metadata;
  const {
    from,
    text: { body: msg_body },
  } = messages[0];

  if (msg_body === "start wsh") {
    // console.log("From:", from, "Message Body:", msg_body, " subscribe user");
    subscribe({ from });
  } else if (msg_body === "stop wsh") {
    unsubscribe({ from });
    // console.log("From:", from, "Message Body:", msg_body, " remove user user");
  } else {
    console.log("Take no subscription action");
  }
}

// async function handleReceivedMessage(entry) {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       const { changes: [{ value: { metadata = {}, messages = [{}] } = {} } = {}] = [] } = entry;

//       if (!metadata.phone_number_id || !messages[0]) {
//         console.error("Invalid received message data");
//         reject(new Error("Invalid received message data"));
//       }

//       const { phone_number_id } = metadata;
//       const { from, text: { body: msg_body } } = messages[0];

//       if (msg_body === "start wsh") {
//         //console.log("From:", from, "Message Body:", msg_body, " subscribe user");
//         subscribe()
//       } else if (msg_body === "stop wsh") {
//         //console.log("From:", from, "Message Body:", msg_body, " remove user user");
//         unsubscribe()
//       } else {
//         console.log("Take no subscription action");
//       }

//       resolve();
//     }, 10000);
//   });
// }

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (
      !body.object ||
      !body.entry ||
      !body.entry[0].changes ||
      !body.entry[0].changes[0].value
    ) {
      return res.sendStatus(404);
    }

    const entry = body.entry[0];
    const change = entry.changes[0].value;

    if (change.statuses) {
      await handleDeliveryStatus(entry);
    }

    if (change.messages) {
      await handleReceivedMessage(entry);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error("Error:", error.message);
    res.sendStatus(500);
  }
});
