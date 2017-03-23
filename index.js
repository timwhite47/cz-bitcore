'use strict';

var _util = require('util');

var _bitcoreLib = require('bitcore-lib');

var _events = require('events');

var _sidekiq = require('sidekiq');

var _sidekiq2 = _interopRequireDefault(_sidekiq);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MONITOR_ADDRESS_KEY = 'monitored_addresses';
var NETWORK = 'testnet';
var redis = require('redis');

_bluebird2.default.promisifyAll(redis.RedisClient.prototype);

function WatchtowerService(options) {
  _events.EventEmitter.call(this);
  this.node = options.node;
  this.bus = this.node.openBus();

  this.redisClient = redis.createClient({
    host: 'redis',
    db: 1
  });

  this.sidekiq = new _sidekiq2.default(this.redisClient, process.env.NODE_ENV);
}
(0, _util.inherits)(WatchtowerService, _events.EventEmitter);

WatchtowerService.dependencies = ['bitcoind'];

WatchtowerService.prototype.updatePayment = function (address) {
  console.log('Enqueuing Payment Update', address);
  this.sidekiq.enqueue('UpdatePaymentWorker', [address.toString()], {
    retry: true,
    queue: 'critical'
  });
};

WatchtowerService.prototype.onTx = function (txHex) {
  var _this = this;

  var tx = new _bitcoreLib.Transaction(txHex);
  var addresses = tx.outputs.map(function (_ref) {
    var script = _ref.script;
    return script.toAddress(NETWORK);
  });

  console.log('Got TX', tx);

  _bluebird2.default.filter(addresses, function (address) {
    return _this.isMonitoredAddress(address);
  }).each(function (address) {
    return _this.updatePayment(address);
  });
};

WatchtowerService.prototype.isMonitoredAddress = function (address) {
  return this.redisClient.sismemberAsync(MONITOR_ADDRESS_KEY, address.toString()).then(function (result) {
    return Boolean(result);
  });
};

WatchtowerService.prototype.start = function (callback) {
  var _this2 = this;

  this.bus.subscribe('bitcoind/rawtransaction');
  this.bus.on('bitcoind/rawtransaction', function (hex) {
    return _this2.onTx(hex);
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

WatchtowerService.prototype.getRoutePrefix = function () {
  return 'watchtower';
};

WatchtowerService.prototype.getPublishEvents = function () {
  return [];
};

module.exports = WatchtowerService;
