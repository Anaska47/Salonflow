
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { Sale, UserRole, User } from '../types';

const HistoryScreen = () => {
  const { salon, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [exportMode, setExportMode] = useState<'both' | 'ca_only'>('both');

  const isStaff = user?.role === UserRole.STAFF;
  const isManagement = user?.role === UserRole.OWNER || user?.role === UserRole.MANAGER;

  const salonStaff = useMemo(() => {
    if (!salon) return [];
    return db.getUsers().filter(u => u.salons.includes(salon.id));
  }, [salon]);

  useEffect(() => {
    if (salon) {
      let salonSales = db.getSales(salon.id);
      if (isStaff) {
        salonSales = salonSales.filter(s => s.staffId === user?.id);
      }
      setSales(salonSales);
    }
  }, [salon, isStaff, user]);

  const filteredSales = useMemo(() => {
    if (staffFilter === 'all') return sales;
    return sales.filter(s => s.staffId === staffFilter);
  }, [sales, staffFilter]);

  const handleExportCSV = () => {
    const BOM = "\uFEFF";
    const headers = ["ID Transaction", "Date", "Heure", "Salon", "Collaborateur", "C.A. Presta", "Vente Prod.", ...(exportMode === 'both' ? ["PB (Tips)"] : []), "Paiement", "Statut"];
    const rows = filteredSales.map(s => {
      const d = new Date(s.createdAt);
      const salonName = db.getSalons().find(sal => sal.id === s.salonId)?.name || 'N/A';
      return [
        s.id,
        d.toLocaleDateString(),
        d.toLocaleTimeString(),
        salonName,
        s.staffName,
        s.totalCA + "€",
        (s.totalProducts || 0) + "€",
        ...(exportMode === 'both' ? [s.tipAmount + "€"] : []),
        s.paymentMethod,
        s.status === 'valid' ? 'Validé' : 'Annulé'
      ];
    });
    const csvContent = BOM + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `JOURNAL_CAISSE_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancelSale = () => {
    if (!selectedSale || !cancelReason) return;
    db.cancelSale(selectedSale.id, cancelReason);
    if (salon) {
      let salonSales = db.getSales(salon.id);
      if (isStaff) salonSales = salonSales.filter(s => s.staffId === user?.id);
      setSales(salonSales);
    }
    setSelectedSale(null);
    setCancelReason("");
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{isStaff ? 'Mes Tickets' : 'Audit Caisse'}</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {isStaff ? 'Vos encaissements personnels' : "Journal général du salon"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full lg:w-auto relative z-10">
          <div className="grid grid-cols-2 gap-4 flex-1 lg:flex-none">
            {isManagement && (
              <div className="relative">
                <label htmlFor="staffFilter" className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 ml-1">Collaborateur</label>
                <div className="relative">
                  <select
                    id="staffFilter"
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value)}
                    className="w-full pl-4 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black outline-none appearance-none cursor-pointer focus:border-slate-900 transition-all font-sans"
                  >
                    <option value="all">Équipe</option>
                    {salonStaff.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={3} /></svg>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <label htmlFor="exportMode" className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 ml-1">Configuration</label>
              <select
                id="exportMode"
                value={exportMode}
                onChange={(e) => setExportMode(e.target.value as any)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black outline-none appearance-none cursor-pointer focus:border-slate-900 transition-all font-sans"
              >
                <option value="both">CA + PB</option>
                <option value="ca_only">CA Net</option>
              </select>
            </div>
          </div>

          <button
            title="Extraire le journal CSV"
            onClick={handleExportCSV}
            className="w-full sm:w-auto flex items-center justify-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all group shrink-0"
          >
            <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3} /></svg>
            Exporter
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto no-scrollbar">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction / Heure</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Effectué par</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Articles</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Règlement</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">PB</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Vente Prod.</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">CA Presta.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-black uppercase italic tracking-widest text-xs">
                  Aucun ticket trouvé pour cette période
                </td>
              </tr>
            ) : (
              filteredSales.map(sale => (
                <tr key={sale.id} className={`hover:bg-slate-50/50 transition-colors ${sale.status === 'cancelled' ? 'opacity-40 grayscale' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="font-mono text-[10px] text-slate-400 mb-0.5">{sale.id}</div>
                    <div className="text-sm font-bold text-slate-900">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-8 py-6 font-black text-xs uppercase tracking-tight text-slate-700">{sale.staffName}</td>
                  <td className="px-8 py-6 text-center">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                      {sale.items.length} Réf.
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${sale.paymentMethod === 'Carte' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {sale.paymentMethod}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center font-black text-emerald-600 italic text-xs">{sale.tipAmount}€</td>
                  <td className="px-8 py-6 text-right font-black text-indigo-600 italic text-xs">{(sale as any).totalProducts || 0}€</td>
                  <td className="px-8 py-6 text-right">
                    <div className="text-xl font-black italic tracking-tighter text-slate-900">{sale.totalCA}€</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryScreen;
