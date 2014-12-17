exports = module.exports = {
  /**
   * @var {string|null} log - what namespaces to log
   */
  log: null,

  /**
   * @var {int} shutdownTimeout - How long to wait before hard shutdown
   */
  shutdownTimeout: 30000,

  /**
   * @var {int} initTimeout - How long to initialize before we shutdown
   */
  initTimeout: 5000
};