# Flowerix - Volledig Functioneel Overzicht

## 1. Applicatie Overzicht

Flowerix is een comprehensive plantenmanagement applicatie die gebruikers helpt bij het identificeren, verzorgen en bijhouden van hun planten. De app combineert AI-technologie met sociale functies en uitgebreide logging mogelijkheden.

## 2. Core Functionaliteiten

### 2.1 Plant Management

**Plant Toevoegen:**
- Foto-identificatie via AI (Google Gemini)
- Handmatige plant toevoeging
- Meerdere foto's per plant
- Wetenschappelijke naam automatisch invullen
- Binnen/buiten classificatie
- Actief/archief status

**Plant Details:**
- Volledige planteninformatie (naam, wetenschappelijke naam, beschrijving)
- Verzorgingsinstructies
- Meerdere locaties per plant (tuin gebieden)
- Datum geplant en toegevoegd
- Volledige geschiedenis en logs

**Plant Bewerkingen:**
- Plant bewerken (alle velden)
- Plant verwijderen
- Plant archiveren/heractiveren
- Plant verplaatsen tussen gebieden

### 2.2 Logging & Geschiedenis

**Plant Logs:**
- Datum-gebaseerde logging
- Titel en beschrijving
- Foto's toevoegen aan logs
- Weersinformatie automatisch koppelen
- Onbeperkte historie (premium functie)

**Tuin Logs:**
- Algemene tuinactiviteiten loggen
- Weersinformatie integratie
- Foto ondersteuning
- Chronologische weergave

### 2.3 AI & Analyse Functies

**Plant Identificatie:**
- Multi-image AI identificatie
- Top 3 meest waarschijnlijke kandidaten
- Confidence scores (0-100%)
- Gedetailleerde plantinformatie per kandidaat
- Nederlandse en Engelse taal ondersteuning

**Plant Analyse:**
- Ziekte detectie via foto
- Voedingsdeficiëntie analyse
- Stress factor identificatie
- Groei analyse
- Oogst advies
- Snoei aanbevelingen

**Plant Advies:**
- Gepersonaliseerde plant aanbevelingen
- Locatie-gebaseerde suggesties (binnen/buiten)
- Klimaat factor integratie
- Grondsoort matching
- Onderhoudsniveau filtering
- Kleur en seizoen voorkeuren

### 2.4 Weer Integratie

**Weer Data:**
- Actuele weersomstandigheden
- 7-daagse weersvoorspelling
- 28 dagen historische weerdata
- Temperatuur, neerslag, wind, luchtvochtigheid
- UV-index en zonnestraling
- Zonsopgang en zonsondergang tijden

**Weer Widgets:**
- Dashboard weeroverzicht
- Gedetailleerde weerpagina
- Weersinformatie in logs
- Feestdagen integratie per land

### 2.5 Foto & Media Functionaliteiten

**Foto Beheer:**
- Onbeperkte foto uploads (Supabase storage)
- Automatische compressie opties
- Foto optimalisatie tools
- Foto merge functionaliteit
- Meerdere formaten ondersteuning

**Slideshow & Presentatie:**
- Configureerbare slideshows
- Meerdere transitie effecten (fade, slide, zoom, rotate, cube, wipe)
- Aanpasbare duur per slide
- Tuin gebied specifieke slideshows
- Seizoenen gebaseerde presentaties

**Timelapse:**
- Foto timelapse creatie
- Interval configuratie
- Export mogelijkheden

### 2.6 Sociale Functies

**Wereldwijde Feed:**
- Wereldwijde planten posts
- Land-specifieke filtering
- Like functionaliteit
- Reactie systeem
- Lazy loading voor performance

**Social Interactie:**
- Posts liken
- Comments plaatsen
- Eigen posts beheren
- Andere gebruikers ontdekken

### 2.7 Tuin Gebieden & Layout

**Gebiedsbeheer:**
- Meerdere tuin gebieden
- Eigen naam en afbeelding per gebied
- Planten toewijzen aan gebieden
- Visuele tuin weergave
- Locatie gebaseerde indeling

**Kaart Integratie:**
- Locatie picker voor thuisadres
- Reverse geocoding
- Zoeken op plaatsnaam
- Kaartweergave met markers

### 2.8 Notitie & Planning Systeem

**Timeline & Notities:**
- Notitie creatie
- Taak beheer
- Herhalende taken (wekelijks, maandelijks, enz.)
- Afvink functionaliteit
- Datum gebaseerde weergave

**Planning Features:**
- Seizoensgebonden herinneringen
- Plant specifieke taken
- Algemene tuin planning
- Export mogelijkheden

## 3. Gebruikersrollen & Abonnementen

### 3.1 Abonnement Tiers

**FREE Tier:**
- 50.000 dagelijkse tokens
- Basis plant identificatie
- Beperkte historie
- Geen AI functies
- Gemini 2.5 Flash Lite model

**SILVER Tier (€3/maand):**
- 250.000 dagelijkse tokens
- Volledige slideshow functionaliteit
- Seizoenen modus
- Foto merge & optimalisatie
- Timelapse features
- Onbeperkte historie
- AI functies beschikbaar
- Gemini 2.5 Flash model

**GOLD Tier (€5/maand):**
- 500.000 dagelijkse tokens
- Alle Silver features
- Gemini 3 Pro model
- Volledige AI capaciteit

**DIAMOND Tier (Admin):**
- Onbeperkte tokens
- Alle premium features
- Admin toegang

### 3.2 Gebruikersrollen

**Normale Gebruikers:**
- Standaard registratie via email
- Beperkt tot eigen abonnement tier
- Toegang tot basis functionaliteiten

**Premium Gebruikers:**
- Betaalde abonnementen
- Volledige feature toegang
- Prioriteit bij AI verwerking

## 4. Instellingen & Configuratie

### 4.1 Algemene Instellingen

**Taal & Regio:**
- Nederlandse en Engelse taal
- Eerste dag van de week (maandag/zondag/zaterdag)
- Tijd formaat (12/24 uur)

**Weer Eenheden:**
- Temperatuur (Celsius/Fahrenheit)
- Lengte (mm/inch)
- Wind (km/h, mph, Beaufort)

**AI Limieten:**
- AI gebruik limiet instellen
- Token verbruik monitoring
- Usage statistics weergave

### 4.2 Module Instellingen

**Ingeschakelde Modules:**
- Tuin logs (aan/uit)
- Tuin weergave (aan/uit)
- Sociale functies (aan/uit)
- Notitie systeem (aan/uit)

### 4.3 Locatie Instellingen

**Thuis Locatie:**
- Adres invoer
- Coordinaten bepaling
- Kaart weergave
- Land detectie voor feestdagen

### 4.4 Muziek & Audio

**Achtergrondmuziek:**
- 15+ verschillende nummers
- Jazz, Rock, Rustige varianten
- Stem versies beschikbaar
- Vote systeem voor nummers
- Global statistics weergave

### 4.5 Privacy & Beveiliging

**Cookie Consent:**
- GDPR compliant cookie banner
- Opt-in voor analytics
- Privacy policy integratie

**Data Beveiliging:**
- Client-side usage tracking
- Hash validatie voor usage stats
- Supabase security policies

## 5. Technische Functionaliteiten

### 5.1 Data Synchronisatie

**Cloud Sync:**
- Supabase database integratie
- Real-time synchronisatie
- Offline-first benadering
- Conflict resolutie

**Backup & Export:**
- PDF export functionaliteit
- Volledige data export
- Plant specifieke exports
- Backup naar cloud

### 5.2 AI Service Integratie

**Google Gemini Integratie:**
- Multi-model ondersteuning
- Token usage tracking
- Rate limiting
- Error handling
- Response validatie

### 5.3 Image Processing

**Foto Compressie:**
- Automatische compressie
- Handmatige compressie opties
- Verschillende compressie modes
- Kwaliteit behoud

**Foto Validatie:**
- Content validatie
- Formaat controle
- Size limieten
- Security checks

### 5.4 Performance Optimalisaties

**Lazy Loading:**
- Social feed lazy loading
- Image lazy loading
- Component code splitting
- Data pagination

**Caching:**
- Browser caching
- Image caching
- Weather data caching
- API response caching

## 6. Gebruikersinterface & Navigatie

### 6.1 Hoofdnavigatie

**Dashboard Tabs:**
- Planten overzicht
- Tuin logs
- Tuin weergave
- Wereld feed
- Notitie systeem
- Extra functies

**Contextuele Navigatie:**
- Plant details navigatie
- Log navigatie
- Social interactie
- Settings toegang

### 6.2 Modals & Overlays

**Informatie Modals:**
- App rapport modal
- Samenvatting modal
- Web afbeeldingen modal

**Foto Modals:**
- Slideshow configuratie
- Foto merge modal
- Foto optimalisatie modal
- Timelapse modal

**Instellingen Modals:**
- Locatie picker modal
- Seizoenen modal
- Premium feature modal

### 6.3 Responsive Design

**Break Points:**
- Desktop first ontwerp
- Tablet adaptatie
- Mobiele optimalisatie
- Touch interactie ondersteuning

## 7. Integraties & Externe Services

### 7.1 Weer Services

**Open-Meteo API:**
- Actuele weerdata
- Voorspellingen
- Historische data
- Wereldwijde dekking

### 7.2 Kaart Services

**Leaflet.js:**
- Interactive kaarten
- Location picking
- Marker plaatsing
- Zoek functionaliteit

### 7.3 Database Services

**Supabase:**
- PostgreSQL database
- Real-time subscriptions
- File storage
- Authentication
- Row level security

### 7.4 AI Services

**Google Gemini:**
- Plant identificatie
- Ziekte analyse
- Advies generatie
- Content validatie

## 8. Beveiliging & Privacy

### 8.1 Data Beveiliging

**Encryptie:**
- SSL/TLS encryptie
- Database encryptie
- File storage beveiliging

**Toegangscontrole:**
- User authentication
- Role based access
- API rate limiting
- Usage quotas

### 8.2 Privacy Features

**Data Minimalisatie:**
- Alleen noodzakelijke data
- Gebruiker controle
- Data export mogelijkheden
- Account verwijdering

**Compliance:**
- GDPR compliant
- Cookie consent
- Privacy policy
- Terms of service

Dit overzicht bevat alle functionaliteiten, instellingen en mogelijkheden van de Flowerix applicatie. De app biedt een complete oplossing voor plantenliefhebbers met zowel basis als geavanceerde functies, ondersteund door AI technologie en cloud services.