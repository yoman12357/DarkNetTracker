const requestMetrics = {
  total: 0,
  errors: 0,
  byMethod: {},
  byStatus: {},
};

export function recordRequestMetric({ method, statusCode }) {
  requestMetrics.total += 1;
  requestMetrics.byMethod[method] = (requestMetrics.byMethod[method] ?? 0) + 1;
  requestMetrics.byStatus[statusCode] = (requestMetrics.byStatus[statusCode] ?? 0) + 1;
  if (statusCode >= 400) {
    requestMetrics.errors += 1;
  }
}

export function getRequestMetrics() {
  return structuredClone(requestMetrics);
}
