
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { errorLogService } from '../services/errorLogService';
import { ItemType, PaymentMethod, Service, Product } from '../types';

const POSScreen = () => {
  const { user, salon } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [tip, setTip] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTotal, setLastTotal] = useState(0);
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customName, setCustomName] = useState("Prestation Spéciale");
  const [customPrice, setCustomPrice] = useState("");

  useEffect(() => {
    if (salon) {
      setServices(db.getServices(salon.id).filter(s => s.isActive));
      setProducts(db.getProducts(salon.id));
    }
  }, [salon]);

  const totals = useMemo(() => {
    return cart.reduce((acc, item) => {
      if (item.type === ItemType.SERVICE) acc.services += item.lineTotal;
      else acc.products += item.lineTotal;
      return acc;
    }, { services: 0, products: 0 });
  }, [cart]);

  const totalTicket = useMemo(() => totals.services + totals.products, [totals]);

  const addToCart = (item: Service | Product, type: ItemType) => {
    if (type === ItemType.PRODUCT && (item as Product).stockQty <= 0) {
      alert("Alerte: Rupture de stock pour ce produit.");
      return;
    }

    const existing = cart.find(i => i.refId === item.id && i.type === type);
    if (existing) {
      setCart(cart.map(i => i.refId === item.id && i.type === type ? { ...i, qty: i.qty + 1, lineTotal: (i.qty + 1) * i.unitPrice } : i));
    } else {
      setCart([...cart, {
        type,
        refId: item.id,
        name: item.name,
        unitPrice: item.price,
        qty: 1,
        lineTotal: item.price
      }]);
    }
  };

  const removeFromCart = (refId: string, type: ItemType) => {
    setCart(cart.filter(i => !(i.refId === refId && i.type === type)));
  };

  const updateCartQty = (refId: string, type: ItemType, delta: number) => {
    setCart(cart.map(i => {
      if (i.refId === refId && i.type === type) {
        const newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty, lineTotal: newQty * i.unitPrice };
      }
      return i;
    }));
  };

  const addCustomItem = () => {
    const price = parseFloat(customPrice);
    if (!price || !customName) return;

    const id = 'custom-' + Date.now();
    setCart([...cart, {
      type: ItemType.SERVICE,
      refId: id,
      name: customName,
      unitPrice: price,
      qty: 1,
      lineTotal: price
    }]);
    setCustomPrice("");
    setShowCustomItem(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const finalTip = Math.max(0, parseFloat(tip) || 0);
      const finalTotal = totalTicket + finalTip;

      const newSale = await db.addSale({
        salonId: salon!.id,
        staffId: user!.id,
        staffName: user!.name,
        items: cart,
        totalCA: totals.services,
        totalProducts: totals.products,
        tipAmount: finalTip,
        paidAmount: finalTotal,
        paymentMethod,
        status: 'valid'
      });

      errorLogService.log('info', `Vente effectuée`, `ID: ${newSale.id}`, user?.name, salon?.id);

      setLastTotal(finalTotal);
      setCart([]);
      setTip("0");
      setShowCheckout(false);
      setShowSuccess(true);
      // Refresh stock
      setProducts(db.getProducts(salon!.id));
    } catch (e: any) {
      errorLogService.log('critical', `Erreur encaissement`, e.message, user?.name, salon?.id);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 h-full min-h-[calc(100vh-100px)]">
      {/* Catalog Area */}
      <div className="flex-1 flex flex-col gap-8 overflow-hidden">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Caisse</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salon Actif : <span className="text-slate-900">{salon?.name}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCustomItem(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95 transition-all"
            >
              + Prix Libre
            </button>
            <button onClick={() => setCart([])} className="px-4 py-3 bg-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all">Vider Panier</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-12 pr-2">
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Services Coiffure</h2>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => addToCart(s, ItemType.SERVICE)}
                  className="p-5 bg-white border border-slate-200 rounded-[2rem] hover:border-slate-900 hover:shadow-xl transition-all text-left flex flex-col justify-between h-36 active:scale-95 group"
                >
                  <div className="font-black text-xs uppercase leading-tight group-hover:text-indigo-600 transition-colors">{s.name}</div>
                  <div className="text-2xl font-black italic tracking-tighter">{s.price}€</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Boutique & Soins</h2>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p, ItemType.PRODUCT)}
                  className="p-5 bg-white border border-slate-200 rounded-[2rem] hover:border-slate-900 hover:shadow-xl transition-all text-left flex flex-col justify-between h-36 active:scale-95 group relative overflow-hidden"
                >
                  <div className="font-black text-xs uppercase leading-tight truncate">{p.name}</div>
                  <div className="flex justify-between items-end relative z-10">
                    <div className="text-2xl font-black italic tracking-tighter">{p.price}€</div>
                    <div className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${p.stockQty <= 2 ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>Stock: {p.stockQty}</div>
                  </div>
                  {p.stockQty <= 0 && <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-black text-[9px] uppercase tracking-widest text-rose-500 rotate-12">Épuisé</div>}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Cart Area */}
      <div className="w-full lg:w-[400px] bg-white rounded-[3rem] border border-slate-200 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
        <div className="p-8 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Ticket Client</h2>
            <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{cart.length} Article{cart.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth={1.5} /></svg>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">Panier Vide</span>
            </div>
          ) : (
            <div className="space-y-6">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center group animate-in slide-in-from-right duration-300">
                  <div className="flex-1">
                    <div className="text-xs font-black uppercase tracking-tight text-slate-900">{item.name}</div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                          onClick={() => updateCartQty(item.refId, item.type, -1)}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-black transition-all ${item.qty <= 1 ? 'text-slate-200 pointer-events-none' : 'text-slate-500 hover:bg-white active:scale-90 hover:shadow-sm'}`}
                        >
                          -
                        </button>
                        <span className="w-8 text-[10px] font-black text-center text-slate-900">{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.refId, item.type, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-xs font-black text-slate-500 hover:bg-white active:scale-90 hover:shadow-sm transition-all"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                        @ {item.unitPrice}€
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-xl font-black italic tracking-tighter text-slate-900">{item.lineTotal}€</div>
                    <button
                      onClick={() => removeFromCart(item.refId, item.type)}
                      className="p-2 bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                      title="Supprimer la ligne"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-900 space-y-6 shrink-0 relative">
          <div className="flex justify-between items-end text-white">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Total Net</span>
              <div className="text-4xl font-black italic tracking-tighter leading-none">{totalTicket}€</div>
            </div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">TVA 20% Incl.</div>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
            className="w-full py-6 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            Passer au Règlement
          </button>
        </div>
      </div>

      {/* Checkout Modal - Refined for speed */}
      {showCheckout && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-end md:items-center justify-center z-[110] p-0 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-t-[4rem] md:rounded-[4rem] p-10 md:p-14 shadow-3xl space-y-10 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Paiement</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Validation de la transaction</p>
              </div>
              <button onClick={() => setShowCheckout(false)} className="p-4 bg-slate-100 rounded-2xl text-slate-400 hover:bg-slate-200 transition-colors active:scale-90">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                {[PaymentMethod.CARD, PaymentMethod.CASH].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-8 rounded-3xl font-black text-[10px] uppercase tracking-widest border-2 transition-all flex flex-col items-center gap-3 ${paymentMethod === method ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    {method === PaymentMethod.CARD ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75-10.5h16.5a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25H3.75a2.25 2.25 0 01-2.25-2.25v-9a2.25 2.25 0 012.25-2.25z" strokeWidth={2} /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2} /></svg>}
                    {method}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pourboire (€)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={tip}
                    onChange={(e) => setTip(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                    className="w-full pl-10 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-2xl font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="0.00"
                  />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300">€</span>
                </div>
              </div>

              <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 flex justify-between items-center shadow-inner">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50">Montant Total à Percevoir</div>
                  <div className="text-[10px] font-bold text-emerald-600 uppercase">Dont {tip || 0}€ de PB</div>
                </div>
                <div className="text-4xl font-black italic tracking-tighter text-emerald-600">{(totalTicket + (parseFloat(tip) || 0)).toFixed(2)}€</div>
              </div>
            </div>

            <button onClick={handleCheckout} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[13px] shadow-3xl shadow-slate-900/30 active:scale-95 transition-all">
              Finaliser la transaction
            </button>
          </div>
        </div>
      )}

      {/* Custom Item Modal */}
      {showCustomItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-3xl space-y-8 animate-in zoom-in duration-300">
            <div className="space-y-1">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Prix Libre</h3>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Ajouter un service spécial</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Libellé</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Montant (€)</label>
                <input
                  type="number"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500/10"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={addCustomItem}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-200"
              >
                Ajouter au ticket
              </button>
              <button
                onClick={() => setShowCustomItem(false)}
                className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[9px]"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success View */}
      {showSuccess && (
        <div className="fixed inset-0 bg-emerald-500 flex items-center justify-center z-[200] p-6 text-center animate-in fade-in duration-500">
          <div className="max-w-sm space-y-10">
            <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-3xl rotate-6 animate-bounce">
              <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth={5} /></svg>
            </div>
            <div className="space-y-4">
              <h3 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">Validé !</h3>
              <p className="text-white/70 font-black text-[11px] uppercase tracking-[0.4em]">Ticket encaissé : {lastTotal}€</p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all">Ticket suivant</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSScreen;
