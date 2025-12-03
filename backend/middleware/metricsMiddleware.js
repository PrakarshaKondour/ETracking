import { httpRequestDuration, httpRequestsTotal } from '../config/prometheus.js';

/**
 * Middleware to track HTTP request metrics for Prometheus
 */
export const metricsMiddleware = (req, res, next) => {
    const start = Date.now();

    // Capture the original end function
    const originalEnd = res.end;

    // Override res.end to capture metrics when response is sent
    res.end = function (...args) {
        // Calculate duration
        const duration = (Date.now() - start) / 1000; // Convert to seconds

        // Get route pattern (or path if no pattern available)
        const route = req.route?.path || req.path || 'unknown';
        const method = req.method;
        const statusCode = res.statusCode;

        // Record metrics
        httpRequestDuration.observe(
            { method, route, status_code: statusCode },
            duration
        );

        httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode,
        });

        // Call the original end function
        originalEnd.apply(res, args);
    };

    next();
};
