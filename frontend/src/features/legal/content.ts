import { COMPANY } from "@vendelia/shared";
import type { Locale } from "@/i18n/config";

export interface LegalSection { h: string; p: string[] }
export interface LegalDoc { title: string; updated: string; intro: string; sections: LegalSection[] }

const C = COMPANY;

/** Privacy policy (tietosuojaseloste). Plain text on purpose: easy to review and change. */
export const PRIVACY: Record<Locale, LegalDoc> = {
  fi: {
    title: "Tietosuojaseloste",
    updated: "Päivitetty 13.11.2026",
    intro: `Tässä selosteessa kerromme, mitä henkilötietoja ${C.name} käsittelee Vendelia-palvelussa (vendelia.fi), miksi ja miten voit käyttää oikeuksiasi.`,
    sections: [
      { h: "Rekisterinpitäjä", p: [`${C.name}, Y-tunnus ${C.businessId}. Sähköposti ${C.customerEmail}, puhelin ${C.phone}. Tietosuoja-asioissa voit ottaa yhteyttä osoitteeseen ${C.customerEmail}.`] },
      { h: "Mitä tietoja käsittelemme", p: [
        "Tilitiedot: sähköpostiosoite ja salasana. Salasanaa ei tallenneta selväkielisenä. Jos kirjaudut Googlella, saamme Googlelta nimesi, sähköpostiosoitteesi ja Google-tilin tunnisteen.",
        "Tilaustiedot: nimi, sähköposti, puhelinnumero, ostetut lahjakortit, hinnat, lahjan saajan nimi ja viesti, jos annat ne, sekä uutiskirjeen tilaus.",
        "Lahjakorttien tiedot: koodi, voimassaolo, lunastus- ja peruutustiedot.",
        "Yritysasiakkaiden tiedot: yrityksen ja yhteyshenkilön yhteystiedot sekä yrityksen tarjoukset.",
        "Asiakaspalvelun viestit ja tekniset tiedot, kuten IP-osoite palvelinlokeissa.",
      ] },
      { h: "Käyttötarkoitus ja oikeusperuste", p: [
        "Sopimus: tilin ylläpito, tilausten käsittely, lahjakorttien toimitus sähköpostilla, lunastus, peruutukset ja hyvitykset.",
        "Lakisääteinen velvoite: kirjanpito ja verotus.",
        "Oikeutettu etu: palvelun turvallisuus, väärinkäytösten estäminen ja asiakaspalvelu.",
        "Suostumus: uutiskirje. Voit perua suostumuksesi milloin tahansa.",
      ] },
      { h: "Evästeet ja selaimen tallennus", p: [
        "Käytämme vain välttämätöntä istuntoevästettä, joka pitää sinut kirjautuneena (enintään 8 tuntia). Ostoskori tallennetaan selaimesi paikalliseen tallennustilaan. Emme käytä mainos- tai seurantaevästeitä.",
        "Tarjoussivujen kartat ladataan OpenStreetMapin ja Esrin palvelimilta, jolloin ne näkevät selaimesi IP-osoitteen.",
      ] },
      { h: "Tietojen luovutus ja käsittelijät", p: [
        "Lahjakortin myynyt yritys näkee lunastuksessa tarvittavat lahjakortin tiedot. Emme myy henkilötietoja.",
        "Käytämme luotettavia palveluntarjoajia, jotka käsittelevät tietoja puolestamme: Supabase (tietokanta ja kirjautuminen, palvelimet Lontoossa), Hostinger (palvelin), Google (sähköpostin lähetys ja Google-kirjautuminen) sekä maksupalveluntarjoaja verkkomaksuissa.",
      ] },
      { h: "Siirrot EU:n ja ETA:n ulkopuolelle", p: [
        "Iso-Britannialla on EU:n tietosuojan riittävyyspäätös. Jos palveluntarjoaja käsittelee tietoja Yhdysvalloissa, siirto perustuu EU–Yhdysvallat-tietosuojakehykseen tai EU:n vakiosopimuslausekkeisiin.",
      ] },
      { h: "Säilytysaika", p: [
        "Tilitiedot säilytetään, kunnes poistat tilin. Tilaus- ja maksutiedot säilytetään kirjanpitolain edellyttämän ajan (yleensä 6 vuotta tilikauden päättymisestä). Istuntotiedot poistuvat 8 tunnin kuluessa.",
      ] },
      { h: "Oikeutesi", p: [
        `Sinulla on oikeus saada pääsy tietoihisi, oikaista ja poistaa niitä, rajoittaa ja vastustaa käsittelyä sekä siirtää tiedot järjestelmästä toiseen. Lähetä pyyntö osoitteeseen ${C.customerEmail}.`,
        "Voit tehdä valituksen tietosuojavaltuutetun toimistolle (tietosuoja.fi).",
      ] },
      { h: "Tietoturva", p: ["Yhteydet on salattu (HTTPS), salasanoja ei tallenneta selväkielisinä ja pääsy tietoihin on rajattu niitä tarvitseville."] },
      { h: "Muutokset", p: ["Voimme päivittää tätä selostetta. Merkittävistä muutoksista kerromme palvelussa."] },
    ],
  },
  sv: {
    title: "Dataskyddsbeskrivning",
    updated: "Uppdaterad 13.11.2026",
    intro: `Här beskriver vi vilka personuppgifter ${C.name} behandlar i tjänsten Vendelia (vendelia.fi), varför, och hur du kan använda dina rättigheter.`,
    sections: [
      { h: "Personuppgiftsansvarig", p: [`${C.name}, FO-nummer ${C.businessId}. E-post ${C.customerEmail}, telefon ${C.phone}. I dataskyddsfrågor når du oss på ${C.customerEmail}.`] },
      { h: "Vilka uppgifter vi behandlar", p: [
        "Kontouppgifter: e-postadress och lösenord. Lösenordet sparas inte i klartext. Om du loggar in med Google får vi ditt namn, din e-postadress och ditt Google-kontos id.",
        "Beställningsuppgifter: namn, e-post, telefonnummer, köpta presentkort, priser, mottagarens namn och hälsning om du anger dem samt nyhetsbrevsbeställning.",
        "Presentkortsuppgifter: kod, giltighet, inlösen och avbeställningar.",
        "Uppgifter om företagskunder: kontaktuppgifter till företaget och kontaktpersonen samt företagets erbjudanden.",
        "Meddelanden till kundtjänst och tekniska uppgifter, som IP-adress i serverloggar.",
      ] },
      { h: "Ändamål och rättslig grund", p: [
        "Avtal: konto, beställningar, leverans av presentkort per e-post, inlösen, avbeställningar och återbetalningar.",
        "Rättslig förpliktelse: bokföring och beskattning.",
        "Berättigat intresse: tjänstens säkerhet, förhindrande av missbruk och kundtjänst.",
        "Samtycke: nyhetsbrev. Du kan återkalla samtycket när som helst.",
      ] },
      { h: "Kakor och lagring i webbläsaren", p: [
        "Vi använder bara en nödvändig sessionskaka som håller dig inloggad (högst 8 timmar). Kundvagnen sparas i webbläsarens lokala lagring. Vi använder inga reklam- eller spårningskakor.",
        "Kartorna på erbjudandesidorna laddas från OpenStreetMaps och Esris servrar, som då ser webbläsarens IP-adress.",
      ] },
      { h: "Utlämnande och personuppgiftsbiträden", p: [
        "Företaget som sålt presentkortet ser de uppgifter som behövs för inlösen. Vi säljer inte personuppgifter.",
        "Vi anlitar pålitliga leverantörer som behandlar uppgifter för vår räkning: Supabase (databas och inloggning, servrar i London), Hostinger (server), Google (e-postutskick och Google-inloggning) samt betaltjänstleverantören vid onlinebetalning.",
      ] },
      { h: "Överföring utanför EU och EES", p: [
        "Storbritannien har ett beslut om adekvat dataskydd från EU. Om en leverantör behandlar uppgifter i USA grundar sig överföringen på dataskyddsramen mellan EU och USA eller på EU:s standardavtalsklausuler.",
      ] },
      { h: "Lagringstid", p: [
        "Kontouppgifter sparas tills du raderar kontot. Beställnings- och betalningsuppgifter sparas den tid bokföringslagen kräver (i regel 6 år från räkenskapsperiodens slut). Sessionsuppgifter raderas inom 8 timmar.",
      ] },
      { h: "Dina rättigheter", p: [
        `Du har rätt till tillgång, rättelse och radering, att begränsa och invända mot behandling samt att flytta dina uppgifter. Skicka din begäran till ${C.customerEmail}.`,
        "Du kan lämna klagomål till dataombudsmannens byrå (tietosuoja.fi).",
      ] },
      { h: "Datasäkerhet", p: ["Förbindelserna är krypterade (HTTPS), lösenord sparas inte i klartext och åtkomsten är begränsad till dem som behöver den."] },
      { h: "Ändringar", p: ["Vi kan uppdatera beskrivningen. Väsentliga ändringar meddelar vi i tjänsten."] },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Updated 13 November 2026",
    intro: `This policy explains what personal data ${C.name} processes in the Vendelia service (vendelia.fi), why, and how you can use your rights.`,
    sections: [
      { h: "Controller", p: [`${C.name}, Business ID ${C.businessId}. Email ${C.customerEmail}, phone ${C.phone}. For privacy questions, contact ${C.customerEmail}.`] },
      { h: "What data we process", p: [
        "Account data: email address and password. Passwords are never stored in plain text. If you sign in with Google, we receive your name, email address and Google account ID from Google.",
        "Order data: name, email, phone number, vouchers bought, prices, a gift recipient's name and message if you add them, and newsletter subscription.",
        "Voucher data: code, validity, redemption and cancellation details.",
        "Business customers: contact details of the business and its contact person, and the business's deals.",
        "Customer service messages and technical data such as IP addresses in server logs.",
      ] },
      { h: "Purposes and legal basis", p: [
        "Contract: your account, orders, emailing vouchers, redemption, cancellations and refunds.",
        "Legal obligation: bookkeeping and tax.",
        "Legitimate interest: security of the service, preventing misuse and customer service.",
        "Consent: the newsletter. You can withdraw consent at any time.",
      ] },
      { h: "Cookies and browser storage", p: [
        "We use only one essential session cookie that keeps you signed in (up to 8 hours). Your cart is saved in your browser's local storage. We use no advertising or tracking cookies.",
        "Maps on deal pages load from OpenStreetMap and Esri servers, which see your browser's IP address.",
      ] },
      { h: "Sharing and processors", p: [
        "The business that sold a voucher sees the voucher details needed to redeem it. We do not sell personal data.",
        "We use trusted providers that process data on our behalf: Supabase (database and sign-in, servers in London), Hostinger (server), Google (email delivery and Google sign-in) and the payment provider for online payments.",
      ] },
      { h: "Transfers outside the EU and EEA", p: [
        "The United Kingdom has an EU adequacy decision. Where a provider processes data in the United States, the transfer relies on the EU–US Data Privacy Framework or the EU Standard Contractual Clauses.",
      ] },
      { h: "Retention", p: [
        "Account data is kept until you delete your account. Order and payment records are kept as long as the Finnish Accounting Act requires (usually 6 years from the end of the financial year). Session data is deleted within 8 hours.",
      ] },
      { h: "Your rights", p: [
        `You have the right to access, correct and delete your data, to restrict or object to processing, and to data portability. Send requests to ${C.customerEmail}.`,
        "You can lodge a complaint with the Finnish Data Protection Ombudsman (tietosuoja.fi).",
      ] },
      { h: "Security", p: ["Connections are encrypted (HTTPS), passwords are never stored in plain text and access to data is limited to those who need it."] },
      { h: "Changes", p: ["We may update this policy. We will announce significant changes in the service."] },
    ],
  },
};

/** Terms of service (käyttöehdot) for customers buying vouchers. */
export const TERMS: Record<Locale, LegalDoc> = {
  fi: {
    title: "Käyttöehdot",
    updated: "Päivitetty 13.11.2026",
    intro: `Nämä ehdot koskevat Vendelia-palvelun (vendelia.fi) käyttöä ja lahjakorttien ostamista. Palvelua ylläpitää ${C.name} (Y-tunnus ${C.businessId}).`,
    sections: [
      { h: "Palvelu", p: ["Vendeliassa paikalliset yritykset myyvät palveluitaan lahjakortteina. Vendelia myy lahjakortin yrityksen lukuun. Palvelun tuottaa ja siitä vastaa lahjakortin myynyt yritys."] },
      { h: "Käyttäjätili", p: ["Ostaminen edellyttää käyttäjätiliä. Voit luoda tilin sähköpostilla ja salasanalla tai kirjautua Google-tilillä. Anna oikeat tiedot ja pidä salasanasi omana tietonasi. Vastaat tililläsi tehdyistä ostoista."] },
      { h: "Ostaminen ja hinnat", p: ["Hinnat sisältävät arvonlisäveron, eikä palvelu- tai toimitusmaksuja peritä. Tilaus on vahvistettu, kun maksu on suoritettu. Lahjakortti lähetetään sähköpostiisi PDF-tiedostona, ja se löytyy myös kohdasta Omat lahjakortit."] },
      { h: "Lahjakortin käyttö", p: ["Lahjakortti on voimassa tarjoussivulla ja lahjakortissa ilmoitetun ajan. Lunasta se yrityksessä tarjouksen ohjeiden mukaan, esimerkiksi varaamalla ajan. Lahjakortin voi käyttää kerran, eikä sitä voi vaihtaa rahaksi. Käyttämätön lahjakortti vanhenee voimassaolon päättyessä."] },
      { h: "Peruutus ja hyvitys", p: ["Voit perua käyttämättömän lahjakortin 14 päivän kuluessa ostosta ja saada täyden hyvityksen kohdassa Omat lahjakortit tai sähköpostitse. Hyvitys maksetaan alkuperäiselle maksutavalle. Jos lunastat lahjakortin tänä aikana, peruutusoikeus päättyy. Käytettyihin lahjakortteihin sovelletaan yrityksen ehtoja ja lakisääteisiä oikeuksiasi."] },
      { h: "Yrityksen vastuu ja reklamaatiot", p: [`Palvelun laadusta vastaa yritys. Jos palvelussa on ongelma, ota ensin yhteyttä yritykseen. Autamme mielellämme osoitteessa ${C.customerEmail}. Jos yritys ei pysty tuottamaan palvelua, hyvitämme käyttämättömän lahjakortin.`] },
      { h: "Kielletty käyttö", p: ["Palvelua ei saa käyttää lainvastaisesti, väärinkäyttää lahjakorttikoodeja tai häiritä palvelun toimintaa. Voimme sulkea tilin, jota käytetään ehtojen vastaisesti."] },
      { h: "Vastuunrajoitus", p: ["Vastaamme palvelusta pakottavan lainsäädännön mukaisesti. Nämä ehdot eivät rajoita kuluttajansuojalain mukaisia oikeuksiasi."] },
      { h: "Sovellettava laki ja riidat", p: ["Ehtoihin sovelletaan Suomen lakia. Jos asiaa ei saada ratkaistua kanssamme, kuluttaja voi pyytää apua kuluttajaneuvonnasta ja viedä asian kuluttajariitalautakunnan käsiteltäväksi (kuluttajariita.fi)."] },
      { h: "Yhteystiedot", p: [`${C.name}, Y-tunnus ${C.businessId}. Asiakaspalvelu ${C.customerEmail}, yritysasiakkaat ${C.businessEmail}, puhelin ${C.phone}.`] },
    ],
  },
  sv: {
    title: "Användarvillkor",
    updated: "Uppdaterade 13.11.2026",
    intro: `Dessa villkor gäller användningen av tjänsten Vendelia (vendelia.fi) och köp av presentkort. Tjänsten drivs av ${C.name} (FO-nummer ${C.businessId}).`,
    sections: [
      { h: "Tjänsten", p: ["På Vendelia säljer lokala företag sina tjänster som presentkort. Vendelia säljer presentkortet för företagets räkning. Tjänsten utförs av och är företagets ansvar."] },
      { h: "Användarkonto", p: ["För att köpa behöver du ett konto. Du kan skapa ett med e-post och lösenord eller logga in med ditt Google-konto. Ange korrekta uppgifter och håll lösenordet för dig själv. Du ansvarar för köp som görs med ditt konto."] },
      { h: "Köp och priser", p: ["Priserna inkluderar moms och inga service- eller leveransavgifter tas ut. Beställningen är bekräftad när betalningen är genomförd. Presentkortet skickas till din e-post som PDF och finns även under Mina presentkort."] },
      { h: "Användning av presentkortet", p: ["Presentkortet gäller den tid som anges på erbjudandesidan och på presentkortet. Lös in det hos företaget enligt instruktionerna, till exempel genom att boka tid. Presentkortet kan användas en gång och kan inte växlas mot pengar. Ett oanvänt presentkort upphör att gälla när giltighetstiden går ut."] },
      { h: "Avbeställning och återbetalning", p: ["Du kan avbeställa ett oanvänt presentkort inom 14 dagar från köpet och få full återbetalning under Mina presentkort eller per e-post. Pengarna återbetalas till det ursprungliga betalningssättet. Om du löser in presentkortet under denna tid upphör ångerrätten. För använda presentkort gäller företagets villkor och dina lagstadgade rättigheter."] },
      { h: "Företagets ansvar och reklamationer", p: [`Företaget ansvarar för tjänstens kvalitet. Kontakta först företaget om något är fel. Vi hjälper gärna till på ${C.customerEmail}. Om företaget inte kan utföra tjänsten återbetalar vi ett oanvänt presentkort.`] },
      { h: "Förbjuden användning", p: ["Tjänsten får inte användas olagligt, presentkortskoder får inte missbrukas och tjänstens funktion får inte störas. Vi kan stänga ett konto som används i strid med villkoren."] },
      { h: "Ansvarsbegränsning", p: ["Vi ansvarar för tjänsten enligt tvingande lag. Villkoren begränsar inte dina rättigheter enligt konsumentskyddslagen."] },
      { h: "Tillämplig lag och tvister", p: ["Finsk lag tillämpas. Om vi inte når en lösning tillsammans kan en konsument få hjälp av konsumentrådgivningen och föra ärendet till konsumenttvistenämnden (kuluttajariita.fi)."] },
      { h: "Kontaktuppgifter", p: [`${C.name}, FO-nummer ${C.businessId}. Kundtjänst ${C.customerEmail}, företagskunder ${C.businessEmail}, telefon ${C.phone}.`] },
    ],
  },
  en: {
    title: "Terms of service",
    updated: "Updated 13 November 2026",
    intro: `These terms apply to using the Vendelia service (vendelia.fi) and buying vouchers. The service is run by ${C.name} (Business ID ${C.businessId}).`,
    sections: [
      { h: "The service", p: ["On Vendelia, local businesses sell their services as vouchers. Vendelia sells each voucher on behalf of the business. The business provides the service and is responsible for it."] },
      { h: "Your account", p: ["You need an account to buy. You can create one with email and password or sign in with your Google account. Give accurate details and keep your password to yourself. You are responsible for purchases made with your account."] },
      { h: "Buying and prices", p: ["Prices include VAT and there are no service or delivery fees. Your order is confirmed once payment is complete. The voucher is emailed to you as a PDF and is also available in My vouchers."] },
      { h: "Using a voucher", p: ["A voucher is valid for the period shown on the deal page and on the voucher. Redeem it with the business as the deal instructs, for example by booking a time. A voucher can be used once and cannot be exchanged for cash. An unused voucher expires when its validity ends."] },
      { h: "Cancellation and refunds", p: ["You can cancel an unused voucher within 14 days of purchase for a full refund in My vouchers or by email. The refund goes to your original payment method. If you redeem the voucher during that time, the right to cancel ends. Used vouchers follow the business's terms and your statutory rights."] },
      { h: "The business's responsibility and complaints", p: [`The business is responsible for the quality of its service. If something is wrong, contact the business first. We are happy to help at ${C.customerEmail}. If the business cannot provide the service, we refund an unused voucher.`] },
      { h: "Prohibited use", p: ["Do not use the service unlawfully, misuse voucher codes or interfere with the service. We may close an account used against these terms."] },
      { h: "Limitation of liability", p: ["We are liable for the service as required by mandatory law. These terms do not limit your rights under Finnish consumer protection law."] },
      { h: "Governing law and disputes", p: ["Finnish law applies. If we cannot resolve a matter together, consumers can get help from consumer advisory services and take the matter to the Finnish Consumer Disputes Board (kuluttajariita.fi)."] },
      { h: "Contact", p: [`${C.name}, Business ID ${C.businessId}. Customer service ${C.customerEmail}, businesses ${C.businessEmail}, phone ${C.phone}.`] },
    ],
  },
};
