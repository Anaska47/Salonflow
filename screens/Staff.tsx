
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { User, UserRole, Salon, Sale } from '../types';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { mailService } from '../services/mailService';

const StaffScreen = () => {
  const { user: currentUser, refreshData } = useAuth();

  // SÉCURITÉ : Un coiffeur (STAFF) ne peut pas accéder à cette page
  if (currentUser?.role === UserRole.STAFF) {
    return <Navigate to="/" replace />;
  }

  const [users, setUsers] = useState<User[]>([]);
  const [allSalons, setAllSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [filterSalonId, setFilterSalonId] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');

  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  const loadInitialData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Charger les salons de l'organisation
      const { data: salonsData } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', currentUser.id);

      if (salonsData) setAllSalons(salonsData);

      // 2. Charger les profils (staff) de l'organisation depuis la nouvelle table 'staff'
      const { data: staffData } = await supabase
        .from('staff')
        .select('*')
        .eq('owner_id', currentUser.id);

      const { data: profileSelf } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      const staffList = staffData || [];
      const mappedUsers: User[] = staffList.map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        role: s.role as UserRole,
        salons: s.salons || [],
        ownerId: s.owner_id,
        isBookable: s.is_bookable,
        canViewOwnSchedule: s.can_view_own_schedule,
        status: s.status // 'INVITED' or 'ACTIVE'
      }));

      // Ajouter le propriétaire lui-même à la liste
      if (profileSelf) {
        mappedUsers.unshift({
          id: profileSelf.id,
          email: profileSelf.email,
          name: profileSelf.name,
          role: profileSelf.role as UserRole,
          salons: profileSelf.salons || [],
          ownerId: profileSelf.owner_id,
          isBookable: true,
          canViewOwnSchedule: true,
          status: 'ACTIVE'
        });
      }

      setUsers(mappedUsers);
    } catch (err) {
      console.error("Error loading staff data:", err);
    } finally {
      setLoading(false);
    }
  };


  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activePreset, setActivePreset] = useState<'7' | '30' | 'custom'>('30');

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setActivePreset(days === 7 ? '7' : '30');
  };

  const salesData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const rawSales = allSalons.flatMap(s => db.getSales(s.id));
    return rawSales.filter(s => {
      const d = new Date(s.createdAt);
      return s.status === 'valid' && d >= start && d <= end;
    });
  }, [startDate, endDate, allSalons]);

  const presenceMap = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const status: Record<string, boolean> = {};
    users.forEach(u => {
      status[u.id] = salesData.some(sale =>
        sale.staffId === u.id &&
        sale.createdAt.startsWith(today)
      );
    });
    return status;
  }, [users, salesData]);

  const performanceMap = useMemo(() => {
    const stats: Record<string, { ca: number, tickets: number, tips: number }> = {};
    users.forEach(u => {
      const userSales = salesData.filter(s => s.staffId === u.id);
      stats[u.id] = {
        ca: Math.round(userSales.reduce((acc, s) => acc + s.totalCA, 0)),
        tickets: userSales.length,
        tips: Math.round(userSales.reduce((acc, s) => acc + s.tipAmount, 0))
      };
    });
    return stats;
  }, [users, salesData]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const salonMatch = filterSalonId === 'all' || u.salons.includes(filterSalonId);
      const roleMatch = filterRole === 'all' || u.role === filterRole;
      return salonMatch && roleMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, filterSalonId, filterRole]);

  const handleSaveUser = async () => {
    if (!editingUser?.name || !editingUser?.email || !editingUser?.role || !editingUser?.salons) return;
    if (!currentUser) return;

    setLoading(true);
    try {
      if (editingUser.id && editingUser.status) {
        // Mise à jour d'un existant dans la table 'staff' (ou profile pour l'owner)
        if (editingUser.role === UserRole.OWNER) {
          await supabase.from('profiles').update({ name: editingUser.name, salons: editingUser.salons }).eq('id', editingUser.id);
        } else {
          await supabase.from('staff').update({
            name: editingUser.name,
            role: editingUser.role,
            salons: editingUser.salons,
            is_bookable: editingUser.isBookable,
            can_view_own_schedule: editingUser.canViewOwnSchedule
          }).eq('id', editingUser.id);
        }
      } else {
        // Nouvelle invitation !
        const { data: newStaff, error } = await supabase
          .from('staff')
          .insert([{
            owner_id: currentUser.id,
            email: editingUser.email,
            name: editingUser.name,
            role: editingUser.role,
            salons: editingUser.salons,
            is_bookable: editingUser.isBookable,
            can_view_own_schedule: editingUser.canViewOwnSchedule,
            status: 'INVITED'
          }])
          .select()
          .single();

        if (error) throw error;

        // Envoyer l'email d'invitation via Resend
        const mainSalonName = allSalons.find(s => editingUser.salons?.includes(s.id))?.name || "notre établissement";
        mailService.sendStaffInvitation(editingUser.email!, {
          ownerName: currentUser.name,
          salonName: mainSalonName
        }).catch(err => console.error("Invitation email error:", err));
      }

      await refreshData();
      await loadInitialData();
      setEditingUser(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;

    if (target.role === UserRole.OWNER) {
      alert("Erreur critique : Le compte propriétaire racine ne peut être supprimé.");
      return;
    }

    if (window.confirm(`Confirmez-vous la révocation totale des accès de ${target.name} ?`)) {
      db.deleteUser(id);
      setUsers([...db.getOrganizationUsers(currentUser!.id)]);
    }
  };

  const isOwnerOrManager = currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.MANAGER;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 space-y-8 animate-in slide-in-from-right duration-500">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mb-1">Capital Humain & Performance</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Équipes Établissements</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white p-2 rounded-[1.5rem] border border-slate-200 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => applyPreset(7)} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${activePreset === '7' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>7J</button>
            <button onClick={() => applyPreset(30)} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${activePreset === '30' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>30J</button>
          </div>
        </div>

        <button
          onClick={() => setEditingUser({ name: '', email: '', role: UserRole.STAFF, salons: [], isBookable: false, canViewOwnSchedule: false })}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/30 flex items-center justify-center gap-3 active:scale-95 transition-all group"
          title="Ajouter un nouveau profil collaborateur"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3} /></svg>
          Nouveau Profil
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(u => {
          const isTargetOwner = u.role === UserRole.OWNER;
          const isTargetManager = u.role === UserRole.MANAGER;
          const isRequesterOwner = currentUser?.role === UserRole.OWNER;
          const isRequesterManager = currentUser?.role === UserRole.MANAGER;
          const isPresent = presenceMap[u.id];
          const perf = performanceMap[u.id];

          let canDelete = false;
          if (u.id !== currentUser?.id) {
            if (isRequesterOwner) canDelete = !isTargetOwner;
            if (isRequesterManager) canDelete = !isTargetOwner && !isTargetManager;
          }

          return (
            <div key={u.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl border-2 transition-all ${isTargetOwner ? 'bg-amber-50 text-amber-500 border-amber-100 shadow-inner' : isTargetManager ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      {u.name.charAt(0)}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-lg ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}>
                      {u.status === 'INVITED' && <span className="text-[8px] text-white">⏳</span>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-xl text-slate-900 leading-none mb-1 truncate">{u.name}</h3>
                    <div className="flex gap-1 items-center">
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.2em] w-fit ${isTargetOwner ? 'bg-amber-100 text-amber-700' : isTargetManager ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.role}
                      </div>
                      {u.isBookable && <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Réservable</span>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">C.A.</div>
                    <div className="text-sm font-black text-slate-900">{perf.ca}€</div>
                  </div>
                  <div className="border-x border-slate-200">
                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Tickets</div>
                    <div className="text-sm font-black text-slate-900">{perf.tickets}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-emerald-500 uppercase mb-1">Tips</div>
                    <div className="text-sm font-black text-emerald-600">{perf.tips}€</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingUser(u)}
                  className="flex-1 py-4 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  Gérer Permissions
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-4 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all border border-rose-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" strokeWidth={2.5} /></svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-end md:items-center justify-center z-[100] p-0 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in slide-in-from-bottom h-[90vh] md:h-auto overflow-y-auto no-scrollbar">
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Édition & Autorisations</h3>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="userName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nom du Collaborateur</label>
                  <input
                    id="userName"
                    type="text"
                    placeholder="Ex: Julie Martin"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold outline-none focus:border-slate-900 transition-all font-sans"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="userEmail" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email (Identifiant)</label>
                  <input
                    id="userEmail"
                    type="email"
                    placeholder="julie@salon.com"
                    value={editingUser.email || ''}
                    disabled={!!editingUser.id}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold outline-none focus:border-slate-900 transition-all disabled:opacity-50 font-sans"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="userRole" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Rôle & Responsabilités</label>
                  <select
                    id="userRole"
                    value={editingUser.role}
                    disabled={editingUser.id === currentUser?.id || currentUser?.role === UserRole.MANAGER}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:border-slate-900 transition-all appearance-none cursor-pointer font-sans disabled:opacity-60"
                  >
                    <option value={UserRole.STAFF}>Coiffeur / Collaborateur</option>
                    {currentUser?.role === UserRole.OWNER && <option value={UserRole.MANAGER}>Manager (Gestion d'équipe)</option>}
                    {editingUser.id === currentUser?.id && <option value={UserRole.OWNER}>Propriétaire</option>}
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                <div className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] mb-4">Poste Ouvert aux Réservations</div>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-slate-600 uppercase">Autoriser Réservations en ligne</span>
                  <button
                    onClick={() => setEditingUser({ ...editingUser, isBookable: !editingUser.isBookable })}
                    className={`w-12 h-6 rounded-full relative transition-all ${editingUser.isBookable ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingUser.isBookable ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-slate-600 uppercase">Voir son propre planning</span>
                  <button
                    onClick={() => setEditingUser({ ...editingUser, canViewOwnSchedule: !editingUser.canViewOwnSchedule })}
                    className={`w-12 h-6 rounded-full relative transition-all ${editingUser.canViewOwnSchedule ? 'bg-indigo-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingUser.canViewOwnSchedule ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-slate-600 uppercase">Limiter à la journée en cours</span>
                  <button
                    onClick={() => setEditingUser({ ...editingUser, restrictToCurrentDay: !editingUser.restrictToCurrentDay })}
                    className={`w-12 h-6 rounded-full relative transition-all ${editingUser.restrictToCurrentDay ? 'bg-indigo-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingUser.restrictToCurrentDay ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </label>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assignation Salons</label>
                <div className="grid grid-cols-2 gap-2">
                  {allSalons.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        const current = editingUser.salons || [];
                        const salons = current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id];
                        setEditingUser({ ...editingUser, salons });
                      }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${editingUser.salons?.includes(s.id) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      <div className="text-[10px] font-black uppercase truncate">{s.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                disabled={!editingUser.name || !editingUser.email || !editingUser.salons?.length}
                onClick={handleSaveUser}
                className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl disabled:opacity-30 active:scale-95 transition-all"
              >
                {editingUser.id ? 'Mettre à jour les droits' : 'Créer le profil'}
              </button>
              <button onClick={() => setEditingUser(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[10px]">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffScreen;
