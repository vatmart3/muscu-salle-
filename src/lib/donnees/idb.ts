/**
 * Enrobage minimal d'IndexedDB.
 *
 * Pas de dépendance : l'API brute est verbeuse mais stable, et une centaine de
 * lignes typées coûtent moins cher qu'une bibliothèque de plus à suivre.
 *
 * Tout est asynchrone et tolérant : en rendu serveur, en navigation privée ou
 * si le stockage est refusé, les lectures rendent du vide plutôt que de jeter.
 * L'application doit rester affichable même quand la base n'est pas là.
 */

const NOM_BASE = "fonte";
const VERSION = 1;

export const MAGASINS = {
  profil: "profil",
  seances: "seances",
  mesures: "mesures",
  photos: "photos",
  records: "records",
  modeles: "modeles",
  exercicesPerso: "exercices_perso",
} as const;

export type NomMagasin = (typeof MAGASINS)[keyof typeof MAGASINS];

let connexion: Promise<IDBDatabase | null> | null = null;

export function stockageDisponible(): boolean {
  return typeof indexedDB !== "undefined";
}

function ouvrir(): Promise<IDBDatabase | null> {
  if (!stockageDisponible()) return Promise.resolve(null);
  connexion ??= new Promise<IDBDatabase | null>((resoudre) => {
    let demande: IDBOpenDBRequest;
    try {
      demande = indexedDB.open(NOM_BASE, VERSION);
    } catch {
      resoudre(null);
      return;
    }

    demande.onupgradeneeded = () => {
      const base = demande.result;

      if (!base.objectStoreNames.contains(MAGASINS.profil)) {
        base.createObjectStore(MAGASINS.profil, { keyPath: "id" });
      }
      if (!base.objectStoreNames.contains(MAGASINS.seances)) {
        const magasin = base.createObjectStore(MAGASINS.seances, { keyPath: "id" });
        magasin.createIndex("demarree_a", "demarree_a");
        magasin.createIndex("statut", "statut");
      }
      if (!base.objectStoreNames.contains(MAGASINS.mesures)) {
        base.createObjectStore(MAGASINS.mesures, { keyPath: "date" });
      }
      if (!base.objectStoreNames.contains(MAGASINS.photos)) {
        const magasin = base.createObjectStore(MAGASINS.photos, { keyPath: "id" });
        magasin.createIndex("date", "date");
        magasin.createIndex("angle", "angle");
      }
      if (!base.objectStoreNames.contains(MAGASINS.records)) {
        const magasin = base.createObjectStore(MAGASINS.records, { keyPath: "cle" });
        magasin.createIndex("obtenu_le", "obtenu_le");
        magasin.createIndex("exercice_id", "exercice_id");
      }
      if (!base.objectStoreNames.contains(MAGASINS.modeles)) {
        base.createObjectStore(MAGASINS.modeles, { keyPath: "id" });
      }
      if (!base.objectStoreNames.contains(MAGASINS.exercicesPerso)) {
        base.createObjectStore(MAGASINS.exercicesPerso, { keyPath: "id" });
      }
    };

    demande.onsuccess = () => {
      const base = demande.result;
      // Une autre fenêtre a lancé une migration : on se retire pour la laisser
      // passer plutôt que de la bloquer indéfiniment.
      base.onversionchange = () => {
        base.close();
        connexion = null;
      };
      resoudre(base);
    };
    demande.onerror = () => resoudre(null);
    demande.onblocked = () => resoudre(null);
  });
  return connexion;
}

function attendre<T>(demande: IDBRequest<T>): Promise<T> {
  return new Promise((resoudre, rejeter) => {
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
}

async function transaction<T>(
  magasins: NomMagasin | NomMagasin[],
  mode: IDBTransactionMode,
  action: (obtenir: (nom: NomMagasin) => IDBObjectStore) => Promise<T> | T,
): Promise<T | null> {
  const base = await ouvrir();
  if (!base) return null;
  const noms = Array.isArray(magasins) ? magasins : [magasins];
  try {
    const tx = base.transaction(noms, mode);
    const resultat = await action((nom) => tx.objectStore(nom));
    if (mode !== "readonly") {
      await new Promise<void>((resoudre, rejeter) => {
        tx.oncomplete = () => resoudre();
        tx.onerror = () => rejeter(tx.error);
        tx.onabort = () => rejeter(tx.error);
      });
    }
    return resultat;
  } catch {
    return null;
  }
}

// ─────────────────────────── Opérations ───────────────────────────

export async function lire<T>(magasin: NomMagasin, cle: IDBValidKey): Promise<T | null> {
  const resultat = await transaction(magasin, "readonly", (obtenir) =>
    attendre<T | undefined>(obtenir(magasin).get(cle)),
  );
  return resultat ?? null;
}

export async function lireTout<T>(magasin: NomMagasin): Promise<T[]> {
  const resultat = await transaction(magasin, "readonly", (obtenir) =>
    attendre<T[]>(obtenir(magasin).getAll()),
  );
  return resultat ?? [];
}

export async function ecrire<T>(magasin: NomMagasin, valeur: T): Promise<boolean> {
  const resultat = await transaction(magasin, "readwrite", (obtenir) =>
    attendre(obtenir(magasin).put(valeur as unknown as IDBValidKey extends never ? never : T)),
  );
  return resultat !== null;
}

export async function ecrirePlusieurs<T>(magasin: NomMagasin, valeurs: readonly T[]): Promise<boolean> {
  if (valeurs.length === 0) return true;
  const resultat = await transaction(magasin, "readwrite", async (obtenir) => {
    const cible = obtenir(magasin);
    for (const valeur of valeurs) await attendre(cible.put(valeur as never));
    return true;
  });
  return resultat !== null;
}

export async function supprimer(magasin: NomMagasin, cle: IDBValidKey): Promise<boolean> {
  const resultat = await transaction(magasin, "readwrite", (obtenir) =>
    attendre(obtenir(magasin).delete(cle)),
  );
  return resultat !== null;
}

export async function viderMagasin(magasin: NomMagasin): Promise<void> {
  await transaction(magasin, "readwrite", (obtenir) => attendre(obtenir(magasin).clear()));
}

/** Efface toute la base. Utilisé par la suppression de compte. */
export async function toutEffacer(): Promise<void> {
  for (const magasin of Object.values(MAGASINS)) await viderMagasin(magasin);
}

/** Place occupée et quota, quand le navigateur veut bien le dire. */
export async function place(): Promise<{ utilise: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { utilise: usage ?? 0, quota: quota ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Demande au navigateur de ne pas effacer nos données en cas de pression
 * disque. Sans ça, une app locale peut perdre six mois de séances pendant un
 * nettoyage automatique.
 */
export async function demanderPersistance(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
