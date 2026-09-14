import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Écrans publics : ils doivent s'afficher et passer l'audit d'accessibilité
 * sans session Supabase. C'est le filet qui tourne partout.
 */

const ECRANS = [
  { chemin: "/", titre: "Le carnet de la salle." },
  { chemin: "/inscription", titre: "Crée ton compte." },
  { chemin: "/connexion", titre: "Te revoilà." },
  { chemin: "/mot-de-passe-oublie", titre: "Réinitialiser." },
  { chemin: "/hors-ligne", titre: "Pas de réseau." },
];

for (const { chemin, titre } of ECRANS) {
  test(`${chemin} s'affiche`, async ({ page }) => {
    await page.goto(chemin);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(titre.replace(/\s?[?!:]$/, "").slice(0, 18));
  });

  test(`${chemin} passe l'audit d'accessibilité`, async ({ page }) => {
    await page.goto(chemin);
    await page.waitForLoadState("networkidle");
    const resultat = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(resultat.violations.map((v) => `${v.id} — ${v.nodes.length} nœud(s)`)).toEqual([]);
  });
}

test("l'inscription refuse un formulaire vide sans recharger la page", async ({ page }) => {
  await page.goto("/inscription");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  // Les champs sont requis : le navigateur bloque l'envoi, on reste sur place.
  await expect(page.getByRole("heading", { name: /Crée ton compte/ })).toBeVisible();
});

test("le lien magique est proposé en secours sur la connexion", async ({ page }) => {
  await page.goto("/connexion");
  // Le basculement est piloté par React : sans attendre l'hydratation, le clic
  // part dans le vide et le test devient instable.
  await page.waitForLoadState("networkidle");
  const secours = page.getByRole("button", { name: "Recevoir un lien de connexion" });
  await expect(secours).toBeVisible();
  await secours.click();
  await expect(page.getByRole("heading", { name: /Connexion par lien/ })).toBeVisible();
  await expect(page.getByText(/Le lien ne crée pas de compte/)).toBeVisible();
});

test("la navigation au clavier atteint le contenu par le lien d'évitement", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Aller au contenu" })).toBeFocused();
});

test("le système de design s'affiche et reste accessible", async ({ page }) => {
  await page.goto("/design");
  await expect(page.getByRole("heading", { name: "FONTE", level: 1 })).toBeVisible();
  const resultat = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(resultat.violations.map((v) => v.id)).toEqual([]);
});
