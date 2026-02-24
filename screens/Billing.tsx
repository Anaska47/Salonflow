
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { supabase } from '../services/supabaseClient';
import { PLANS, SubscriptionTier } from '../services/subscriptionService';

const BillingScreen = () => {
   const { user } = useAuth();
   const [loading, setLoading] = useState(false);
   const [isAnnual, setIsAnnual] = useState(true);
   const [invoices, setInvoices] = useState<any[]>([]);

   useEffect(() => {
      const loadInvoices = async () => {
         if (!user?.id) return;
         const { data } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });
         setInvoices(data || []);
      };
      loadInvoices();
   }, [user?.id]);

   const handleUpgrade = async (tier: SubscriptionTier) => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 1200));

      // Mettre à jour les limites dans Supabase
      let limits = { maxSalons: 1, maxStaff: 2 };
      if (tier === 'PRO') limits = { maxSalons: 5, maxStaff: 50 };
      if (tier === 'ELITE') limits = { maxSalons: 99, maxStaff: 999 };

      await supabase.from('subscriptions').upsert({
         user_id: user!.id,
         tier,
         max_salons: limits.maxSalons,
         max_staff: limits.maxStaff,
         updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      alert(`Bravo ! Votre empire s'agrandit. Plan ${tier} activé.`);
      setLoading(false);
   };

   return (
      <div className="p-4 md:p-12 max-w-7xl mx-auto space-y-24 pb-32 animate-in fade-in duration-700">

         {/* SECTION HERO - PROMESSE B2B */}
         <header className="text-center space-y-8 max-w-4xl mx-auto pt-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" /></svg>
               <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure Multi-Sites Hautes Performances</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter uppercase text-slate-900 leading-[0.85]">
               Déployez votre <span className="text-indigo-600">Empire</span>.
            </h1>
            <p className="text-slate-500 font-medium text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
               Passez d'un salon à un réseau national avec une gouvernance centralisée, un RBAC étanche et une analyse prédictive des flux.
            </p>
         </header>

         {/* VALUE PROPOSITION GRID */}
         <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
               {
                  title: "Centralisation",
                  desc: "Pilotez 10 salons depuis un seul écran. Stocks, RH et CA consolidés en temps réel.",
                  icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth={2} /></svg>
               },
               {
                  title: "Sécurité RBAC",
                  desc: "Gestion granulaire des permissions. Vos collaborateurs ne voient que ce que vous décidez.",
                  icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth={2} /></svg>
               },
               {
                  title: "Scalabilité",
                  desc: "Ajoutez un nouveau point de vente en 30 secondes. Configuration clonée et prête à encaisser.",
                  icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={2} /></svg>
               }
            ].map((v, i) => (
               <div key={i} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-slate-900/10">
                     {v.icon}
                  </div>
                  <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">{v.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
               </div>
            ))}
         </section>

         {/* PRICING SELECTOR */}
         <section className="space-y-16">
            <div className="flex flex-col items-center gap-6">
               <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-3xl border border-slate-200">
                  <button onClick={() => setIsAnnual(false)} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${!isAnnual ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400'}`}>Mensuel</button>
                  <button onClick={() => setIsAnnual(true)} className={`px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all relative ${isAnnual ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}>
                     Annuel
                     <span className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[8px] px-3 py-1 rounded-full border-4 border-slate-50 font-black">-20%</span>
                  </button>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paiement sécurisé par Stripe & Facturation Européenne</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
               {/* STANDARD PLAN */}
               <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div className="space-y-10">
                     <div className="space-y-2">
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">Standard</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Pour le salon unique</p>
                     </div>
                     <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-black tracking-tighter text-slate-900">{isAnnual ? '29' : '39'}€</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">/ mois</span>
                     </div>
                     <ul className="space-y-6 pt-10 border-t border-slate-50">
                        {[
                           "1 Salon / 2 Employés",
                           "Caisse POS & Stocks",
                           "Planning Intelligent",
                           "Rapports Quotidiens",
                           "Support Standard"
                        ].map((f, i) => (
                           <li key={i} className="flex items-center gap-4 text-[11px] font-black text-slate-600 uppercase tracking-tight">
                              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={4} /></svg>
                              {f}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <button
                     onClick={() => handleUpgrade('STARTER' as any)}
                     className="mt-12 w-full py-6 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                     Commencer
                  </button>
               </div>

               {/* BUSINESS PLAN (THE STAR) */}
               <div className="bg-slate-900 p-12 rounded-[4rem] text-white flex flex-col justify-between shadow-3xl scale-105 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[60px] rounded-full"></div>
                  <div className="relative z-10 space-y-10">
                     <div className="flex justify-between items-start">
                        <div className="space-y-2">
                           <h3 className="text-2xl font-black italic tracking-tighter uppercase">Business</h3>
                           <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Croissance Multi-Sites</p>
                        </div>
                        <div className="bg-indigo-500 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Plus Populaire</div>
                     </div>
                     <div className="flex items-baseline gap-2">
                        <span className="text-7xl font-black tracking-tighter">{isAnnual ? '79' : '99'}€</span>
                        <span className="text-[10px] font-bold text-white/30 uppercase">/ mois</span>
                     </div>
                     <ul className="space-y-6 pt-10 border-t border-white/10">
                        {[
                           "Jusqu'à 5 Salons",
                           "Staff Illimité",
                           "Centralisation des Stocks",
                           "Audit RH & Présence",
                           "Dashboard Consolidation",
                           "Support Prioritaire"
                        ].map((f, i) => (
                           <li key={i} className="flex items-center gap-4 text-[11px] font-black text-white uppercase tracking-tight">
                              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={4} /></svg>
                              {f}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <button
                     onClick={() => handleUpgrade('PRO' as any)}
                     className="relative z-10 mt-12 w-full py-7 bg-white text-slate-900 rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
                  >
                     Déployer maintenant
                  </button>
               </div>

               {/* FLEET PLAN */}
               <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div className="space-y-10">
                     <div className="space-y-2">
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">Fleet</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Franchises & Grands Groupes</p>
                     </div>
                     <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase">Sur Devis</span>
                     </div>
                     <ul className="space-y-6 pt-10 border-t border-slate-50">
                        {[
                           "Salons Illimités",
                           "SLA de production 99.9%",
                           "API Direct & Webhooks",
                           "SSO (Azure / Google)",
                           "Gestionnaire de compte",
                           "Développement sur-mesure"
                        ].map((f, i) => (
                           <li key={i} className="flex items-center gap-4 text-[11px] font-black text-slate-600 uppercase tracking-tight">
                              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={4} /></svg>
                              {f}
                           </li>
                        ))}
                     </ul>
                  </div>
                  <button
                     onClick={() => handleUpgrade('ELITE' as any)}
                     className="mt-12 w-full py-6 border-2 border-slate-900 text-slate-900 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all"
                  >
                     Contacter un Expert
                  </button>
               </div>
            </div>
         </section>

         <section className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="space-y-2">
                  <h3 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Historique des Factures</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Gérez vos justificatifs comptables</p>
               </div>
               <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 italic">Compte à jour</div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="border-b border-slate-50 bg-slate-50/50">
                           <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identifiant</th>
                           <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date d'émission</th>
                           <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                           <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant</th>
                           <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Justificatif</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {invoices.length === 0 ? (
                           <tr><td colSpan={5} className="px-10 py-16 text-center text-slate-300 font-black uppercase italic text-xs">Aucune facture pour l'instant</td></tr>
                        ) : invoices.map((inv) => (
                           <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-10 py-6 font-black text-xs text-slate-900 uppercase">#{inv.id}</td>
                              <td className="px-10 py-6 font-bold text-xs text-slate-500">{new Date(inv.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                              <td className="px-10 py-6 italic text-indigo-500 font-black text-[10px] uppercase">Plan {inv.plan}</td>
                              <td className="px-10 py-6 font-black text-slate-900 text-xs">{inv.amount}€ HT</td>
                              <td className="px-10 py-6 text-right">
                                 <button
                                    onClick={() => {
                                       alert(`Génération de la facture PDF #${inv.id} en cours...`);
                                       // Simulation de téléchargement
                                       const content = `FACTURE SALONFLOW\nID: ${inv.id}\nClient: ${user?.name}\nPlan: ${inv.plan}\nMontant: ${inv.amount}€\nDate: ${inv.date}\nStatus: PAYÉ`;
                                       const blob = new Blob([content], { type: 'text/plain' });
                                       const url = URL.createObjectURL(blob);
                                       const a = document.createElement('a');
                                       a.href = url;
                                       a.download = `Facture_${inv.id}.txt`;
                                       a.click();
                                       URL.revokeObjectURL(url);
                                    }}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                                 >
                                    Télécharger
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </section>

         {/* FOOTER CONFIDENCE */}
         <section className="bg-slate-100 rounded-[3rem] p-12 text-center space-y-8">
            <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">Ils ont confiance en SalonFlow</div>
            <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale contrast-200">
               <span className="text-2xl font-black italic tracking-tighter uppercase">BarberKing</span>
               <span className="text-2xl font-black italic tracking-tighter uppercase">L'Atelier C</span>
               <span className="text-2xl font-black italic tracking-tighter uppercase">Prestige Group</span>
               <span className="text-2xl font-black italic tracking-tighter uppercase">NeoCoiff</span>
            </div>
         </section>

         <footer className="text-center space-y-4 opacity-30">
            <p className="text-[9px] font-black uppercase tracking-[0.5em]">RGPD Compliant • Infrastructure Supabase • Stripe Payments Verified • TLS 1.3</p>
         </footer>
      </div>
   );
};

export default BillingScreen;
