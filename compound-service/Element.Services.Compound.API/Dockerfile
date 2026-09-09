FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["compound-service/Element.Services.Compound.API/Element.Services.Compound.API.csproj", "compound-service/Element.Services.Compound.API/"]
COPY ["compound-service/Element.Services.Compound.Infrastructure/Element.Services.Compound.Infrastructure.csproj", "compound-service/Element.Services.Compound.Infrastructure/"]
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
RUN dotnet restore "compound-service/Element.Services.Compound.API/Element.Services.Compound.API.csproj"
COPY . .
WORKDIR "/src/compound-service/Element.Services.Compound.API"
RUN dotnet build "Element.Services.Compound.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Element.Services.Compound.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Element.Services.Compound.API.dll"]
