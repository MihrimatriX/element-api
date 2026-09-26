FROM node:22-alpine AS web
WORKDIR /app
COPY web-app/package*.json ./
RUN npm ci
COPY web-app/ .
COPY catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json /catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json
COPY compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json /compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json
ARG VITE_PUBLIC_SITE_URL=http://127.0.0.1:5080
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL
ENV VITE_API_BASE_URL=/api/v1
ENV VITE_ACCOUNTS_ENABLED=false
RUN npm run build && node scripts/finalize-static.mjs
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY science-service/ science-service/
COPY shared-lib/Science/ shared-lib/Science/
COPY catalog-service/Element.Services.Element.API/Controllers/ScientificElementsController.cs catalog-service/Element.Services.Element.API/Controllers/
COPY compound-service/Element.Services.Compound.API/Controllers/ScientificCompoundsController.cs compound-service/Element.Services.Compound.API/Controllers/
COPY catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json catalog-service/Element.Services.Element.Infrastructure/Data/
COPY compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json compound-service/Element.Services.Compound.Infrastructure/Data/
RUN dotnet publish science-service/Element.Science.csproj -c Release -o /out
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
COPY --from=web /app/dist wwwroot/
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Element.Science.dll"]
