import { expect, test, type Page } from "@playwright/test";

/**
 * Parcours critique : onboarding → séance complète → bilan → historique.
 *
 * Depuis le passage au stockage local, ce test n'a plus besoin de rien : pas
 * de base à démarrer, pas de compte à créer, pas de confirmation d'e-mail à
 * contourner. Il tourne partout, ce qui était l'argument le plus fort du
 * changement d'architecture.
 *
 * Chaque test part d'un contexte neuf : IndexedDB est vide, comme sur un
 * téléphone qui ouvre l'app pour la première fois.
 */

test.describe("parcours complet", () => {
  test("répondre à l'onboarding, faire une séance et la clôturer", async ({ page }) => {
    test.slow();

    await page.goto("/bienvenue");
    await expect(page.getByRole("heading", { name: /Comment on t'appelle/ })).toBeVisible();

    await page.getByLabel("Prénom").fill("Martin");
    await continuer(page);

    await page.getByRole("button", { name: "Homme" }).click();
    await continuer(page);

    await continuer(page); // date de naissance : valeur par défaut
    await continuer(page); // taille
    await continuer(page); // poids

    await page.getByRole("button", { name: /Prendre de la masse/ }).click();
    await continuer(page);

    await page.getByRole("button", { name: /Intermédiaire/ }).click();
    await continuer(page);

    await page.getByRole("radio", { name: "4", exact: true }).click();
    await continuer(page);

    for (const materiel of ["Barre olympique + disques", "Haltères réglables", "Banc inclinable", "Rack à squat"]) {
      await page.getByRole("button", { name: materiel }).click();
    }
    await continuer(page);

    await page.getByRole("button", { name: "Rien à signaler" }).click();

    await page.getByRole("button", { name: /Kilogrammes/ }).click();
    await continuer(page);

    // ── Récapitulatif : des chiffres calculés, pas un écran de félicitations ──
    await expect(page.getByRole("heading", { name: /Voilà ce que ça donne/ })).toBeVisible();
    await expect(page.getByText("IMC")).toBeVisible();
    await page.getByRole("button", { name: /^Prendre / }).first().click();

    await page.waitForURL("**/tableau-de-bord", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Salut Martin/ })).toBeVisible();

    // ── Séance ──
    // Deux liens portent ce nom : l'état vide du tableau de bord et la pilule
    // flottante. On passe par la pilule, c'est le chemin réel.
    await page.getByRole("link", { name: /Lancer une séance/ }).last().click();
    await page.waitForURL("**/seance");
    await page.getByRole("button", { name: /^Démarrer / }).first().click();

    const valider = page.getByRole("button", { name: "Valider la série" });
    await expect(valider).toBeVisible({ timeout: 20_000 });

    const tonnageAvant = await page.getByLabel(/Tonnage cumulé/).textContent();

    for (let i = 0; i < 3; i += 1) {
      await page.getByLabel(/^Charge en /).fill(String(60 + i * 5));
      await page.getByLabel("Répétitions").fill("8");
      await valider.click();
      const passer = page.getByRole("button", { name: /Passer le repos|C'est reparti/ });
      await expect(passer).toBeVisible();
      await passer.click();
    }

    expect(await page.getByLabel(/Tonnage cumulé/).textContent()).not.toBe(tonnageAvant);

    // La première série d'un exercice jamais fait est forcément un record.
    await expect(page.getByText("Record", { exact: false }).first()).toBeVisible();

    // ── Bilan ──
    await page.getByRole("link", { name: "Terminer" }).click();
    await page.waitForURL("**/seance/bilan");
    await page.getByRole("radio", { name: "Bien" }).click();
    await page.getByRole("button", { name: "Terminer la séance" }).click();

    await page.waitForURL("**/tableau-de-bord", { timeout: 20_000 });

    // ── La séance est bien en base locale ──
    await page.getByRole("link", { name: "Historique" }).click();
    await page.waitForURL("**/historique");
    await expect(page.getByText(/1 séance enregistrée/)).toBeVisible();

    // ── Et elle survit à un rechargement complet ──
    await page.reload();
    await expect(page.getByText(/1 séance enregistrée/)).toBeVisible();
  });

  test("sans profil, on est renvoyé sur l'onboarding", async ({ page }) => {
    await page.goto("/tableau-de-bord");
    await page.waitForURL("**/bienvenue", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Comment on t'appelle/ })).toBeVisible();
  });
});

async function continuer(page: Page) {
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForTimeout(350);
}
