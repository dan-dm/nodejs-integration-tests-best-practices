const {
  FakeMessageQueueProvider,
} = require('../../example-application/libraries/fake-message-queue-provider');
const {
  MessageQueueStarter,
} = require('../../example-application/entry-points/message-queue-starter');
const { once } = require('events');
const { resolve } = require('path');
const amqplib = require('amqplib');
const MessageQueueClient = require('../../example-application/libraries/message-queue-client');

// Starts the message queue client with a fake MQ - Ideal for testing
module.exports.startFakeMessageQueue = async () => {
  const fakeMessageQueue = new FakeMessageQueueProvider();
  const messageQueueStarter = new MessageQueueStarter(amqplib);
  await messageQueueStarter.start();
  return fakeMessageQueue;
};

// A typical message queue emits events ("callbacks") which can make the test syntax cumbersome and based on callbacks
// This method sugar coats the syntax by returning a promise and will fire event from the MQ or a timeout
module.exports.getNextMQConfirmation = async (
  fakeMessageQueue,
  timeoutInMS = 500,
  eventName = 'message-handled'
) => {
  const timeout = new Promise((resolve) =>
    setTimeout(resolve.bind(this, { event: 'time-out' }), timeoutInMS)
  );
  const eventFromMQ = once(fakeMessageQueue, eventName);
  const errorFromMQ = new Promise((resolve, reject) => {
    fakeMessageQueue.on('error', (error) => {
      console.error(`Error caught from fake MQ`, error);
      resolve({ event: 'error' });
    });
  });

  return Promise.race([timeout, eventFromMQ, errorFromMQ]);
};

module.exports.getMQMessageOrTimeout = async (queueName, timeoutInMS) => {
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(resolve.bind(this, { event: 'time-out' }), timeoutInMS)
  );

  const newMessagePromise = new Promise((resolve) => {
    const messageQueueClient = new MessageQueueClient(amqplib);
    messageQueueClient.consume(queueName, async (newMessage) => {
      resolve(newMessage);
    })
  });

  return Promise.race([timeoutPromise, newMessagePromise]);
};

module.exports.getShortUnique = () => {
  const now = new Date();
  // We add this weak random just to cover the case where two test started at the very same millisecond
  const aBitOfMoreSalt = Math.ceil(Math.random() * 99);
  return `${process.pid}${aBitOfMoreSalt}${now.getMilliseconds()}`;
};