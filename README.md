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
