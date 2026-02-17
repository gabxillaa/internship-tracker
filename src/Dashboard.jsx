import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { format, addDays, isWeekend, parse } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash, faCircleXmark, faClipboardList } from '@fortawesome/free-solid-svg-icons';

// --- MODULAR MODAL COMPONENT ---
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-pink-200/40 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      <div className={`relative bg-white/90 backdrop-blur-xl border-4 border-white rounded-[40px] shadow-2xl w-full ${maxWidth} overflow-hidden animate-zoom-in`}>
        <div className="bg-pink-100/50 p-6 text-center relative border-b border-pink-50">
          <button onClick={onClose} className="cursor-pointer absolute top-4 right-4 text-pink-300 hover:text-pink-500 transition-colors">
            <FontAwesomeIcon icon={faCircleXmark} size="lg" />
          </button>
          <div className="text-4xl mb-2">✨</div>
          <h2 className="font-display font-black text-2xl text-pink-500 uppercase tracking-tight">{title}</h2>
        </div>
        <div className="p-8 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

function Dashboard({ user, onLogout }) {
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [error, setError] = useState('');
  
  // Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [editData, setEditData] = useState({ date: '', startTime: '', endTime: '', netHours: 0 });

  // DTR States
  const DEFAULT_COMPANY = 'Inspire Holdings Inc.';
  const DTR_FALLBACK_TIME = '09:30';
  const [isDtrOpen, setIsDtrOpen] = useState(false);
  const [dtrShiftId, setDtrShiftId] = useState(null);
  const [dtrEntries, setDtrEntries] = useState([]);
  const [dtrEditingId, setDtrEditingId] = useState(null);
  const [dtrForm, setDtrForm] = useState({ company: DEFAULT_COMPANY, time: DTR_FALLBACK_TIME, description: '' });
  const [dtrLoading, setDtrLoading] = useState(false);
  const [isDtrDeleteOpen, setIsDtrDeleteOpen] = useState(false);
  const [dtrDeleteId, setDtrDeleteId] = useState(null);

  const GOAL_HOURS = 486;
  const DEADLINE = new Date('2026-05-22');

  // 1. Fetch Data
  useEffect(() => {
    const q = query(collection(db, "shifts"), where("userId", "==", user.uid), orderBy("startTime", "desc"));
    return onSnapshot(q, (snapshot) => {
      const shiftData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShifts(shiftData);
      setActiveShift(shiftData.find(s => !s.endTime));
    }, () => setError('Failed to load shifts.'));
  }, [user.uid]);

  useEffect(() => {
    if (!isDtrOpen || !dtrShiftId) return undefined;
    setDtrLoading(true);
    const q = query(
      collection(db, "shifts", dtrShiftId, "dtrEntries"),
      orderBy("time", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDtrEntries(entries);
      setDtrLoading(false);
    }, () => {
      setError('Failed to load DTR entries.');
      setDtrLoading(false);
    });
    return unsub;
  }, [isDtrOpen, dtrShiftId]);

  // 2. Calculations for Top Cards
  const totalRendered = shifts.reduce((acc, s) => acc + (s.netHours || 0), 0);
  const hoursLeft = Math.max(GOAL_HOURS - totalRendered, 0);
  
  const estimateFinishDate = () => {
    if (hoursLeft <= 0) return "Finished! 🎉";
    let daysNeeded = Math.ceil(hoursLeft / 8); 
    let date = new Date();
    while (daysNeeded > 0) {
      date = addDays(date, 1);
      if (!isWeekend(date)) daysNeeded--;
    }
    return format(date, 'MMM dd, yyyy');
  };

  // 3. Handlers
  const handleClockToggle = async () => {
    try {
      if (!activeShift) {
        await addDoc(collection(db, "shifts"), {
          userId: user.uid,
          startTime: serverTimestamp(),
          date: format(new Date(), 'yyyy-MM-dd'),
        });
      } else {
        const end = new Date();
        const start = activeShift.startTime.toDate();
        const rawHours = (end - start) / (1000 * 60 * 60);
        const netHours = Math.max(parseFloat(rawHours.toFixed(2)) - 1, 0); 
        await updateDoc(doc(db, "shifts", activeShift.id), {
          endTime: serverTimestamp(),
          netHours: netHours
        });
      }
    } catch (err) { setError('Clock action failed.'); }
  };

  const handleEditClick = (shift) => {
    setSelectedShiftId(shift.id);
    setEditData({
      date: shift.date,
      startTime: shift.startTime ? format(shift.startTime.toDate(), 'HH:mm') : '',
      endTime: shift.endTime ? format(shift.endTime.toDate(), 'HH:mm') : '',
      netHours: shift.netHours || 0
    });
    setIsEditOpen(true);
  };

  const handleOpenDtr = (shift) => {
    setDtrShiftId(shift.id);
    setDtrEditingId(null);
    const startTime = shift.startTime ? format(shift.startTime.toDate(), 'HH:mm') : DTR_FALLBACK_TIME;
    setDtrForm({ company: DEFAULT_COMPANY, time: startTime, description: '' });
    setIsDtrOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const combine = (d, t) => Timestamp.fromDate(parse(`${d} ${t}`, 'yyyy-MM-dd HH:mm', new Date()));
      await updateDoc(doc(db, "shifts", selectedShiftId), {
        date: editData.date,
        startTime: combine(editData.date, editData.startTime),
        endTime: editData.endTime ? combine(editData.date, editData.endTime) : null,
        netHours: parseFloat(editData.netHours)
      });
      setIsEditOpen(false);
    } catch (err) { setError("Update failed."); }
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "shifts", selectedShiftId));
      setIsDeleteOpen(false);
    } catch (err) { setError("Delete failed."); }
  };

  const handleSaveDtr = async () => {
    if (!dtrShiftId) return;
    if (!dtrEditingId && dtrEndTime && dtrEntries.some((entry) => entry.time === dtrEndTime)) {
      setError('DTR is complete for the day.');
      return;
    }
    if (!dtrForm.time) {
      setError('Please choose a time.');
      return;
    }
    if (!dtrForm.description.trim()) {
      setError('Please add a description for the hour.');
      return;
    }

    const payload = {
      company: dtrForm.company.trim() || DEFAULT_COMPANY,
      time: dtrForm.time,
      description: dtrForm.description.trim(),
      updatedAt: serverTimestamp()
    };

    try {
      if (dtrEditingId) {
        await updateDoc(doc(db, "shifts", dtrShiftId, "dtrEntries", dtrEditingId), payload);
      } else {
        await addDoc(collection(db, "shifts", dtrShiftId, "dtrEntries"), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setDtrEditingId(null);
      setDtrForm({ company: DEFAULT_COMPANY, time: DTR_FALLBACK_TIME, description: '' });
    } catch (err) { setError('Failed to save DTR entry.'); }
  };

  const handleEditDtr = (entry) => {
    setDtrEditingId(entry.id);
    setDtrForm({
      company: entry.company || DEFAULT_COMPANY,
      time: entry.time || DTR_FALLBACK_TIME,
      description: entry.description || ''
    });
  };

  const handleDeleteDtr = (entryId) => {
    setDtrDeleteId(entryId);
    setIsDtrDeleteOpen(true);
  };

  const confirmDeleteDtr = async () => {
    if (!dtrShiftId || !dtrDeleteId) return;
    try {
      await deleteDoc(doc(db, "shifts", dtrShiftId, "dtrEntries", dtrDeleteId));
      setIsDtrDeleteOpen(false);
      setDtrDeleteId(null);
    } catch (err) { setError('Failed to delete DTR entry.'); }
  };

  const shiftStartTime = dtrShiftId
    ? shifts.find((shift) => shift.id === dtrShiftId)?.startTime
    : null;
  const shiftEndTime = dtrShiftId
    ? shifts.find((shift) => shift.id === dtrShiftId)?.endTime
    : null;
  const dtrEndTime = shiftEndTime ? format(shiftEndTime.toDate(), 'HH:mm') : null;
  const isDtrLocked = dtrEndTime ? dtrEntries.some((entry) => entry.time === dtrEndTime) : false;
  const lastDtrTime = dtrEntries.length > 0
    ? dtrEntries[dtrEntries.length - 1].time
    : (shiftStartTime ? format(shiftStartTime.toDate(), 'HH:mm') : DTR_FALLBACK_TIME);

  useEffect(() => {
    if (!isDtrOpen || dtrEditingId) return;
    setDtrForm((prev) => ({ ...prev, time: lastDtrTime || DTR_FALLBACK_TIME }));
  }, [isDtrOpen, dtrEditingId, lastDtrTime]);

  return (
    <div className="min-h-screen bg-[#FFF5F7] p-4 font-sans pb-20">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display font-black text-3xl text-pink-500 tracking-tight">Bunny Portal 🥕</h1>
            <p className="text-pink-400 font-reader font-bold">Welcome, {user?.displayName || 'Intern'}</p>
          </div>
          <button onClick={onLogout} title="Log out" className="text-pink-300 hover:text-pink-500 underline text-sm font-bold cursor-pointer font-reader transition-colors">Log out</button>
        </div>

        {/* --- STATS CARDS (RESTORED) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-[30px] shadow-sm border-2 border-pink-100 text-center transform hover:scale-105 transition-transform">
            <p className="font-reader text-xs uppercase tracking-widest text-pink-300 font-bold mb-2">Rendered</p>
            <h2 className="font-display text-4xl font-black text-pink-500">{totalRendered.toFixed(1)}<span className="text-lg">h</span></h2>
            <p className="font-reader text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Goal: {GOAL_HOURS}h</p>
          </div>

          <div className="bg-white p-6 rounded-[30px] shadow-sm border-2 border-yellow-100 text-center transform hover:scale-105 transition-transform">
            <p className="font-reader text-xs uppercase tracking-widest text-yellow-500 font-bold mb-2">Hours Left</p>
            <h2 className="font-display text-4xl font-black text-yellow-500">{hoursLeft.toFixed(1)}<span className="text-lg">h</span></h2>
          </div>

          <div className="bg-white p-6 rounded-[30px] shadow-sm border-2 border-purple-100 text-center transform hover:scale-105 transition-transform">
            <p className="font-reader text-xs uppercase tracking-widest text-purple-400 font-bold mb-2">Est. Finish</p>
            <h2 className={`font-display text-2xl font-black ${new Date(estimateFinishDate()) > DEADLINE ? 'text-red-400' : 'text-purple-500'}`}>
              {estimateFinishDate()}
            </h2>
            <p className="font-reader text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Deadline: May 22</p>
          </div>
        </div>

        {/* Clock Action */}
        <div className="text-center mb-12">
          <button 
            onClick={handleClockToggle}
            title={activeShift ? 'Clock out' : 'Clock in'}
            className={`font-display px-12 py-5 rounded-full font-black text-2xl text-white shadow-lg transition-all active:scale-95 cursor-pointer transform hover:-translate-y-1 ${activeShift ? 'bg-orange-400 hover:bg-orange-500' : 'bg-pink-500 hover:bg-pink-600'}`}
          >
            {activeShift ? 'Clock Out' : 'Clock In'}
          </button>
          {error && <p className="mt-4 text-red-500 font-bold text-sm bg-red-50 py-2 px-4 rounded-xl inline-block">{error}</p>}
          {activeShift && <p className="font-reader mt-4 text-orange-400 animate-pulse font-bold text-sm tracking-wide">You are currently on the clock! ⏳</p>}
        </div>

        {/* History Table */}
        <div className="bg-white/70 backdrop-blur-md rounded-[40px] border-4 border-white shadow-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left font-sans min-w-[500px]">
            <thead className="font-display bg-pink-100/50 text-pink-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">In / Out</th>
                <th className="px-6 py-5">Net (-1h)</th>
                <th className="px-6 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="font-reader divide-y divide-pink-50">
              {shifts.map((shift) => (
                <tr key={shift.id} className="group hover:bg-white/80 transition-colors">
                  <td
                    className="px-6 py-4 text-gray-600 font-bold cursor-pointer"
                    onClick={() => handleEditClick(shift)}
                    title="Edit shift"
                  >
                    {shift.date}
                  </td>
                  <td
                    className="px-6 py-4 text-gray-400 text-xs font-semibold cursor-pointer"
                    onClick={() => handleEditClick(shift)}
                    title="Edit shift"
                  >
                    {shift.startTime ? format(shift.startTime.toDate(), 'hh:mm a') : '--:--'} → {shift.endTime ? format(shift.endTime.toDate(), 'hh:mm a') : '...'}
                  </td>
                  <td className="px-6 py-4">
                     <span
                       className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-bold text-sm border border-pink-100 cursor-pointer"
                       onClick={() => handleEditClick(shift)}
                       title="Edit shift"
                     >
                        {shift.netHours ? `${shift.netHours}h` : '-'}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => handleEditClick(shift)} title="Edit shift" className="w-8 h-8 rounded-full bg-blue-50 text-blue-400 hover:bg-blue-500 hover:text-white transition-all cursor-pointer flex items-center justify-center">
                        <FontAwesomeIcon icon={faPen} size="xs" />
                      </button>
                      <button onClick={() => { setSelectedShiftId(shift.id); setIsDeleteOpen(true); }} title="Delete shift" className="w-8 h-8 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer flex items-center justify-center">
                        <FontAwesomeIcon icon={faTrash} size="xs" />
                      </button>
                      <button onClick={() => handleOpenDtr(shift)} title="View DTR" className="w-8 h-8 rounded-full bg-purple-50 text-purple-400 hover:bg-purple-500 hover:text-white transition-all cursor-pointer flex items-center justify-center">
                        <FontAwesomeIcon icon={faClipboardList} size="xs" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- EDIT MODAL --- */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Time Log">
        <div className="space-y-4 font-reader text-gray-600">
          <div>
            <label className="text-xs font-bold text-pink-400 uppercase ml-2">Date</label>
            <input type="date" value={editData.date} onChange={(e) => setEditData({...editData, date: e.target.value})} className="w-full mt-1 p-3 rounded-2xl border-2 border-pink-50 outline-none focus:border-pink-200" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-pink-400 uppercase ml-2">In</label>
              <input type="time" value={editData.startTime} onChange={(e) => setEditData({...editData, startTime: e.target.value})} className="w-full mt-1 p-3 rounded-2xl border-2 border-pink-50 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-pink-400 uppercase ml-2">Out</label>
              <input type="time" value={editData.endTime} onChange={(e) => setEditData({...editData, endTime: e.target.value})} className="w-full mt-1 p-3 rounded-2xl border-2 border-pink-50 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-pink-400 uppercase ml-2">Net Hours</label>
            <input type="number" step="0.1" value={editData.netHours} onChange={(e) => setEditData({...editData, netHours: e.target.value})} className="w-full mt-1 p-3 rounded-2xl border-2 border-pink-50 bg-pink-50/30 font-bold text-pink-600" />
          </div>
          <button onClick={handleSaveEdit} className="cursor-pointer w-full py-4 bg-pink-500 text-white rounded-2xl font-display font-black text-xl shadow-lg hover:bg-pink-600 transition-all active:scale-95">Update Magic ✨</button>
        </div>
      </Modal>

      {/* --- DELETE MODAL --- */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Oh No! Delete?">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐰🚫</div>
          <p className="font-reader text-gray-500 mb-8 px-4">Are you sure you want to erase this memory? This action cannot be undone!</p>
          <div className="flex gap-4">
            <button onClick={() => setIsDeleteOpen(false)} className="cursor-pointer flex-1 py-3 rounded-2xl border-2 border-gray-100 text-gray-400 font-display font-bold hover:bg-gray-50 hover:text-gray-500 transition-colors">Keep it</button>
            <button onClick={confirmDelete} className="cursor-pointer flex-1 py-3 rounded-2xl bg-red-400 text-white font-display font-bold hover:bg-red-500 shadow-lg shadow-red-100 transition-colors">Delete 🥕</button>
          </div>
        </div>
      </Modal>

      {/* --- DTR MODAL --- */}
      <Modal isOpen={isDtrOpen} onClose={() => setIsDtrOpen(false)} title="Daily Time Report" maxWidth="max-w-2xl">
        <div className="space-y-6 font-reader text-gray-600">
          {(dtrEditingId || !isDtrLocked) && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-pink-400 uppercase ml-2">Company</label>
                  <input
                    type="text"
                    value={dtrForm.company}
                    onChange={(e) => setDtrForm({ ...dtrForm, company: e.target.value })}
                    className="w-full mt-1 p-3 rounded-2xl border-2 border-pink-50 outline-none focus:border-pink-200"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-pink-400 uppercase ml-2">Time</label>
                  <input
                    type="time"
                    value={dtrForm.time}
                    onChange={(e) => setDtrForm({ ...dtrForm, time: e.target.value })}
                    className="w-full mt-1 p-3 rounded-2xl border-2 border-pink-50 outline-none focus:border-pink-200"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={handleSaveDtr}
                    className="cursor-pointer w-full py-3 bg-pink-500 text-white rounded-2xl font-display font-black shadow-lg hover:bg-pink-600 transition-all active:scale-95"
                  >
                    {dtrEditingId ? 'Update Entry' : 'Add Entry'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-pink-400 uppercase ml-2">Description</label>
                <textarea
                  rows="3"
                  value={dtrForm.description}
                  onChange={(e) => setDtrForm({ ...dtrForm, description: e.target.value })}
                  className="w-full mt-1 p-3 rounded-2xl border-2 border-pink-50 outline-none focus:border-pink-200"
                  placeholder="What did you do during this hour?"
                />
              </div>
            </>
          )}

          {isDtrLocked && !dtrEditingId && (
            <p className="text-xs font-bold text-red-400 bg-red-50 px-3 py-2 rounded-2xl">
              DTR is complete after clock-out. You can still edit existing entries.
            </p>
          )}

          <div className="bg-white/70 rounded-3xl border-2 border-pink-50 p-4 space-y-3">
            {dtrLoading && <p className="text-sm text-gray-400">Loading entries...</p>}
            {!dtrLoading && dtrEntries.length === 0 && (
              <p className="text-sm text-gray-400">No DTR entries yet. Add your first hour above.</p>
            )}
            {dtrEntries.map((entry) => (
              <div key={entry.id} className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 bg-pink-50/40 rounded-2xl p-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase text-pink-500 bg-white px-2 py-1 rounded-full">{entry.time}</span>
                    <span className="text-xs font-semibold text-gray-500">{entry.company || DEFAULT_COMPANY}</span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{entry.description}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditDtr(entry)} title="Edit entry" className="px-3 py-2 rounded-xl bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all text-xs font-bold">Edit</button>
                  <button onClick={() => handleDeleteDtr(entry.id)} title="Delete entry" className="px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-bold">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* --- DTR DELETE MODAL --- */}
      <Modal isOpen={isDtrDeleteOpen} onClose={() => setIsDtrDeleteOpen(false)} title="Delete DTR Entry?">
        <div className="text-center">
          <div className="text-6xl mb-4">🗑️</div>
          <p className="font-reader text-gray-500 mb-8 px-4">Are you sure you want to delete this DTR entry? This action cannot be undone.</p>
          <div className="flex gap-4">
            <button onClick={() => setIsDtrDeleteOpen(false)} className="cursor-pointer flex-1 py-3 rounded-2xl border-2 border-gray-100 text-gray-400 font-display font-bold hover:bg-gray-50 hover:text-gray-500 transition-colors">Cancel</button>
            <button onClick={confirmDeleteDtr} className="cursor-pointer flex-1 py-3 rounded-2xl bg-red-400 text-white font-display font-bold hover:bg-red-500 shadow-lg shadow-red-100 transition-colors">Delete</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default Dashboard;