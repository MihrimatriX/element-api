using Element.Services.Element.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Persistence;

/// <summary>
/// Backfills Turkish names, product images, summaries and commerce metadata for all 118 elements.
/// ponytail: runs once per row when ImageUrl is empty; idempotent on restart.
/// </summary>
public sealed class ElementDetailSeeder : IHostedService
{
    private const string ImageHost = "https://images-of-elements.com";

    // Simulated shop metadata is derived from the atomic number so it is stable across restarts.
    private const decimal BaseRating = 4.0m;
    private const decimal RatingStep = 0.1m;
    private const int RatingSteps = 9;
    private const int BaseReviewCount = 120;
    private const int ReviewsPerAtomicNumber = 11;

    private static readonly Dictionary<string, string> TurkishNames = ParseTurkishNames();

    private readonly IServiceProvider _services;
    private readonly ILogger<ElementDetailSeeder> _logger;

    public ElementDetailSeeder(IServiceProvider services, ILogger<ElementDetailSeeder> logger)
    {
        _services = services;
        _logger = logger;
    }

    /// <summary>Fills the detail fields of every element that has no image yet, then saves once.</summary>
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ElementDbContext>();

        var elementsWithoutDetails = await db.ChemicalElements
            .Where(element => element.ImageUrl == "")
            .ToListAsync(cancellationToken);
        if (elementsWithoutDetails.Count == 0)
        {
            return;
        }

        foreach (var element in elementsWithoutDetails)
        {
            FillDetails(element);
        }

        await db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Element detail seed completed for {Count} elements.", elementsWithoutDetails.Count);
    }

    /// <summary>Nothing to clean up; the seeding work finishes inside <see cref="StartAsync"/>.</summary>
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    /// <summary>
    /// Derives the periodic-table block (s, p, d or f) from group, atomic number and category.
    /// Hydrogen and helium are s-block even though helium sits in group 18.
    /// </summary>
    public static string ResolveBlock(ChemicalElement element)
    {
        if (element.AtomicNumber <= 2 || element.Group <= 2)
        {
            return "s";
        }

        var isLanthanideOrActinide =
            element.Category.Contains("lanthanide", StringComparison.OrdinalIgnoreCase) ||
            element.Category.Contains("actinide", StringComparison.OrdinalIgnoreCase);
        if (isLanthanideOrActinide)
        {
            return "f";
        }

        return element.Group >= 13 ? "p" : "d";
    }

    private static void FillDetails(ChemicalElement element)
    {
        var turkishName = TurkishNames.GetValueOrDefault(element.Symbol, element.Name);
        var uses = CategoryUses(element.Category);

        element.NameTr = turkishName;
        element.Block = ResolveBlock(element);
        element.Electronegativity = ElementPropertyCatalog.Get(element.Symbol)?.Electronegativity;
        element.Appearance = $"{PhaseLabel(element.Phase)} hâlde, {ColorOrCategory(element)} görünüm";
        element.Uses = uses;
        element.Summary = $"{turkishName} ({element.Symbol}), {element.Category} sınıfında atom numarası {element.AtomicNumber} olan bir elementtir. {uses} alanlarında kullanılır.";
        element.ImageUrl = $"{ImageHost}/{ImageSlug(element.Name)}.jpg";
        element.SellerName = CategorySeller(element.Category);
        element.Rating = Math.Round(BaseRating + (element.AtomicNumber % RatingSteps) * RatingStep, 1);
        element.ReviewCount = BaseReviewCount + element.AtomicNumber * ReviewsPerAtomicNumber;
        element.Badge = PickBadge(element.AtomicNumber);
    }

    private static string? PickBadge(int atomicNumber)
    {
        if (atomicNumber % 3 == 0)
        {
            return "Çok satan";
        }

        if (atomicNumber % 5 == 0)
        {
            return "Fırsat";
        }

        return null;
    }

    private static string ImageSlug(string englishName) =>
        englishName.ToLowerInvariant().Replace(" ", "-");

    private static string PhaseLabel(string phase) => phase.ToLowerInvariant() switch
    {
        "gas" => "gaz",
        "liquid" => "sıvı",
        _ => "katı"
    };

    private static string ColorOrCategory(ChemicalElement element) =>
        string.IsNullOrWhiteSpace(element.Color) ? element.Category : element.Color;

    private static string CategoryUses(string category)
    {
        var normalized = category.ToLowerInvariant();

        // More specific names are checked first: "alkaline" contains "alkali"
        // and "post-transition" contains "transition".
        if (normalized.Contains("alkaline")) return "İnşaat malzemesi, alaşım ve mineral";
        if (normalized.Contains("alkali")) return "Batarya, reaktif kimya ve alaşım";
        if (normalized.Contains("post-transition")) return "Elektronik, kaplama ve üretim";
        if (normalized.Contains("transition")) return "Sanayi, kataliz ve elektronik";
        if (normalized.Contains("metalloid")) return "Yarı iletken ve optik";
        if (normalized.Contains("noble")) return "Işıklandırma ve kriyojenik uygulama";
        if (normalized.Contains("lanthanide")) return "Mıknatıs, optik ve enerji";
        if (normalized.Contains("actinide")) return "Enerji ve araştırma";
        if (normalized.Contains("halogen")) return "İlaç, arıtma ve polimer";
        return "Eğitim, yaşam bilimleri ve malzeme";
    }

    private static string CategorySeller(string category)
    {
        var normalized = category.ToLowerInvariant();
        if (normalized.Contains("transition")) return "Sanayi Metalleri Deposu";
        if (normalized.Contains("noble")) return "Soy Gaz Laboratuvarı";
        if (normalized.Contains("lanthanide") || normalized.Contains("actinide")) return "Nadir Element A.Ş.";
        // "alkali" also matches "alkaline earth metal".
        if (normalized.Contains("alkali")) return "Reaktif Kimya Market";
        return "Elemental Resmi Satıcı";
    }

    private static Dictionary<string, string> ParseTurkishNames()
    {
        // Format: "Symbol,TurkishName|Symbol,TurkishName|..."
        const string raw = "H,Hidrojen|He,Helyum|Li,Lityum|Be,Berilyum|B,Bor|C,Karbon|N,Azot|O,Oksijen|F,Flor|Ne,Neon|Na,Sodyum|Mg,Magnezyum|Al,Alüminyum|Si,Silisyum|P,Fosfor|S,Kükürt|Cl,Klor|Ar,Argon|K,Potasyum|Ca,Kalsiyum|Sc,Skandiyum|Ti,Titanyum|V,Vanadyum|Cr,Krom|Mn,Manganez|Fe,Demir|Co,Kobalt|Ni,Nikel|Cu,Bakır|Zn,Çinko|Ga,Galyum|Ge,Germanyum|As,Arsenik|Se,Selenyum|Br,Brom|Kr,Kripton|Rb,Rubidyum|Sr,Stronsiyum|Y,İtriyum|Zr,Zirkonyum|Nb,Niyobyum|Mo,Molibden|Tc,Teknesyum|Ru,Rutenyum|Rh,Rodyum|Pd,Paladyum|Ag,Gümüş|Cd,Kadmiyum|In,İndiyum|Sn,Kalay|Sb,Antimon|Te,Tellür|I,İyot|Xe,Ksenon|Cs,Sezyum|Ba,Baryum|La,Lantan|Ce,Seryum|Pr,Praseodim|Nd,Neodim|Pm,Prometyum|Sm,Samaryum|Eu,Evropiyum|Gd,Gadolinyum|Tb,Terbiyum|Dy,Disprozyum|Ho,Holmiyum|Er,Erbiyum|Tm,Tulyum|Yb,İterbiyum|Lu,Lütesyum|Hf,Hafniyum|Ta,Tantal|W,Tungsten|Re,Renyum|Os,Osmiyum|Ir,İridyum|Pt,Platin|Au,Altın|Hg,Cıva|Tl,Talyum|Pb,Kurşun|Bi,Bizmut|Po,Polonyum|At,Astatin|Rn,Radon|Fr,Fransiyum|Ra,Radyum|Ac,Aktinyum|Th,Toryum|Pa,Protaktinyum|U,Uranyum|Np,Neptünyum|Pu,Plütonyum|Am,Amerikyum|Cm,Küriyum|Bk,Berkelyum|Cf,Kaliforniyum|Es,Aynştaynyum|Fm,Fermiyum|Md,Mendelevyum|No,Nobelyum|Lr,Lavrenciyum|Rf,Rutherfordyum|Db,Dubniyum|Sg,Seaborgiyum|Bh,Bohriyum|Hs,Hassiyum|Mt,Meitneriyum|Ds,Darmstadtiyum|Rg,Röntgenyum|Cn,Kopernikyum|Nh,Nihonyum|Fl,Flerovyum|Mc,Moskovyum|Lv,Livermoryum|Ts,Tennessin|Og,Oganesson";

        return raw
            .Split('|')
            .Select(pair => pair.Split(',', 2))
            .ToDictionary(pair => pair[0], pair => pair[1], StringComparer.OrdinalIgnoreCase);
    }
}
