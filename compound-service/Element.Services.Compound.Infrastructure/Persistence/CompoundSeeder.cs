using System.Text.Json;
using Element.Services.Compound.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Element.Services.Compound.Infrastructure.Persistence;

public static class CompoundSeeder
{
    private static readonly HashSet<string> Kinds = new(StringComparer.OrdinalIgnoreCase)
    {
        "allotrope", "compound", "preparation"
    };

    private static readonly Dictionary<string, (string En, string Tr)> ElementNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["H"] = ("Hydrogen", "Hidrojen"),
        ["He"] = ("Helium", "Helyum"),
        ["Li"] = ("Lithium", "Lityum"),
        ["Be"] = ("Beryllium", "Berilyum"),
        ["B"] = ("Boron", "Bor"),
        ["C"] = ("Carbon", "Karbon"),
        ["N"] = ("Nitrogen", "Azot"),
        ["O"] = ("Oxygen", "Oksijen"),
        ["F"] = ("Fluorine", "Flor"),
        ["Ne"] = ("Neon", "Neon"),
        ["Na"] = ("Sodium", "Sodyum"),
        ["Mg"] = ("Magnesium", "Magnezyum"),
        ["Al"] = ("Aluminium", "Alüminyum"),
        ["Si"] = ("Silicon", "Silisyum"),
        ["P"] = ("Phosphorus", "Fosfor"),
        ["S"] = ("Sulfur", "Kükürt"),
        ["Cl"] = ("Chlorine", "Klor"),
        ["Ar"] = ("Argon", "Argon"),
        ["K"] = ("Potassium", "Potasyum"),
        ["Ca"] = ("Calcium", "Kalsiyum"),
        ["Sc"] = ("Scandium", "Skandiyum"),
        ["Ti"] = ("Titanium", "Titanyum"),
        ["V"] = ("Vanadium", "Vanadyum"),
        ["Cr"] = ("Chromium", "Krom"),
        ["Mn"] = ("Manganese", "Manganez"),
        ["Fe"] = ("Iron", "Demir"),
        ["Co"] = ("Cobalt", "Kobalt"),
        ["Ni"] = ("Nickel", "Nikel"),
        ["Cu"] = ("Copper", "Bakır"),
        ["Zn"] = ("Zinc", "Çinko"),
        ["Ga"] = ("Gallium", "Galyum"),
        ["Ge"] = ("Germanium", "Germanyum"),
        ["As"] = ("Arsenic", "Arsenik"),
        ["Se"] = ("Selenium", "Selenyum"),
        ["Br"] = ("Bromine", "Brom"),
        ["Kr"] = ("Krypton", "Kripton"),
        ["Rb"] = ("Rubidium", "Rubidyum"),
        ["Sr"] = ("Strontium", "Stronsiyum"),
        ["Y"] = ("Yttrium", "İtriyum"),
        ["Zr"] = ("Zirconium", "Zirkonyum"),
        ["Nb"] = ("Niobium", "Niyobyum"),
        ["Mo"] = ("Molybdenum", "Molibden"),
        ["Tc"] = ("Technetium", "Teknesyum"),
        ["Ru"] = ("Ruthenium", "Rutenyum"),
        ["Rh"] = ("Rhodium", "Rodyum"),
        ["Pd"] = ("Palladium", "Paladyum"),
        ["Ag"] = ("Silver", "Gümüş"),
        ["Cd"] = ("Cadmium", "Kadmiyum"),
        ["In"] = ("Indium", "İndiyum"),
        ["Sn"] = ("Tin", "Kalay"),
        ["Sb"] = ("Antimony", "Antimon"),
        ["Te"] = ("Tellurium", "Tellür"),
        ["I"] = ("Iodine", "İyot"),
        ["Xe"] = ("Xenon", "Ksenon"),
        ["Cs"] = ("Cesium", "Sezyum"),
        ["Ba"] = ("Barium", "Baryum"),
        ["La"] = ("Lanthanum", "Lantan"),
        ["Ce"] = ("Cerium", "Seryum"),
        ["Pr"] = ("Praseodymium", "Praseodim"),
        ["Nd"] = ("Neodymium", "Neodim"),
        ["Pm"] = ("Promethium", "Prometyum"),
        ["Sm"] = ("Samarium", "Samaryum"),
        ["Eu"] = ("Europium", "Evropiyum"),
        ["Gd"] = ("Gadolinium", "Gadolinyum"),
        ["Tb"] = ("Terbium", "Terbiyum"),
        ["Dy"] = ("Dysprosium", "Disprozyum"),
        ["Ho"] = ("Holmium", "Holmiyum"),
        ["Er"] = ("Erbium", "Erbiyum"),
        ["Tm"] = ("Thulium", "Tulyum"),
        ["Yb"] = ("Ytterbium", "İterbiyum"),
        ["Lu"] = ("Lutetium", "Lütesyum"),
        ["Hf"] = ("Hafnium", "Hafniyum"),
        ["Ta"] = ("Tantalum", "Tantal"),
        ["W"] = ("Tungsten", "Tungsten"),
        ["Re"] = ("Rhenium", "Renyum"),
        ["Os"] = ("Osmium", "Osmiyum"),
        ["Ir"] = ("Iridium", "İridyum"),
        ["Pt"] = ("Platinum", "Platin"),
        ["Au"] = ("Gold", "Altın"),
        ["Hg"] = ("Mercury", "Cıva"),
        ["Tl"] = ("Thallium", "Talyum"),
        ["Pb"] = ("Lead", "Kurşun"),
        ["Bi"] = ("Bismuth", "Bizmut"),
        ["Po"] = ("Polonium", "Polonyum"),
        ["At"] = ("Astatine", "Astatin"),
        ["Rn"] = ("Radon", "Radon"),
        ["Fr"] = ("Francium", "Fransiyum"),
        ["Ra"] = ("Radium", "Radyum"),
        ["Ac"] = ("Actinium", "Aktinyum"),
        ["Th"] = ("Thorium", "Toryum"),
        ["Pa"] = ("Protactinium", "Protaktinyum"),
        ["U"] = ("Uranium", "Uranyum"),
        ["Np"] = ("Neptunium", "Neptünyum"),
        ["Pu"] = ("Plutonium", "Plütonyum"),
        ["Am"] = ("Americium", "Amerikyum"),
        ["Cm"] = ("Curium", "Küriyum"),
        ["Bk"] = ("Berkelium", "Berkelyum"),
        ["Cf"] = ("Californium", "Kaliforniyum"),
        ["Es"] = ("Einsteinium", "Aynştaynyum"),
        ["Fm"] = ("Fermium", "Fermiyum"),
        ["Md"] = ("Mendelevium", "Mendelevyum"),
        ["No"] = ("Nobelium", "Nobelyum"),
        ["Lr"] = ("Lawrencium", "Lavrenciyum"),
        ["Rf"] = ("Rutherfordium", "Rutherfordyum"),
        ["Db"] = ("Dubnium", "Dubniyum"),
        ["Sg"] = ("Seaborgium", "Seaborgiyum"),
        ["Bh"] = ("Bohrium", "Bohriyum"),
        ["Hs"] = ("Hassium", "Hassiyum"),
        ["Mt"] = ("Meitnerium", "Meitneriyum"),
        ["Ds"] = ("Darmstadtium", "Darmstadtiyum"),
        ["Rg"] = ("Roentgenium", "Röntgenyum"),
        ["Cn"] = ("Copernicium", "Kopernikyum"),
        ["Nh"] = ("Nihonium", "Nihonyum"),
        ["Fl"] = ("Flerovium", "Flerovyum"),
        ["Mc"] = ("Moscovium", "Moskovyum"),
        ["Lv"] = ("Livermorium", "Livermoryum"),
        ["Ts"] = ("Tennessine", "Tennessin"),
        ["Og"] = ("Oganesson", "Oganesson")
    };

    public static async Task EnsureSeededAsync(IServiceProvider services, IHostEnvironment env)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CompoundDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("CompoundSeeder");

        var path = FindSeed(env);
        var rows = Load(path, logger);
        var existing = (await db.Compounds.Select(c => c.Slug).ToListAsync()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missing = rows.Where(c => !existing.Contains(c.Slug)).ToList();
        db.Compounds.AddRange(missing);
        await db.SaveChangesAsync();
        logger.LogInformation("Added {Count} missing products from {Path}.", missing.Count, path);
    }

    private static string FindSeed(IHostEnvironment env)
    {
        var names = new[]
        {
            Path.Combine(env.ContentRootPath, "Data", "compounds.json"),
            Path.Combine(AppContext.BaseDirectory, "Data", "compounds.json"),
            Path.Combine(AppContext.BaseDirectory, "compounds.json")
        };
        return names.FirstOrDefault(File.Exists)
            ?? throw new FileNotFoundException("compounds.json seed file was not found.");
    }

    private static List<ChemicalCompound> Load(string path, ILogger logger)
    {
        var json = File.ReadAllText(path);
        var parsed = JsonSerializer.Deserialize<List<SeedRow>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? [];

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var ok = new List<ChemicalCompound>(parsed.Count + 64);
        foreach (var row in parsed)
        {
            if (string.IsNullOrWhiteSpace(row.ElementSymbol) || string.IsNullOrWhiteSpace(row.Slug))
                continue;
            var symbol = row.ElementSymbol.Trim();
            var slug = row.Slug.Trim().ToLowerInvariant();
            if (!seen.Add(slug)) continue;

            var kind = Kinds.Contains(row.Kind) ? row.Kind.Trim().ToLowerInvariant() : "compound";
            ok.Add(new ChemicalCompound
            {
                Id = Guid.NewGuid(),
                Slug = slug,
                Formula = string.IsNullOrWhiteSpace(row.Formula) ? symbol : row.Formula.Trim(),
                Name = string.IsNullOrWhiteSpace(row.Name) ? slug : row.Name.Trim(),
                NameTr = string.IsNullOrWhiteSpace(row.NameTr) ? row.Name.Trim() : row.NameTr.Trim(),
                Kind = kind,
                ElementSymbol = symbol,
                GramsPerUnit = row.GramsPerUnit > 0 ? row.GramsPerUnit : 1,
                PriceMult = row.PriceMult > 0 ? row.PriceMult : 1,
                Summary = (row.Summary ?? "").Trim(),
                ImageUrl = string.IsNullOrWhiteSpace(row.ImageUrl) ? NullIfBlank(row.ImageHint) : row.ImageUrl.Trim()
            });
        }

        foreach (var symbol in ElementNames.Keys)
        {
            var slug = $"elemental-{symbol.ToLowerInvariant()}";
            if (!seen.Add(slug)) continue;
            var names = ElementNames.TryGetValue(symbol, out var n)
                ? n
                : (En: symbol, Tr: symbol);
            ok.Add(new ChemicalCompound
            {
                Id = Guid.NewGuid(),
                Slug = slug,
                Formula = symbol,
                Name = $"{names.En} (elemental gram)",
                NameTr = $"{names.Tr} (saf gram)",
                Kind = "preparation",
                ElementSymbol = symbol,
                GramsPerUnit = 1,
                PriceMult = 1,
                Summary = "Saf elementin gram bazında simülasyon ürünü. Fiziksel satış veya teslimat yapılmaz."
            });
        }

        logger.LogInformation("Prepared {Count} compound rows (JSON + elemental).", ok.Count);
        return ok;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed class SeedRow
    {
        public string ElementSymbol { get; set; } = "";
        public string Slug { get; set; } = "";
        public string Formula { get; set; } = "";
        public string Name { get; set; } = "";
        public string NameTr { get; set; } = "";
        public string Kind { get; set; } = "compound";
        public decimal GramsPerUnit { get; set; } = 1;
        public decimal PriceMult { get; set; } = 1;
        public string Summary { get; set; } = "";
        public string? ImageUrl { get; set; }
        public string? ImageHint { get; set; }
    }
}
