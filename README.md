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

Samráðssafnarinn les opinbera RSS-veitu Samráðsgáttarinnar, sem gáttin uppfærir daglega. Hann birtir aðeins mál sem falla að vöktuðum efnisorðum og sannreynir beinan málstengil. Fyrir viðeigandi mál sækir hann síðan nánari opinber gögn af málssíðunni: málsnúmer, birtingardag, umsagnarfrest, stöðu og efnislýsingu. Óviðkomandi mál eru skráð í keyrsluskýrslu en birtast ekki á vefnum. Ef einstök málssíða svarar ekki heldur grunnfærslan áfram að birtast.

```sh
npm run collect:samrad
```

## Stjórnarráðið

Safnarinn les opinberan RSS-straum með fréttum frá öllum ráðuneytum og birtir aðeins fréttir sem falla að vöktuðum efnisorðum. Beinir fréttatenglar, titlar og dagsetningar eru sannreynd áður en færslur birtast. Stutta reifunin kemur úr opinberri lýsingu fréttarinnar og er merkt sem óyfirfarin. Eldri gögn eru varðveitt ef þjónustan bilar tímabundið.

```sh
npm run collect:stjornarrad
```

## Dómstólar

Dómstólasafnarinn les opinber RSS-streymi Hæstaréttar, Landsréttar og allra átta héraðsdómstólanna. Hann sækir opinbera reifun og lykilorð hvers dóms og birtir aðeins dóma sem falla að vöktuðum efnisorðum. Beinir dómatenglar, málsnúmer og dagsetningar eru sannreynd og eldri viðeigandi dómar varðveittir þegar þeir detta úr RSS-straumunum.

```sh
npm run collect:domstolar
```
