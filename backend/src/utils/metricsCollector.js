const logger = require('./logger');

class MetricsCollector {
  constructor() {
    this.metrics = {
      incidentsCreated: 0,
      incidentsCreatedFailed: 0,
      requestsCreated: 0,
      requestsCreatedFailed: 0,
      kbSearches: 0,
      averageResponseTime: 0,
      duplicatesDetected: 0,
      chatMessages: 0,
      totalRequests: 0,
      totalErrors: 0,
    };
    this.startTime = new Date();
  }

  recordIncidentCreated(duration) {
    this.metrics.incidentsCreated++;
    this._updateAverageResponseTime(duration);
    this.metrics.totalRequests++;
  }

  recordIncidentCreationFailed() {
    this.metrics.incidentsCreatedFailed++;
    this.metrics.totalErrors++;
  }

  recordRequestCreated(duration) {
    this.metrics.requestsCreated++;
    this._updateAverageResponseTime(duration);
    this.metrics.totalRequests++;
  }

  recordRequestCreationFailed() {
    this.metrics.requestsCreatedFailed++;
    this.metrics.totalErrors++;
  }

  recordKBSearch() {
    this.metrics.kbSearches++;
  }

  recordDuplicateDetected() {
    this.metrics.duplicatesDetected++;
  }

  recordChatMessage() {
    this.metrics.chatMessages++;
  }

  getMetrics() {
    const uptime = new Date() - this.startTime;
    const totalCreated =
      this.metrics.incidentsCreated + this.metrics.requestsCreated;
    const totalFailed =
      this.metrics.incidentsCreatedFailed + this.metrics.requestsCreatedFailed;

    return {
      ...this.metrics,
      successRate:
        totalCreated > 0
          ? ((totalCreated / (totalCreated + totalFailed)) * 100).toFixed(2) + '%'
          : 'N/A',
      uptime: `${(uptime / 1000 / 60).toFixed(2)} minutes`,
      avgResponseTimeMs: this.metrics.averageResponseTime.toFixed(2),
      timestamp: new Date().toISOString(),
    };
  }

  _updateAverageResponseTime(duration) {
    const totalRequests = this.metrics.totalRequests || 1;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalRequests - 1) + duration) /
      totalRequests;
  }
}

module.exports = new MetricsCollector();
