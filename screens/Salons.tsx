
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Salon, User, UserRole } from '../types';
import QRCode from 'react-qr-code';
import { supabase } from '../services/supabaseClient';

const SalonsScreen = () => {
  const { user, setSalon, salons: globalSalons, refreshData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Partial<Salon> | null>(null);
  const [showBookingTools, setShowBookingTools] = useState<Salon | null>(null);
  const [staffManagementSalon, setStaffManagementSalon] = useState<Salon | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const isOwner = user?.role === UserRole.OWNER;

  useEffect(() => {
    refreshData();
    // The staff data is still loaded locally as refreshData only handles salons
    loadStaffData();
  }, [user]);

  // On utilisera globalSalons au lieu du state local 'salons'
  const salons = globalSalons;

  const loadStaffData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Charger tout le personnel (profiles + staff)
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('owner_id', user.id);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .or(`owner_id.eq.${user.id},id.eq.${user.id}`);

      const unified: User[] = [];

      if (profilesData) {
        profilesData.forEach(p => unified.push({
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role as UserRole,
          salons: p.salons || [],
          ownerId: p.owner_id,
          isBookable: true,
          canViewOwnSchedule: true,
          status: 'ACTIVE'
        }));
      }

      if (staffData) {
        staffData.forEach(s => {
          // Éviter les doublons si déjà dans profiles (devrait pas arriver si bien géré)
          if (!unified.find(u => u.id === s.auth_id || (u.email === s.email && u.status === 'ACTIVE'))) {
            unified.push({
              id: s.id,
              email: s.email,
              name: s.name,
              role: s.role as UserRole,
              salons: s.salons || [],
              ownerId: s.owner_id,
              isBookable: s.is_bookable,
              canViewOwnSchedule: s.can_view_own_schedule,
              status: s.status
            });
          }
        });
      }

      setAllUsers(unified);
    } catch (err) {
      console.error("Error loading staff data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isOwner) return;
    if (!editingSalon?.name || !editingSalon?.address) return;
    setLoading(true);
    try {
      if (editingSalon.id) {
        const { error } = await supabase
          .from('salons')
          .update({
            name: editingSalon.name,
            address: editingSalon.address,
            totalWorkstations: editingSalon.totalWorkstations,
            bookingWorkstations: editingSalon.bookingWorkstations
          })
          .eq('id', editingSalon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salons')
          .insert([{
            owner_id: user!.id,
            name: editingSalon.name,
            address: editingSalon.address,
            totalWorkstations: editingSalon.totalWorkstations || 5,
            bookingWorkstations: editingSalon.bookingWorkstations || 1
          }]);
        if (error) throw error;
      }
      await refreshData();
      setEditingSalon(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!isOwner) return;
    const salonName = salons.find(s => s.id === id)?.name;
    if (window.confirm(`ALERTE CRITIQUE : Fermer définitivement "${salonName}" ? Cette action est irréversible.`)) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('salons')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await refreshData();
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleUserSalonAssignment = async (targetUser: User, salonId: string) => {
    const isAssigned = targetUser.salons.includes(salonId);
    let newSalons = [...targetUser.salons];

    if (isAssigned) {
      newSalons = newSalons.filter(id => id !== salonId);
    } else {
      newSalons.push(salonId);
    }

    setLoading(true);
    try {
      // Déterminer quelle table mettre à jour (profiles ou staff)
      const isRealUser = targetUser.status === 'ACTIVE'; // Si ACTIVE, c'est dans profiles
      const table = isRealUser ? 'profiles' : 'staff';

      const { error } = await supabase
        .from(table)
        .update({ salons: newSalons })
        .eq('id', targetUser.id);

      if (error) throw error;
      await loadStaffData(); // Refresh staff data after assignment change
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 space-y-8 animate-in slide-in-from-left duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mb-1">Architecture du Parc</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Gestion des Succursales</h1>
        </div>
        {isOwner && (
          <button
            onClick={() => setEditingSalon({ name: '', address: '' })}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3} /></svg>
            Ouvrir un Salon
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {salons.map(s => {
          const salonStaff = allUsers.filter(u => u.salons.includes(s.id));
          const salonStaffCount = salonStaff.length;

          return (
            <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between h-full">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" strokeWidth={2} /></svg>
                  </div>
                  <button
                    onClick={() => setStaffManagementSalon(s)}
                    className="text-right hover:scale-105 transition-transform"
                  >
                    <div className="text-2xl font-black text-slate-900 leading-none">{salonStaffCount}</div>
                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Gérer l'équipe</div>
                  </button>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">{s.name}</h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[3rem]">{s.address}</p>

                <div className="space-y-2 mb-6">
                  <button
                    onClick={() => setShowBookingTools(s)}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 hover:bg-emerald-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h3m-3 0h-3m3 3h3m0 0v3m0-3h3" strokeWidth={2.5} /></svg>
                    Partager Réservations
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                {isOwner && (
                  <button
                    onClick={() => setEditingSalon(s)}
                    className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100"
                  >
                    Modifier
                  </button>
                )}
                {!isOwner && (
                  <div className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center">
                    Lecture seule
                  </div>
                )}
                {isOwner && (
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-4 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all border border-rose-100 shadow-sm shadow-rose-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" strokeWidth={2.5} /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {staffManagementSalon && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[130] p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl space-y-8 animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="text-center space-y-2 shrink-0">
              <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Gestion Effectifs</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{staffManagementSalon.name}</p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 py-4">
              {allUsers.map(targetUser => {
                const isAssigned = targetUser.salons.includes(staffManagementSalon.id);
                return (
                  <button
                    key={targetUser.id}
                    onClick={() => toggleUserSalonAssignment(targetUser, staffManagementSalon.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isAssigned ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isAssigned ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {targetUser.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="font-black text-xs uppercase">{targetUser.name}</div>
                        <div className={`text-[8px] font-bold uppercase tracking-widest ${isAssigned ? 'text-white/60' : 'text-slate-400'}`}>{targetUser.role}</div>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isAssigned ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-200'}`}>
                      {isAssigned && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={4} /></svg>}
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setStaffManagementSalon(null)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] transition-colors shadow-xl shrink-0">Terminer la gestion</button>
          </div>
        </div>
      )}

      {showBookingTools && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full text-center space-y-8 animate-in zoom-in duration-300">
            <div className="space-y-2">
              <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">{showBookingTools.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outils de Croissance & RDV</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 flex items-center justify-center shadow-inner">
              <QRCode
                value={`${window.location.origin}/#/book/${showBookingTools.id}`}
                size={180}
                fgColor="#1e293b"
                level="H"
              />
            </div>

            <div className="space-y-3">
              <div className="text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Lien de réservation directe</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-100 px-4 py-3 rounded-xl text-[10px] font-bold text-slate-500 truncate border border-slate-200">
                    {window.location.origin}/#/book/{showBookingTools.id}
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/#/book/${showBookingTools.id}`)}
                    className={`px-4 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${copyFeedback ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-900 text-white hover:bg-black'}`}
                  >
                    {copyFeedback ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed font-medium">Imprimez le QR code ou partagez ce lien sur vos réseaux sociaux pour capturer vos clients 24h/24.</p>
            </div>

            <button onClick={() => setShowBookingTools(null)} className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[11px] transition-colors">Fermer</button>
          </div>
        </div>
      )}

      {isOwner && editingSalon && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-end md:items-center justify-center z-[100] p-0 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8 animate-in slide-in-from-bottom">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
              {editingSalon.id ? 'Modifier Salon' : 'Nouvelle Ouverture'}
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Enseigne commerciale</label>
                <input
                  type="text"
                  value={editingSalon.name}
                  onChange={(e) => setEditingSalon({ ...editingSalon, name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Adresse physique</label>
                <input
                  type="text"
                  value={editingSalon.address}
                  onChange={(e) => setEditingSalon({ ...editingSalon, address: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Total Postes</label>
                  <input
                    type="number"
                    value={editingSalon.totalWorkstations || 5}
                    onChange={(e) => setEditingSalon({ ...editingSalon, totalWorkstations: parseInt(e.target.value) })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 ml-1">Postes Réservables</label>
                  <input
                    type="number"
                    value={editingSalon.bookingWorkstations || 1}
                    onChange={(e) => setEditingSalon({ ...editingSalon, bookingWorkstations: parseInt(e.target.value) })}
                    className="w-full px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-lg font-bold text-indigo-600 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                disabled={!editingSalon.name || !editingSalon.address}
                onClick={handleSave}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-30"
              >
                Valider l'implantation
              </button>
              <button onClick={() => setEditingSalon(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase tracking-widest text-[10px]">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonsScreen;
