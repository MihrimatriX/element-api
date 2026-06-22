FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj", "catalog-service/Element.Services.Element.API/"]
COPY ["catalog-service/Element.Services.Element.Infrastructure/Element.Services.Element.Infrastructure.csproj", "catalog-service/Element.Services.Element.Infrastructure/"]
COPY ["catalog-service/Element.Services.Element.Core/Element.Services.Element.Core.csproj", "catalog-service/Element.Services.Element.Core/"]
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
RUN dotnet restore "catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj"
COPY . .
WORKDIR "/src/catalog-service/Element.Services.Element.API"
RUN dotnet build "Element.Services.Element.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Element.Services.Element.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Element.Services.Element.API.dll"]
