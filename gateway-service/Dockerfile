FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
COPY ["gateway-service/Element.Gateway.csproj", "gateway-service/"]
RUN dotnet restore "gateway-service/Element.Gateway.csproj"
COPY shared-lib/ shared-lib/
COPY gateway-service/ gateway-service/
RUN dotnet publish "gateway-service/Element.Gateway.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
# Stateless proxy: nothing written to disk at runtime (console logs only).
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Element.Gateway.dll"]
