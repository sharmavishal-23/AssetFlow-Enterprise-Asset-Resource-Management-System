'use client';

import { useState, useEffect } from 'react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Calendar dates controller
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Form states
  const [assetId, setAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reminder, setReminder] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bkRes, astRes, usrRes, meRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/assets'),
        fetch('/api/users'),
        fetch('/api/auth/me')
      ]);

      if (bkRes.ok) setBookings((await bkRes.json()).bookings || []);
      if (astRes.ok) setAssets((await astRes.json()).assets || []);
      if (usrRes.ok) setUsers((await usrRes.json()).users || []);
      if (meRes.ok) setCurrentUser((await meRes.json()).user);
    } catch (err) {
      console.error('Error fetching calendar booking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, title, startTime, endTime })
      });
      const data = await res.json();

      if (res.ok) {
        setShowAddModal(false);
        // Reset states
        setAssetId('');
        setTitle('');
        setStartTime('');
        setEndTime('');
        setReminder(false);
        loadData();
        if (reminder) {
          alert('✓ Success! Email reminder scheduled for 15 minutes before booking starts.');
        }
      } else {
        setFormError(data.error || 'Failed to schedule booking.');
      }
    } catch (err) {
      console.error(err);
      setFormError('A network error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateBooking = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedBooking.id,
          title,
          startTime,
          endTime
        })
      });
      const data = await res.json();

      if (res.ok) {
        setShowEditModal(false);
        setSelectedBooking(null);
        setTitle('');
        setStartTime('');
        setEndTime('');
        loadData();
      } else {
        setFormError(data.error || 'Failed to reschedule booking.');
      }
    } catch (err) {
      console.error(err);
      setFormError('A network error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, status: 'Cancelled' })
      });
      if (res.ok) {
        setShowEditModal(false);
        setSelectedBooking(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel booking.');
      }
    } catch (err) {
      console.error('Cancel booking error:', err);
    }
  };

  // Open edit modal and populate values
  const openEditModal = (bk) => {
    setSelectedBooking(bk);
    setTitle(bk.title);
    setStartTime(bk.startTime.substring(0, 16)); // Crop ISO format to fit datetime-local input
    setEndTime(bk.endTime.substring(0, 16));
    setShowEditModal(true);
  };

  // Calendar logic helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0 is Sunday

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const prevMonthDays = getDaysInMonth(year, month - 1);
  
  const calendarCells = [];

  // 1. Prepend days from previous month to align grid
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      month: 'prev',
      date: new Date(year, month - 1, prevMonthDays - i)
    });
  }

  // 2. Add days of the current month
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarCells.push({
      day: i,
      month: 'current',
      date: new Date(year, month, i)
    });
  }

  // 3. Append remaining days from next month to fill grid rows (42 cells max)
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      day: i,
      month: 'next',
      date: new Date(year, month + 1, i)
    });
  }

  const navigateMonth = (direction) => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(nextDate);
  };

  const getBookingsForDay = (cellDate) => {
    return bookings.filter(b => {
      if (b.status !== 'Confirmed') return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      
      // Set hours to 0 to compare day boundaries
      const cellStart = new Date(cellDate);
      cellStart.setHours(0, 0, 0, 0);
      const cellEnd = new Date(cellDate);
      cellEnd.setHours(23, 59, 59, 999);

      return bStart <= cellEnd && bEnd >= cellStart;
    });
  };

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading reservation calendar...</div>;
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="page-container">
      
      {/* HEADER CONTROL & NEW BOOKING */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="flex align-center" style={{ gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => navigateMonth(-1)}>◀ Prev</button>
            <h2 style={{ minWidth: '180px', textAlign: 'center' }}>{monthNames[month]} {year}</h2>
            <button className="btn btn-secondary" onClick={() => navigateMonth(1)}>Next ▶</button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            📅 Book Resource
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', alignItems: 'start', flexWrap: 'wrap' }}>
        
        {/* CALENDAR SCHEDULER VIEW */}
        <div className="card" style={{ padding: '16px' }}>
          <div className="calendar-grid">
            {weekdays.map(day => (
              <div key={day} className="calendar-header-cell">{day}</div>
            ))}
            
            {calendarCells.map((cell, idx) => {
              const cellBookings = getBookingsForDay(cell.date);
              const isOtherMonth = cell.month !== 'current';
              const isToday = cell.date.toDateString() === new Date().toDateString();

              return (
                <div 
                  key={idx} 
                  className={`calendar-day-cell ${isOtherMonth ? 'other-month' : ''}`}
                  style={{ border: isToday ? '2px solid var(--primary)' : 'none' }}
                >
                  <span className="calendar-day-number" style={{ color: isToday ? 'var(--primary)' : 'inherit' }}>
                    {cell.day} {isToday && '(Today)'}
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    {cellBookings.slice(0, 3).map(bk => (
                      <div 
                        key={bk.id} 
                        className="calendar-event"
                        title={`${bk.title} (${bk.startTime.substring(11, 16)} - ${bk.endTime.substring(11, 16)})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(bk);
                        }}
                      >
                        {bk.title}
                      </div>
                    ))}
                    {cellBookings.length > 3 && (
                      <div className="text-muted" style={{ fontSize: '9px', fontWeight: 600, paddingLeft: '4px' }}>
                        + {cellBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOOKINGS LIST VIEW */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3>Reservations Ledger</h3>
          <div className="flex flex-col" style={{ gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            {bookings.length === 0 ? (
              <p className="text-muted" style={{ textAlign: 'center', padding: '16px' }}>No bookings found.</p>
            ) : (
              bookings.map(bk => {
                const ast = assets.find(a => a.id === bk.assetId) || { tag: 'AST', name: 'Asset' };
                const userObj = users.find(u => u.id === bk.userId) || { name: 'User' };
                const isCancelled = bk.status === 'Cancelled';
                
                return (
                  <div 
                    key={bk.id} 
                    style={{ 
                      padding: '12px', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)', 
                      opacity: isCancelled ? 0.6 : 1,
                      backgroundColor: isCancelled ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                      cursor: 'pointer' 
                    }}
                    onClick={() => {
                      if (!isCancelled) openEditModal(bk);
                    }}
                  >
                    <div className="flex justify-between align-center" style={{ marginBottom: '6px' }}>
                      <span className={`badge ${isCancelled ? 'badge-lost' : 'badge-allocated'}`} style={{ fontSize: '9px' }}>
                        {bk.status}
                      </span>
                      <span className="text-muted">{new Date(bk.startTime).toLocaleDateString()}</span>
                    </div>
                    <h4 style={{ fontSize: '13px' }}>{bk.title}</h4>
                    <p style={{ fontSize: '11px', marginTop: '4px' }}>
                      Device: <strong>{ast.name}</strong> ({ast.tag})
                    </p>
                    <p style={{ fontSize: '11px', marginTop: '2px' }}>
                      Booked by: {userObj.name}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SCHEDULE NEW BOOKING MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📅 Book a Corporate Resource / Asset</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateBooking}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '13px' }}>
                    ⚠️ {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="booking-asset">Resource / Asset to Book</label>
                  <select
                    id="booking-asset"
                    className="form-control"
                    value={assetId}
                    onChange={e => setAssetId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Asset --</option>
                    {assets.filter(a => ['Available', 'Reserved', 'Allocated'].includes(a.status)).map(a => (
                      <option key={a.id} value={a.id}>{a.name} [{a.tag}] ({a.status})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="booking-purpose">Booking Purpose</label>
                  <input
                    id="booking-purpose"
                    type="text"
                    className="form-control"
                    placeholder="Project Presentation, Offsite audit, etc."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="booking-start">Start Time</label>
                    <input
                      id="booking-start"
                      type="datetime-local"
                      className="form-control"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="booking-end">End Time</label>
                    <input
                      id="booking-end"
                      type="datetime-local"
                      className="form-control"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Overlap & Reminder notification settings */}
                <div style={{ marginTop: '16px', display: 'flex', alignItem: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="send-reminder-checkbox" 
                    checked={reminder}
                    onChange={e => setReminder(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="send-reminder-checkbox" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                    🔔 Email me a reminder alert 15 mins before starting
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Scheduling...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / DETAILS / CANCEL BOOKING MODAL */}
      {showEditModal && selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📅 Modify Reservation</h2>
              <button className="modal-close" onClick={() => {
                setShowEditModal(false);
                setSelectedBooking(null);
              }}>×</button>
            </div>
            
            <form onSubmit={handleUpdateBooking}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '13px' }}>
                    ⚠️ {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Booked Asset</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    disabled 
                    value={assets.find(a => a.id === selectedBooking.assetId)?.name || ''} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-booking-purpose">Booking Purpose</label>
                  <input
                    id="edit-booking-purpose"
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-booking-start">Start Time</label>
                    <input
                      id="edit-booking-start"
                      type="datetime-local"
                      className="form-control"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-booking-end">End Time</label>
                    <input
                      id="edit-booking-end"
                      type="datetime-local"
                      className="form-control"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={() => handleCancelBooking(selectedBooking.id)}
                >
                  🚫 Cancel Reservation
                </button>
                <div className="flex" style={{ gap: '8px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowEditModal(false);
                    setSelectedBooking(null);
                  }}>Close</button>
                  <button type="submit" className="btn btn-primary" disabled={formLoading}>
                    {formLoading ? 'Rescheduling...' : 'Save Reschedule'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
