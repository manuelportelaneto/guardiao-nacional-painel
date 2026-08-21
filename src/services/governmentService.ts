/**
 * @fileoverview Serviço de Gestão de Servidores Públicos, Secretarias e Municípios (`governmentService.ts`).
 * 
 * Centraliza as operações no Firestore com estrita separação entre a base de Cidadãos (`users`)
 * e a base institucional de Servidores Governamentais (`government_officials`).
 */

import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type {
    GovernmentOfficial,
    GovernmentDepartment,
    GovernmentMunicipality,
    GovernmentInvite,
    OfficialStatus
} from '../types/government';
import { loggingService } from './loggingService';

const OFFICIALS_COLLECTION = 'government_officials';
const INVITES_COLLECTION = 'government_invites';
const MUNICIPALITIES_COLLECTION = 'government_municipalities';
const DEPARTMENTS_COLLECTION = 'government_departments';
const MAIL_COLLECTION = 'mail'; // Coleção padrão da extensão Firebase Trigger Email

export const governmentService = {
    // ─── 1. SERVIDORES PÚBLICOS ───────────────────────────────────────────────

    /**
     * Lista servidores públicos com filtros federativos opcionais.
     */
    async getOfficials(filters?: {
        state?: string;
        cityId?: string;
        departmentId?: string;
        status?: OfficialStatus;
        limitCount?: number;
    }): Promise<GovernmentOfficial[]> {
        try {
            let q = query(
                collection(db, OFFICIALS_COLLECTION),
                orderBy('invitedAt', 'desc'),
                limit(filters?.limitCount || 50)
            );

            if (filters?.cityId) {
                q = query(
                    collection(db, OFFICIALS_COLLECTION),
                    where('cityId', '==', filters.cityId),
                    limit(filters?.limitCount || 50)
                );
            } else if (filters?.state) {
                q = query(
                    collection(db, OFFICIALS_COLLECTION),
                    where('state', '==', filters.state),
                    limit(filters?.limitCount || 50)
                );
            }

            const snap = await getDocs(q);
            const officials = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as GovernmentOfficial[];

            return officials;
        } catch (error) {
            console.warn('Fallback ao consultar servidores públicos:', error);
            // Em caso de ausência de índice composto, busca sem ordenação
            const snap = await getDocs(collection(db, OFFICIALS_COLLECTION));
            let results = snap.docs.map(d => ({ id: d.id, ...d.data() })) as GovernmentOfficial[];
            if (filters?.cityId) results = results.filter(o => o.cityId === filters.cityId);
            if (filters?.state) results = results.filter(o => o.state === filters.state);
            return results;
        }
    },

    /**
     * Cria ou atualiza um servidor público.
     */
    async saveOfficial(official: GovernmentOfficial, actorUid: string): Promise<void> {
        const officialRef = doc(db, OFFICIALS_COLLECTION, official.id);
        await setDoc(officialRef, {
            ...official,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        await loggingService.logAudit(
            'USER_ROLE_CHANGE',
            actorUid,
            official.id,
            { action: 'SAVED_GOVERNMENT_OFFICIAL', name: official.name, title: official.officialTitle, city: official.cityName }
        );
    },

    /**
     * Altera o status funcional de um servidor (ATIVO, SUSPENSO, DESLIGADO).
     */
    async updateOfficialStatus(officialId: string, status: OfficialStatus, actorUid: string): Promise<void> {
        const officialRef = doc(db, OFFICIALS_COLLECTION, officialId);
        await updateDoc(officialRef, {
            status,
            statusUpdatedAt: new Date().toISOString(),
            statusUpdatedBy: actorUid
        });

        await loggingService.logAudit(
            'USER_ROLE_CHANGE',
            actorUid,
            officialId,
            { action: 'UPDATED_OFFICIAL_STATUS', newStatus: status }
        );
    },

    // ─── 2. CONVITES DE SERVIDORES COM ENVIO DE E-MAIL ─────────────────────────

    /**
     * Gera um token de convite institucional e dispara e-mail de ativação.
     */
    async createAndSendInvite(
        data: Omit<GovernmentInvite, 'id' | 'createdAt' | 'used' | 'expiresAt'>,
        actorUid: string
    ): Promise<GovernmentInvite> {
        const inviteId = 'inv_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias de validade

        const invite: GovernmentInvite = {
            ...data,
            id: inviteId,
            expiresAt,
            used: false,
            createdAt: new Date().toISOString()
        };

        // Salva na coleção de convites
        await setDoc(doc(db, INVITES_COLLECTION, inviteId), invite);

        // Cria o registro prévio do servidor com status PENDENTE_CONVITE
        const officialId = 'off_' + inviteId;
        const newOfficial: GovernmentOfficial = {
            id: officialId,
            registrationNumber: data.registrationNumber || '',
            name: data.name,
            email: data.email,
            role: data.role,
            officialTitle: data.officialTitle,
            state: data.state,
            cityId: data.cityId,
            cityName: data.cityName,
            departmentId: data.departmentId,
            departmentName: data.departmentName,
            permissions: data.permissions,
            status: 'PENDENTE_CONVITE',
            invitedByUid: actorUid,
            invitedAt: new Date().toISOString()
        };

        await setDoc(doc(db, OFFICIALS_COLLECTION, officialId), newOfficial);

        // Fila de E-mail via Trigger Email do Firebase
        try {
            const activationLink = `${window.location.origin}/activate-official?token=${inviteId}&email=${encodeURIComponent(data.email)}`;
            await addDoc(collection(db, MAIL_COLLECTION), {
                to: [data.email],
                message: {
                    subject: `[Guardião Nacional] Convite Institucional - ${data.officialTitle} (${data.cityName})`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
                            <h2 style="color: #0f172a;">Guardião Nacional - Acesso Governamental</h2>
                            <p>Olá, <strong>${data.name}</strong>,</p>
                            <p>Você foi convidado para assumir o cargo de <strong>${data.officialTitle}</strong> na jurisdição de <strong>${data.cityName} - ${data.state}</strong>.</p>
                            <p style="margin: 24px 0;">
                                <a href="${activationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                    Ativar Minha Conta de Servidor
                                </a>
                            </p>
                            <p style="color: #64748b; font-size: 12px;">Este convite expira em 7 dias. Caso não tenha solicitado este acesso, favor ignorar este e-mail.</p>
                        </div>
                    `
                },
                createdAt: serverTimestamp()
            });
        } catch (mailError) {
            console.warn('Aviso: Trigger Email queue não gravou ou está em modo simulado:', mailError);
        }

        await loggingService.logAudit(
            'USER_PROMOTE',
            actorUid,
            data.email,
            { action: 'CREATED_GOVERNMENT_INVITE', title: data.officialTitle, city: data.cityName }
        );

        return invite;
    },

    // ─── 3. MUNICÍPIOS E SECRETARIAS PERSONALIZADAS DO ZERO ─────────────────────

    /**
     * Lista todos os municípios cadastrados na governança.
     */
    async getMunicipalities(): Promise<GovernmentMunicipality[]> {
        try {
            const snap = await getDocs(collection(db, MUNICIPALITIES_COLLECTION));
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() })) as GovernmentMunicipality[];
            }
        } catch (e) {
            console.warn('Carregando municípios padrão:', e);
        }

        // Fallback inicial com as 8 cidades ativas
        return [
            { id: 'sao-paulo', name: 'São Paulo', state: 'SP', contractType: 'MONITORAMENTO_CIVICO', departmentsCount: 4, activeOfficialsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'santo-andre', name: 'Santo André', state: 'SP', contractType: 'MONITORAMENTO_CIVICO', departmentsCount: 3, activeOfficialsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'sao-bernardo', name: 'São Bernardo do Campo', state: 'SP', contractType: 'MONITORAMENTO_CIVICO', departmentsCount: 3, activeOfficialsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'sao-caetano', name: 'São Caetano do Sul', state: 'SP', contractType: 'MONITORAMENTO_CIVICO', departmentsCount: 2, activeOfficialsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'diadema', name: 'Diadema', state: 'SP', contractType: 'MONITORAMENTO_CIVICO', departmentsCount: 2, activeOfficialsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'maua', name: 'Mauá', state: 'SP', contractType: 'MONITORAMENTO_CIVICO', departmentsCount: 3, activeOfficialsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'ribeirao-pires', name: 'Ribeirão Pires', state: 'SP', contractType: 'MONITORAMENTO_CIVICO', departmentsCount: 2, activeOfficialsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: 'rio-grande-da-serra', name: 'Rio Grande da Serra', state: 'SP', contractType: 'MONITORAMENTO_CIVICO', departmentsCount: 2, activeOfficialsCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ];
    },

    /**
     * Cadastra um novo município do zero e inicializa suas secretarias customizadas.
     */
    async createMunicipalityWithDepartments(
        municipality: Omit<GovernmentMunicipality, 'departmentsCount' | 'activeOfficialsCount' | 'createdAt' | 'updatedAt'>,
        departments: Omit<GovernmentDepartment, 'id' | 'cityId' | 'state' | 'createdAt' | 'updatedAt'>[],
        actorUid: string
    ): Promise<void> {
        const cityId = municipality.id || municipality.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

        // 1. Salva Município
        const munDoc: GovernmentMunicipality = {
            ...municipality,
            id: cityId,
            departmentsCount: departments.length,
            activeOfficialsCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, MUNICIPALITIES_COLLECTION, cityId), munDoc);

        // 2. Salva cada secretaria criada do zero
        for (const dep of departments) {
            const depSlug = dep.slug || dep.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
            const depId = `${cityId}_${depSlug}`;
            const departmentDoc: GovernmentDepartment = {
                ...dep,
                id: depId,
                cityId,
                state: municipality.state,
                slug: depSlug,
                active: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, DEPARTMENTS_COLLECTION, depId), departmentDoc);
        }

        await loggingService.logAudit(
            'SETTINGS_UPDATE',
            actorUid,
            cityId,
            { action: 'ONBOARDED_NEW_MUNICIPALITY', name: municipality.name, state: municipality.state, departmentsCount: departments.length }
        );
    },

    /**
     * Lista secretarias de um município específico.
     */
    async getDepartmentsByCity(cityId: string): Promise<GovernmentDepartment[]> {
        try {
            const q = query(collection(db, DEPARTMENTS_COLLECTION), where('cityId', '==', cityId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() })) as GovernmentDepartment[];
            }
        } catch (e) {
            console.warn('Erro ao buscar secretarias de ' + cityId, e);
        }
        return [];
    }
};
