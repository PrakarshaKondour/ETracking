import { useEffect, useState, useRef } from 'react';
import { apiCall } from '../../utils/api';
import { getUserRole, getAuthToken } from '../../utils/auth';
import './NotificationDropdown.css';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(getUserRole() || 'admin');
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      const path = role === 'admin' ? '/api/notifications' : `/api/${role}/notifications`;
      const data = await apiCall(path);
      const list = data?.data?.notifications || data?.notifications || [];
      setNotifications(list);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    const r = getUserRole() || 'admin';
    setRole(r);
  }, []);

  useEffect(() => {
    if (!role) return;

    loadNotifications();

    let es;
    try {
      const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const token = getAuthToken();
      if (token) {
        const streamUrl = role === 'admin' 
          ? `${API}/api/notifications/stream?token=${token}` 
          : `${API}/api/${role}/notifications/stream?token=${token}`;
        es = new EventSource(streamUrl);
        es.addEventListener('notification', (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.type === 'order.updated' && payload.data?.removed) {
              setNotifications(prev =>
                prev.filter(n => !(n.data?.orderId === payload.data.orderId))
              );
            } else if (payload.type === 'order.delayed_escalation' || payload.type === 'order.delayed') {
              setNotifications(prev => [
                {
                  _notifType: payload.type === 'order.delayed_escalation' ? 'order_delayed_escalation' : 'order_delayed',
                  data: payload.data,
                  timestamp: new Date().toISOString(),
                },
                ...prev,
              ]);
            }
          } catch (e) {
            console.error('SSE parse error', e);
          }
        });
        es.onerror = () => {
          console.error('SSE error');
        };
      }
    } catch (e) {
      console.warn('Failed to open SSE stream:', e);
    }

    const interval = setInterval(loadNotifications, 10000);
    return () => {
      clearInterval(interval);
      try { es && es.close(); } catch(e) {}
    };
  }, [role, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const handleClear = async (orderId, e) => {
    e.stopPropagation();
    try {
      const path = role === 'admin' 
        ? `/api/notifications/order/${orderId}` 
        : `/api/${role}/notifications/ack/${orderId}`;
      await apiCall(path, { method: 'POST' });
      setNotifications(prev => prev.filter(n => n.data?.orderId !== orderId));
    } catch (err) {
      console.error('Failed to clear notification:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      setLoading(true);
      const path = role === 'admin' ? '/api/notifications' : `/api/${role}/notifications`;
      await apiCall(path, { method: 'DELETE' });
      setNotifications([]);
      setOpen(false);
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-dropdown-container" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setOpen(!open)}
        title="View Notifications"
        aria-label="Notifications"
      >
        🔔
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications ({notifications.length})</h3>
            {notifications.length > 0 && (
              <button
                className="clear-all-btn"
                onClick={handleClearAll}
                disabled={loading}
              >
                {loading ? '...' : 'Clear All'}
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map((notif, idx) => {
                // Parse data if it's a string
                let data = notif.data;
                if (typeof data === 'string') {
                  try {
                    data = JSON.parse(data);
                  } catch (e) {
                    data = {};
                  }
                }

                const isCritical = notif._notifType === 'order_delayed_escalation';
                const isDarkMode = localStorage.getItem('darkMode') === 'true';
                const bgColor = isCritical
                  ? isDarkMode ? '#3a1f1f' : '#fff5f5'
                  : isDarkMode ? '#2a2a2a' : '#f5f5f5';

                // Extract vendor/customer username based on role
                const vendorName = data?.vendorUsername || data?.vendor || 'Unknown';
                const customerName = data?.customerUsername || data?.customer || 'Unknown';
                const orderId = data?.orderId || 'N/A';
                const status = data?.status || 'pending';
                const total = data?.total || 0;
                const createdAt = data?.createdAt || notif.timestamp;

                return (
                  <div key={idx} className="notification-item" style={{ backgroundColor: bgColor }}>
                    <div className="notification-content">
                      <div className="notification-title">
                        {isCritical ? '⏱️ Delayed' : '🔔'} Order #{orderId?.slice?.(-8) || orderId}
                      </div>
                      <div className="notification-details">
                        {role === 'admin' && <span>Vendor: {vendorName}</span>}
                        {role === 'admin' && <span>Customer: {customerName}</span>}
                        {role === 'vendor' && <span>Customer: {customerName}</span>}
                        {role === 'customer' && <span>Vendor: {vendorName}</span>}
                        <span>Status: {status.replace(/_/g, ' ')}</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                      {createdAt && (
                        <div className="notification-time">
                          {new Date(createdAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <button
                      className="clear-notif-btn"
                      onClick={(e) => handleClear(orderId, e)}
                      title="Acknowledge"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
