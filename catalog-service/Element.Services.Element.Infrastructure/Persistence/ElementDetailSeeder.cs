using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
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
    private readonly IServiceProvider _services;
    private readonly ILogger<ElementDetailSeeder> _logger;

    private static readonly Dictionary<string, string> TurkishNames = ParseTurkishNames();

    public ElementDetailSeeder(IServiceProvider services, ILogger<ElementDetailSeeder> logger)
    {
        _services = services;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ElementDbContext>();
        var pending = await db.ChemicalElements.Where(e => e.ImageUrl == "").ToListAsync(cancellationToken);
        if (pending.Count == 0) return;

        foreach (var el in pending)
        {
            var nameTr = TurkishNames.GetValueOrDefault(el.Symbol, el.Name);
            var uses = CategoryUses(el.Category);
            var appearance = $"{PhaseLabel(el.Phase)} hâlde, {ColorOrCategory(el)} görünüm";
            var block = ResolveBlock(el);
            var seller = CategorySeller(el.Category);

            el.NameTr = nameTr;
            el.Block = block;
            el.Electronegativity = Math.Round(0.7m + (el.AtomicNumber % 34) * 0.1m, 2);
            el.Appearance = appearance;
            el.Uses = uses;
            el.Summary = $"{nameTr} ({el.Symbol}), {el.Category} sınıfında atom numarası {el.AtomicNumber} olan bir elementtir. {uses} alanlarında kullanılır.";
            el.ImageUrl = $"https://images-of-elements.com/{ImageSlug(el.Name)}.jpg";
            el.SellerName = seller;
            el.Rating = Math.Round(4.0m + (el.AtomicNumber % 9) * 0.1m, 1);
            el.ReviewCount = 120 + el.AtomicNumber * 11;
            el.Badge = el.AtomicNumber % 3 == 0 ? "Çok satan" : el.AtomicNumber % 5 == 0 ? "Fırsat" : null;
        }

        await db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Element detail seed completed for {Count} elements.", pending.Count);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static string ImageSlug(string englishName) =>
        englishName.ToLowerInvariant().Replace(" ", "-");

    private static string PhaseLabel(string phase) => phase.ToLowerInvariant() switch
    {
        "gas" => "gaz",
        "liquid" => "sıvı",
        _ => "katı"
    };

    private static string ColorOrCategory(ChemicalElement el) =>
        string.IsNullOrWhiteSpace(el.Color) ? el.Category : el.Color;

    private static string ResolveBlock(ChemicalElement el)
    {
        if (el.Category.Contains("lanthanide", StringComparison.OrdinalIgnoreCase) ||
            el.Category.Contains("actinide", StringComparison.OrdinalIgnoreCase))
            return "f";
        if (el.Category.Contains("transition", StringComparison.OrdinalIgnoreCase))
            return "d";
        if (el.Group >= 13 || el.Category.Contains("nonmetal", StringComparison.OrdinalIgnoreCase))
            return "p";
        return "s";
    }

    private static string CategoryUses(string category)
    {
        var norm = category.ToLowerInvariant();
        if (norm.Contains("alkali")) return "Batarya, reaktif kimya ve alaşım";
        if (norm.Contains("alkaline")) return "İnşaat malzemesi, alaşım ve mineral";
        if (norm.Contains("transition")) return "Sanayi, kataliz ve elektronik";
        if (norm.Contains("post-transition")) return "Elektronik, kaplama ve üretim";
        if (norm.Contains("metalloid")) return "Yarı iletken ve optik";
        if (norm.Contains("noble")) return "Işıklandırma ve kriyojenik uygulama";
        if (norm.Contains("lanthanide")) return "Mıknatıs, optik ve enerji";
        if (norm.Contains("actinide")) return "Enerji ve araştırma";
        if (norm.Contains("halogen")) return "İlaç, arıtma ve polimer";
        return "Eğitim, yaşam bilimleri ve malzeme";
    }

    private static string CategorySeller(string category)
    {
        var norm = category.ToLowerInvariant();
        if (norm.Contains("transition")) return "Sanayi Metalleri Deposu";
        if (norm.Contains("noble")) return "Soy Gaz Laboratuvarı";
        if (norm.Contains("lanthanide") || norm.Contains("actinide")) return "Nadir Element A.Ş.";
        if (norm.Contains("alkali") || norm.Contains("alkaline")) return "Reaktif Kimya Market";
        return "Elemental Resmi Satıcı";
    }

    private static Dictionary<string, string> ParseTurkishNames()
    {
        const string raw = "H,Hidrojen|He,Helyum|Li,Lityum|Be,Berilyum|B,Bor|C,Karbon|N,Azot|O,Oksijen|F,Flor|Ne,Neon|Na,Sodyum|Mg,Magnezyum|Al,Alüminyum|Si,Silisyum|P,Fosfor|S,Kükürt|Cl,Klor|Ar,Argon|K,Potasyum|Ca,Kalsiyum|Sc,Skandiyum|Ti,Titanyum|V,Vanadyum|Cr,Krom|Mn,Manganez|Fe,Demir|Co,Kobalt|Ni,Nikel|Cu,Bakır|Zn,Çinko|Ga,Galyum|Ge,Germanyum|As,Arsenik|Se,Selenyum|Br,Brom|Kr,Kripton|Rb,Rubidyum|Sr,Stronsiyum|Y,İtriyum|Zr,Zirkonyum|Nb,Niyobyum|Mo,Molibden|Tc,Teknesyum|Ru,Rutenyum|Rh,Rodyum|Pd,Paladyum|Ag,Gümüş|Cd,Kadmiyum|In,İndiyum|Sn,Kalay|Sb,Antimon|Te,Tellür|I,İyot|Xe,Ksenon|Cs,Sezyum|Ba,Baryum|La,Lantan|Ce,Seryum|Pr,Praseodim|Nd,Neodim|Pm,Prometyum|Sm,Samaryum|Eu,Evropiyum|Gd,Gadolinyum|Tb,Terbiyum|Dy,Disprozyum|Ho,Holmiyum|Er,Erbiyum|Tm,Tulyum|Yb,İterbiyum|Lu,Lütesyum|Hf,Hafniyum|Ta,Tantal|W,Tungsten|Re,Renyum|Os,Osmiyum|Ir,İridyum|Pt,Platin|Au,Altın|Hg,Cıva|Tl,Talyum|Pb,Kurşun|Bi,Bizmut|Po,Polonyum|At,Astatin|Rn,Radon|Fr,Fransiyum|Ra,Radyum|Ac,Aktinyum|Th,Toryum|Pa,Protaktinyum|U,Uranyum|Np,Neptünyum|Pu,Plütonyum|Am,Amerikyum|Cm,Küriyum|Bk,Berkelyum|Cf,Kaliforniyum|Es,Aynştaynyum|Fm,Fermiyum|Md,Mendelevyum|No,Nobelyum|Lr,Lavrenciyum|Rf,Rutherfordyum|Db,Dubniyum|Sg,Seaborgiyum|Bh,Bohriyum|Hs,Hassiyum|Mt,Meitneriyum|Ds,Darmstadtiyum|Rg,Röntgenyum|Cn,Kopernikyum|Nh,Nihonyum|Fl,Flerovyum|Mc,Moskovyum|Lv,Livermoryum|Ts,Tennessin|Og,Oganesson";
        return raw.Split('|')
            .Select(p => p.Split(',', 2))
            .ToDictionary(p => p[0], p => p[1], StringComparer.OrdinalIgnoreCase);
    }
}
