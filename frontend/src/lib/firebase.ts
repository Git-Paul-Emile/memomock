import { API_BASE_URL } from "./api";
import { obtenirSessionId } from "./session-id";

const STORAGE_KEY = "memoai_mock_user";

export interface MockUser {
  id: string;
  email: string;
  displayName?: string;
}

function getMockUser(): MockUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockUser;
  } catch {
    return null;
  }
}

function setMockUser(user: MockUser | null) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function authStateReady(): Promise<void> {
  return Promise.resolve();
}

export const auth = {
  currentUser: getMockUser(),
  async authStateReady() {
    return Promise.resolve();
  },
  async getIdToken() {
    const user = getMockUser();
    if (!user) return null;
    return `mock-token-${user.id}`;
  },
};

export class FirebaseError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "FirebaseError";
    this.code = code;
  }
}

export const EmailAuthProvider = {
  credential: (_email: string, _password: string) => ({})
};

export async function signInWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string
) {
  const sessionId = obtenirSessionId();
  const res = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(email)}`, {
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new FirebaseError(
      res.status === 404 ? "auth/user-not-found" : "auth/invalid-credential",
      body?.message ?? "Adresse e-mail ou mot de passe incorrect."
    );
  }

  const users = (await res.json()) as any[];
  const user = users.find((u) => u.password === password);
  if (!user) {
    throw new FirebaseError("auth/invalid-credential", "Adresse e-mail ou mot de passe incorrect.");
  }

  const mockUser: MockUser = { id: user.id, email: user.email, displayName: `${user.prenom} ${user.nom}` };
  setMockUser(mockUser);
  return { user: mockUser };
}

export async function createUserWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string,
  donneesSupplementaires: Record<string, unknown> = {}
) {
  const existing = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(email)}`, {
    headers: { "Content-Type": "application/json" },
  }).then((r) => r.json().catch(() => []));

  if (existing.length > 0) {
    throw new FirebaseError("auth/email-already-in-use", "Cette adresse e-mail est déjà utilisée.");
  }

  const newUser = {
    email,
    password,
    role: "etudiant",
    nom: "",
    prenom: "",
    telephoneVerifie: false,
    // Écrase les valeurs par défaut ci-dessus avec le formulaire réel (rôle choisi, nom, prénom,
    // téléphone, filiere, encadrantId...) - avant ce correctif, ces champs étaient ignorés et
    // chaque inscription créait un compte "étudiant" vide quel que soit le formulaire rempli.
    ...donneesSupplementaires,
  };

  const sessionId = obtenirSessionId();
  const res = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify(newUser),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new FirebaseError("auth/internal-error", body?.message ?? "Impossible de créer le compte.");
  }

  const created = (await res.json()) as any;
  const mockUser: MockUser = { id: created.id, email: created.email };
  setMockUser(mockUser);
  return { user: mockUser };
}

export async function updateProfile(_auth: unknown, payload: { displayName?: string }) {
  const user = getMockUser();
  if (!user) return;
  if (payload.displayName) {
    user.displayName = payload.displayName;
    setMockUser(user);
  }
}

export async function sendPasswordResetEmail(
  _auth: unknown,
  email: string,
  _options?: { url?: string; handleCodeInApp?: boolean }
) {
  const sessionId = obtenirSessionId();
  const res = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(email)}`, {
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
    },
  });

  if (!res.ok) {
    throw new FirebaseError("auth/invalid-email", "Impossible d'envoyer l'e-mail pour le moment.");
  }

  const users = (await res.json()) as any[];
  if (users.length === 0) {
    return;
  }

  const newPassword = `reset-${Math.random().toString(36).slice(2, 10)}`;
  const user = users[0];
  await fetch(`${API_BASE_URL}/users/${user.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: newPassword }),
  });
}

export async function reauthenticateWithCredential(
  _auth: unknown,
  _credential: unknown
) {
  return;
}

export async function updatePassword(_auth: unknown, nouveauMotDePasse: string) {
  const user = getMockUser();
  if (!user) {
    throw new FirebaseError("auth/user-not-found", "Session expirée. Merci de vous reconnecter.");
  }

  const sessionId = obtenirSessionId();
  const res = await fetch(`${API_BASE_URL}/users/${user.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "X-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify({ password: nouveauMotDePasse }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new FirebaseError("auth/internal-error", body?.message ?? "Impossible de mettre à jour le mot de passe.");
  }
}

export async function sendEmailVerification(_auth: unknown) {
  return;
}

export function onAuthStateChanged(
  _auth: unknown,
  callback: (user: MockUser | null) => void
) {
  callback(getMockUser());
  return () => {};
}

export function signOut(_auth: unknown) {
  setMockUser(null);
}
