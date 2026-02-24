
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Service, UserRole } from '../types';
import {
  sbGetServices,
  sbUpsertService,
  sbGetSalons,
  sbCloneServices,
} from '../services/supabaseService';
import { Salon } from '../types';

const ServicesScreen = () => {
  const { salon, user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [selectedSalons, setSelectedSalons] = useState<string[]>([]);
  const [isCloning, setIsCloning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otherSalons, setOtherSalons] = useState<Salon[]>([]);

  const isOwner = user?.role === UserRole.OWNER || user?.role === UserRole.MANAGER;

  const loadServices = async () => {
    if (!salon) return;
    setLoading(true);
    const data = await sbGetServices(salon.id);
    setServices(data);
    setLoading(false);
  };

  const loadOtherSalons = async () => {
    if (!user?.id) return;
    const all = await sbGetSalons(user.role === UserRole.OWNER ? user.id : user.ownerId || user.id);
    setOtherSalons(all.filter(s => s.id !== salon?.id && user?.salons.includes(s.id)));
  };

  useEffect(() => {
    loadServices();
    loadOtherSalons();
  }, [salon, user]);

  const handleSave = async () => {
    if (!editingService?.name || editingService?.price === undefined) return;
    await sbUpsertService({
      id: editingService.id,
      salonId: salon!.id,
      name: editingService.name,
      price: Math.max(0, Number(editingService.price)),
      duration: Math.max(0, Number(editingService.duration || 30)),
      isActive: editingService.isActive ?? true,
    });
    await loadServices();
    setEditingService(null);
  };

  const handleClone = async () => {
    if (selectedSalons.length === 0) return;
    setIsCloning(true);
    await sbCloneServices(salon!.id, selectedSalons);
    setIsCloning(false);
    setShowCloneModal(false);
    setSelectedSalons([]);
    alert(`Catalogue synchronisé avec succès sur ${selectedSalons.length} salon(s).`);
  };

  const toggleSalonSelection = (id: string) => {
    setSelectedSalons(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mb-1">Architecture Tarifaire</div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Catalogue Services</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto">
          {isOwner && otherSalons.length > 0 && (
            <button
              onClick={() => setShowCloneModal(true)}
              className="px-8 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeWidth={2.5} /></svg>
              Cloner Catalogue
            </button>
          )}
          <button
            onClick={() => setEditingService({ name: '', price: 0, duration: 30, isActive: true })}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-900/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3} /></svg>
            Nouveau Service
          </button>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.length === 0 && !loading ? (
          <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 space-y-4">
            <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeWidth={1.5} /></svg>
            <span className="text-[10px] font-black uppercase tracking-widest italic">Catalogue vide pour cet établissement</span>
          </div>
        ) : (
          services.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1 pr-12">
                  <h3 className="font-black text-xl text-slate-900 leading-none tracking-tight">{s.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.isActive ? 'En Caisse' : 'Désactivé'} • {s.duration} min</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-slate-900 tracking-tighter">{s.price}€</div>
                  <div className="text-[10px] text-slate-400 font-black uppercase mt-1">Prix T.T.C</div>
                </div>
              </div>

              <button
                onClick={() => setEditingService(s)}
                className="w-full py-4 bg-slate-50 hover:bg-slate-900 text-slate-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-slate-100 hover:border-slate-900"
              >
                Éditer Prestation
              </button>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE CLONAGE */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center z-[150] p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-3xl space-y-8 animate-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeWidth={3} /></svg>
                <span className="text-[8px] font-black uppercase tracking-widest">Master Replication System</span>
              </div>
              <h3 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Synchronisation Flotte</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest max-w-xs mx-auto">Choisissez les établissements de destination pour votre catalogue <span className="text-slate-900">"{salon?.name}"</span></p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
              {otherSalons.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSalonSelection(s.id)}
                  className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all ${selectedSalons.includes(s.id) ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-300'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${selectedSalons.includes(s.id) ? 'bg-white/10 text-white' : 'bg-white text-slate-900'}`}>
                      {s.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-black text-xs uppercase truncate max-w-[200px]">{s.name}</div>
                      <div className={`text-[8px] font-bold uppercase tracking-widest ${selectedSalons.includes(s.id) ? 'text-white/40' : 'text-slate-400'}`}>{s.address}</div>
                    </div>
                  </div>
                  {selectedSalons.includes(s.id) ? (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={4} /></svg>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200"></div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <button
                disabled={selectedSalons.length === 0 || isCloning}
                onClick={handleClone}
                className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-20"
              >
                {isCloning ? 'Synchronisation en cours...' : `Cloner sur ${selectedSalons.length} salon(s)`}
              </button>
              <button
                onClick={() => setShowCloneModal(false)}
                className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:text-slate-900"
              >
                Annuler l'opération
              </button>
            </div>
          </div>
        </div>
      )}

      {editingService && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-end md:items-center justify-center z-[100] p-0 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{editingService.id ? 'Modifier' : 'Créer'}</h3>
                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Prestation de Coiffure</div>
              </div>
              <button
                onClick={() => setEditingService(null)}
                className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors"
                title="Fermer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="serviceName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Désignation</label>
                <input
                  id="serviceName"
                  type="text"
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  placeholder="Ex: Coupe & Barbe..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="servicePrice" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tarif (€)</label>
                  <input
                    id="servicePrice"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={editingService.price}
                    onChange={(e) => setEditingService({ ...editingService, price: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="serviceDuration" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Durée (min)</label>
                  <input
                    id="serviceDuration"
                    type="number"
                    min="0"
                    step="5"
                    placeholder="30"
                    value={editingService.duration}
                    onChange={(e) => setEditingService({ ...editingService, duration: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                onClick={() => setEditingService({ ...editingService, isActive: !editingService.isActive })}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${editingService.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
              >
                <span className="font-black text-xs uppercase tracking-widest">Activer en caisse</span>
                <div className={`w-12 h-6 rounded-full relative transition-all ${editingService.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingService.isActive ? 'right-1' : 'left-1'}`}></div>
                </div>
              </button>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                disabled={!editingService.name || editingService.price === undefined}
                onClick={handleSave}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-slate-900/30 disabled:opacity-30 active:scale-95 transition-all"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesScreen;
