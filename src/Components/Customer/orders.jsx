import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const CustomerOrders = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load(){
      try {
        const json = await apiCall('/api/customer/orders');
        if (!mounted) return;
        setData(json.data || []);
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading orders…</div></div>;
  if (!data.length) return <div className="page"><div className="panel">You have no orders yet.</div></div>;

  return (
    <div className="page">
      <h2>Your Orders</h2>
      <div className="panel">
        <table>
          <thead><tr><th>ID</th><th>Vendor</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {data.map(o => (
              <tr key={o._id}>
                <td>{o._id.slice(-8)}</td>
                <td>{o.vendorUsername}</td>
                <td>${(o.total || 0).toFixed(2)}</td>
                <td>{o.status}</td>
                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerOrders;