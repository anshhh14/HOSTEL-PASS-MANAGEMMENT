import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Shell from '../components/Shell';
import { StatusPill, RequestsTable, LogsTable } from '../components/Shared';
import { useToast } from '../components/Toast';

const NAV = [['home', 'Overview'], ['users', 'Manage Users'], ['logs', 'All Logs'], ['history', 'All Requests']];

export default function AdminDashboard() {
  const { token } = useAuth();
  const toast = useToast();
  const [view, setView] = useState('home');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [logs, setLogs] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', role: 'student', roomNumber: '' });
  const [roomForm, setRoomForm] = useState({ roomNumber: '', capacity: 2 });
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const [s, u, r, l, req] = await Promise.all([
      api.adminStats(token),
      api.adminListUsers(token),
      api.adminListRooms(token),
      api.logs(token),
      api.allRequests(token),
    ]);
    setStats(s);
    setUsers(u.users);
    setRooms(r.rooms);
    setLogs(l.logs);
    setAllRequests(req.requests);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  async function createStaff(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.adminCreateStaff(token, staffForm);
      toast(`${staffForm.role} account created`);
      setStaffForm({ name: '', email: '', password: '', role: 'student', roomNumber: '' });
      await refresh();
    } catch (err) {
      toast(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function createRoom(e) {
    e.preventDefault();
    try {
      await api.adminCreateRoom(token, roomForm);
      toast('Room added');
      setRoomForm({ roomNumber: '', capacity: 2 });
      await refresh();
    } catch (err) {
      toast(err.message);
    }
  }

  async function toggleActive(u) {
    try {
      await api.adminSetUserActive(token, u.id, !u.is_active);
      await refresh();
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <Shell nav={NAV} active={view} onNavigate={setView}>
      {view === 'home' && stats && (
        <>
          <div className="page-head"><div><h1 className="page-title hp-display">Overview</h1><p className="page-desc">System-wide snapshot</p></div></div>
          <div className="stat-grid">
            <div className="stat-box"><div className="stat-num">{stats.totalStudents}</div><div className="stat-label">Students</div></div>
            <div className="stat-box" style={{ borderColor: 'var(--sage)' }}><div className="stat-num">{stats.insideCount}</div><div className="stat-label">Inside Now</div></div>
            <div className="stat-box" style={{ borderColor: 'var(--brass)' }}><div className="stat-num">{stats.pendingRequests}</div><div className="stat-label">Pending Requests</div></div>
            <div className="stat-box"><div className="stat-num">{stats.totalLogs}</div><div className="stat-label">Total Gate Events</div></div>
          </div>
          <div className="card">
            <p className="card-title">Recent Requests</p>
            <RequestsTable list={allRequests.slice(0, 6)} showStudent />
          </div>
        </>
      )}

      {view === 'users' && (
        <>
          <div className="page-head"><div><h1 className="page-title hp-display">Manage Users</h1><p className="page-desc">{users.length} registered accounts</p></div></div>

          <div className="card" style={{ maxWidth: 560 }}>
            <p className="card-title">Create Staff Account</p>
            <form onSubmit={createStaff}>
              <div className="form-row">
                <div className="field"><label>Name</label><input required value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} /></div>
                <div className="field"><label>Role</label>
                  <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}>
                    <option value="student">Student</option>
                    <option value="guard">Guard</option>
                    <option value="warden">Warden</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field"><label>Email</label><input type="email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} /></div>
                <div className="field"><label>Temporary password</label><input type="password" required minLength={8} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} /></div>
              </div>
              {staffForm.role === 'student' && (
                <div className="form-row">
                  <div className="field"><label>Room number</label><input value={staffForm.roomNumber} onChange={(e) => setStaffForm({ ...staffForm, roomNumber: e.target.value })} placeholder="e.g. B-204" /></div>
                </div>
              )}
              <button className="btn btn-brass" disabled={creating}>{creating ? 'Creating…' : 'Create Account'}</button>
            </form>
          </div>

          <div className="card" style={{ maxWidth: 420 }}>
            <p className="card-title">Add Room</p>
            <form onSubmit={createRoom} className="form-row" style={{ alignItems: 'flex-end' }}>
              <div className="field"><label>Room number</label><input required value={roomForm.roomNumber} onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })} /></div>
              <div className="field"><label>Capacity</label><input type="number" min={1} max={20} value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} /></div>
              <button className="btn btn-ghost" style={{ height: 44 }}>Add</button>
            </form>
          </div>

          <div className="card">
            <p className="card-title">All Users</p>
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Room</th><th>Status</th><th>Account</th><th></th></tr></thead>
              <tbody>
                {users.length === 0 ? (
                  <tr className="empty-row"><td colSpan={6}>No users yet</td></tr>
                ) : users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong><div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{u.email}</div></td>
                    <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                    <td>{u.room_number || '—'}</td>
                    <td>{u.role === 'student' ? <StatusPill status={u.status} /> : '—'}</td>
                    <td>{u.is_active ? 'Active' : 'Deactivated'}</td>
                    <td>
                      <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => toggleActive(u)}>
                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <p className="card-title">Rooms</p>
            <table>
              <thead><tr><th>Room</th><th>Capacity</th><th>Occupants</th></tr></thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr className="empty-row"><td colSpan={3}>No rooms yet</td></tr>
                ) : rooms.map((r) => (
                  <tr key={r.id}><td><strong>{r.room_number}</strong></td><td>{r.capacity}</td><td>{r.occupants}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'logs' && (
        <>
          <div className="page-head"><div><h1 className="page-title hp-display">All Logs</h1><p className="page-desc">{logs.length} recorded gate events</p></div></div>
          <div className="card"><LogsTable list={logs} /></div>
        </>
      )}

      {view === 'history' && (
        <>
          <div className="page-head"><div><h1 className="page-title hp-display">All Requests</h1><p className="page-desc">Complete leave request history</p></div></div>
          <div className="card"><RequestsTable list={allRequests} showStudent /></div>
        </>
      )}
    </Shell>
  );
}
