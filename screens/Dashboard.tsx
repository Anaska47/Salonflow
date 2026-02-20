
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

const SALON_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#1e293b', '#6d28d9'];
const STAFF_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#94a3b8'];

const DashboardScreen = () => {
  const { salon: activeSalon, user } = useAuth();
  const [viewMode, setViewMode] = useState<'summary' | 'analytics'>('summary');
  const [dashboardScope, setDashboardScope] = useState<'current' | 'all' | string>(() => {
    if (user?.role === 'OWNER') return 'all';
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

  const isOwner = user?.role === 'OWNER';
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isStaff = user?.role === 'STAFF';

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
        padding: 40,
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
      const ownerId = user?.role === 'OWNER' ? user.id : user?.ownerId || '';
      const allSalons = db.getOrganizationSalons(ownerId);

      if (dashboardScope === 'all') {
        sales = allSalons.flatMap(s => db.getSales(s.id));
      } else if (dashboardScope === 'current') {
        if (activeSalon) sales = db.getSales(activeSalon.id);
      } else {
        // Specific salon ID
        sales = db.getSales(dashboardScope);
      }

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
  }, [activeSalon, dashboardScope, user, isOwner, isStaff]);

  const insights = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const ownerId = user?.role === 'OWNER' ? user.id : user?.ownerId || '';
    const ownedSalons = db.getOrganizationSalons(ownerId);

    let salonsInScope = [];
    if (dashboardScope === 'all') {
      salonsInScope = ownedSalons;
    } else if (dashboardScope === 'current') {
      salonsInScope = activeSalon ? [activeSalon] : [];
    } else {
      const specific = ownedSalons.find(s => s.id === dashboardScope);
      salonsInScope = specific ? [specific] : [];
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

    const dailyData = Object.entries(dailyDataMap).map(([date, data]) => ({
      ...data
    }));

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
        if (item.type === 'service') servicesCA += item.lineTotal;
        else if (item.type === 'product') productsCA += item.lineTotal;

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
  }, [activeSalon, user, isOwner, isStaff, startDate, endDate, dashboardScope]);

  if (!insights) return null;

  return (
    <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-10">
      {/* HEADER COMMAND CENTER */}
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

        {/* STAFF SALON ASSIGNMENT VIEW */}
        {isStaff && activeSalon && (
          <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm animate-in slide-in-from-right">
            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth={2} /></svg>
            </div>
            <div>
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Poste Affecté</div>
              <div className="text-sm font-black text-slate-900 uppercase tracking-tighter">{activeSalon.name}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full lg:w-auto">
          {/* SWITCH SCOPE (OWNER & MANAGER) */}
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
                  {db.getOrganizationSalons(user?.role === 'OWNER' ? user.id : user?.ownerId || '').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* DATE PICKER */}
          <div className="bg-white p-2 rounded-2xl flex flex-wrap items-center gap-2 shadow-sm border border-slate-200">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => applyPreset(7)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activePreset === '7' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>7J</button>
              <button onClick={() => applyPreset(30)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activePreset === '30' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>30J</button>
              <button onClick={() => setActivePreset('custom')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activePreset === 'custom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Libre</button>
            </div>
            {activePreset === 'custom' && (
              <div className="flex items-center gap-2 px-2 animate-in slide-in-from-right-2 duration-300">
                <input
                  title="Date de début"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none appearance-none cursor-pointer focus:border-slate-900 transition-all font-sans"
                />
                <input
                  title="Date de fin"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none appearance-none cursor-pointer focus:border-slate-900 transition-all font-sans"
                />
              </div>
            )}
          </div>

          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center shadow-inner border border-slate-200">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Vue Flash
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Mode Expert
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'summary' ? (
        /* VUE RÉSUMÉE (KPI + INFOGRAPHIES) */
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">C.A. Prestations</div>
              <div className="text-3xl font-black text-slate-900 italic tracking-tighter">{insights.totalCA}€</div>
            </div>
            <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm">
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Ventes Produits</div>
              <div className="text-3xl font-black text-indigo-600 italic tracking-tighter">{insights.totalProducts}€</div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Panier Moyen</div>
              <div className="text-3xl font-black text-slate-900 italic tracking-tighter">{insights.averageTicket}€</div>
            </div>
            <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm">
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">PB (Pourboires)</div>
              <div className="text-3xl font-black text-emerald-600 italic tracking-tighter">{insights.totalTips}€</div>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{isStaff ? 'Mes Jours Actifs' : 'Staff Actif'}</div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-black text-slate-900 italic tracking-tighter">{isStaff ? insights.daysWorkedCount : insights.activeStaffToday.length}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {isStaff && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* MIX ACTIVITE (SERVICES VS PRODUITS) */}
                  <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-black italic tracking-tighter uppercase text-slate-900 mb-6">Mix Activité</h3>
                    <div className="flex items-center gap-6">
                      <div className="w-32 h-32 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={insights.categoriesDistribution}
                              innerRadius={35}
                              outerRadius={50}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {insights.categoriesDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {insights.categoriesDistribution.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-900 uppercase leading-none">{item.name}</span>
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5">{Math.round((item.value / insights.totalCA) * 100)}% ({item.value}€)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* TOP PRESTATIONS / PRODUITS */}
                  <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl">
                    <h3 className="text-sm font-black italic tracking-tighter uppercase mb-6 text-white/50">Mes Top Ventes</h3>
                    <div className="space-y-4">
                      {insights.topItems.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-xs italic">#{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black uppercase truncate leading-none">{item.name}</div>
                            <div className="text-[8px] font-bold text-white/30 uppercase mt-1.5">{item.qty} Ventes • {item.ca}€</div>
                          </div>
                        </div>
                      ))}
                      {insights.topItems.length === 0 && <div className="text-center py-4 text-white/20 text-[10px] font-black uppercase tracking-widest italic">Aucune donnée</div>}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">{isStaff ? 'Compteur de Progression' : 'Ventes par Salon'}</h3>
                  {!isStaff && <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-50 rounded-xl">Consolidation</div>}
                </div>

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.salonPerformance} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                        width={90}
                        interval={0}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        trigger="hover"
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-white/10 text-white animate-in zoom-in duration-200">
                                <p className="text-[8px] font-black text-white/40 uppercase mb-2">Détail Salon</p>
                                <p className="text-xs font-black uppercase mb-3">{payload[0].payload.name}</p>
                                <div className="space-y-1.5 pt-2 border-t border-white/5">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-[9px] font-bold text-white/40 uppercase">Production</span>
                                    <span className="text-[10px] font-black italic text-indigo-400">{payload[0].value}€</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-[9px] font-bold text-white/40 uppercase">Tips (PB)</span>
                                    <span className="text-[10px] font-black italic text-emerald-400">{payload[1].value}€</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="ca" stackId="a" radius={[0, 0, 0, 0]} barSize={20} fill="#6366f1" />
                      <Bar dataKey="tips" stackId="a" radius={[0, 10, 10, 0]} barSize={20} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* MOBILE INFO LIST (Avoid depending only on hover) */}
                {!isStaff && insights.salonPerformance.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {insights.salonPerformance.map((salon: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: salon.color }}></div>
                          <span className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[120px]">{salon.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs font-black italic text-slate-900">{salon.ca}€</div>
                            <div className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Production</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black italic text-emerald-600">{salon.tips}€</div>
                            <div className="text-[7px] font-black text-slate-400 uppercase tracking-tighter text-emerald-600/50">PB</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* NEW STAFF GOAL TRACKER */}
            {isStaff && (
              <div className="bg-indigo-600 rounded-[3.5rem] p-10 text-white shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black italic tracking-tighter uppercase mb-2">Objectif Commission</h3>
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-8">Palier à 1500€ de C.A.</p>

                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="text-5xl font-black italic tracking-tighter">{Math.min(100, Math.round((insights.totalCA / 1500) * 100))}%</div>
                      <div className="text-right">
                        <div className="text-[9px] font-black text-indigo-200 uppercase">Restant</div>
                        <div className="text-xl font-black italic">{Math.max(0, 1500 - insights.totalCA)}€</div>
                      </div>
                    </div>

                    <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden p-1">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                        style={{ width: `${Math.min(100, (insights.totalCA / 1500) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeWidth={3} /></svg>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                      Continuez comme ça !<br /><span className="text-indigo-200">Encore {Math.ceil((1500 - insights.totalCA) / parseFloat(insights.averageTicket as string || "1"))} clients moyens pour le palier.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VUE EXPERT (COURBES + REALTIME + TIPS) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in zoom-in duration-500">
          {/* COURBE DE PERFORMANCE (MAIN) */}
          <div className="lg:col-span-2 bg-white p-10 md:p-12 rounded-[4rem] border border-slate-200 shadow-xl space-y-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Courbe de Croissance</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Évolution par jour du C.A. vs Pourboires</p>
              </div>
              <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase">Période Sélectionnée</div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.dailyData}>
                  <defs>
                    <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    {insights.salonsInScope.map((s: any, i: number) => (
                      <linearGradient key={s.id} id={`colorSalon_${s.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SALON_COLORS[i % SALON_COLORS.length]} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={SALON_COLORS[i % SALON_COLORS.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 800, fill: '#cbd5e1' }}
                    interval={Math.floor(insights.dailyData.length / 10)}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#cbd5e1' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl border border-white/10 min-w-[200px] animate-in zoom-in duration-200">
                            <p className="text-[9px] font-black text-white/30 uppercase mb-4 tracking-[0.2em]">{payload[0].payload.date}</p>
                            <div className="space-y-4">
                              {dashboardScope === 'all' ? (
                                <>
                                  <div className="pb-3 border-b border-white/5 mb-3">
                                    <div className="text-[8px] font-black text-white/40 uppercase mb-1">Total Organisation</div>
                                    <div className="text-xl font-black italic text-white">{payload.find(p => p.dataKey === 'ca')?.value}€</div>
                                  </div>
                                  <div className="space-y-2">
                                    {insights.salonsInScope.map((s: any, i: number) => {
                                      const val = payload.find(p => p.dataKey === `${s.id}_ca`)?.value;
                                      return (
                                        <div key={s.id} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-xl">
                                          <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SALON_COLORS[i % SALON_COLORS.length] }}></div>
                                            <span className="text-[9px] font-black uppercase text-white/60 truncate max-w-[80px]">{s.name}</span>
                                          </div>
                                          <span className="text-[10px] font-black italic text-white">{val}€</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-2xl font-black italic text-indigo-400">C.A: {payload.find(p => p.dataKey === 'ca')?.value}€</div>
                                  <div className="text-sm font-black italic text-emerald-400">Tips: {payload.find(p => p.dataKey === 'tips')?.value}€</div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {dashboardScope === 'all' ? (
                    insights.salonsInScope.map((s: any, i: number) => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={`${s.id}_ca`}
                        stroke={SALON_COLORS[i % SALON_COLORS.length]}
                        strokeWidth={4}
                        fillOpacity={1}
                        fill={`url(#colorSalon_${s.id})`}
                        stackId="1" // Optionnel: changez en stackId si vous voulez du cumulé, sinon laissez tel quel pour superposition
                      />
                    ))
                  ) : (
                    <>
                      <Area type="monotone" dataKey="ca" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCa)" />
                      <Area type="monotone" dataKey="tips" stroke="#10b981" strokeWidth={3} fill="transparent" />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SIDEBAR ANALYTICS */}
          <div className="space-y-8">
            {/* LIVE SALES TERMINAL */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden h-[450px] flex flex-col">
              <div className="relative z-10 shrink-0 mb-8">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Live Stream</h3>
                <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 animate-pulse">Flux Transactions Direct</div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar relative z-10">
                {liveSales.map((sale, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl animate-in slide-in-from-right duration-500">
                    <div>
                      <div className="text-[10px] font-black uppercase text-white/80">{sale.staffName}</div>
                      <div className="text-[8px] font-bold text-white/30 uppercase">{new Date(sale.createdAt).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black italic text-indigo-400">+{sale.totalCA}€</div>
                      {sale.tipAmount > 0 && <div className="text-[8px] font-black text-emerald-400">TIP: {sale.tipAmount}€</div>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none z-20"></div>
            </div>

            {/* TIPS DISTRIBUTION */}
            <div className="bg-white rounded-[3.5rem] p-10 border border-slate-200 shadow-sm text-center">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Répartition Gratification</h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insights.tipsDistribution}
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {insights.tipsDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={STAFF_COLORS[index % STAFF_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100">
                              <div className="text-[8px] font-black text-slate-400 uppercase">{payload[0].name}</div>
                              <div className="text-sm font-black italic">{payload[0].value}€</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {insights.tipsDistribution.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STAFF_COLORS[i % STAFF_COLORS.length] }}></div>
                    <span className="text-[8px] font-black uppercase text-slate-500">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION PARTAGE & ACQUISITION QR CODE */}
      <div className="bg-white p-10 md:p-12 rounded-[4rem] border border-slate-200 shadow-xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-100 transition-colors duration-700"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Expansion & Visibilité</div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Invitez vos clients à réserver</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">
              Partagez votre QR Code ou votre lien de réservation sur vos réseaux sociaux pour augmenter vos rendez-vous en ligne.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                title="Copier le lien de réservation"
                onClick={handleCopyLink}
                className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-xl shadow-slate-900/10"
              >
                <ICONS.Share className="w-5 h-5" />
                Copier le lien
              </button>
              <button
                title="Télécharger le QR Code"
                onClick={handleDownloadQR}
                className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={3} /></svg>
                Télécharger QR
              </button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative p-8 bg-slate-50 rounded-[3rem] border border-slate-200 shadow-inner group">
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem] flex items-center justify-center z-20">
                <span className="bg-slate-900 text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest">Scanner pour tester</span>
              </div>
              <div ref={qrRef} className="w-48 h-48 bg-white p-4 rounded-3xl border border-slate-200 flex items-center justify-center shadow-lg relative z-10">
                <QRCodeSVG
                  value={bookingUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "https://cdn-icons-png.flaticon.com/512/10419/10419131.png",
                    x: undefined,
                    y: undefined,
                    height: 30,
                    width: 30,
                    excavate: true,
                  }}
                />
              </div>
              <div className="mt-6 text-center">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Réservation Directe</div>
                <div className="text-xs font-black italic text-slate-900 mt-1">{activeSalon?.name || "Salonflow"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
