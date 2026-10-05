using System.Text.Json;
using Element.Services.Compound.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Element.Services.Compound.Infrastructure.Persistence;

/// <summary>
/// Fills the compound table at startup from Data/compounds.json and adds one
/// "elemental-xx" gram preparation per element. Only missing slugs are inserted,
/// so restarts are safe and hand-made rows are never overwritten.
/// </summary>
public static class CompoundSeeder
{
    private const string DefaultKind = "compound";
    private const string SeedFileName = "compounds.json";

    private static readonly HashSet<string> AllowedKinds = new(StringComparer.OrdinalIgnoreCase)
    {
        "allotrope", "compound", "preparation"
    };

    // English and Turkish names used for the generated "elemental-xx" preparations.
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

    /// <summary>Inserts every seed compound whose slug is not in the database yet.</summary>
    public static async Task EnsureSeededAsync(IServiceProvider services, IHostEnvironment env)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CompoundDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("CompoundSeeder");

        var seedPath = FindSeedFile(env);
        var seedCompounds = LoadSeedCompounds(seedPath, logger);

        var existingSlugs = await db.Compounds
            .Select(compound => compound.Slug)
            .ToListAsync();
        var existingSlugSet = existingSlugs.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var missingCompounds = seedCompounds
            .Where(compound => !existingSlugSet.Contains(compound.Slug))
            .ToList();

        db.Compounds.AddRange(missingCompounds);
        await db.SaveChangesAsync();
        logger.LogInformation("Added {Count} missing products from {Path}.", missingCompounds.Count, seedPath);
    }

    /// <summary>Looks for compounds.json next to the content root first, then in the build output.</summary>
    private static string FindSeedFile(IHostEnvironment env)
    {
        var candidatePaths = new[]
        {
            Path.Combine(env.ContentRootPath, "Data", SeedFileName),
            Path.Combine(AppContext.BaseDirectory, "Data", SeedFileName),
            Path.Combine(AppContext.BaseDirectory, SeedFileName)
        };

        return candidatePaths.FirstOrDefault(File.Exists)
            ?? throw new FileNotFoundException("compounds.json seed file was not found.");
    }

    /// <summary>
    /// Reads the JSON rows (skipping rows without symbol or slug; the first row wins on a
    /// duplicate slug) and then adds an "elemental-xx" preparation for every element.
    /// </summary>
    private static List<ChemicalCompound> LoadSeedCompounds(string path, ILogger logger)
    {
        var json = File.ReadAllText(path);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var seedRows = JsonSerializer.Deserialize<List<SeedRow>>(json, options) ?? [];

        var seenSlugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var compounds = new List<ChemicalCompound>();

        foreach (var row in seedRows)
        {
            if (string.IsNullOrWhiteSpace(row.ElementSymbol) || string.IsNullOrWhiteSpace(row.Slug))
            {
                continue;
            }

            var slug = row.Slug.Trim().ToLowerInvariant();
            if (!seenSlugs.Add(slug))
            {
                continue;
            }

            compounds.Add(FromSeedRow(row, slug));
        }

        foreach (var (symbol, names) in ElementNames)
        {
            var slug = $"elemental-{symbol.ToLowerInvariant()}";
            if (!seenSlugs.Add(slug))
            {
                continue;
            }

            compounds.Add(ElementalPreparation(symbol, slug, names.En, names.Tr));
        }

        logger.LogInformation("Prepared {Count} compound rows (JSON + elemental).", compounds.Count);
        return compounds;
    }

    /// <summary>Turns one JSON row into an entity, filling blanks with safe defaults.</summary>
    private static ChemicalCompound FromSeedRow(SeedRow row, string slug)
    {
        var symbol = row.ElementSymbol.Trim();
        var kind = AllowedKinds.Contains(row.Kind) ? row.Kind.Trim().ToLowerInvariant() : DefaultKind;

        return new ChemicalCompound
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
        };
    }

    /// <summary>One gram of the pure element as a simulated product.</summary>
    private static ChemicalCompound ElementalPreparation(string symbol, string slug, string englishName, string turkishName)
    {
        return new ChemicalCompound
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Formula = symbol,
            Name = $"{englishName} (elemental gram)",
            NameTr = $"{turkishName} (saf gram)",
            Kind = "preparation",
            ElementSymbol = symbol,
            GramsPerUnit = 1,
            PriceMult = 1,
            Summary = "Saf elementin gram bazında simülasyon ürünü. Fiziksel satış veya teslimat yapılmaz."
        };
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>Shape of one row in compounds.json.</summary>
    private sealed class SeedRow
    {
        public string ElementSymbol { get; set; } = "";
        public string Slug { get; set; } = "";
        public string Formula { get; set; } = "";
        public string Name { get; set; } = "";
        public string NameTr { get; set; } = "";
        public string Kind { get; set; } = DefaultKind;
        public decimal GramsPerUnit { get; set; } = 1;
        public decimal PriceMult { get; set; } = 1;
        public string Summary { get; set; } = "";
        public string? ImageUrl { get; set; }
        public string? ImageHint { get; set; }
    }
}
