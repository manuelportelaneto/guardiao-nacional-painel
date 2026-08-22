/**
 * @fileoverview Serviço de Gestão de Servidores Públicos, Secretarias e Municípios (`governmentService.ts`).
 * 
 * Centraliza as operações no Firestore com estrita separação entre a base de Cidadãos (`users`)
 * e a base institucional de Servidores Governamentais (`government_officials`).
 */

import {
    collection,
    doc,
    getDoc,
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

    /**
     * Busca um convite governamental pelo Token / ID.
     */
    async getInviteByToken(token: string): Promise<GovernmentInvite | null> {
        try {
            const inviteDoc = await getDoc(doc(db, INVITES_COLLECTION, token));
            if (inviteDoc.exists()) {
                return { id: inviteDoc.id, ...inviteDoc.data() } as GovernmentInvite;
            }
        } catch (e) {
            console.warn('Erro ao consultar convite por token:', e);
        }
        return null;
    },

    /**
     * Reenvia o e-mail de ativação do convite governamental.
     */
    async resendInviteEmail(inviteId: string, actorUid: string): Promise<void> {
        const invite = await this.getInviteByToken(inviteId);
        if (!invite) throw new Error('Convite não encontrado.');
        if (invite.used) throw new Error('Este convite já foi utilizado.');

        const activationLink = `${window.location.origin}/activate-official?token=${invite.id}&email=${encodeURIComponent(invite.email)}`;
        await addDoc(collection(db, MAIL_COLLECTION), {
            to: [invite.email],
            message: {
                subject: `[Reenvio] [Guardião Nacional] Convite Institucional - ${invite.officialTitle} (${invite.cityName})`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h2 style="color: #0f172a;">Guardião Nacional - Acesso Governamental</h2>
                        <p>Olá, <strong>${invite.name}</strong>,</p>
                        <p>Este é o reenvio do seu convite para assumir o cargo de <strong>${invite.officialTitle}</strong> na jurisdição de <strong>${invite.cityName} - ${invite.state}</strong>.</p>
                        <p style="margin: 24px 0;">
                            <a href="${activationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                Ativar Minha Conta de Servidor
                            </a>
                        </p>
                        <p style="color: #64748b; font-size: 12px;">Este convite é de uso pessoal e intransferível.</p>
                    </div>
                `
            },
            createdAt: serverTimestamp()
        }).catch(err => console.warn('Erro ao enfileirar reenvio de e-mail:', err));

        await loggingService.logAudit(
            'USER_PROMOTE',
            actorUid,
            invite.email,
            { action: 'RESENT_GOVERNMENT_INVITE', inviteId }
        );
    },

    /**
     * Ativa a conta de um servidor governamental a partir do convite e cria seu usuário.
     */
    async activateOfficialAccount(
        token: string,
        authUid: string,
        userData: {
            name?: string;
            phone?: string;
            registrationNumber?: string;
        }
    ): Promise<GovernmentOfficial> {
        const invite = await this.getInviteByToken(token);
        if (!invite) throw new Error('Convite inválido ou não encontrado.');
        if (invite.used) throw new Error('Este convite já foi ativado anteriormente.');

        const now = new Date().toISOString();
        if (new Date(invite.expiresAt).getTime() < Date.now()) {
            throw new Error('Este convite expirou. Solicite um novo convite ao administrador do município.');
        }

        // 1. Marca o convite como utilizado
        await updateDoc(doc(db, INVITES_COLLECTION, token), {
            used: true,
            usedAt: now,
            usedByUid: authUid
        });

        // 2. Atualiza ou cria o registro oficial do servidor com status ATIVO
        const officialId = 'off_' + token;
        const officialRef = doc(db, OFFICIALS_COLLECTION, officialId);
        const officialDoc = await getDoc(officialRef);

        const officialData: GovernmentOfficial = {
            id: officialId,
            uid: authUid,
            name: userData.name || invite.name,
            email: invite.email,
            phone: userData.phone || '',
            registrationNumber: userData.registrationNumber || invite.registrationNumber || '',
            role: invite.role,
            officialTitle: invite.officialTitle,
            state: invite.state,
            cityId: invite.cityId,
            cityName: invite.cityName,
            departmentId: invite.departmentId,
            departmentName: invite.departmentName,
            permissions: invite.permissions,
            status: 'ATIVO',
            invitedByUid: invite.createdByUid,
            invitedAt: invite.createdAt,
            activatedAt: now,
            lastLoginAt: now
        };

        if (officialDoc.exists()) {
            await updateDoc(officialRef, {
                uid: authUid,
                name: officialData.name,
                phone: officialData.phone,
                registrationNumber: officialData.registrationNumber,
                status: 'ATIVO',
                activatedAt: now,
                lastLoginAt: now
            });
        } else {
            await setDoc(officialRef, officialData);
        }

        // 3. Atualiza a contagem de servidores ativos no município
        try {
            const munRef = doc(db, MUNICIPALITIES_COLLECTION, invite.cityId);
            const munSnap = await getDoc(munRef);
            if (munSnap.exists()) {
                const currentCount = munSnap.data()?.activeOfficialsCount || 0;
                await updateDoc(munRef, { activeOfficialsCount: currentCount + 1, updatedAt: now });
            }
        } catch (e) {
            console.warn('Não foi possível incrementar activeOfficialsCount:', e);
        }

        await loggingService.logAudit(
            'USER_ROLE_CHANGE',
            authUid,
            authUid,
            { action: 'ACTIVATED_GOVERNMENT_OFFICIAL_ACCOUNT', cityId: invite.cityId, role: invite.role, title: invite.officialTitle }
        );

        return officialData;
    },

    /**
     * Busca o registro oficial de um servidor governamental por UID ou E-mail.
     */
    async getOfficialByUidOrEmail(uid: string, email?: string | null): Promise<GovernmentOfficial | null> {
        try {
            // Busca direta por UID
            const qUid = query(collection(db, OFFICIALS_COLLECTION), where('uid', '==', uid), limit(1));
            const snapUid = await getDocs(qUid);
            if (!snapUid.empty) {
                return { id: snapUid.docs[0].id, ...snapUid.docs[0].data() } as GovernmentOfficial;
            }

            // Fallback por E-mail
            if (email) {
                const normalized = email.toLowerCase().trim();
                const qEmail = query(collection(db, OFFICIALS_COLLECTION), where('email', '==', normalized), limit(1));
                const snapEmail = await getDocs(qEmail);
                if (!snapEmail.empty) {
                    return { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() } as GovernmentOfficial;
                }
            }
        } catch (e) {
            console.warn('Erro ao consultar servidor governamental:', e);
        }
        return null;
    },

    /**
     * Adiciona uma nova secretaria a um município existente.
     */
    async addDepartment(
        cityId: string,
        department: Omit<GovernmentDepartment, 'id' | 'cityId' | 'state' | 'createdAt' | 'updatedAt'>,
        actorUid: string
    ): Promise<GovernmentDepartment> {
        const depSlug = department.slug || department.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
        const depId = `${cityId}_${depSlug}_${Date.now().toString(36)}`;

        // Busca o estado do município
        let state = 'SP';
        try {
            const munDoc = await getDoc(doc(db, MUNICIPALITIES_COLLECTION, cityId));
            if (munDoc.exists()) {
                state = munDoc.data()?.state || 'SP';
            }
        } catch (e) { }

        const newDep: GovernmentDepartment = {
            ...department,
            id: depId,
            cityId,
            state,
            slug: depSlug,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, DEPARTMENTS_COLLECTION, depId), newDep);

        // Atualiza contagem de secretarias no município
        try {
            const munRef = doc(db, MUNICIPALITIES_COLLECTION, cityId);
            const munSnap = await getDoc(munRef);
            if (munSnap.exists()) {
                const cur = munSnap.data()?.departmentsCount || 0;
                await updateDoc(munRef, { departmentsCount: cur + 1, updatedAt: new Date().toISOString() });
            }
        } catch (e) { }

        await loggingService.logAudit(
            'SETTINGS_UPDATE',
            actorUid,
            depId,
            { action: 'ADDED_DEPARTMENT', cityId, name: department.name, code: department.code }
        );

        return newDep;
    },

    /**
     * Atualiza dados e brasão de um município.
     */
    async updateMunicipality(cityId: string, data: Partial<GovernmentMunicipality>, actorUid: string): Promise<void> {
        await updateDoc(doc(db, MUNICIPALITIES_COLLECTION, cityId), {
            ...data,
            updatedAt: new Date().toISOString()
        });

        await loggingService.logAudit(
            'SETTINGS_UPDATE',
            actorUid,
            cityId,
            { action: 'UPDATED_MUNICIPALITY', ...data }
        );
    },

    /**
     * Exclui ou desativa uma secretaria municipal.
     */
    async deleteDepartment(departmentId: string, cityId: string, actorUid: string): Promise<void> {
        await updateDoc(doc(db, DEPARTMENTS_COLLECTION, departmentId), {
            active: false,
            updatedAt: new Date().toISOString()
        });

        await loggingService.logAudit(
            'SETTINGS_UPDATE',
            actorUid,
            departmentId,
            { action: 'DEACTIVATED_DEPARTMENT', cityId }
        );
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
                const deps = snap.docs.map(d => ({ id: d.id, ...d.data() })) as GovernmentDepartment[];
                return deps.filter(d => d.active !== false);
            }
        } catch (e) {
            console.warn('Erro ao buscar secretarias de ' + cityId, e);
        }
        return [];
    }
};
