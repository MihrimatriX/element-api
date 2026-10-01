FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
COPY ["shipment-service/Element.Services.Shipment.API/Element.Services.Shipment.API.csproj", "shipment-service/Element.Services.Shipment.API/"]
COPY ["shipment-service/Element.Services.Shipment.Infrastructure/Element.Services.Shipment.Infrastructure.csproj", "shipment-service/Element.Services.Shipment.Infrastructure/"]
RUN dotnet restore "shipment-service/Element.Services.Shipment.API/Element.Services.Shipment.API.csproj"
COPY shared-lib/ shared-lib/
COPY shipment-service/ shipment-service/
RUN dotnet publish "shipment-service/Element.Services.Shipment.API/Element.Services.Shipment.API.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Element.Services.Shipment.API.dll"]
