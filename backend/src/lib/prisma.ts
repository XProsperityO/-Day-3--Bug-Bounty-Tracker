import { PrismaClient } from '@prisma/client';

// If PRISMA_MOCK=1 is set, export a small in-memory mock of the Prisma client
// that implements only the model methods used by the integration tests and
// route code. This lets integration tests run without a real Postgres.
let prismaInternal: unknown;

if (process.env.PRISMA_MOCK === '1') {
	type User = { id: string; email: string; passwordHash: string; displayName?: string | null; role?: string; totpSecret?: string | null; totpEnabled?: boolean; plan?: string | null; subscriptionId?: string | null; customerId?: string | null };
	type Refresh = { userId: string; tokenHash: string; expiresAt: Date; revoked?: boolean };
	type Vuln = { id: string; userId: string; title: string; description?: string; status?: string; createdAt?: Date; updatedAt?: Date };
	type Note = { id: string; userId: string; content: string; createdAt?: Date };

	const state = {
		users: [] as User[],
		refreshTokens: [] as Refresh[],
		vulnerabilities: [] as Vuln[],
		notes: [] as Note[],
		idCounter: 1,
	};

		const nextId = () => String(state.idCounter++);

		const mock = {
		user: {
			async findUnique({ where }: any) {
				if (where.email) return state.users.find(u => u.email === where.email) ?? null;
				if (where.id) return state.users.find(u => u.id === where.id) ?? null;
				return null;
			},
			async findFirst({ where }: any) {
				if (!where) return state.users[0] ?? null;
				const keys = Object.keys(where);
				return state.users.find(u => keys.every(k => (u as any)[k] === (where as any)[k])) ?? null;
			},
			async create({ data }: any) {
				const u: User = { id: nextId(), email: data.email, passwordHash: data.passwordHash, displayName: data.displayName ?? null, role: data.role ?? 'user', totpEnabled: false };
				state.users.push(u);
				return u;
			},
			async update({ where, data }: any) {
				const u = state.users.find(x => x.id === where.id);
				if (!u) throw new Error('user not found');
				Object.assign(u, data);
				return u;
			}
		},
		refreshToken: {
			async create({ data }: any) {
				const r: Refresh = { userId: data.userId, tokenHash: data.tokenHash, expiresAt: data.expiresAt, revoked: false };
				state.refreshTokens.push(r);
				return r;
			},
			async findUnique({ where }: any) {
				return state.refreshTokens.find(r => r.tokenHash === where.tokenHash) ?? null;
			},
			async update({ where, data }: any) {
				const r = state.refreshTokens.find(x => x.tokenHash === where.tokenHash);
				if (!r) throw new Error('refresh not found');
				Object.assign(r, data);
				return r;
			}
		},
		vulnerability: {
			async create({ data }: any) {
				const v: Vuln = { id: nextId(), userId: data.userId, title: data.title, description: data.description ?? '', status: data.status ?? 'OPEN', createdAt: new Date(), updatedAt: new Date() };
				state.vulnerabilities.push(v);
				return v;
			},
			async findMany({ where, orderBy }: any) {
				return state.vulnerabilities.filter(v => !where || v.userId === where.userId).sort((a,b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
			},
			async findFirst({ where }: any) {
				if (!where) return state.vulnerabilities[0] ?? null;
				const keys = Object.keys(where);
				return state.vulnerabilities.find(v => keys.every(k => (v as any)[k] === (where as any)[k])) ?? null;
			},
			async update({ where, data }: any) {
				const v = state.vulnerabilities.find(x => x.id === where.id);
				if (!v) throw new Error('vulnerability not found');
				Object.assign(v, data, { updatedAt: new Date() });
				return v;
			},
			async count({ where }: any) {
				return state.vulnerabilities.filter(v => !where || v.userId === where.userId).length;
			},
			async aggregate({ _sum }: any) {
				return { _sum: { payoutAmount: null } };
			}
		},
		note: {
			async create({ data }: any) {
				const n: Note = { id: nextId(), userId: data.userId, content: data.content ?? '', createdAt: new Date() };
				state.notes.push(n);
				return n;
			},
			async findMany({ where }: any) {
				return state.notes.filter(n => !where || n.userId === where.userId).sort((a,b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
			},
			async findFirst({ where }: any) {
				if (!where) return state.notes[0] ?? null;
				const keys = Object.keys(where);
				return state.notes.find(n => keys.every(k => (n as any)[k] === (where as any)[k])) ?? null;
			},
			async count({ where }: any) { return state.notes.filter(n => !where || n.userId === where.userId).length; }
		},
		submission: { async count({ where }: any) { return 0; } },
		async $queryRaw() { return 1; },
		async $disconnect() { return; }
	};

		prismaInternal = mock;
	} else {
	// Lazily initialize PrismaClient to avoid import-time side effects during test collection
	let _prisma: PrismaClient | undefined;
	function initPrisma(): PrismaClient {
		if (!_prisma) {
			_prisma = new PrismaClient();
		}
		return _prisma;
	}

		// Export a proxy that forwards property access to a lazily-initialized PrismaClient.
		prismaInternal = new Proxy({}, {
			get(_target, prop: string | symbol) {
				const p = initPrisma();
				return (p as unknown as Record<string, unknown>)[String(prop)];
			},
			set(_target, prop: string | symbol, value) {
				const p = initPrisma();
				(p as unknown as Record<string, unknown>)[String(prop)] = value as unknown;
				return true;
			}
		}) as unknown as PrismaClient;
	}

	export const prisma = prismaInternal as PrismaClient;
