import { inherits } from 'util';
import { Transaction } from 'bitcore-lib';
import { EventEmitter } from 'events';
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
  });
}
inherits(WatchtowerService, EventEmitter);

WatchtowerService.dependencies = ['bitcoind'];

WatchtowerService.prototype.onTx = function (txHex) {
  const tx = new Transaction(txHex);
  const addresses = tx.outputs.map(({ script }) => script.toAddress(NETWORK));

  Promise
    .filter(addresses, (address) => this.isMonitoredAddress(address))
    .each((address) => {
      console.log('GOT TX', {
        hash: tx.hash,
        outAddrs: address,
      });
    });
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
