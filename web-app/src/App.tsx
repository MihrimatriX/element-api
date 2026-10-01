import { Suspense, lazy, useEffect, type ReactNode } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { CommerceLayout, DemoLayout } from "./components/CommerceLayout";
import PeriodicExplorer from "./components/PeriodicExplorer";
import ProductShell from "./components/ProductShell";
import RouteFallback from "./components/RouteFallback";
import { Toaster } from "./components/ui/toaster";
import { ACCOUNTS_ENABLED } from "./config";
import { SelectedElementProvider } from "./context/selection";
import FeatureUnavailable from "./pages/FeatureUnavailable";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import { STACK_REDIRECT } from "./productNav";
import { track } from "./services/diagnostics";

// `/` and `/periodic` are eager so the two entry pages paint without a skeleton.
const About = lazy(() => import("./pages/About"));
const Account = lazy(() => import("./pages/Account"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Collection = lazy(() => import("./pages/Collection"));
const Compounds = lazy(() => import("./pages/Compounds"));
const DataCoverage = lazy(() => import("./pages/DataCoverage"));
const Demo = lazy(() => import("./pages/Demo"));
const Developers = lazy(() => import("./pages/Developers"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Glossary = lazy(() => import("./pages/Glossary"));
const Guide = lazy(() => import("./pages/Guide"));
const LabDetective = lazy(() => import("./pages/LabDetective"));
const LabFormula = lazy(() => import("./pages/LabFormula"));
const Laboratory = lazy(() => import("./pages/Laboratory"));
const Login = lazy(() => import("./pages/Login"));
const Market = lazy(() => import("./pages/Market"));
const Recovery = lazy(() => import("./pages/Recovery"));
const Register = lazy(() => import("./pages/Register"));
const ScientificDetail = lazy(() => import("./components/ScientificDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Shop = lazy(() => import("./pages/Shop"));
const SystemGuide = lazy(() => import("./pages/SystemGuide"));
// Dev-only design-system gallery; the import is dropped from production builds.
const UiGallery = import.meta.env.DEV
  ? lazy(() => import("./pages/UiGallery"))
  : null;

/** Account and commerce routes exist only when the build has accounts enabled. */
function AccountsOnly() {
  return ACCOUNTS_ENABLED ? <Outlet /> : <FeatureUnavailable />;
}

/** Old URLs keep their query string on the way to the new route. */
function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

/**
 * Fades each page in. Keyed by the first path segment, so moving between
 * records (/element/fe → /element/cu) keeps the page mounted.
 */
function RouteStage({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();
  const section = pathname.split("/")[1] ?? "";
  return (
    <motion.div
      key={section}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    >
      {children}
    </motion.div>
  );
}

/** Records element/compound page views for opt-in diagnostics. */
function useRecordTracking() {
  const { pathname } = useLocation();
  useEffect(() => {
    const record = pathname.match(/^\/(element|compound)\/([a-z0-9_-]+)$/i);
    if (record) track("record_opened", record[2]);
  }, [pathname]);
}

function AppRoutes() {
  useRecordTracking();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/periodic" element={<PeriodicExplorer />} />
      <Route path="/element/:symbol" element={<ScientificDetail kind="elements" />} />
      <Route path="/compounds" element={<Compounds />} />
      <Route path="/compound/:slug" element={<ScientificDetail kind="compounds" />} />
      <Route path="/lab" element={<Laboratory />} />
      <Route path="/lab/formula" element={<LabFormula />} />
      <Route path="/lab/detective" element={<LabDetective />} />
      <Route path="/collection" element={<Collection />} />
      <Route path="/nasil" element={<Guide />} />
      <Route path="/sozluk" element={<Glossary />} />
      <Route path="/developers" element={<Developers />} />
      <Route path="/docs" element={<ApiDocs />} />
      <Route path="/data" element={<DataCoverage />} />
      <Route path="/kilavuz" element={<SystemGuide />} />
      <Route path="/hakkinda" element={<About />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route element={<DemoLayout />}>
        <Route path="/demo" element={<Demo />} />
      </Route>

      <Route element={<AccountsOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reset-password" element={<Recovery />} />
        <Route path="/verify-email" element={<Recovery verify />} />
        <Route element={<CommerceLayout />}>
          <Route path="/market" element={<Market />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Route>

      <Route path="/values" element={<LegacyRedirect to="/market" />} />
      <Route path="/trading" element={<LegacyRedirect to="/shop" />} />
      <Route path="/stack" element={<LegacyRedirect to={STACK_REDIRECT} />} />
      {UiGallery && <Route path="/_ui" element={<UiGallery />} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <SelectedElementProvider>
          <ProductShell>
            <Suspense fallback={<RouteFallback />}>
              <RouteStage>
                <AppRoutes />
              </RouteStage>
            </Suspense>
          </ProductShell>
          <Toaster />
        </SelectedElementProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
