
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Appointment, UserRole, StaffSchedule } from '../types';
import {
  sbGetAppointments,
  sbGetSchedules,
  sbToggleStaffSchedule,
  sbUpdateAppointmentStatus,
} from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

const CalendarScreen = () => {
  const { salon, user } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialView = queryParams.get('view') as 'month' | 'day' | 'list' || 'month';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'month' | 'day' | 'list'>(initialView);
  const [staffFilter, setStaffFilter] = useState<string>(user?.role === UserRole.STAFF ? user.id : 'all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [salonStaff, setSalonStaff] = useState<{ id: string; name: string }[]>([]);

  const isOwner = user?.role === UserRole.OWNER || user?.role === UserRole.MANAGER;
  const isStaff = user?.role === UserRole.STAFF;

  const isTaggedToday = useMemo(() => {
    if (!isStaff) return false;
    return schedules.some(s => s.staffId === user?.id && s.date === selectedDate);
  }, [schedules, user, selectedDate, isStaff]);

  const isSelectedDateToday = selectedDate === new Date().toISOString().split('T')[0];
  const hasAccessToSelectedDate = isOwner ||
    (isStaff && (
      (user?.restrictToCurrentDay ? isSelectedDateToday : true) &&
      (user?.canViewOwnSchedule || isTaggedToday)
    ));

  const loadData = async () => {
    if (!salon) return;
    const [apts, scheds] = await Promise.all([
      sbGetAppointments(salon.id),
      sbGetSchedules(salon.id),
    ]);
    setAppointments(apts);
    setSchedules(scheds);
  };

  useEffect(() => {
    loadData();
  }, [salon]);

  useEffect(() => {
    // Load staff for this salon from supabase
    const loadStaff = async () => {
      if (!salon) return;
      const { data } = await supabase
        .from('staff')
        .select('id, name, salons')
        .contains('salons', [salon.id]);
      // Also include owner from profiles
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id, name')
        .contains('salons', [salon.id]);

      const combined = [
        ...(ownerProfile || []),
        ...(data || []),
      ];
      setSalonStaff(combined);
    };
    loadStaff();
  }, [salon]);

  const handleToggleStaff = async (staffId: string) => {
    if (!isOwner || !salon) return;
    setIsSyncing(true);
    try {
      await sbToggleStaffSchedule(salon.id, staffId, selectedDate);
      await loadData();
    } catch (e: any) {
      console.error('handleToggleStaff error:', e);
      alert(`Erreur lors du changement de planning :\n${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const monthData = useMemo(() => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const iso = d.toISOString().split('T')[0];
      days.push(iso);
    }
    return days;
  }, [selectedDate]);

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    await sbUpdateAppointmentStatus(id, status);
    await loadData();
  };

  const filteredDailyApts = useMemo(() => {
    let filtered = appointments.filter(a => a.startTime.startsWith(selectedDate));
    if (isStaff) {
      filtered = filtered.filter(a => a.staffId === user?.id);
    } else if (staffFilter !== 'all') {
      filtered = filtered.filter(a => a.staffId === staffFilter);
    }
    return filtered;
  }, [appointments, selectedDate, staffFilter, user, isStaff]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-24 md:pb-8">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Planning & Flux Équipe</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            {viewMode === 'month' ? 'Agenda Mensuel' : 'Journal de Bord'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-900 p-1 rounded-2xl shadow-xl">
            <button onClick={() => setViewMode('month')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/40'}`}>Mois</button>
            <button onClick={() => setViewMode('day')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/40'}`}>Jour</button>
          </div>
        </div>
      </header>

      {viewMode === 'month' && (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8 animate-in zoom-in duration-300">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-3">
            {monthData.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/40 rounded-3xl"></div>;
              const isSelected = day === selectedDate;
              const isUserScheduled = isStaff && schedules.some(s => s.staffId === user?.id && s.date === day);

              return (
                <div
                  key={day}
                  onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                  className={`aspect-square p-4 rounded-[2.5rem] border transition-all cursor-pointer relative flex flex-col justify-between group ${isSelected ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105 z-10' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                >
                  <span className={`text-xl font-black tracking-tighter italic ${isSelected ? 'text-white' : 'text-slate-900'}`}>{new Date(day).getDate()}</span>

                  {isUserScheduled && (
                    <div className="absolute top-4 right-4 flex flex-col items-center">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
                      <div className="text-[6px] font-black text-emerald-500 uppercase mt-1 tracking-tighter">En Poste</div>
                    </div>
                  )}

                  {!isStaff && schedules.filter(s => s.date === day).length > 0 && (
                    <div className="flex -space-x-2 overflow-hidden">
                      {schedules.filter(s => s.date === day).slice(0, 3).map(s => (
                        <div key={s.id} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 text-[7px] font-black flex items-center justify-center text-slate-500">
                          {salonStaff.find(u => u.id === s.staffId)?.name?.charAt(0) || '?'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'day' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {!hasAccessToSelectedDate ? (
              <div className="bg-white rounded-[3rem] p-16 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-8 animate-in slide-in-from-bottom duration-500">
                <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 border border-rose-100">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-8H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V9l-4-4z" strokeWidth={2.5} /></svg>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Accès Restreint</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                    Vous n'êtes pas assigné au salon le <span className="text-slate-900">{new Date(selectedDate).toLocaleDateString()}</span>.<br />Le planning reste masqué pour ce jour.
                  </p>
                </div>
                <button onClick={() => setViewMode('month')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Consulter mes jours actifs</button>
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm p-8 space-y-8 min-h-[500px]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-8">
                  <div className="flex items-center gap-6">
                    <div className="text-5xl font-black italic tracking-tighter text-slate-900">{new Date(selectedDate).getDate()}</div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long' })}</span>
                      <span className="text-xl font-black italic uppercase tracking-tighter text-indigo-600">{new Date(selectedDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {isTaggedToday && (
                    <div className="px-5 py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center gap-3 animate-pulse shadow-sm">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Poste Actif</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {filteredDailyApts.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-slate-300 space-y-4">
                      <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={1.5} /></svg>
                      <span className="text-[10px] font-black uppercase italic tracking-widest">Aucun rendez-vous planifié</span>
                    </div>
                  ) : (
                    filteredDailyApts.map(apt => (
                      <div key={apt.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col md:flex-row justify-between items-center group hover:bg-white hover:border-slate-900 transition-all gap-6">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className="w-20 text-center border-r border-slate-200 pr-6">
                            <div className="text-xl font-black italic tracking-tighter text-slate-900">{apt.startTime.split('T')[1]?.substring(0, 5) || '--:--'}</div>
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Heure</div>
                          </div>
                          <div className="flex-1">
                            <div className="text-[9px] font-black uppercase text-indigo-500 mb-0.5 tracking-widest">{apt.serviceName}</div>
                            <div className="text-xl font-black italic tracking-tighter text-slate-900 truncate">{apt.clientName}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Mobile: {apt.clientPhone}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          {apt.status === 'pending' && (
                            <button onClick={() => handleStatusChange(apt.id, 'confirmed')} className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Accepter</button>
                          )}
                          <button onClick={() => handleStatusChange(apt.id, 'cancelled')} className="flex-1 md:flex-none px-6 py-3 bg-white text-rose-500 border border-rose-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all">Décliner</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            {isOwner && (
              <div className="bg-slate-900 rounded-[3rem] p-8 text-white space-y-6 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/40 mb-6">Affectation Équipe</h3>
                  <div className="space-y-3">
                    {salonStaff.map(staffMember => {
                      const isActive = schedules.some(s => s.staffId === staffMember.id && s.date === selectedDate);
                      return (
                        <button
                          key={staffMember.id}
                          disabled={isSyncing}
                          onClick={() => handleToggleStaff(staffMember.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isActive ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isActive ? 'bg-white text-emerald-600' : 'bg-white/10 text-white'}`}>
                              {staffMember.name.charAt(0)}
                            </div>
                            <span className="text-[11px] font-black uppercase truncate max-w-[80px]">{staffMember.name}</span>
                          </div>
                          {isActive ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={4} /></svg>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-white/20"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-6 text-[9px] font-medium text-white/30 leading-relaxed italic">
                    Taguer un coiffeur lui donne accès aux RDV du jour sur son propre planning.
                  </p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
              </div>
            )}

            <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aperçu Journalier</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-slate-300 uppercase">RDV Confirmés</div>
                    <div className="text-3xl font-black italic text-slate-900 leading-none">{filteredDailyApts.filter(a => a.status === 'confirmed').length}</div>
                  </div>
                  <div className="w-10 h-1 bg-emerald-500 rounded-full mb-2"></div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-[8px] font-black text-slate-300 uppercase">En Attente</div>
                    <div className="text-3xl font-black italic text-slate-900 leading-none">{filteredDailyApts.filter(a => a.status === 'pending').length}</div>
                  </div>
                  <div className="w-10 h-1 bg-amber-400 rounded-full mb-2"></div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default CalendarScreen;
