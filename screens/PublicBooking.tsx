
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Salon, Service } from '../types';
import { sbGetSalonById, sbGetServices, sbCreateAppointment } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

const PublicBookingScreen = () => {
  const { salonId } = useParams<{ salonId: string }>();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState("");
  const [clientInfo, setClientInfo] = useState({ name: "", phone: "" });
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!salonId) return;
      const s = await sbGetSalonById(salonId);
      if (s) {
        setSalon(s);
        const [svcs, staffRes] = await Promise.all([
          sbGetServices(s.id),
          supabase.from('staff').select('id, name, is_bookable, salons').eq('is_bookable', true),
        ]);
        setServices(svcs.filter(sv => sv.isActive));
        const staffInSalon = (staffRes.data || [])
          .filter((u: any) => (u.salons || []).includes(s.id))
          .map((u: any) => ({ id: u.id, name: u.name }));
        setStaff(staffInSalon);
      }
    };
    loadData();
  }, [salonId]);

  const handleBooking = async () => {
    if (!salon || !selectedService || !selectedStaff || !selectedTime || !clientInfo.name) return;

    await sbCreateAppointment({
      salonId: salon.id,
      staffId: selectedStaff.id,
      staffName: selectedStaff.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      clientName: clientInfo.name,
      clientPhone: clientInfo.phone,
      startTime: `${selectedDate}T${selectedTime}:00`,
      duration: selectedService.duration || 30,
    });

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-sm space-y-6">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={4} /></svg>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">Réservation Transmise</h1>
          <p className="text-white/60 font-medium">Votre demande pour <span className="text-white">{selectedService?.name}</span> avec <span className="text-white">{selectedStaff?.name}</span> est en attente de validation.</p>
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Prendre un autre RDV</button>
        </div>
      </div>
    );
  }

  if (!salon) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-black uppercase italic tracking-[0.5em] animate-pulse">Chargement SalonFlow...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white p-6 pb-12 rounded-b-[3rem] shadow-xl">
        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-2">Réservation en ligne sécurisée</div>
        <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">{salon.name}</h1>
        <div className="text-[10px] font-bold text-white/40 uppercase mt-2">{salon.address}</div>
      </header>

      <div className="-mt-8 px-4 flex-1 pb-24">
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 space-y-8 max-w-xl mx-auto">

          <div className="flex justify-between px-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 mx-1 rounded-full transition-all ${step >= i ? 'bg-slate-900' : 'bg-slate-100'}`}></div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">1. Le Service</h2>
              <div className="grid grid-cols-1 gap-3">
                {services.map(s => (
                  <button key={s.id} onClick={() => { setSelectedService(s); setStep(2); }} className="flex justify-between items-center p-5 bg-slate-50 border border-slate-100 rounded-2xl text-left hover:border-slate-900 transition-all">
                    <div className="font-black text-sm uppercase">{s.name}</div>
                    <div className="font-black text-slate-900 italic text-lg">{s.price}€</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">2. Votre Coiffeur</h2>
              {staff.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-bold uppercase text-xs italic">Aucun coiffeur n'est actuellement disponible en ligne.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {staff.map(u => (
                    <button key={u.id} onClick={() => { setSelectedStaff(u); setStep(3); }} className="flex flex-col items-center p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center hover:border-slate-900 transition-all">
                      <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-black text-xl mb-3 shadow-inner">{u.name.charAt(0)}</div>
                      <div className="font-black text-xs uppercase">{u.name}</div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep(1)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest italic underline">Retour</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">3. Quand ?</h2>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
              <div className="grid grid-cols-4 gap-2">
                {["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map(t => (
                  <button key={t} onClick={() => { setSelectedTime(t); setStep(4); }} className={`py-3 rounded-xl font-black text-[10px] transition-all ${selectedTime === t ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{t}</button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest italic underline">Retour</button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">4. Validation</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Nom Complet" value={clientInfo.name} onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
                <input type="tel" placeholder="Mobile" value={clientInfo.phone} onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none" />
              </div>

              <div className="p-6 bg-slate-900 rounded-3xl space-y-3 shadow-xl text-white">
                <div className="text-[10px] font-black uppercase text-white/40">Détails RDV</div>
                <div className="flex justify-between text-base font-black italic">
                  <span>{selectedService?.name}</span>
                  <span>{selectedService?.price}€</span>
                </div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase italic">Avec {selectedStaff?.name} le {new Date(selectedDate).toLocaleDateString()} à {selectedTime}</div>
              </div>

              <button
                onClick={handleBooking}
                disabled={!clientInfo.name || !clientInfo.phone}
                className="w-full py-5 bg-emerald-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all disabled:opacity-20"
              >
                Confirmer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicBookingScreen;
