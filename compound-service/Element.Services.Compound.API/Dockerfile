FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
COPY ["compound-service/Element.Services.Compound.API/Element.Services.Compound.API.csproj", "compound-service/Element.Services.Compound.API/"]
COPY ["compound-service/Element.Services.Compound.Infrastructure/Element.Services.Compound.Infrastructure.csproj", "compound-service/Element.Services.Compound.Infrastructure/"]
RUN dotnet restore "compound-service/Element.Services.Compound.API/Element.Services.Compound.API.csproj"
COPY shared-lib/ shared-lib/
COPY compound-service/ compound-service/
RUN dotnet publish "compound-service/Element.Services.Compound.API/Element.Services.Compound.API.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Element.Services.Compound.API.dll"]
