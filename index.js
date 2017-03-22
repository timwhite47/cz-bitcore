
const _util = require('util');

const _bitcoreLib = require('bitcore-lib');

const _events = require('events');

const NETWORK = 'testnet';

function WatchtowerService(options) {
  _events.EventEmitter.call(this);
  this.node = options.node;
  this.bus = this.node.openBus();
}
(0, _util.inherits)(WatchtowerService, _events.EventEmitter);

WatchtowerService.dependencies = ['bitcoind'];

WatchtowerService.prototype.onTx = function (txHex) {
  tx = new _bitcoreLib.Transaction(txHex);
  addresses = tx.outputs.map((_ref) => {
    const script = _ref.script;
    return script.toAddress(NETWORK);
  });

  console.log('GOT TX', {
    hash: tx.hash,
    outAddrs: addresses,
  });
};

WatchtowerService.prototype.start = function (callback) {
  const _this = this;

  this.bus.subscribe('bitcoind/rawtransaction');
  this.bus.on('bitcoind/rawtransaction', (hex) => _this.onTx(hex));

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
