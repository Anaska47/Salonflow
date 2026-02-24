
import React, { useState, useEffect, useContext, createContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { ICONS } from './constants';
import { db } from './services/mockDb';
import { User, Salon, UserRole } from './types';
import { supabase } from './services/supabaseClient';

// Import screens
import DashboardScreen from './screens/Dashboard';
import POSScreen from './screens/POS';
import CalendarScreen from './screens/Calendar';
import HistoryScreen from './screens/History';
import StockScreen from './screens/Stock';
import StaffScreen from './screens/Staff';
import SalonsScreen from './screens/Salons';
import ServicesScreen from './screens/Services';
import AttendanceAuditScreen from './screens/AttendanceAudit';
import BillingScreen from './screens/Billing';
import SecurityCenter from './screens/SecurityCenter';
import LoginScreen from './screens/Login';
import SalonSelector from './screens/SalonSelector';
import BookingScreen from './screens/Booking';



const ConfigError = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-white">
    <div className="max-w-md w-full space-y-8 text-center bg-slate-800 p-10 rounded-[3rem] border border-white/5 shadow-2xl">
      <div className="w-20 h-20 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl rotate-3">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2} />
        </svg>
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase italic leading-none">Configuration Interrompue</h1>
        <p className="text-slate-400 text-sm font-medium leading-relaxed">Les variables d'environnement <span className="text-white font-bold">Supabase</span> sont manquantes. L'application ne peut pas fonctionner en dehors d'un environnement configuré.</p>
      </div>
      <div className="p-4 bg-slate-900 rounded-2xl text-[10px] font-mono text-rose-400 text-left overflow-auto">
        VITE_SUPABASE_URL: MISSING<br />
        VITE_SUPABASE_ANON_KEY: MISSING
      </div>
      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest leading-loose">Ajoutez ces variables dans votre dashboard Vercel ou votre fichier .env.local pour continuer.</p>
    </div>
  </div>
);

const SyncIndicator = () => {
  const { isSyncing } = useAuth();
  if (!isSyncing) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse shadow-xl border border-white/10">
      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
      Sync...
    </div>
  );
};

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1 flex flex-col">
    {children}
  </div>
);

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, salon, user, setSalon, salons } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Synchronisation avec les données réelles
  const availableSalons = salons;
  const notifications = db.getNotifications(user!.id); // On gardera mockDb pour les notifs temporairement 
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Navigation simplifiée et fluidifiée
  const navItems = [
    { label: 'Accueil', path: '/', icon: ICONS.Dashboard, roles: ['OWNER', 'MANAGER', 'STAFF'], mobile: true },
    { label: 'Caisse', path: '/pos', icon: ICONS.POS, roles: ['OWNER', 'MANAGER', 'STAFF'], mobile: true },
    { label: 'Agenda', path: '/calendar', icon: ICONS.Calendar, roles: ['OWNER', 'MANAGER', 'STAFF'], mobile: true },
    { label: 'Journal', path: '/history', icon: ICONS.History, roles: ['OWNER', 'MANAGER', 'STAFF'], mobile: true },
    { label: 'Stocks', path: '/stock', icon: ICONS.Stock, roles: ['OWNER', 'MANAGER'], mobile: false },
    { label: 'Équipe', path: '/staff', icon: ICONS.Management, roles: ['OWNER', 'MANAGER'], mobile: false },
    { label: 'Salons', path: '/salons', icon: ICONS.Management, roles: ['OWNER', 'MANAGER'], mobile: false },
    { label: 'Catalogue', path: '/services', icon: ICONS.Management, roles: ['OWNER', 'MANAGER'], mobile: false },
    { label: 'Présences', path: '/audit', icon: ICONS.Attendance, roles: ['OWNER', 'MANAGER'], mobile: false },
    { label: 'Compte', path: '/billing', icon: ICONS.Management, roles: ['OWNER'], mobile: false, badge: unreadCount > 0 && notifications.some(n => n.type === 'billing' && !n.isRead) },
    { label: 'Sécurité', path: '/security', icon: ICONS.Management, roles: ['OWNER'], mobile: false },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user?.role || ''));
  const mobileNavItems = filteredNav.filter(item => item.mobile);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-72 flex-col bg-slate-900 text-white p-8 gap-8 fixed h-full z-50 shadow-2xl">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-2xl rotate-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" /></svg>
              </div>
              <span className="text-xl font-black italic tracking-tighter uppercase leading-none">SalonFlow</span>
            </div>

            {/* BOUTON SWITCH SALON - DESKTOP */}
            {availableSalons.length > 1 && (
              <button
                onClick={() => setSalon(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white group relative"
                title="Changer de salon"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth={2} /></svg>
                <div className="absolute left-full ml-4 px-2 py-1 bg-white text-slate-900 text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">Changer de Salon</div>
              </button>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] mb-3 ml-4">Site Actif</div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <div className="font-black text-[10px] uppercase truncate text-white/80">{salon?.name}</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar pr-2">
            {filteredNav.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname === item.path ? 'bg-white text-slate-900 shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-4">
                  <item.icon className={`w-4 h-4 ${location.pathname === item.path ? 'text-slate-900' : 'text-slate-400'}`} />
                  {item.label}
                </div>
                {(item as any).badge && (
                  <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                )}
              </Link>
            ))}
          </nav>

          <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
            <div className="flex items-center gap-3 px-4">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-[10px] uppercase">{user?.name.charAt(0)}</div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black truncate max-w-[120px]">{user?.name}</span>
                <span className="text-[8px] font-black text-white/30 uppercase">{user?.role}</span>
              </div>
            </div>
            <button onClick={logout} title="Se déconnecter de la plateforme" className="flex items-center gap-4 px-5 py-4 text-slate-400 hover:text-rose-400 transition-colors text-[10px] font-black uppercase tracking-widest">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" strokeWidth={2} /></svg>
              Quitter
            </button>
          </div>
        </aside>

        <main className="flex-1 md:ml-72 bg-slate-50 min-h-screen relative flex flex-col">
          {/* Main Top Header - Consolidé */}
          <div className="flex justify-between items-center p-4 md:p-6 bg-white/50 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3 md:hidden">
              <button onClick={() => setSalon(null)} title="Changer de salon" className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth={2} /></svg>
              </button>
              <div className="flex flex-col">
                <span className="font-black italic text-slate-900 tracking-tighter uppercase text-xs leading-none">SF Suite</span>
                <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest truncate max-w-[120px]">{salon?.name}</span>
              </div>
            </div>

            <div className="hidden md:flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Localisation</span>
              <span className="text-xs font-black text-slate-900 uppercase italic tracking-tighter">{salon?.address}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${unreadCount > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-400'}`}
                  title="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth={2} /></svg>
                  {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-lg animate-bounce">{unreadCount}</div>}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute top-full right-0 mt-4 w-80 bg-white rounded-3xl shadow-3xl border border-slate-100 z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest">Centre d'alertes</span>
                      <button onClick={() => setIsNotificationsOpen(false)} className="text-white/40 hover:text-white" title="Fermer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg></button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" strokeWidth={2} /></svg></div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Aucune alerte</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {notifications.map(n => (
                            <button
                              key={n.id}
                              onClick={() => {
                                db.markNotificationAsRead(n.id);
                                setIsNotificationsOpen(false);
                              }}
                              className={`w-full p-5 text-left flex gap-4 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                            >
                              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${n.type === 'billing' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                                {n.type === 'billing' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" strokeWidth={2} /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth={2} /></svg>}
                              </div>
                              <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-900 uppercase leading-none">{n.title} {!n.isRead && <span className="text-rose-500 ml-1">•</span>}</div>
                                <p className="text-[9px] font-bold text-slate-500 leading-tight">{n.message}</p>
                                <div className="text-[8px] font-black text-slate-300 uppercase">{new Date(n.createdAt).toLocaleTimeString()}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/pos" className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm border border-indigo-100 active:scale-90 transition-transform">
                <ICONS.POS className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="flex-1 pb-24 md:pb-0">
            {children}
          </div>

          {/* Mobile Bottom Navigation - Premium Glassmorphism */}
          <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-slate-900/95 backdrop-blur-2xl px-8 py-4 rounded-[2.5rem] flex justify-between items-center z-50 shadow-2xl border border-white/10 ring-1 ring-black/20">
            <button
              title="Menu Mobile"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center group order-first"
            >
              <div className="p-2 bg-white/5 rounded-2xl text-slate-400 group-active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16m-7 6h7" strokeWidth={3} /></svg>
              </div>
            </button>
            {mobileNavItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'scale-110' : 'text-slate-500 hover:text-white'}`}
                >
                  <div className={`p-2 rounded-2xl transition-all duration-500 ${isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 rotate-3' : ''}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  {isActive && <div className="absolute -bottom-1.5 w-1 h-1 bg-white rounded-full animate-pulse"></div>}
                </Link>
              );
            })}
          </nav>
        </main>
      </div>

      {/* Mobile Drawer Menu - Now on the LEFT */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute top-0 left-0 w-[85%] h-full bg-slate-900 text-white p-8 animate-in slide-in-from-left duration-500 flex flex-col shadow-3xl">
            <div className="flex justify-between items-center mb-10">
              <div className="flex flex-col">
                <span className="text-2xl font-black italic tracking-tighter uppercase text-white leading-none">SF Hub</span>
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">Management & Partage</span>
              </div>
              <button
                title="Fermer le menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 bg-white/10 rounded-2xl text-white active:scale-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
              </button>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar">
              {filteredNav.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-5 px-6 py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${location.pathname === item.path ? 'bg-white text-slate-900 shadow-2xl' : 'text-slate-400 active:bg-white/5'}`}
                >
                  <item.icon className="w-6 h-6" />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="pt-8 border-t border-white/10 space-y-6">
              <button onClick={logout} className="w-full flex items-center gap-5 px-6 py-5 bg-rose-500/10 text-rose-400 rounded-3xl text-[11px] font-black uppercase tracking-widest border border-rose-500/20 active:scale-95 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" strokeWidth={3} /></svg>
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AuthContextType {
  user: any | null;
  salon: Salon | null;
  isSyncing: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  setSalon: (salon: Salon | null) => void;
  loading: boolean;
  salons: Salon[];
  refreshData: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(false);

  // Sync session with Supabase
  useEffect(() => {
    // Vérification critique avant démarrage (usage d'un cast pour éviter les erreurs de type ImportMeta)
    const meta = import.meta as any;
    const hasConfig = !!meta.env.VITE_SUPABASE_URL && !!meta.env.VITE_SUPABASE_ANON_KEY;

    if (!hasConfig || !supabase) {
      setConfigMissing(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else {
        setUser(null);
        setSalon(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        const appUser: User = {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role as UserRole,
          salons: data.salons || [],
          ownerId: data.owner_id,
          subscriptionStatus: 'active',
          isBookable: true,
          canViewOwnSchedule: true
        };
        setUser(appUser);

        // Charger les salons réels depuis Supabase
        const { data: salonsData } = await supabase
          .from('salons')
          .select('*')
          .or(`owner_id.eq.${appUser.id},id.in.(${appUser.salons.join(',') || '00000000-0000-0000-0000-000000000000'})`);

        if (salonsData) {
          setSalons(salonsData);
          if (salonsData.length === 1) setSalon(salonsData[0]);
          else if (salon && !salonsData.find(s => s.id === salon.id)) setSalon(null);
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = db.subscribe(setIsSyncing);
    return unsub;
  }, []);

  const login = async (email: string, password?: string) => {
    if (!password) {
      // Fallback to Mock login if no password (for existing dev flow)
      const users = db.getUsers();
      const found = users.find(u => u.email === email);
      if (found) {
        setUser(found);
        const availableSalons = found.role === UserRole.OWNER
          ? db.getOrganizationSalons(found.id)
          : db.getSalons().filter(s => found.salons.includes(s.id));
        if (availableSalons.length === 1) setSalon(availableSalons[0]);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSalon(null);
  };

  const authValue = {
    user,
    salon,
    salons,
    isSyncing,
    login,
    logout,
    setSalon: (s: Salon | null) => setSalon(s),
    loading,
    refreshData: () => loadProfile(session?.user?.id)
  };

  return (
    <AuthContext.Provider value={authValue}>
      <HashRouter>
        {configMissing && <ConfigError />}
        {!configMissing && <SyncIndicator />}
        <Routes>
          <Route path="/book/:salonId?" element={<BookingScreen />} />
          <Route path="*" element={
            loading ? (
              <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !user ? <LoginScreen /> :
              !salon ? <SalonSelector /> :
                <Routes>
                  <Route path="/" element={<MainLayout><PageWrapper><DashboardScreen /></PageWrapper></MainLayout>} />
                  <Route path="/pos" element={<MainLayout><PageWrapper><POSScreen /></PageWrapper></MainLayout>} />
                  <Route path="/calendar" element={<MainLayout><PageWrapper><CalendarScreen /></PageWrapper></MainLayout>} />
                  <Route path="/history" element={<MainLayout><PageWrapper><HistoryScreen /></PageWrapper></MainLayout>} />
                  <Route path="/stock" element={<MainLayout><PageWrapper><StockScreen /></PageWrapper></MainLayout>} />
                  <Route path="/staff" element={<MainLayout><PageWrapper><StaffScreen /></PageWrapper></MainLayout>} />
                  <Route path="/salons" element={<MainLayout><PageWrapper><SalonsScreen /></PageWrapper></MainLayout>} />
                  <Route path="/services" element={<MainLayout><PageWrapper><ServicesScreen /></PageWrapper></MainLayout>} />
                  <Route path="/audit" element={<MainLayout><PageWrapper><AttendanceAuditScreen /></PageWrapper></MainLayout>} />
                  <Route path="/billing" element={<MainLayout><PageWrapper><BillingScreen /></PageWrapper></MainLayout>} />
                  <Route path="/security" element={<MainLayout><PageWrapper><SecurityCenter /></PageWrapper></MainLayout>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
          } />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
