import { inherits } from 'util';

import { EventEmitter } from 'events';

function WatchtowerService(options) {
  EventEmitter.call(this);
  this.node = options.node;
  this.bus = this.node.openBus();
}
inherits(WatchtowerService, EventEmitter);

WatchtowerService.dependencies = ['bitcoind'];

WatchtowerService.prototype.start = function(callback) {
  this.bus.subscribe('bitcoind/rawtransaction');
  this.bus.on('bitcoind/rawtransaction', (transactionHex) => {
    console.log('GOT RAW TX', transactionHex);
  });

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
