
import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../services/mockDb';
import { Link } from 'react-router-dom';
import { ICONS } from '../constants';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import * as htmlToImage from 'html-to-image';
import { useRef } from 'react';
import { UserRole, ItemType, PaymentMethod } from '../types';

const SALON_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#1e293b', '#6d28d9'];
const STAFF_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#94a3b8'];

const DashboardScreen = () => {
  const { salon: activeSalon, user, salons } = useAuth();
  const [viewMode, setViewMode] = useState<'summary' | 'analytics'>('summary');
  const [dashboardScope, setDashboardScope] = useState<'current' | 'all' | string>(() => {
    if (user?.role === UserRole.OWNER) return 'all';
    return 'current';
  });
  const [liveSales, setLiveSales] = useState<any[]>([]);

  // États pour la plage de dates
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [activePreset, setActivePreset] = useState<'7' | '30' | 'custom'>('30');

  const isOwner = user?.role === UserRole.OWNER;
  const isManager = user?.role === UserRole.OWNER || user?.role === UserRole.MANAGER;
  const isStaff = user?.role === UserRole.STAFF;

  const qrRef = useRef<HTMLDivElement>(null);

  const bookingUrl = useMemo(() => {
    const id = activeSalon?.id || '';
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/book/${id}`;
  }, [activeSalon]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    alert('Lien de réservation copié !');
  };

  const handleDownloadQR = async () => {
    if (qrRef.current === null) return;
    try {
      const dataUrl = await htmlToImage.toPng(qrRef.current, {
        backgroundColor: '#ffffff',
        style: { borderRadius: '40px' }
      });
      const link = document.createElement('a');
      link.download = `QR_Booking_${activeSalon?.name?.replace(/\s+/g, '_') || 'Salon'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erreur lors du téléchargement du QR:', err);
    }
  };

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setActivePreset(days === 7 ? '7' : '30');
  };

  // Simulation du flux "Temps Réel"
  useEffect(() => {
    const fetchLiveSales = () => {
      let sales: any[] = [];
      const ownerId = user?.role === UserRole.OWNER ? user.id : user?.ownerId || '';

      let salonsInScope = [];
      if (dashboardScope === 'all') {
        salonsInScope = salons;
      } else if (dashboardScope === 'current') {
        salonsInScope = activeSalon ? [activeSalon] : (salons.length > 0 ? [salons[0]] : []);
      } else {
        const specific = salons.find(s => s.id === dashboardScope);
        salonsInScope = specific ? [specific] : [];
      }

      sales = salonsInScope.flatMap(s => db.getSales(s.id));

      // FILTRAGE DE SÉCURITÉ : Un coiffeur ne voit que son flux
      if (isStaff) {
        sales = sales.filter(s => s.staffId === user?.id);
      }

      const limitedSales = sales
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      setLiveSales(limitedSales);
    };
    fetchLiveSales();
  }, [activeSalon, dashboardScope, user, isOwner, isStaff, salons]);

  const insights = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let salonsInScope = [];
    if (dashboardScope === 'all') {
      salonsInScope = salons;
    } else if (dashboardScope === 'current') {
      salonsInScope = activeSalon ? [activeSalon] : (salons.length > 0 ? [salons[0]] : []);
    } else {
      const specific = salons.find(s => s.id === dashboardScope);
      salonsInScope = specific ? [specific] : [];
    }

    // Fallback de sécurité : Si on a un salon actif mais qu'il n'est pas dans les périmètres, on le rajoute
    if (salonsInScope.length === 0 && activeSalon) {
      salonsInScope = [activeSalon];
    }

    if (salonsInScope.length === 0) return null;

    // 1. Performance Multi-sites (Détail par salon)
    const salonPerformance = salonsInScope.map((s, idx) => {
      let salonSales = db.getSales(s.id).filter(sale => {
        const d = new Date(sale.createdAt);
        return sale.status === 'valid' && d >= start && d <= end;
      });

      // FILTRAGE DE SÉCURITÉ : Un coiffeur ne voit que son propre CA par salon
      if (isStaff) {
        salonSales = salonSales.filter(sale => sale.staffId === user?.id);
      }

      return {
        name: s.name,
        ca: salonSales.reduce((acc, sale) => acc + sale.totalCA, 0),
        tips: salonSales.reduce((acc, sale) => acc + sale.tipAmount, 0),
        color: SALON_COLORS[idx % SALON_COLORS.length]
      };
    }).sort((a, b) => b.ca - a.ca);

    // 2. Data Consolidée
    const allRelevantSales = salonsInScope.flatMap(s => db.getSales(s.id)).filter(sale => {
      const d = new Date(sale.createdAt);
      let match = sale.status === 'valid' && d >= start && d <= end;
      if (isStaff) match = match && sale.staffId === user?.id;
      return match;
    });

    const totalCA = allRelevantSales.reduce((acc, s) => acc + s.totalCA, 0);
    const totalProducts = allRelevantSales.reduce((acc, s) => acc + (s.totalProducts || 0), 0);
    const totalTips = allRelevantSales.reduce((acc, s) => acc + s.tipAmount, 0);

    // Évolution CA
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const dailyDataMap: Record<string, { label: string, date: string, ca: number, tips: number, [key: string]: any }> = {};
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      dailyDataMap[iso] = {
        label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        date: iso,
        ca: 0,
        tips: 0
      };
      // Initialiser les clés par salon
      salonsInScope.forEach(s => {
        dailyDataMap[iso][`${s.id}_ca`] = 0;
      });
    }

    allRelevantSales.forEach(sale => {
      const iso = sale.createdAt.split('T')[0];
      if (dailyDataMap[iso]) {
        dailyDataMap[iso].ca += sale.totalCA;
        dailyDataMap[iso].tips += sale.tipAmount;
        dailyDataMap[iso][`${sale.salonId}_ca`] += sale.totalCA;
      }
    });

    const dailyData = Object.entries(dailyDataMap).map(([date, data]) => ({ ...data }));

    // Répartition des Tips par Staff
    const staffTipsMap: Record<string, { name: string, value: number }> = {};
    allRelevantSales.forEach(s => {
      if (!staffTipsMap[s.staffId]) staffTipsMap[s.staffId] = { name: s.staffName, value: 0 };
      staffTipsMap[s.staffId].value += s.tipAmount;
    });
    const tipsDistribution = Object.values(staffTipsMap).filter(v => v.value > 0);

    // Statistiques par Articles (Services vs Produits)
    let servicesCA = 0;
    let productsCA = 0;
    const itemsMap: Record<string, { name: string, qty: number, ca: number }> = {};

    allRelevantSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.type === ItemType.SERVICE) servicesCA += item.lineTotal;
        else if (item.type === ItemType.PRODUCT) productsCA += item.lineTotal;

        if (!itemsMap[item.refId]) itemsMap[item.refId] = { name: item.name, qty: 0, ca: 0 };
        itemsMap[item.refId].qty += item.qty;
        itemsMap[item.refId].ca += item.lineTotal;
      });
    });

    const categoriesDistribution = [
      { name: 'Services', value: servicesCA, color: '#6366f1' },
      { name: 'Vente Boutique', value: productsCA, color: '#10b981' }
    ].filter(c => c.value > 0);

    const topItems = Object.values(itemsMap).sort((a, b) => b.qty - a.qty).slice(0, 3);
    const averageTicket = allRelevantSales.length > 0 ? (totalCA / allRelevantSales.length).toFixed(1) : 0;

    // Présence
    const activeStaffNames = new Set(allRelevantSales.map(s => s.staffName));
    const daysWorkedCount = new Set(allRelevantSales.map(s => s.createdAt.split('T')[0])).size;

    return {
      totalCA,
      totalProducts,
      totalTips,
      dailyData,
      salonsInScope,
      salonPerformance,
      tipsDistribution,
      activeStaffToday: Array.from(activeStaffNames),
      daysWorkedCount,
      averageTicket,
      categoriesDistribution,
      topItems,
      totalTickets: allRelevantSales.length
    };
  }, [activeSalon, user, isOwner, isStaff, startDate, endDate, dashboardScope, salons]);

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-10">
      {!insights ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] font-black uppercase text-slate-400">Initialisation du Dashboard...</p>
        </div>
      ) : (
        <>
          <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full border border-white/10 shadow-2xl animate-in fade-in zoom-in">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Command Center v1.2</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
                {isStaff ? 'Ma Caisse' : 'Analytics Salon'}
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full lg:w-auto">
              {(isOwner || isManager) && (
                <div className="bg-white p-1.5 rounded-2xl flex items-center shadow-sm border border-slate-200">
                  <select
                    value={dashboardScope}
                    onChange={(e) => setDashboardScope(e.target.value)}
                    className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest outline-none focus:ring-0 cursor-pointer pr-8"
                    title="Sélecteur de périmètre"
                  >
                    <option value="current">Salon Actuel</option>
                    {isOwner && <option value="all">Tous les Salons</option>}
                    <optgroup label="Salons Spécifiques">
                      {salons.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              <div className="bg-white p-2 rounded-2xl flex flex-wrap items-center gap-2 shadow-sm border border-slate-200">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => applyPreset(7)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activePreset === '7' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>7J</button>
                  <button onClick={() => applyPreset(30)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activePreset === '30' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>30J</button>
                  <button onClick={() => setActivePreset('custom')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activePreset === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Libre</button>
                </div>
                {activePreset === 'custom' && (
                  <div className="flex items-center gap-2 px-2 animate-in slide-in-from-right-2 duration-300">
                    <input title="Date début" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none" />
                    <input title="Date fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none" />
                  </div>
                )}
              </div>

              <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner border border-slate-200">
                <button onClick={() => setViewMode('summary')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Vue Flash</button>
                <button onClick={() => setViewMode('analytics')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Mode Expert</button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm"><div className="text-[9px] font-black text-slate-400 uppercase mb-2">C.A. Prestations</div><div className="text-3xl font-black text-slate-900 italic">{insights.totalCA}€</div></div>
            <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm"><div className="text-[9px] font-black text-indigo-400 uppercase mb-2">Ventes Produits</div><div className="text-3xl font-black text-indigo-600 italic">{insights.totalProducts}€</div></div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm"><div className="text-[9px] font-black text-slate-400 uppercase mb-2">Panier Moyen</div><div className="text-3xl font-black text-slate-900 italic">{insights.averageTicket}€</div></div>
            <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm"><div className="text-[9px] font-black text-emerald-400 uppercase mb-2">PB (Pourboires)</div><div className="text-3xl font-black text-emerald-600 italic">{insights.totalTips}€</div></div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm"><div className="text-[9px] font-black text-slate-400 uppercase mb-2">{isStaff ? 'Mes Jours' : 'Staff Actif'}</div><div className="text-3xl font-black text-slate-900 italic">{isStaff ? insights.daysWorkedCount : insights.activeStaffToday.length}</div></div>
          </div>

          {viewMode === 'summary' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">{isStaff ? 'Progression' : 'Ventes par Salon'}</h3>
                  </div>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.salonPerformance} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} width={120} />
                        <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                          if (active && payload && payload.length) return <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-[10px] font-black uppercase italic">{payload[0].value}€</div>;
                          return null;
                        }} />
                        <Bar dataKey="ca" radius={[0, 20, 20, 0]} barSize={24}><Cell key="cell-0" fill="#6366f1" /></Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {isStaff && (
                  <div className="bg-indigo-600 rounded-[3.5rem] p-10 text-white shadow-xl flex flex-col justify-between h-full">
                    <div>
                      <h3 className="text-sm font-black italic uppercase mb-2">Objectif Commission</h3>
                      <p className="text-[9px] font-bold text-white/50 mb-8 uppercase tracking-widest">Palier à 1500€ de C.A.</p>
                      <div className="space-y-6">
                        <div className="flex justify-between items-end">
                          <div className="text-5xl font-black italic">{Math.min(100, Math.round((insights.totalCA / 1500) * 100))}%</div>
                          <div className="text-right">
                            <div className="text-xl font-black italic">{Math.max(0, 1500 - insights.totalCA)}€</div>
                          </div>
                        </div>
                        <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden p-1">
                          <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (insights.totalCA / 1500) * 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl h-full">
                  <h3 className="text-sm font-black italic uppercase mb-6 text-white/50">Top Ventes</h3>
                  <div className="space-y-4">
                    {insights.topItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-xs italic">#{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black uppercase truncate">{item.name}</div>
                          <div className="text-[8px] font-bold text-white/30 uppercase mt-1.5">{item.qty} Ventes • {item.ca}€</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[4rem] border border-slate-200 shadow-xl">
                <h3 className="text-2xl font-black italic mb-10 text-slate-900 uppercase">Évolution Temporelle</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={insights.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#cbd5e1' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#cbd5e1' }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="ca" stroke="#6366f1" strokeWidth={4} fill="#6366f1" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl overflow-hidden flex flex-col max-h-[500px]">
                <h3 className="text-xl font-black italic uppercase mb-8">Transactions Live</h3>
                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                  {liveSales.map((sale, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div>
                        <div className="text-[10px] font-black uppercase text-white/80">{sale.staffName}</div>
                        <div className="text-[8px] font-bold text-white/30 uppercase">{new Date(sale.createdAt).toLocaleTimeString()}</div>
                      </div>
                      <div className="text-lg font-black italic text-indigo-400">+{sale.totalCA}€</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-10 md:p-12 rounded-[4rem] border border-slate-200 shadow-xl relative overflow-hidden group">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none mb-4">Invitez vos clients</h2>
                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm mb-8">Partagez votre QR Code ou votre lien pour booster vos rendez-vous.</p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleCopyLink} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-black transition-all">Copier le lien</button>
                  <button onClick={handleDownloadQR} className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all">Télécharger QR</button>
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <div className="relative p-8 bg-slate-50 rounded-[3rem] border border-slate-200 flex flex-col items-center">
                  <div ref={qrRef} className="w-48 h-48 bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-center shadow-lg">
                    <QRCodeSVG value={bookingUrl} size={160} level="H" />
                  </div>
                  <div className="mt-6 text-center">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Réservation Directe</div>
                    <div className="text-xs font-black italic text-slate-900 mt-1">{activeSalon?.name || "Salonflow"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardScreen;
