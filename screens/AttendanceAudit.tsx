
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { User, UserRole, Sale, Salon } from '../types';
import { Navigate } from 'react-router-dom';
import { sbGetAllSales, sbGetSalons } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

const AttendanceAuditScreen = () => {
  const { user: currentUser, salon: activeSalon } = useAuth();

  // SÉCURITÉ : Un coiffeur (STAFF) ne peut pas accéder à l'audit RH
  if (currentUser?.role === UserRole.STAFF) {
    return <Navigate to="/" replace />;
  }

  const [selectedSalonId, setSelectedSalonId] = useState<string>(activeSalon?.id || 'all');
  const [exportMode, setExportMode] = useState<'both' | 'ca_only'>('both');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [usersInScope, setUsersInScope] = useState<User[]>([]);
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Load salons
  useEffect(() => {
    const loadSalons = async () => {
      if (!currentUser?.id) return;
      const ownerId = currentUser.role === UserRole.OWNER ? currentUser.id : currentUser.ownerId || currentUser.id;
      const data = await sbGetSalons(ownerId);
      // Filter by access
      const accessible = currentUser.role === UserRole.OWNER
        ? data
        : data.filter(s => currentUser.salons.includes(s.id));
      setSalons(accessible);
    };
    loadSalons();
  }, [currentUser]);

  // Load users and sales via supabase
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || salons.length === 0) return;
      setLoading(true);

      const salonIds = selectedSalonId === 'all'
        ? salons.map(s => s.id)
        : [selectedSalonId];

      // Load staff from Supabase
      const [staffRes, ownerRes] = await Promise.all([
        supabase.from('staff').select('id, name, email, role, salons, status, is_bookable, can_view_own_schedule, owner_id').in('salons', salonIds),
        supabase.from('profiles').select('id, name, email, role, salons, owner_id').eq('id', currentUser.id),
      ]);

      const staffList: User[] = (staffRes.data || []).map((s: any) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        role: s.role as UserRole,
        salons: s.salons || [],
        ownerId: s.owner_id,
        isBookable: s.is_bookable,
        canViewOwnSchedule: s.can_view_own_schedule,
        status: s.status,
      }));

      // Add owner
      if (ownerRes.data && ownerRes.data.length > 0) {
        const o = ownerRes.data[0];
        staffList.unshift({
          id: o.id,
          email: o.email,
          name: o.name,
          role: o.role as UserRole,
          salons: o.salons || [],
          ownerId: o.owner_id,
          isBookable: true,
          canViewOwnSchedule: true,
          status: 'ACTIVE',
        });
      }
      setUsersInScope(staffList);

      // Load sales
      const sales = await sbGetAllSales(salonIds, startDate, endDate);
      setSalesData(sales);

      setLoading(false);
    };
    loadData();
  }, [selectedSalonId, startDate, endDate, salons, currentUser]);

  const currentSalonName = useMemo(() => {
    if (selectedSalonId === 'all') return "Groupe Entier";
    return salons.find(s => s.id === selectedSalonId)?.name || "Salon";
  }, [selectedSalonId, salons]);

  const auditReport = useMemo(() => {
    const report: Record<string, { daysWorked: Set<string>, totalCA: number, totalProducts: number, totalTips: number }> = {};
    usersInScope.forEach(u => {
      report[u.id] = { daysWorked: new Set(), totalCA: 0, totalProducts: 0, totalTips: 0 };
    });
    salesData.forEach(sale => {
      if (report[sale.staffId]) {
        const day = sale.createdAt.split('T')[0];
        report[sale.staffId].daysWorked.add(day);
        report[sale.staffId].totalCA += sale.totalCA;
        report[sale.staffId].totalProducts += (sale.totalProducts || 0);
        report[sale.staffId].totalTips += sale.tipAmount;
      }
    });
    return report;
  }, [usersInScope, salesData]);

  const today = new Date().toISOString().split('T')[0];

  const handleExportCSV = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const BOM = "\uFEFF";
    const headers = [
      "Collaborateur", "Role", "Salon", "Jours Actifs", "Taux Activite %",
      "CA Genere", ...(exportMode === 'both' ? ["Tips Generes"] : []), "Debut", "Fin"
    ];

    const rows = usersInScope.map(u => {
      const data = auditReport[u.id] || { daysWorked: new Set(), totalCA: 0, totalTips: 0 };
      const salonName = salons.filter(s => u.salons.includes(s.id)).map(s => s.name).join(', ');

      return [
        u.name, u.role, salonName, data.daysWorked.size,
        Math.round((data.daysWorked.size / diffDays) * 100) + "%",
        data.totalCA + "€",
        ...(exportMode === 'both' ? [data.totalTips + "€"] : []),
        startDate, endDate
      ];
    });

    const csvContent = BOM + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AUDIT_PRESENCE_${currentSalonName.replace(/\s+/g, '_')}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showSalonSelector = salons.length > 1;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 space-y-8 animate-in slide-in-from-bottom duration-500">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Module Audit RH</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Présence Équipes</h1>
          <div className="text-[10px] font-bold text-slate-400 uppercase">Cible : <span className="text-slate-900">{currentSalonName}</span></div>
        </div>

        <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
          {showSalonSelector && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 ml-1">Périmètre de l'Audit</label>
              <select
                value={selectedSalonId}
                onChange={(e) => setSelectedSalonId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none appearance-none cursor-pointer"
              >
                <option value="all" className="text-slate-900">Tout le Groupe ({salons.length} sites)</option>
                {salons.map(s => (
                  <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[200px]">
            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 ml-1">Période Temporelle</label>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black" />
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 ml-1">Option Export</label>
            <select
              value={exportMode}
              onChange={(e) => setExportMode(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black outline-none appearance-none cursor-pointer"
            >
              <option value="both">CA + Pourboires</option>
              <option value="ca_only">Chiffre d'Affaire Uniquement</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-95 group"
          >
            <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3} /></svg>
            Exporter {currentSalonName === 'Groupe Entier' ? 'le Groupe' : 'le Salon'}
          </button>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Collaborateur</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Jours Pointés</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Taux d'Activité</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aujourd'hui</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">PB (Tips)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Vente Prod.</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">CA Presta.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersInScope.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-300 font-black uppercase italic tracking-widest text-xs">
                    Aucun collaborateur trouvé pour ce périmètre
                  </td>
                </tr>
              ) : (
                usersInScope.map(u => {
                  const data = auditReport[u.id] || { daysWorked: new Set(), totalCA: 0, totalProducts: 0, totalTips: 0 };
                  const daysWorked = data.daysWorked.size;
                  const isPresentToday = data.daysWorked.has(today);
                  const diffDays = Math.ceil(Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const activityRate = Math.round((daysWorked / diffDays) * 100);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs uppercase tracking-tighter">
                            {u.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-slate-900 font-black text-sm">{u.name}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {u.role} • {salons.filter(s => u.salons.includes(s.id)).map(s => s.name).join(', ')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="text-xl font-black text-slate-900 tracking-tighter italic">{daysWorked}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Jours actifs</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="max-w-[120px] mx-auto space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-slate-900 italic">{activityRate}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-1000 ${activityRate > 70 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : activityRate > 30 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${activityRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isPresentToday ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {isPresentToday ? (
                            <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>PRÉSENT</>
                          ) : 'ABSENT'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="text-base font-black text-emerald-600 italic">{data.totalTips}€</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">PB</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-base font-black text-indigo-600 italic">{data.totalProducts}€</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Revente</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="text-base font-black text-slate-900 italic">{Math.round(data.totalCA)}€</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Production</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceAuditScreen;
