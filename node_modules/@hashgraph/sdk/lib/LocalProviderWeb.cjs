"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _WebClient = _interopRequireDefault(require("./client/WebClient.cjs"));
var _AccountBalanceQuery = _interopRequireDefault(require("./account/AccountBalanceQuery.cjs"));
var _AccountInfoQuery = _interopRequireDefault(require("./account/AccountInfoQuery.cjs"));
var _AccountRecordsQuery = _interopRequireDefault(require("./account/AccountRecordsQuery.cjs"));
var _TransactionReceiptQuery = _interopRequireDefault(require("./transaction/TransactionReceiptQuery.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// SPDX-License-Identifier: Apache-2.0

/**
 * @typedef {import("./Provider.js").Provider} Provider
 * @typedef {import("./LedgerId.js").default} LedgerId
 * @typedef {import("./Key.js").default} Key
 * @typedef {import("./transaction/Transaction.js").default} Transaction
 * @typedef {import("./transaction/TransactionId.js").default} TransactionId
 * @typedef {import("./transaction/TransactionResponse.js").default} TransactionResponse
 * @typedef {import("./transaction/TransactionReceipt.js").default} TransactionReceipt
 * @typedef {import("./transaction/TransactionRecord.js").default} TransactionRecord
 * @typedef {import("./account/AccountId.js").default} AccountId
 * @typedef {import("./account/AccountBalance.js").default} AccountBalance
 * @typedef {import("./account/AccountInfo.js").default} AccountInfo
 * @typedef {import("./logger/Logger.js").default} Logger
 */

/**
 * @template {any} O
 * @typedef {import("./query/Query.js").default<O>} Query<O>
 */

/**
 * @template RequestT
 * @template ResponseT
 * @template OutputT
 * @typedef {import("./Executable.js").default<RequestT, ResponseT, OutputT>} Executable<RequestT, ResponseT, OutputT>
 */

/**
 * @implements {Provider}
 */
class LocalProviderWeb {
  /**
   * @param {object} props
   * @param {Client} [props.client]
   * @param {"mainnet" | "testnet" | "previewnet" | "local-node"} [props.networkName]
   */
  constructor(props = {}) {
    if (props != null && props.client != null) {
      this._client = props.client;
      return;
    }
    this._client = _WebClient.default.forName(props.networkName || "local-node");
  }

  /**
   * @param {Client} client
   * @returns {LocalProviderWeb}
   */
  static fromClient(client) {
    return new LocalProviderWeb({
      client
    });
  }

  /**
   * @returns {LedgerId?}
   */
  getLedgerId() {
    return this._client.ledgerId;
  }

  /**
   * @returns {{[key: string]: (string | AccountId)}}
   */
  getNetwork() {
    return this._client.network;
  }

  /**
   * @returns {string[]}
   */
  getMirrorNetwork() {
    return this._client.mirrorNetwork;
  }

  /**
   * @param {AccountId | string} accountId
   * @returns {Promise<AccountBalance>}
   */
  getAccountBalance(accountId) {
    return new _AccountBalanceQuery.default().setAccountId(accountId).execute(this._client);
  }

  /**
   * @param {AccountId | string} accountId
   * @returns {Promise<AccountInfo>}
   */
  getAccountInfo(accountId) {
    return new _AccountInfoQuery.default().setAccountId(accountId).execute(this._client);
  }

  /**
   * @param {AccountId | string} accountId
   * @returns {Promise<TransactionRecord[]>}
   */
  getAccountRecords(accountId) {
    return new _AccountRecordsQuery.default().setAccountId(accountId).execute(this._client);
  }

  /**
   * @param {TransactionId | string} transactionId
   * @returns {Promise<TransactionReceipt>}
   */
  getTransactionReceipt(transactionId) {
    return new _TransactionReceiptQuery.default().setTransactionId(transactionId).execute(this._client);
  }

  /**
   * @param {Transaction} transaction
   * @returns {Promise<TransactionResponse>}
   */
  async sendTransaction(transaction) {
    return await transaction.execute(this._client);
  }

  /**
   * @template O
   * @param {Query<O>} query
   * @returns {Promise<O>}
   */
  async sendQuery(query) {
    return await query.execute(this._client);
  }

  /**
   * @param {TransactionResponse} response
   * @returns {Promise<TransactionReceipt>}
   */
  async waitForReceipt(response) {
    return await response.getReceipt(this._client);
  }

  /**
   * @template RequestT
   * @template ResponseT
   * @template OutputT
   * @param {Executable<RequestT, ResponseT, OutputT>} request
   * @returns {Promise<OutputT>}
   */
  async call(request) {
    return await request.execute(this._client);
  }

  /**
   * @returns {void}
   */
  close() {
    this._client.close();
  }
}
exports.default = LocalProviderWeb;