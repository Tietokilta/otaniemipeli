insert into boards (name)
values ('Lauta 2025'),
       ('Lauta 2001'),
       ('Lauta 1985');
insert into ingredients (name, abv, carbonated)
values ('Kalja', 4.7, true),
       ('Slime', 40.0, false),
       ('Punaviini', 15.0, false),
       ('Siideri', 5.3, true),
       ('Coca Cola', 0.0, true),
       ('Koskenkorva', 38.0, false),
       ('Tequila', 40.0, false),
       ('Fernet-Branca', 39.0, false),
       ('Thunder', 12.0, false),
       ('Lonkero', 5.5, true),
       ('Vichy', 0.0, true),
       ('A12 Denat', 80.0, false),
       ('Energiajuoma', 0.0, true),
       ('Punssi', 40.0, false),
       ('Jaloviina', 38.0, false),
       ('Appelsiinimehu', 0.0, false),
       ('Jägermeister', 40.0, false),
       ('Minttu', 40.0, false),
       ('Trocadero', 0.0, true),
       ('Absintti', 66.0, false),
       ('Mehukatti', 0.0, false),
       ('Salmari', 32.0, false),
       ('Banaanilikööri', 20.0, false),
       ('Hauki', 20.0, false);
INSERT INTO drinks (name, favorite, no_mix_required)
VALUES ('Kalja', true, true),
       ('AS-huikka', false, false),
       ('Slime', true, false),
       ('Terästetty Kokis', false, false),
       ('Siideri', false, false),
       ('Punaviini', false, false),
       ('Tequila', false, false),
       ('Fernet-Branca', false, false),
       ('Thunder', false, false),
       ('Vichy', false, false),
       ('Pirtu', false, false),
       ('Energiajuoma', false, false),
       ('Kuulalaakeri', false, false),
       ('Korjaussarja', false, false),
       ('Vodka', false, false),
       ('Lammen vesi', false, false),
       ('Suohauta', false, false),
       ('Jallu', false, false),
       ('Trocadero', false, false),
       ('Terästetty Trocadero', false, false),
       ('Absintti', false, false),
       ('Pöhkötaksi', false, false),
       ('Apoptoosi', false, false),
       ('Lonkero', false, false),
       ('Kokis', false, false),
       ('Varasto', false, false),
       ('Hauki', false, false),
       -- TODO: Add IE the ability to specify
       ('Taikajuoma', false, false),
       -- TODO: Store design factory drinks in the database
       ('Design-juoma', false, false);
INSERT INTO drink_ingredients (drink_id, ingredient_id, quantity)
VALUES (1, 1, 33),
       (2, 1, 11),
       (2, 4, 11),
       (2, 3, 11),
       (3, 2, 4),
       (4, 5, 33),
       (4, 6, 4),
       (5, 4, 33),
       (6, 3, 15),
       (7, 7, 4),
       (8, 8, 4),
       (9, 9, 20),
       (10, 11, 33),
       (11, 12, 4),
       (12, 13, 33),
       (13, 15, 2),
       (13, 14, 2),
       (14, 16, 30),
       (14, 6, 8),
       (15, 6, 4),
       (16, 10, 33),
       (16, 17, 4),
       (17, 15, 2),
       (17, 6, 2),
       (17, 18, 2),
       (18, 15, 4),
       (19, 19, 33),
       (20, 19, 29),
       (20, 6, 4),
       (21, 20, 4),
       (22, 21, 2),
       (22, 12, 2),
       (23, 22, 2),
       (23, 23, 2),
       (24, 10, 33),
       (25, 5, 33),
       (26, 16, 2),
       (26, 12, 2),
       (27, 24, 4);

INSERT INTO public.places (place_name, rule, place_type)
VALUES ('Metroasema',
        'Matkanne kohti T-taloa alkaa Tietotien metroaseman luona olevalta pysäkiltä. Pelin aloittamisjärjestyksen selvittämiseksi jokainen joukkue juo tuomarin päätöksen mukaisen määrän tuomarin päättämää juomaa. Tuomari voi päättää aloitusjärjestyksestä myös muilla tavoin.',
        'Special'),
       ('Normaaliruutu', 'Normaalista ruudusta löydät kaljan. Ruutua ei täytetä', 'Normal'),
       ('A-bloc',
        'Joukkue saapuu A Blocille. Pelin alkuvaiheessa vatsaa on hyvä täydentää ruualla. Tarjolla on siis shotti hyytelöä!',
        'Food'),
       ('Raide-Jokeri',
        'Olette saapuneet Raide-Jokerin pysäkille. Päätätte hypätä kyytiin, ja pian löydättekin itsenne Maarinsolmun K-marketin pihalta. Kauppias tarjoaa teille matkaevästä, ja pääsette nauttimaan yhden shotin hyytelöä.',
        'Special'),
       ('Oikeustalo', 'Absintti', 'Special'),
       ('Lintutorni',
        'Joukkue erottaa tarkoilla korvillaan pöllön huhuilua ja ansaitsee lasin jaloviinaa.',
        'Special'),
       ('Suo',
        'Lintutornista selvittyään joukkue joutuu vielä kahlaamaan suon läpi ja nauttimaan annoksen suohautaa.',
        'Special'),
       ('Alvari',
        'Joukkue saapuu nälkäisenä Alvarille. Onneksi matkassa on mukana ripaus onnea, eikä joukkue joudu poistumaan tyhjin vatsoin. Siispä joukkue pääsee nauttimaan yhden shotin hyytelöä.',
        'Food'),
       ('Prodekon kiltahuone',
        'Joukkue saapuu TUAS talolle ja päättää ensimmäiseksi vierailla Prodekon luona. Yhtäkkiä maa vavahtaa, ja sisäpihalla välähtää salama. Onnekseen joukkue löytää kiltahuoneelta ukkosen myös nestemäisessä muodossa, ja saa nautittavakseen tuopillisen Thunderia (33cl). Thunder ei tunnetusti lopu tarpeeksi ajoissa.',
        'Guild'),
       ('OLOhuone',
        'Joukkue astelee T-talon aulaan. Samalla hetkellä tuttu Athenelainen vilkuttaa OLOhuoneelta, ja kutsuu kyläilemään. Hän tarjoaa joukkueelle yhden shotin tequilaa! (4 cl)',
        'Guild'),
       ('Database',
        'Joukkue päättää kurkata sisään Data Guildin kiltahuoneelle Databaseen. Kenkähyllyssä he huomaavat glitteripurkin, ja päättävät kaataa sitä vieressä odottavaan Trocaderopulloon (33cl). Lisäksi he kysyvät paikallaolijoilta, pitäisikö annokseen lisätä myös viinaa (4cl). Yleisön vaatiessa näin tehdään.',
        'Guild'),
       ('SIKin kiltahuone',
        'Joukkue kuulee sähkön suloääniä, ja päättää astua sisään SIKin kiltahuoneelle. Kiltahuoneella heille tarjoillaan annos kuulalaakeria (2 cl jallu, 2 cl punssi)',
        'Guild'),
       ('ASki',
        'Joukkue saapuu AS:n kiltahuoneelle, ja heidän kutsutaan mukaan pelaamaan AShuikkaa. Siispä ruudussa on tuoppi sisältäen kaljaa, siideriä ja punkkua. (11 cl kaljaa, 11 cl siideriä, 11 cl punkkua)',
        'Guild'),
       ('TUASin ruokala',
        'TUASin ruokalaan saapuvaa joukkuetta odottaa tavalliseen tapaan lasillinen hyytelöä. (H)',
        'Food'),
       ('T-talon ruokala',
        'T-talon ruokalaan saapuvaa joukkuetta odottaa tavalliseen tapaan lasillinen hyytelöä. (H)',
        'Food'),
       ('Design Factory',
        'Joukkue pöhisee, ja haluaa keksiä uuden startup-idean. Täten he pääsevät suunnittelemaan seuraavalle saapuvalle joukkueelle drinkin isännän ja emännän ilmoittamasta ainesosavalikoimasta.',
        'Special'),
       ('Sähkölaitos',
        'Joukkue saapuu sähkölaitokselle ja saa kaljan sijaan piristävän energiajuoman. (33 cl)',
        'Special'),
       ('Vanha kiltis',
        'Vanhan kiltahuoneen muistoksi ruudussa on aluksi yksi kalja. Ruutu täydennetään jokaisen joukkueen jälkeen. Jokaisen käynnin jälkeen ruutuun ilmestyy yksi kalja enemmän kuin edellisellä kerralla! (33 · n cl)',
        'Guild'),
       ('IK:n kiltis',
        'Joukkue saapuu Rakennusinsinöörikillan kiltahuoneelle ja päättää pelata pikaisen Norske Kimblen. Joukkue heittää kahta noppaa ja saa pienemmän silmäluvun mukaisen määrän kaljapulloja juotavakseen. (33 · x cl)',
        'Guild'),
       ('Ossinlampi',
        'Joukkue saapuu Ossinlammen rannalle. Koska tunnelma on lämmin, päättää joukkue käydä viilentymässä Ossinlammessa ja nauttien samalla lasillisen lammen vettä. (33 cl Lonkero, 4 cl jekku)',
        'Special'),
       ('Kvarkki',
        'Joukkue muistaa yllättäen, että tänään on kvarkkipäivä! Kvarkkipäivää joukkue päättää juhlistaa lasillisella hyytelöä. (H)',
        'Food'),
       ('Maarintalo, excubussi',
        'Joukkue saapuu uuden Otaparkin pihaan. Otaparkin eteen pysähtyneen excubussin kuljettaja vaatii joukkuetta astumaan sisään bussiin. Hetken kuluttua joukkue löytää itsensä matkalta kohti Tamperetta. Onneksi bussista löytyy tuttuja, joilta joukkue voi pyytää matkajuomia: (33 cl kola | 33 cl kalja | 33 cl siideri | 12 cl punkku).',
        'Special'),
       ('Miinusmaa',
        'Joukkue pysähtyy pelaamaan kyykkää. Harmillisesti karttu lentää aivan mihin sattuu, ja joukkue saa rangaistukseksi annoksen haukea. (4 cl)',
        'Special'),
       ('Ylioppilaiden terveydenhuoltosäätiö',
        'Eräs joukkueen jäsen alkaa valittelemaan tulehtunutta varvastaan, joka vaatii desinfiointia. Onneksi YTHS:n lääkäri on joukkueelle suotuisa, ja tarjoaa kaljapullon sijasta juotavakseen snapsilasillisen pirtua. Hätätilassa käy myös esim. A12-denaturoitu sprii tai kasari. (4 cl)',
        'Special'),
       ('Tietokillan varasto',
        'Joukkue toteaa olevansa janoinen ja päättää suunnata Tietokillan varastolle.  Siellä heitä odottavat vastassa IE, jotka kannustavat kaikkia joukkueita mukaan pelaamaan ykköstä.',
        'Special'),
       ('Taikametsä',
        'Joukkue astelee taikametsään. Taikametsässä ei voi koskaan tietää, mitä edestänsä löytää, joten joukkue pääsee nauttimaan noppien silmäluvun osoittaman taikajuoman. Kullekin silmälukuyhdistelmälle kuuluvan juoman päättävät isäntä ja emäntä ennen peliä.',
        'Special'),
       ('Kappeli',
        'Kappelissa joukkueelle tarjotaan tavanomaisen kaljan sijaan lasillinen ehtoollisviiniä, joka tulee nauttia ennen matkan jatkamista. (12 cl)',
        'Special'),
       ('Rantasauna',
        'Matka on ollut pitkä ja joukkue kaipaa puhdistautumista. Joukkue päättää siis vierailla rantsulla ja hypätä paljuun nauttimaan yhden kaljan. (33 cl) Rantsun kaljalähde on loputon, joten ruutu täydennetään joukkueen jälkeen.',
        'Sauna'),
       ('Gorsu',
        'Joukkue saapuu Gorsulle ja päättää jäädä hetkeksi saunomaan, nauttien samalla yhden kaljan. (33 cl). Gorsulta ei kalja lopu, eli ruutu täytetään jokaisen joukkueen jälkeen.',
        'Sauna'),
       ('Smökki',
        'Joukkue astelee sisään smökin ovista ja liittyy mukaan sitsaamaan. Tarjolla on tietysti ruokaa ja juomaa eli yksi olut ja yksi hyytelö. (33 cl olut, H)',
        'Special'),
       ('Ossinsauna', 'Ossinsaunalta ei kalja lopu. Ruutu täytetään jokaisen joukkueen jälkeen. (33 cl)', 'Sauna'),
       ('OK20', 'OK20:n saunoilla ilta jatkuu yli puolen yön eikä kalja lopu! (33 cl)', 'Sauna'),
       ('JMT1 aula',
        'Törmäät aulassa vanhaan tuttuun, joka haluaa pullostansa eroon. Hän tarjoaa joukkueelle Ferraa. (4 cl)',
        'Special'),
       ('JMT3',
        '3A:n saunastakaan ei kalja lopu, eli ruutu täytetään jokaisen joukkueen jälkeen. (33 cl)',
        'Sauna'),
       ('Otaranta 8',
        'Myöskään Otarannan kattosaunalta ei kalja lopu kesken. Ruutu täytetään jokaisen joukkueen jälkeen. (33 cl)',
        'Sauna'),
       ('Täffä', 'Täffällä ei olekaan spagettipäivä vaan hyytelöpäivä. (H)', 'Food'),
       ('Dipoli',
        'Dipolissa törmäät rehtoriin, joka kutsuu joukkueen lounaalle. Joukkue saa hyytelöä. (H)',
        'Food'),
       ('X-burger', 'X-Burgerilta joukkue hankkii itselleen annoksen hyytelöä. (H)', 'Food'),
       ('Vanha ostari',
        'Vanhan ostarin monipuolinen tarjonta innoittaa joukkueen hankkimaan sekä lasillisen hyytelöä että oluenpalanpainikkeeksi. (33 cl kalja, H)',
        'Food'),
       ('Aalto-yliopiston Ylioppilaskunta',
        'Joukkue eksyy AYY:n keskustoimistolle ja vapaaehtoishommat vievät yllättäen mennessään. Joukkue heittää yhtä noppaa ja siirtyy silmäluvun mukaan taaksepäin. Tuplilla taaksepäin liikutaan tietenkin tuplat.',
        'Special'),
       ('Fyssan kiltis',
        'Fyysikkokillan kiltiksellä joukkueelle on tarjolla asteen pöhkömpää taksia. (2 cl Vihreä mehukatti 2 cl kasari)',
        'Guild'),
       ('Inkubion kiltis',
        'Inkubion kiltahuoneella tarjolla on Apoptoosia. (2 cl Banaanilikööri, 2 cl salmari)',
        'Guild'),
       ('Koneen kiltis',
        'Koneinsinöörikillan kiltahuoneella joukkue juo tuopin korjaussarjaa. (4 cl kossu, 16 cl appelsiinimehu)',
        'Guild'),
       ('Kiltis',
        'Ensimmäisenä Tietokillan kiltahuoneelle tasaluvulla saapuva joukkue voittaa pelin!',
        'Special'),
       ('Mikontalo',
        'Mikontalo tekee kiljua Kioton sopimusta uhmaten! Joukkue juo lasin kotiviiniä (12 cl).',
        'Special'),
       ('Kultainen apina', 'Kapinasta ei kalja lopu. Joukkue juo yhden oluen. (33 cl)', 'Special'),
       ('TiTen kiltahuone',
        'Kiltahuone muuttaa Kolaa koodiksi. Joukkue juo lasin kolaa. Terästettynä yleisön vaatiessa. (33 cl)',
        'Guild'),
       ('Teekkarisauna',
        'Joukkue on päätynyt teekkarisaunalle, jossa ohjelmassa on teekkarisauna™. Joukkue joutuu nauttimaan kolme pulloa kaljaa seka lasillisen hyytelöä ennen kuin voi jatkaa matkaa. (33 cl kalja, H)',
        'Sauna'),
       ('Tupsula',
        'Käyt padassa ja hörppäät patavettä. Varo kortsuja! Ryhmä juo lämmintä lonkeroa, jossa saattaa olla kondomi. (33 cl Lonkero, Kondomi)',
        'Special'),
       ('Etuparkki. excubussi',
        'Joukkueen päästessä tähän ruutuun (yli menevät heitot lasketaan) excubussi vie takaisin Otaniemeen.  Joukkue voi halutessaan tilata bussimatkalle juotavaa (33 cl kola | 33 cl kalja | 33 cl siideri | 12 cl punkku).',
        'Special'),
       ('Maarinsolmu',
        'Olette saapuneet raide-jokerin pysäkille. Päätätte hypätä kyytiin, ja pian löydättekin itsenne Maarinsolmun K-marketin pihalta. Kauppias tarjoaa teille matkaevästä, ja pääsette nauttimaan yhden shotin hyytelöä.',
        'Food'),
       ('Urheilukenttä',
        'Urheilukentän kohdalla sinne ensimmäiseksi saapunut joukkue suorittaa 110 metrin aidat eli juo kolme pulloa olutta, ennen kuin pääsee jatkamaan. (3 · 33 cl) Ruutua ei täydennetä!',
        'Special'),
       ('Ostari',
        'Otariisto, R-Kioski ja Jamoi. Kalja ei kaupasta lopu. Ruutu täydennetään jokaisen joukkueen jälkeen!',
        'Sauna'),
       ('Puunjalostajakillan kiltahuone',
        'Vierailu puunjalostajien kiltahuoneella. Ruutu täydennetään jokaisen joukkueen jälkeen!',
        'Guild'),
       ('Vuorilafkan ruokala',
        'Vuoren ruokalaan saapuvaa joukkuetta odottaa tavalliseen tapaan lasillinen hyytelöä.',
        'Food'),
       ('Kemman lafkan kuppila', 'Kemman lafkan kuppilaan saapuvaa odottaa tavalliseen tapaan lasillinen hyytelöä.', 'Food'),
       ('Koneen kiltahuone', 'Vierailu koneen kiltahuoneella. Ruutu täydennetään jokaisen joukkueen jälkeen!', 'Guild'),
       ('Fyssan ruokala', 'Fyssan ruokalaan saapuvaa odottaa tavalliseen tapaan lasillinen hyytelöä.', 'Food'),
       ('Sähkön ruokala',
        'Sähkön ruokalaan saapuvaa joukkuetta odottaa tavalliseen tapaan lasillinen hyytelöä. Ruutu täytetään jokaisen joukkueen jälkeen!',
        'Food'),
       ('Uimahalli',
        'Uimahallilla juodaankin kaljan sijasta vissyä. Uimahallista ei myöskään juotava lopu.',
        'Special'),
       ('Pub jälkipeli', 'Pub Jälkipelistä ei kalja lopu, eli ruutu täytetään jokaisen joukkueen jälkeen.', 'Special'),
       ('Keltsu',
        'Keltsuun saapuva joukkue joutuu nauttimaan kolme pulloa kaljaa sekä lasillisen hyytelöä, ennenkuin voi jatkaa matkaa. Ruutu täytetään jokaisen joukkueen jälkeen! Keltsusta ei juoma eikä ruoka lopu!',
        'Special'),
       ('OUBS',
        'OUBS:iin saapuvaa joukkuetta odottaa kaljapullon sijasta snapsillinen Fernet-Brancaa (voidaan hätätapauksissa korvata Minttu-Fernetillä).',
        'Special');


COPY public.board_places (board_id, place_number, place_id, area, start, "end", x, y) FROM stdin;
1	49	33	normal	f	f	81.70000000000002	50.04999999999997
1	50	34	normal	f	f	85.4	43.1999999999999
1	24	18	normal	f	f	62.150000000000006	54
1	51	35	normal	f	f	89.00000000000003	52.39999999999989
1	25	19	normal	f	f	67.09999999999998	52.799999999999926
1	26	2	normal	f	f	72.00000000000001	51.250000000000014
1	27	2	normal	f	f	73.65	42.749999999999986
1	28	20	normal	f	f	70.14999999999999	39.50000000000003
1	52	2	normal	f	f	89.45000000000005	63.599999999999966
1	53	52	normal	f	f	83.55000000000007	64.59999999999995
1	54	36	normal	f	f	77.05000000000005	64.45
1	74	2	normal	f	f	21.14999999999999	47.99999999999993
1	55	37	normal	f	f	76.70000000000007	74.85000000000001
1	75	6	normal	f	f	25.69999999999999	44.39999999999996
1	76	2	normal	f	f	26.15000000000001	53.99999999999997
1	77	7	normal	f	f	22.70000000000001	61.999999999999886
1	78	2	normal	f	f	19.70000000000001	69.8
1	79	2	tampere	f	f	19.50000000000001	21.69999999999998
1	80	45	tampere	f	f	15.200000000000006	20.599999999999984
1	81	2	tampere	f	f	14.950000000000008	12.399999999999997
1	82	46	tampere	f	f	16.35000000000001	3.4499999999999993
1	83	2	tampere	f	f	20.50000000000001	5.5
1	84	47	tampere	f	f	22.65000000000001	12.7
1	85	48	tampere	f	f	28.35000000000001	6.15
1	86	2	tampere	f	f	34.84999999999997	4.449999999999999
1	87	49	tampere	f	f	47.25000000000001	4.099999999999999
1	0	1	normal	t	f	36.45000000000003	89.69999999999997
1	1	2	normal	f	f	41.49999999999999	84.44999999999989
1	2	2	normal	f	f	45.00000000000001	80.30000000000003
1	3	2	normal	f	f	48.84999999999997	83.39999999999999
1	4	3	normal	f	f	52.30000000000002	87.19999999999996
1	5	2	normal	f	f	56.8	89.19999999999997
1	6	4	normal	f	f	61.000000000000014	89.89999999999998
1	7	8	normal	f	f	58.85000000000003	77.94999999999995
1	8	2	normal	f	f	55.49999999999998	74.25
1	9	2	normal	f	f	51.50000000000001	72.99999999999999
1	10	2	normal	f	f	47.70000000000001	71.19999999999993
1	11	2	normal	f	f	43.90000000000003	72.99999999999993
1	12	10	normal	f	f	39.550000000000054	73.99999999999997
1	13	11	normal	f	f	35.75000000000003	73.39999999999993
1	14	2	normal	f	f	32.05	75.94999999999997
1	29	2	normal	f	f	66.69999999999997	43.60000000000011
1	30	21	normal	f	f	62.7	43.44999999999999
1	56	2	normal	f	f	78.1000000000001	84.80000000000004
1	57	38	normal	f	f	75.4	94.90000000000008
1	58	39	normal	f	f	72.55	89.75
1	59	40	normal	f	f	70.60000000000001	83.24999999999999
1	60	2	normal	f	f	68.35000000000005	75.64999999999996
1	61	2	normal	f	f	64.55000000000001	70.59999999999995
1	62	41	normal	f	f	60.05000000000001	66.99999999999999
1	63	42	normal	f	f	60.04999999999999	60.39999999999995
1	64	43	normal	f	f	54.49999999999999	59.64999999999999
1	88	2	tampere	f	f	47.20000000000004	21.099999999999987
1	31	22	normal	f	f	58.8	35.49999999999996
1	32	23	normal	f	f	58.04999999999999	28.000000000000018
1	33	2	normal	f	f	58.94999999999995	21.40000000000001
1	34	2	normal	f	f	60.349999999999994	15.000000000000009
1	89	2	tampere	f	f	42.50000000000006	8.200000000000014
1	65	2	normal	f	f	51.000000000000064	56.149999999999864
1	66	2	normal	f	f	47.35000000000007	58.599999999999895
1	67	2	normal	f	f	44.4	62.84999999999992
1	68	44	normal	f	t	41.000000000000014	67.90000000000002
1	69	51	normal	f	f	4.649999999999999	82.99999999999996
1	70	2	normal	f	f	8.900000000000004	77.59999999999994
1	15	9	normal	f	f	27.999999999999996	76.19999999999997
1	16	12	normal	f	f	24.35	73.99999999999999
1	17	13	normal	f	f	27.200000000000003	68.19999999999995
1	90	2	tampere	f	f	36.050000000000054	16.300000000000004
1	18	14	normal	f	f	31.749999999999996	68.2
1	19	15	normal	f	f	36.90000000000002	66.74999999999996
1	20	2	normal	f	f	40.650000000000006	59.4499999999999
1	21	16	normal	f	f	46.20000000000005	52.14999999999992
1	22	2	normal	f	f	51.700000000000045	47.7499999999999
1	23	17	normal	f	f	57.45000000000001	47.99999999999994
1	35	2	normal	f	f	64.64999999999999	15.300000000000008
1	71	5	normal	f	f	12.399999999999991	72.19999999999996
1	72	2	normal	f	f	12.65	62.499999999999986
1	36	24	normal	f	f	65.25	8.100000000000007
1	37	2	normal	f	f	69.84999999999992	7.60000000000001
1	38	2	normal	f	f	74.69999999999993	7.400000000000014
1	39	25	normal	f	f	78.84999999999988	6.399999999999997
1	40	26	normal	f	f	84.34999999999997	11.950000000000024
1	41	27	normal	f	f	84.89999999999993	19.05000000000003
1	73	2	normal	f	f	16.550000000000008	55.54999999999996
1	42	2	normal	f	f	90.39999999999996	19.600000000000033
1	43	28	normal	f	f	93.84999999999997	28.19999999999999
1	44	29	normal	f	f	89.89999999999999	34.149999999999864
1	45	30	normal	f	f	84.19999999999999	31.14999999999992
1	46	31	normal	f	f	79.79999999999995	32.44999999999986
1	47	2	normal	f	f	79.15	41.349999999999966
1	48	32	normal	f	f	78.05000000000005	52
1	91	50	tampere	f	f	26.15000000000001	14.650000000000016
2	0	2	normal	t	f	17.500000000000036	93.95000000000005
2	45	27	normal	f	f	60.1	79.9
2	48	2	normal	f	f	59.09999999999999	86.49999999999991
2	51	29	normal	f	f	53.899999999999984	89.60000000000002
2	53	63	normal	f	f	46.100000000000016	78.79999999999978
2	1	2	normal	f	f	20.65000000000001	90.2
2	2	2	normal	f	f	22.250000000000032	85.19999999999999
2	3	2	normal	f	f	23.749999999999982	80.34999999999998
2	4	2	normal	f	f	26.30000000000002	76.6499999999999
2	5	53	normal	f	f	28.24999999999998	72.09999999999988
2	6	2	normal	f	f	27.10000000000003	66.59999999999991
2	8	2	normal	f	f	21.700000000000024	62.85000000000011
2	9	2	normal	f	f	18.249999999999975	61.100000000000016
2	10	2	normal	f	f	15.2	59.20000000000006
2	11	2	normal	f	f	12.19999999999999	57.29999999999996
2	12	54	normal	f	f	8.900000000000002	60.3
2	13	2	normal	f	f	7.199999999999992	54.49999999999999
2	14	2	normal	f	f	9.400000000000002	49.19999999999999
2	15	2	normal	f	f	13.200000000000005	50.60000000000001
2	16	55	normal	f	f	16.600000000000005	54.599999999999994
2	17	2	normal	f	f	15.999999999999996	49.19999999999999
2	18	56	normal	f	f	18.999999999999982	45.1
2	19	2	normal	f	f	22.89999999999997	47.00000000000003
2	20	2	normal	f	f	25.70000000000001	49.49999999999999
2	21	2	normal	f	f	28.100000000000044	55.400000000000006
2	22	8	normal	f	f	32.00000000000003	51.100000000000016
2	23	2	normal	f	f	31.600000000000023	41.000000000000014
2	33	22	normal	f	f	46.50000000000002	49.8
2	34	58	normal	f	f	47.10000000000003	55.50000000000001
2	35	2	normal	f	f	44.19999999999999	58.10000000000005
2	36	19	normal	f	f	42.10000000000003	64.10000000000007
2	37	2	normal	f	f	48.59999999999998	63.50000000000005
2	38	59	normal	f	f	50.90000000000001	54.599999999999994
2	39	2	normal	f	f	55.400000000000006	51.700000000000024
2	40	2	normal	f	f	59.29999999999999	51.40000000000002
2	41	24	normal	f	f	63.00000000000004	53.199999999999974
2	42	2	normal	f	f	61.800000000000026	59.39999999999999
2	43	2	normal	f	f	60.60000000000001	65.39999999999998
2	82	50	normal	f	f	90.99999999999994	49.19999999999999
2	44	2	normal	f	f	60.50000000000001	72.40000000000015
2	7	2	normal	f	f	25.550000000000008	61.74999999999991
2	24	2	normal	f	f	28.999999999999982	30.80000000000001
2	25	10	normal	f	f	30.60000000000001	21.30000000000002
2	26	14	normal	f	f	30.900000000000013	9.9
2	27	9	normal	f	f	28.799999999999983	3.600000000000003
2	28	13	normal	f	f	32.69999999999997	3.200000000000003
2	29	15	normal	f	f	34.39999999999999	21.100000000000016
2	30	2	normal	f	f	38.299999999999976	33.999999999999986
2	31	57	normal	f	f	39.8	42.20000000000003
2	32	17	normal	f	f	44.19999999999999	45.2
2	46	2	normal	f	f	57.30000000000003	75.99999999999996
2	47	30	normal	f	f	54.7	80
2	49	60	normal	f	f	61.100000000000016	93.70000000000007
2	50	28	normal	f	f	57.00000000000003	94.40000000000003
2	52	34	normal	f	f	48.899999999999984	85.1
2	54	32	normal	f	f	43.899999999999984	74.10000000000005
2	55	36	normal	f	f	39.49999999999999	74.80000000000001
2	56	2	normal	f	f	42.69999999999997	80.99999999999994
2	57	52	normal	f	f	39.39999999999999	82.90000000000012
2	58	2	normal	f	f	42.500000000000036	90.1
2	59	2	normal	f	f	38.00000000000004	93.50000000000009
2	60	61	normal	f	f	34.19999999999999	90.79999999999995
2	61	2	normal	f	f	34.599999999999994	83.80000000000007
2	62	62	normal	f	f	35.90000000000001	77.69999999999985
2	63	2	normal	f	f	33.39999999999998	73.00000000000011
2	64	2	normal	f	f	36.000000000000014	65.19999999999999
2	65	2	normal	f	f	38.59999999999998	58.69999999999998
2	66	18	normal	f	f	41.000000000000014	53.30000000000005
2	67	2	normal	f	f	36.60000000000002	47.10000000000003
2	68	2	normal	f	f	33.09999999999997	34.49999999999999
2	69	44	normal	f	f	33.299999999999976	27.29999999999996
2	70	2	normal	f	f	86.89999999999989	37.20000000000003
2	71	45	normal	f	f	87.50000000000014	29.799999999999997
2	72	2	normal	f	f	92.49999999999986	29.099999999999987
2	73	46	normal	f	f	97.80000000000013	31.800000000000026
2	74	2	normal	f	f	96.6999999999999	39.19999999999999
2	75	47	normal	f	f	92.19999999999987	42.99999999999997
2	76	48	normal	f	f	96.19999999999992	53.299999999999976
2	77	2	normal	f	f	97.19999999999987	64.9
2	78	49	normal	f	f	97.60000000000014	86.89999999999989
2	79	2	normal	f	f	87.19999999999987	86.49999999999991
2	80	2	normal	f	f	95	78.2000000000001
2	81	2	normal	f	f	90	66.7999999999999
\.
COPY public.place_connections (board_id, origin, target, on_land, backwards, dashed) FROM stdin;
1	0	1	f	f	f
1	1	2	f	f	f
1	2	3	f	f	f
1	3	4	f	f	f
1	4	5	f	f	f
1	5	6	f	f	f
1	6	7	f	f	f
1	7	8	f	f	f
1	8	9	f	f	f
1	9	10	f	f	f
1	10	11	f	f	f
1	11	12	f	f	f
1	12	13	f	f	f
1	13	14	f	f	f
1	14	15	f	f	f
1	15	16	f	f	f
1	16	17	f	f	f
1	17	18	f	f	f
1	18	19	f	f	f
1	19	20	f	f	f
1	20	21	f	f	f
1	21	22	f	f	f
1	22	23	f	f	f
1	23	24	f	f	f
1	24	25	f	f	f
1	25	26	f	f	f
1	26	27	f	f	f
1	27	28	f	f	f
1	28	29	f	f	f
1	29	30	f	f	f
1	30	31	f	f	f
1	31	32	f	f	f
1	32	33	f	f	f
1	33	34	f	f	f
1	34	35	f	f	f
1	35	36	f	f	f
1	36	37	f	f	f
1	37	38	f	f	f
1	38	39	f	f	f
1	39	40	f	f	f
1	40	41	f	f	f
1	41	42	f	f	f
1	42	43	f	f	f
1	43	44	f	f	f
1	44	45	f	f	f
1	45	46	f	f	f
1	46	47	f	f	f
1	47	48	f	f	f
1	48	49	f	f	f
1	49	50	f	f	f
1	50	51	f	f	f
1	51	52	f	f	f
1	52	53	f	f	f
1	53	54	f	f	f
1	54	55	f	f	f
1	55	56	f	f	f
1	56	57	f	f	f
1	57	58	f	f	f
1	58	59	f	f	f
1	59	60	f	f	f
1	60	61	f	f	f
1	61	62	f	f	f
1	62	63	f	f	f
1	63	64	f	f	f
1	64	65	f	f	f
1	65	66	f	f	f
1	66	67	f	f	f
1	67	68	f	f	f
1	69	70	f	f	f
1	70	71	f	f	f
1	71	72	f	f	f
1	72	73	f	f	f
1	73	74	f	f	f
1	74	75	f	f	f
1	75	76	f	f	f
1	76	77	f	f	f
1	77	78	f	f	f
1	78	16	f	f	f
1	79	80	f	f	f
1	80	81	f	f	f
1	81	82	f	f	f
1	82	83	f	f	f
1	83	84	f	f	f
1	84	85	f	f	f
1	85	86	f	f	f
1	86	87	f	f	f
1	87	88	f	f	f
1	88	89	f	f	f
1	89	90	f	f	f
1	90	91	f	f	f
1	31	79	t	f	t
1	6	69	t	f	t
1	91	45	t	f	t
1	59	58	t	t	f
1	58	57	f	t	f
1	57	56	f	t	f
1	56	55	f	t	f
1	55	54	f	t	f
1	54	53	f	t	f
1	53	52	f	t	f
1	52	51	f	t	f
1	51	50	f	t	f
1	50	49	f	t	f
1	49	48	f	t	f
1	48	47	f	t	f
1	68	67	f	t	f
1	67	66	f	t	f
1	66	65	f	t	f
1	65	64	f	t	f
1	64	63	f	t	f
\.

COPY public.place_drinks (drink_id, board_id, place_number, refill, optional, n, n_update, on_table) FROM stdin;
26	1	39	t	f	1	1	f
9	1	15	t	f	1	1	f
13	1	16	t	f	1	1	f
20	1	13	t	t	1	1	f
19	1	13	t	t	1	1	f
7	1	12	t	f	1	1	f
3	1	7	t	f	1	1	f
3	1	4	t	f	1	1	f
2	1	17	t	f	1	1	f
3	1	18	t	f	1	1	f
3	1	19	t	f	1	1	f
12	1	23	t	f	1	1	f
1	1	24	t	f	1	N+1	f
1	1	25	t	f	1	MIN(D2)	f
16	1	28	t	f	1	1	f
3	1	30	t	f	1	1	f
1	1	31	t	t	1	1	f
25	1	31	t	t	1	1	f
6	1	31	t	t	1	1	f
5	1	31	t	t	1	1	f
27	1	32	t	f	1	1	f
11	1	36	t	f	1	1	f
6	1	41	t	f	1	1	f
1	1	43	t	f	1	1	f
1	1	44	t	f	1	1	f
3	1	45	t	f	1	1	f
1	1	45	t	f	1	1	f
1	1	46	t	f	1	1	f
1	1	48	t	f	1	1	f
8	1	49	t	f	1	1	f
1	1	50	t	f	1	1	f
1	1	51	t	f	1	1	f
1	1	53	f	f	3	1	t
3	1	54	t	f	1	1	f
3	1	55	t	f	1	1	f
1	1	58	t	f	1	1	f
3	1	58	t	f	1	1	f
3	1	57	t	f	1	1	f
22	1	62	t	f	1	1	f
23	1	63	t	f	1	1	f
14	1	64	t	f	1	1	f
3	1	69	t	f	1	1	f
21	1	71	t	f	1	1	f
18	1	75	t	f	1	1	f
17	1	77	t	f	1	1	f
6	1	80	t	f	1	1	f
1	1	82	t	f	1	1	f
25	1	84	t	t	1	1	f
4	1	84	t	t	1	1	f
1	1	85	t	f	3	1	f
3	1	85	t	f	1	1	f
24	1	87	t	f	1	1	f
1	1	91	t	t	1	1	f
25	1	91	t	t	1	1	f
6	1	91	t	t	1	1	f
5	1	91	t	t	1	1	f
1	2	5	t	f	1	1	f
1	2	12	t	f	1	1	f
3	2	16	t	f	1	1	f
3	2	18	t	f	1	1	f
3	2	22	t	f	1	1	f
7	2	25	t	f	1	1	f
3	2	26	t	f	1	1	f
9	2	27	t	f	1	1	f
2	2	28	t	f	1	1	f
3	2	29	t	f	1	1	f
1	2	31	t	f	1	1	f
12	2	32	t	f	1	1	f
1	2	33	t	t	1	1	f
25	2	33	t	t	1	1	f
5	2	33	t	t	1	1	f
6	2	33	t	t	1	1	f
3	2	34	t	f	1	1	f
1	2	36	t	f	1	MIN(D2)	f
3	2	38	t	f	1	1	f
11	2	41	t	f	1	1	f
6	2	45	t	f	1	1	f
3	2	47	t	f	1	1	f
1	2	47	t	f	1	1	f
10	2	49	t	f	1	1	f
1	2	50	t	f	1	1	f
1	2	51	t	f	1	1	f
1	2	52	t	f	1	1	f
8	2	53	t	f	1	1	f
1	2	54	t	f	1	1	f
3	2	55	t	f	1	1	f
1	2	57	f	f	3	1	t
1	2	60	t	f	1	1	f
1	2	62	t	f	3	1	f
3	2	62	t	f	1	1	f
1	2	66	t	f	1	N+1	f
6	2	71	t	f	1	1	f
1	2	73	t	f	1	1	f
4	2	75	t	t	1	1	f
25	2	75	t	t	1	1	f
1	2	76	t	f	3	1	f
3	2	76	t	f	1	1	f
24	2	78	t	f	1	1	f
1	2	82	t	t	1	1	f
25	2	82	t	t	1	1	f
6	2	82	t	t	1	1	f
5	2	82	t	t	1	1	f
29	1	21	t	f	1	1	f
28	1	40	t	f	1	t	f
1	1	1	f	f	1	1	t
1	1	2	f	f	1	1	t
1	1	3	f	f	1	1	t
1	1	8	f	f	1	1	t
1	1	9	f	f	1	1	t
1	1	10	f	f	1	1	t
1	1	11	f	f	1	1	t
1	1	14	f	f	1	1	t
1	1	20	f	f	1	1	t
1	1	22	f	f	1	1	t
1	1	26	f	f	1	1	t
1	1	27	f	f	1	1	t
1	1	29	f	f	1	1	t
1	1	33	f	f	1	1	t
1	1	34	f	f	1	1	t
1	1	35	f	f	1	1	t
1	1	37	f	f	1	1	t
1	1	38	f	f	1	1	t
1	1	42	f	f	1	1	t
1	1	47	f	f	1	1	t
1	1	52	f	f	1	1	t
1	1	56	f	f	1	1	t
1	1	60	f	f	1	1	t
1	1	61	f	f	1	1	t
1	1	65	f	f	1	1	t
1	1	66	f	f	1	1	t
1	1	67	f	f	1	1	t
1	1	70	f	f	1	1	t
1	1	72	f	f	1	1	t
1	1	73	f	f	1	1	t
1	1	74	f	f	1	1	t
1	1	76	f	f	1	1	t
1	1	78	f	f	1	1	t
1	1	79	f	f	1	1	t
1	1	81	f	f	1	1	t
1	1	83	f	f	1	1	t
1	1	86	f	f	1	1	t
1	1	88	f	f	1	1	t
1	1	89	f	f	1	1	t
1	1	90	f	f	1	1	t
1	2	0	f	f	1	1	t
1	2	1	f	f	1	1	t
1	2	2	f	f	1	1	t
1	2	3	f	f	1	1	t
1	2	4	f	f	1	1	t
1	2	6	f	f	1	1	t
1	2	7	f	f	1	1	t
1	2	8	f	f	1	1	t
1	2	9	f	f	1	1	t
1	2	10	f	f	1	1	t
1	2	11	f	f	1	1	t
1	2	13	f	f	1	1	t
1	2	14	f	f	1	1	t
1	2	15	f	f	1	1	t
1	2	17	f	f	1	1	t
1	2	19	f	f	1	1	t
1	2	20	f	f	1	1	t
1	2	21	f	f	1	1	t
1	2	24	f	f	1	1	t
1	2	23	f	f	1	1	t
1	2	30	f	f	1	1	t
1	2	35	f	f	1	1	t
1	2	37	f	f	1	1	t
1	2	39	f	f	1	1	t
1	2	40	f	f	1	1	t
1	2	42	f	f	1	1	t
1	2	43	f	f	1	1	t
1	2	44	f	f	1	1	t
1	2	46	f	f	1	1	t
1	2	48	f	f	1	1	t
1	2	56	f	f	1	1	t
1	2	58	f	f	1	1	t
1	2	59	f	f	1	1	t
1	2	61	f	f	1	1	t
1	2	63	f	f	1	1	t
1	2	64	f	f	1	1	t
1	2	65	f	f	1	1	t
1	2	67	f	f	1	1	t
1	2	68	f	f	1	1	t
1	2	70	f	f	1	1	t
1	2	72	f	f	1	1	t
1	2	74	f	f	1	1	t
1	2	77	f	f	1	1	t
1	2	80	f	f	1	1	t
1	2	79	f	f	1	1	t
1	2	81	f	f	1	1	t
1	1	5	f	f	1	1	t
\.
