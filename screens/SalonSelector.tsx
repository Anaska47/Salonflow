
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { supabase } from '../services/supabaseClient';
import { Salon } from '../types';

const SalonSelector = () => {
  const { user, setSalon } = useAuth();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newSalon, setNewSalon] = useState({ name: '', address: '' });

  useEffect(() => {
    loadSalons();
  }, [user]);

  const loadSalons = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', user.id);

      if (data) setSalons(data);
    } catch (err) {
      console.error("Error loading salons:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salons')
        .insert([{
          name: newSalon.name,
          address: newSalon.address,
          owner_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Update profile in Supabase to include this salon ID
        const currentSalons = user.salons || [];
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ salons: [...currentSalons, data.id] })
          .eq('id', user.id);

        if (updateError) throw updateError;

        setSalon(data);
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la création du salon");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isCreating) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[3rem] p-10 shadow-3xl space-y-8">
        {!isCreating ? (
          <>
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black italic text-slate-900 tracking-tighter uppercase leading-none">Choisir un salon</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Connecté en tant que {user?.name}</p>
            </div>

            {salons.length === 0 ? (
              <div className="bg-slate-50 rounded-[2rem] p-10 text-center space-y-6 border border-slate-100">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth={2} /></svg>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">Aucun salon trouvé</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Il semblerait que vous n'ayez pas encore créé d'établissement pour votre compte.</p>
                </div>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                >
                  Créer mon premier salon
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {salons.map(salon => (
                  <button
                    key={salon.id}
                    onClick={() => setSalon(salon)}
                    className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-slate-900 hover:text-white transition-all text-left flex flex-col gap-4 group"
                  >
                    <div className="bg-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-white/10 group-hover:text-white transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth={2} /></svg>
                    </div>
                    <div>
                      <div className="font-black text-xl italic uppercase tracking-tighter leading-none mb-1">{salon.name}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white/40">{salon.address}</div>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setIsCreating(true)}
                  className="p-8 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">+</div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Ajouter un salon</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black italic text-slate-900 tracking-tighter uppercase leading-none">Nouveau Salon</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Configuration de votre établissement</p>
            </div>

            <form onSubmit={handleCreateSalon} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nom de l'établissement</label>
                <input
                  type="text"
                  required
                  value={newSalon.name}
                  onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  placeholder="Ex: Salon de Coiffure Centre"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Adresse complète</label>
                <input
                  type="text"
                  required
                  value={newSalon.address}
                  onChange={(e) => setNewSalon({ ...newSalon, address: e.target.value })}
                  className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-slate-900 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  placeholder="Ex: 12 Rue de la Paix, 75001 Paris"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-6 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading ? "Création..." : "Valider & Ouvrir"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalonSelector;
