(function () {
  const categoryLabels = {
    alkali: "Alkali metal",
    alkaline: "Toprak alkali metal",
    transition: "Geçiş metali",
    post: "Metal",
    metalloid: "Yarı metal",
    nonmetal: "Ametal",
    halogen: "Halojen",
    noble: "Soy gaz",
    lanthanide: "Lantanit",
    actinide: "Aktinit"
  };

  const categoryTokens = {
    alkali: "var(--cat-alkali)",
    alkaline: "var(--cat-alkaline)",
    transition: "var(--cat-transition)",
    post: "var(--cat-post)",
    metalloid: "var(--cat-metalloid)",
    nonmetal: "var(--cat-nonmetal)",
    halogen: "var(--cat-halogen)",
    noble: "var(--cat-noble)",
    lanthanide: "var(--cat-lanthanide)",
    actinide: "var(--cat-actinide)"
  };

  const rawElements = "1,H,Hidrojen,nonmetal,1,1|2,He,Helyum,noble,1,18|3,Li,Lityum,alkali,2,1|4,Be,Berilyum,alkaline,2,2|5,B,Bor,metalloid,2,13|6,C,Karbon,nonmetal,2,14|7,N,Azot,nonmetal,2,15|8,O,Oksijen,nonmetal,2,16|9,F,Flor,halogen,2,17|10,Ne,Neon,noble,2,18|11,Na,Sodyum,alkali,3,1|12,Mg,Magnezyum,alkaline,3,2|13,Al,Alüminyum,post,3,13|14,Si,Silisyum,metalloid,3,14|15,P,Fosfor,nonmetal,3,15|16,S,Kükürt,nonmetal,3,16|17,Cl,Klor,halogen,3,17|18,Ar,Argon,noble,3,18|19,K,Potasyum,alkali,4,1|20,Ca,Kalsiyum,alkaline,4,2|21,Sc,Skandiyum,transition,4,3|22,Ti,Titanyum,transition,4,4|23,V,Vanadyum,transition,4,5|24,Cr,Krom,transition,4,6|25,Mn,Manganez,transition,4,7|26,Fe,Demir,transition,4,8|27,Co,Kobalt,transition,4,9|28,Ni,Nikel,transition,4,10|29,Cu,Bakır,transition,4,11|30,Zn,Çinko,transition,4,12|31,Ga,Galyum,post,4,13|32,Ge,Germanyum,metalloid,4,14|33,As,Arsenik,metalloid,4,15|34,Se,Selenyum,nonmetal,4,16|35,Br,Brom,halogen,4,17|36,Kr,Kripton,noble,4,18|37,Rb,Rubidyum,alkali,5,1|38,Sr,Stronsiyum,alkaline,5,2|39,Y,İtriyum,transition,5,3|40,Zr,Zirkonyum,transition,5,4|41,Nb,Niyobyum,transition,5,5|42,Mo,Molibden,transition,5,6|43,Tc,Teknesyum,transition,5,7|44,Ru,Rutenyum,transition,5,8|45,Rh,Rodyum,transition,5,9|46,Pd,Paladyum,transition,5,10|47,Ag,Gümüş,transition,5,11|48,Cd,Kadmiyum,transition,5,12|49,In,İndiyum,post,5,13|50,Sn,Kalay,post,5,14|51,Sb,Antimon,metalloid,5,15|52,Te,Tellür,metalloid,5,16|53,I,İyot,halogen,5,17|54,Xe,Ksenon,noble,5,18|55,Cs,Sezyum,alkali,6,1|56,Ba,Baryum,alkaline,6,2|57,La,Lantan,lanthanide,8,3|58,Ce,Seryum,lanthanide,8,4|59,Pr,Praseodim,lanthanide,8,5|60,Nd,Neodim,lanthanide,8,6|61,Pm,Prometyum,lanthanide,8,7|62,Sm,Samaryum,lanthanide,8,8|63,Eu,Evropiyum,lanthanide,8,9|64,Gd,Gadolinyum,lanthanide,8,10|65,Tb,Terbiyum,lanthanide,8,11|66,Dy,Disprozyum,lanthanide,8,12|67,Ho,Holmiyum,lanthanide,8,13|68,Er,Erbiyum,lanthanide,8,14|69,Tm,Tulyum,lanthanide,8,15|70,Yb,İterbiyum,lanthanide,8,16|71,Lu,Lütesyum,lanthanide,8,17|72,Hf,Hafniyum,transition,6,4|73,Ta,Tantal,transition,6,5|74,W,Tungsten,transition,6,6|75,Re,Renyum,transition,6,7|76,Os,Osmiyum,transition,6,8|77,Ir,İridyum,transition,6,9|78,Pt,Platin,transition,6,10|79,Au,Altın,transition,6,11|80,Hg,Cıva,transition,6,12|81,Tl,Talyum,post,6,13|82,Pb,Kurşun,post,6,14|83,Bi,Bizmut,post,6,15|84,Po,Polonyum,post,6,16|85,At,Astatin,halogen,6,17|86,Rn,Radon,noble,6,18|87,Fr,Fransiyum,alkali,7,1|88,Ra,Radyum,alkaline,7,2|89,Ac,Aktinyum,actinide,9,3|90,Th,Toryum,actinide,9,4|91,Pa,Protaktinyum,actinide,9,5|92,U,Uranyum,actinide,9,6|93,Np,Neptünyum,actinide,9,7|94,Pu,Plütonyum,actinide,9,8|95,Am,Amerikyum,actinide,9,9|96,Cm,Küriyum,actinide,9,10|97,Bk,Berkelyum,actinide,9,11|98,Cf,Kaliforniyum,actinide,9,12|99,Es,Aynştaynyum,actinide,9,13|100,Fm,Fermiyum,actinide,9,14|101,Md,Mendelevyum,actinide,9,15|102,No,Nobelyum,actinide,9,16|103,Lr,Lavrenciyum,actinide,9,17|104,Rf,Rutherfordyum,transition,7,4|105,Db,Dubniyum,transition,7,5|106,Sg,Seaborgiyum,transition,7,6|107,Bh,Bohriyum,transition,7,7|108,Hs,Hassiyum,transition,7,8|109,Mt,Meitneriyum,transition,7,9|110,Ds,Darmstadtiyum,transition,7,10|111,Rg,Röntgenyum,transition,7,11|112,Cn,Kopernikyum,transition,7,12|113,Nh,Nihonyum,post,7,13|114,Fl,Flerovyum,post,7,14|115,Mc,Moskovyum,post,7,15|116,Lv,Livermoryum,post,7,16|117,Ts,Tennessin,halogen,7,17|118,Og,Oganesson,noble,7,18";

  const elements = rawElements.split("|").map((item) => {
    const [atomicNumber, symbol, name, category, period, group] = item.split(",");
    return {
      atomicNumber: Number(atomicNumber),
      symbol,
      name,
      category,
      period: Number(period),
      group: Number(group),
      row: Number(period),
      col: Number(group)
    };
  });

  const enriched = {
    H: { mass: "1.008", phase: "gaz", summary: "Hidrojen, evrende en bol bulunan elementtir ve hafif API örnekleri için iyi bir başlangıç kaydıdır." },
    C: { mass: "12.011", phase: "katı", summary: "Karbon, organik bileşiklerin temel omurgasını oluşturan ve API örneklerinde sık kullanılan bir ametaldir." },
    O: { mass: "15.999", phase: "gaz", summary: "Oksijen, atmosfer ve biyolojik süreçlerle ilişkili istemci örneklerinde en anlaşılır kayıtlardan biridir." },
    Fe: { mass: "55.845", phase: "katı", summary: "Demir, geçiş metallerinin tipik alanlarını göstermek için güçlü bir örnek kayıttır." },
    Au: { mass: "196.967", phase: "katı", summary: "Altın, yüksek atom kütlesi ve sembol bilinirliği nedeniyle arama örneklerinde kullanışlıdır." },
    U: { mass: "238.029", phase: "katı", summary: "Uranyum, aktinit kategorisi ve f-blok konumlandırması için açıklayıcı bir örnektir." }
  };

  const genericSummaries = {
    alkali: "Alkali metaller düşük grup numarasıyla tabloda sol tarafta yer alır ve kategori filtreleri için net bir koleksiyon oluşturur.",
    alkaline: "Toprak alkali metaller ikinci grupta yer alır; liste endpointlerinde grup bazlı filtreleme için idealdir.",
    transition: "Geçiş metalleri orta blokta yoğunlaşır ve periyot-grup sorgularının okunabilirliğini test eder.",
    post: "Metaller, tablo üzerinde p-blok konumlarıyla API şemasında kategori ayrımını gösterir.",
    metalloid: "Yarı metaller, metal ve ametal davranışları arasındaki sınıflandırma sınırını temsil eder.",
    nonmetal: "Ametaller, temel kimya eğitiminde sık arandığı için arama endpointinin ana kullanım örneklerindendir.",
    halogen: "Halojenler on yedinci grupta yer alır ve grup filtresiyle hızlıca listelenebilir.",
    noble: "Soy gazlar on sekizinci grupta yer alır; kapalı kabuk örnekleri için tutarlı bir kategoridir.",
    lanthanide: "Lantanitler f-blokta ayrı satırda gösterilir; tablo yerleşiminde özel konum davranışını temsil eder.",
    actinide: "Aktinitler f-blokta yer alır; ileri seviye filtreler ve kategori açıklamaları için ayrı tutulur."
  };

  const financeProfiles = {
    alkali: { multiplier: 1.16, liquidity: "Orta", use: "Batarya ve reaktif", risk: "Oynak", volatility: "Yüksek", collateral: 48 },
    alkaline: { multiplier: 1.05, liquidity: "Orta", use: "Alaşım ve mineral", risk: "Dengeli", volatility: "Orta", collateral: 54 },
    transition: { multiplier: 1.34, liquidity: "Yüksek", use: "Sanayi ve kataliz", risk: "Dengeli", volatility: "Orta", collateral: 68 },
    post: { multiplier: 1.12, liquidity: "Orta", use: "Elektronik ve kaplama", risk: "Dengeli", volatility: "Orta", collateral: 58 },
    metalloid: { multiplier: 1.22, liquidity: "Yüksek", use: "Yarı iletken", risk: "Büyüme", volatility: "Orta", collateral: 62 },
    nonmetal: { multiplier: 1.1, liquidity: "Yüksek", use: "Yaşam ve eğitim", risk: "Düşük", volatility: "Düşük", collateral: 64 },
    halogen: { multiplier: 1.08, liquidity: "Orta", use: "İlaç ve arıtma", risk: "Kontrollü", volatility: "Orta", collateral: 50 },
    noble: { multiplier: 1.28, liquidity: "Sınırlı", use: "Işık ve kriyojenik", risk: "Nadir", volatility: "Düşük", collateral: 72 },
    lanthanide: { multiplier: 1.46, liquidity: "Sınırlı", use: "Mıknatıs ve optik", risk: "Stratejik", volatility: "Yüksek", collateral: 44 },
    actinide: { multiplier: 1.52, liquidity: "Kısıtlı", use: "Enerji ve araştırma", risk: "Yüksek", volatility: "Yüksek", collateral: 36 }
  };

  let selected = readSelected();

  function byId(id) {
    return document.getElementById(id);
  }

  function normalize(value) {
    return String(value)
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function formatNumber(value, digits = 0) {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function formatElx(value, digits = 2) {
    return `${formatNumber(value, digits)} ELX`;
  }

  function safeGetStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeSetStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {}
  }

  function elementBySymbol(symbol) {
    return elements.find((element) => normalize(element.symbol) === normalize(symbol)) || elements[5];
  }

  function readSelected() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("symbol");
    const fromStore = safeGetStorage("elementapi:selectedSymbol");
    return elementBySymbol(fromUrl || fromStore || "C");
  }

  function persistSelected(element) {
    selected = element;
    safeSetStorage("elementapi:selectedSymbol", element.symbol);
    updateSymbolLinks();
  }

  function updateSymbolLinks() {
    document.querySelectorAll("[data-symbol-link]").forEach((link) => {
      const url = new URL(link.getAttribute("href"), window.location.href);
      url.searchParams.set("symbol", selected.symbol);
      link.setAttribute("href", `${url.pathname.split("/").pop()}${url.search}`);
    });
  }

  function valuationFor(element, range = 12) {
    const profile = financeProfiles[element.category] || financeProfiles.nonmetal;
    const price = Number((42 + element.atomicNumber * 3.55 * profile.multiplier).toFixed(2));
    const trend = Number((((element.atomicNumber % 9) - 3) * 0.7 + profile.multiplier).toFixed(1));
    const index = Math.min(96, Math.round(34 + element.atomicNumber * 0.38 + profile.multiplier * 18));
    const supply = Math.max(8400, Math.round((128000 / (1 + element.atomicNumber * 0.055)) * (2 - profile.multiplier)));
    const useScore = Math.min(99, Math.round(index + profile.multiplier * 7));
    const history = Array.from({ length: range }, (_, i) => {
      const wave = ((element.atomicNumber + i * 5) % 17) / 100;
      return Number((price * (0.91 + wave + i * 0.006)).toFixed(2));
    });
    return {
      price,
      trend,
      index,
      supply,
      useScore,
      history,
      liquidity: profile.liquidity,
      use: profile.use,
      risk: profile.risk,
      volatility: profile.volatility,
      collateral: profile.collateral
    };
  }

  function elementPayload(element) {
    const detail = enriched[element.symbol] || {};
    const valuation = valuationFor(element);
    const period = element.period <= 7 ? element.period : (element.category === "lanthanide" ? 6 : 7);
    const group = element.category === "lanthanide" || element.category === "actinide" ? null : element.group;
    return {
      atomic_number: element.atomicNumber,
      symbol: element.symbol,
      name: { tr: element.name },
      category: element.category,
      category_label: categoryLabels[element.category],
      period,
      group,
      atomic_mass: detail.mass || null,
      phase_at_stp: detail.phase || null,
      summary: detail.summary || genericSummaries[element.category],
      valuation: {
        price_elx: valuation.price,
        change_24h_pct: valuation.trend,
        index: valuation.index,
        liquidity: valuation.liquidity,
        collateral_pct: valuation.collateral
      },
      links: {
        self: `/elements/${element.symbol}`,
        valuation: `/elements/${element.symbol}/valuation`,
        orders: `/elemental/orders?symbol=${element.symbol}`,
        collection: `/elements?category=${element.category}`
      }
    };
  }

  function showToast(message) {
    const toast = byId("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1600);
  }

  function bootShell() {
    const page = document.body.dataset.page;
    document.querySelectorAll(".nav a").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === page);
    });
    document.querySelectorAll("[data-copy-target]").forEach((button) => {
      button.addEventListener("click", async () => {
        const target = byId(button.dataset.copyTarget);
        const text = target ? target.textContent : "";
        try {
          await navigator.clipboard.writeText(text);
        } catch (_) {
          const area = document.createElement("textarea");
          area.value = text;
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        showToast("Kopyalandı");
      });
    });
    updateSymbolLinks();
  }

  function renderElementBadge(prefix, element) {
    const payload = elementPayload(element);
    const badge = byId(`${prefix}Badge`);
    if (badge) badge.style.setProperty("--selected-cat", categoryTokens[element.category]);
    const fields = {
      Number: element.atomicNumber,
      Symbol: element.symbol,
      ShortName: element.name,
      Name: element.name,
      Category: `${categoryLabels[element.category]} - ${payload.period}. periyot, ${payload.group || "f-blok"} grup`,
      Summary: payload.summary,
      Period: payload.period,
      Group: payload.group || "f-blok",
      Mass: payload.atomic_mass || "-",
      Phase: payload.phase_at_stp || "-"
    };
    Object.entries(fields).forEach(([suffix, value]) => {
      const node = byId(`${prefix}${suffix}`);
      if (node) node.textContent = value;
    });
    const numberMeta = byId(`${prefix}NumberMeta`);
    if (numberMeta) numberMeta.textContent = element.atomicNumber;
    const symbolBadge = byId(`${prefix}SymbolBadge`);
    if (symbolBadge) symbolBadge.textContent = element.symbol;
  }

  function makeExplorerResponse(mode, element, query) {
    const payload = elementPayload(element);
    if (mode === "detail") return { data: payload };
    if (mode === "list") {
      const sameCategory = elements.filter((item) => item.category === element.category).slice(0, 8).map(elementPayload);
      return { data: sameCategory, meta: { category: element.category, count: sameCategory.length, truncated: true } };
    }
    if (mode === "period") {
      const samePeriod = elements
        .filter((item) => elementPayload(item).period === payload.period)
        .slice(0, 10)
        .map(elementPayload);
      return { data: samePeriod, meta: { period: payload.period, count: samePeriod.length, truncated: true } };
    }
    const q = query || element.name;
    const matches = elements
      .filter((item) => normalize(item.name).includes(normalize(q)) || normalize(item.symbol).includes(normalize(q)) || String(item.atomicNumber) === String(q))
      .slice(0, 8)
      .map(elementPayload);
    return { data: matches, meta: { q, count: matches.length } };
  }

  function initPeriodicPage() {
    const grid = byId("periodicGrid");
    if (!grid) return;
    const searchInput = byId("searchInput");
    const resultCount = byId("resultCount");
    const endpointMode = byId("endpointMode");
    const queryInput = byId("queryInput");
    const pathPreview = byId("pathPreview");
    const curlCode = byId("curlCode");
    const jsonCode = byId("jsonCode");
    let activeFilter = "all";

    function selectElement(symbol) {
      persistSelected(elementBySymbol(symbol));
      document.querySelectorAll(".element-tile").forEach((tile) => {
        tile.classList.toggle("selected", tile.dataset.symbol === selected.symbol);
      });
      renderElementBadge("selected", selected);
      updatePlayground();
    }

    function updatePlayground() {
      const mode = endpointMode.value;
      const apiBase = "https://api.element.dev/v1";
      const payload = elementPayload(selected);
      let path = `/elements/${selected.symbol}`;
      if (mode === "list") path = `/elements?category=${selected.category}`;
      if (mode === "period") path = `/periods/${payload.period}`;
      if (mode === "search") path = `/search?q=${encodeURIComponent(queryInput.value.trim() || selected.name)}`;
      pathPreview.textContent = path;
      curlCode.textContent = `curl "${apiBase}${path}"`;
      jsonCode.textContent = JSON.stringify(makeExplorerResponse(mode, selected, queryInput.value.trim()), null, 2);
    }

    function applyFilters() {
      const query = normalize(searchInput.value.trim());
      let visible = 0;
      document.querySelectorAll(".element-tile").forEach((tile) => {
        const element = elementBySymbol(tile.dataset.symbol);
        const matchesCategory = activeFilter === "all" || element.category === activeFilter;
        const matchesQuery = !query ||
          normalize(element.name).includes(query) ||
          normalize(element.symbol).includes(query) ||
          String(element.atomicNumber).includes(query);
        const matches = matchesCategory && matchesQuery;
        tile.classList.toggle("dimmed", !matches);
        if (matches) visible += 1;
      });
      resultCount.textContent = `${visible} kayıt`;
    }

    grid.innerHTML = elements.map((element) => `
      <button class="element-tile${element.symbol === selected.symbol ? " selected" : ""}" type="button"
        data-symbol="${element.symbol}" data-category="${element.category}"
        style="--row:${element.row};--col:${element.col};--cat:${categoryTokens[element.category]}"
        aria-label="${element.name}, atom numarası ${element.atomicNumber}">
        <span class="atomic-number">${element.atomicNumber}</span>
        <span class="symbol">${element.symbol}</span>
        <span class="element-name">${element.name}</span>
      </button>
    `).join("");
    grid.addEventListener("click", (event) => {
      const tile = event.target.closest(".element-tile");
      if (tile) selectElement(tile.dataset.symbol);
    });
    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
        applyFilters();
      });
    });
    searchInput.addEventListener("input", applyFilters);
    endpointMode.addEventListener("change", updatePlayground);
    queryInput.addEventListener("input", updatePlayground);
    renderElementBadge("selected", selected);
    updatePlayground();
    applyFilters();
  }

  function initValuesPage() {
    const select = byId("elementSelect");
    if (!select || !byId("marketChart")) return;
    let activeRange = 12;
    select.innerHTML = elements.map((element) => `<option value="${element.symbol}">${element.symbol} - ${element.name}</option>`).join("");
    select.value = selected.symbol;

    function renderValues() {
      const valuation = valuationFor(selected, activeRange);
      const payload = elementPayload(selected);
      const maxHistory = Math.max(...valuation.history);
      renderElementBadge("value", selected);
      byId("valueAssetCategory").textContent = `${categoryLabels[selected.category]} portföy sınıfı`;
      byId("valuePrice").textContent = formatElx(valuation.price, 2);
      byId("valueChange").textContent = `${valuation.trend >= 0 ? "+" : ""}${formatNumber(valuation.trend, 1)}% bugün`;
      byId("valueIndex").textContent = `${valuation.index}/100`;
      byId("valueLiquidity").textContent = valuation.liquidity;
      byId("valueCollateral").textContent = `${valuation.collateral}%`;
      byId("valueSupply").textContent = `${formatNumber(valuation.supply)} birim`;
      byId("valueSupplyChange").textContent = `${valuation.trend >= 0 ? "+" : ""}${formatNumber(Math.max(-3.4, valuation.trend / 2), 1)}%`;
      byId("valueUse").textContent = valuation.use;
      byId("valueUseScore").textContent = String(valuation.useScore);
      byId("valueRisk").textContent = valuation.risk;
      byId("valueVolatility").textContent = valuation.volatility;
      byId("marketChart").innerHTML = valuation.history.map((point) => {
        const height = Math.max(18, Math.round((point / maxHistory) * 100));
        return `<span class="chart-bar" style="height:${height}%"></span>`;
      }).join("");
      byId("marketList").innerHTML = elements
        .filter((item) => item.category === selected.category && item.symbol !== selected.symbol)
        .slice(0, 5)
        .map((peer) => {
          const peerValue = valuationFor(peer);
          return `<div class="bank-row"><div><span>${peer.symbol} / ${categoryLabels[peer.category]}</span><strong>${peer.name}</strong></div><div class="change">${formatElx(peerValue.price, 2)}</div></div>`;
        }).join("");
      byId("valuationJson").textContent = JSON.stringify({
        data: {
          symbol: selected.symbol,
          name: selected.name,
          model: "element-asset-v1",
          ...payload.valuation,
          supply_units: valuation.supply,
          use_case: valuation.use,
          risk_profile: valuation.risk,
          history: valuation.history
        }
      }, null, 2);
    }

    select.addEventListener("change", () => {
      persistSelected(elementBySymbol(select.value));
      renderValues();
    });
    document.querySelectorAll("[data-range]").forEach((button) => {
      button.addEventListener("click", () => {
        activeRange = Number(button.dataset.range);
        document.querySelectorAll("[data-range]").forEach((item) => item.classList.toggle("active", item === button));
        renderValues();
      });
    });
    renderValues();
  }

  function initTradingPage() {
    const select = byId("shopElementSelect");
    const productGrid = byId("productGrid");
    const cartItems = byId("cartItems");
    if (!select || !productGrid || !cartItems) return;
    const searchInput = byId("shopSearchInput");
    const sortSelect = byId("shopSort");
    const cartJson = byId("cartJson");
    const checkoutButton = byId("checkoutButton");
    const checkoutStatus = byId("checkoutStatus");
    const clearButton = byId("clearCart");
    const featuredButton = byId("addFeaturedToCart");
    const cartCard = byId("cartSummary");
    const cartKey = "elementapi:elementalCart";
    let activeCategory = "all";
    let cart = readCart();
    let checkoutReceipt = null;

    select.innerHTML = elements.map((element) => `<option value="${element.symbol}">${element.symbol} - ${element.name}</option>`).join("");
    select.value = selected.symbol;

    function cartElement(symbol) {
      return elements.find((element) => normalize(element.symbol) === normalize(symbol));
    }

    function clampQty(value) {
      return Math.min(99, Math.max(1, Number(value) || 1));
    }

    function readCart() {
      const raw = safeGetStorage(cartKey);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.reduce((items, item) => {
          const element = cartElement(item.symbol);
          if (!element) return items;
          const existing = items.find((entry) => entry.symbol === element.symbol);
          if (existing) existing.qty = clampQty(existing.qty + clampQty(item.qty));
          else items.push({ symbol: element.symbol, qty: clampQty(item.qty) });
          return items;
        }, []).slice(0, 8);
      } catch (_) {
        return [];
      }
    }

    function writeCart() {
      safeSetStorage(cartKey, JSON.stringify(cart));
    }

    function productFor(element) {
      const productValue = valuationFor(element);
      const discount = 0.08 + (element.atomicNumber % 5) * 0.025;
      const rating = Math.min(4.9, 4.18 + (element.atomicNumber % 8) * 0.08);
      return {
        price: productValue.price,
        listPrice: productValue.price / (1 - discount),
        rating,
        reviews: 120 + element.atomicNumber * 11,
        seller: `${categoryLabels[element.category]} deposu`,
        delivery: element.category === "actinide" ? "Kontrollü teslimat" : "Yarın kapında",
        badge: element.atomicNumber % 3 === 0 ? "Çok satan" : "Fırsat"
      };
    }

    function flashCart() {
      if (!cartCard) return;
      cartCard.classList.remove("cart-pulse");
      window.setTimeout(() => cartCard.classList.add("cart-pulse"), 0);
      window.setTimeout(() => cartCard.classList.remove("cart-pulse"), 420);
    }

    function flashProduct(symbol) {
      const card = productGrid.querySelector(`[data-product-symbol="${symbol}"]`);
      if (!card) return;
      card.classList.remove("card-added");
      window.setTimeout(() => card.classList.add("card-added"), 0);
      window.setTimeout(() => card.classList.remove("card-added"), 420);
    }

    function addToCart(symbol) {
      const element = cartElement(symbol);
      if (!element) return;
      const existing = cart.find((item) => item.symbol === element.symbol);
      if (existing) existing.qty = clampQty(existing.qty + 1);
      else cart.unshift({ symbol: element.symbol, qty: 1 });
      cart = cart.slice(0, 8);
      checkoutReceipt = null;
      writeCart();
      renderProducts();
      renderCart();
      flashProduct(element.symbol);
      flashCart();
      showToast(`${element.name} sepete eklendi`);
    }

    function stepCart(symbol, delta) {
      cart = cart
        .map((item) => {
          if (item.symbol !== symbol) return item;
          const nextQty = (Number(item.qty) || 1) + delta;
          return nextQty <= 0 ? null : { ...item, qty: Math.min(99, nextQty) };
        })
        .filter(Boolean);
      checkoutReceipt = null;
      writeCart();
      renderProducts();
      renderCart();
      flashCart();
    }

    function renderFeatured() {
      renderElementBadge("shop", selected);
    }

    function visibleProducts() {
      const query = normalize(searchInput ? searchInput.value.trim() : "");
      const list = elements.filter((element) => {
        const matchesCategory = activeCategory === "all" || element.category === activeCategory;
        const matchesQuery = !query ||
          normalize(element.name).includes(query) ||
          normalize(element.symbol).includes(query) ||
          normalize(categoryLabels[element.category]).includes(query);
        return matchesCategory && matchesQuery;
      });
      const mode = sortSelect ? sortSelect.value : "featured";
      return list.sort((a, b) => {
        const pa = productFor(a);
        const pb = productFor(b);
        if (mode === "price-asc") return pa.price - pb.price;
        if (mode === "price-desc") return pb.price - pa.price;
        if (mode === "rating") return pb.rating - pa.rating;
        return (b.symbol === selected.symbol ? 1 : 0) - (a.symbol === selected.symbol ? 1 : 0) || a.atomicNumber - b.atomicNumber;
      }).slice(0, 18);
    }

    function renderProducts() {
      productGrid.innerHTML = visibleProducts().map((element) => {
        const product = productFor(element);
        const cartLine = cart.find((item) => item.symbol === element.symbol);
        return `
          <article class="product-card${cartLine ? " in-cart" : ""}" style="--cat:${categoryTokens[element.category]}" data-product-symbol="${element.symbol}">
            <div class="product-visual">
              <span class="product-badge">${cartLine ? "Sepette" : product.badge}</span>
              <span class="symbol">${element.symbol}</span>
            </div>
            <div class="product-title">
              <h3>${element.name} paketi</h3>
              <span>${categoryLabels[element.category]} - atom no ${element.atomicNumber}</span>
            </div>
            <div class="rating-row">
              <strong>${formatNumber(product.rating, 1)} / 5</strong>
              <span class="seller-note">${formatNumber(product.reviews)} değerlendirme</span>
            </div>
            <div class="price-row">
              <strong>${formatElx(product.price, 2)}</strong>
              <del>${formatElx(product.listPrice, 2)}</del>
            </div>
            ${cartLine ? `<span class="stock-note">Sepette ${cartLine.qty} adet</span>` : `<span class="stock-note">Stokta. Hızlı eklenir.</span>`}
            <p class="delivery-note">${product.delivery}. Satıcı: ${product.seller}</p>
            <button class="btn primary" type="button" data-add-symbol="${element.symbol}">${cartLine ? "Bir adet daha ekle" : "Sepete ekle"}</button>
          </article>
        `;
      }).join("");
      if (!productGrid.innerHTML) {
        productGrid.innerHTML = `
          <div class="empty-cart shop-empty">
            <strong>Ürün bulunamadı</strong>
            <p>Aramayı temizleyip Elemental mağaza raflarına dönebilirsin.</p>
            <button class="mini-btn" type="button" data-clear-shop>Aramayı temizle</button>
          </div>
        `;
      }
    }

    function renderCart() {
      const lines = cart.map((item) => {
        const element = cartElement(item.symbol);
        if (!element) return null;
        const product = productFor(element);
        return {
          element,
          product,
          qty: clampQty(item.qty),
          lineTotal: product.price * clampQty(item.qty)
        };
      }).filter(Boolean);
      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const fee = subtotal * 0.018;
      const delivery = subtotal > 1200 || subtotal === 0 ? 0 : 39;
      const total = subtotal + fee + delivery;
      cartItems.innerHTML = lines.length ? lines.map((line) => `
        <div class="cart-row">
          <div>
            <h4>${line.element.name} paketi</h4>
            <p>${formatElx(line.product.price, 2)}. ${line.product.delivery}</p>
          </div>
          <div class="cart-row-actions">
            <div class="quantity-stepper" aria-label="${line.element.name} adedi">
              <button type="button" data-cart-symbol="${line.element.symbol}" data-cart-step="-1" aria-label="${line.element.name} azalt">-</button>
              <span>${line.qty}</span>
              <button type="button" data-cart-symbol="${line.element.symbol}" data-cart-step="1" aria-label="${line.element.name} artır">+</button>
            </div>
            <button class="cart-remove" type="button" data-remove-symbol="${line.element.symbol}">Kaldır</button>
          </div>
        </div>
      `).join("") : `<div class="empty-cart">Sepetin boş. Ürün kartlarından element ekleyebilirsin.</div>`;
      byId("cartSubtotal").textContent = formatElx(subtotal, 2);
      byId("cartFee").textContent = formatElx(fee, 2);
      byId("cartDelivery").textContent = delivery ? formatElx(delivery, 2) : "Ücretsiz";
      byId("cartTotal").textContent = formatElx(total, 2);
      const orderPayload = {
        endpoint: "POST /elemental/orders",
        body: {
          currency: "ELX",
          channel: "elemental-web",
          status: lines.length ? "draft" : "empty_cart",
          order_id: checkoutReceipt ? checkoutReceipt.id : null,
          items: lines.map((line) => ({
            symbol: line.element.symbol,
            name: line.element.name,
            quantity: line.qty,
            unit_price_elx: Number(line.product.price.toFixed(2)),
            category: line.element.category
          }))
        },
        service_fee_elx: Number(fee.toFixed(2)),
        delivery_elx: Number(delivery.toFixed(2)),
        total_elx: Number(total.toFixed(2))
      };
      if (cartJson) cartJson.textContent = JSON.stringify(orderPayload, null, 2);
      if (checkoutButton) {
        checkoutButton.disabled = !lines.length;
        checkoutButton.textContent = lines.length ? "Siparişi oluştur" : "Sepet boş";
      }
      if (checkoutStatus) {
        checkoutStatus.classList.toggle("ready", Boolean(checkoutReceipt));
        checkoutStatus.innerHTML = checkoutReceipt
          ? `<strong>${checkoutReceipt.id} oluşturuldu</strong>${formatElx(total, 2)} tutarında Elemental siparişi hazırlandı. API gövdesini kopyalayabilirsin.`
          : (lines.length
            ? `${lines.length} ürün seçildi. Siparişi oluşturduğunda API gövdesine sipariş numarası eklenecek.`
            : "Sepete ürün eklediğinde sipariş özeti burada hazırlanır.");
      }
    }

    select.addEventListener("change", () => {
      persistSelected(elementBySymbol(select.value));
      renderFeatured();
      renderProducts();
      renderCart();
    });
    if (searchInput && searchInput.closest("form")) {
      searchInput.closest("form").addEventListener("submit", (event) => event.preventDefault());
      searchInput.addEventListener("input", renderProducts);
    }
    if (sortSelect) sortSelect.addEventListener("change", renderProducts);
    document.querySelectorAll("[data-shop-category]").forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.shopCategory;
        document.querySelectorAll("[data-shop-category]").forEach((item) => item.classList.toggle("active", item === button));
        renderProducts();
      });
    });
    productGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-add-symbol]");
      const clearSearchButton = event.target.closest("[data-clear-shop]");
      if (button) addToCart(button.dataset.addSymbol);
      if (clearSearchButton && searchInput) {
        searchInput.value = "";
        activeCategory = "all";
        document.querySelectorAll("[data-shop-category]").forEach((item) => item.classList.toggle("active", item.dataset.shopCategory === "all"));
        renderProducts();
        searchInput.focus();
      }
    });
    cartItems.addEventListener("click", (event) => {
      const stepButton = event.target.closest("[data-cart-symbol]");
      const removeButton = event.target.closest("[data-remove-symbol]");
      if (stepButton) stepCart(stepButton.dataset.cartSymbol, Number(stepButton.dataset.cartStep));
      if (removeButton) {
        cart = cart.filter((item) => item.symbol !== removeButton.dataset.removeSymbol);
        checkoutReceipt = null;
        writeCart();
        renderProducts();
        renderCart();
        flashCart();
      }
    });
    if (featuredButton) featuredButton.addEventListener("click", () => addToCart(selected.symbol));
    if (clearButton) clearButton.addEventListener("click", () => {
      cart = [];
      checkoutReceipt = null;
      writeCart();
      renderProducts();
      renderCart();
      flashCart();
    });
    if (checkoutButton) checkoutButton.addEventListener("click", () => {
      if (!cart.length) {
        showToast("Sepet boş");
        return;
      }
      checkoutReceipt = {
        id: `ELM-${Date.now().toString(36).toUpperCase()}`,
        createdAt: new Date().toLocaleString("tr-TR")
      };
      renderCart();
      flashCart();
      showToast("Elemental siparişi oluşturuldu");
    });
    renderFeatured();
    renderProducts();
    renderCart();
  }

  document.addEventListener("DOMContentLoaded", () => {
    bootShell();
    initPeriodicPage();
    initValuesPage();
    initTradingPage();
  });
})();
