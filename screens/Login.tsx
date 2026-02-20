
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { supabase } from '../services/supabaseClient';

const LoginScreen = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('invite') || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(!!searchParams.get('invite'));
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const inviteEmail = searchParams.get('invite');
    if (inviteEmail) {
      setEmail(inviteEmail);
      setIsRegistering(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        // 1. Sign Up in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;

        if (authData.user) {
          // 2. Vérifier si c'est une invitation staff
          const { data: staffInvite } = await supabase
            .from('staff')
            .select('*')
            .eq('email', email)
            .single();

          const userRole = staffInvite ? staffInvite.role : 'OWNER';
          const userSalons = staffInvite ? staffInvite.salons : [];
          const userOwnerId = staffInvite ? staffInvite.owner_id : null;

          // 3. Créer le profil dans public.profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                email,
                name: name || email.split('@')[0],
                role: userRole,
                salons: userSalons,
                owner_id: userOwnerId
              }
            ]);
          if (profileError) throw profileError;

          // 4. Si c'était un staff, mettre à jour la table staff
          if (staffInvite) {
            await supabase
              .from('staff')
              .update({ status: 'ACTIVE', auth_id: authData.user.id })
              .eq('id', staffInvite.id);
          }

          alert("Compte créé ! Vous pouvez maintenant vous connecter.");
          setIsRegistering(false);
        }
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2"></div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-[4rem] shadow-2xl relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-block px-3 py-1 bg-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
            {isRegistering ? 'Nouveau Compte' : 'Accès Professionnel'}
          </div>
          <h1 className="text-5xl font-black italic text-white tracking-tighter uppercase leading-none">SalonFlow</h1>
          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Pilotage RH & Réservation Cloud</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegistering && (
            <div className="space-y-2 animate-in slide-in-from-top duration-300">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Nom Complet / Salon</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-3xl text-white placeholder-white/10 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-bold"
                placeholder="Ex: Jean Patron"
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Identifiant (Email)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-3xl text-white placeholder-white/10 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-bold"
              placeholder="votre@email.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-4">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-3xl text-white placeholder-white/10 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-sm font-bold"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-2xl text-[10px] font-black text-rose-400 uppercase tracking-widest text-center animate-in zoom-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : isRegistering ? "Créer mon espace" : "S'authentifier"}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            {isRegistering ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>

        <div className="text-center pt-4 border-t border-white/5">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Base de données Cloud Supabase Active</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
