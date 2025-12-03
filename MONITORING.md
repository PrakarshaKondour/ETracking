# Monitoring Setup Guide (No Docker)

This guide explains how to set up and use Prometheus and Grafana **without Docker** for monitoring the ETracking application.

## Overview

The monitoring stack consists of:
- **Prometheus**: Collects and stores metrics from the backend (runs natively on Windows)
- **Grafana**: Visualizes metrics with pre-configured dashboards (runs natively on Windows)
- **Backend Metrics**: Custom business metrics and HTTP request metrics

## Installation

### 1. Install Prometheus

1. Download Prometheus for Windows from: https://prometheus.io/download/
   - Look for `prometheus-*.windows-amd64.zip`
   
2. Extract the ZIP file to a folder, e.g., `C:\prometheus`

3. Copy the `prometheus.yml` from your project root to the Prometheus folder:
   ```bash
   copy prometheus.yml C:\prometheus\prometheus.yml
   ```

### 2. Install Grafana

1. Download Grafana for Windows from: https://grafana.com/grafana/download?platform=windows
   - Download the Windows installer (.msi) or ZIP file
   
2. Install or extract to a folder, e.g., `C:\grafana`

3. Copy provisioning files:
   ```bash
   # Create directories
   mkdir C:\grafana\conf\provisioning\datasources
   mkdir C:\grafana\conf\provisioning\dashboards
   mkdir C:\grafana\dashboards
   
   # Copy files
   copy grafana\provisioning\datasources\datasource.yml C:\grafana\conf\provisioning\datasources\
   copy grafana\provisioning\dashboards\dashboard.yml C:\grafana\conf\provisioning\dashboards\
   copy grafana\dashboards\*.json C:\grafana\dashboards\
   ```

## Quick Start

### 1. Start Prometheus

Open a terminal and run:

```bash
cd C:\prometheus
.\prometheus.exe --config.file=prometheus.yml
```

Prometheus will be available at: http://localhost:9090

### 2. Start Grafana

Open another terminal and run:

```bash
cd C:\grafana\bin
.\grafana-server.exe
```

Grafana will be available at: http://localhost:3000

**Default login:**
- Username: `admin`
- Password: `admin`

### 3. Start the Backend Server

```bash
cd backend
npm start
```

The backend will expose metrics at: http://localhost:5000/metrics

### 4. Start the Frontend

```bash
npm start
```

Frontend will be available at: http://localhost:3000

## Verifying Setup

### Check Prometheus is Scraping

1. Open http://localhost:9090
2. Go to Status > Targets
3. You should see `etracking-backend` with status "UP"
4. If it shows "DOWN", ensure the backend is running on port 5000

### Check Grafana Dashboards

1. Open http://localhost:3000
2. Login with admin/admin
3. Navigate to Dashboards
4. You should see:
   - ETracking - Admin Dashboard
   - ETracking - Vendor Dashboard

## Available Metrics

### Business Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `etracking_orders_total` | Counter | Total number of orders created | `status`, `vendor` |
| `etracking_orders_by_status` | Gauge | Current orders grouped by status | `status` |
| `etracking_orders_by_vendor` | Gauge | Orders per vendor | `vendor` |
| `etracking_revenue_total` | Counter | Total revenue from all orders | `vendor` |
| `etracking_revenue_by_vendor` | Gauge | Revenue per vendor | `vendor` |

### HTTP Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `http_requests_total` | Counter | Total HTTP requests | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | Histogram | HTTP request duration | `method`, `route`, `status_code` |

### System Metrics

Default Node.js metrics are also collected:
- CPU usage
- Memory usage
- Event loop lag
- Garbage collection stats

## Frontend Analytics

The application includes enhanced analytics pages with interactive charts:

### Admin Analytics (`/admin/analytics`)
- **Revenue & Orders Trend**: Line chart showing last 30 days
- **Order Status Distribution**: Pie chart of order statuses
- **Top 5 Vendors**: Bar chart comparing revenue and order count

### Vendor Analytics (`/vendor/analytics`)
- **Revenue & Orders Trend**: Line chart showing last 30 days
- **Order Status Breakdown**: Pie chart of order statuses
- **Performance Metrics**: Week-over-week growth indicators

## Prometheus Queries

### Example Queries

**Total orders in last hour:**
```promql
increase(etracking_orders_total[1h])
```

**Average order value by vendor:**
```promql
etracking_revenue_by_vendor / etracking_orders_by_vendor
```

**HTTP request rate (requests per second):**
```promql
rate(http_requests_total[5m])
```

**95th percentile request duration:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Troubleshooting

### Prometheus Can't Reach Backend

If Prometheus shows the backend target as "DOWN":

1. Ensure the backend is running on port 5000
2. Check that `/metrics` endpoint is accessible: 
   ```bash
   curl http://localhost:5000/metrics
   ```
3. Verify `prometheus.yml` has the correct target: `localhost:5000`

### Grafana Dashboards Not Loading

1. Check that datasource is configured: Grafana > Configuration > Data Sources
2. Verify Prometheus is accessible at http://localhost:9090
3. Check dashboard provisioning files are in the correct location
4. Restart Grafana after copying provisioning files

### No Data in Charts

1. Ensure there are orders in the database
2. Check that the backend is running and accessible
3. Verify metrics are being collected: visit http://localhost:5000/metrics
4. Check browser console for API errors

## Running as Windows Services (Optional)

To run Prometheus and Grafana as Windows services:

### Prometheus Service

1. Download NSSM (Non-Sucking Service Manager): https://nssm.cc/download
2. Run as administrator:
   ```bash
   nssm install Prometheus C:\prometheus\prometheus.exe
   nssm set Prometheus AppParameters --config.file=C:\prometheus\prometheus.yml
   nssm start Prometheus
   ```

### Grafana Service

Grafana installer automatically creates a Windows service. You can manage it via:
- Services app (services.msc)
- Or command line: `net start grafana` / `net stop grafana`

## Stopping Services

### Stop Prometheus
Press `Ctrl+C` in the terminal where Prometheus is running

### Stop Grafana
Press `Ctrl+C` in the terminal where Grafana is running

Or if running as service:
```bash
net stop grafana
```

## Production Considerations

For production deployments:

1. **Change default credentials**: Update Grafana admin password
2. **Enable authentication**: Configure proper authentication for Grafana
3. **Set up alerts**: Configure Prometheus alerting rules
4. **Data retention**: Adjust Prometheus retention period in startup flags
5. **Backup**: Regularly backup Grafana dashboards and Prometheus data
6. **Security**: Use HTTPS and restrict access to monitoring endpoints

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Recharts Documentation](https://recharts.org/)
