/** Content of the /nasil handbook: the first-ten-minutes steps and the FAQ. */

/** An in-app link inside a handbook step. */
export interface GuideLink {
  to: string;
  label: string;
}

/** One numbered step of the handbook. */
export interface GuideStep {
  title: string;
  body: string;
  links: GuideLink[];
}

/** One FAQ entry. */
export interface GuideQuestion {
  question: string;
  answer: string;
}

/**
 * The numbered steps. With accounts off there is no sign-up or market, so the backup
 * step drops the account link and the market step is left out (the /demo tour is
 * linked from the page as a secondary note instead).
 */
export function guideSteps(accountsEnabled: boolean): GuideStep[] {
  const steps: GuideStep[] = [
    {
      title: "Demir’i bul",
      body: "Tabloda Fe, Demir veya 26 yaz. Kaynağını oku. Fotoğraf yoksa şema var; boş hücre çoğu zaman bilinçli bir lisans veya gaz kararı.",
      links: [{ to: "/element/fe", label: "Fe kaydını aç" }],
    },
    {
      title: "Suyu kur",
      body: "Laboratuvarda hidrojeni ve oksijeni tezgâha sürükle, hidrojeni + ile ikiye çıkar, Dene’ye bas. HO su değildir; sayı tutmazsa kart açılmaz.",
      links: [{ to: "/lab?lesson=everyday", label: "İki H, bir O" }],
    },
    {
      title: "İlk rotayı bitir",
      body: "Defterinde altı rota var. Günlük maddeler su, karbondioksit, amonyak ister. Keşifler dolunca soru açılır.",
      links: [{ to: "/collection", label: "Defterime git" }],
    },
    {
      title: "Formülü kur, Dedektifi oyna",
      body: "Adı verilen kaydın atom sayılarını ayarla; ipuçlarından elementi bul. Skorlar ayrı kutudadır, keşif defterine yazılmaz.",
      links: [
        { to: "/lab/formula?compound=nacl", label: "Tuzla başla" },
        { to: "/lab/detective", label: "Dedektifi aç" },
      ],
    },
    accountsEnabled
      ? {
          title: "Defteri yedekle",
          body: "Misafir kayıtları yalnız bu tarayıcıda. JSON indir, aynı dosyayı geri yükle. Hesap açarsan defter cihazlar arası eşitlenir.",
          links: [
            { to: "/collection", label: "Dosyamı indir" },
            { to: "/register?returnTo=/collection", label: "Hesap aç" },
          ],
        }
      : {
          title: "Defteri yedekle",
          body: "Kayıtların yalnız bu tarayıcıda. JSON indir, başka cihazda aynı dosyayı geri yükle.",
          links: [{ to: "/collection", label: "Dosyamı indir" }],
        },
  ];
  if (accountsEnabled)
    steps.push({
      title: "İstersen pazara geç",
      body: "Bilim bitti, simülasyon başlar: 10.000 sanal kredi, Fe gramı, alış-satış farkı. Gerçek para yok; keşif defterin değişmez.",
      links: [
        { to: "/demo", label: "Kredi simülasyonunu tanı" },
        { to: "/market", label: "Fiyat tablosu" },
      ],
    });
  return steps;
}

/** Frequently asked questions; answers that mention accounts change when accounts are off. */
export function guideQuestions(accountsEnabled: boolean): GuideQuestion[] {
  return [
    {
      question: "HO neden su değil?",
      answer:
        "Su iki hidrojen, bir oksijen ister. Bir H bir O kataloğumuzda yok; laboratuvarda Dene’ye bassan da kart açılmaz. Sayı tutmalı, adı benzemek yetmez.",
    },
    {
      question: "Misafir verim ne zaman silinir?",
      answer: accountsEnabled
        ? "Tarayıcı verisini silersen ve JSON yedeğin yoksa gider. Hesap açıp defterini taşımadıkça kayıtlar yalnız bu cihazda durur."
        : "Tarayıcı verisini silersen ve JSON yedeğin yoksa gider. Kayıtlar yalnız bu cihazda durur.",
    },
    {
      question: "Bilim kataloğu ile tam sürümün farkı ne?",
      answer:
        "Bilim kataloğu tek başına çalışır: tablo, bileşikler, laboratuvar, defter ve açık API. Tam sürüm buna hesap, cihazlar arası defter ve ayrı KREDI demosunu ekler.",
    },
    {
      question: "API çalışmazsa ne olur?",
      answer:
        "Tablo gömülü kayıtlarla açılır, ayrıntı sayfası yeniden denemeni ister. Keşiflerin tarayıcıda durur; kaybolmaz.",
    },
    {
      question: "Oyun skorları deftere yazılır mı?",
      answer: accountsEnabled
        ? "Hayır. Formülü kur ve Dedektif skorları ayrı kutudadır. Giriş yaptıysan Sıfırla düğmesi görünmez; sunucudaki defterin korunur."
        : "Hayır. Formülü kur ve Dedektif skorları ayrı kutudadır; defterdeki keşiflerine dokunmaz.",
    },
  ];
}
