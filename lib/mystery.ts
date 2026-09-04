export type MysteryRole = {
  characterName: string; job: string; publicInfo: string; secret: string;
  objective: string; alibi: string; truth: string; knows: string; culprit: boolean;
  accomplices?: string[];
  ability?: MysteryAbility;
};
export type MysteryAbilityId = "forensic_focus"|"timeline_anchor"|"confidant"|"alibi_audit"|"credential_trace"|"evidence_preview"|"scene_recall"|"motive_map"|"pattern_link"|"witness_check";
export type MysteryAbility = {id:MysteryAbilityId;name:string;description:string;needsTarget:boolean};
export type MysteryInspiration = {
  title: string; year: string; connection: string; sourceLabel: string; sourceUrl: string;
};
export type GameMode="casual"|"detective";
export type GameLanguage="en"|"sq";
export type MysteryTranslation = {
  title:string;setting:string;victim:string;incident:string;method:string;motive:string;twist:string;
  roles:MysteryRole[];evidence:string[][];timeline:string[];inspiration?:MysteryInspiration;
};
export type MysteryCase = {
  title: string; setting: string; victim: string; incident: string; method: string;
  motive: string; twist: string; roles: MysteryRole[]; evidence: string[][]; timeline: string[];
  killerCount?: number; fingerprint?: string; mode?:GameMode;
  inspiration?: MysteryInspiration;
  translations?:{sq:MysteryTranslation};
};

export function gameLanguage(value:string|null|undefined):GameLanguage{return value==="sq"?"sq":"en"}
export function votingPhase(mode:GameMode){return mode==="casual"?3:4}
export function localizeMystery(mystery:MysteryCase,language:GameLanguage):MysteryCase{
  const translated=language==="sq"?mystery.translations?.sq:undefined;
  return translated?{...mystery,...translated,mode:mystery.mode??"detective"}:mystery;
}

export type PlayerActionType =
  | "search_scene"
  | "analyze_evidence"
  | "check_records"
  | "interrogate"
  | "plant_false_lead"
  | "anonymous_tip"
  | "forge_alibi"
  | "delay_investigation";

export const investigationActionTypes:PlayerActionType[]=["search_scene","analyze_evidence","check_records","interrogate"];
export const killerActionTypes:PlayerActionType[]=["plant_false_lead","anonymous_tip","forge_alibi","delay_investigation"];

const historicalEchoes = {
  blackDahlia: {
    title:"the Black Dahlia murder",
    year:"1947",
    connection:"This fictional murder's staged discovery site and misleading physical trail quietly echo the investigation into the 1947 murder of Elizabeth Short. The FBI records that she was killed elsewhere before her body was discovered and that investigators examined anonymous correspondence. No real person, method, or proposed suspect is copied into this game.",
    sourceLabel:"Read the FBI case history",
    sourceUrl:"https://www.fbi.gov/history/cases-and-criminals/black-dahlia",
  },
  lindbergh: {
    title:"the Lindbergh kidnapping and murder",
    year:"1932",
    connection:"This fictional murder's paper trail and small construction trace are a restrained nod to the 1932 Lindbergh case, in which ransom communications and analysis of a handmade ladder became major investigative threads. The generated victim, culprit, and circumstances are entirely fictional and do not recreate the real crime.",
    sourceLabel:"Read the FBI case history",
    sourceUrl:"https://www.fbi.gov/history/cases-and-criminals/lindbergh-kidnapping",
  },
  osage: {
    title:"the Osage murders",
    year:"1920s",
    connection:"This fictional murder's concealed financial interest and apparently unrelated side plots echo the investigative structure of the Osage murders, a deadly conspiracy against members of the Osage Nation. The game uses no real victim, perpetrator, or event; it borrows only the idea that several suspicious incidents can hide one organized motive.",
    sourceLabel:"Read the FBI case history",
    sourceUrl:"https://www.fbi.gov/history/cases-and-criminals/osage-murders-case",
  },
  flight629: {
    title:"the United Air Lines Flight 629 murder case",
    year:"1955",
    connection:"This fictional murder's staged technical failure and patient reconstruction from scattered records are inspired by the investigation of United Air Lines Flight 629. The FBI describes how forensic and airline specialists pieced together evidence and exposed a personal motive. The generated people, location, and method are wholly fictional.",
    sourceLabel:"Read the FBI case history",
    sourceUrl:"https://www.fbi.gov/history/cases-and-criminals/jack-gilbert-graham",
  },
} satisfies Record<string,MysteryInspiration>;

const historicalEchoesSq = {
  blackDahlia: {
    title:"vrasja e Dahlia-s së Zezë",
    year:"1947",
    connection:"Vendi i inskenuar i zbulimit dhe gjurmët fizike çorientuese të kësaj vrasjeje imagjinare sjellin një jehonë të hetimit të vrasjes së Elizabeth Short në vitin 1947. Sipas dosjeve të FBI-së, ajo u vra diku tjetër para se të gjendej trupi dhe hetuesit shqyrtuan korrespondencë anonime. Loja nuk kopjon asnjë person, metodë apo të dyshuar real.",
    sourceLabel:"Lexo historikun e çështjes nga FBI",
    sourceUrl:"https://www.fbi.gov/history/cases-and-criminals/black-dahlia",
  },
  lindbergh: {
    title:"rrëmbimi dhe vrasja Lindbergh",
    year:"1932",
    connection:"Gjurmët në dokumente dhe detaji i vogël i ndërtimit në këtë vrasje imagjinare janë një referencë e matur ndaj çështjes Lindbergh të vitit 1932, ku komunikimet për shpërblimin dhe analiza e një shkalle të punuar me dorë u bënë drejtime kryesore të hetimit. Viktima, autorët dhe rrethanat e lojës janë krejtësisht imagjinare.",
    sourceLabel:"Lexo historikun e çështjes nga FBI",
    sourceUrl:"https://www.fbi.gov/history/cases-and-criminals/lindbergh-kidnapping",
  },
  osage: {
    title:"vrasjet Osage",
    year:"vitet 1920",
    connection:"Interesi financiar i fshehur dhe ngjarjet anësore që duken të palidhura sjellin jehonën e strukturës hetimore të vrasjeve Osage, një komplot vdekjeprurës kundër pjesëtarëve të Kombit Osage. Loja nuk përdor viktima, autorë apo ngjarje reale; huazon vetëm idenë se disa incidente të dyshimta mund të fshehin një motiv të organizuar.",
    sourceLabel:"Lexo historikun e çështjes nga FBI",
    sourceUrl:"https://www.fbi.gov/history/cases-and-criminals/osage-murders-case",
  },
  flight629: {
    title:"çështja e vrasjes në fluturimin 629 të United Air Lines",
    year:"1955",
    connection:"Defekti teknik i inskenuar dhe rindërtimi i kujdesshëm nga të dhëna të shpërndara janë frymëzuar nga hetimi i fluturimit 629 të United Air Lines. FBI përshkruan se si specialistët mjekoligjorë dhe të aviacionit bashkuan provat dhe zbuluan një motiv personal. Personazhet, vendi dhe metoda e lojës janë plotësisht imagjinare.",
    sourceLabel:"Lexo historikun e çështjes nga FBI",
    sourceUrl:"https://www.fbi.gov/history/cases-and-criminals/jack-gilbert-graham",
  },
} satisfies Record<keyof typeof historicalEchoes,MysteryInspiration>;

type HistoricalEchoKey=keyof typeof historicalEchoes;
type SettingTemplate={
  place:string; titles:string[]; victimRoles:string[]; incidents:Array<(victimName:string)=>string>;
  methods:string[]; twists:string[]; echoes:HistoricalEchoKey[];
};

const settings:SettingTemplate[] = [
  {
    place:"the Pelagos underwater laboratory",
    titles:["Pressure Below","The Quiet Depth","Below the Red Line"],
    victimRoles:["mission director","deep-sea ecologist","habitat commander"],
    incidents:[
      name=>`At 02:14, oxygen telemetry fails. ${name} is found dead inside the sealed specimen lock, and the emergency record suggests an impossible entry.`,
      name=>`A distress beacon activates beneath an empty dive cradle. ${name} is found murdered in the habitat while their suit transmitter reports them outside.`,
    ],
    methods:["a diving regulator deliberately altered before the emergency","a maintenance override used to turn a routine pressure cycle fatal","a false contamination alarm used to isolate the victim before the killing"],
    twists:["The fatal event occurred twelve minutes before the alarm.","The sealed door was never opened; its pressure log was replayed.","A routine ballast shift moved the decisive trace evidence after the incident."],
    echoes:["blackDahlia","flight629"],
  },
  {
    place:"a live television soundstage during the final broadcast",
    titles:["Dead Air","Ninety Seconds Missing","The Last Broadcast"],
    victimRoles:["investigative presenter","broadcast producer","network fact-checker"],
    incidents:[
      name=>`During a 90-second prerecorded segment, ${name} is murdered beneath the motorized stage while the audience believes they are still live on air.`,
      name=>`The studio feed cuts to archive footage. When it returns, ${name} is found dead in a locked control booth while their recorded voice is still broadcasting.`,
    ],
    methods:["a stage counterweight deliberately sabotaged during rehearsal","a personal medicine container secretly substituted","a scheduled video loop used to conceal a fatal attack and disabled stage sensor"],
    twists:["The audience watched a delayed feed, creating a false time of death.","The stage accident was arranged only after the victim was attacked.","The voice heard live was assembled from rehearsal recordings."],
    echoes:["blackDahlia","flight629"],
  },
  {
    place:"the Orison seed vault during a whiteout",
    titles:["The Silent Harvest","Index Zero","The Missing Strain"],
    victimRoles:["genetic archivist","crop-resilience researcher","vault curator"],
    incidents:[
      name=>`The master seed index is erased and ${name} is found murdered behind a door opened with their own badge.`,
      name=>`A unique living sample vanishes during lockdown. ${name} is found dead beside an untouched emergency case, and the alarm timeline cannot be true.`,
    ],
    methods:["a known medical vulnerability deliberately exploited through a sealed sample case","a coolant emergency deliberately triggered through a diagnostic console","a cloned access badge used to trap the victim during an automatic decontamination cycle"],
    twists:["The erased archive was a decoy; one living sample was the real target.","The victim recovered briefly and moved the key evidence.","The badge record was authentic, but it identified the card rather than the person holding it."],
    echoes:["osage","blackDahlia"],
  },
  {
    place:"a night train carrying a secret diplomatic delegation",
    titles:["The Passenger Who Wasn't","Last Carriage","A Ticket for Nobody"],
    victimRoles:["delegation courier","treaty translator","security liaison"],
    incidents:[
      name=>`The train enters a tunnel. When it emerges, ${name} is found murdered in a service compartment and their locked document case is empty.`,
      name=>`An unscheduled signal stops the train for four minutes. When it moves again, ${name} is found dead in a compartment registered to somebody else.`,
    ],
    methods:["the victim's medication secretly substituted before departure","a magnetic latch used to enter from the adjacent service compartment before a fatal confrontation","a false rail signal synchronized with a stolen conductor key to create the murder window"],
    twists:["The victim boarded under another person's identity.","The theft and disappearance were separate plans that collided.","The train's tunnel clock was correct; every passenger's phone had synchronized to the wrong time."],
    echoes:["lindbergh","blackDahlia"],
  },
  {
    place:"an orbital debris-control station",
    titles:["The Thirteenth Orbit","Seven Minutes Dark","The False Collision"],
    victimRoles:["station commander","orbital navigator","flight surgeon"],
    incidents:[
      name=>`A collision warning is falsified. ${name} is found murdered while the station automatically seals every module.`,
      name=>`A rescue capsule launches empty during a communications blackout. ${name} is found dead aboard the station while their biometric signal appears inside the capsule.`,
    ],
    methods:["an environmental sensor deliberately recalibrated to conceal a fatal atmosphere change","a medical injector substituted before the emergency drill","a fatal attack concealed by moving the victim's biometric transmitter"],
    twists:["The station clock drifted by seven minutes after a solar flare.","The intended target was another crewmember.","The apparently empty capsule carried only the victim's biometric patch."],
    echoes:["flight629","blackDahlia"],
  },
  {
    place:"a restoration lab beneath a crowded city museum",
    titles:["The Borrowed Masterpiece","Thirteen Empty Frames","Varnish and Alibis"],
    victimRoles:["chief conservator","provenance investigator","collections registrar"],
    incidents:[
      name=>`A priceless panel is found destroyed, and ${name} is discovered murdered inside the locked climate archive.`,
      name=>`Security responds to a false disturbance while ${name} is murdered on the restoration floor and an uncatalogued artwork disappears.`,
    ],
    methods:["a restoration hood deliberately altered before the victim worked alone","a forged sensor alert used to isolate the archive before a fatal attack","a replica frame carrying a concealed access relay that created the murder window"],
    twists:["The destroyed artwork was already a sophisticated copy.","The apparent vandalism concealed the removal of microscopic evidence.","The person who triggered the alarm never entered the gallery."],
    echoes:["blackDahlia","osage"],
  },
  {
    place:"a volcanic listening post cut off by an eruption",
    titles:["Signal in the Ash","The Voice After Midnight","Fault Line Silence"],
    victimRoles:["seismic analyst","evacuation coordinator","acoustic geologist"],
    incidents:[
      name=>`An evacuation warning is suppressed. ${name} is found murdered while their recorded voice continues to broadcast from the control room.`,
      name=>`The post records a human distress signal beneath the mountain, but ${name} is found dead inside an apparently undisturbed locked office.`,
    ],
    methods:["a scheduled audio loop paired with a disabled door alarm to disguise the murder time","an emergency system deliberately altered to incapacitate the victim before the killing","a fatal confrontation followed by escape through a maintenance crawlspace omitted from the public map"],
    twists:["The continuing broadcast was assembled from earlier recordings.","The evacuation failure and disappearance had different authors.","The ash cloud delayed one radio channel but not the station's internal clock."],
    echoes:["blackDahlia","flight629"],
  },
  {
    place:"an autonomous cargo port during a navigation blackout",
    titles:["The Empty Container","Harbor Without a Signal","Manifest 404"],
    victimRoles:["port systems auditor","customs intelligence officer","autonomous-fleet supervisor"],
    incidents:[
      name=>`A sealed container arrives twelve tonnes lighter than its manifest. ${name} is found murdered in an inspection bay while their access token keeps issuing commands.`,
      name=>`Every crane freezes except one. When control returns, ${name} is found dead inside a locked inspection bay and a container has no recorded route.`,
    ],
    methods:["a cloned routing token used to move the victim into an unlogged maintenance lane","a fatal industrial incident staged with a recalibrated weight sensor","an autonomous crane command hidden inside a safety update to construct a false accident"],
    twists:["The container never held the listed cargo.","The missing weight was distributed across three ordinary shipments.","The victim's token was active because it had been copied days earlier."],
    echoes:["osage","flight629"],
  },
  {
    place:"a high-altitude rescue relay during an avalanche",
    titles:["White Signal","The Fourth Beacon","Buried Frequency"],
    victimRoles:["rescue flight director","avalanche forecaster","emergency radio engineer"],
    incidents:[
      name=>`Four rescue beacons activate, although only three climbers are registered. ${name} is murdered at the relay while the team searches the wrong slope.`,
      name=>`A helicopter is diverted by a convincing false distress call. When it returns, ${name} is found dead in a sealed equipment room.`,
    ],
    methods:["a duplicate rescue beacon used to create a false location during the murder","a weather sensor altered to isolate the victim on a dangerous evacuation route","a recorded distress call transmitted through a maintenance repeater to cover the murder window"],
    twists:["The extra beacon was moving because it had been attached to a supply drone.","The avalanche began after the critical event, not before it.","The supposed outside caller transmitted from inside the relay."],
    echoes:["lindbergh","flight629"],
  },
  {
    place:"a subterranean data archive during a citywide power test",
    titles:["Cold Storage","The Missing Minute","Archive Black"],
    victimRoles:["digital archivist","infrastructure auditor","cryptographic custodian"],
    incidents:[
      name=>`A legally protected archive is replaced with an empty mirror. ${name} is found murdered behind a door that records no entry.`,
      name=>`The building loses power for exactly sixty-one seconds. When backup systems engage, ${name} is found dead and every camera shows the same loop.`,
    ],
    methods:["a maintenance certificate used to trigger a fatal equipment sequence and sign a malicious archive job","an optical relay used to hide entry before a fatal confrontation","a cooling fault used to isolate the victim during an automatic vault evacuation"],
    twists:["The missing archive was copied rather than removed.","The door log records successful verification, not physical entry.","The citywide power test was genuine but gave the culprit a predictable blind spot."],
    echoes:["osage","blackDahlia"],
  },
];

const sqSettings:SettingTemplate[] = [
  {
    place:"laboratori nënujor Pelagos",
    titles:["Presion në Thellësi","Thellësia e Heshtur","Poshtë Vijës së Kuqe"],
    victimRoles:["drejtuesi i misionit","ekologu i detit të thellë","komandanti i habitatit"],
    incidents:[
      name=>`Në orën 02:14, telemetria e oksigjenit dështon. ${name} gjendet i vrarë brenda dhomës së izoluar të mostrave dhe regjistri i emergjencës tregon një hyrje të pamundur.`,
      name=>`Një sinjal alarmi aktivizohet poshtë një baze zhytjeje të zbrazët. ${name} gjendet i vrarë në habitat, ndërsa transmetuesi i kostumit e raporton jashtë tij.`,
    ],
    methods:["një rregullator zhytjeje i ndryshuar qëllimisht para emergjencës","një komandë mirëmbajtjeje e përdorur për ta kthyer një cikël normal presioni në vdekjeprurës","një alarm i rremë ndotjeje që e izoloi viktimën para vrasjes"],
    twists:["Ngjarja fatale ndodhi dymbëdhjetë minuta para alarmit.","Dera e izoluar nuk u hap kurrë; regjistri i presionit u ritransmetua.","Një zhvendosje rutinë e balastit lëvizi provën vendimtare pas incidentit."],
    echoes:["blackDahlia","flight629"],
  },
  {
    place:"një studio televizive gjatë transmetimit final drejtpërdrejt",
    titles:["Heshtje në Transmetim","Nëntëdhjetë Sekonda të Humbura","Transmetimi i Fundit"],
    victimRoles:["prezantuesi investigativ","producenti i transmetimit","verifikuesi i fakteve të rrjetit"],
    incidents:[
      name=>`Gjatë një segmenti 90-sekondësh të regjistruar më parë, ${name} vritet poshtë skenës së motorizuar, ndërsa publiku beson se transmetimi vazhdon drejtpërdrejt.`,
      name=>`Sinjali i studios kalon në pamje arkivore. Kur rikthehet, ${name} gjendet i vrarë në një kabinë kontrolli të kyçur, ndërsa zëri i regjistruar vazhdon të transmetohet.`,
    ],
    methods:["një kundërpeshë skene e sabotuar qëllimisht gjatë provave","një kuti personale ilaçesh e zëvendësuar fshehurazi","një video e planifikuar në përsëritje që fshehu sulmin fatal dhe çaktivizimin e sensorit të skenës"],
    twists:["Publiku pa një sinjal të vonuar, duke krijuar një orë të rreme vdekjeje.","Aksidenti në skenë u organizua vetëm pasi viktima ishte sulmuar.","Zëri i dëgjuar drejtpërdrejt ishte montuar nga regjistrimet e provave."],
    echoes:["blackDahlia","flight629"],
  },
  {
    place:"depoja e farave Orison gjatë një stuhie dëbore",
    titles:["Korrja e Heshtur","Indeksi Zero","Lloji i Humbur"],
    victimRoles:["arkivisti gjenetik","studiuesi i qëndrueshmërisë së bimëve","kujdestari i depos"],
    incidents:[
      name=>`Indeksi kryesor i farave fshihet dhe ${name} gjendet i vrarë pas një dere të hapur me kartën e vet.`,
      name=>`Një mostër e gjallë unike zhduket gjatë izolimit. ${name} gjendet i vrarë pranë një kutie emergjence të paprekur dhe kronologjia e alarmit nuk mund të jetë e vërtetë.`,
    ],
    methods:["një dobësi mjekësore e njohur e shfrytëzuar qëllimisht përmes një kutie të mbyllur mostrash","një emergjencë ftohjeje e shkaktuar qëllimisht nga një panel diagnostikimi","një kartë hyrjeje e klonuar që e bllokoi viktimën gjatë ciklit automatik të dekontaminimit"],
    twists:["Arkivi i fshirë ishte karrem; objektivi i vërtetë ishte një mostër e gjallë.","Viktima u përmend për pak kohë dhe e zhvendosi provën kryesore.","Regjistri i kartës ishte i saktë, por identifikonte kartën dhe jo personin që e mbante."],
    echoes:["osage","blackDahlia"],
  },
  {
    place:"një tren nate me një delegacion diplomatik sekret",
    titles:["Pasagjeri që Nuk Ishte","Vagoni i Fundit","Një Biletë për Askënd"],
    victimRoles:["korrieri i delegacionit","përkthyesi i traktatit","ndërlidhësi i sigurisë"],
    incidents:[
      name=>`Treni hyn në tunel. Kur del, ${name} gjendet i vrarë në një ndarje shërbimi dhe valixhja e kyçur e dokumenteve është bosh.`,
      name=>`Një sinjal i paplanifikuar e ndal trenin për katër minuta. Kur niset përsëri, ${name} gjendet i vrarë në një ndarje të regjistruar në emër të dikujt tjetër.`,
    ],
    methods:["ilaçet e viktimës të zëvendësuara fshehurazi para nisjes","një bravë magnetike që lejoi hyrjen nga ndarja ngjitur para përballjes fatale","një sinjal i rremë hekurudhor i sinkronizuar me një çelës të vjedhur të konduktorit"],
    twists:["Viktima hipi në tren me identitetin e dikujt tjetër.","Vjedhja dhe zhdukja ishin plane të veçanta që u përplasën.","Ora e tunelit ishte e saktë; telefonat e pasagjerëve ishin sinkronizuar me kohën e gabuar."],
    echoes:["lindbergh","blackDahlia"],
  },
  {
    place:"një stacion orbital për kontrollin e mbetjeve hapësinore",
    titles:["Orbita e Trembëdhjetë","Shtatë Minuta Errësirë","Përplasja e Rreme"],
    victimRoles:["komandanti i stacionit","navigatori orbital","mjeku i fluturimit"],
    incidents:[
      name=>`Falsifikohet një paralajmërim përplasjeje. ${name} gjendet i vrarë ndërsa stacioni izolon automatikisht çdo modul.`,
      name=>`Një kapsulë shpëtimi niset bosh gjatë ndërprerjes së komunikimit. ${name} gjendet i vrarë në stacion, ndërsa sinjali biometrik shfaqet brenda kapsulës.`,
    ],
    methods:["një sensor mjedisor i rikalibruar për të fshehur një ndryshim fatal të atmosferës","një injektor mjekësor i zëvendësuar para stërvitjes së emergjencës","një sulm fatal i fshehur duke lëvizur transmetuesin biometrik të viktimës"],
    twists:["Ora e stacionit devijoi shtatë minuta pas një shpërthimi diellor.","Objektivi i synuar ishte një pjesëtar tjetër i ekuipazhit.","Kapsula në dukje bosh mbante vetëm pajisjen biometrike të viktimës."],
    echoes:["flight629","blackDahlia"],
  },
  {
    place:"një laborator restaurimi nën një muze të mbushur me vizitorë",
    titles:["Kryevepra e Huazuar","Trembëdhjetë Korniza Boshe","Llak dhe Alibi"],
    victimRoles:["konservatori kryesor","hetuesi i prejardhjes së veprave","regjistruesi i koleksioneve"],
    incidents:[
      name=>`Një panel i paçmuar gjendet i shkatërruar dhe ${name} zbulohet i vrarë brenda arkivit klimatik të kyçur.`,
      name=>`Siguria reagon ndaj një shqetësimi të rremë, ndërsa ${name} vritet në katin e restaurimit dhe një vepër e pakataloguar zhduket.`,
    ],
    methods:["një aspirator restaurimi i ndryshuar para se viktima të punonte vetëm","një sinjal sensori i falsifikuar që izoloi arkivin para sulmit fatal","një kornizë kopje me një rele hyrjeje të fshehur që krijoi dritaren e vrasjes"],
    twists:["Vepra e shkatërruar ishte tashmë një kopje e sofistikuar.","Vandalizmi i dukshëm fshehu heqjen e provave mikroskopike.","Personi që aktivizoi alarmin nuk hyri kurrë në galeri."],
    echoes:["blackDahlia","osage"],
  },
  {
    place:"një post dëgjimi vullkanik i izoluar nga një shpërthim",
    titles:["Sinjal në Hi","Zëri Pas Mesnate","Heshtje në Vijën e Thyerjes"],
    victimRoles:["analisti sizmik","koordinatori i evakuimit","gjeologu akustik"],
    incidents:[
      name=>`Një paralajmërim evakuimi bllokohet. ${name} gjendet i vrarë, ndërsa zëri i regjistruar vazhdon të transmetohet nga dhoma e kontrollit.`,
      name=>`Posti regjistron një sinjal njerëzor ndihme nën mal, por ${name} gjendet i vrarë brenda një zyre të kyçur që duket e paprekur.`,
    ],
    methods:["një audio e planifikuar në përsëritje dhe një alarm dere i çaktivizuar për të maskuar orën e vrasjes","një sistem emergjence i ndryshuar qëllimisht për ta paaftësuar viktimën para vrasjes","një përballje fatale e ndjekur nga arratisja përmes një korridori mirëmbajtjeje që mungonte në hartën publike"],
    twists:["Transmetimi që vazhdonte ishte montuar nga regjistrime të mëparshme.","Dështimi i evakuimit dhe zhdukja kishin autorë të ndryshëm.","Reja e hirit vonoi një kanal radioje, por jo orën e brendshme të stacionit."],
    echoes:["blackDahlia","flight629"],
  },
  {
    place:"një port autonom mallrash gjatë ndërprerjes së navigimit",
    titles:["Kontejneri Bosh","Port Pa Sinjal","Manifesti 404"],
    victimRoles:["auditori i sistemeve të portit","oficeri i inteligjencës doganore","mbikëqyrësi i flotës autonome"],
    incidents:[
      name=>`Një kontejner i mbyllur mbërrin dymbëdhjetë tonë më i lehtë se manifesti. ${name} gjendet i vrarë në zonën e inspektimit, ndërsa kodi i hyrjes vazhdon të japë urdhra.`,
      name=>`Të gjithë vinçat ngrijnë, përveç njërit. Kur kontrolli rikthehet, ${name} gjendet i vrarë në një zonë të kyçur dhe një kontejner nuk ka rrugë të regjistruar.`,
    ],
    methods:["një kod drejtimi i klonuar që e zhvendosi viktimën në një rrugë mirëmbajtjeje pa regjistër","një incident industrial fatal i inskenuar me një sensor peshe të rikalibruar","një komandë vinçi autonome e fshehur në një përditësim sigurie për të krijuar një aksident të rremë"],
    twists:["Kontejneri nuk kishte mbajtur kurrë ngarkesën e shënuar.","Pesha e munguar ishte shpërndarë në tri dërgesa të zakonshme.","Kodi i viktimës ishte aktiv sepse ishte kopjuar disa ditë më parë."],
    echoes:["osage","flight629"],
  },
  {
    place:"një stacion shpëtimi në lartësi gjatë një orteku",
    titles:["Sinjali i Bardhë","Sinjali i Katërt","Frekuenca e Varrosur"],
    victimRoles:["drejtuesi i fluturimeve të shpëtimit","parashikuesi i ortekëve","inxhinieri i radios së emergjencës"],
    incidents:[
      name=>`Aktivizohen katër sinjale shpëtimi, megjithëse janë regjistruar vetëm tre alpinistë. ${name} vritet në stacion, ndërsa ekipi kërkon në shpatin e gabuar.`,
      name=>`Një helikopter devijohet nga një thirrje e rreme bindëse. Kur kthehet, ${name} gjendet i vrarë në një dhomë pajisjesh të izoluar.`,
    ],
    methods:["një sinjal i kopjuar shpëtimi që krijoi një vendndodhje të rreme gjatë vrasjes","një sensor moti i ndryshuar që e izoloi viktimën në një rrugë të rrezikshme evakuimi","një thirrje ndihme e regjistruar dhe transmetuar nga një përsëritës mirëmbajtjeje për të mbuluar kohën e vrasjes"],
    twists:["Sinjali shtesë po lëvizte sepse ishte vendosur në një dron furnizimi.","Orteku filloi pas ngjarjes kritike, jo para saj.","Telefonuesi i supozuar nga jashtë transmetoi prej brenda stacionit."],
    echoes:["lindbergh","flight629"],
  },
  {
    place:"një arkiv nëntokësor të dhënash gjatë një prove energjie në qytet",
    titles:["Ruajtje e Ftohtë","Minuta e Humbur","Arkivi i Zi"],
    victimRoles:["arkivisti digjital","auditori i infrastrukturës","kujdestari kriptografik"],
    incidents:[
      name=>`Një arkiv i mbrojtur ligjërisht zëvendësohet me një kopje bosh. ${name} gjendet i vrarë pas një dere që nuk regjistron hyrje.`,
      name=>`Ndërtesa humbet energjinë për saktësisht gjashtëdhjetë e një sekonda. Kur aktivizohen sistemet rezervë, ${name} gjendet i vrarë dhe çdo kamerë shfaq të njëjtën përsëritje.`,
    ],
    methods:["një certifikatë mirëmbajtjeje që aktivizoi një sekuencë fatale pajisjesh dhe nënshkroi një detyrë keqdashëse arkivi","një rele optike që fshehu hyrjen para një përballjeje fatale","një defekt ftohjeje që izoloi viktimën gjatë evakuimit automatik të arkivit"],
    twists:["Arkivi i humbur ishte kopjuar, jo hequr.","Regjistri i derës shënon verifikimin e suksesshëm, jo hyrjen fizike.","Prova e energjisë në qytet ishte e vërtetë, por i dha vrasësit një pikë të verbër të parashikueshme."],
    echoes:["osage","blackDahlia"],
  },
];

const givenNames=["Amina","Anik","Arlo","Ayla","Ciro","Dara","Dev","Elian","Esme","Farah","Hana","Ivo","Jalen","Keira","Lian","Mara","Mika","Nia","Noa","Oren","Priya","Remy","Sable","Samir","Sera","Talia","Theo","Yara","Zane","Zoya"];
const surnames=["Alden","Bell","Calder","Dace","Eren","Fenn","Ilyan","Jori","Kade","Lorne","Mercer","Morrow","Navin","Oris","Quill","Ren","Rowan","Sarin","Tallis","Vale","Venn","Voss","Wren","Yarrow","Zoric"];
type Localized<T=string>={en:T;sq:T};
const localized=(en:string[],sq:string[]):Localized[]=>en.map((value,index)=>({en:value,sq:sq[index]}));
const jobs=localized(
  ["systems engineer","logistics coordinator","medical specialist","security analyst","independent auditor","communications lead","forensic accountant","operations planner","safety inspector","data curator","field researcher","legal observer","mechanical technician","risk consultant","records officer","navigation specialist","procurement lead","ethics reviewer"],
  ["inxhinier sistemesh","koordinator logjistike","specialist mjekësor","analist sigurie","auditor i pavarur","drejtues komunikimi","ekspert kontabël mjekoligjor","planifikues operacionesh","inspektor sigurie","kujdestar të dhënash","studiues terreni","vëzhgues ligjor","teknik mekanik","konsulent rreziku","përgjegjës dokumentacioni","specialist navigimi","drejtues prokurimi","shqyrtues etike"]
);
const secrets=localized(
  ["You copied restricted records to prove a private suspicion.","You owe the victim a large undisclosed debt.","You entered a restricted area to hide an unrelated mistake.","You secretly warned a competitor about the project.","You altered one log to protect another player.","You found evidence early and kept it as leverage.","You used somebody else's access token to conceal a harmless meeting.","You deleted a message that would expose a conflict of interest.","You promised the victim you would hide a damaging report.","You were planning to resign and take confidential work with you.","You witnessed misconduct but accepted a favor to stay quiet.","You moved a suspicious object before realizing it might be evidence."],
  ["Kopjove dokumente të kufizuara për të vërtetuar një dyshim personal.","I detyrohesh viktimës një shumë të madhe që nuk e ke treguar.","Hyre në një zonë të ndaluar për të fshehur një gabim që nuk lidhet me vrasjen.","Paralajmërove fshehurazi një konkurrent për projektin.","Ndryshove një regjistër për të mbrojtur një lojtar tjetër.","Gjete një provë herët dhe e mbajte si mjet presioni.","Përdore kodin e hyrjes së dikujt tjetër për të fshehur një takim të padëmshëm.","Fshive një mesazh që do të zbulonte një konflikt interesi.","I premtove viktimës se do të fshihje një raport dëmtues.","Planifikoje të largoheshe nga puna dhe të merrje me vete material konfidencial.","Pe një shkelje, por pranove një favor për të heshtur.","Lëvize një objekt të dyshimtë para se të kuptoje se mund të ishte provë."]
);
const objectives=localized(
  ["Recover the missing access token without admitting you took it.","Make another player reveal why they met the victim privately.","Keep your professional misconduct out of the final accusation.","Prove the official timeline is wrong.","Learn who accessed the restricted archive.","Protect the player whose secret you already know.","Get two players to publicly confirm your alibi.","Identify which clue was staged without exposing your own lie.","Convince the group to investigate a location connected to your secret.","Discover who knows about your deleted message.","End the game with your private evidence still unrevealed.","Force the real culprit to contradict a released timestamp."],
  ["Rikthe kodin e humbur të hyrjes pa pranuar se e more ti.","Bëj një lojtar tjetër të tregojë pse u takua privatisht me viktimën.","Mbaje shkeljen tënde profesionale jashtë akuzës përfundimtare.","Vërteto se kronologjia zyrtare është e gabuar.","Zbulo kush hyri në arkivin e kufizuar.","Mbro lojtarin sekretin e të cilit e njeh tashmë.","Bëj dy lojtarë të konfirmojnë publikisht alibinë tënde.","Përcakto cila provë u inskenua pa zbuluar gënjeshtrën tënde.","Bind grupin të hetojë një vend që lidhet me sekretin tënd.","Zbulo kush di për mesazhin që fshive.","Mbaroje lojën pa u zbuluar prova jote private.","Detyro vrasësin e vërtetë të kundërshtojë një orar të publikuar."]
);
const observations=localized(
  ["You heard two voices arguing shortly before the alarm.","You noticed a supposedly broken terminal was still warm.","You saw someone carrying two access cards.","You received a blank message at the exact time of the incident.","You smelled antiseptic where none should have been used.","You saw the victim alive later than the official report claims.","A door alarm sounded once, then vanished from the public log.","One suspect changed clothing immediately after the incident.","A device clock was several minutes ahead of the room clock.","The victim asked about a person who was not on the official roster.","You heard machinery running during a scheduled shutdown.","A supposedly sealed package had already been weighed twice."],
  ["Dëgjove dy zëra duke u grindur pak para alarmit.","Vure re se një terminal që thuhej se ishte prishur ishte ende i ngrohtë.","Pe dikë me dy karta hyrjeje.","Morre një mesazh bosh pikërisht në çastin e incidentit.","Ndjeve erë antiseptiku aty ku nuk duhej të ishte përdorur.","E pe viktimën gjallë më vonë nga sa thotë raporti zyrtar.","Alarmi i një dere ra një herë dhe më pas u zhduk nga regjistri publik.","Një i dyshuar ndërroi rrobat menjëherë pas incidentit.","Ora e një pajisjeje ishte disa minuta para orës së dhomës.","Viktima pyeti për një person që nuk ishte në listën zyrtare.","Dëgjove makineri duke punuar gjatë një ndalese të planifikuar.","Një pako që duhej të ishte e vulosur ishte peshuar dy herë."]
);
const alibiActions=localized(
  ["checking inventory","on a private call","repairing a console","reviewing security logs","in the washroom","preparing the next briefing","calibrating a sensor","moving emergency supplies","writing a confidential report","waiting near the service entrance","testing a backup terminal","returning borrowed equipment"],
  ["duke kontrolluar inventarin","në një telefonatë private","duke riparuar një panel","duke kontrolluar regjistrat e sigurisë","në tualet","duke përgatitur takimin e ardhshëm","duke kalibruar një sensor","duke lëvizur furnizimet e emergjencës","duke shkruar një raport konfidencial","duke pritur pranë hyrjes së shërbimit","duke testuar një terminal rezervë","duke kthyer pajisjet e huazuara"]
);
const abilities:Localized<MysteryAbility>[]=[
  {en:{id:"forensic_focus",name:"Forensic Focus",description:"Once per case, privately isolate a reliable detail about the murder mechanism.",needsTarget:false},sq:{id:"forensic_focus",name:"Fokus Mjekoligjor",description:"Një herë në lojë, zbulo privatisht një detaj të sigurt për mekanizmin e vrasjes.",needsTarget:false}},
  {en:{id:"timeline_anchor",name:"Timeline Anchor",description:"Once per case, privately identify the assumption that distorts the murder timeline.",needsTarget:false},sq:{id:"timeline_anchor",name:"Pika e Kronologjisë",description:"Një herë në lojë, identifiko privatisht supozimin që shtrembëron kohën e vrasjes.",needsTarget:false}},
  {en:{id:"confidant",name:"Confidant",description:"Once per case, choose a player and learn one real secret their character is hiding.",needsTarget:true},sq:{id:"confidant",name:"I Besuari",description:"Një herë në lojë, zgjidh një lojtar dhe mëso një sekret të vërtetë që fsheh personazhi i tij.",needsTarget:true}},
  {en:{id:"alibi_audit",name:"Alibi Audit",description:"Once per case, choose a player and test where their alibi fails without learning whether they are the killer.",needsTarget:true},sq:{id:"alibi_audit",name:"Kontroll Alibie",description:"Një herë në lojë, zgjidh një lojtar dhe zbulo ku dështon alibia e tij pa mësuar nëse është vrasësi.",needsTarget:true}},
  {en:{id:"credential_trace",name:"Credential Trace",description:"Once per case, choose a player and examine how their access overlaps the critical window.",needsTarget:true},sq:{id:"credential_trace",name:"Gjurmë Hyrjeje",description:"Një herë në lojë, zgjidh një lojtar dhe kontrollo si përputhet hyrja e tij me çastin kritik.",needsTarget:true}},
  {en:{id:"evidence_preview",name:"Evidence Preview",description:"Once per case, privately open one clue from the next sealed evidence packet.",needsTarget:false},sq:{id:"evidence_preview",name:"Parapamje Prove",description:"Një herë në lojë, hap privatisht një provë nga pakoja e ardhshme e vulosur.",needsTarget:false}},
  {en:{id:"scene_recall",name:"Scene Recall",description:"Once per case, recover a second detail connected to what your character witnessed.",needsTarget:false},sq:{id:"scene_recall",name:"Kujtesa e Skenës",description:"Një herë në lojë, rikujto një detaj të dytë që lidhet me atë që pa personazhi yt.",needsTarget:false}},
  {en:{id:"motive_map",name:"Motive Map",description:"Once per case, choose a player and learn which pressure—not guilt—could make them lie.",needsTarget:true},sq:{id:"motive_map",name:"Harta e Motivit",description:"Një herë në lojë, zgjidh një lojtar dhe mëso cili presion—jo domosdoshmërisht faji—mund ta bëjë të gënjejë.",needsTarget:true}},
  {en:{id:"pattern_link",name:"Pattern Link",description:"Once per case, privately learn which two released clues must be read together.",needsTarget:false},sq:{id:"pattern_link",name:"Lidhja e Gjurmëve",description:"Një herë në lojë, mëso privatisht cilat dy prova të publikuara duhen lexuar së bashku.",needsTarget:false}},
  {en:{id:"witness_check",name:"Witness Check",description:"Once per case, choose a player and test whether their private observation fits the true timeline.",needsTarget:true},sq:{id:"witness_check",name:"Kontroll Dëshmitari",description:"Një herë në lojë, zgjidh një lojtar dhe kontrollo nëse vëzhgimi i tij privat përputhet me kronologjinë e vërtetë.",needsTarget:true}},
];

function randomIndex(length:number){
  if(!Number.isInteger(length)||length<1)throw new Error("A positive collection length is required.");
  const range=0x100000000,limit=range-(range%length),value=new Uint32Array(1);
  do crypto.getRandomValues(value); while(value[0]>=limit);
  return value[0]%length;
}
function shuffle<T>(items:T[]) { const a=[...items]; for(let i=a.length-1;i>0;i--){const j=randomIndex(i+1);[a[i],a[j]]=[a[j],a[i]]} return a; }
const pick=<T,>(a:T[])=>a[randomIndex(a.length)];
function generateCastNames(count:number){
  const firstNames=shuffle(givenNames).slice(0,count),lastNames=shuffle(surnames).slice(0,count);
  return firstNames.map((firstName,index)=>`${firstName} ${lastNames[index]}`);
}

export function randomRoleOrder(playerCount:number){
  return shuffle(Array.from({length:playerCount},(_,index)=>index));
}

export function maxKillerCount(playerCount:number){
  return Math.max(1,Math.min(4,Math.floor((playerCount-1)/2)));
}

type MysteryCombination={settingIndex:number;incidentIndex:number;methodIndex:number;twistIndex:number;fingerprint:string};
function chooseCombination(recentFingerprints:string[],recentSettings:string[]):MysteryCombination{
  const combinations=settings.flatMap((setting,settingIndex)=>setting.incidents.flatMap((_,incidentIndex)=>setting.methods.flatMap((method,methodIndex)=>setting.twists.map((twist,twistIndex)=>({settingIndex,incidentIndex,methodIndex,twistIndex,fingerprint:`${setting.place}\u241f${method}\u241f${twist}`})))));
  const recent=new Set(recentFingerprints),fresh=combinations.filter(combination=>!recent.has(combination.fingerprint)),recentPlaces=new Set(recentSettings.slice(0,5)),differentSetting=fresh.filter(combination=>!recentPlaces.has(settings[combination.settingIndex].place));
  return pick(differentSetting.length?differentSetting:fresh.length?fresh:combinations);
}

export function generateMystery(playerCount:number,killerCount=1,recentFingerprints:string[]=[],recentSettings:string[]=[],mode:GameMode="detective"):MysteryCase {
  if(!Number.isInteger(playerCount)||playerCount<3||playerCount>10)throw new Error("A case requires 3–10 players.");
  if(!Number.isInteger(killerCount)||killerCount<1||killerCount>maxKillerCount(playerCount))throw new Error("That killer count is not valid for this group size.");
  const {settingIndex,incidentIndex,methodIndex,twistIndex,fingerprint}=chooseCombination(recentFingerprints,recentSettings),setting=settings[settingIndex],sqSetting=sqSettings[settingIndex],method=setting.methods[methodIndex],sqMethod=sqSetting.methods[methodIndex],twist=setting.twists[twistIndex],sqTwist=sqSetting.twists[twistIndex];
  const culpritIndices=shuffle(Array.from({length:playerCount},(_,index)=>index)).slice(0,killerCount),culpritSet=new Set(culpritIndices);
  const [victimName,...names]=generateCastNames(playerCount+1),victimRoleIndex=randomIndex(setting.victimRoles.length),victimRole=setting.victimRoles[victimRoleIndex],sqVictimRole=sqSetting.victimRoles[victimRoleIndex],victim=`${victimName}, ${victimRole}`,sqVictim=`${victimName}, ${sqVictimRole}`;
  const titleIndex=randomIndex(setting.titles.length),title=setting.titles[titleIndex],sqTitle=sqSetting.titles[titleIndex],incident=setting.incidents[incidentIndex](victimName),sqIncident=sqSetting.incidents[incidentIndex](victimName),jobOrder=shuffle(jobs),secretOrder=shuffle(secrets),objectiveOrder=shuffle(objectives),observationOrder=shuffle(observations),alibiOrder=shuffle(alibiActions),abilityOrder=shuffle(abilities);
  const killerNames=culpritIndices.map(index=>names[index]);
  const contributions=localized(
    ["created the monitoring gap and prepared the murder mechanism","lured the victim into position and confirmed the critical window","controlled the access trail and removed a secondary record","staged the discovery and triggered the automatic alarm"],
    ["krijoi boshllëkun në mbikëqyrje dhe përgatiti mekanizmin e vrasjes","e joshi viktimën në vendin e duhur dhe konfirmoi çastin kritik","kontrolloi gjurmët e hyrjes dhe hoqi një regjistër dytësor","inskenoi zbulimin dhe aktivizoi alarmin automatik"]
  );
  const roles=names.map((characterName,i):MysteryRole=>({
    characterName,job:jobOrder[i].en,
    publicInfo:mode==="casual"?`You are the ${jobOrder[i].en} at ${setting.place}. You knew ${victimName} through work.`:`You worked closely with ${victim} and had authorized access to part of ${setting.place}.`,
    secret:secretOrder[i].en,objective:mode==="casual"?(culpritSet.has(i)?"Stop a majority from naming the complete killer team.":"Help a majority name the complete killer team."):objectiveOrder[i].en,
    alibi:mode==="casual"?`You say you were ${alibiOrder[i].en} during the murder window.`:`You claim you were ${alibiOrder[i].en} throughout the critical window.`,
    truth:culpritSet.has(i)?killerCount===1?(mode==="casual"?`You used ${method}. Keep this hidden and maintain your alibi.`:`You alone used ${method}. You manipulated the apparent time and returned before the alarm. Maintain your alibi, but do not invent facts that contradict released evidence.`):(mode==="casual"?`Your accomplices are ${killerNames.filter(name=>name!==characterName).join(", ")}. Together you used ${method}; your part was to ${contributions[culpritIndices.indexOf(i)].en}. Protect the complete team.`:`You are one of ${killerCount} killers. Your accomplices are ${killerNames.filter(name=>name!==characterName).join(", ")}. Together you used ${method}; your part was to ${contributions[culpritIndices.indexOf(i)].en}. Protect the entire team without contradicting released evidence.`):(mode==="casual"?`Your alibi has a ${4+i}-minute gap because of your unrelated secret, not the murder.`:`You left your claimed location for ${4+i} minutes. ${secretOrder[(i+playerCount)%secretOrder.length].en}`),
    knows:observationOrder[i].en,culprit:culpritSet.has(i),accomplices:culpritSet.has(i)?killerNames.filter(name=>name!==characterName):undefined,ability:mode==="detective"?abilityOrder[i].en:undefined,
  }));
  const sqRoles=names.map((characterName,i):MysteryRole=>({
    characterName,job:jobOrder[i].sq,
    publicInfo:mode==="casual"?`Ti je ${jobOrder[i].sq} në këtë vend: ${sqSetting.place}. E njihje ${victimName} nga puna.`:`Ke punuar ngushtë me ${sqVictim}. Gjithashtu kishe hyrje të autorizuar në këtë vend: ${sqSetting.place}.`,
    secret:secretOrder[i].sq,objective:mode==="casual"?(culpritSet.has(i)?"Pengo shumicën të emërtojë gjithë ekipin e vrasësve.":"Ndihmo shumicën të emërtojë gjithë ekipin e vrasësve."):objectiveOrder[i].sq,
    alibi:mode==="casual"?`Ti thua se ishe ${alibiOrder[i].sq} gjatë kohës së vrasjes.`:`Ti pretendon se ishe ${alibiOrder[i].sq} gjatë gjithë çastit kritik.`,
    truth:culpritSet.has(i)?killerCount===1?(mode==="casual"?`Metoda jote ishte: ${sqMethod}. Mbaje të fshehtë dhe ruaj alibinë.`:`Ti veprove i vetëm. Metoda e vrasjes ishte: ${sqMethod}. Manipulove kohën e dukshme dhe u ktheve para alarmit. Ruaje alibinë, por mos sajo fakte që kundërshtojnë provat e publikuara.`):(mode==="casual"?`Bashkëpunëtorët e tu janë ${killerNames.filter(name=>name!==characterName).join(", ")}. Së bashku përdorët këtë metodë: ${sqMethod}. Pjesa jote: ${contributions[culpritIndices.indexOf(i)].sq}. Mbro gjithë ekipin.`:`Ti je një nga ${killerCount} vrasësit. Bashkëpunëtorët e tu janë ${killerNames.filter(name=>name!==characterName).join(", ")}. Metoda e përbashkët ishte: ${sqMethod}. Pjesa jote: ${contributions[culpritIndices.indexOf(i)].sq}. Mbro gjithë ekipin pa kundërshtuar provat e publikuara.`):(mode==="casual"?`Alibia jote ka një boshllëk prej ${4+i} minutash për shkak të sekretit tënd, jo për shkak të vrasjes.`:`U largove nga vendi i pretenduar për ${4+i} minuta. ${secretOrder[(i+playerCount)%secretOrder.length].sq}`),
    knows:observationOrder[i].sq,culprit:culpritSet.has(i),accomplices:culpritSet.has(i)?killerNames.filter(name=>name!==characterName):undefined,ability:mode==="detective"?abilityOrder[i].sq:undefined,
  }));
  const culprits=culpritIndices.map(index=>roles[index]),sqCulprits=culpritIndices.map(index=>sqRoles[index]),culpritList=culprits.map(role=>role.characterName).join(", "),echoKey=setting.echoes[randomIndex(setting.echoes.length)],inspiration=historicalEchoes[echoKey],sqInspiration=historicalEchoesSq[echoKey];
  const sharedMotive=killerCount===1?`${culprits[0].characterName} learned that the victim planned to expose a decision that would end their career and implicate someone they were protecting.`:`${culpritList} formed a covert pact after learning that the victim would expose a shared decision, end their careers, and implicate people they were protecting.`;
  const sqSharedMotive=killerCount===1?`${sqCulprits[0].characterName} mësoi se viktima do të zbulonte një vendim që do t'i jepte fund karrierës dhe do të përfshinte dikë që po mbronte.`:`${culpritList} krijuan një marrëveshje të fshehtë pasi mësuan se viktima do të zbulonte një vendim të përbashkët, do t'u shkatërronte karrierat dhe do të përfshinte njerëz që po mbronin.`;
  const accessClues=culprits.map((role,index)=>`A credential assigned to the ${role.job} ${index===0?"opened the critical access chain":index===1?"confirmed the victim's altered meeting time":index===2?"removed a secondary record":`triggered the discovery alarm`}.`);
  const sqAccessClues=sqCulprits.map((role,index)=>`Një kod hyrjeje i caktuar për ${role.job} ${index===0?"hapi zinxhirin kritik të hyrjeve":index===1?"konfirmoi orën e ndryshuar të takimit të viktimës":index===2?"hoqi një regjistër dytësor":"aktivizoi alarmin e zbulimit"}.`);
  const finalClues=culprits.map((role,index)=>`A secondary trace breaks ${role.characterName}'s alibi and links the ${role.job} to the fact that they ${contributions[index].en}.`);
  const sqFinalClues=sqCulprits.map((role,index)=>`Një gjurmë dytësore rrëzon alibinë e ${role.characterName} dhe e lidh rolin ${role.job} me faktin se ${contributions[index].sq}.`);
  const detectiveEvidence=[
      ["A torn schedule shows the victim moved a private meeting forward.",`A witness heard ${killerCount===1?"an argument":"separate voices at two access points"}, but cannot identify everyone involved.`,`A maintenance record contains an unexplained ${5+culpritIndices[0]}-minute gap.`],
      [...accessClues,`The victim received: “Bring the original. Come alone.”`,`Trace material connects the restricted area to several suspects, including an innocent visitor.`],
      [`Forensic review establishes: ${twist}`,`The system diagnostic proves the incident involved ${method}.`,`A damaged draft says the victim planned to expose ${killerCount===1?"one staff member":"a group of "+killerCount+" staff members"}, but its names are unreadable.`,killerCount>1?`The murder required ${killerCount} overlapping actions; no single credential could have completed the sequence.`:"The murder sequence could be completed by one person inside the critical gap."],
      [...finalClues,`Together, the access chain, forensic diagnostic, and draft establish ${killerCount===1?"the killer's":"every killer's"} means, motive, and opportunity.`],
    ];
  const sqDetectiveEvidence=[
      ["Një orar i grisur tregon se viktima e afroi një takim privat.",`Një dëshmitar dëgjoi ${killerCount===1?"një grindje":"zëra të ndryshëm në dy pika hyrjeje"}, por nuk mund të identifikojë të gjithë.`,`Një regjistër mirëmbajtjeje ka një boshllëk të pashpjeguar prej ${5+culpritIndices[0]} minutash.`],
      [...sqAccessClues,`Viktima mori mesazhin: “Sill origjinalin. Eja vetëm.”`,`Gjurmët materiale e lidhin zonën e kufizuar me disa të dyshuar, përfshirë një vizitor të pafajshëm.`],
      [`Shqyrtimi mjekoligjor vërteton: ${sqTwist}`,`Diagnostikimi i sistemit provon metodën e incidentit: ${sqMethod}.`,`Një dokument i dëmtuar thotë se viktima do të denonconte ${killerCount===1?"një punonjës":"një grup prej "+killerCount+" punonjësish"}, por emrat nuk lexohen.`,killerCount>1?`Vrasja kërkoi ${killerCount} veprime të mbivendosura; asnjë kod i vetëm hyrjeje nuk mund ta përfundonte sekuencën.`:"Sekuenca e vrasjes mund të kryhej nga një person brenda çastit kritik."],
      [...sqFinalClues,`Së bashku, zinxhiri i hyrjeve, diagnostikimi mjekoligjor dhe dokumenti vërtetojnë mjetet, motivin dhe mundësinë ${killerCount===1?"e vrasësit":"e çdo vrasësi"}.`],
    ];
  const casualJobs=culprits.map(role=>role.job).join(", "),sqCasualJobs=sqCulprits.map(role=>role.job).join(", ");
  const evidence=mode==="casual"?[
    [`KEY TIMELINE — The torn schedule and maintenance log prove the meeting moved earlier. The real murder window contains an unexplained ${5+culpritIndices[0]}-minute gap.`],
    [killerCount===1?`KEY ACCESS — Only the credential assigned to the ${casualJobs} overlaps the complete murder sequence. Match that job to its character.`:`KEY ACCESS — The murder required ${killerCount} coordinated actions. Only credentials assigned to these jobs overlap every required step: ${casualJobs}. Match each job to its character.`],
    [`KEY FORENSICS — ${twist} The murder method was ${method}. Secondary traces break the alibis of ${culpritList} and connect each named character to a required step.`],
  ]:detectiveEvidence;
  const sqEvidence=mode==="casual"?[
    [`KRONOLOGJIA KRYESORE — Orari i grisur dhe regjistri i mirëmbajtjes provojnë se takimi u afrua. Koha e vërtetë e vrasjes ka një boshllëk të pashpjeguar prej ${5+culpritIndices[0]} minutash.`],
    [killerCount===1?`HYRJA KRYESORE — Vetëm kodi i hyrjes i caktuar për rolin ${sqCasualJobs} përputhet me gjithë sekuencën e vrasjes. Lidhe atë punë me personazhin.`:`HYRJA KRYESORE — Vrasja kërkoi ${killerCount} veprime të bashkërenduara. Vetëm kodet e caktuara për këto role përputhen me çdo hap: ${sqCasualJobs}. Lidhe secilën punë me personazhin.`],
    [`PROVA KRYESORE MJEKOLIGJORE — ${sqTwist} Metoda e vrasjes ishte: ${sqMethod}. Gjurmët dytësore rrëzojnë alibitë e ${culpritList} dhe e lidhin secilin personazh të emërtuar me një hap të domosdoshëm.`],
  ]:sqDetectiveEvidence;
  const timeline=[`The victim secretly prepares to expose ${culpritList}.`,...culprits.map((role,index)=>`${role.characterName} ${contributions[index].en}.`),`${killerCount===1?culprits[0].characterName:"The group"} carries out the murder using ${method}.`,`An innocent player's unrelated secret causes them to disturb the scene.`,`The automatic alarm exposes the incident.`];
  const sqTimeline=[`Viktima përgatitet fshehurazi të denoncojë ${culpritList}.`,...sqCulprits.map((role,index)=>`${role.characterName} ${contributions[index].sq}.`),`${killerCount===1?sqCulprits[0].characterName:"Grupi"} kryen vrasjen. Metoda: ${sqMethod}.`,`Sekreti i palidhur i një lojtari të pafajshëm e bën atë të prishë skenën.`,`Alarmi automatik zbulon incidentin.`];
  return {title,setting:setting.place,victim,incident,method,motive:sharedMotive,twist,roles,evidence,timeline,killerCount,fingerprint,mode,inspiration,
    translations:{sq:{title:sqTitle,setting:sqSetting.place,victim:sqVictim,incident:sqIncident,method:sqMethod,motive:sqSharedMotive,twist:sqTwist,roles:sqRoles,evidence:sqEvidence,timeline:sqTimeline,inspiration:sqInspiration}},
  };
}

const say=(language:GameLanguage,en:string,sq:string)=>language==="sq"?sq:en;

export function resolveRoleAbility(mystery:MysteryCase,roleIndex:number,phase:number,abilityId:MysteryAbilityId,targetRoleIndex:number|null,language:GameLanguage="en"){
  const actor=mystery.roles[roleIndex],target=targetRoleIndex===null?null:mystery.roles[targetRoleIndex];
  if(abilityId==="forensic_focus")return say(language,`Your focused review confirms that the murder depended on ${mystery.method}. This identifies the mechanism, not the person who used it.`,`Shqyrtimi yt i përqendruar konfirmon mekanizmin e vrasjes: ${mystery.method}. Kjo nuk përcakton personin që e përdori.`);
  if(abilityId==="timeline_anchor")return say(language,`One assumption is distorting the timeline: ${mystery.twist} Rebuild every alibi around that fact.`,`Një supozim po shtrembëron kronologjinë: ${mystery.twist} Rishiko çdo alibi duke u bazuar te ky fakt.`);
  if(abilityId==="confidant")return target?say(language,`${target.characterName} is genuinely hiding this: ${target.secret} A real secret is not the same as proof of murder.`,`${target.characterName} po fsheh vërtet këtë: ${target.secret} Një sekret i vërtetë nuk është provë vrasjeje.`):say(language,"Choose another player.","Zgjidh një lojtar tjetër.");
  if(abilityId==="alibi_audit")return target?.culprit?say(language,`${target.characterName}'s claimed location conflicts with a secondary timestamp inside the critical gap. The conflict is significant, but it does not identify what they were doing.`,`Vendi i pretenduar nga ${target.characterName} bie ndesh me një orar dytësor brenda çastit kritik. Kundërshtimi është i rëndësishëm, por nuk tregon çfarë po bënte.`):target?say(language,`${target.characterName}'s missing minutes fit the later disturbance of the scene better than the original murder window. Their alibi is still dishonest.`,`Minutat e humbura të ${target.characterName} përputhen më shumë me prishjen e mëvonshme të skenës sesa me kohën e vrasjes. Alibia mbetet e pandershme.`):say(language,"Choose another player.","Zgjidh një lojtar tjetër.");
  if(abilityId==="credential_trace")return target?.culprit?say(language,`${target.characterName}'s access overlaps both the monitoring gap and the later alarm. The record still identifies a credential, not necessarily its holder.`,`Hyrja e ${target.characterName} përputhet si me boshllëkun në mbikëqyrje, ashtu edhe me alarmin e mëvonshëm. Regjistri përcakton kodin, jo domosdoshmërisht mbajtësin e tij.`):target?say(language,`${target.characterName}'s access overlaps a secondary trace, but not the full critical window. Their credential could still explain an innocent disturbance.`,`Hyrja e ${target.characterName} përputhet me një gjurmë dytësore, por jo me gjithë çastin kritik. Kodi mund të shpjegojë një ndërhyrje të pafajshme.`):say(language,"Choose another player.","Zgjidh një lojtar tjetër.");
  if(abilityId==="evidence_preview"){
    const packet=mystery.evidence[Math.min(mystery.evidence.length-1,Math.max(1,phase))];
    return say(language,`Early access — a clue still sealed for the room reads: “${packet?.[0]??mystery.twist}” You may quote it, conceal it, or wait for the official packet.`,`Hyrje e hershme — një provë ende e vulosur për dhomën thotë: “${packet?.[0]??mystery.twist}” Mund ta tregosh, ta fshehësh ose të presësh pakon zyrtare.`);
  }
  if(abilityId==="scene_recall")return say(language,`${actor.knows} On reflection, you are certain this happened before the public alarm—not after it.`,`${actor.knows} Pasi e mendon përsëri, je i sigurt se kjo ndodhi para alarmit publik, jo pas tij.`);
  if(abilityId==="motive_map")return target?say(language,`${target.characterName}'s strongest reason to misdirect the room is connected to this private goal: ${target.objective} That pressure may be unrelated to the murder.`,`Arsyeja më e fortë që ${target.characterName} ka për të çorientuar grupin lidhet me këtë objektiv privat: ${target.objective} Ky presion mund të mos lidhet me vrasjen.`):say(language,"Choose another player.","Zgjidh një lojtar tjetër.");
  if(abilityId==="pattern_link")return say(language,`Read these facts together: “${mystery.evidence[1]?.[0]??mystery.method}” and “${mystery.evidence[2]?.at(-1)??mystery.twist}” The overlap matters more than either clue alone.`,`Lexoji së bashku këto fakte: “${mystery.evidence[1]?.[0]??mystery.method}” dhe “${mystery.evidence[2]?.at(-1)??mystery.twist}” Përputhja ka më shumë rëndësi se secila provë veçmas.`);
  return target?.culprit?say(language,`${target.characterName}'s observation fits the true murder window, but they describe it as if it happened later. That distortion is deliberate, though it does not reveal their accomplices.`,`Vëzhgimi i ${target.characterName} përputhet me kohën e vërtetë të vrasjes, por përshkruhet sikur ndodhi më vonë. Shtrembërimi është i qëllimshëm, megjithëse nuk zbulon bashkëpunëtorët.`):target?say(language,`${target.characterName}'s observation fits the later disturbance, not the murder itself. They are hiding something real, but this detail does not place them in the killing sequence.`,`Vëzhgimi i ${target.characterName} përputhet me prishjen e mëvonshme të skenës, jo me vetë vrasjen. Po fsheh diçka reale, por ky detaj nuk e vendos në sekuencën e vrasjes.`):say(language,"Choose another player.","Zgjidh një lojtar tjetër.");
}

export function resolvePlayerAction(mystery:MysteryCase,roleIndex:number,phase:number,actionType:PlayerActionType,targetRoleIndex:number|null,language:GameLanguage="en"){
  const round=Math.max(1,Math.min(3,phase)),actor=mystery.roles[roleIndex],target=targetRoleIndex===null?null:mystery.roles[targetRoleIndex],culprits=mystery.roles.filter(role=>role.culprit),culprit=culprits[(round-1)%Math.max(1,culprits.length)]??mystery.roles[0];
  if(actionType==="search_scene"){
    const results=language==="sq"?[
      "Gjen shenja të mbivendosura. Skena u përshkua një herë gjatë incidentit dhe përsëri më pas, ndaj një gjurmë e dyshimtë mund t'i përkasë një vizitori të pafajshëm.",
      `Një rrugë e fshehur mund të përdorej vetëm nga dikush me hyrje të autorizuar. Roli ${culprit.job} e kishte këtë hyrje, por rruga nuk ishte vetëm për një person.`,
      `Një mbetje nën provën e inskenuar përputhet me metodën e vrasjes: ${mystery.method}. Skena e dukshme u rregullua për të larguar vëmendjen nga mekanizmi i vërtetë.`,
    ]:["You find overlapping disturbance marks. The scene was crossed once during the incident and again afterward, so suspicious trace material may belong to an innocent visitor.",`A concealed route could only be used by someone with authorized access. The ${culprit.job} had that access, but the route was not exclusive to one person.`,`A residue hidden beneath the staged evidence is consistent with ${mystery.method}. The visible scene was arranged to distract from the real mechanism.`];
    return{result:results[round-1],publicEffect:null};
  }
  if(actionType==="analyze_evidence"){
    const results=language==="sq"?["Orari u gris pasi ndryshoi ora e takimit. Dikush donte që hetuesit t'i besonin orës së parë.","Përdorimi i përsëritur i kodit mund të vinte nga karta e vërtetë, një sinjal i kopjuar ose dikush që mbante kartën. Regjistri provon hyrjen, jo identitetin.",`Modeli mjekoligjor mbështet këtë përfundim: ${mystery.twist}`]:["The torn schedule was damaged after the meeting time changed. Someone wanted investigators to trust the original time.","The repeated credential use could come from the genuine card, a copied signal, or someone carrying the card. The log proves access, not identity.",`The forensic pattern supports this conclusion: ${mystery.twist}`];
    return{result:results[round-1],publicEffect:null};
  }
  if(actionType==="check_records"){
    const results=language==="sq"?["Viktima e afroi një takim privat pa përditësuar orarin e përbashkët. Kronologjia zyrtare nis nga një supozim i gabuar.",`Kodi i ${culprit.characterName} shfaqet dy herë brenda pak minutash, por një hyrje erdhi aq vonë sa mund të ishte manipuluar.`,`Një terminal i caktuar për ${culprit.job} u sinkronizua gjatë boshllëkut kritik. Ora lokale dhe ora qendrore nuk përputhen.`]:["The victim moved one private meeting earlier without updating the shared schedule. The official timeline begins from the wrong assumption.",`${culprit.characterName}'s credential appears twice in a short window, but one entry arrived late enough that it could have been manipulated.`,`A terminal assigned to the ${culprit.job} synchronized during the critical gap. Its local clock and the central clock do not agree.`];
    return{result:results[round-1],publicEffect:null};
  }
  if(actionType==="interrogate"){
    const name=target?.characterName??say(language,"The suspect","I dyshuari");
    const results=language==="sq"?(target?.culprit?[
      `${name} përsërit alibinë pothuajse fjalë për fjalë, por nuk shpjegon disa minuta që mungojnë. Vetëm ky boshllëk nuk e provon vrasjen.`,
      `${name} pranon se ishte aq afër sa e dëgjoi alarmin para të tjerëve, pastaj e ndryshon shpejt temën te sekreti i një lojtari tjetër.`,
      `Shpjegimi i ${name} nuk përfshin orarin dytësor dhe përsërit formulime që gjenden në regjistrin e ndryshuar.`,
    ]:[
      `Alibia e ${name} ka gjithashtu minuta që mungojnë. Sikleti duket se lidhet me diçka private, ndaj kundërshtimi nuk provon fajin.`,
      `${name} pranon hyrjen në një zonë të paautorizuar, por tregimi nuk shpjegon si u krye incidenti kryesor.`,
      `Minutat e humbura të ${name} përputhen më shumë me prishjen e mëvonshme të skenës sesa me boshllëkun e përdorur për vrasjen.`,
    ]):target?.culprit?[
      `${name} repeats the claimed alibi almost word for word, but cannot explain several missing minutes. That gap alone does not prove the crime.`,
      `${name} admits being close enough to hear the alarm before others did, then quickly changes the subject to another player's secret.`,
      `${name}'s explanation cannot account for the secondary timestamp and echoes wording found in the altered record.`,
    ]:[
      `${name}'s claimed alibi also contains missing minutes. Their discomfort appears connected to something private, so the contradiction alone does not prove guilt.`,
      `${name} admits entering an unauthorized area, but their account does not explain how the main incident was carried out.`,
      `${name}'s missing minutes better fit the later disturbance of the scene than the monitoring gap used to commit the crime.`,
    ];
    return{result:results[round-1],publicEffect:null};
  }
  if(actionType==="plant_false_lead"){
    const name=target?.characterName??say(language,"another suspect","një të dyshuar tjetër");
    return language==="sq"?{result:`Vendose një gjurmë të paverifikuar drejt ${name}. Të gjithë mund ta shohin raportin, por identiteti yt mbetet i fshehur.`,publicEffect:`GJURMË E PAVERIFIKUAR — Një raport i vonuar e lidh fibrën e rrobave të ${name} me zonën e kufizuar. Raporti nuk është vërtetuar.`}:{result:`You planted an unverified trace pointing toward ${name}. Everyone can now see the report, but your identity remains hidden.`,publicEffect:`UNVERIFIED TRACE — A late scene report links ${name}'s clothing fibers to the restricted area. The report has not been authenticated.`};
  }
  if(actionType==="anonymous_tip"){
    const name=target?.characterName??say(language,"another suspect","një të dyshuar tjetër");
    return language==="sq"?{result:`Mesazhi yt anonim e drejton dyshimin te ${name}. Ai shfaqet publikisht pa të identifikuar.`,publicEffect:`MESAZH ANONIM — “Pyeteni ${name} çfarë ndodhi gjatë minutave të humbura.”`}:{result:`Your anonymous message directs suspicion toward ${name}. It appears publicly without identifying you.`,publicEffect:`ANONYMOUS MESSAGE — “Ask ${name} what happened during the missing minutes.”`};
  }
  if(actionType==="forge_alibi"){
    const name=target?.characterName??actor.characterName;
    return language==="sq"?{result:`Shtove një regjistër që duket se mbështet alibinë e ${name}. Mund ta largojë dyshimin, por sinkronizimi i vonuar u jep hetuesve të kujdesshëm mundësi ta kundërshtojnë.`,publicEffect:`REGJISTËR I SINKRONIZUAR ME VONESË — Një hyrje e sapogjetur duket se e vendos ${name} larg incidentit. Ora nuk është verifikuar në mënyrë të pavarur.`}:{result:`You introduced a record that appears to support ${name}'s alibi. It may redirect suspicion, but its late synchronization gives careful investigators a way to challenge it.`,publicEffect:`LATE-SYNCED LOG — A newly recovered entry appears to place ${name} away from the incident. Its timestamp has not been independently verified.`};
  }
  const name=target?.characterName??say(language,"another investigator","një hetues tjetër");
  return language==="sq"?{result:`Ndërhyre në hetimin e ${name}. Rezultati privat fshihet deri sa të hapet pakoja tjetër e provave.`,publicEffect:"NDËRHYRJE NË SISTEM — Një hetim privat është vonuar deri në pakon tjetër të provave."}:{result:`You interfered with ${name}'s investigation. Their private result is hidden until the next evidence packet opens.`,publicEffect:"SYSTEM INTERFERENCE — One private investigation has been delayed until the next evidence packet."};
}
