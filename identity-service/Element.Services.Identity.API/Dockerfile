FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
COPY ["identity-service/Element.Services.Identity.Core/Element.Services.Identity.Core.csproj", "identity-service/Element.Services.Identity.Core/"]
COPY ["identity-service/Element.Services.Identity.Infrastructure/Element.Services.Identity.Infrastructure.csproj", "identity-service/Element.Services.Identity.Infrastructure/"]
COPY ["identity-service/Element.Services.Identity.API/Element.Services.Identity.API.csproj", "identity-service/Element.Services.Identity.API/"]
RUN dotnet restore "identity-service/Element.Services.Identity.API/Element.Services.Identity.API.csproj"
COPY shared-lib/ shared-lib/
COPY identity-service/ identity-service/
# Learning allowlist: the API csproj links these as Content (read at runtime from Data/).
COPY ["web-app/src/data/known-compounds.json", "web-app/src/data/lessons.json", "web-app/src/data/"]
RUN dotnet publish "identity-service/Element.Services.Identity.API/Element.Services.Identity.API.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
# Runs as root on purpose: existing identity_keys volumes (/app/keys, DataProtection) are root-owned.
EXPOSE 8080
ENTRYPOINT ["dotnet", "Element.Services.Identity.API.dll"]
