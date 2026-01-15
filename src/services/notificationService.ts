import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface EmailOptions {
    to: string[];
    subject: string;
    html: string;
    uid?: string;
}

export const notificationService = {
    async sendEmail({ to, subject, html, uid }: EmailOptions) {
        try {
            await addDoc(collection(db, 'mail'), {
                to,
                message: {
                    subject,
                    html,
                },
                uid: uid || null,
                createdAt: serverTimestamp(),
            });
            console.log(`📧 Admin Email request created for: ${to.join(', ')}`);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    },

    /**
     * Sends an email to a user when their contribution is removed/moderated
     */
    async sendContentRemovedEmail(to: string, userName: string, contributionTitle: string, reason: string) {
        const firstName = userName?.split(' ')[0] || 'Cidadão';

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #EF4444;">Aviso de Moderação 🛡️</h2>
                <p>Olá <strong>${firstName}</strong>,</p>
                <p>Informamos que sua contribuição "<strong>${contributionTitle}</strong>" foi removida da nossa plataforma.</p>
                
                <div style="background-color: #FEF2F2; padding: 15px; border-radius: 8px; border-left: 4px solid #EF4444; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #991B1B;">Motivo da remoção:</p>
                    <p style="margin: 5px 0 0; font-size: 16px; font-weight: bold; color: #7F1D1D;">${reason}</p>
                </div>
                
                <p>O Guardião Nacional preza pela qualidade e respeito nas informações compartilhadas. Consulte nossos Termos de Uso para mais informações.</p>
                
                <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666;">
                    Equipe de Moderação<br>
                    Guardião Nacional
                </p>
            </div>
        `;

        return this.sendEmail({
            to: [to],
            subject: 'Aviso: Conteúdo Removido - Guardião Nacional',
            html
        });
    },

    /**
     * Sends an email to a user when their contribution is approved
     */
    async sendContentApprovedEmail(to: string, userName: string, contributionTitle: string) {
        const firstName = userName?.split(' ')[0] || 'Cidadão';

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #10B981;">Contribuição Aprovada! 🎉</h2>
                <p>Olá <strong>${firstName}</strong>,</p>
                <p>Temos ótimas notícias! Sua contribuição "<strong>${contributionTitle}</strong>" foi aprovada e já está disponível para toda a comunidade.</p>
                
                <div style="background-color: #ECFDF5; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981; margin: 20px 0;">
                    <p style="margin: 0; font-size: 16px; color: #047857;">
                        ✅ Sua participação faz a diferença!
                    </p>
                    <p style="margin: 10px 0 0; font-size: 14px; color: #065F46;">
                        Continue contribuindo para melhorar a nossa cidade.
                    </p>
                </div>
                
                <p>Agradecemos por ser um Guardião ativo e ajudar a fiscalizar o que acontece na sua comunidade.</p>
                
                <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666;">
                    Equipe Guardião Nacional<br>
                    <em>Juntos por cidades melhores</em>
                </p>
            </div>
        `;

        return this.sendEmail({
            to: [to],
            subject: '✅ Contribuição Aprovada - Guardião Nacional',
            html
        });
    }
};
