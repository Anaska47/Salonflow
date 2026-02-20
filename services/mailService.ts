
/**
 * Service pour gérer l'envoi d'emails via Resend.
 * Permet d'envoyer des confirmations de réservation et des alertes de stock.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const API_KEY = import.meta.env.VITE_RESEND_API_KEY;

export const mailService = {
    /**
     * Envoi d'un email générique via l'API Resend
     */
    async sendEmail(to: string, subject: string, html: string) {
        if (!API_KEY) {
            console.warn("Clé API Resend manquante.");
            return;
        }

        try {
            const response = await fetch(RESEND_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
                body: JSON.stringify({
                    from: 'SalonFlow <onboarding@resend.dev>', // Note: Nécessite un domaine validé pour changer le 'from'
                    to: [to],
                    subject: subject,
                    html: html,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Erreur lors de l'envoi de l'email");
            }

            return await response.json();
        } catch (error) {
            console.error("Erreur MailService:", error);
            throw error;
        }
    },

    /**
     * Envoie une confirmation de rendez-vous élégante au client
     */
    async sendBookingConfirmation(clientEmail: string, details: {
        clientName: string,
        serviceName: string,
        date: string,
        time: string,
        salonName: string
    }) {
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; rounded: 20px;">
        <h1 style="color: #1e293b; text-transform: uppercase; font-style: italic;">Confirmation de Réservation</h1>
        <p>Bonjour <strong>${details.clientName}</strong>,</p>
        <p>Votre rendez-vous chez <strong>${details.salonName}</strong> est confirmé !</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 15px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Prestation :</strong> ${details.serviceName}</p>
          <p style="margin: 5px 0;"><strong>Date :</strong> ${details.date}</p>
          <p style="margin: 5px 0;"><strong>Heure :</strong> ${details.time}</p>
        </div>
        <p style="font-size: 12px; color: #64748b;">Merci de nous avoir choisi. À très bientôt !</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 10px; color: #94a3b8; text-align: center;">Propulsé par SalonFlow</p>
      </div>
    `;

        return this.sendEmail(clientEmail, `Confirmation de votre rendez-vous - ${details.salonName}`, html);
    },

    /**
     * Envoie une invitation de recrutement à un collaborateur
     */
    async sendStaffInvitation(email: string, details: { ownerName: string, salonName: string }) {
        const registerLink = `${window.location.origin}/#/login?invite=${encodeURIComponent(email)}`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #1e293b; border-radius: 30px;">
        <h1 style="color: #1e293b; text-transform: uppercase; font-style: italic;">Bienvenue dans l'équipe !</h1>
        <p>Bonjour,</p>
        <p><strong>${details.ownerName}</strong> vous invite à rejoindre l'équipe de <strong>${details.salonName}</strong> sur SalonFlow.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${registerLink}" style="background: #1e293b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 15px; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Créer mon compte collaborateur</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">En créant votre compte, vous pourrez consulter votre planning en temps réel et gérer vos prestations.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 10px; color: #94a3b8; text-align: center;">SalonFlow Suite Professionnelle</p>
      </div>
    `;

        return this.sendEmail(email, `Invitation à rejoindre ${details.salonName}`, html);
    }
};
