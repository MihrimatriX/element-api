FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["notification-service/Element.Services.Notification.API/Element.Services.Notification.API.csproj", "notification-service/Element.Services.Notification.API/"]
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
RUN dotnet restore "notification-service/Element.Services.Notification.API/Element.Services.Notification.API.csproj"
COPY . .
WORKDIR "/src/notification-service/Element.Services.Notification.API"
RUN dotnet build "Element.Services.Notification.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Element.Services.Notification.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Element.Services.Notification.API.dll"]
