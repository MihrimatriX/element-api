FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["shared-lib/Element.Shared.csproj", "shared-lib/"]
COPY ["notification-service/Element.Services.Notification.API/Element.Services.Notification.API.csproj", "notification-service/Element.Services.Notification.API/"]
RUN dotnet restore "notification-service/Element.Services.Notification.API/Element.Services.Notification.API.csproj"
COPY shared-lib/ shared-lib/
COPY notification-service/ notification-service/
RUN dotnet publish "notification-service/Element.Services.Notification.API/Element.Services.Notification.API.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Element.Services.Notification.API.dll"]
