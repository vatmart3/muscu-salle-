import { expect, test, type Page } from "@playwright/test";

/**
 * Parcours critique : inscription → onboarding → séance complète → bilan.
 *
 * Il lui faut une base Supabase joignable, avec les migrations appliquées et
 * la confirmation d'e-mail désactivée en local. Sans ça, les tests se
 * déclarent **ignorés** plutôt que rouges : un test rouge par absence
 * d'environnement ne dit rien sur le code.
 *
 * En local :
 *   supabase start && supabase db reset
 *   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 npm run build && npm run e2e:parcours
 */

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_DISPO = /localhost|127\.0\.0\.1|supabase\.co/.test(URL_SUPABASE) && !URL_SUPABASE.includes("exemple");

const CODE = process.env.E2E_CODE_ACCES ?? "FONTE-2026";

test.describe("parcours complet", () => {
  test.skip(!SUPABASE_DISPO, "Supabase n'est pas configuré : lance `supabase start` puis rebâtis l'app.");

  const suffixe = Date.now();
  const email = `parcours-${suffixe}@exemple.test`;
  const motDePasse = "correct-batterie-agrafe-12";

  test("s'inscrire, répondre à l'onboarding, faire une séance et la clôturer", async ({ page }) => {
    test.slow();

    // ── Inscription ──────────────────────────────────────────────────────
    await page.goto("/inscription");
    await page.getByLabel("Prénom").fill("Martin");
    await page.getByLabel("Adresse e-mail").fill(email);
    await page.getByLabel("Mot de passe").fill(motDePasse);
    await page.getByLabel("Code d'accès de la salle").fill(CODE);
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await page.waitForURL(/\/(bienvenue|inscription)/, { timeout: 20_000 });
    if (page.url().includes("/inscription")) {
      // Confirmation d'e-mail activée : on ne peut pas aller plus loin sans
      // boîte mail. On le dit clairement plutôt que d'échouer sur un timeout.
      await expect(page.getByRole("heading", { name: /Vérifie ta boîte mail/ })).toBeVisible();
      test.skip(true, "La confirmation d'e-mail est activée : désactive-la en local pour ce parcours.");
    }

    // ── Onboarding ───────────────────────────────────────────────────────
    await expect(page.getByRole("heading", { name: /Comment on t'appelle/ })).toBeVisible();
    await continuer(page); // prénom déjà rempli

    await page.getByRole("button", { name: "Homme" }).click();
    await continuer(page);

    await continuer(page); // date de naissance : valeur par défaut
    await continuer(page); // taille
    await continuer(page); // poids

    await page.getByRole("button", { name: /Prendre de la masse/ }).click();
    await continuer(page);

    await page.getByRole("button", { name: /Intermédiaire/ }).click();
    await continuer(page);

    await page.getByRole("radio", { name: "4" }).click();
    await continuer(page);

    await page.getByRole("button", { name: "Barre olympique + disques" }).click();
    await page.getByRole("button", { name: "Haltères réglables" }).click();
    await page.getByRole("button", { name: "Banc inclinable" }).click();
    await page.getByRole("button", { name: "Rack à squat" }).click();
    await continuer(page);

    await page.getByRole("button", { name: "Rien à signaler" }).click();

    await page.getByRole("button", { name: /Kilogrammes/ }).click();
    await continuer(page);

    // ── Récapitulatif et choix du programme ──────────────────────────────
    await expect(page.getByRole("heading", { name: /Voilà ce que ça donne/ })).toBeVisible();
    await expect(page.getByText(/IMC/)).toBeVisible();
    await page.getByRole("button", { name: /^Prendre / }).first().click();

    await page.waitForURL("**/tableau-de-bord", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Salut Martin/ })).toBeVisible();

    // ── Séance ───────────────────────────────────────────────────────────
    await page.getByRole("link", { name: /Lancer une séance/ }).click();
    await page.waitForURL("**/seance");
    await page.getByRole("button", { name: /^Démarrer / }).first().click();

    await expect(page.getByRole("button", { name: "Valider la série" })).toBeVisible({ timeout: 20_000 });

    const tonnageAvant = await page.getByLabel(/Tonnage cumulé/).textContent();

    // Trois séries validées sur le premier exercice.
    for (let i = 0; i < 3; i += 1) {
      await page.getByLabel(/^Charge en /).fill(String(60 + i * 5));
      await page.getByLabel("Répétitions").fill("8");
      await page.getByRole("button", { name: "Valider la série" }).click();
      await expect(page.getByRole("button", { name: /Passer le repos|C'est reparti/ })).toBeVisible();
      await page.getByRole("button", { name: /Passer le repos|C'est reparti/ }).click();
    }

    const tonnageApres = await page.getByLabel(/Tonnage cumulé/).textContent();
    expect(tonnageApres).not.toBe(tonnageAvant);

    // La première série d'un exercice neuf est forcément un record.
    await expect(page.getByText("Record", { exact: false }).first()).toBeVisible();

    // ── Bilan ────────────────────────────────────────────────────────────
    await page.getByRole("link", { name: "Terminer" }).click();
    await page.waitForURL("**/seance/bilan");
    await expect(page.getByRole("heading", { name: /Bilan|Push|Haut|Full/ }).first()).toBeVisible();
    await page.getByRole("radio", { name: "Bien" }).click();
    await page.getByRole("button", { name: "Terminer la séance" }).click();

    await page.waitForURL("**/tableau-de-bord", { timeout: 20_000 });

    // ── La séance est bien dans l'historique ─────────────────────────────
    await page.getByRole("link", { name: "Historique" }).click();
    await page.waitForURL("**/historique");
    await expect(page.getByText(/1 séance enregistrée/)).toBeVisible();
  });
});

async function continuer(page: Page) {
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForTimeout(350);
}
