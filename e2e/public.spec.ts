import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Écrans publics : ils doivent s'afficher et passer l'audit d'accessibilité
 * sans aucune donnée en base. C'est le filet qui tourne partout.
 */

const ECRANS = [
  { chemin: "/", titre: "Le carnet de la salle." },
  { chemin: "/hors-ligne", titre: "Pas de réseau." },
  { chemin: "/design", titre: "FONTE" },
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
