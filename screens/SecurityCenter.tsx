
import React, { useState, useRef } from 'react';
import { useAuth } from '../App';
import { errorLogService } from '../services/errorLogService';
import { FEATURE_FLAGS } from '../services/deploymentService';
import { UserRole } from '../types';

/**
 * Security Center screen for managing application-wide security settings and maintenance.
 * Now includes full database management for the Owner.
 */
const SecurityCenter = () => {
  const { user } = useAuth();
  const isOwner = user?.role === UserRole.OWNER;

  const [maintenanceMode, setMaintenanceMode] = useState(FEATURE_FLAGS.maintenanceMode);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    errorLogService.log('info', "Export initié", "Admin", user?.name);
    alert('Exportation des données : Utilisez le tableau de bord Supabase ou les outils CLI Supabase pour exporter la base de données.');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    alert('Importation : Utilisez les migrations Supabase pour importer des données en masse.');
  };

  const handleNuclearWipe = async () => {
    if (confirmText !== "SUPPRIMER") {
      alert("Veuillez saisir 'SUPPRIMER' pour confirmer.");
      return;
    }
    errorLogService.log('critical', "WIPE DEMANDÉ - action bloquée", "Action Owner", user?.name);
    alert('Wipe total : Pour réinitialiser la base de données Supabase, connectez-vous au dashboard Supabase et exécutez les scripts SQL de réinitialisation.');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em] mb-1">Centre de Contrôle & Sécurité</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Poste de Commandement</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GESTION DU DÉPLOIEMENT GRADUEL */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">Gestion du Rollout V1</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Déploiement progressif des serveurs de production</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black uppercase text-emerald-500">Node Cluster: Stable</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-slate-900 text-white rounded-[2rem] space-y-4">
                <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Mode Maintenance Globale</div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest">{maintenanceMode ? 'Actif' : 'Inactif'}</span>
                  <button
                    onClick={() => {
                      setMaintenanceMode(!maintenanceMode);
                      errorLogService.log('warning', `Mode maintenance ${!maintenanceMode ? 'activé' : 'désactivé'}`, 'Admin toggle', user?.name);
                    }}
                    className={`w-12 h-6 rounded-full relative transition-all ${maintenanceMode ? 'bg-rose-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${maintenanceMode ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                <p className="text-[9px] text-white/40 leading-relaxed">Bloque l'accès à tous les salons pour des migrations de base de données critiques.</p>
              </div>

              <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-4">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Version de l'API</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black italic tracking-tighter text-slate-900">v1.2.4-stable</span>
                  <button className="text-[9px] font-black text-indigo-500 uppercase underline">Changer</button>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-[100%]"></div>
                </div>
                <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-center">Propagation : 100% des salons</div>
              </div>
            </div>
          </div>

          {/* GESTION DE LA BASE DE DONNÉES (POUR OWNER) */}
          {isOwner && (
            <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Souveraineté des Données</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Exportation et migration de la structure SalonFlow</p>
                </div>
                <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase">Supabase Cloud</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleExport}
                  className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-100 rounded-[2rem] transition-all group"
                >
                  <svg className="w-10 h-10 mb-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2} /></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest">Exporter tout (JSON)</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-indigo-600 hover:text-white border border-slate-100 rounded-[2rem] transition-all group"
                >
                  <svg className="w-10 h-10 mb-4 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" strokeWidth={2} /></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest">Importer / Migrer</span>
                  <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                </button>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <button
                  onClick={() => setShowDangerZone(!showDangerZone)}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest underline flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2.5} /></svg>
                  Zone de Danger Critique
                </button>

                {showDangerZone && (
                  <div className="mt-6 p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] space-y-6 animate-in slide-in-from-top">
                    <div className="space-y-2 text-center">
                      <h4 className="text-lg font-black text-rose-600 uppercase italic leading-none">Destruction de l'Infrastructure</h4>
                      <p className="text-[9px] text-rose-400 font-bold uppercase max-w-sm mx-auto">Cette action supprimera toutes les ventes, tous les salons et tous les accès de vos collaborateurs de manière IRREVERSIBLE.</p>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[8px] font-black text-rose-300 uppercase text-center">Tapez "SUPPRIMER" pour valider</label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="CODE DE CONFIRMATION"
                        className="w-full bg-white border border-rose-100 px-6 py-4 rounded-2xl text-center font-black text-rose-600 focus:ring-4 focus:ring-rose-500/10 outline-none"
                      />
                      <button
                        onClick={handleNuclearWipe}
                        className="w-full py-5 bg-rose-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-rose-600/30 hover:bg-rose-700 active:scale-95 transition-all"
                      >
                        Exécuter le Wipe Total
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* FEATURE FLAGS */}
          <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-black uppercase italic tracking-tighter">Fonctionnalités Bêta</h3>
            {Object.entries(FEATURE_FLAGS).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</span>
                <div className={`w-8 h-4 rounded-full ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              </div>
            ))}
          </div>

          {/* SCHEMA PREVIEW */}
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white space-y-4 overflow-hidden">
            <div className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Structure de Schéma</div>
            <pre className="text-[9px] font-mono text-white/60 leading-relaxed overflow-x-auto no-scrollbar">
              {`{
  "version": "2.0",
  "engine": "Supabase PostgreSQL",
  "nodes": [
    "profiles",
    "salons",
    "staff",
    "services",
    "products",
    "sales",
    "appointments",
    "subscriptions",
    "invoices"
  ]
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityCenter;
