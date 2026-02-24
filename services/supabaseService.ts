
/**
 * supabaseService.ts
 * Service unifié Supabase — remplace mockDb.ts en production.
 * Expose la même API que mockDb pour une migration transparente.
 */

import { supabase } from './supabaseClient';
import {
    User, Salon, Service, Product, Sale, Appointment,
    UserRole, StaffSchedule, SaleItem
} from '../types';

// ============================================================
// HELPERS : mapper DB rows → types AppStore
// ============================================================

const mapSalon = (row: any): Salon => ({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    address: row.address || '',
    totalWorkstations: row.total_workstations || 4,
    bookingWorkstations: row.booking_workstations || 2,
});

const mapService = (row: any): Service => ({
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    price: parseFloat(row.price),
    duration: row.duration,
    isActive: row.is_active,
});

const mapProduct = (row: any): Product => ({
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    price: parseFloat(row.price),
    stockQty: row.stock_qty,
    alertThreshold: row.alert_threshold,
});

const mapSale = (row: any): Sale => ({
    id: row.id,
    salonId: row.salon_id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    items: row.items || [],
    totalCA: parseFloat(row.total_ca),
    totalProducts: parseFloat(row.total_products || 0),
    tipAmount: parseFloat(row.tip_amount || 0),
    paidAmount: parseFloat(row.paid_amount || 0),
    paymentMethod: row.payment_method,
    status: row.status,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
});

const mapAppointment = (row: any): Appointment => ({
    id: row.id,
    salonId: row.salon_id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    serviceId: row.service_id,
    serviceName: row.service_name,
    clientName: row.client_name,
    clientPhone: row.client_phone || '',
    startTime: row.start_time,
    duration: row.duration || 30,
    status: row.status,
});

const mapSchedule = (row: any): StaffSchedule => ({
    id: row.id,
    salonId: row.salon_id,
    staffId: row.staff_id,
    date: row.date,
});

// ============================================================
// SALONS
// ============================================================
export const sbGetSalons = async (ownerId: string): Promise<Salon[]> => {
    const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('owner_id', ownerId)
        .order('id', { ascending: true });
    if (error) { console.error('sbGetSalons:', error); return []; }
    return (data || []).map(mapSalon);
};

export const sbGetSalonById = async (salonId: string): Promise<Salon | null> => {
    const { data, error } = await supabase
        .from('salons')
        .select('*')
        .eq('id', salonId)
        .single();
    if (error) return null;
    return mapSalon(data);
};

export const sbCreateSalon = async (
    ownerId: string,
    payload: Partial<Salon>
): Promise<Salon | null> => {
    const { data, error } = await supabase
        .from('salons')
        .insert([{
            owner_id: ownerId,
            name: payload.name,
            address: payload.address || '',
            total_workstations: payload.totalWorkstations || 4,
            booking_workstations: payload.bookingWorkstations || 2,
        }])
        .select()
        .single();
    if (error) { console.error('sbCreateSalon:', error); return null; }
    return mapSalon(data);
};

export const sbUpdateSalon = async (
    salonId: string,
    payload: Partial<Salon>
): Promise<boolean> => {
    const { error } = await supabase
        .from('salons')
        .update({
            name: payload.name,
            address: payload.address,
            total_workstations: payload.totalWorkstations,
            booking_workstations: payload.bookingWorkstations,
        })
        .eq('id', salonId);
    if (error) { console.error('sbUpdateSalon:', error); return false; }
    return true;
};

export const sbDeleteSalon = async (salonId: string): Promise<boolean> => {
    const { error } = await supabase.from('salons').delete().eq('id', salonId);
    if (error) { console.error('sbDeleteSalon:', error); return false; }
    return true;
};

// ============================================================
// SERVICES
// ============================================================
export const sbGetServices = async (salonId: string): Promise<Service[]> => {
    const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('salon_id', salonId)
        .order('id', { ascending: true });
    if (error) {
        const msg = `sbGetServices Error: ${error.message}`;
        console.error(msg, error);
        alert(msg);
        return [];
    }
    return (data || []).map(mapService);
};

export const sbUpsertService = async (
    service: Partial<Service> & { salonId: string }
): Promise<Service | null> => {
    const payload: any = {
        salon_id: service.salonId,
        name: service.name,
        price: service.price,
        duration: service.duration || 30,
        is_active: service.isActive ?? true,
    };
    if (service.id) payload.id = service.id;

    const { data, error } = await supabase
        .from('services')
        .upsert([payload])
        .select()
        .single();
    if (error) { console.error('sbUpsertService:', error); return null; }
    return mapService(data);
};

export const sbDeleteService = async (serviceId: string): Promise<boolean> => {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) { console.error('sbDeleteService:', error); return false; }
    return true;
};

export const sbCloneServices = async (
    sourceSalonId: string,
    targetSalonIds: string[]
): Promise<void> => {
    const sourceServices = await sbGetServices(sourceSalonId);
    for (const targetId of targetSalonIds) {
        const rows = sourceServices.map(s => ({
            salon_id: targetId,
            name: s.name,
            price: s.price,
            duration: s.duration,
            is_active: s.isActive,
        }));
        if (rows.length > 0) {
            await supabase.from('services').insert(rows);
        }
    }
};

// ============================================================
// PRODUCTS (Stock)
// ============================================================
export const sbGetProducts = async (salonId: string): Promise<Product[]> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('salon_id', salonId)
        .order('id', { ascending: true });
    if (error) { console.error('sbGetProducts:', error); return []; }
    return (data || []).map(mapProduct);
};

export const sbUpsertProduct = async (
    product: Partial<Product> & { salonId: string }
): Promise<Product | null> => {
    const payload: any = {
        salon_id: product.salonId,
        name: product.name,
        price: product.price,
        stock_qty: product.stockQty ?? 0,
        alert_threshold: product.alertThreshold ?? 5,
    };
    if (product.id) payload.id = product.id;

    const { data, error } = await supabase
        .from('products')
        .upsert([payload])
        .select()
        .single();
    if (error) { console.error('sbUpsertProduct:', error); return null; }
    return mapProduct(data);
};

export const sbUpdateStock = async (
    productId: string,
    delta: number
): Promise<boolean> => {
    // Fetch current qty
    const { data: current } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', productId)
        .single();
    if (!current) return false;

    const newQty = Math.max(0, current.stock_qty + delta);
    const { error } = await supabase
        .from('products')
        .update({ stock_qty: newQty })
        .eq('id', productId);
    if (error) { console.error('sbUpdateStock:', error); return false; }
    return true;
};

export const sbDeleteProduct = async (productId: string): Promise<boolean> => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) { console.error('sbDeleteProduct:', error); return false; }
    return true;
};

// ============================================================
// SALES (Ventes / Caisse)
// ============================================================
export const sbGetSales = async (
    salonId: string,
    options?: { limit?: number; staffId?: string }
): Promise<Sale[]> => {
    let query = supabase
        .from('sales')
        .select('*')
        .eq('salon_id', salonId)
        .order('created_at', { ascending: false });

    if (options?.staffId) query = query.eq('staff_id', options.staffId);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) { console.error('sbGetSales:', error); return []; }
    return (data || []).map(mapSale);
};

export const sbGetAllSales = async (
    ownerSalonIds: string[],
    startDate?: string,
    endDate?: string
): Promise<Sale[]> => {
    if (ownerSalonIds.length === 0) return [];

    let query = supabase
        .from('sales')
        .select('*')
        .in('salon_id', ownerSalonIds)
        .eq('status', 'valid')
        .order('created_at', { ascending: false });

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

    const { data, error } = await query;
    if (error) { console.error('sbGetAllSales:', error); return []; }
    return (data || []).map(mapSale);
};

export const sbCreateSale = async (
    saleData: {
        salonId: string;
        staffId: string;
        staffName: string;
        items: SaleItem[];
        totalCA: number;
        totalProducts: number;
        tipAmount: number;
        paidAmount: number;
        paymentMethod: string;
    }
): Promise<Sale | null> => {
    const { data, error } = await supabase
        .from('sales')
        .insert([{
            salon_id: saleData.salonId,
            staff_id: saleData.staffId,
            staff_name: saleData.staffName,
            items: saleData.items,
            total_ca: saleData.totalCA,
            total_products: saleData.totalProducts,
            tip_amount: saleData.tipAmount,
            paid_amount: saleData.paidAmount,
            payment_method: saleData.paymentMethod,
            status: 'valid',
        }])
        .select()
        .single();
    if (error) {
        console.error('sbCreateSale Error:', error);
        throw new Error(error.message || 'Erreur DB lors de la vente');
    }
    return mapSale(data);
};

export const sbCancelSale = async (
    saleId: string,
    cancelReason: string
): Promise<boolean> => {
    const { error } = await supabase
        .from('sales')
        .update({ status: 'cancelled', cancel_reason: cancelReason })
        .eq('id', saleId);
    if (error) { console.error('sbCancelSale:', error); return false; }
    return true;
};

// ============================================================
// APPOINTMENTS (Rendez-vous)
// ============================================================
export const sbGetAppointments = async (salonId: string): Promise<Appointment[]> => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('salon_id', salonId)
        .order('start_time', { ascending: true });
    if (error) { console.error('sbGetAppointments:', error); return []; }
    return (data || []).map(mapAppointment);
};

export const sbCreateAppointment = async (
    apt: {
        salonId: string;
        staffId?: string;
        staffName?: string;
        serviceId: string;
        serviceName: string;
        clientName: string;
        clientPhone: string;
        startTime: string;
        duration: number;
    }
): Promise<Appointment | null> => {
    const { data, error } = await supabase
        .from('appointments')
        .insert([{
            salon_id: apt.salonId,
            staff_id: apt.staffId || 'any',
            staff_name: apt.staffName || 'Au choix',
            service_id: apt.serviceId,
            service_name: apt.serviceName,
            client_name: apt.clientName,
            client_phone: apt.clientPhone,
            start_time: apt.startTime,
            duration: apt.duration,
            status: 'pending',
        }])
        .select()
        .single();
    if (error) { console.error('sbCreateAppointment:', error); return null; }
    return mapAppointment(data);
};

export const sbUpdateAppointmentStatus = async (
    appointmentId: string,
    status: Appointment['status']
): Promise<boolean> => {
    const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);
    if (error) { console.error('sbUpdateAppointmentStatus:', error); return false; }
    return true;
};

// ============================================================
// STAFF SCHEDULES (Présences planifiées)
// ============================================================
export const sbGetSchedules = async (salonId: string): Promise<StaffSchedule[]> => {
    const { data, error } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('salon_id', salonId);
    if (error) { console.error('sbGetSchedules:', error); return []; }
    return (data || []).map(mapSchedule);
};

export const sbToggleStaffSchedule = async (
    salonId: string,
    staffId: string,
    date: string
): Promise<void> => {
    // Check if exists
    const { data: existing } = await supabase
        .from('staff_schedules')
        .select('id')
        .eq('salon_id', salonId)
        .eq('staff_id', staffId)
        .eq('date', date)
        .single();

    if (existing) {
        await supabase.from('staff_schedules').delete().eq('id', existing.id);
    } else {
        await supabase.from('staff_schedules').insert([{
            salon_id: salonId,
            staff_id: staffId,
            date,
        }]);
    }
};

// ============================================================
// PROFILE (Owner)
// ============================================================
export const sbGetProfile = async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) return null;
    return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role as UserRole,
        salons: data.salons || [],
        ownerId: data.owner_id,
        isBookable: true,
        canViewOwnSchedule: true,
        status: 'ACTIVE',
    };
};

export const sbUpdateProfile = async (
    userId: string,
    updates: { name?: string; salons?: string[] }
): Promise<boolean> => {
    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
    if (error) { console.error('sbUpdateProfile:', error); return false; }
    return true;
};

// Attach salon ID to the owner's profile
export const sbAddSalonToProfile = async (
    userId: string,
    salonId: string
): Promise<void> => {
    const { data: profile } = await supabase
        .from('profiles')
        .select('salons')
        .eq('id', userId)
        .single();
    if (!profile) return;
    const salons = [...(profile.salons || [])];
    if (!salons.includes(salonId)) {
        salons.push(salonId);
        await supabase.from('profiles').update({ salons }).eq('id', userId);
    }
};
