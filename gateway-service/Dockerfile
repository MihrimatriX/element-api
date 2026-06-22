FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["gateway-service/Element.Gateway.csproj", "gateway-service/"]
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
RUN dotnet restore "gateway-service/Element.Gateway.csproj"
COPY . .
WORKDIR "/src/gateway-service"
RUN dotnet build "Element.Gateway.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Element.Gateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Element.Gateway.dll"]
