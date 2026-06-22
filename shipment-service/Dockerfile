FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["shipment-service/Element.Services.Shipment.API/Element.Services.Shipment.API.csproj", "shipment-service/Element.Services.Shipment.API/"]
COPY ["shipment-service/Element.Services.Shipment.Core/Element.Services.Shipment.Core.csproj", "shipment-service/Element.Services.Shipment.Core/"]
COPY ["shipment-service/Element.Services.Shipment.Infrastructure/Element.Services.Shipment.Infrastructure.csproj", "shipment-service/Element.Services.Shipment.Infrastructure/"]
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
RUN dotnet restore "shipment-service/Element.Services.Shipment.API/Element.Services.Shipment.API.csproj"
COPY . .
WORKDIR "/src/shipment-service/Element.Services.Shipment.API"
RUN dotnet build "Element.Services.Shipment.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Element.Services.Shipment.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Element.Services.Shipment.API.dll"]
