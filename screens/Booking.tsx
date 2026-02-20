
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/mockDb';
import { Salon, Service, User, UserRole } from '../types';
import { ICONS } from '../constants';
import { mailService } from '../services/mailService';

const BookingScreen = () => {
    const { salonId } = useParams();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const [clientInfo, setClientInfo] = useState({ name: '', phone: '', email: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Load salon if ID is in URL
    useEffect(() => {
        if (salonId) {
            const s = db.getSalons().find(x => x.id === salonId);
            if (s) setSelectedSalon(s);
        }
    }, [salonId]);

    const salons = useMemo(() => db.getSalons(), []);

    const services = useMemo(() => {
        if (!selectedSalon) return [];
        return db.getServices(selectedSalon.id);
    }, [selectedSalon]);

    const staff = useMemo(() => {
        if (!selectedSalon) return [];
        return db.getUsers().filter(u => u.salons.includes(selectedSalon.id) && u.isBookable);
    }, [selectedSalon]);

    const timeSlots = useMemo(() => {
        return ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
    }, []);

    const handleBooking = async () => {
        if (!selectedSalon || !selectedService || !selectedDate || !selectedTime || !clientInfo.name) return;

        setIsSubmitting(true);

        try {
            const appointment = {
                salonId: selectedSalon.id,
                serviceId: selectedService.id,
                serviceName: selectedService.name,
                staffId: selectedStaff?.id || 'any',
                staffName: selectedStaff?.name || 'Au choix',
                clientName: clientInfo.name,
                clientPhone: clientInfo.phone,
                startTime: `${selectedDate}T${selectedTime}:00`,
                duration: selectedService.duration,
                status: 'pending' as const
            };

            await db.addAppointment(appointment);

            // Envoi de l'email de confirmation
            if (clientInfo.email) {
                mailService.sendBookingConfirmation(clientInfo.email, {
                    clientName: clientInfo.name,
                    serviceName: selectedService.name,
                    date: new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
                    time: selectedTime,
                    salonName: selectedSalon.name
                }).catch(err => console.error("Erreur envoi email confirmation:", err));
            }

            setIsSuccess(true);
        } catch (error) {
            console.error("Erreur lors de la réservation:", error);
            alert("Une erreur est survenue lors de la réservation. Veuillez réessayer.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 rotate-6">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={4} /></svg>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">Confirmé !</h1>
                        <p className="text-slate-500 font-medium">Votre rendez-vous a bien été enregistré. Vous recevrez un SMS de confirmation sous peu.</p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 text-left space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prestation</span>
                            <span className="text-sm font-black text-slate-900 uppercase italic">{selectedService?.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</span>
                            <span className="text-sm font-black text-slate-900 uppercase italic">{new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {selectedTime}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salon</span>
                            <span className="text-sm font-black text-slate-900 uppercase italic">{selectedSalon?.name}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all"
                    >
                        Nouveau Rendez-vous
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Header Premium */}
            <div className="bg-slate-900 text-white pt-16 pb-32 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                <div className="max-w-2xl mx-auto relative z-10 text-center space-y-4">
                    <div className="inline-flex px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-[0.3em]">Réservation en ligne</div>
                    <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
                        {selectedSalon ? selectedSalon.name : 'SalonFlow Booking'}
                    </h1>
                    <p className="text-indigo-200 text-sm font-medium opacity-80">Ressortez avec style. Réservez votre moment privilégié en quelques clics.</p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto -mt-16 px-6 relative z-20">
                {/* Stepper Content */}
                <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 space-y-10">

                    {/* STEP 1: SERVICE */}
                    {step === 1 && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Étape 01</span>
                                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Le Soin</h2>
                                </div>
                                {!selectedSalon && <span className="text-[10px] font-black text-rose-500 uppercase">Sélectionnez un salon</span>}
                            </div>

                            {!selectedSalon ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {salons.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedSalon(s)}
                                            className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left hover:border-indigo-500 transition-all flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-black italic text-slate-900 uppercase">{s.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.address}</div>
                                            </div>
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-500 shadow-sm transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={3} /></svg>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {services.map(sv => (
                                        <button
                                            key={sv.id}
                                            onClick={() => { setSelectedService(sv); setStep(2); }}
                                            className={`p-6 border-2 rounded-[2.5rem] text-left transition-all flex justify-between items-center group ${selectedService?.id === sv.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-50 hover:border-slate-200'}`}
                                        >
                                            <div>
                                                <div className="font-black italic text-lg uppercase tracking-tight">{sv.name}</div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className={`text-[10px] font-black uppercase ${selectedService?.id === sv.id ? 'text-indigo-300' : 'text-slate-400'}`}>{sv.duration} min</span>
                                                    <span className={`text-[10px] font-black uppercase ${selectedService?.id === sv.id ? 'text-emerald-400' : 'text-emerald-600'}`}>{sv.price}€</span>
                                                </div>
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all ${selectedService?.id === sv.id ? 'bg-indigo-500 text-white rotate-6' : 'bg-slate-50 text-slate-300'}`}>
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3} /></svg>
                                            </div>
                                        </button>
                                    ))}
                                    <button onClick={() => setSelectedSalon(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors pt-4">← Changer de salon</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: STAFF & TIME */}
                    {step === 2 && (
                        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Étape 02</span>
                                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Le Moment</h2>
                                </div>
                                <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">Retour</button>
                            </div>

                            {/* Staff Choice */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Avec qui ?</label>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setSelectedStaff(null)}
                                        className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${!selectedStaff ? 'bg-slate-900 text-white shadow-xl rotate-2' : 'bg-slate-50 text-slate-400'}`}
                                    >
                                        Au choix
                                    </button>
                                    {staff.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedStaff(s)}
                                            className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedStaff?.id === s.id ? 'bg-indigo-600 text-white shadow-xl -rotate-2' : 'bg-slate-50 text-slate-400'}`}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Selection */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Le Jour</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black italic uppercase tracking-tighter outline-none focus:border-indigo-500 transition-all font-sans"
                                />
                            </div>

                            {/* Time Slots */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">L'Heure</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {timeSlots.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setSelectedTime(t)}
                                            className={`py-4 rounded-2xl font-black text-xs transition-all ${selectedTime === t ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                disabled={!selectedTime}
                                onClick={() => setStep(3)}
                                className="w-full py-5 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl disabled:opacity-30 active:scale-95 transition-all mt-8"
                            >
                                Continuer
                            </button>
                        </div>
                    )}

                    {/* STEP 3: CONTACT */}
                    {step === 3 && (
                        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Étape 03</span>
                                    <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">Le Contact</h2>
                                </div>
                                <button onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1">Retour</button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="clientName" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Prénom & Nom</label>
                                    <input
                                        id="clientName"
                                        type="text"
                                        placeholder="Ex: Jean Martin"
                                        value={clientInfo.name}
                                        onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-lg font-bold outline-none focus:border-slate-900 transition-all font-sans"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="clientPhone" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Numéro de Mobile</label>
                                    <input
                                        id="clientPhone"
                                        type="tel"
                                        placeholder="06 12 34 56 78"
                                        value={clientInfo.phone}
                                        onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-lg font-bold outline-none focus:border-slate-900 transition-all font-sans"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="clientEmail" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email (pour confirmation)</label>
                                    <input
                                        id="clientEmail"
                                        type="email"
                                        placeholder="votre@email.com"
                                        value={clientInfo.email}
                                        onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-lg font-bold outline-none focus:border-slate-900 transition-all font-sans"
                                    />
                                </div>
                            </div>

                            <div className="p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase">Récapitulatif</span>
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                                </div>
                                <div className="font-black italic text-slate-900 uppercase tracking-tight">
                                    {selectedService?.name} • {selectedTime} avec {selectedStaff?.name || 'Au choix'}
                                </div>
                            </div>

                            <button
                                disabled={isSubmitting || !clientInfo.name || !clientInfo.phone}
                                onClick={handleBooking}
                                className="w-full py-6 bg-slate-900 text-white rounded-[3rem] font-black uppercase tracking-[0.2em] text-sm shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        Traitement...
                                    </>
                                ) : (
                                    'Confirmer le Rendez-vous'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Info */}
            <div className="max-w-2xl mx-auto mt-12 px-6 text-center space-y-6">
                <div className="flex justify-center gap-6">
                    <div className="text-center">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Paiement</div>
                        <div className="text-[10px] font-black text-slate-900 uppercase">Sur place</div>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Annulation</div>
                        <div className="text-[10px] font-black text-slate-900 uppercase">24h à l'avance</div>
                    </div>
                </div>
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Sécurisé par SalonFlow Technology</p>
            </div>
        </div>
    );
};

export default BookingScreen;
