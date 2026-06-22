FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["identity-service/Element.Services.Identity.API/Element.Services.Identity.API.csproj", "identity-service/Element.Services.Identity.API/"]
COPY ["identity-service/Element.Services.Identity.Infrastructure/Element.Services.Identity.Infrastructure.csproj", "identity-service/Element.Services.Identity.Infrastructure/"]
COPY ["identity-service/Element.Services.Identity.Core/Element.Services.Identity.Core.csproj", "identity-service/Element.Services.Identity.Core/"]
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
RUN dotnet restore "identity-service/Element.Services.Identity.API/Element.Services.Identity.API.csproj"
COPY . .
WORKDIR "/src/identity-service/Element.Services.Identity.API"
RUN dotnet build "Element.Services.Identity.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Element.Services.Identity.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Element.Services.Identity.API.dll"]
