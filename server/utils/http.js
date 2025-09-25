const axios = require("axios");

const instance = axios.create({
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
  maxRedirects: 0,
});

module.exports = instance;
