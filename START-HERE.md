# Kit Kiro : mini n8n orienté agents IA

Ce kit contient **tout ce qu'il faut pour que Kiro construise le projet lui-même** : le contexte (steering), six specs complètes prêtes à exécuter (exigences, conception, tâches), des hooks de contrôle et la configuration de Context7. Votre rôle : lancer les tâches une par une, relire, tester, corriger le tir.

## 1. Contenu

```
.
├─ START-HERE.md                      ce fichier (vous pouvez le supprimer ensuite)
└─ .kiro/
   ├─ steering/                       contexte permanent de Kiro
   │  ├─ product.md, tech.md, structure.md, node-contract.md      (toujours chargés)
   │  └─ execution-engine.md, editor-canvas.md,
   │     agents-ai.md, triggers-integrations.md                   (chargés selon les fichiers ouverts)
   ├─ specs/                          une spec = requirements.md + design.md + tasks.md
   │  ├─ 01-foundation/               monorepo, base de données, authentification, dashboard
   │  ├─ 02-editor-canvas/            canvas drag & drop, nodes typés, panneau de configuration
   │  ├─ 03-execution-engine/         moteur, SSE, états visuels (coche verte, icône d'attention)
   │  ├─ 04-ai-agents/                credentials, agents, sous-nodes, mémoire, outils, multi-agent
   │  ├─ 05-triggers/                 webhook, cron, Telegram, Email, nodes d'envoi
   │  └─ 06-history-and-demo/         historique, relecture, démos, README
   ├─ hooks/                          contrôles automatiques (contrat de node, sécurité, typecheck)
   └─ settings/mcp.json               Context7 (documentation à jour des bibliothèques)
```

## 2. Prérequis (à faire vous-même)

- Kiro IDE **1.0 ou plus récent** (les hooks utilisent le format `.kiro/hooks/*.json`), Node.js LTS (22 ou plus), pnpm, Git.
- Au moins **une clé API LLM** ; idéalement deux providers différents pour montrer deux modèles dans une démo.
- Un **bot Telegram** : écrire à @BotFather, commande `/newbot`, copier le token.
- Une **boîte email avec accès IMAP/SMTP** et un **mot de passe d'application** (Gmail et assimilés l'exigent).
- Deux secrets pour le serveur, à générer avec `openssl rand -base64 32` (un pour `BETTER_AUTH_SECRET`, un pour `ENCRYPTION_KEY`).

## 3. Installation

1. Créez un dossier vide pour le projet, puis `git init`. Deux façons d'installer le kit :
   - **archive** : décompressez `agentflow-kiro-kit.zip` à la racine du dossier ;
   - **fichiers `.md` séparés** : déposez-les tous dans un dossier `kiro-kit/` du projet, ouvrez Kiro et écrivez : « Lis kiro-kit/00-INSTALL.md et applique-le exactement. » Kiro place chaque fichier à son emplacement.
2. Ouvrez le dossier dans Kiro.
3. Vérifiez dans le panneau Kiro : **Steering** affiche 8 fichiers, **MCP** montre `context7` connecté, **Hooks** liste 3 hooks (celui de typecheck est désactivé volontairement).
4. Premier message de contrôle :
   > Résume le projet en 10 lignes : parcours utilisateur, format du workflow JSON, types de connexions, rôle des sous-nodes de l'agent, ce qui est hors périmètre. Puis liste les 6 specs présentes dans .kiro/specs.

   S'il se trompe, corrigez le fichier de steering concerné, pas la conversation.
5. Faites un premier commit : `chore: add kiro kit`.

## 4. Exécuter une spec

Les specs sont **déjà écrites**. Vous n'avez pas à générer les requirements ni le design : relisez-les (5 à 10 minutes par spec), puis exécutez les tâches.

1. Ouvrez `.kiro/specs/01-foundation/tasks.md`.
2. Cliquez sur « Start task » à côté de la tâche 1, ou écrivez dans le chat :
   > Exécute la tâche 1 de #01-foundation. Respecte #node-contract et #tech. Ne touche qu'aux fichiers de cette tâche. À la fin, liste les fichiers créés et lance les vérifications disponibles.
3. **Relisez le diff**, lancez `pnpm typecheck` et `pnpm test` quand ils existent, puis `git commit`.
4. Passez à la tâche suivante. Une tâche à la fois : ne demandez pas « tout exécuter d'un coup », les erreurs s'empilent.
5. À la fin de chaque spec, la **dernière tâche est un point de contrôle manuel** : faites-la vraiment, elle décrit ce que vous devez voir à l'écran.
6. Une tâche marquée `*` (optionnelle) peut être sautée.

Après la tâche 1 de la spec 01, ouvrez `.kiro/hooks/typecheck-on-stop.json` et passez `"enabled"` à `true`.

## 5. Planning conseillé

Le projet compte près de 70 tâches de premier niveau : **le calendrier est serré**. Visez ceci, et appliquez le plan de coupe sans état d'âme.

| Jour | Specs | Fin de journée : ce que vous devez voir |
|---|---|---|
| 1 | 01 + 02 | Inscription, dashboard, création d'un workflow, nodes glissés sur le canvas, connexions typées, sauvegarde et rechargement. L'agent affiche ses trois handles en bas. |
| 2 | 03 | Exécution avec nodes qui s'allument un par un, coche verte, arête verte, branche IF grisée, icône d'attention rouge sur une erreur volontaire, input/output au clic. |
| 3 | 04, puis 05 jusqu'à la tâche 4 | Pipeline de deux agents avec de vraies clés, erreur de clé affichée sur le Chat Model, activation d'un workflow, webhook et cron. |
| 4 | fin de 05, puis 06 | Telegram et Email déclenchent un workflow, les démos tournent, l'historique rouvre une exécution passée, le README permet de tout relancer. |

**Plan de coupe, dans cet ordre, si vous êtes en retard :**
1. Spec 04, tâche 12 (agent comme outil, déjà optionnelle).
2. Spec 05, tâche 5.3 (mode webhook Telegram) puis tâche 8 (trigger Email) et tâche 7 (Email Send).
3. Spec 06, tâche 5 (polish) et tâche 7 (test de non-fuite).
4. Spec 05, tâche 4 (Schedule).

À ne jamais couper : authentification, éditeur, visualisation d'exécution, pipeline multi-agent, trigger Telegram. Si vous coupez un trigger, retirez aussi sa démo de la spec 06 (tâche 4.1).

## 6. Quand Kiro dérape

| Symptôme | Message à envoyer |
|---|---|
| Il invente un type ou change un format | « Ce contrat existe dans #node-contract. Réutilise-le tel quel, n'en crée pas de nouveau. » |
| Code React Flow, Vercel AI SDK ou Better Auth qui ne compile pas | « Consulte la documentation de <bibliothèque> avec Context7, pour la version installée dans package.json, puis corrige. » |
| Diff trop large | « Annule les modifications hors du périmètre de la tâche N et ne garde que ce qui la concerne. » |
| Bug | « Écris d'abord un test qui reproduit le bug, puis corrige-le. » |
| Il ajoute une dépendance | « Cette dépendance n'est pas dans #tech. Fais sans, ou justifie. » |
| Session longue, il se perd | Ouvrez une nouvelle session et écrivez : « Relis #product et #node-contract, puis reprends la tâche N de #0X-nom. » |
| Il contourne la sécurité (clé dans une réponse, `eval`, requête sans `userId`) | « Ça viole #tech, section Sécurité. Corrige. » |

Si un fichier de steering conditionnel ne semble pas chargé pendant une spec, citez-le explicitement dans votre message (`#execution-engine`, `#agents-ai`, etc.).

## 7. Ce que ce kit ne remplace pas

- **Votre relecture** : Kiro peut produire du code plausible mais faux, surtout sur les API qui changent vite. Les tâches de contrôle manuel et les tests sont là pour ça.
- **Les tests avec de vraies clés dès le jour 3** : les tests automatiques utilisent un modèle factice, donc les erreurs réelles des providers n'apparaissent qu'avec de vraies clés.
- **Les décisions ouvertes** : nom du produit (`agentflow` est un placeholder), démo en local ou déployée (Telegram fonctionne en polling local par défaut), langue de l'interface (français par défaut).

## 8. Fichiers modifiables sans risque

Ajustez librement `product.md` (périmètre, démos) et les fichiers de steering pour refléter vos décisions : Kiro les relira à chaque requête. Si vous changez un contrat dans `node-contract.md`, mettez à jour les specs concernées (`design.md` et `tasks.md`) avant de lancer les tâches suivantes.
