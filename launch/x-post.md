# X / Twitter launch copy - composer profile pill

Style : des phrases normales, pas de fragments courts, pas de tirets cadratins.
Les compteurs sont `len()` du texte, limite 280 par post.

## Main post (274)

Petit plugin pour Hermes Desktop, si tu utilises plusieurs profils.

Le composer affiche le profil à côté du modèle, et l'onglet montre l'initiale de celui auquel appartient la conversation.

Le choix se bloque dès le premier message.

github.com/pyxl-dev/hermes-desktop-kit

## Reply 1 - pourquoi ça bloque (279)

Pourquoi bloqué : dans Hermes, une conversation appartient à un profil. Changer de profil en cours de route ne change pas un réglage, ça envoie la conversation sur un autre backend, avec d'autres clés et une autre mémoire. Donc le choix reste ouvert tant que la session est vide.

## Reply 2 - la pastille d'onglet (265)

La pastille dans l'onglet, elle, ne pouvait pas être un plugin : il n'y a pas d'emplacement prévu pour ça. Je l'ai donc proposée en amont (PR #143813 sur hermes-agent), et en attendant elle vit comme un patch dans le kit qu'un script remet après chaque mise à jour.

## Reply 3 - le plugin (129)

Tout le reste est un plugin normal, sans patch du core et sans rebuild : une copie dans ~/.hermes/desktop-plugins et c'est actif.

## Variante - un seul post (245)

Hermes Desktop ne disait pas sur quel profil tournait la conversation ouverte. Le composer affiche maintenant le profil à côté du modèle, l'onglet son initiale, et le choix se bloque dès le premier message. github.com/pyxl-dev/hermes-desktop-kit

## Notes

- Visuel : capture du sélecteur ouvert, plus un onglet avec l'initiale colorée.
- Ne rien laisser entendre sur une acceptation en amont : la PR #143813 est ouverte et sa CI n'a pas tourné.
