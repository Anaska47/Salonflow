
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Product, UserRole } from '../types';
import {
  sbGetProducts,
  sbUpsertProduct,
  sbUpdateStock,
  sbDeleteProduct,
} from '../services/supabaseService';

const StockScreen = () => {
  const { salon, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [delta, setDelta] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    if (!salon) return;
    setLoading(true);
    const data = await sbGetProducts(salon.id);
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [salon]);

  const handleUpdateStockDelta = async (p: Product, d: number) => {
    if (p.stockQty + d < 0) return;
    try {
      await sbUpdateStock(p.id, d);
      await loadProducts();
    } catch (e: any) {
      console.error('handleUpdateStockDelta error:', e);
      alert(`Erreur lors de la mise à jour du stock :\n${e.message}`);
    }
  };

  const handleSaveProduct = async () => {
    if (!editingProduct?.name || editingProduct?.price === undefined || editingProduct?.stockQty === undefined) return;

    try {
      const safeProduct = {
        ...editingProduct,
        salonId: salon!.id,
        price: Math.max(0, editingProduct.price),
        stockQty: Math.max(0, editingProduct.stockQty),
        alertThreshold: Math.max(0, editingProduct.alertThreshold || 0),
      };

      const result = await sbUpsertProduct(safeProduct as Product & { salonId: string });
      if (!result) throw new Error("sbUpsertProduct a retourné null");
      await loadProducts();
      setEditingProduct(null);
    } catch (e: any) {
      console.error('handleSaveProduct error:', e);
      alert(`Erreur lors de l'enregistrement du produit :\n${e.message}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Retirer définitivement ce produit de l'inventaire ?")) {
      try {
        await sbDeleteProduct(id);
        await loadProducts();
      } catch (e: any) {
        console.error('handleDeleteProduct error:', e);
        alert(`Erreur lors de la suppression du produit :\n${e.message}`);
      }
    }
  };

  const isOwnerOrManager = user?.role === UserRole.OWNER || user?.role === UserRole.MANAGER;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 space-y-8 animate-in slide-in-from-bottom duration-500">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mb-1">Logistique & Inventaire</div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Stock Salon</h1>
        </div>

        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64 group">
            <input
              type="text"
              placeholder="Rechercher une référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-sm"
            />
            <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={3} /></svg>
          </div>

          {isOwnerOrManager && (
            <button
              onClick={() => setEditingProduct({ name: '', price: 0, stockQty: 0, alertThreshold: 2 })}
              className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={3} /></svg>
              Nouvelle Réf.
            </button>
          )}
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {products
          .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(product => {
            const isCritical = product.stockQty <= product.alertThreshold;
            return (
              <div key={product.id} className={`bg-white rounded-[2.5rem] border transition-all duration-500 relative flex flex-col shadow-sm hover:shadow-2xl hover:-translate-y-1 ${isCritical ? 'border-rose-200' : 'border-slate-100'}`}>
                <div className="p-8 space-y-8 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isCritical ? 'text-rose-500' : 'text-slate-400'}`}>
                          {isCritical ? 'Réapprovisionner Urgent' : 'Niveau de Stock OK'}
                        </span>
                      </div>
                      <h3 className="font-black text-2xl text-slate-900 leading-tight tracking-tighter uppercase italic">{product.name}</h3>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">{product.price.toFixed(2)}€ <span className="text-slate-200 mx-2">|</span> ID: {product.id.slice(0, 5).toUpperCase()}</div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className={`text-5xl font-black italic tracking-tighter leading-none ${isCritical ? 'text-rose-500' : 'text-slate-900'}`}>{product.stockQty}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">Unités</div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Seuil Alerte</div>
                      <div className="text-sm font-black text-slate-900 italic mt-0.5">{product.alertThreshold} Unités</div>
                    </div>
                    <div className="h-1.5 w-24 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${isCritical ? 'bg-rose-500' : 'bg-slate-900'}`}
                        style={{ width: `${Math.min(100, (product.stockQty / (product.alertThreshold * 2)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 rounded-b-[2.5rem] space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      disabled={product.stockQty <= 0}
                      onClick={() => handleUpdateStockDelta(product, -1)}
                      className="h-16 flex items-center justify-center bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl font-black text-2xl transition-all border border-slate-100 hover:border-rose-100 shadow-sm active:scale-95 disabled:opacity-20"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" strokeWidth={4} /></svg>
                    </button>
                    <button
                      onClick={() => { setSelectedProductForStock(product); setDelta(0); }}
                      className="h-16 flex flex-col items-center justify-center bg-white hover:bg-slate-900 hover:text-white rounded-2xl transition-all border border-slate-100 shadow-sm active:scale-95 text-slate-600 group"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest">Ajuster</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStockDelta(product, 1)}
                      className="h-16 flex items-center justify-center bg-white hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 rounded-2xl font-black text-2xl transition-all border border-slate-100 hover:border-emerald-100 shadow-sm active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={4} /></svg>
                    </button>
                  </div>

                  {isOwnerOrManager && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="flex-1 py-4 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                      >
                        Détails de l'actif
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-4 bg-white text-rose-300 hover:text-rose-500 rounded-xl transition-all border border-slate-100 hover:border-rose-100 shadow-sm active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2.5} /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-end md:items-center justify-center z-[110] p-0 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in slide-in-from-bottom h-[90vh] md:h-auto overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{editingProduct.id ? 'Fiche Produit' : 'Nouveau Produit'}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Gestion des actifs et tarification</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-4 bg-slate-100 rounded-[1.5rem] text-slate-400 hover:text-slate-900 transition-colors"
                title="Fermer la fiche"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} /></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Désignation Commerciale</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  placeholder="Nom du produit"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Prix de Vente (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Seuil d'Alerte</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.alertThreshold}
                    onChange={(e) => setEditingProduct({ ...editingProduct, alertThreshold: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    placeholder="2"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="stockQtyInput" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Quantité Réelle en Stock</label>
                <div className="relative">
                  <input
                    id="stockQtyInput"
                    type="number"
                    min="0"
                    title="Quantité stock"
                    value={editingProduct.stockQty}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQty: Math.max(0, Number(e.target.value)) })}
                    className="w-full px-8 py-8 bg-slate-900 text-white rounded-[2rem] text-4xl font-black text-center outline-none focus:ring-8 focus:ring-slate-900/10 transition-all font-mono"
                  />
                  <div className="absolute top-1/2 left-6 -translate-y-1/2 text-white/20 font-black text-xs uppercase tracking-[0.2em] pointer-events-none">PCS</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={handleSaveProduct}
                className="flex-[2] py-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all"
              >
                Mettre à jour la fiche
              </button>
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProductForStock && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-end md:items-center justify-center z-[120] p-0 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[4rem] p-10 md:p-14 shadow-2xl space-y-10 animate-in slide-in-from-bottom border border-white/20">
            <div className="text-center space-y-3">
              <div className="inline-flex px-4 py-1.5 bg-slate-100 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Opération Logistique</div>
              <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Mouvement Stock</h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">{selectedProductForStock.name}</p>
            </div>

            <div className="flex items-center justify-between gap-10 p-10 bg-slate-50 rounded-[3rem] border border-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)]"></div>

              <button
                title="Diminuer"
                disabled={(selectedProductForStock.stockQty + delta) <= 0}
                onClick={() => setDelta(prev => prev - 1)}
                className="w-20 h-20 rounded-[2rem] bg-white border-2 border-slate-200 text-4xl font-black hover:border-rose-500 hover:text-rose-500 transition-all shadow-xl active:scale-90 disabled:opacity-20 flex items-center justify-center relative z-10"
              >
                -
              </button>

              <div className="flex flex-col items-center relative z-10 w-32">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Variation</div>
                <div className={`text-7xl font-black italic tracking-tighter transition-all duration-300 transform ${delta === 0 ? 'text-slate-300 scale-90' : delta > 0 ? 'text-emerald-500 scale-110' : 'text-rose-500 scale-110'}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </div>
              </div>

              <button
                title="Augmenter"
                onClick={() => setDelta(prev => prev + 1)}
                className="w-20 h-20 rounded-[2rem] bg-white border-2 border-slate-200 text-4xl font-black hover:border-emerald-500 hover:text-emerald-500 transition-all shadow-xl active:scale-90 flex items-center justify-center relative z-10"
              >
                +
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={async () => {
                  await sbUpdateStock(selectedProductForStock.id, delta);
                  await loadProducts();
                  setSelectedProductForStock(null);
                  setDelta(0);
                }}
                className="w-full py-7 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-[11px] shadow-3xl shadow-slate-900/30 active:scale-95 transition-all"
              >
                Confirmer le mouvement (Total: {selectedProductForStock.stockQty + delta})
              </button>
              <button
                onClick={() => { setSelectedProductForStock(null); setDelta(0); }}
                className="w-full py-6 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 transition-colors"
              >
                Annuler l'opération
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockScreen;
