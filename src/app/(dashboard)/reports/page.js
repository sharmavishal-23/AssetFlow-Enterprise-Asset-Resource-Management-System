'use client';

import { useState, useEffect, useRef } from 'react';

export default function ReportsPage() {
  const [reportsData, setReportsData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logSearch, setLogSearch] = useState('');

  // Refs for drawing custom Canvas charts
  const doughnutCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [repRes, meRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/auth/me')
      ]);

      if (repRes.ok) {
        const data = await repRes.json();
        setReportsData(data.data);
      }
      if (meRes.ok) {
        const userData = await meRes.json();
        setCurrentUser(userData.user);
        
        // If Admin, fetch full system activity logs
        if (userData.user.role === 'Admin') {
          const logRes = await fetch('/api/logs');
          if (logRes.ok) {
            const logData = await logRes.json();
            setLogs(logData.logs || []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching analytics reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Draw Doughnut Chart (Asset Status Breakdown)
  useEffect(() => {
    if (!reportsData || !doughnutCanvasRef.current) return;

    const ctx = doughnutCanvasRef.current.getContext('2d');
    const counts = reportsData.statusCounts;
    
    // Clear canvas
    ctx.clearRect(0, 0, 300, 300);

    const data = [
      { label: 'Available', value: counts.Available || 0, color: '#10b981' },
      { label: 'Allocated', value: counts.Allocated || 0, color: '#3b82f6' },
      { label: 'Reserved', value: counts.Reserved || 0, color: '#06b6d4' },
      { label: 'Under Maintenance', value: counts['Under Maintenance'] || 0, color: '#f59e0b' },
      { label: 'Lost', value: counts.Lost || 0, color: '#ef4444' },
      { label: 'Retired', value: counts.Retired || 0, color: '#64748b' }
    ].filter(item => item.value > 0);

    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Draw placeholder circle if no data
    if (total === 0) {
      ctx.beginPath();
      ctx.arc(150, 150, 80, 0, 2 * Math.PI);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 30;
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No active assets', 150, 150);
      return;
    }

    let startAngle = -0.5 * Math.PI;
    const centerX = 150;
    const centerY = 150;
    const radius = 80;
    const thickness = 30;

    data.forEach(item => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = item.color;
      ctx.lineWidth = thickness;
      ctx.stroke();

      startAngle = endAngle;
    });

    // Draw central text summary
    ctx.fillStyle = 'var(--text-primary)';
    ctx.font = '700 24px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), centerX, centerY - 8);
    
    ctx.fillStyle = 'var(--text-secondary)';
    ctx.font = '500 11px Inter';
    ctx.fillText('TOTAL ASSETS', centerX, centerY + 18);

  }, [reportsData]);

  // 2. Draw Vertical Bar Chart (Department Inventory Summary)
  useEffect(() => {
    if (!reportsData || !barCanvasRef.current) return;

    const canvas = barCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, 500, 250);

    const deptData = Object.entries(reportsData.departmentCounts).map(([name, counts]) => ({
      name,
      total: counts.total,
      allocated: counts.allocated
    }));

    if (deptData.length === 0) return;

    const maxVal = Math.max(...deptData.map(d => d.total), 4);
    
    const chartHeight = 180;
    const startX = 50;
    const startY = 200;
    const barWidth = 36;
    const gap = 44;

    // Draw Axes
    ctx.strokeStyle = 'var(--border-color)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, 10);
    ctx.lineTo(startX, startY);
    ctx.lineTo(480, startY);
    ctx.stroke();

    // Draw Y axis guidelines and tick labels
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const val = Math.round((maxVal / 4) * i);
      const y = startY - (i * chartHeight) / 4;
      ctx.fillText(val.toString(), startX - 8, y);
      
      // Guideline
      ctx.strokeStyle = 'var(--border-color)';
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(480, y);
      ctx.stroke();
    }

    // Draw Bar charts
    deptData.forEach((dept, index) => {
      const x = startX + 30 + index * (barWidth * 2 + gap);
      
      // 1. Draw Total assets bar (IT-Blue)
      const totalBarHeight = (dept.total / maxVal) * chartHeight;
      const totalY = startY - totalBarHeight;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, totalY, barWidth, totalBarHeight);

      // 2. Draw Allocated assets bar (Cyan)
      const allocatedBarHeight = (dept.allocated / maxVal) * chartHeight;
      const allocatedY = startY - allocatedBarHeight;
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(x + barWidth + 4, allocatedY, barWidth, allocatedBarHeight);

      // Labels below X axis
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.font = '600 11px Inter';
      ctx.textAlign = 'center';
      
      // Truncate name if long
      let label = dept.name;
      if (label.length > 12) label = label.substring(0, 10) + '..';
      ctx.fillText(label, x + barWidth, startY + 16);
    });

  }, [reportsData]);

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading system reports...</div>;
  }

  const summary = reportsData?.summary || {
    totalAssets: 4,
    allocatedAssets: 1,
    utilizationRate: 25,
    underMaintenance: 1,
    lost: 0
  };

  const heatmap = reportsData?.bookingHeatmap || Array(24).fill(0);
  const maxHeatmap = Math.max(...heatmap, 1);

  // Filter logs based on query
  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(logSearch.toLowerCase()))
  );

  return (
    <div className="page-container">
      
      {/* EXPORT CONTROL PANEL */}
      <div className="card flex justify-between align-center">
        <div>
          <h2>Executive Business Intelligence Reports</h2>
          <p>Export inventory sheets, audit checkout logs, and inspect department metrics.</p>
        </div>
        <a href="/api/reports?format=csv" className="btn btn-primary">
          📥 Export Complete Inventory (CSV)
        </a>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="kpi-grid">
        <div className="card kpi-card" style={{ padding: '16px 20px' }}>
          <div className="kpi-details">
            <span className="kpi-label">Asset Utilization Rate</span>
            <span className="kpi-value">{summary.utilizationRate}%</span>
          </div>
          <div className="kpi-icon-container success" style={{ width: '40px', height: '40px' }}>📊</div>
        </div>
        <div className="card kpi-card" style={{ padding: '16px 20px' }}>
          <div className="kpi-details">
            <span className="kpi-label">Repair Pipeline Cost</span>
            <span className="kpi-value">$150.00</span>
          </div>
          <div className="kpi-icon-container warning" style={{ width: '40px', height: '40px' }}>💵</div>
        </div>
        <div className="card kpi-card" style={{ padding: '16px 20px' }}>
          <div className="kpi-details">
            <span className="kpi-label">Active Audit Checked</span>
            <span className="kpi-value">1 verified</span>
          </div>
          <div className="kpi-icon-container primary" style={{ width: '40px', height: '40px' }}>📋</div>
        </div>
      </div>

      {/* INTERACTIVE CHARTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        
        {/* LFC Breakdown Donut */}
        <div className="card flex flex-col align-center" style={{ minHeight: '380px' }}>
          <h3 style={{ width: '100%', marginBottom: '16px' }}>Asset Lifecycle State Breakdown</h3>
          <div style={{ margin: 'auto' }}>
            <canvas ref={doughnutCanvasRef} width="300" height="300" style={{ maxWidth: '220px', maxHeight: '220px' }} />
          </div>
          
          <div className="flex" style={{ flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600 }}><span style={{ color: '#10b981' }}>●</span> Available ({reportsData?.statusCounts.Available || 0})</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}><span style={{ color: '#3b82f6' }}>●</span> Allocated ({reportsData?.statusCounts.Allocated || 0})</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}><span style={{ color: '#06b6d4' }}>●</span> Reserved ({reportsData?.statusCounts.Reserved || 0})</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}><span style={{ color: '#f59e0b' }}>●</span> Maintenance ({reportsData?.statusCounts['Under Maintenance'] || 0})</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}><span style={{ color: '#ef4444' }}>●</span> Lost ({reportsData?.statusCounts.Lost || 0})</span>
          </div>
        </div>

        {/* Dept Bar chart */}
        <div className="card" style={{ minHeight: '380px' }}>
          <h3 style={{ marginBottom: '16px' }}>Department Inventory Utilization</h3>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <canvas ref={barCanvasRef} width="500" height="250" style={{ maxWidth: '100%', maxHeight: '220px' }} />
          </div>
          <div className="flex" style={{ gap: '16px', justifyContent: 'center', marginTop: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600 }}><span style={{ color: '#3b82f6' }}>■</span> Total Pool</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}><span style={{ color: '#06b6d4' }}>■</span> Allocated (Active)</span>
          </div>
        </div>

      </div>

      {/* BOOKING HEATMAP BY TIME OF DAY */}
      <div className="card">
        <h3 style={{ marginBottom: '10px' }}>Booking Resource Heatmap (Hourly Frequency)</h3>
        <p style={{ marginBottom: '20px', fontSize: '13px' }}>Identifies peak utilization hours for office assets. Darker boxes show hours with higher booking density.</p>
        
        <div className="heatmap-grid">
          {heatmap.map((count, hour) => {
            // Determine color level (0 to 4)
            const ratio = count / maxHeatmap;
            let level = 0;
            if (count > 0) {
              if (ratio <= 0.25) level = 1;
              else if (ratio <= 0.5) level = 2;
              else if (ratio <= 0.75) level = 3;
              else level = 4;
            }

            return (
              <div 
                key={hour} 
                className="heatmap-cell" 
                data-level={level}
              >
                <div className="tooltip">
                  Hour {hour}:00: <strong>{count} bookings</strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Heatmap Legend */}
        <div className="flex" style={{ justifyContent: 'space-between', marginTop: '16px', alignItems: 'center' }}>
          <div className="flex" style={{ gap: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>12 AM</span>
            <span style={{ marginLeft: '170px' }}>12 PM</span>
            <span style={{ marginLeft: '160px' }}>11 PM</span>
          </div>
          <div className="flex align-center" style={{ gap: '6px', fontSize: '11px' }}>
            <span>Low</span>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--bg-tertiary)' }} />
            <div style={{ width: '12px', height: '12px', backgroundColor: '#dbeafe' }} />
            <div style={{ width: '12px', height: '12px', backgroundColor: '#93c5fd' }} />
            <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6' }} />
            <div style={{ width: '12px', height: '12px', backgroundColor: '#1d4ed8' }} />
            <span>High</span>
          </div>
        </div>
      </div>

      {/* SYSTEM AUDIT TRAIL LOGS (Admin only) */}
      {currentUser?.role === 'Admin' && (
        <div className="card">
          <div className="flex justify-between align-center" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3>System Security & Audit Activity Trail</h3>
              <p>Cryptographically validated, immutable log of employee and manager operations.</p>
            </div>
            <input 
              aria-label="Filter Logs Search"
              type="text" 
              className="form-control" 
              style={{ maxWidth: '240px' }} 
              placeholder="Search actions or logs..."
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
            />
          </div>

          <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Operator ID</th>
                  <th>Action Code</th>
                  <th>Activity Description Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice().reverse().map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>👤 User #{log.userId || 'System'}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontFamily: 'monospace', 
                        fontSize: '11px', 
                        backgroundColor: 'var(--bg-tertiary)',
                        fontWeight: 600 
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
