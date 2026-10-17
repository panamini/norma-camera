# Norma — Plan Firmament (2026-10-17)

Commande du propriétaire : un produit que les gens ont le réflexe d'utiliser,
intégré à leur vie, qui domine la concurrence à tous les niveaux. Voici le
diagnostic honnête et le plan décidé. Les paris sont nommés comme des paris.

## 1. Diagnostic franc

**Personne n'a besoin d'une app photo de plus.** VSCO, Lightroom, Halide, les
caméras constructeur avec leurs gadgets « AI composition » : le marché est
saturé d'outils. Les outils ne créent pas de réflexe. Ce qui crée un réflexe :
une **identité** (« je suis quelqu'un qui voit la composition ») nourrie par
une **boucle de progrès visible** et un **moment magique** qui se raconte.

**Ce que Norma a et que personne n'a** (le moat, déjà construit) :

1. **La subjectivité assumée.** Tout le monde vend de l'objectivité fake
   (« AI score 94! »). Norma dit : voici des opinions classiques, ouvertes,
   expliquées. C'est une position de marque inattaquable — on ne peut pas
   nous copier sans se renier.
2. **L'explication.** Le WHY? est le seul « pourquoi » du marché. Les features
   AI sont des boîtes noires par construction.
3. **La confidentialité absolue.** Zéro cloud, zéro ML, zéro réseau,
   GrapheneOS-first. Ce n'est pas une contrainte : c'est **la** feature pour
   une niche grandissante qui paie pour ça (le marché de Halide prouve qu'un
   outil photo « craft » se vend 10–60 €).
4. **L'écosystème.** Camera (capture) → Construct (étude) sur norma.science.
   Aucun concurrent n'a les deux bouts de la chaîne du regard.

**Ce qui manque pour le réflexe** (le vrai chantier) : l'app actuelle est un
outil de session — on ouvre, on shoote, on ferme, on oublie. Il manque la
raison de revenir, l'accumulation visible, et la surface sociale.

## 2. Le « backend » : verdict

**Ne construis pas de backend.** C'est le moat inversé : chaque serveur
ajouté coûte de l'argent (l'entreprise coule — zéro coût fixe nouveau),
érode la promesse de confidentialité, et ajoute de la surface de panne.
L'architecture cible : tout sur l'appareil, le web Construct comme seule
surface connectée (déjà payée), le partage système comme seul transport.
« Pas de backend » devient un argument de vente écrit sur la fiche Play Store.

## 3. Les quatre piliers du produit qui gagne

### P1 — Le moment magique (en cours)
Le lock — sujet sur le nœud, lignes en or, arc plein, tick — doit être si
net qu'on le montre à un ami. C'est la démo qui vend. Reste : calibration
terrain du line-harmony (tes retours), et le polish du moment (micro-anim
de lock). *Statut : PR7.0 livré, calibration en attente de tes chiffres.*

### P2 — La boucle d'habitude : le Journal d'Harmonie (à construire)
Local-only, zéro réseau :
- chaque capture gardée avec canon + score + date (persistance sur l'appareil
  — aujourd'hui la galerie meurt avec la session) ;
- un écran Journal : tes meilleures frames par canon, ta moyenne de résonance
  qui progresse, ta série de jours avec au moins une frame ≥ 82 (« streak ») ;
- une notification locale optionnelle, une par jour max, honnête :
  « La lumière est bonne. Une frame aujourd'hui ? »
C'est le mécanisme du réflexe : identité + progrès + rendez-vous. Duolingo
l'a prouvé ; personne ne l'a fait pour l'œil photographique.

### P3 — Chaque partage est une pub : la Carte Norma (construit aujourd'hui)
Le burn-in devient une carte signée : marge papier façon tirage, bande
graphite, nom du canon, score, wordmark NORMA. Quelqu'un voit la carte sur
WhatsApp/Instagram → comprend le concept en une image → cherche l'app.
Croissance zéro budget. *Statut : livré dans ce commit.*

### P4 — FULL AUTO · LINES (le coup que personne n'a)
La caméra qui déclenche quand la géométrie chante — ta vision Cartier-Bresson.
Gated par l'évidence terrain du P1. Si le readout est fiable : mode opt-in,
lock soutenu 2–3 s → déclenchement. C'est la feature de presse.

## 4. Le modèle économique (recommandation ferme)

**Camera payante, achat unique, 14,99 € (lancement 9,99 €).** Pas d'abonnement
sur la camera : l'abonnement contredit « rien ne quitte ton appareil » et la
niche craft/privacy déteste ça. Le pricing Halide/Photon prouve la fourchette.
- Play Store + **F-Droid/GrapheneOS en priorité marketing** : cette communauté
  évangélise gratuitement et correspond exactement au moat n°3.
- **Construct Pro (web) en abonnement** reste le revenu récurrent ; la camera
  est l'entonnoir (bouton CONSTRUCT déjà câblé).
- Beta interne gratuite MAINTENANT pour les retours ; prix affiché dès la
  fiche pour assumer le positionnement craft.

## 5. Exécution — 4 semaines

| Sem. | Livrable | Gate |
|---|---|---|
| 1 | Carte Norma ✓ · calibration line-harmony sur tes retours · polish lock · **beta interne Play Store** | 10 testeurs réels installés |
| 2 | Journal d'Harmonie (persistance + écran + streak) · notification locale opt-in | tu l'ouvres sans y penser 3 jours de suite |
| 3 | FULL AUTO · LINES (si évidence OK) · page norma.science/camera + vidéo 30 s du lock | la vidéo se partage seule |
| 4 | Durcissement (20 min thermique, bascules), fiche store finale, prix, lancement ouvert | zéro crash sur 7 jours de beta |

## 6. Métriques de vérité (sans télémétrie — on reste clean)

Pas de tracking : on mesure par la beta (interviews) et le store :
rétention déclarée J7, cartes partagées par testeur et par semaine,
« montre-moi ton journal » en interview, notes et avis. Si les testeurs ne
partagent pas de cartes en semaine 2, le P3 est raté et on itère.

## 7. Les trois décisions qui n'appartiennent qu'à toi

1. **Prix** : 14,99 € one-time (ma reco) — ou gratuit + Construct Pro funnel.
2. **Application id** : à changer AVANT le premier upload Play (définitif).
   Reco : `science.norma.camera`.
3. **iOS** : pas avant que l'Android paie. Apple Vision rendra le port
   meilleur, mais la trésorerie décide — Android d'abord, comme prévu.

## 8. Ce que je refuse de faire (et pourquoi c'est pour toi)

Pas de backend, pas de compte utilisateur, pas de télémétrie, pas de score
« objectif », pas de feed social hébergé. Chacun tuerait le moat qui te
différencie et ajouterait des coûts à une entreprise qui doit en couper.
La force de Norma est d'être l'anti-tout-ça, dit fièrement.
