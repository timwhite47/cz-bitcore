import { inherits } from 'util';
import { Transaction } from 'bitcore-lib';
import { EventEmitter } from 'events';
import Sidekiq from 'sidekiq';
import Promise from 'bluebird';
const MONITOR_ADDRESS_KEY = 'monitored_addresses';
const NETWORK = 'testnet';
const redis = require('redis');

Promise.promisifyAll(redis.RedisClient.prototype);

function WatchtowerService(options) {
  EventEmitter.call(this);
  this.node = options.node;
  this.bus = this.node.openBus();

  this.redisClient = redis.createClient({
    host: 'redis',
    db: 1,
  });

  this.sidekiq = new Sidekiq(this.redisClient, process.env.NODE_ENV);
}
inherits(WatchtowerService, EventEmitter);

WatchtowerService.dependencies = ['bitcoind'];

WatchtowerService.prototype.updatePayment = function (address) {
  console.log('Enqueuing Payment Update', address);
  this.sidekiq.enqueue('UpdatePaymentWorker', [address.toString()], {
    retry: true,
    queue: 'critical',
  });
};

WatchtowerService.prototype.onTx = function (txHex) {
  const tx = new Transaction(txHex);
  const addresses = tx.outputs.map(({ script }) => script.toAddress(NETWORK));

  console.log('Got TX', tx);

  Promise
    .filter(addresses, (address) => this.isMonitoredAddress(address))
    .each((address) => this.updatePayment(address));
};

WatchtowerService.prototype.isMonitoredAddress = function (address) {
  return this.redisClient
    .sismemberAsync(MONITOR_ADDRESS_KEY, address.toString())
    .then((result) => Boolean(result));
};

WatchtowerService.prototype.start = function(callback) {
  this.bus.subscribe('bitcoind/rawtransaction');
  this.bus.on('bitcoind/rawtransaction', (hex) => this.onTx(hex));
  console.log('starting service');
  setImmediate(callback);
};

WatchtowerService.prototype.stop = function(callback) {
  console.log('stopping service');
  this.bus.unsubscribe('bitcoind/rawtransaction');
  setImmediate(callback);
};

WatchtowerService.prototype.getAPIMethods = function() {
  return [];
};

WatchtowerService.prototype.getRoutePrefix = function() {
  return 'watchtower';
};

WatchtowerService.prototype.getPublishEvents = function() {
  return [];
};

module.exports = WatchtowerService;
