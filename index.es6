import { inherits } from 'util';
import { EventEmitter } from 'events';
const bitcore = global._bitcore;
const NETWORK = 'testnet';
const { Transaction } = bitcore;

function WatchtowerService(options) {
  EventEmitter.call(this);
  this.node = options.node;
  this.bus = this.node.openBus();
}
inherits(WatchtowerService, EventEmitter);

WatchtowerService.dependencies = ['bitcoind'];

WatchtowerService.prototype.onTx = function (txHex) {
  tx = new Transaction(txHex);
  addresses = tx.outputs.map(({ script }) => script.toAddress(NETWORK));

  console.log('GOT TX', {
    hash: tx.hash,
    outAddrs: addresses,
  });
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
