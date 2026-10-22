FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
COPY ["catalog-service/Element.Services.Element.Core/Element.Services.Element.Core.csproj", "catalog-service/Element.Services.Element.Core/"]
COPY ["catalog-service/Element.Services.Element.Infrastructure/Element.Services.Element.Infrastructure.csproj", "catalog-service/Element.Services.Element.Infrastructure/"]
COPY ["catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj", "catalog-service/Element.Services.Element.API/"]
RUN dotnet restore "catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj"
COPY shared-lib/ shared-lib/
COPY catalog-service/ catalog-service/
RUN dotnet publish "catalog-service/Element.Services.Element.API/Element.Services.Element.API.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Element.Services.Element.API.dll"]
