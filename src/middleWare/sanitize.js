const xss = require("xss-clean");

// XSS sanitizer middleware
const sanitize = () => xss();

module.exports = sanitize;
