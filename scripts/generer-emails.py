#!/usr/bin/env python3
"""
Génère les trois gabarits d'e-mail transactionnel aux couleurs de FONTE.

Un e-mail n'est pas une page web : pas de <style> externe, pas de flexbox, pas
de SVG. Tout est en tables et en styles en ligne, et le disque de la marque est
un div à bordure arrondie — la seule forme ronde que tous les clients rendent.

Usage : python3 scripts/generer-emails.py
"""
import os

ENCRE = "#0A1628"
BLEU = "#0071E3"
BLEU_PROFOND = "#0047A8"
BRUME = "#EEF3FA"
DOUX = "#5C6675"

GABARIT = """<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{titre}</title>
  </head>
  <body style="margin:0;padding:0;background:{brume};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{apercu}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{brume};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="max-width:520px;background:#ffffff;border-radius:28px;border:1px solid rgba(10,22,40,.08);">
            <tr>
              <td style="padding:36px 32px 0 32px;">
                <div style="width:44px;height:44px;border-radius:999px;border:13px solid {bleu};box-sizing:border-box;"></div>
                <p style="margin:20px 0 0 0;font:700 20px/1.1 'Archivo',Helvetica,Arial,sans-serif;letter-spacing:.04em;color:{encre};">FONTE</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <h1 style="margin:0;font:700 26px/1.15 'Archivo',Helvetica,Arial,sans-serif;color:{encre};">{titre}</h1>
                <p style="margin:14px 0 0 0;font:400 15px/1.55 Helvetica,Arial,sans-serif;color:{doux};">{corps}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-radius:999px;background:{bleu};">
                      <a href="{lien}"
                         style="display:inline-block;padding:16px 30px;font:500 16px/1 Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px;">{action}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 36px 32px;">
                <p style="margin:0;font:400 13px/1.5 Helvetica,Arial,sans-serif;color:{doux};">
                  Le bouton ne fonctionne pas ? Copie ce lien dans ton navigateur :<br />
                  <span style="color:{bleu_profond};word-break:break-all;">{lien}</span>
                </p>
                <div style="height:1px;background:rgba(10,22,40,.08);margin:22px 0;"></div>
                <p style="margin:0;font:400 13px/1.5 Helvetica,Arial,sans-serif;color:{doux};">{pied}</p>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0 0;font:400 12px/1.5 Helvetica,Arial,sans-serif;color:{doux};">
            FONTE — le carnet de la salle.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

EMAILS = {
    "confirmation.html": dict(
        titre="Confirme ton adresse.",
        apercu="Un clic et ton compte FONTE est ouvert.",
        corps="Ton compte est presque prêt. Clique pour confirmer ton adresse, puis réponds aux quelques questions qui servent à te proposer un programme.",
        action="Confirmer mon adresse",
        lien="{{ .SiteURL }}/auth/confirmer?token_hash={{ .TokenHash }}&amp;type=signup&amp;suite=/bienvenue",
        pied="Tu n'as pas créé de compte sur FONTE ? Ignore cet e-mail, rien ne sera ouvert.",
    ),
    "connexion.html": dict(
        titre="Ton lien de connexion.",
        apercu="Valable une heure, une seule utilisation.",
        corps="Clique pour ouvrir ta session, sans mot de passe. Le lien vaut une heure et ne sert qu'une fois.",
        action="Me connecter",
        lien="{{ .SiteURL }}/auth/confirmer?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;suite=/tableau-de-bord",
        pied="Tu n'as rien demandé ? Quelqu'un s'est trompé d'adresse. Ce lien ne donne accès à rien tant qu'il n'est pas cliqué.",
    ),
    "reinitialisation.html": dict(
        titre="Nouveau mot de passe.",
        apercu="Le lien vaut une heure.",
        corps="Clique pour choisir un nouveau mot de passe. Ton ancien reste valable tant que tu n'en as pas défini un autre.",
        action="Choisir un mot de passe",
        lien="{{ .SiteURL }}/auth/confirmer?token_hash={{ .TokenHash }}&amp;type=recovery&amp;suite=/nouveau-mot-de-passe",
        pied="Tu n'as pas demandé de réinitialisation ? Ignore cet e-mail, ton mot de passe ne change pas.",
    ),
}


def main() -> None:
    cible = os.path.join(os.path.dirname(__file__), "..", "supabase", "templates")
    os.makedirs(cible, exist_ok=True)
    for nom, champs in EMAILS.items():
        html = GABARIT.format(
            encre=ENCRE, bleu=BLEU, bleu_profond=BLEU_PROFOND, brume=BRUME, doux=DOUX, **champs
        )
        with open(os.path.join(cible, nom), "w", encoding="utf-8") as f:
            f.write(html)
        print(f"  {nom}")
    print(f"{len(EMAILS)} gabarits écrits dans supabase/templates/")


if __name__ == "__main__":
    main()
