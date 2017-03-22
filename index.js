'use strict';

var _util = require('util');

var _events = require('events');

function WatchtowerService(options) {
  _events.EventEmitter.call(this);
  this.node = options.node;
  this.bus = this.node.openBus();
}
(0, _util.inherits)(WatchtowerService, _events.EventEmitter);

WatchtowerService.dependencies = ['bitcoind'];

WatchtowerService.prototype.start = function (callback) {
  this.bus.subscribe('bitcoind/rawtransaction');
  this.bus.on('bitcoind/rawtransaction', function (transactionHex) {
    console.log('GOT RAW TX', transactionHex);
  });

  console.log('starting service');
  setImmediate(callback);
};

WatchtowerService.prototype.stop = function (callback) {
  console.log('stopping service');
  this.bus.unsubscribe('bitcoind/rawtransaction');
  setImmediate(callback);
};

WatchtowerService.prototype.getAPIMethods = function () {
  return [];
};

Service.prototype.getRoutePrefix = function () {
  return 'watchtower';
};

WatchtowerService.prototype.getPublishEvents = function () {
  return [];
};

module.exports = WatchtowerService;
