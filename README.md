# Hrikalegur

Frumgerð að vöktunarvef fyrir umhverfis-, skipulags- og byggingarrétt.

Þetta er fyrsta viðmótsfrumgerð. Færslurnar eru sýnigögn og verða síðar tengdar sjálfvirkri vöktun opinberra heimilda. Eldri æfingateljari verkefnisins er varðveittur undir `/old/` en enginn tengill á hann er sýndur á aðalvefnum.

## UUA-vöktun (prófun)

Fyrsti safnarinn les opinbera RSS-straum UUA, sannreynir málsnúmer, dagsetningu og beinan málstengil, fjarlægir tvítekningar og skrifar niðurstöðu í `data/uua.json`. Ef heimildin bilar eru eldri gögn látin ósnert og bilunin skráð í `data/uua-report.json`.

```sh
npm test
npm run collect:uua
```

Þessi áfangi birtir aðeins vélræna útdrætti sem „reifun bíður yfirferðar“. Engin AI-samantekt er birt sjálfkrafa.

GitHub Actions keyrir vöktunina daglega kl. 08:00 að íslenskum tíma. Málaskráin er aðeins vistuð aftur þegar ný eða breytt mál finnast; keyrsluskýrsla er varðveitt sem aðgerðarskrá í 14 daga. Einnig er hægt að ræsa keyrsluna handvirkt í Actions-flipa GitHub. Tímasett keyrsla tekur gildi þegar PR-ið hefur verið sameinað í aðalgreinina.

## Samráðsgátt

Samráðssafnarinn les opinbera RSS-veitu Samráðsgáttarinnar, sem gáttin uppfærir daglega. Hann birtir aðeins mál sem falla að vöktuðum efnisorðum, sannreynir beinan málstengil og skráir umsagnarfrest þegar hann finnst. Óviðkomandi mál eru skráð í keyrsluskýrslu en birtast ekki á vefnum.

```sh
npm run collect:samrad
```
