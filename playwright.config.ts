import { defineConfig, devices } from "@playwright/test";

/**
 * Deux projets :
 *  — `public` : parcours et accessibilité des écrans qui ne demandent pas de
 *    session. Tourne partout, y compris en intégration continue sans Supabase.
 *  — `parcours` : inscription → onboarding → séance → bilan. Exige une base
 *    Supabase joignable (`supabase start`), sinon les tests se déclarent
 *    ignorés plutôt que rouges.
 */

const PORT = Number(process.env.PORT ?? 3100);
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 45_000,
  expect: { timeout: 8_000 },

  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    launchOptions: {
      // L'environnement de développement n'a pas de GPU : on force le rendu
      // logiciel, sinon les scènes 3D restent noires.
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
      executablePath: process.env.CHROME_BIN || undefined,
    },
  },

  projects: [
    { name: "public", testMatch: /public\.spec\.ts/, use: { ...devices["Pixel 7"] } },
    { name: "parcours", testMatch: /parcours\.spec\.ts/, use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
