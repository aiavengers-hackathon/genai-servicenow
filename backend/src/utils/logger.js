/**
 * LOGGER UTILITY
 * 
 * Production-grade logging with:
 * - Structured logging
 * - Log levels
 * - Error tracking
 * - Performance metrics
 */

const fs = require("fs");
const path = require("path");

class Logger {
  constructor() {
    this.logDir = process.env.LOG_DIR || "./logs";
    this.logLevel = process.env.LOG_LEVEL || "INFO";

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };
  }

  /**
   * DEBUG LOG
   */
  debug(message, data = {}) {
    this._log("DEBUG", message, data);
  }

  /**
   * INFO LOG
   */
  info(message, data = {}) {
    this._log("INFO", message, data);
  }

  /**
   * WARN LOG
   */
  warn(message, data = {}) {
    this._log("WARN", message, data);
  }

  /**
   * ERROR LOG
   */
  error(message, data = {}) {
    this._log("ERROR", message, data);
  }

  /**
   * INTERNAL LOG METHOD
   */
  _log(level, message, data = {}) {
    if (this.levels[level] < this.levels[this.logLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };

    // Console output
    const output = `[${timestamp}] [${level}] ${message}${
      Object.keys(data).length > 0 ? " " + JSON.stringify(data) : ""
    }`;

    if (level === "ERROR") {
      console.error(output);
    } else if (level === "WARN") {
      console.warn(output);
    } else if (level === "INFO") {
      console.log(output);
    } else {
      console.debug(output);
    }

    // File output (optional, in production use Winston or similar)
    // this._writeToFile(logEntry);
  }

  /**
   * WRITE TO FILE (OPTIONAL)
   */
  _writeToFile(logEntry) {
    try {
      const date = new Date().toISOString().split("T")[0];
      const logFile = path.join(this.logDir, `${date}.log`);

      fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
    } catch (error) {
      console.error("Failed to write log file", error);
    }
  }

  /**
   * GENERATE ERROR ID
   */
  generateErrorId() {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * PERFORMANCE TIMING
   */
  startTimer() {
    return {
      start: Date.now(),
      end: () => {
        return Date.now() - this.start;
      },
    };
  }
}

module.exports = new Logger();
